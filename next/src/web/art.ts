// What the view draws actors with. Monsters are drawn in code (monsters.ts); the character kit comes
// from the gitignored next/assets/characters/ and may be absent (public clones), in which case the
// view draws a simple stand-in and says why.
import { sheetPath, type CharacterSheet, type JobId, type Motion } from '../data/characters.ts';
import { actEnemies, type EnemyArt } from './monsters.ts';
import type { EnemyKind } from '../core/types.ts';

export interface CharacterArt { sheet: CharacterSheet; motions: Record<Motion, HTMLImageElement> }

export interface Art {
  character: CharacterArt | null;
  /** Why the character kit is missing, shown to the player. Null when loaded. */
  characterProblem: string | null;
  enemies: Record<EnemyKind, EnemyArt>;
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

/** Everything one act needs. The character is loaded once per class and reused. */
export function actArt(act: number, character: Pick<Art, 'character' | 'characterProblem'>): Art {
  return { ...character, enemies: actEnemies(act) };
}
