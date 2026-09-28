// Shared shapes of the rules core. Everything in GameState is plain JSON: a save is
// JSON.stringify(state) and a load is JSON.parse, with no class instances or Maps inside.

/** Authored act topology, as imported from the old game. Rooms: [id, x, y, radiusX, radiusY, role]. */
export interface ActPreset {
  act: number;
  id: string;
  biome: string;
  width: number;
  height: number;
  /** Clockwise quarter turns applied after carving. */
  rotation: number;
  gate: [number, number];
  approach: string;
  /** 1 = one-tile corridors; otherwise three-tile-wide corridors. */
  passage?: number;
  rooms: [string, number, number, number, number, RoomRole][];
  links: ([string, string] | [string, string, [number, number][]])[];
}

export type RoomRole = 'entry' | 'battle' | 'elite' | 'optional' | 'boss';

export interface Cell { x: number; y: number }

export interface Room extends Cell { id: string; role: RoomRole; radiusX: number; radiusY: number }

/** Compiled, immutable act map. tiles: row-major, 1 = floor, 0 = wall. */
export interface ActMap {
  act: number;
  id: string;
  biome: string;
  columns: number;
  rows: number;
  tiles: readonly number[];
  rooms: readonly Room[];
  entry: Room;
  boss: Room;
  gate: Cell;
}

export type CurrencyKey = 'magicBud' | 'sapBud' | 'formlessDew' | 'goldenRule' | 'blightSpore' | 'bossCore' | 'challengeMark';
export type Wallet = Record<CurrencyKey, number>;

export type ClassId = 'warrior' | 'arcanist';
export type Slot = 'weapon' | 'armor' | 'ring';
export type AffixStat = 'flatDamage' | 'flatHp' | 'pctAttackSpeed' | 'flatArmor';
export interface Affix { stat: AffixStat; value: number }
export interface Item { id: number; slot: Slot; itemLevel: number; rarity: 'normal' | 'magic' | 'rare'; affixes: Affix[] }

/** Derived from the build. Never stored in the save. */
export interface Stats {
  maxHp: number;
  /** Average damage per hit, before the ±10% roll. */
  damage: number;
  attacksPerSec: number;
  /** Attack reach in tiles, measured as Chebyshev distance. */
  range: number;
  armor: number;
  moveMsPerTile: number;
  /** Life regenerated per second, as a fraction of maxHp. */
  regenPerSec: number;
}

export type EnemyKind = 'normal' | 'elite' | 'boss';
export interface Enemy extends Cell {
  id: number;
  kind: EnemyKind;
  packId: number;
  hp: number;
  maxHp: number;
  damage: number;
  /** Counts down to the next attack; ms. */
  attackMs: number;
  /** Counts down to the next tile step; ms. */
  moveMs: number;
  active: boolean;
}

export interface Pack { id: number; roomId: string; role: RoomRole; alive: number }

/** Experience is granted on each kill; only currencies and items wait for the boss. */
export interface TempLoot { currencies: Partial<Wallet>; items: Item[] }

export type ExploreMode = 'boss' | 'full';

export interface Run {
  act: number;
  status: 'active' | 'cleared' | 'failed';
  player: Cell & { moveMs: number; attackMs: number };
  /** Row-major discovered flags, one per tile (0 or 1). */
  fog: number[];
  enemies: Enemy[];
  packs: Pack[];
  gateOpen: boolean;
  /** Settled into the save exactly once, when the boss falls. Lost on death. */
  loot: TempLoot;
  /** After the run ends, time left before the next run starts; ms. 0 while active. */
  restMs: number;
}

export interface Settings { exploreMode: ExploreMode; autoContinue: boolean }

export interface GameState {
  version: 1;
  seed: number;
  /** sfc32 state, four uint32 words. */
  rng: [number, number, number, number];
  /** Simulated time; only step() advances it. */
  timeMs: number;
  nextId: number;
  classId: ClassId;
  level: number;
  exp: number;
  hp: number;
  equipment: Partial<Record<Slot, Item>>;
  inventory: Item[];
  currencies: Wallet;
  /** Bumped by every change that can alter Stats; stats are recomputed only when it changes. */
  buildRevision: number;
  /** Highest act whose boss has fallen in this loop. */
  actsCleared: number;
  deaths: number;
  settings: Settings;
  run: Run | null;
}

export type GameEvent =
  | { type: 'runStarted'; act: number }
  | { type: 'enemyKilled'; kind: EnemyKind; enemyId: number }
  | { type: 'gateOpened'; act: number }
  | { type: 'levelUp'; level: number }
  | { type: 'playerDied'; act: number; lostLoot: TempLoot }
  | { type: 'actCleared'; act: number; loot: TempLoot };
