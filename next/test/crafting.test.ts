import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ITEMS } from '../src/data/balance.ts';
import { affixDef } from '../src/core/affixes.ts';
import { craft, craftBlock } from '../src/core/crafting.ts';
import { createGame } from '../src/core/game.ts';
import { stats } from '../src/core/stats.ts';
import type { GameState, Item } from '../src/core/types.ts';

function setup(): { state: GameState; item: Item } {
  const state = createGame(31, 'warrior');
  const item: Item = { id: 500, slot: 'gloves', base: 'hide-gloves', itemLevel: 30, rarity: 'normal', affixes: [] };
  state.inventory.push(item);
  Object.assign(state.currencies, { magicBud: 20, sapBud: 20, formlessDew: 20, goldenRule: 20, blightSpore: 20 });
  return { state, item };
}
const bag = { from: 'bag' as const, id: 500 };
const inTier = (item: Item) => item.affixes.every(a => {
  const [lo, hi] = affixDef(a.mod).tiers[a.tier - 1]!;
  return a.value >= lo && a.value <= hi;
});

test('each currency moves the item exactly as in the old game, and costs one', () => {
  const { state, item } = setup();
  assert.equal(craft(state, bag, 'magicBud').ok, true);
  assert.equal(item.rarity, 'magic');
  assert.ok(item.affixes.length >= 1 && item.affixes.length <= 2);
  assert.equal(state.currencies.magicBud, 19);
  assert.equal(craft(state, bag, 'sapBud').ok, true);
  assert.equal(item.rarity, 'rare');
  const beforeExalt = item.affixes.length;
  assert.equal(craft(state, bag, 'sapBud').ok, true);
  assert.equal(item.affixes.length, beforeExalt + 1);
  const tiers = item.affixes.map(a => [a.mod, a.tier]);
  assert.equal(craft(state, bag, 'goldenRule').ok, true);
  assert.deepEqual(item.affixes.map(a => [a.mod, a.tier]), tiers, 'values re-roll inside the same tiers');
  assert.ok(inTier(item));
  assert.equal(craft(state, bag, 'formlessDew').ok, true);
  assert.equal(item.rarity, 'rare');
  assert.ok(item.affixes.length >= 4 && item.affixes.length <= 5);
  assert.equal(craft(state, bag, 'blightSpore').ok, true);
  assert.deepEqual([item.rarity, item.affixes], ['normal', []]);
  assert.equal(craft(state, bag, 'formlessDew').ok, true);
  assert.equal(item.rarity, 'rare');
  assert.deepEqual([state.currencies.magicBud, state.currencies.sapBud, state.currencies.formlessDew, state.currencies.goldenRule, state.currencies.blightSpore], [19, 18, 18, 19, 19]);
});

test('blocked crafts change nothing', () => {
  const { state, item } = setup();
  const snapshot = () => JSON.stringify([item, state.currencies]);
  const before = snapshot();
  for (const currency of ['sapBud', 'goldenRule', 'blightSpore'] as const) {
    assert.equal(craft(state, bag, currency).ok, false, `${currency} on a normal item`);
  }
  state.currencies.magicBud = 0;
  assert.deepEqual(craft(state, bag, 'magicBud'), { ok: false, reason: '재화가 없다' });
  assert.equal(snapshot(), before.replace('"magicBud":20', '"magicBud":0'));
  assert.equal(craft(state, { from: 'bag', id: 999 }, 'formlessDew').ok, false);
});

test('exalting stops at six options', () => {
  const { state, item } = setup();
  craft(state, bag, 'formlessDew');
  while (item.affixes.length < ITEMS.explicitCap) assert.equal(craft(state, bag, 'sapBud').ok, true);
  assert.equal(craftBlock(state, item, 'sapBud'), '옵션이 가득 찼다');
  assert.equal(craft(state, bag, 'sapBud').ok, false);
});

test('crafting a worn item updates the build at once', () => {
  const { state } = setup();
  state.inventory.pop();
  state.equipment.gloves = { id: 501, slot: 'gloves', base: 'hide-gloves', itemLevel: 30, rarity: 'normal', affixes: [] };
  const revision = state.buildRevision, before = stats(state);
  for (let i = 0; i < 6; i++) craft(state, { from: 'slot', slot: 'gloves' }, i === 0 ? 'formlessDew' : 'sapBud');
  assert.ok(state.buildRevision > revision);
  assert.notDeepEqual(stats(state), before);
});

test('resistances and damage reduction stop at their caps', () => {
  const state = createGame(32, 'warrior');
  state.equipment.ring = { id: 1, slot: 'ring', base: 'copper-ring', itemLevel: 30, rarity: 'magic', affixes: [{ mod: 'resF', tier: 20, value: 48 }, { mod: 'resAll', tier: 20, value: 32 }] };
  state.equipment.armor = { id: 2, slot: 'armor', base: 'leather-vest', itemLevel: 30, rarity: 'magic', affixes: [{ mod: 'dr', tier: 20, value: 43 }] };
  state.equipment.belt = { id: 3, slot: 'belt', base: 'rope-belt', itemLevel: 30, rarity: 'magic', affixes: [{ mod: 'dr', tier: 20, value: 43 }] };
  state.buildRevision++;
  const s = stats(state);
  assert.equal(s.resist.fire, 0.75);
  assert.equal(s.resist.cold, 0.32 + 0.03, 'resAll plus the copper ring base');
  assert.equal(s.damageReduction, 0.6);
});
