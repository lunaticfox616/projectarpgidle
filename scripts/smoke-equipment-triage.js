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
assert.strictEqual(defenseRows.length, candidates.length, 'analysis must preserve every item');
assert(defenseRows.every(row => row.filterActive && row.filterMatched === (runtime.equipmentTriage.getResult(row.item).ehpGainPct >= 1)),
    'analysis marks matches without hiding the other equipment');
const intersected = runtime.equipmentTriage.filterRows([{ item: candidates[0], idx: 0, filterMatched: false }]);
assert.strictEqual(intersected[0].filterMatched, false, 'analysis must preserve a search mismatch');
runtime.equipmentTriage.setFilter('all');
vm.runInContext("game.settings.equipmentSlotFilter = '투구'", runtime);
const slotRows = vm.runInContext("getSortedEquipmentInventoryRows('')", runtime);
assert.strictEqual(slotRows.length, 3);
assert.strictEqual(slotRows.filter(row => row.filterMatched).length, 1);
const noMatches = vm.runInContext("getSortedEquipmentInventoryRows('없는이름')", runtime);
assert.strictEqual(noMatches.length, 3);
assert(noMatches.every(row => row.filterActive && !row.filterMatched));
vm.runInContext("game.settings.equipmentSlotFilter = 'all'", runtime);
runtime.equipmentTriage.setFilter('defense');
const cardHtml = runtime.renderInventoryCard(candidates[0], 0, 'equip', defenseResult);
assert(cardHtml.includes('생존 +'), 'analyzed cards must expose the result without requiring tooltip hover');
let recommendedEquip = null;
runtime.equipItemById = (id, slot) => { recommendedEquip = { id, slot }; return true; };
runtime.showGameToast = () => {};
assert.strictEqual(runtime.equipmentTriage.equipRecommended(), true, 'the selected analysis axis must offer one-click replacement');
assert.deepStrictEqual(recommendedEquip, { id: candidates[0].id, slot: defenseResult.ehpSlot },
    'the survival recommendation must equip the strongest EHP candidate into its analyzed slot');
runtime.openAutoSalvageConfigOverlay = () => {};
vm.runInContext('getInventoryLimit = () => 3', runtime);
runtime.equipmentTriage.render();
assert(triageHost.innerHTML.includes('자동 해체 설정'), 'near-full inventory must expose cleanup settings beside analysis');

vm.runInContext('game.inventory[0].locked = true', runtime);
runtime.equipmentTriage.sync(true);
assert(runtime.equipmentTriage.getResult(candidates[0]), 'locking a reviewed item must not discard the analysis');
vm.runInContext('game.inventory[0].stats[0].val += 1', runtime);
runtime.equipmentTriage.sync(true);
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

// Controlled browser timers with real stat providers: interleave combat/build edits.
const frozen = require('./lib/replay-fixture')(17);
const tasks = new Map();
let taskId = 0;
const frozenHost = { innerHTML: '', dataset: {} };
const notices = [];
frozen.runtime.showGameToast = message => notices.push(message);
frozen.runtime.document.getElementById = id => id === 'ui-equipment-triage' ? frozenHost : null;
frozen.runtime.updateStaticUI = () => {};
frozen.runtime.setTimeout = callback => { const id = ++taskId; tasks.set(id, callback); return id; };
frozen.runtime.clearTimeout = id => tasks.delete(id);
const analysis = frozen.runtime.equipmentTriage;
function step() {
    const [id, callback] = tasks.entries().next().value;
    tasks.delete(id); callback();
}
function complete() { while (tasks.size) step(); }
frozen.run(`
    game.inventory = Array.from({length:7}, (_,i) => ({id:800+i, slot:'목걸이', name:'동일 조건 후보',
        rarity:'rare', baseStats:[], stats:[{id:'flatDmg',val:250}]}));
    game.uniqueEliteTraitBuff = {expiresAt:getCombatTime()+200, trait:{attackSpeedVarMul:1.8}};
    game.ascendClass = 'guardian'; game.ascendKeystones = ['gd7'];
    game.playerHp = 1; game.playerAilments = [{type:'poison',time:10}];
`);
const liveGame = frozen.run('game');
const beforeAnalysis = frozen.run('JSON.stringify(game)');
assert.equal(analysis.start(), true);
assert.equal(frozen.run('game'), liveGame, 'baseline restores live state identity');
assert.equal(frozen.run('JSON.stringify(game)'), beforeAnalysis, 'baseline cannot cleanse live ailments or normalize live data');
assert(frozenHost.innerHTML.includes('분석 중단'));
step();
frozen.run('game.combatTimeMs += 1000; game.playerHp = 140; game.enemies = [];');
analysis.sync(true);
const afterCombat = frozen.run('JSON.stringify(game)');
complete();
const expected = JSON.stringify(analysis.getResult(liveGame.inventory[0]));
assert.notEqual(expected, 'null');
for (const item of liveGame.inventory) assert.equal(JSON.stringify(analysis.getResult(item)), expected,
    'all candidates use the same starting buff, HP and enemy state across chunks');
assert.equal(frozen.run('game'), liveGame);
assert.equal(frozen.run('JSON.stringify(game)'), afterCombat, 'candidate evaluation leaves all live state unchanged');

analysis.start();
const lateCallback = tasks.values().next().value;
step();
assert.equal(analysis.cancel(), true);
assert.equal(tasks.size, 0);
assert.equal(analysis.getResult(liveGame.inventory[0]), null, 'cancel discards partial results');
assert(frozenHost.innerHTML.includes('분석을 중단'));
assert.equal(analysis.cancel(), false);
analysis.start();
const restartHtml = frozenHost.innerHTML;
lateCallback();
assert.equal(frozenHost.innerHTML, restartHtml, 'abandoned callback cannot advance the restarted job');
complete();

for (const mutation of [
    "game.equippedSupports = ['공격 속도 증가']",
    "game.activeSkill = '연속 베기'",
    "game.gemData['연속 베기'] = {level:2,exp:0}",
    "game.supportGemData['공격 속도 증가'] = {level:3,exp:0}",
    "game.skillAutoRules.push({skillName:'함성',enabled:true})",
    "game.conditionGemLevels['함성'] = 2",
    "game.skyTower.gemBoosts['연속 베기'] = 2",
    "game.passives.push('test-passive-change')",
    "game.passiveSpecialization.keystoneChoices.wisdom_leap_element = 'cold'",
    "game.loop10BonusStats.flatDmg += 1",
    "game.underworldRunes.enhanceLvByNo[1] = 2",
    "game.talentCardLoadout[0] = 'hero1__warrior'",
    "game.coreCube.powers.test = 1",
    "game.growthBoard.activeLoadout = 1",
    "game.pruningTree.nodeRanks.test = 1",
    "game.cosmosAtlas = {mastery:{resonanceDrive:1}}",
    "game.ocean.permanentUpgrades.pressureResist = 1",
    "game.flasks.utils = [{key:'quicksilver',charges:1}]"
]) {
    const saved = frozen.run('JSON.stringify(game)');
    analysis.start(); complete();
    frozen.run(mutation);
    assert.equal(analysis.setFilter('damage'), false, `${mutation}: stale actions are rejected immediately`);
    assert.equal(analysis.getResult(liveGame.inventory[0]), null);
    frozen.run(`game = ${saved};`);
}
analysis.start();
frozen.run('game.level += 1');
complete();
assert(frozenHost.innerHTML.includes('세팅이 변경'), 'build changes during analysis cannot publish results');
analysis.start(); complete();
frozen.run("game.inventory[0].locked = true; game.gemData['기본 공격'].exp += 1;");
analysis.sync(true);
assert(analysis.getResult(liveGame.inventory[0]), 'locks and experience accumulation preserve results');
frozen.run('game.level += 1');
assert.equal(analysis.equipRecommended(), false, 'stale recommendations cannot equip gear');
frozen.run('game.inventory[3].baseStats = {};');
const beforeFailure = frozen.run('JSON.stringify(game)');
const identityBeforeFailure = frozen.run('game');
assert.equal(analysis.start(), true);
complete();
assert(frozenHost.innerHTML.includes('오류가 발생'), 'malformed candidate reports a retryable error');
assert.equal(notices.length, 1, 'failure emits one user notification');
assert.equal(analysis.getResult(liveGame.inventory[0]), null, 'failed batches cannot publish partial recommendations');
assert.equal(frozen.run('game'), identityBeforeFailure, 'failed candidate restores live identity');
assert.equal(frozen.run('JSON.stringify(game)'), beforeFailure, 'failed candidate leaves live state unchanged');
console.log('smoke-equipment-triage passed');
