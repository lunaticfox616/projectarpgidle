// Item generation, comparison and equipping across the ten equipment slots.
import { AFFIX_WEIGHT, ITEMS } from '../data/balance.ts';
import { AFFIX_POOL, KIND_WEIGHT, basesFor, slotKind } from '../data/item-bases.ts';
import { random, rollInt } from './rng.ts';
import { stats } from './stats.ts';
import type { AffixStat, EquipSlot, GameState, Item, ItemKind } from './types.ts';

/** Pick a key by relative weight. */
function weighted<K extends string>(state: GameState, weights: Partial<Record<K, number>>): K {
  const entries = Object.entries(weights) as [K, number][];
  let roll = random(state) * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [key, w] of entries) {
    if (roll < w) return key;
    roll -= w;
  }
  return entries[entries.length - 1]![0];
}

function rollRarity(state: GameState): Item['rarity'] {
  return weighted(state, Object.fromEntries(ITEMS.rarity) as Record<Item['rarity'], number>);
}

/** A new item for a drop in `act`, sized to the player's class. Affix stats never repeat on one item. */
export function rollItem(state: GameState, act: number): Item {
  const itemLevel = ITEMS.itemLevel(act), rarity = rollRarity(state);
  const kind = weighted<ItemKind>(state, KIND_WEIGHT);
  const bases = basesFor(kind, state.classId, itemLevel);
  if (bases.length === 0) throw new Error(`no ${kind} base for ${state.classId} at item level ${itemLevel}`);
  // Mostly the newest base the level allows, sometimes the one before it.
  const base = bases[Math.max(0, bases.length - 1 - (random(state) < 0.3 ? 1 : 0))]!;
  const [min, max] = ITEMS.affixCount[rarity];
  const pool: Partial<Record<AffixStat, number>> = { ...AFFIX_POOL[kind] };
  const affixes = [];
  for (let n = rollInt(state, min, max); n > 0 && Object.keys(pool).length > 0; n--) {
    const stat = weighted(state, pool);
    delete pool[stat];
    const [low = 0, high = 0] = ITEMS.affix[stat](itemLevel);
    affixes.push({ stat, value: Math.round(low + random(state) * (high - low)) });
  }
  return { id: state.nextId++, slot: kind, base: base.id, itemLevel, rarity, affixes };
}

export function itemScore(item: Item | undefined): number {
  return item ? item.affixes.reduce((sum, a) => sum + a.value * AFFIX_WEIGHT[a.stat], 0) : 0;
}

/** Slots an item can go into: its own, or either ring slot for rings. */
export const slotsFor = (kind: ItemKind): EquipSlot[] => (kind === 'ring' ? ['ring', 'ring2'] : [kind]);

/** The slot an item would replace by default: an empty one, else the weaker ring. */
export function defaultSlot(state: GameState, kind: ItemKind): EquipSlot {
  const slots = slotsFor(kind);
  return slots.find(s => !state.equipment[s]) ?? slots.reduce((a, b) => (itemScore(state.equipment[b]) < itemScore(state.equipment[a]) ? b : a));
}

/** Change the build while keeping life at the same fraction of its maximum. */
function rebuild(state: GameState, change: () => void): void {
  const lifeFraction = state.hp / stats(state).maxHp;
  change();
  state.buildRevision++;
  const maxHp = stats(state).maxHp;
  state.hp = Math.min(maxHp, Math.max(1, Math.round(lifeFraction * maxHp)));
}

/**
 * Wear an inventory item; whatever the slot held goes back to the inventory.
 * @param slot target slot; defaults to defaultSlot(). Returns false when the item is not in the
 * inventory or does not fit the slot.
 */
export function equip(state: GameState, itemId: number, slot?: EquipSlot): boolean {
  const index = state.inventory.findIndex(i => i.id === itemId);
  const item = state.inventory[index];
  if (!item) return false;
  const target = slot ?? defaultSlot(state, item.slot);
  if (slotKind(target) !== item.slot) return false;
  rebuild(state, () => {
    state.inventory.splice(index, 1);
    const old = state.equipment[target];
    if (old) state.inventory.push(old);
    state.equipment[target] = item;
  });
  return true;
}

/** Take off what a slot holds into the inventory. Returns false for an empty slot. */
export function unequip(state: GameState, slot: EquipSlot): boolean {
  const item = state.equipment[slot];
  if (!item) return false;
  rebuild(state, () => {
    delete state.equipment[slot];
    state.inventory.push(item);
  });
  return true;
}

/** Equip every inventory item that outscores what it would replace. Returns the equipped item ids. */
export function equipUpgrades(state: GameState): number[] {
  const equipped: number[] = [];
  for (const item of [...state.inventory].sort((a, b) => itemScore(b) - itemScore(a))) {
    const slot = defaultSlot(state, item.slot);
    if (itemScore(item) > itemScore(state.equipment[slot]) && equip(state, item.id, slot)) equipped.push(item.id);
  }
  return equipped;
}

/** Destroy inventory items. Equipped items are never touched. Returns how many were removed. */
export function discard(state: GameState, itemIds: readonly number[]): number {
  const doomed = new Set(itemIds), before = state.inventory.length;
  state.inventory = state.inventory.filter(item => !doomed.has(item.id));
  return before - state.inventory.length;
}
