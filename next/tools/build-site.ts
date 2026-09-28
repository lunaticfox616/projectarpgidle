// Assemble the deployable site in next/site/: the game at the root, its bundle and stylesheet, the
// old-game art it uses and the imported character sheets, all under relative paths. The bundle is a
// classic script with the character manifest inlined, so the same folder runs on any Pages subpath
// and straight from disk (index.html opened as file://). Usage:
//   node tools/build-site.ts [--allow-missing-characters] [--zip <file>]
import { build } from 'esbuild';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
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

const html = rewrite('index.html', readFileSync(join(next, 'index.html'), 'utf8'), [
  ['src/web/style.css', 'style.css'], ['<script type="module" src="build/main.js">', '<script defer src="main.js">'], ['../assets/', 'assets/']
]);
if (!html.includes('<script defer src="main.js">')) throw new Error('index.html: game script tag not found');
const manifestFile = join(characters, 'manifest.json');
const manifest = existsSync(manifestFile) ? readFileSync(manifestFile, 'utf8') : 'null';
const css = rewrite('style.css', readFileSync(join(next, 'src/web/style.css'), 'utf8'), [['../../../assets/', 'assets/']]);
const referenced = [...`${html}\n${css}`.matchAll(/assets\/([\w\-./()]+?\.(?:png|webp|woff2))/g)].map(m => m[1]!);
const fontLicenses = readdirSync(join(repoAssets, 'fonts')).filter(f => f.startsWith('LICENSE-')).map(f => `fonts/${f}`);
const files = [...new Set([...oldArtFiles(), ...referenced, ...fontLicenses])].sort();
const missing = files.filter(f => !existsSync(join(repoAssets, f)));
if (missing.length) throw new Error(`old-game art missing from /assets: ${missing.join(', ')}`);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
await build({
  entryPoints: [join(next, 'src/web/main.ts')], bundle: true, format: 'iife', target: 'es2022', minify: true,
  outfile: join(out, 'main.js'), define: { __OLD_ASSETS__: '"assets/"', __CHARACTER_MANIFEST__: manifest }, logLevel: 'warning'
});
writeFileSync(join(out, 'index.html'), html);
writeFileSync(join(out, 'style.css'), css);
for (const file of files) {
  mkdirSync(dirname(join(out, 'assets', file)), { recursive: true });
  copyFileSync(join(repoAssets, file), join(out, 'assets', file));
}
if (existsSync(characters)) cpSync(characters, join(out, 'assets', 'characters'), { recursive: true });

const zipAt = process.argv.indexOf('--zip');
if (zipAt > 0) {
  const target = process.argv[zipAt + 1];
  if (!target) throw new Error('--zip needs a file name');
  writeFileSync(join(out, '실행방법.txt'), '압축을 푼 뒤 index.html을 더블클릭하면 브라우저에서 게임이 열립니다.\r\n저장은 그 브라우저에 남습니다. 이 파일은 팀 내부 테스트용입니다(캐릭터 에셋 재배포 금지).\r\n');
  const zipped = spawnSync('zip', ['-qr', resolve(target), '.'], { cwd: out, stdio: 'inherit' });
  if (zipped.status !== 0) throw new Error(`zip failed (${zipped.error?.message ?? `exit ${zipped.status}`}); the site folder is ready in next/site/`);
  console.log(`zip: ${resolve(target)}`);
}

const size = (dir: string): number => readdirSync(dir, { withFileTypes: true })
  .reduce((sum, d) => sum + (d.isDirectory() ? size(join(dir, d.name)) : statSync(join(dir, d.name)).size), 0);
console.log(`site: ${files.length} art files${existsSync(characters) ? ' + character sheets' : ' (no character sheets)'}, ${(size(out) / 1e6).toFixed(1)} MB -> next/site/`);
