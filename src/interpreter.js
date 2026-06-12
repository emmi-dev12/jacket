import Anthropic from '@anthropic-ai/sdk';
import * as readline from 'readline';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are Jacket's interpreter — the layer that ensures the AI understands exactly what the user wants before generating any 3D geometry.

Your job is to take a user's rough description of a 3D object and, through a short focused conversation, produce a precise, unambiguous specification that can be handed to a geometry engine.

Rules:
- Ask ONLY what you genuinely need. Never ask for information you can reasonably infer or that doesn't affect the geometry.
- Ask at most 3-4 questions total, one or two at a time.
- When you have enough, output EXACTLY this format and nothing else:

SPEC_READY
name: <short object name>
description: <one sentence>
dimensions: <key measurements with units>
features: <comma-separated list of specific features>
material_hint: <pla/petg/resin/unknown>
printer_constraints: <any known limits, or "standard">

Do not output SPEC_READY until you are genuinely confident you can generate the correct object. If something is ambiguous, ask.`;

function ask(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt, ans => { rl.close(); resolve(ans); }));
}

function parseSpec(text) {
  const lines = text.replace('SPEC_READY', '').trim().split('\n');
  const spec = {};
  for (const line of lines) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) spec[key.trim()] = rest.join(':').trim();
  }
  return spec;
}

export async function runInterpreter(initialPrompt) {
  const messages = [{ role: 'user', content: initialPrompt }];

  console.log('\n── Jacket is reading your request ──────────────────────────\n');

  while (true) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages,
    });

    const reply = response.content[0].text;

    if (reply.includes('SPEC_READY')) {
      const spec = parseSpec(reply);
      console.log('\n── Jacket has what it needs ─────────────────────────────────');
      console.log(`  Object   : ${spec.name}`);
      console.log(`  Spec     : ${spec.description}`);
      console.log(`  Size     : ${spec.dimensions}`);
      console.log(`  Features : ${spec.features}`);
      console.log(`  Material : ${spec.material_hint}`);
      console.log('─────────────────────────────────────────────────────────────\n');
      return spec;
    }

    // Jacket is asking a question
    console.log(`Jacket: ${reply}\n`);
    const userAnswer = await ask('You: ');
    console.log();

    messages.push({ role: 'assistant', content: reply });
    messages.push({ role: 'user', content: userAnswer });
  }
}
