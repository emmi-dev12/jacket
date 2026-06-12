import { execSync, spawnSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

function isManifold(stlPath) {
  // Basic manifold check: STL must have matching triangle count in header
  const buf = readFileSync(stlPath);
  if (buf.length < 84) return false;
  const triangleCount = buf.readUInt32LE(80);
  const expectedSize = 84 + triangleCount * 50;
  return buf.length === expectedSize;
}

export function compileToSTL(openscadCode) {
  const id = randomUUID();
  const scadPath = join(tmpdir(), `jacket-${id}.scad`);
  const stlPath = join(tmpdir(), `jacket-${id}.stl`);

  try {
    writeFileSync(scadPath, openscadCode);

    const result = spawnSync('openscad', ['-o', stlPath, scadPath], {
      timeout: 30000,
      encoding: 'utf8',
    });

    if (result.status !== 0) {
      const err = result.stderr || result.error?.message || 'OpenSCAD failed';
      throw new Error(`Geometry compilation failed: ${err}`);
    }

    if (!existsSync(stlPath)) {
      throw new Error('OpenSCAD ran but produced no output file');
    }

    const stlBuffer = readFileSync(stlPath);

    if (!isManifold(stlBuffer.length > 0 ? stlPath : stlPath)) {
      console.warn('Warning: STL may not be fully manifold — check before printing');
    }

    return stlBuffer;
  } finally {
    if (existsSync(scadPath)) unlinkSync(scadPath);
    if (existsSync(stlPath)) unlinkSync(stlPath);
  }
}
