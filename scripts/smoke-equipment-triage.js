const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
const triageHost = { innerHTML: '', dataset: {} };
let slotOptionWrites = 0;
let slotOptionsHtml = '';
const slotSelect = { dataset: {}, value: '' };
Object.defineProperty(slotSelect, 'innerHTML', {
    get: () => slotOptionsHtml,
    set: value => { slotOptionWrites += 1; slotOptionsHtml = value; }
});
const sortSelect = { value: '' };
runtime.document.getElementById = id => ({
    'ui-equipment-triage': triageHost,
    'ui-equipment-slot-filter': slotSelect,
    'ui-equipment-sort': sortSelect
})[id] || null;
runtime.updateStaticUI = () => {};
runtime.setTimeout = callback => { callback(); return 1; };
runtime.isItemRarityVisible = () => true;

const candidateFixtures = [
    { id: 99101, slot: '투구', name: '생존 시험 투구', baseName: '시험 투구', rarity: 'rare', baseStats: [], stats: [{ id: 'flatHp', val: 500 }] },
    { id: 99102, slot: '목걸이', name: '공격 시험 목걸이', baseName: '시험 목걸이', rarity: 'rare', baseStats: [], stats: [{ id: 'flatDmg', val: 250 }] },
    { id: 99103, slot: '허리띠', name: '특수 시험 허리띠', baseName: '시험 허리띠', rarity: 'unique', baseStats: [], stats: [] }
];
vm.runInContext(`game.inventory = ${JSON.stringify(candidateFixtures)};
    game.equipment['투구'] = null;
    game.equipment['목걸이'] = null;
    game.equipment['허리띠'] = null;`, runtime);
const candidates = vm.runInContext('game.inventory', runtime);

vm.runInContext("getSortedEquipmentInventoryRows(''); getSortedEquipmentInventoryRows('');", runtime);
assert.strictEqual(slotOptionWrites, 1, 'unchanged inventory refreshes must preserve the open slot selector DOM');

assert.strictEqual(runtime.equipmentTriage.start(), true);
const defenseResult = runtime.equipmentTriage.getResult(candidates[0]);
const damageResult = runtime.equipmentTriage.getResult(candidates[1]);
const specialResult = runtime.equipmentTriage.getResult(candidates[2]);
assert(defenseResult && defenseResult.ehpGainPct >= 1, 'max-life equipment must be identified as a survival upgrade');
assert(damageResult && damageResult.dpsGainPct >= 1, 'flat-damage equipment must be identified as a damage upgrade');
assert(specialResult && specialResult.special, 'unique equipment must remain visible as a special candidate');
assert(triageHost.innerHTML.includes('3개 완료'), 'analysis completion must be observable in the equipment toolbar');

assert.strictEqual(runtime.equipmentTriage.setFilter('defense'), true);
const defenseRows = runtime.equipmentTriage.filterRows(candidates.map((item, idx) => ({ item, idx })));
assert(defenseRows.some(row => row.item.id === candidates[0].id), 'survival filter must retain the EHP upgrade');
assert(defenseRows.every(row => runtime.equipmentTriage.getResult(row.item).ehpGainPct >= 1),
    'survival filter must exclude candidates without an EHP gain');
const cardHtml = runtime.renderInventoryCard(candidates[0], 0, 'equip', defenseResult);
assert(cardHtml.includes('생존 +'), 'analyzed cards must expose the result without requiring tooltip hover');

vm.runInContext('game.inventory[0].locked = true', runtime);
runtime.equipmentTriage.sync();
assert(runtime.equipmentTriage.getResult(candidates[0]), 'locking a reviewed item must not discard the analysis');
vm.runInContext('game.inventory[0].stats[0].val += 1', runtime);
runtime.equipmentTriage.sync();
assert.strictEqual(runtime.equipmentTriage.getResult(candidates[0]), null,
    'crafting or loot changes must invalidate stale comparison results');
assert(triageHost.innerHTML.includes('다시 분석'), 'stale results must ask for a fresh analysis');

const realGetPlayerStats = runtime.getPlayerStats;
runtime.getPlayerStats = () => { throw new Error('comparison provider failed'); };
runtime.showGameToast = () => {};
assert.strictEqual(runtime.equipmentTriage.start(), false, 'analysis provider failures must be reported at the UI boundary');
assert(triageHost.innerHTML.includes('오류가 발생'), 'failed analysis must leave an observable retry state');
runtime.getPlayerStats = realGetPlayerStats;
vm.runInContext('game.inventory = []', runtime);
assert.strictEqual(runtime.equipmentTriage.start(), true, 'an empty inventory must complete analysis without an ambiguous return');
assert(triageHost.innerHTML.includes('0개 완료'), 'empty-inventory analysis must report a completed zero state');

console.log('smoke-equipment-triage passed');
