// Image loading for the browser view. Old-game art comes from the paths in art-paths.ts; the
// character kit comes from the gitignored next/assets/characters/ and may be absent (public clones),
// in which case the view draws simple stand-ins and says why.
import { sheetPath, type CharacterSheet, type JobId, type Motion } from '../data/characters.ts';
import { NORMAL_SHEETS, OLD_ASSETS as OLD, artPath } from './art-paths.ts';
import type { ClassId, CurrencyKey, EnemyKind, Slot } from '../core/types.ts';

export interface CharacterArt { sheet: CharacterSheet; motions: Record<Motion, HTMLImageElement> }

/** How one enemy kind of an act is cut from its sheet. */
export interface EnemyArt {
  image: HTMLImageElement | HTMLCanvasElement;
  /** Source rectangles of the animation frames. */
  frames: [number, number, number, number][];
  frameMs: number;
  /** On-screen height in art pixels (the hero is about 21). */
  height: number;
  /** True when the source faces left, so facing right mirrors it. */
  facesLeft: boolean;
}

export interface Art {
  character: CharacterArt | null;
  /** Why the character kit is missing, shown to the player. Null when loaded. */
  characterProblem: string | null;
  material: HTMLImageElement | null;
  enemies: Record<EnemyKind, EnemyArt | null>;
  currencies: Partial<Record<CurrencyKey, HTMLImageElement>>;
}

const cache = new Map<string, Promise<HTMLImageElement | null>>();

/** Resolves null (and warns once) when the file cannot be loaded; callers draw a stand-in. */
export function loadImage(url: string): Promise<HTMLImageElement | null> {
  let pending = cache.get(url);
  if (!pending) {
    const image = new Image();
    image.src = url;
    pending = image.decode().then(() => image, (error: unknown) => {
      console.warn(`art: could not load ${url}`, error);
      return null;
    });
    cache.set(url, pending);
  }
  return pending;
}

const cells = (list: [number, number][], size: number): [number, number, number, number][] =>
  list.map(([x, y]) => [x * size, y * size, size, size]);

/** Normal enemies rotate through the old game's three wood species by act. */
async function normalArt(act: number): Promise<EnemyArt | null> {
  const species = act % 3;
  if (species === 1) {
    const image = await loadImage(OLD + artPath.normal('root-spider'));
    const frames = cells(Array.from({ length: 16 }, (_, f) => [f % 4, Math.floor(f / 4)] as [number, number]), 64);
    return image && { image, frames, frameMs: 70, height: 20, facesLeft: true };
  }
  const [sheet, cx, cy] = species === 2 ? [NORMAL_SHEETS[1], 1, 0] as const : [NORMAL_SHEETS[2], 0, 0] as const;
  const image = await loadImage(OLD + artPath.normal(sheet));
  const frames = cells(Array.from({ length: 9 }, (_, f) => [(f % 3) * 4 + cx, Math.floor(f / 3) * 4 + cy] as [number, number]), 64);
  return image && { image, frames, frameMs: 110, height: 18, facesLeft: false };
}

/** Elites are wood puppets: nine frames, four costume variants in 2x2 quarters of each frame. */
async function eliteArt(act: number): Promise<EnemyArt | null> {
  const images = await Promise.all(Array.from({ length: 9 }, (_, i) => loadImage(OLD + artPath.puppetFrame(i))));
  if (images.some(i => !i)) return null;
  const variant = act % 4, sx = (variant % 2) * 128, sy = Math.floor(variant / 2) * 128;
  // One strip keeps EnemyArt single-image: the nine frames are copied side by side.
  const strip = document.createElement('canvas');
  strip.width = 128 * 9;
  strip.height = 128;
  const ctx = strip.getContext('2d')!;
  images.forEach((image, i) => ctx.drawImage(image!, sx, sy, 128, 128, i * 128, 0, 128, 128));
  // The canvas is drawn directly: reading it back (toDataURL) fails on file:// where images taint it.
  return { image: strip, frames: cells(Array.from({ length: 9 }, (_, i) => [i, 0] as [number, number]), 128), frameMs: 120, height: 30, facesLeft: false };
}

async function bossArt(act: number): Promise<EnemyArt | null> {
  const image = await loadImage(OLD + artPath.boss(act));
  return image && { image, frames: [[0, 0, image.width, image.height]], frameMs: 1000, height: 68, facesLeft: false };
}

/** Set by the site build to the imported manifest (or null without a kit); undefined in development. */
declare const __CHARACTER_MANIFEST__: { sheets: unknown[] } | null | undefined;
const NO_KIT = '캐릭터 에셋킷이 없습니다 — npm run import:characters 로 가져오세요';

/** The built site carries the manifest inside the bundle so it also runs from file:// (no fetch). */
async function readManifest(): Promise<{ sheets: unknown[] } | string> {
  if (typeof __CHARACTER_MANIFEST__ !== 'undefined') return __CHARACTER_MANIFEST__ ?? NO_KIT;
  try {
    const response = await fetch('assets/characters/manifest.json');
    if (!response.ok) return NO_KIT;
    return await response.json() as { sheets: unknown[] };
  } catch (error) {
    console.warn('art: character manifest unreadable', error);
    return '캐릭터 에셋킷 목록을 읽지 못했습니다';
  }
}

export async function loadCharacter(job: JobId): Promise<{ art: CharacterArt | null; problem: string | null }> {
  const manifest = await readManifest();
  if (typeof manifest === 'string') return { art: null, problem: manifest };
  // The manifest is written by tools/import-characters.ts from validated kit specs.
  const sheet = Array.isArray(manifest.sheets) ? manifest.sheets.find(s => (s as CharacterSheet).job === job) as CharacterSheet | undefined : undefined;
  if (!sheet) return { art: null, problem: `에셋킷에 ${job} 직업이 없습니다` };
  const motions = {} as Record<Motion, HTMLImageElement>;
  for (const motion of Object.keys(sheet.motions) as Motion[]) {
    const image = await loadImage(`assets/characters/${sheetPath(job, motion, 'composite')}`);
    if (!image) return { art: null, problem: `캐릭터 시트를 읽지 못했습니다 (${motion})` };
    motions[motion] = image;
  }
  return { art: { sheet, motions }, problem: null };
}

export async function loadCurrencyIcons(): Promise<Art['currencies']> {
  const out: Art['currencies'] = {};
  const keys: CurrencyKey[] = ['magicBud', 'sapBud', 'formlessDew', 'goldenRule', 'blightSpore', 'bossCore', 'challengeMark'];
  await Promise.all(keys.map(async key => {
    const path = artPath.currency(key);
    const image = path ? await loadImage(OLD + path) : null;
    if (image) out[key] = image;
  }));
  return out;
}

export const itemIconUrl = (slot: Slot, classId: ClassId): string => OLD + artPath.item(slot, classId);

export const currencyIconUrl = (key: CurrencyKey): string | null => {
  const path = artPath.currency(key);
  return path ? OLD + path : null;
};

/** Everything one act needs. The character is loaded once per class and reused. */
export async function loadActArt(act: number, biome: string, character: Pick<Art, 'character' | 'characterProblem'>, currencies: Art['currencies']): Promise<Art> {
  const [material, normal, elite, boss] = await Promise.all([
    loadImage(OLD + artPath.material(biome)), normalArt(act), eliteArt(act), bossArt(act)
  ]);
  return { ...character, material, enemies: { normal, elite, boss }, currencies };
}
