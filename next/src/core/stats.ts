// Derived character numbers. Recomputed only when GameState.buildRevision changes, so the per-tick
// combat loop reads a cached object instead of summing equipment every 100 ms.
import { CLASSES, COMBAT, PLAYER } from '../data/balance.ts';
import { itemStats } from './affixes.ts';
import type { StatId } from '../data/affix-types.ts';
import type { GameState, Stats } from './types.ts';

const cache = new WeakMap<GameState, { revision: number; stats: Stats }>();

function totals(state: GameState): Record<StatId, number> {
  const sum = {} as Record<StatId, number>;
  for (const item of Object.values(state.equipment)) {
    if (item) for (const [stat, value] of itemStats(item)) sum[stat] = (sum[stat] ?? 0) + value;
  }
  return sum;
}

/** Damage percent that applies to this class's attack (melee/physical or projectile/elemental). */
function damagePercent(state: GameState, t: Record<StatId, number>): number {
  const v = (s: StatId) => t[s] ?? 0;
  const general = v('pctDmg') + v('attackPctDmg') + v('weaponDmgPct');
  return state.classId === 'warrior' ? general + v('meleePctDmg') + v('physPctDmg') : general + v('projectilePctDmg') + v('elementalPctDmg');
}

export function computeStats(state: GameState): Stats {
  const base = CLASSES[state.classId], t = totals(state), levels = state.level - 1;
  const v = (s: StatId) => t[s] ?? 0;
  const pct = (n: number) => n / 100, cap = (n: number, c: number) => Math.min(c, Math.max(0, n)) / 100;
  const resist = (s: StatId) => cap(v(s) + v('resAll'), COMBAT.resistCap);
  return {
    maxHp: Math.round((base.hp * (1 + PLAYER.hpPerLevel * levels) + v('flatHp')) * (1 + pct(v('pctHp')))),
    damage: (base.damage * (1 + PLAYER.damagePerLevel * levels) + v('flatDmg')) * (1 + pct(damagePercent(state, t))),
    attacksPerSec: base.attacksPerSec * (1 + pct(v('aspd'))),
    range: base.range,
    armor: Math.round((base.armor + v('armor')) * (1 + pct(v('armorPct')))),
    moveMsPerTile: PLAYER.moveMsPerTile / (1 + pct(v('move'))),
    regenPerSec: PLAYER.regenPerSec + pct(v('regen')),
    critChance: pct(COMBAT.critChance + v('crit')),
    critMulti: pct(COMBAT.critMulti + v('critDmg')),
    doubleStrike: Math.min(1, pct(v('ds'))),
    leech: pct(v('leech')),
    damageReduction: cap(v('dr'), COMBAT.damageReductionCap),
    resist: { fire: resist('resF'), cold: resist('resC'), light: resist('resL'), chaos: cap(v('resChaos'), COMBAT.resistCap) }
  };
}

export function stats(state: GameState): Stats {
  const hit = cache.get(state);
  if (hit && hit.revision === state.buildRevision) return hit.stats;
  const fresh = computeStats(state);
  cache.set(state, { revision: state.buildRevision, stats: fresh });
  return fresh;
}
