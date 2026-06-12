#!/usr/bin/env node
import 'dotenv/config';

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const provider = args.find(a => a.startsWith('--model='))?.split('=')[1] || 'claude';

if (flags.has('--webui')) {
  const { startServer } = await import('./server.js');
  const port = args.find(a => a.startsWith('--port='))?.split('=')[1] || 3141;
  startServer(Number(port));

} else if (flags.has('--help') || flags.has('-h')) {
  console.log(`
jacket — the spatial reasoning layer AI never had

Usage:
  jacket                        Open interactive TUI
  jacket --webui                Open Studio in browser (localhost:3141)
  jacket --webui --port=8080    Studio on custom port
  jacket --model=grok           Use a specific provider (claude/openai/grok)
  jacket --help                 Show this help

History is saved to ~/.jacket/history.json
`);

} else {
  // Default: TUI
  const { startTUI } = await import('./tui.js');
  startTUI(provider);
}
