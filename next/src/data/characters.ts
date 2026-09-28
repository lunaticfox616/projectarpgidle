// Character sprite kit (리그닌 캐릭터 에셋킷) contract. The kit's images are Hana Caraka derivatives
// whose license forbids public redistribution, so they are never committed: tools/import-characters.ts
// copies them from a local kit into the gitignored assets/characters/ and writes the manifest this
// module describes. Only the shape and the kit-JSON normalization live in the repository.
import type { ClassId } from '../core/types.ts';

export type JobId = 'warrior' | 'arcanist' | 'archer' | 'wanderer' | 'cleric' | 'alchemist';
export type Motion = 'idle' | 'walk' | 'run' | 'hit' | 'attack';
export type Facing = 'down' | 'left' | 'right' | 'up';
/** Draw order inside one cell: weaponBack, base, weaponFront. composite is the three pre-merged. */
export type SheetLayer = 'weaponBack' | 'base' | 'weaponFront' | 'composite';
export type Point = [number, number];

/** Kit folder name of each job (결과물/Hana_직업/<name>/). */
export const KIT_JOBS: Record<JobId, string> = {
  warrior: '전사', arcanist: '비술사', archer: '궁수', wanderer: '방랑자', cleric: '성직자', alchemist: '연금술사'
};
export const KIT_MOTIONS: Record<Motion, string> = { idle: '대기', walk: '걷기', run: '달리기', hit: '피격', attack: '공격' };
export const KIT_LAYERS: Record<SheetLayer, string> = { weaponBack: '무기_뒤', base: '베이스', weaponFront: '무기_앞', composite: '합성' };
/** Sheet rows, top to bottom. The kit mirrors right into left. */
export const FACINGS: readonly Facing[] = ['down', 'left', 'right', 'up'];
const KIT_FACINGS: Record<Facing, string> = { down: '하', left: '좌', right: '우', up: '상' };

/** Which kit job draws each playable class of the core. */
export const CLASS_SPRITES: Record<ClassId, JobId> = { warrior: 'warrior', arcanist: 'arcanist' };

export interface MotionSheet {
  frames: number;
  /** Duration of each frame; ms. */
  frameMs: number[];
  /** Pixels the body, weapon and effects occupy inside a cell: x0, y0, x1, y1. Never crop tighter. */
  bounds: [number, number, number, number];
  /** Frame (0-based) on which the hit lands or the projectile leaves. Attack only. */
  hitFrame: number | null;
  /** Top-left of the 2x2 hand, per facing and frame; cell pixels. */
  hands: Record<Facing, Point[]>;
  /** Body shift already baked into the frames; for aligning extra layers. Null when the motion has none. */
  bodyOffset: Record<Facing, Point[]> | null;
  /** Projectile spawn point per facing; cell pixels. Ranged attacks only. */
  muzzle: Record<Facing, Point> | null;
}

export interface CharacterSheet {
  job: JobId;
  weapon: string;
  /** Square cell size; px. The feet stand near (39, 39) in every cell. */
  cell: number;
  motions: Record<Motion, MotionSheet>;
  /** Straight-flying projectile sheet (archer), one row, one cell per facing left to right in FACINGS order. */
  projectile: { cell: number } | null;
}

/** Published path of one sheet inside assets/characters/. */
export const sheetPath = (job: JobId, motion: Motion, layer: SheetLayer): string => `${job}/${motion}-${layer}.png`;
export const projectilePath = (job: JobId): string => `${job}/projectile.png`;

type Raw = Record<string, unknown>;

function field(raw: unknown, key: string, where: string): unknown {
  if (typeof raw !== 'object' || raw === null || !(key in raw)) throw new Error(`${where}: missing "${key}"`);
  return (raw as Raw)[key];
}

function numbers(value: unknown, length: number | null, where: string): number[] {
  if (!Array.isArray(value) || (length !== null && value.length !== length) || !value.every(n => typeof n === 'number' && Number.isFinite(n))) {
    throw new Error(`${where}: expected ${length ?? 'a list of'} numbers`);
  }
  return value;
}

const point = (value: unknown, where: string): Point => numbers(value, 2, where) as Point;

function perFacing<T>(raw: unknown, where: string, read: (value: unknown, at: string) => T): Record<Facing, T> {
  const out = {} as Record<Facing, T>;
  for (const facing of FACINGS) out[facing] = read(field(raw, KIT_FACINGS[facing], where), `${where}.${facing}`);
  return out;
}

function pointsPerFrame(frames: number) {
  return (value: unknown, where: string): Point[] => {
    if (!Array.isArray(value) || value.length !== frames) throw new Error(`${where}: expected ${frames} points`);
    return value.map((p, i) => point(p, `${where}[${i}]`));
  };
}

function motionSheet(raw: unknown, where: string): MotionSheet {
  const frames = field(raw, '프레임수', where);
  if (!Number.isInteger(frames) || (frames as number) < 1) throw new Error(`${where}: bad frame count`);
  const n = frames as number;
  const hit = (raw as Raw)['타격프레임'];
  if (hit !== undefined && (!Number.isInteger(hit) || (hit as number) < 0 || (hit as number) >= n)) throw new Error(`${where}: hit frame out of range`);
  const offset = (raw as Raw)['몸이동'], muzzle = (raw as Raw)['발사점'];
  return {
    frames: n,
    frameMs: numbers(field(raw, '프레임ms', where), n, `${where}.frameMs`),
    bounds: numbers(field(field(raw, '표시영역', where), '범위', where), 4, `${where}.bounds`) as MotionSheet['bounds'],
    hitFrame: hit === undefined ? null : hit as number,
    hands: perFacing(field(raw, '손(2x2 안쪽 좌상단)', where), `${where}.hands`, pointsPerFrame(n)),
    bodyOffset: offset === undefined ? null : perFacing(field(offset, '값', where), `${where}.bodyOffset`, pointsPerFrame(n)),
    muzzle: muzzle === undefined ? null : perFacing(muzzle, `${where}.muzzle`, point)
  };
}

/**
 * Normalize one kit spec (<직업>_규격.json) into a CharacterSheet. Throws with the failing path;
 * the kit is external input, so this is the only place that reads its Korean keys.
 */
export function parseKitSheet(job: JobId, raw: unknown): CharacterSheet {
  const where = `${KIT_JOBS[job]}_규격.json`;
  const [width, height] = numbers(field(raw, '셀', where), 2, `${where}.cell`);
  if (width !== height) throw new Error(`${where}: cells must be square`);
  const rows = field(raw, '행', where);
  if (JSON.stringify(rows) !== JSON.stringify(FACINGS.map(f => KIT_FACINGS[f]))) throw new Error(`${where}: rows must be 하, 좌, 우, 상`);
  const weapon = field(raw, '무기', where);
  if (typeof weapon !== 'string') throw new Error(`${where}: weapon must be a name`);
  const motionsRaw = field(raw, '모션', where);
  const motions = {} as Record<Motion, MotionSheet>;
  for (const [motion, name] of Object.entries(KIT_MOTIONS) as [Motion, string][]) {
    motions[motion] = motionSheet(field(motionsRaw, name, where), `${where}.${motion}`);
  }
  if (motions.attack.hitFrame === null) throw new Error(`${where}: attack needs a hit frame`);
  const arrow = (raw as Raw)['화살'];
  const projectile = arrow === undefined ? null : { cell: numbers(field(arrow, '셀', where), 2, `${where}.projectile`)[0]! };
  return { job, weapon, cell: width!, motions, projectile };
}
