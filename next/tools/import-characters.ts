// Copy the game sheets of a local 리그닌 캐릭터 에셋킷 into assets/characters/ (gitignored: the kit's
// license forbids public redistribution) and write assets/characters/manifest.json.
// Usage: node tools/import-characters.ts <path to 리그닌_캐릭터_에셋킷>
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FACINGS, KIT_JOBS, KIT_LAYERS, KIT_MOTIONS, parseKitSheet, projectilePath, sheetPath,
  type CharacterSheet, type JobId, type Motion, type SheetLayer
} from '../src/data/characters.ts';

const given = process.argv[2];
if (!given) throw new Error('usage: node tools/import-characters.ts <kit directory>');

/** The kit folder itself, or the one folder inside it (an unzipped kit or a checked-out asset repo). */
function findJobsDir(root: string): string {
  const candidates = [root, ...readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => join(root, d.name))];
  const found = candidates.map(dir => join(dir, '결과물', 'Hana_직업')).find(existsSync);
  if (!found) throw new Error(`not a character kit (no 결과물/Hana_직업 in it or one level down): ${root}`);
  return found;
}
const jobsDir = findJobsDir(given);
const out = fileURLToPath(new URL('../assets/characters/', import.meta.url));

/** Width and height from a PNG's IHDR chunk. */
function pngSize(path: string): [number, number] {
  const head = readFileSync(path).subarray(0, 24);
  if (head.toString('latin1', 12, 16) !== 'IHDR') throw new Error(`not a PNG: ${path}`);
  return [head.readUInt32BE(16), head.readUInt32BE(20)];
}

// Validate everything before touching the output, so a bad kit never leaves a half-written folder.
const sheets: CharacterSheet[] = [];
/** [source, published path, columns, rows, cell px] */
const copies: [string, string, number, number, number][] = [];
for (const [job, name] of Object.entries(KIT_JOBS) as [JobId, string][]) {
  const dir = join(jobsDir, name);
  const sheet = parseKitSheet(job, JSON.parse(readFileSync(join(dir, `${name}_규격.json`), 'utf8')));
  sheets.push(sheet);
  for (const [motion, motionName] of Object.entries(KIT_MOTIONS) as [Motion, string][]) {
    for (const [layer, layerName] of Object.entries(KIT_LAYERS) as [SheetLayer, string][]) {
      copies.push([join(dir, `${name}_${motionName}_${layerName}.png`), sheetPath(job, motion, layer), sheet.motions[motion].frames, FACINGS.length, sheet.cell]);
    }
  }
  if (sheet.projectile) copies.push([join(dir, `${name}_화살.png`), projectilePath(job), FACINGS.length, 1, sheet.projectile.cell]);
}
for (const [from, , columns, rows, cell] of copies) {
  const [w, h] = pngSize(from);
  if (w !== columns * cell || h !== rows * cell) throw new Error(`${from}: ${w}x${h}, expected ${columns * cell}x${rows * cell}`);
}

rmSync(out, { recursive: true, force: true });
for (const sheet of sheets) mkdirSync(join(out, sheet.job), { recursive: true });
for (const [from, to] of copies) copyFileSync(from, join(out, to));
writeFileSync(join(out, 'manifest.json'), `${JSON.stringify({ sheets }, null, 1)}\n`);
console.log(`character sheets: ${sheets.length} jobs, ${copies.length} images -> assets/characters/`);
