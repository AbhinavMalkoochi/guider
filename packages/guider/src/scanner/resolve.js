import path from 'node:path';
import fs from 'node:fs';

const EXTS = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];

function tryResolve(base) {
  for (const ext of EXTS) {
    const p = base + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  return null;
}

export function resolveImport(spec, fromFile, cwd) {
  // Strip type imports
  if (!spec) return null;

  if (spec.startsWith('.')) {
    const base = path.resolve(path.dirname(fromFile), spec);
    return tryResolve(base);
  }
  if (spec.startsWith('/')) {
    const base = path.resolve(cwd, '.' + spec);
    return tryResolve(base);
  }
  // Common Next/TS path alias `@/...`
  if (spec.startsWith('@/')) {
    const candidates = [
      path.resolve(cwd, spec.slice(2)),
      path.resolve(cwd, 'src', spec.slice(2)),
    ];
    for (const c of candidates) {
      const r = tryResolve(c);
      if (r) return r;
    }
  }
  return null;
}
