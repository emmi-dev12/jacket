import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { chat } from './adapters/index.js';
import { compileToSTL } from './compiler.js';
import { addEntry, getHistory } from './history.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, '../web')));

// In-memory store: sessionId → { openscad, spec }
const sessions = new Map();

const INTERPRETER_SYSTEM = `You are Jacket's interpreter. Take the user's rough description of a 3D object and, through a focused conversation, produce a precise specification.

Ask ONLY what you genuinely need — no more than 3-4 questions total, one or two at a time.
When confident, output EXACTLY this JSON and nothing else:

{"spec":{"name":"...","description":"...","dimensions":"...","features":"...","material_hint":"pla|petg|resin|unknown","printer_constraints":"...","shape_hint":"box|cylinder|sphere|complex"}}

Do not output the JSON until you are genuinely confident. If ambiguous, ask.`;

const GEOMETRY_SYSTEM = `You are Jacket's geometry engine. Given a confirmed spec, output valid OpenSCAD code that produces the described object.

Rules:
- Output ONLY valid OpenSCAD code, nothing else — no explanations, no markdown fences
- Use difference(), union(), translate(), rotate() as needed
- Default units: millimeters
- Ensure the object is printable: wall thickness ≥ 1.5mm, no unsupported thin features
- Keep it parametric where reasonable`;

app.post('/api/interpret', async (req, res) => {
  const { provider, messages } = req.body;
  try {
    const reply = await chat({ provider, system: INTERPRETER_SYSTEM, messages });

    // Try clean JSON parse first
    try {
      const parsed = JSON.parse(reply);
      if (parsed.spec) return res.json({ spec: parsed.spec });
    } catch {}

    // Try extracting embedded JSON
    const match = reply.match(/\{[\s\S]*"spec"[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed.spec) return res.json({ spec: parsed.spec });
      } catch {}
    }

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
      system: GEOMETRY_SYSTEM,
      messages: [{ role: 'user', content: `Generate OpenSCAD for:\n${specText}` }],
    });

    // Store for export
    if (sessionId) sessions.set(sessionId, { openscadCode, spec });

    // Save to history
    addEntry({ prompt: spec.description, spec, openscad: openscadCode });

    res.json({ openscad: openscadCode, preview: spec.shape_hint || 'box', sessionId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/export', async (req, res) => {
  const { sessionId, openscad, spec } = req.body;

  let code = openscad;

  // Prefer session-stored code if available
  if (!code && sessionId && sessions.has(sessionId)) {
    code = sessions.get(sessionId).openscadCode;
  }

  if (!code) {
    return res.status(400).json({ error: 'No geometry to export. Generate an object first.' });
  }

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

app.get('/api/history', (req, res) => {
  res.json(getHistory());
});

export function startServer(port = 3141) {
  app.listen(port, () => {
    console.log(`\n── Jacket Studio ────────────────────────────────────`);
    console.log(`   Open: http://localhost:${port}`);
    console.log(`   Press Ctrl+C to stop\n`);
  });
}
