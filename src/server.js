import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { chat } from './adapters/index.js';
import { compileToSTL } from './compiler.js';
import { addEntry, getHistory } from './history.js';
import { loadSettings, saveSettings } from './settings.js';
import { buildMemoryContext, learnFromSession, loadMemory, saveMemory } from './memory.js';
import { buildAuthURL, exchangeCode, isGrokOAuthConnected, disconnectGrokOAuth } from './grok-oauth.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// In-memory OAuth state (verifier + state, keyed by state param)
const oauthStates = new Map();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, '../web')));

const sessions = new Map();

function buildInterpreterSystem() {
  const memCtx = buildMemoryContext();
  return `You are Jacket's interpreter. Take the user's rough description of a 3D object and, through a focused conversation, produce a precise specification.

${memCtx ? `Context from past sessions:\n${memCtx}\n` : ''}
Ask ONLY what you genuinely need — no more than 3-4 questions total, one or two at a time.
When confident, output EXACTLY this JSON and nothing else:

{"spec":{"name":"...","description":"...","dimensions":"...","features":"...","material_hint":"pla|petg|resin|unknown","printer_constraints":"...","shape_hint":"box|cylinder|sphere|complex"}}

Do not output the JSON until you are genuinely confident. If ambiguous, ask.`;
}

function buildGeometrySystem() {
  const settings = loadSettings();
  const memCtx = buildMemoryContext();
  return `You are Jacket's geometry engine. Given a confirmed spec, output valid OpenSCAD code.

${memCtx ? `User context:\n${memCtx}\n` : ''}
Printer bed: ${settings.printer.bedWidth}x${settings.printer.bedDepth}x${settings.printer.bedHeight}mm. Filament: ${settings.printer.filament}.

Rules:
- Output ONLY valid OpenSCAD code, nothing else — no explanations, no markdown fences
- Use difference(), union(), translate(), rotate() as needed
- Default units: millimeters
- Wall thickness ≥ 1.5mm, no unsupported thin features
- Keep it parametric where reasonable`;
}

app.post('/api/interpret', async (req, res) => {
  const { provider, messages } = req.body;
  try {
    const reply = await chat({ provider, system: buildInterpreterSystem(), messages });
    try { const p = JSON.parse(reply); if (p.spec) return res.json({ spec: p.spec }); } catch {}
    const match = reply.match(/\{[\s\S]*"spec"[\s\S]*\}/);
    if (match) { try { const p = JSON.parse(match[0]); if (p.spec) return res.json({ spec: p.spec }); } catch {} }
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/generate', async (req, res) => {
  const { provider, spec, sessionId } = req.body;
  try {
    const specText = Object.entries(spec).map(([k, v]) => `${k}: ${v}`).join('\n');
    const openscadCode = await chat({
      provider,
      system: buildGeometrySystem(),
      messages: [{ role: 'user', content: `Generate OpenSCAD for:\n${specText}` }],
    });
    if (sessionId) sessions.set(sessionId, { openscadCode, spec, provider });
    addEntry({ prompt: spec.description, spec, openscad: openscadCode });
    res.json({ openscad: openscadCode, preview: spec.shape_hint || 'box', sessionId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/export', async (req, res) => {
  const { sessionId, openscad, spec } = req.body;
  let code = openscad;
  if (!code && sessionId && sessions.has(sessionId)) code = sessions.get(sessionId).openscadCode;
  if (!code) return res.status(400).json({ error: 'No geometry to export. Generate first.' });
  try {
    const stlBuffer = compileToSTL(code);
    const filename = `${(spec?.name || 'jacket-object').replace(/\s+/g, '-').toLowerCase()}.stl`;
    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(stlBuffer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Learn from an edited session
app.post('/api/learn', async (req, res) => {
  const { sessionId, editedCode, conversation } = req.body;
  const session = sessions.get(sessionId);
  if (!session) return res.json({ ok: false });
  try {
    await learnFromSession({
      provider: session.provider || 'claude',
      spec: session.spec,
      originalCode: session.openscadCode,
      editedCode,
      conversation,
    });
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// ── GROK OAUTH ──
app.get('/api/grok/oauth/start', (req, res) => {
  const port = req.socket.localPort || 3141;
  try {
    const { url, verifier, state, redirectUri } = buildAuthURL(port);
    oauthStates.set(state, { verifier, redirectUri });
    // Clean up stale states after 10 min
    setTimeout(() => oauthStates.delete(state), 10 * 60 * 1000);
    res.json({ url });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/auth/grok/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.send(callbackPage('error', `xAI denied access: ${error}`));
  if (!code || !state || !oauthStates.has(state)) return res.send(callbackPage('error', 'Invalid OAuth state. Try connecting again.'));

  const { verifier, redirectUri } = oauthStates.get(state);
  oauthStates.delete(state);
  try {
    await exchangeCode({ code, verifier, redirectUri });
    res.send(callbackPage('success', 'SuperGrok connected. You can close this tab.'));
  } catch (e) {
    res.send(callbackPage('error', e.message));
  }
});

app.get('/api/grok/oauth/status', (req, res) => {
  res.json({ connected: isGrokOAuthConnected() });
});

app.post('/api/grok/oauth/disconnect', (req, res) => {
  disconnectGrokOAuth();
  res.json({ ok: true });
});

function callbackPage(status, message) {
  const color = status === 'success' ? '#F5C400' : '#FF4444';
  const icon = status === 'success' ? '◆' : '✕';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Jacket — Grok Auth</title>
<style>body{background:#080808;color:#F0EDE8;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:16px}
.mark{font-size:40px;color:${color}}.title{font-size:14px;letter-spacing:.2em;color:${color}}.msg{font-size:12px;color:#555;max-width:360px;text-align:center;line-height:1.6}</style></head>
<body><div class="mark">${icon}</div><div class="title">JACKET</div><div class="msg">${message}</div>
<script>if("${status}"==="success"){setTimeout(()=>window.close(),2000)}</script></body></html>`;
}

app.get('/api/history', (req, res) => res.json(getHistory()));
app.get('/api/settings', (req, res) => res.json(loadSettings()));
app.post('/api/settings', (req, res) => {
  try {
    saveSettings(req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/api/memory', (req, res) => res.json(loadMemory()));

export function startServer(port = 3141) {
  app.listen(port, () => {
    console.log(`\n── Jacket Studio ────────────────────────────────────`);
    console.log(`   Open: http://localhost:${port}`);
    console.log(`   Press Ctrl+C to stop\n`);
  });
}
