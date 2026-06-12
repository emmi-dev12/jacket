#!/usr/bin/env node
import 'dotenv/config';
import { ensureOpenSCAD } from './install.js';
import { runInterpreter } from './interpreter.js';
import { startServer } from './server.js';

const [,, command, ...args] = process.argv;

if (command === 'generate') {
  const prompt = args.join(' ');
  if (!prompt) {
    console.log('Usage: jacket generate "<describe what you want>"\n');
    console.log('Example: jacket generate "a wall-mounted phone holder for iPhone 16"');
    process.exit(1);
  }
  await ensureOpenSCAD();
  const spec = await runInterpreter(prompt);
  console.log('(geometry generation coming next — spec ready)');

} else if (command === 'studio') {
  const port = args[0] ? parseInt(args[0]) : 3141;
  startServer(port);

} else {
  console.log('jacket — the spatial reasoning layer AI never had\n');
  console.log('Commands:');
  console.log('  jacket generate "<description>"   Generate STL from plain English (CLI)');
  console.log('  jacket studio                     Open visual Studio in browser');
  console.log('  jacket studio 8080                Studio on a custom port\n');
}
