// Every tuning number of the first core slice. The autoplay tool measures the result
// (first loop target: 15-30 simulated minutes to clear act 10); change numbers here, not in rules.
import type { ClassId, CurrencyKey, EnemyKind, RoomRole } from '../core/types.ts';
import type { StatId } from './affix-types.ts';

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
  hp: (act: number) => 38 * 1.23 ** (act - 1),
  damage: (act: number) => 2.4 * 1.19 ** (act - 1),
  exp: (act: number) => 4 * 1.45 ** (act - 1),
  kind: {
    normal: { hp: 1, damage: 1, exp: 1, attackMs: 1400 },
    elite: { hp: 4, damage: 1.6, exp: 6, attackMs: 1200 },
    boss: { hp: 18, damage: 2.4, exp: 25, attackMs: 1500 }
  } satisfies Record<EnemyKind, { hp: number; damage: number; exp: number; attackMs: number }>,
  moveMsPerTile: 520,
  /** Share of an enemy hit dealt as its act's element in non-physical acts; the rest is physical. */
  elementShare: 0.5,
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
  /** Explicit options per rarity, as in the old game: normal none, magic 1-2, rare 4-5, at most 6. */
  affixCount: { normal: [0, 0], magic: [1, 2], rare: [4, 5] } as const,
  explicitCap: 6,
  /** Item level of a drop in a given act. */
  itemLevel: (act: number) => act * 3,
  /** Highest option tier an item level can roll (act 10 reaches T20). */
  tierCap: (itemLevel: number) => Math.max(1, Math.min(20, Math.ceil((itemLevel * 2) / 3))),
  /** Old rollAffixValue: start at T1 and climb one tier with this chance, up to the cap. */
  tierClimb: 0.58
};

/** Drop rarity odds by what dropped it (old EQUIPMENT_DROP_RARITY_THRESHOLDS, uniques left out). */
export const DROP_RARITY: Record<EnemyKind, { rare: number; magic: number }> = {
  normal: { rare: 0.09, magic: 0.3 },
  elite: { rare: 0.24, magic: 0.62 },
  boss: { rare: 0.36, magic: 0.8 }
};

export const COMBAT = {
  /** Base critical chance and multiplier, in percent. */
  critChance: 5,
  critMulti: 150,
  /** Caps, in percent. */
  resistCap: 75,
  damageReductionCap: 60
};

/** How much one point of each stat is worth when comparing items (auto-equip and ▲ marks). */
export const STAT_WEIGHT: Record<StatId, number> = {
  flatDmg: 3, weaponDmgPct: 0.5, pctDmg: 0.6, attackPctDmg: 0.6, meleePctDmg: 0.6, projectilePctDmg: 0.6, physPctDmg: 0.5, elementalPctDmg: 0.5,
  flatHp: 0.35, pctHp: 2, armor: 0.6, armorPct: 0.8, dr: 3, aspd: 2, crit: 2.5, critDmg: 0.8, move: 1,
  resF: 1, resC: 1, resL: 1, resAll: 3, resChaos: 1.2, regen: 8, leech: 6, ds: 1.5
};
