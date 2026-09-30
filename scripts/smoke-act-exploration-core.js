// 탐험 중 코어 드롭(예전 흐릿한 45면체 자리): 보스 전까지 보류, 저장 왕복, 망가진 저장 거부, 예전 v6 보류 재료 폐기,
// 한 번만 정산, 죽거나 떠나면 소실, 탐험 밖 드롭은 바로 보관함, 보관함 한도.
const assert=require('node:assert/strict');
const {run}=require('./lib/replay-fixture')(83);
const copy=expression=>JSON.parse(run(`JSON.stringify(${expression})`));
run(`game.currentZoneId=0;game.settings.mapCompleteAction='stop';
    game.contentProgression.inherited.push('cube');contentProgression.sync(game);
    game.underworldProgress.highestFloor=11;startEncounterRun(true);`);
const drop=`actExplorationLoot.capture(game,game.actExploration,()=>coreItems.receiveDrop(actExplorationLoot.delivery(game,'cores')))`;
const held=copy(drop);
assert.equal(held.lines.length,4);
assert.deepEqual(copy('game.cores'),{equipped:null,owned:[]},'a pending core cannot be worn before the boss');
assert.deepEqual(copy('game.actExploration.loot.cores'),[held]);
for(const payload of ['JSON.parse(serializeSaveState(game))','createCloudSavePayload(game)',
    'JSON.parse(createCloudSaveRequestBody("test",game)).save_data']) {
    assert.deepEqual(JSON.parse(run(`JSON.stringify(mergeDefaults(${payload}).actExploration.loot.cores)`)),[held],
        'local and cloud payloads retain the exact pending core');
}
run(`window.bad=JSON.parse(serializeSaveState(game));window.bad.actExploration.loot.cores[0].lines[0].value=9999;`);
assert.throws(()=>run('mergeDefaults(window.bad)'),/탐험 장비 저장/,'an out-of-range pending line is a corrupt save');
run(`window.legacy=JSON.parse(serializeSaveState(game));Object.assign(window.legacy.actExploration.loot,{version:6,blurred45:5});
    delete window.legacy.actExploration.loot.cores;`);
const legacy=JSON.parse(run('JSON.stringify(mergeDefaults(window.legacy).actExploration.loot)'));
assert.equal(legacy.version,8);
assert.deepEqual(legacy.cores,[],'old pending cube material is dropped without compensation');
assert(!('blurred45' in legacy));
// v7 held growth items and growth essence; the growth board is gone (2026-09-30), so they go without compensation.
run(`window.legacy7=JSON.parse(serializeSaveState(game));Object.assign(window.legacy7.actExploration.loot,{version:7,
    growthItems:[{id:990001,name:'옛 생장판',rarity:'magic',stats:[],baseStats:[],slot:'무기',growthCategory:'flower',growthShapeId:'dot1'}],
    growthCodex:[],currencies:{...window.legacy7.actExploration.loot.currencies,growthEssence:4}});`);
const legacy7=JSON.parse(run('JSON.stringify(mergeDefaults(window.legacy7).actExploration.loot)'));
assert.equal(legacy7.version,8);
assert(!('growthItems' in legacy7)&&!('growthCodex' in legacy7)&&!('growthEssence' in legacy7.currencies),'pending growth rewards are dropped');

run(`game.actExploration.status='cleared';finishEncounterRun();`);
assert.deepEqual(copy('game.cores.owned'),[held],'settlement moves the pending core into the store');
assert.deepEqual(copy('game.actExploration.loot.cores'),[]);
run('finishEncounterRun();');
assert.equal(run('game.cores.owned.length'),1,'settlement grants once');

run(`startEncounterRun(true);${drop};actExplorationProgress.defeat(game);`);
assert.equal(run('game.cores.owned.length'),1);
assert.deepEqual(copy('game.actExploration.loot.cores'),[],'death loses the pending core');
run(`startEncounterRun(true);${drop};actExplorationProgress.depart(game);`);
assert.equal(run('game.cores.owned.length'),1);
assert.equal(run('game.actExploration'),null);

assert(run('coreItems.receiveDrop(null)'),'ordinary drops go straight to the store');
assert.equal(run('game.cores.owned.length'),2);
run(`while(game.cores.owned.length<CORE_ITEM_RULES.capacity)coreItems.receiveDrop(null);`);
assert.equal(run('coreItems.receiveDrop(null)'),null,'a full store takes no new drop');
assert.equal(run('game.cores.owned.length'),run('CORE_ITEM_RULES.capacity'));
console.log('act exploration core escrow, restore, legacy material, settlement, loss, ordinary drops and capacity: OK');
