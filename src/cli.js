#!/usr/bin/env node
import { ensureOpenSCAD } from './install.js';

const [,, command, ...args] = process.argv;

if (command === 'generate') {
  await ensureOpenSCAD();
  console.log('(geometry pipeline coming next)');
} else {
  console.log('jacket — the spatial reasoning layer AI never had\n');
  console.log('Commands:');
  console.log('  jacket generate "<description>"   Generate a 3D-printable STL from plain English');
}
