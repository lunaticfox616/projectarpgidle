// Every tuning number of the first core slice. The autoplay tool measures the result
// (first loop target: 15-30 simulated minutes to clear act 10); change numbers here, not in rules.
import type { ClassId, CurrencyKey, EnemyKind, RoomRole, Slot, AffixStat } from '../core/types.ts';

export const TICK_MS = 100;
/** Offline settlement never simulates more than this per call; ms. */
export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;

export const CLASSES: Record<ClassId, { name: string; hp: number; damage: number; attacksPerSec: number; range: number; armor: number }> = {
  warrior: { name: '전사', hp: 140, damage: 11, attacksPerSec: 1.1, range: 1, armor: 10 },
  arcanist: { name: '비술사', hp: 100, damage: 16, attacksPerSec: 1, range: 4, armor: 4 }
};

export const PLAYER = {
  moveMsPerTile: 260,
  regenPerSec: 0.015,
  hpPerLevel: 0.1,
  damagePerLevel: 0.08,
  /** Fog is lifted this many floor steps around the player. */
  sightRadius: 5
};

/** Damage taken is multiplied by K / (K + armor). */
export const ARMOR_K = 60;
/** Pause between a finished run and the next one; ms. */
export const REST_MS = { cleared: 2000, failed: 4000 };
/** Player hits roll within ±this fraction of average damage. */
export const DAMAGE_SPREAD = 0.1;

export const expToNext = (level: number): number => Math.round(30 * level ** 1.6);

export const ENEMY = {
  hp: (act: number) => 32 * 1.23 ** (act - 1),
  damage: (act: number) => 2.4 * 1.19 ** (act - 1),
  exp: (act: number) => 4 * 1.45 ** (act - 1),
  kind: {
    normal: { hp: 1, damage: 1, exp: 1, attackMs: 1400 },
    elite: { hp: 4, damage: 1.6, exp: 6, attackMs: 1200 },
    boss: { hp: 18, damage: 2.4, exp: 25, attackMs: 1500 }
  } satisfies Record<EnemyKind, { hp: number; damage: number; exp: number; attackMs: number }>,
  moveMsPerTile: 520,
  /** A pack wakes when the player comes within this reach of any member. */
  wakeReach: 5
};

/** Which enemies stand in each kind of room. */
export const PACKS: Record<Exclude<RoomRole, 'entry'>, EnemyKind[]> = {
  battle: ['normal', 'normal', 'normal'],
  optional: ['normal', 'normal', 'normal'],
  elite: ['elite', 'normal', 'normal'],
  boss: ['boss']
};

/** Chance per kill; each hit drops one of the currency (boss drops roll a small stack). */
export const CURRENCY_DROPS: Record<EnemyKind, Partial<Record<CurrencyKey, number>>> = {
  normal: { magicBud: 0.02, formlessDew: 0.004, blightSpore: 0.004 },
  elite: { magicBud: 0.15, formlessDew: 0.05, sapBud: 0.02, goldenRule: 0.002 },
  boss: { magicBud: 1, formlessDew: 0.6, sapBud: 0.3, goldenRule: 0.06, bossCore: 0.5 }
};
export const BOSS_STACK: [number, number] = [1, 3];

export const ITEM_DROPS: Record<EnemyKind, number> = { normal: 0.03, elite: 0.3, boss: 1 };
export const BOSS_ITEM_COUNT = 2;

export const ITEMS = {
  slots: ['weapon', 'armor', 'ring'] as readonly Slot[],
  rarity: [['normal', 0.6], ['magic', 0.32], ['rare', 0.08]] as const,
  affixCount: { normal: [1, 1], magic: [2, 2], rare: [3, 4] } as const,
  /** Value range of one affix at item level il: [min, max]. */
  affix: {
    flatDamage: (il: number) => [1 + il * 0.5, 2 + il * 0.8],
    flatHp: (il: number) => [6 + il * 3, 10 + il * 5],
    pctAttackSpeed: () => [3, 10],
    flatArmor: (il: number) => [2 + il, 4 + il * 1.6]
  } satisfies Record<AffixStat, (il: number) => number[]>,
  /** Item level of a drop in a given act. */
  itemLevel: (act: number) => act * 3
};

/** How much one point of each affix is worth when comparing items (autoplay's equip rule). */
export const AFFIX_WEIGHT: Record<AffixStat, number> = { flatDamage: 3, flatHp: 0.35, pctAttackSpeed: 2, flatArmor: 0.6 };
