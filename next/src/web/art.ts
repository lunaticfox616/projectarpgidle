// Image loading for the browser view. Old-game art is read from the repository's /assets; the
// character kit comes from the gitignored next/assets/characters/ and may be absent (public clones),
// in which case the view draws simple stand-ins and says why.
import { sheetPath, type CharacterSheet, type JobId, type Motion } from '../data/characters.ts';
import type { CurrencyKey, EnemyKind } from '../core/types.ts';

const OLD = '../assets/';

export interface CharacterArt { sheet: CharacterSheet; motions: Record<Motion, HTMLImageElement> }

/** How one enemy kind of an act is cut from its sheet. */
export interface EnemyArt {
  image: HTMLImageElement;
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

const BIOME_MATERIAL: Record<string, string> = {
  root: 'root', courtyard: 'courtyard', aerial: 'wood', maze: 'maze', sanctum: 'sanctum',
  ruins: 'ruins', trunk: 'trunk', veil: 'maze', canopy: 'root', crown: 'sanctum'
};

const BOSS_FILES = ['Act1', 'Act2', 'Act3', 'Act4-1', 'Act5', 'Act6', 'Act7', 'Act8-1', 'Act9', 'Act10(1)'];

const cells = (list: [number, number][], size: number): [number, number, number, number][] =>
  list.map(([x, y]) => [x * size, y * size, size, size]);

/** Normal enemies rotate through the old game's three wood species by act. */
async function normalArt(act: number): Promise<EnemyArt | null> {
  const species = act % 3;
  if (species === 1) {
    const image = await loadImage(`${OLD}enemies/wood/root-spider.png`);
    const frames = cells(Array.from({ length: 16 }, (_, f) => [f % 4, Math.floor(f / 4)] as [number, number]), 64);
    return image && { image, frames, frameMs: 70, height: 20, facesLeft: true };
  }
  const [file, cx, cy] = species === 2 ? ['wood-slimes', 1, 0] : ['sap-leeches', 0, 0];
  const image = await loadImage(`${OLD}enemies/wood/${file}.png`);
  const frames = cells(Array.from({ length: 9 }, (_, f) => [(f % 3) * 4 + cx, Math.floor(f / 3) * 4 + cy] as [number, number]), 64);
  return image && { image, frames, frameMs: 110, height: 18, facesLeft: false };
}

/** Elites are wood puppets: nine frames, four costume variants in 2x2 quarters of each frame. */
async function eliteArt(act: number): Promise<EnemyArt | null> {
  const images = await Promise.all(Array.from({ length: 9 }, (_, i) => loadImage(`${OLD}enemies/wood/wood-puppet/frame_00${i}.png`)));
  if (images.some(i => !i)) return null;
  const variant = act % 4, sx = (variant % 2) * 128, sy = Math.floor(variant / 2) * 128;
  // One strip keeps EnemyArt single-image: the nine frames are copied side by side.
  const strip = document.createElement('canvas');
  strip.width = 128 * 9;
  strip.height = 128;
  const ctx = strip.getContext('2d')!;
  images.forEach((image, i) => ctx.drawImage(image!, sx, sy, 128, 128, i * 128, 0, 128, 128));
  const image = new Image();
  image.src = strip.toDataURL();
  await image.decode();
  return { image, frames: cells(Array.from({ length: 9 }, (_, i) => [i, 0] as [number, number]), 128), frameMs: 120, height: 30, facesLeft: false };
}

async function bossArt(act: number): Promise<EnemyArt | null> {
  const image = await loadImage(`${OLD}boss/${BOSS_FILES[act - 1] ?? 'Act1'}.png`);
  return image && { image, frames: [[0, 0, image.width, image.height]], frameMs: 1000, height: 68, facesLeft: false };
}

export async function loadCharacter(job: JobId): Promise<{ art: CharacterArt | null; problem: string | null }> {
  let manifest: { sheets: unknown[] };
  try {
    const response = await fetch('assets/characters/manifest.json');
    if (!response.ok) return { art: null, problem: '캐릭터 에셋킷이 없습니다 — npm run import:characters 로 가져오세요' };
    manifest = await response.json() as { sheets: unknown[] };
  } catch (error) {
    console.warn('art: character manifest unreadable', error);
    return { art: null, problem: '캐릭터 에셋킷 목록을 읽지 못했습니다' };
  }
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

const CURRENCY_FILES: Partial<Record<CurrencyKey, string>> = {
  magicBud: 'magic-bud', sapBud: 'sap-bud', formlessDew: 'formless-dew', goldenRule: 'golden-rule', blightSpore: 'blight-spore'
};

export async function loadCurrencyIcons(): Promise<Art['currencies']> {
  const out: Art['currencies'] = {};
  await Promise.all(Object.entries(CURRENCY_FILES).map(async ([key, file]) => {
    const image = await loadImage(`${OLD}ui/currency/${file}.png`);
    if (image) out[key as CurrencyKey] = image;
  }));
  return out;
}

export const itemIconUrl = (slot: 'weapon' | 'armor' | 'ring', classId: 'warrior' | 'arcanist'): string =>
  `${OLD}items/${slot === 'weapon' ? (classId === 'warrior' ? 'root-sword' : 'branch-staff') : slot === 'armor' ? 'root-armor' : 'ruby-ring'}-v3.png`;

export const currencyIconUrl = (key: CurrencyKey): string | null => {
  const file = CURRENCY_FILES[key];
  return file ? `${OLD}ui/currency/${file}.png` : null;
};

/** Everything one act needs. The character is loaded once per class and reused. */
export async function loadActArt(act: number, biome: string, character: Pick<Art, 'character' | 'characterProblem'>, currencies: Art['currencies']): Promise<Art> {
  const [material, normal, elite, boss] = await Promise.all([
    loadImage(`${OLD}exploration/${BIOME_MATERIAL[biome] ?? 'root'}-materials.png`), normalArt(act), eliteArt(act), bossArt(act)
  ]);
  return { ...character, material, enemies: { normal, elite, boss }, currencies };
}
