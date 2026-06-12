#!/usr/bin/env node
import 'dotenv/config';
import { ensureOpenSCAD } from './install.js';
import { runInterpreter } from './interpreter.js';

const [,, command, ...args] = process.argv;

if (command === 'generate') {
  const prompt = args.join(' ');
  if (!prompt) {
    console.log('Usage: jacket generate "<describe what you want>"\n');
    console.log('Example: jacket generate "a wall-mounted phone holder for iPhone 16 with a charging hole at the bottom"');
    process.exit(1);
  }
  await ensureOpenSCAD();
  const spec = await runInterpreter(prompt);
  console.log('(geometry generation coming next — spec ready)');
} else {
  console.log('jacket — the spatial reasoning layer AI never had\n');
  console.log('Commands:');
  console.log('  jacket generate "<description>"   Generate a 3D-printable STL from plain English');
}
