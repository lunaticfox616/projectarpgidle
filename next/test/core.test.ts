import assert from 'node:assert/strict';
import { test } from 'node:test';
import { REST_MS, TICK_MS } from '../src/data/balance.ts';
import { ITEM_KINDS, itemBase } from '../src/data/item-bases.ts';
import { ITEMS } from '../src/data/balance.ts';
import { affixDef, affixStats } from '../src/core/affixes.ts';
import { advance, createGame, LAST_ACT, step } from '../src/core/game.ts';
import { discard, equip, equipUpgrades, itemScore, rollItem, unequip } from '../src/core/items.ts';
import { actMap, distances, tileIndex } from '../src/core/map.ts';
import { stats } from '../src/core/stats.ts';
import type { CurrencyKey, GameEvent, GameState, TempLoot } from '../src/core/types.ts';

const run = (state: GameState, ticks: number): GameEvent[] => {
  const events: GameEvent[] = [];
  for (let i = 0; i < ticks; i++) events.push(...step(state));
  return events;
};
const clone = (state: GameState): GameState => JSON.parse(JSON.stringify(state)) as GameState;

test('the same seed plays the same game', () => {
  const a = createGame(7, 'warrior'), b = createGame(7, 'warrior');
  run(a, 6000);
  run(b, 6000);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, (() => { const c = createGame(8, 'warrior'); run(c, 6000); return c; })());
});

test('a JSON save continues exactly like the live game', () => {
  const live = createGame(3, 'arcanist');
  run(live, 2500);
  const loaded = clone(live);
  run(live, 2500);
  run(loaded, 2500);
  assert.deepEqual(loaded, live);
});

test('advance() equals the same number of steps and returns the sub-tick remainder', () => {
  const a = createGame(5, 'warrior'), b = createGame(5, 'warrior');
  const seen: GameEvent[] = [];
  const result = advance(a, 300 * TICK_MS + 42, e => seen.push(e));
  const events = run(b, 300);
  assert.deepEqual(result, { ticks: 300, leftoverMs: 42 });
  assert.deepEqual(a, b);
  assert.deepEqual(seen, events);
  assert.deepEqual(advance(a, -5), { ticks: 0, leftoverMs: 0 });
});

test('every act map reaches all rooms, and the boss only through the opened gate', () => {
  for (let act = 1; act <= LAST_ACT; act++) {
    const map = actMap(act), gate = new Set([tileIndex(map, map.gate)]);
    const open = distances(map, map.entry), sealed = distances(map, map.entry, gate);
    for (const room of map.rooms) assert.ok(open.has(tileIndex(map, room)), `act ${act} room ${room.id}`);
    assert.ok(!sealed.has(tileIndex(map, map.boss)), `act ${act} boss behind the gate`);
  }
});

test('the gate opens once, and only after every elite pack falls', () => {
  const state = createGame(11, 'warrior');
  let opened = 0;
  for (let i = 0; i < 40000 && state.actsCleared < 1; i++) {
    const events = step(state), r = state.run!;
    opened += events.filter(e => e.type === 'gateOpened').length;
    if (events.some(e => e.type === 'runStarted')) opened = 0;
    if (r.status === 'active' && r.gateOpen) assert.ok(!r.packs.some(p => p.role === 'elite' && p.alive > 0));
    if (r.status === 'active' && !r.gateOpen) assert.ok(r.packs.some(p => p.role === 'elite' && p.alive > 0));
  }
  assert.equal(state.actsCleared, 1);
  assert.equal(opened, 1);
});

test('boss loot settles into the save exactly once, and equals what dropped', () => {
  const state = createGame(2, 'warrior', { autoEquip: false });
  const dropped: TempLoot = { currencies: {}, items: [] };
  for (let i = 0; i < 40000; i++) {
    const before = clone(state), events = step(state);
    for (const e of events) {
      if (e.type === 'runStarted') Object.assign(dropped, { currencies: {}, items: [] });
      if (e.type !== 'lootDropped') continue;
      for (const [key, n] of Object.entries(e.currencies)) dropped.currencies[key as CurrencyKey] = (dropped.currencies[key as CurrencyKey] ?? 0) + n;
      dropped.items.push(...e.items);
    }
    const cleared = events.find(e => e.type === 'actCleared');
    if (!cleared) continue;
    assert.deepEqual(cleared.loot, dropped);
    for (const [key, amount] of Object.entries(state.currencies)) {
      assert.equal(amount, before.currencies[key as keyof typeof before.currencies] + (cleared.loot.currencies[key as keyof typeof cleared.loot.currencies] ?? 0));
    }
    assert.deepEqual(state.inventory, [...before.inventory, ...cleared.loot.items]);
    assert.ok(cleared.loot.items.length >= 1, 'the boss always drops items');
    assert.deepEqual(state.run!.loot, { currencies: {}, items: [] });
    const settled = clone(state);
    const resting = run(state, REST_MS.cleared / TICK_MS - 1);
    assert.deepEqual(resting, []);
    assert.deepEqual(state.currencies, settled.currencies);
    assert.deepEqual(state.inventory, settled.inventory);
    return;
  }
  assert.fail('act 1 was never cleared');
});

test('dying discards the run loot, keeps the save, and retries the same act', () => {
  const state = createGame(4, 'warrior');
  const r = state.run!, enemy = r.enemies[0]!;
  const loot = { currencies: { magicBud: 3 }, items: [rollItem(state, 1, 'normal')] };
  r.loot = structuredClone(loot);
  Object.assign(enemy, { x: r.player.x + 1, y: r.player.y, active: true, attackMs: 0, damage: 1e9 });
  const before = clone(state), events = step(state);
  assert.deepEqual(events.filter(e => e.type === 'playerDied'), [{ type: 'playerDied', act: 1, lostLoot: loot }]);
  assert.equal(state.deaths, 1);
  assert.deepEqual(state.currencies, before.currencies);
  assert.deepEqual(state.inventory, before.inventory);
  const after = run(state, REST_MS.failed / TICK_MS);
  assert.deepEqual(after, [{ type: 'runStarted', act: 1 }]);
  assert.equal(state.hp, stats(state).maxHp);
});

test('equipping an item changes stats and swaps the old one back into the inventory', () => {
  const state = createGame(9, 'warrior');
  const base = stats(state).damage;
  // The rusted blade's base stat adds 4 flat damage on top of its option.
  const sword = { id: 900, slot: 'weapon' as const, base: 'rusted-blade', itemLevel: 3, rarity: 'magic' as const, affixes: [{ mod: 'flatDmg', tier: 1, value: 5 }] };
  const better = { ...sword, id: 901, affixes: [{ mod: 'flatDmg', tier: 1, value: 8 }] };
  state.inventory.push(sword, better);
  assert.equal(equip(state, 900), true);
  assert.equal(stats(state).damage, base + 9);
  assert.equal(equip(state, 901), true);
  assert.equal(stats(state).damage, base + 12);
  assert.deepEqual(state.inventory.map(i => i.id), [900]);
  assert.equal(equip(state, 12345), false);
});

test('auto-equip wears settled upgrades once; discard never touches equipped items', () => {
  const state = createGame(2, 'warrior');
  let equippedEvents = 0;
  for (let i = 0; i < 40000 && state.actsCleared < 1; i++) {
    for (const e of step(state)) if (e.type === 'itemsEquipped') equippedEvents++;
  }
  assert.equal(equippedEvents, 1, 'the act-1 boss always drops at least one upgrade over empty slots');
  for (const item of state.inventory) assert.ok(itemScore(item) <= itemScore(state.equipment[item.slot]));
  const worn = Object.values(state.equipment).map(item => item!.id);
  const before = state.inventory.length;
  assert.equal(discard(state, [...worn, ...state.inventory.map(i => i.id)]), before);
  assert.deepEqual(state.inventory, []);
  assert.deepEqual(Object.values(state.equipment).map(item => item!.id), worn);
});

test('rings fill both ring slots, the weaker one is replaced, and unequip returns items', () => {
  const state = createGame(12, 'warrior');
  const ring = (id: number, value: number) => ({ id, slot: 'ring' as const, base: 'copper-ring', itemLevel: 3, rarity: 'magic' as const, affixes: [{ mod: 'ringFlatDmg', tier: 1, value }] });
  state.inventory.push(ring(1, 2), ring(2, 5), ring(3, 4));
  assert.deepEqual(equipUpgrades(state), [2, 3]);
  assert.deepEqual([state.equipment.ring?.id, state.equipment.ring2?.id], [2, 3]);
  const base = stats(state).damage;
  assert.equal(equip(state, 1, 'weapon'), false, 'a ring does not fit the weapon slot');
  assert.equal(equip(state, 1, 'ring2'), true);
  assert.equal(stats(state).damage, base - 2);
  assert.equal(unequip(state, 'ring2'), true);
  assert.equal(unequip(state, 'ring2'), false);
  assert.deepEqual(state.inventory.map(i => i.id).sort(), [1, 3]);
});

test('drops follow the old option rules: kind, class, tier cap, range, count by rarity', () => {
  const warrior = createGame(13, 'warrior'), arcanist = createGame(13, 'arcanist');
  const seen = new Set<string>(), rarities = new Set<string>();
  for (let i = 0; i < 600; i++) {
    for (const [state, act] of [[warrior, 10], [arcanist, 2]] as const) {
      const item = rollItem(state, act, i % 3 === 0 ? 'boss' : 'normal'), base = itemBase(item.base);
      seen.add(item.slot);
      rarities.add(item.rarity);
      assert.equal(base.kind, item.slot);
      assert.ok(!base.classes || base.classes.includes(state.classId), `${base.id} for ${state.classId}`);
      const [min, max] = ITEMS.affixCount[item.rarity];
      assert.ok(item.affixes.length >= min && item.affixes.length <= max, `${item.rarity} with ${item.affixes.length} options`);
      for (const a of item.affixes) {
        const def = affixDef(a.mod), [lo, hi] = def.tiers[a.tier - 1]!;
        assert.ok(def.kinds.includes(item.slot) && (!def.classes || def.classes.includes(state.classId)), `${a.mod} on ${item.slot}`);
        assert.ok(a.tier >= 1 && a.tier <= ITEMS.tierCap(item.itemLevel), `T${a.tier} at item level ${item.itemLevel}`);
        assert.ok(a.value >= lo && a.value <= hi, `${a.mod} ${a.value} outside T${a.tier}`);
      }
      const statsOnItem = item.affixes.flatMap(a => affixStats(a).map(([stat]) => stat));
      assert.equal(new Set(statsOnItem).size, statsOnItem.length, 'no stat twice on one item');
    }
  }
  assert.deepEqual([...seen].sort(), [...ITEM_KINDS].sort());
  assert.deepEqual([...rarities].sort(), ['magic', 'normal', 'rare']);
});
