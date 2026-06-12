import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const DIR = join(homedir(), '.jacket');
const FILE = join(DIR, 'settings.json');

const DEFAULTS = {
  provider: 'claude',
  model: null, // null = use provider default
  hardLimit: true, // require "open the hive" before acting
  maxTokensPerSession: 4000,
  apiKeys: {
    claude: null,
    openai: null,
    grok: null,
    deepseek: null,
  },
  printer: {
    bedWidth: 220,
    bedDepth: 220,
    bedHeight: 250,
    filament: 'pla',
  },
};

export function loadSettings() {
  if (!existsSync(FILE)) return { ...DEFAULTS };
  try {
    const stored = JSON.parse(readFileSync(FILE, 'utf8'));
    return { ...DEFAULTS, ...stored, apiKeys: { ...DEFAULTS.apiKeys, ...stored.apiKeys }, printer: { ...DEFAULTS.printer, ...stored.printer } };
  } catch { return { ...DEFAULTS }; }
}

export function saveSettings(settings) {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(settings, null, 2));
}

export function updateSettings(patch) {
  const current = loadSettings();
  const updated = { ...current, ...patch };
  saveSettings(updated);
  return updated;
}
