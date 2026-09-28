// Equipment option rolling, after the old game's MOD_DB rules: options come from the item kind's
// pool (class-specific attack options only for that class), never repeat a stat on one item, and
// roll a tier by climbing from T1 with a fixed chance up to the item level's cap.
import { AFFIXES } from '../data/affixes.ts';
import { ITEMS } from '../data/balance.ts';
import { itemBase } from '../data/item-bases.ts';
import { random } from './rng.ts';
import type { AffixDef, StatId } from '../data/affix-types.ts';
import type { Affix, ClassId, GameState, Item } from './types.ts';

const byId = new Map(AFFIXES.map(def => [def.id, def]));

export function affixDef(id: string): AffixDef {
  const def = byId.get(id);
  if (!def) throw new Error(`unknown affix ${id}`);
  return def;
}

export const isAffixId = (id: unknown): boolean => typeof id === 'string' && byId.has(id);

/** Stats an affix raises (one, or two for compound options). */
export function affixStats(affix: Affix): [StatId, number][] {
  const def = affixDef(affix.mod);
  return def.extra && affix.extra !== undefined ? [[def.stat, affix.value], [def.extra.stat, affix.extra]] : [[def.stat, affix.value]];
}

/** Every stat an item gives: its base stat, then its options. */
export function itemStats(item: Item): [StatId, number][] {
  const implicit = itemBase(item.base).implicit;
  return [[implicit.stat, implicit.value], ...item.affixes.flatMap(affixStats)];
}

/** Options an item can still take: right kind and class, and no stat it already carries. */
export function availableAffixes(item: Item, classId: ClassId): AffixDef[] {
  const taken = new Set(item.affixes.flatMap(a => affixStats(a).map(([stat]) => stat)));
  return AFFIXES.filter(def => def.kinds.includes(item.slot) && (!def.classes || def.classes.includes(classId))
    && !taken.has(def.stat) && !(def.extra && taken.has(def.extra.stat)));
}

function pickWeighted(state: GameState, defs: AffixDef[]): AffixDef | null {
  let roll = random(state) * defs.reduce((sum, d) => sum + d.weight, 0);
  for (const def of defs) {
    if (roll < def.weight) return def;
    roll -= def.weight;
  }
  return defs.at(-1) ?? null;
}

/** A value on the tier's [min, max], in multiples of step. */
export function rollValue(state: GameState, [min, max]: [number, number], step: number): number {
  const steps = Math.max(0, Math.round((max - min) / step));
  return Number((min + Math.floor(random(state) * (steps + 1)) * step).toFixed(2));
}

function rollAffix(state: GameState, def: AffixDef, itemLevel: number): Affix {
  const cap = ITEMS.tierCap(itemLevel);
  let tier = 1;
  while (tier < cap && random(state) < ITEMS.tierClimb) tier++;
  const affix: Affix = { mod: def.id, tier, value: rollValue(state, def.tiers[tier - 1]!, def.step) };
  if (def.extra) affix.extra = rollValue(state, def.extra.tiers[tier - 1]!, def.extra.step);
  return affix;
}

/** Add one new option. Returns false when nothing fits or the item is full. */
export function addAffix(state: GameState, item: Item, classId: ClassId): boolean {
  if (item.affixes.length >= ITEMS.explicitCap) return false;
  const def = pickWeighted(state, availableAffixes(item, classId));
  if (!def) return false;
  item.affixes.push(rollAffix(state, def, item.itemLevel));
  return true;
}

/** Replace every option with a fresh set sized for the rarity. */
export function rerollAffixes(state: GameState, item: Item, classId: ClassId): void {
  item.affixes = [];
  const [min, max] = ITEMS.affixCount[item.rarity];
  const count = min + Math.floor(random(state) * (max - min + 1));
  for (let i = 0; i < count; i++) addAffix(state, item, classId);
}

/** Re-roll each option's value inside its own tier (황금률). */
export function rerollValues(state: GameState, item: Item): void {
  for (const affix of item.affixes) {
    const def = affixDef(affix.mod);
    affix.value = rollValue(state, def.tiers[affix.tier - 1]!, def.step);
    if (def.extra) affix.extra = rollValue(state, def.extra.tiers[affix.tier - 1]!, def.extra.step);
  }
}
