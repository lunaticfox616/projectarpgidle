// Item generation, comparison and equipping.
import { AFFIX_WEIGHT, ITEMS } from '../data/balance.ts';
import { pick, random, rollInt } from './rng.ts';
import { stats } from './stats.ts';
import type { AffixStat, GameState, Item } from './types.ts';

function rollRarity(state: GameState): Item['rarity'] {
  let roll = random(state);
  for (const [rarity, weight] of ITEMS.rarity) {
    if (roll < weight) return rarity;
    roll -= weight;
  }
  return 'normal';
}

/** A new item for a drop in `act`. Affix stats never repeat on one item. */
export function rollItem(state: GameState, act: number): Item {
  const itemLevel = ITEMS.itemLevel(act), rarity = rollRarity(state);
  const [min, max] = ITEMS.affixCount[rarity];
  const pool = Object.keys(ITEMS.affix) as AffixStat[];
  const affixes = [];
  for (let n = rollInt(state, min, max); n > 0 && pool.length > 0; n--) {
    const stat = pick(state, pool);
    pool.splice(pool.indexOf(stat), 1);
    const [low = 0, high = 0] = ITEMS.affix[stat](itemLevel);
    affixes.push({ stat, value: Math.round(low + random(state) * (high - low)) });
  }
  return { id: state.nextId++, slot: pick(state, ITEMS.slots), itemLevel, rarity, affixes };
}

export function itemScore(item: Item | undefined): number {
  return item ? item.affixes.reduce((sum, a) => sum + a.value * AFFIX_WEIGHT[a.stat], 0) : 0;
}

/**
 * Move an inventory item into its slot; the replaced item goes back to the inventory.
 * Life keeps its fraction of the maximum. Returns false when the item is not in the inventory.
 */
export function equip(state: GameState, itemId: number): boolean {
  const index = state.inventory.findIndex(i => i.id === itemId);
  if (index < 0) return false;
  const [item] = state.inventory.splice(index, 1);
  if (!item) return false;
  const lifeFraction = state.hp / stats(state).maxHp;
  const old = state.equipment[item.slot];
  if (old) state.inventory.push(old);
  state.equipment[item.slot] = item;
  state.buildRevision++;
  state.hp = Math.min(stats(state).maxHp, Math.max(1, Math.round(lifeFraction * stats(state).maxHp)));
  return true;
}

/** Equip every inventory item that outscores what its slot holds. Returns the equipped item ids. */
export function equipUpgrades(state: GameState): number[] {
  const equipped: number[] = [];
  for (const item of [...state.inventory].sort((a, b) => itemScore(b) - itemScore(a))) {
    if (itemScore(item) > itemScore(state.equipment[item.slot]) && equip(state, item.id)) equipped.push(item.id);
  }
  return equipped;
}

/** Destroy inventory items. Equipped items are never touched. Returns how many were removed. */
export function discard(state: GameState, itemIds: readonly number[]): number {
  const doomed = new Set(itemIds), before = state.inventory.length;
  state.inventory = state.inventory.filter(item => !doomed.has(item.id));
  return before - state.inventory.length;
}
