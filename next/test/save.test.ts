import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { createGame, step } from '../src/core/game.ts';
import { restoreGame } from '../src/core/save.ts';
import type { GameState } from '../src/core/types.ts';

const played = (): GameState => {
  const state = createGame(21, 'arcanist');
  for (let i = 0; i < 3000; i++) step(state);
  return state;
};
const json = (state: GameState) => JSON.parse(JSON.stringify(state)) as Record<string, unknown>;

test('a stored game restores to the same state and keeps playing identically', () => {
  const live = played(), restored = restoreGame(json(live));
  assert.deepEqual(restored, live);
  for (let i = 0; i < 500; i++) { step(live); step(restored); }
  assert.deepEqual(restored, live);
});

test('settings missing from an older save take their defaults; unknown values fall back', () => {
  const raw = json(played());
  raw.settings = { exploreMode: 'full' };
  assert.deepEqual(restoreGame(raw).settings, { exploreMode: 'full', autoContinue: true, autoEquip: true });
  raw.settings = { exploreMode: 'sideways', autoContinue: 'yes' };
  assert.deepEqual(restoreGame(raw).settings, { exploreMode: 'boss', autoContinue: true, autoEquip: true });
});

test('saves a running game could not continue from are rejected with the reason', () => {
  const cases: [string, (raw: Record<string, any>) => void, RegExp][] = [
    ['not an object', raw => { for (const k of Object.keys(raw)) delete raw[k]; }, /unknown version/],
    ['future version', raw => { raw.version = 2; }, /unknown version 2/],
    ['unknown class', raw => { raw.classId = 'bard'; }, /class/],
    ['negative currency', raw => { raw.currencies.magicBud = -1; }, /currencies/],
    ['act out of range', raw => { raw.run.act = 11; }, /act out of range/],
    ['player in a wall', raw => { raw.run.player.x = 0; raw.run.player.y = 0; }, /wall/],
    ['fog of another map', raw => { raw.run.fog = [1]; }, /fog/],
    ['broken item', raw => { raw.inventory.push({ id: 1, slot: 'hat', rarity: 'rare', itemLevel: 3, affixes: [] }); }, /inventory item/],
    ['item in the wrong slot', raw => { raw.equipment.ring = { id: 1, slot: 'weapon', base: 'rusted-blade', rarity: 'normal', itemLevel: 3, affixes: [] }; }, /wrong slot/],
    ['unknown slot', raw => { raw.equipment.tail = { id: 1, slot: 'ring', base: 'copper-ring', rarity: 'normal', itemLevel: 3, affixes: [] }; }, /unknown equipment slot/]
  ];
  for (const [name, corrupt, reason] of cases) {
    const raw = json(played()) as Record<string, any>;
    corrupt(raw);
    assert.throws(() => restoreGame(raw), reason, name);
  }
  assert.throws(() => restoreGame(null), /not an object/);
});

test('the rules core and data never reach into the browser layer', () => {
  for (const dir of ['src/core', 'src/data']) {
    for (const file of readdirSync(new URL(`../${dir}/`, import.meta.url))) {
      const source = readFileSync(new URL(`../${dir}/${file}`, import.meta.url), 'utf8');
      assert.doesNotMatch(source, /from '\.\.\/web\//, `${dir}/${file} imports the web layer`);
      assert.doesNotMatch(source, /\b(document|window|localStorage)\./, `${dir}/${file} touches the DOM`);
    }
  }
});

test('items saved before bases existed get a deterministic base for their kind', () => {
  const raw = json(played()) as Record<string, any>;
  raw.inventory = [{ id: 7, slot: 'weapon', rarity: 'normal', itemLevel: 12, affixes: [] }];
  raw.equipment = { ring: { id: 8, slot: 'ring', rarity: 'magic', itemLevel: 3, affixes: [{ stat: 'flatHp', value: 9 }] } };
  const restored = restoreGame(raw);
  assert.equal(restored.inventory[0]!.base, 'echo-focus');
  assert.equal(restored.equipment.ring!.base, 'copper-ring');
  assert.deepEqual(restoreGame(json(restored)), restored);
});
