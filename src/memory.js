import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { chat } from './adapters/index.js';

const DIR = join(homedir(), '.jacket');
const FILE = join(DIR, 'memory.json');

const EMPTY = {
  sessionCount: 0,
  printerProfile: {},
  dimensionPreferences: {},
  aestheticNotes: [],
  corrections: [],
  frequentObjects: [],
  customContext: '',
};

export function loadMemory() {
  if (!existsSync(FILE)) return { ...EMPTY };
  try { return { ...EMPTY, ...JSON.parse(readFileSync(FILE, 'utf8')) }; }
  catch { return { ...EMPTY }; }
}

export function saveMemory(mem) {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(mem, null, 2));
}

// Called after each completed session to extract learnings
export async function learnFromSession({ provider, spec, originalCode, editedCode, conversation }) {
  const mem = loadMemory();
  mem.sessionCount += 1;

  // If user edited the OpenSCAD, note the correction pattern
  if (editedCode && editedCode !== originalCode) {
    mem.corrections.push({
      timestamp: new Date().toISOString(),
      object: spec?.name,
      note: 'User modified generated geometry',
    });
  }

  // Track frequent object types
  if (spec?.shape_hint) {
    const existing = mem.frequentObjects.find(o => o.type === spec.shape_hint);
    if (existing) existing.count += 1;
    else mem.frequentObjects.push({ type: spec.shape_hint, count: 1 });
  }

  // Ask AI to extract learnable facts from this session
  if (conversation?.length > 2) {
    try {
      const summary = await chat({
        provider,
        system: `You extract user preferences from a Jacket 3D printing session.
Output a JSON object with any of these fields if learned (omit fields you didn't learn anything about):
{
  "printer": { "filament": "pla|petg|resin", "bedSize": "220x220" },
  "dimensionPreferences": { "toleranceNote": "...", "scalePreference": "..." },
  "aestheticNote": "one sentence about the user's design taste",
  "customContext": "any other persistent fact worth remembering"
}
Output only valid JSON. If nothing useful was learned, output {}.`,
        messages: [
          { role: 'user', content: `Session conversation:\n${conversation.map(m => `${m.role}: ${m.content}`).join('\n')}` }
        ],
      });

      try {
        const learned = JSON.parse(summary);
        if (learned.printer) Object.assign(mem.printerProfile, learned.printer);
        if (learned.dimensionPreferences) Object.assign(mem.dimensionPreferences, learned.dimensionPreferences);
        if (learned.aestheticNote) mem.aestheticNotes = [...mem.aestheticNotes.slice(-4), learned.aestheticNote];
        if (learned.customContext) mem.customContext = learned.customContext;
      } catch {}
    } catch {}
  }

  saveMemory(mem);
}

// Returns a context string to inject into every AI prompt
export function buildMemoryContext() {
  const mem = loadMemory();
  if (mem.sessionCount === 0) return '';

  const parts = [`[Jacket memory — ${mem.sessionCount} sessions]`];

  if (mem.printerProfile?.filament) parts.push(`Preferred filament: ${mem.printerProfile.filament}`);
  if (mem.printerProfile?.bedSize) parts.push(`Printer bed: ${mem.printerProfile.bedSize}mm`);
  if (mem.dimensionPreferences?.toleranceNote) parts.push(`Tolerance note: ${mem.dimensionPreferences.toleranceNote}`);
  if (mem.aestheticNotes.length) parts.push(`Design style: ${mem.aestheticNotes[mem.aestheticNotes.length - 1]}`);
  if (mem.corrections.length > 2) parts.push(`User frequently adjusts generated geometry — be conservative with dimensions.`);
  if (mem.customContext) parts.push(mem.customContext);

  return parts.join('\n');
}
