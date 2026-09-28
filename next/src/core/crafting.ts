// Equipment crafting with the five common currencies, after the old game's useCurrency():
//   마법의 새싹   normal → magic (1-2 options) · magic → re-roll its options
//   수액 봉오리   magic → rare, +1 option · rare → +1 option (up to 6)
//   형체 없는 이슬 normal → rare (4-5 options) · rare → re-roll its options
//   황금률       re-roll option values within their tiers (magic or rare)
//   마름병 포자   back to normal, options removed (magic or rare)
import { ITEMS } from '../data/balance.ts';
import { addAffix, availableAffixes, rerollAffixes, rerollValues } from './affixes.ts';
import { stats } from './stats.ts';
import type { CraftCurrency, EquipSlot, GameState, Item } from './types.ts';

export const CRAFT_CURRENCIES: readonly CraftCurrency[] = ['magicBud', 'sapBud', 'formlessDew', 'goldenRule', 'blightSpore'];

/** Which item a craft targets: one in the bag, or one being worn. */
export type CraftTarget = { from: 'bag'; id: number } | { from: 'slot'; slot: EquipSlot };

export function findTarget(state: GameState, target: CraftTarget): Item | undefined {
  return target.from === 'bag' ? state.inventory.find(i => i.id === target.id) : state.equipment[target.slot];
}

/** Why a currency cannot be used on an item now, or null when it can. */
export function craftBlock(state: GameState, item: Item, currency: CraftCurrency): string | null {
  if (state.currencies[currency] <= 0) return '재화가 없다';
  const r = item.rarity;
  switch (currency) {
    case 'magicBud': return r === 'rare' ? '희귀 장비에는 쓸 수 없다' : null;
    case 'sapBud':
      if (r === 'normal') return '마법이나 희귀 장비에만 쓴다';
      if (item.affixes.length >= ITEMS.explicitCap) return '옵션이 가득 찼다';
      return availableAffixes(item, state.classId).length ? null : '더 붙일 수 있는 옵션이 없다';
    case 'formlessDew': return r === 'magic' ? '마법 장비에는 쓸 수 없다' : null;
    case 'goldenRule':
    case 'blightSpore': return r === 'normal' ? '일반 장비에는 쓸 수 없다' : null;
  }
}

function apply(state: GameState, item: Item, currency: CraftCurrency): void {
  const classId = state.classId;
  switch (currency) {
    case 'magicBud':
      item.rarity = 'magic';
      return rerollAffixes(state, item, classId);
    case 'sapBud':
      item.rarity = 'rare';
      addAffix(state, item, classId);
      return;
    case 'formlessDew':
      item.rarity = 'rare';
      return rerollAffixes(state, item, classId);
    case 'goldenRule': return rerollValues(state, item);
    case 'blightSpore':
      item.rarity = 'normal';
      item.affixes = [];
      return;
  }
}

/**
 * Spend one currency on an item. Nothing changes when it is blocked. Crafting a worn item
 * changes the build, so life keeps its fraction of the new maximum.
 */
export function craft(state: GameState, target: CraftTarget, currency: CraftCurrency): { ok: true } | { ok: false; reason: string } {
  const item = findTarget(state, target);
  if (!item) return { ok: false, reason: '대상 장비가 없다' };
  const blocked = craftBlock(state, item, currency);
  if (blocked) return { ok: false, reason: blocked };
  const worn = target.from === 'slot', lifeFraction = state.hp / stats(state).maxHp;
  state.currencies[currency]--;
  apply(state, item, currency);
  if (worn) {
    state.buildRevision++;
    const maxHp = stats(state).maxHp;
    state.hp = Math.min(maxHp, Math.max(1, Math.round(lifeFraction * maxHp)));
  }
  return { ok: true };
}
