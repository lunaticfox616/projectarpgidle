// 독벌침(2026-10-07): 새 줄은 추가 옵션 6줄 안에서만 붙고(예전에는 상한 검사 없이 7줄이 됐다), 이미 붙은 독벌침 줄은
// 새로 굴린 줄로 바꿔 끼운다. 막힐 때는 독벌침을 쓰지 않는다.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime({});
const run = source => vm.runInContext(source, context);
run(`game.woodsmanBuildLock = false; game.inventory = [];`);
const weaponId = run(`(() => { const item = createItemFromBase(BASE_ITEM_DB.find(row => row.slot === '무기'), 'rare', 10);
    item.stats = MOD_DB.filter(mod => mod.slots.includes('무기')).slice(0, 6).map(mod => rollAffixValue(mod, 10));
    item.chaosInfusion = null; item.fusedRelic = false;
    game.inventory.push(item); craftingSelectionState.ref = item.id; craftingSelectionState.isEquip = false; return item.id; })()`);
const weapon = () => run(`game.inventory.find(item => item.id === ${weaponId})`);
const apply = () => run(`game.currencies.venomStinger = 1; applyVenomStingerToSelectedItem(); game.currencies.venomStinger`);
const venomLines = () => weapon().stats.filter(stat => stat && stat.venomStingerBonus).length;

assert.strictEqual(weapon().stats.length, 6, 'fixture: a full rare weapon');
assert.strictEqual(apply(), 1, 'a full weapon refuses the stinger and keeps it');
assert.strictEqual(weapon().stats.length, 6, 'no seventh line');

run(`game.inventory.find(item => item.id === ${weaponId}).stats.pop()`);
assert.strictEqual(apply(), 0, 'with room the stinger is spent');
assert.deepStrictEqual([weapon().stats.length, venomLines()], [6, 1], 'it adds one venom line');

assert.strictEqual(apply(), 0, 'a weapon that already has a venom line takes another stinger');
assert.deepStrictEqual([weapon().stats.length, venomLines()], [6, 1], 'the venom line is rerolled in place');

run(`(() => { const item = game.inventory.find(item => item.id === ${weaponId});
    item.stats = item.stats.filter(stat => !stat.venomStingerBonus).slice(0, 5); item.chaosInfusion = { id: 'res_fire' }; })()`);
assert.strictEqual(apply(), 1, 'a chaos infusion takes the sixth place');
assert.strictEqual(weapon().stats.length, 5, 'still five lines and the infusion');

console.log('venom stinger cap smoke passed');
