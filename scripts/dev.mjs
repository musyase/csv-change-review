import { context } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
const ctx = await context({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  outfile: 'dist/app.js',
  format: 'esm',
  target: 'es2022',
  jsx: 'automatic',
  sourcemap: true,
});
await ctx.watch();
const server = await ctx.serve({ servedir: 'dist', host: '127.0.0.1', port: 5173 });
console.log(`Open http://127.0.0.1:${server.port}/`);
