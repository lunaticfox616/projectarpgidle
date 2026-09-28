import assert from 'node:assert/strict';
import { test } from 'node:test';
import { REST_MS, TICK_MS } from '../src/data/balance.ts';
import { advance, createGame, LAST_ACT, step } from '../src/core/game.ts';
import { equip, rollItem } from '../src/core/items.ts';
import { actMap, distances, tileIndex } from '../src/core/map.ts';
import { stats } from '../src/core/stats.ts';
import type { GameEvent, GameState } from '../src/core/types.ts';

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

test('boss loot settles into the save exactly once', () => {
  const state = createGame(2, 'warrior');
  for (let i = 0; i < 40000; i++) {
    const before = clone(state), events = step(state);
    const cleared = events.find(e => e.type === 'actCleared');
    if (!cleared) continue;
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
  const loot = { currencies: { magicBud: 3 }, items: [rollItem(state, 1)] };
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
  const sword = { id: 900, slot: 'weapon' as const, itemLevel: 3, rarity: 'magic' as const, affixes: [{ stat: 'flatDamage' as const, value: 5 }] };
  const better = { ...sword, id: 901, affixes: [{ stat: 'flatDamage' as const, value: 8 }] };
  state.inventory.push(sword, better);
  assert.equal(equip(state, 900), true);
  assert.equal(stats(state).damage, base + 5);
  assert.equal(equip(state, 901), true);
  assert.equal(stats(state).damage, base + 8);
  assert.deepEqual(state.inventory.map(i => i.id), [900]);
  assert.equal(equip(state, 12345), false);
});
