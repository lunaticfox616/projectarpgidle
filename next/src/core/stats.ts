// Derived character numbers. Recomputed only when GameState.buildRevision changes, so the per-tick
// combat loop reads a cached object instead of summing equipment every 100 ms.
import { CLASSES, PLAYER } from '../data/balance.ts';
import type { AffixStat, GameState, Stats } from './types.ts';

const cache = new WeakMap<GameState, { revision: number; stats: Stats }>();

function affixTotals(state: GameState): Record<AffixStat, number> {
  const total: Record<AffixStat, number> = { flatDamage: 0, flatHp: 0, pctAttackSpeed: 0, flatArmor: 0 };
  for (const item of Object.values(state.equipment)) {
    if (item) for (const affix of item.affixes) total[affix.stat] += affix.value;
  }
  return total;
}

export function computeStats(state: GameState): Stats {
  const base = CLASSES[state.classId], extra = affixTotals(state), levels = state.level - 1;
  return {
    maxHp: Math.round(base.hp * (1 + PLAYER.hpPerLevel * levels) + extra.flatHp),
    damage: base.damage * (1 + PLAYER.damagePerLevel * levels) + extra.flatDamage,
    attacksPerSec: base.attacksPerSec * (1 + extra.pctAttackSpeed / 100),
    range: base.range,
    armor: base.armor + extra.flatArmor,
    moveMsPerTile: PLAYER.moveMsPerTile,
    regenPerSec: PLAYER.regenPerSec
  };
}

export function stats(state: GameState): Stats {
  const hit = cache.get(state);
  if (hit && hit.revision === state.buildRevision) return hit.stats;
  const fresh = computeStats(state);
  cache.set(state, { revision: state.buildRevision, stats: fresh });
  return fresh;
}
