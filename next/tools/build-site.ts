// Assemble the deployable site in next/site/: the game at the root, its bundle and stylesheet, the
// old-game art it uses and the imported character sheets, all under relative paths so the site
// works from any Pages subpath. Usage: node tools/build-site.ts [--allow-missing-characters]
import { build } from 'esbuild';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { oldArtFiles } from '../src/web/art-paths.ts';

const next = fileURLToPath(new URL('..', import.meta.url));
const repoAssets = join(next, '..', 'assets');
const out = join(next, 'site');
const characters = join(next, 'assets', 'characters');
const allowMissing = process.argv.includes('--allow-missing-characters');

if (!existsSync(join(characters, 'manifest.json')) && !allowMissing) {
  throw new Error('character sheets missing: run npm run import:characters first (or pass --allow-missing-characters for a test build)');
}

/** Rewrite development paths to site paths and refuse anything still pointing outside the site. */
function rewrite(file: string, source: string, pairs: [string, string][]): string {
  const result = pairs.reduce((text, [from, to]) => text.split(from).join(to), source);
  if (result.includes('../')) throw new Error(`${file} still points outside the site: ${result.match(/[^'"(]*\.\.\/[^'")]*/)?.[0]}`);
  return result;
}

const html = rewrite('index.html', readFileSync(join(next, 'index.html'), 'utf8'), [['src/web/style.css', 'style.css'], ['build/main.js', 'main.js'], ['../assets/', 'assets/']]);
const css = rewrite('style.css', readFileSync(join(next, 'src/web/style.css'), 'utf8'), [['../../../assets/', 'assets/']]);
const referenced = [...`${html}\n${css}`.matchAll(/assets\/([\w\-./()]+?\.(?:png|webp|woff2))/g)].map(m => m[1]!);
const fontLicenses = readdirSync(join(repoAssets, 'fonts')).filter(f => f.startsWith('LICENSE-')).map(f => `fonts/${f}`);
const files = [...new Set([...oldArtFiles(), ...referenced, ...fontLicenses])].sort();
const missing = files.filter(f => !existsSync(join(repoAssets, f)));
if (missing.length) throw new Error(`old-game art missing from /assets: ${missing.join(', ')}`);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
await build({
  entryPoints: [join(next, 'src/web/main.ts')], bundle: true, format: 'esm', target: 'es2022', minify: true,
  outfile: join(out, 'main.js'), define: { __OLD_ASSETS__: '"assets/"' }, logLevel: 'warning'
});
writeFileSync(join(out, 'index.html'), html);
writeFileSync(join(out, 'style.css'), css);
for (const file of files) {
  mkdirSync(dirname(join(out, 'assets', file)), { recursive: true });
  copyFileSync(join(repoAssets, file), join(out, 'assets', file));
}
if (existsSync(characters)) cpSync(characters, join(out, 'assets', 'characters'), { recursive: true });

const size = (dir: string): number => readdirSync(dir, { withFileTypes: true })
  .reduce((sum, d) => sum + (d.isDirectory() ? size(join(dir, d.name)) : statSync(join(dir, d.name)).size), 0);
console.log(`site: ${files.length} art files${existsSync(characters) ? ' + character sheets' : ' (no character sheets)'}, ${(size(out) / 1e6).toFixed(1)} MB -> next/site/`);
