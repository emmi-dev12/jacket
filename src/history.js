import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const DIR = join(homedir(), '.jacket');
const FILE = join(DIR, 'history.json');

function load() {
  if (!existsSync(FILE)) return [];
  try { return JSON.parse(readFileSync(FILE, 'utf8')); }
  catch { return []; }
}

function save(entries) {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(entries, null, 2));
}

export function addEntry({ prompt, spec, openscad, stlPath }) {
  const entries = load();
  entries.unshift({
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    prompt,
    spec,
    openscad,
    stlPath: stlPath || null,
  });
  save(entries.slice(0, 100)); // keep last 100
}

export function getHistory() {
  return load();
}
