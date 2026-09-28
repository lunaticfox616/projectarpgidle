// Serve next/site/ under /projectarpgidle/, the same subpath GitHub Pages uses, to check a build.
// Usage: node tools/preview-site.ts [port]
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../site/', import.meta.url));
const base = '/projectarpgidle/';
const port = Number(process.argv[2] ?? 8124);
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};
if (!existsSync(root)) throw new Error('next/site/ does not exist: run npm run build:site first');

createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]!);
  if (!path.startsWith(base)) {
    res.writeHead(302, { location: base }).end();
    return;
  }
  const file = normalize(join(root, path.slice(base.length) || 'index.html'));
  const target = file.startsWith(root) && existsSync(file) && statSync(file).isDirectory() ? join(file, 'index.html') : file;
  if (!target.startsWith(root) || !existsSync(target)) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': types[extname(target)] ?? 'application/octet-stream' });
  createReadStream(target).pipe(res);
}).listen(port, () => console.log(`preview: http://localhost:${port}${base}`));
