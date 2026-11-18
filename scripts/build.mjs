import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
await build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  outfile: 'dist/app.js',
  format: 'esm',
  target: 'es2022',
  jsx: 'automatic',
  minify: true,
  legalComments: 'none',
});
console.log('Built dist/');
