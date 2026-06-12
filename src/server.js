import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { chat } from './adapters/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, '../web')));

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
- Ensure the object is printable (wall thickness ≥ 1.5mm, no impossible overhangs without support notation)
- Keep it parametric where reasonable`;

app.post('/api/interpret', async (req, res) => {
  const { provider, messages } = req.body;
  try {
    const reply = await chat({ provider, system: INTERPRETER_SYSTEM, messages });
    try {
      const parsed = JSON.parse(reply);
      if (parsed.spec) return res.json({ spec: parsed.spec });
    } catch {}
    // Check for embedded JSON
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
  const { provider, spec } = req.body;
  try {
    const specText = Object.entries(spec).map(([k, v]) => `${k}: ${v}`).join('\n');
    const openscadCode = await chat({
      provider,
      system: GEOMETRY_SYSTEM,
      messages: [{ role: 'user', content: `Generate OpenSCAD for:\n${specText}` }],
    });
    res.json({ openscad: openscadCode, preview: spec.shape_hint || 'box' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/export', async (req, res) => {
  // Placeholder — full STL export via OpenSCAD CLI comes next
  res.set('Content-Type', 'application/octet-stream');
  res.set('Content-Disposition', 'attachment; filename="jacket-object.stl"');
  res.send(Buffer.from('STL export via OpenSCAD coming in next build'));
});

export function startServer(port = 3141) {
  app.listen(port, () => {
    console.log(`\n── Jacket Studio ────────────────────────────────────`);
    console.log(`   Open: http://localhost:${port}`);
    console.log(`   Press Ctrl+C to stop\n`);
  });
}
