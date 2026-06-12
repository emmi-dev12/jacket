import { execSync, spawnSync } from 'child_process';
import * as readline from 'readline';
import * as os from 'os';

const OPENSCAD_LINKS = {
  official: 'https://openscad.org/downloads.html',
  brew: 'https://formulae.brew.sh/cask/openscad',
  apt: 'https://packages.ubuntu.com/search?keywords=openscad',
  wsl: 'https://learn.microsoft.com/en-us/windows/wsl/install',
};

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim().toLowerCase()); }));
}

function isInstalled(cmd) {
  try { execSync(`which ${cmd}`, { stdio: 'ignore' }); return true; }
  catch { return false; }
}

function detectPlatform() {
  const platform = os.platform();
  if (platform === 'darwin') return 'mac';
  if (platform === 'win32') return 'windows';
  // Linux — check if inside WSL
  try {
    const release = execSync('uname -r', { encoding: 'utf8' });
    if (release.toLowerCase().includes('microsoft')) return 'wsl';
  } catch {}
  return 'linux';
}

async function installMac() {
  console.log('\nJacket needs OpenSCAD to compile 3D geometry into printable files.');
  console.log('→ What it does: converts AI-generated geometry code into STL files your printer understands.');
  console.log(`→ Verify it yourself: ${OPENSCAD_LINKS.official}`);
  console.log(`→ Homebrew formula: ${OPENSCAD_LINKS.brew}\n`);

  if (!isInstalled('brew')) {
    console.log('Homebrew is also required to install OpenSCAD on macOS.');
    console.log('→ Homebrew is a standard Mac package manager used by millions of developers.');
    console.log('→ Verify: https://brew.sh\n');
    const ans = await ask('May Jacket install Homebrew and then OpenSCAD? (yes/no) → ');
    if (ans !== 'yes' && ans !== 'y') {
      console.log('\nNo problem. Install manually: https://brew.sh, then run: brew install --cask openscad');
      process.exit(0);
    }
    console.log('\nInstalling Homebrew...');
    spawnSync('/bin/bash', ['-c', '$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)'], { stdio: 'inherit' });
  } else {
    const ans = await ask('May Jacket install OpenSCAD via Homebrew? (yes/no) → ');
    if (ans !== 'yes' && ans !== 'y') {
      console.log('\nNo problem. Run manually: brew install --cask openscad');
      process.exit(0);
    }
  }

  console.log('\nInstalling OpenSCAD...');
  spawnSync('brew', ['install', '--cask', 'openscad'], { stdio: 'inherit' });
}

async function installLinux() {
  console.log('\nJacket needs OpenSCAD to compile 3D geometry into printable files.');
  console.log('→ What it does: converts AI-generated geometry code into STL files your printer understands.');
  console.log(`→ Verify it yourself: ${OPENSCAD_LINKS.official}`);
  console.log(`→ Ubuntu/Debian package: ${OPENSCAD_LINKS.apt}\n`);

  const ans = await ask('May Jacket install OpenSCAD via apt-get? (yes/no) → ');
  if (ans !== 'yes' && ans !== 'y') {
    console.log('\nNo problem. Run manually: sudo apt-get install openscad');
    process.exit(0);
  }

  console.log('\nInstalling OpenSCAD...');
  spawnSync('sudo', ['apt-get', 'install', '-y', 'openscad'], { stdio: 'inherit' });
}

function explainWSLRequired() {
  console.log('\nJacket runs on Windows via WSL (Windows Subsystem for Linux).');
  console.log('→ WSL lets you run Linux tools natively on Windows — no virtual machine needed.');
  console.log(`→ What it is: ${OPENSCAD_LINKS.wsl}`);
  console.log(`→ OpenSCAD on Linux: ${OPENSCAD_LINKS.apt}`);
  console.log('\nTo get started:');
  console.log('  1. Open PowerShell as Administrator');
  console.log('  2. Run: wsl --install');
  console.log('  3. Restart your machine');
  console.log('  4. Open the WSL terminal and run: npx jacket-ai generate "your idea"\n');
  process.exit(0);
}

export async function ensureOpenSCAD() {
  if (isInstalled('openscad')) return;

  const platform = detectPlatform();

  if (platform === 'windows') {
    explainWSLRequired();
    return;
  }

  console.log('\n── Jacket needs one dependency ──────────────────────────────');

  if (platform === 'mac') await installMac();
  else await installLinux(); // covers both linux and wsl

  if (!isInstalled('openscad')) {
    console.log('\nOpenSCAD installation could not be verified. Please install manually:');
    console.log(`  ${OPENSCAD_LINKS.official}`);
    process.exit(1);
  }

  console.log('\n✓ OpenSCAD ready.\n');
}
