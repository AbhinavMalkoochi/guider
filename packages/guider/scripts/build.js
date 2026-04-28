// Build the widget + agent entrypoints with esbuild.
// Produces dist/widget.{mjs,cjs} and dist/agent.{mjs,cjs}.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const shared = {
  bundle: true,
  platform: 'browser',
  target: ['es2020', 'chrome90', 'firefox90', 'safari14'],
  jsx: 'automatic',
  loader: { '.js': 'jsx', '.jsx': 'jsx', '.ts': 'ts', '.tsx': 'tsx' },
  external: ['react', 'react-dom', 'react/jsx-runtime', 'html2canvas'],
  logLevel: 'info',
  banner: { js: '"use client";' },
};

await Promise.all([
  build({ ...shared, entryPoints: [path.join(root, 'src/widget/index.ts')], outfile: path.join(root, 'dist/widget.mjs'), format: 'esm' }),
  build({ ...shared, entryPoints: [path.join(root, 'src/widget/index.ts')], outfile: path.join(root, 'dist/widget.cjs'), format: 'cjs' }),
  build({ ...shared, entryPoints: [path.join(root, 'src/agent/index.js')], outfile: path.join(root, 'dist/agent.mjs'), format: 'esm' }),
  build({ ...shared, entryPoints: [path.join(root, 'src/agent/index.js')], outfile: path.join(root, 'dist/agent.cjs'), format: 'cjs' }),
]);

// Hand-written .d.ts (small surface area)
import { writeFile, readFile } from 'node:fs/promises';
const dtsPath = path.join(root, 'dist/widget.d.ts');
let dts;
try {
  // Preserve the curated d.ts authored by hand if it exists already.
  dts = await readFile(dtsPath, 'utf8');
} catch {
  dts = `import * as React from 'react';
export interface GuiderWidgetProps {
  apiKey?: string;
  mapUrl?: string;
  map?: object;
  proxyUrl?: string;
  whisperUrl?: string;
  model?: string;
  endpoint?: string;
  currentRoute?: string;
  position?: 'bottom-right' | 'bottom-left';
  accent?: string;
  agent?: boolean;
  greeting?: string;
}
export const GuiderWidget: React.FC<GuiderWidgetProps>;
export const agentMode: { available: boolean; run: (args: any) => Promise<any> };
`;
}
await writeFile(dtsPath, dts);

console.log('✓ Built dist/');
