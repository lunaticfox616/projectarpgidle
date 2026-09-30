const assert=require('node:assert/strict');
const fixture=require('./lib/replay-fixture');
const {run}=fixture(29);
const copy=expression=>JSON.parse(run(`JSON.stringify(${expression})`));
run(`game.currentZoneId=0;game.settings.mapCompleteAction='stop';startEncounterRun(true);`);
const before=copy('({inventory:game.inventory,equipment:game.equipment,currencies:game.currencies,uniqueCodex:game.uniqueCodex})');
run(`actExplorationLoot.capture(game,game.actExploration,()=>{
    awardEnemyLootCurrency('goldenRule',3);
    rollEquipmentLoot(game.actExploration.packs[0].waiting[0],getZone(0),1);
});`);
assert.deepEqual(copy('({inventory:game.inventory,equipment:game.equipment,currencies:game.currencies,uniqueCodex:game.uniqueCodex})'),before,
    'pending drops cannot be spent, equipped, salvaged or registered as acquired');
const loot=copy('game.actExploration.loot');
assert.equal(loot.currencies.goldenRule,3);
assert.equal(loot.equipment.length,1);
run('refreshItemIdCounter();');
const nextDrop=copy('generateEquipmentDrop(game.actExploration.packs[0].waiting[0],{zone:getZone(0)})');
assert.notEqual(nextDrop.id,loot.equipment[0].id,'new drops cannot reuse pending equipment ids after reconnect');
assert.equal(run('actExplorationLoot.claim(game,game.actExploration)'),null,'cannot claim before boss completion');
for(const saved of ['JSON.parse(serializeSaveState(game))','createCloudSavePayload(game)',
    'JSON.parse(createCloudSaveRequestBody("test",game)).save_data']) {
    run(`game=mergeDefaults(${saved});`);
    assert.deepEqual(copy('game.actExploration.loot'),loot,'local/cloud save preserves exact rolled rewards');
}
run(`{
    const bad=JSON.parse(serializeSaveState(game));bad.actExploration.loot.currencies.goldenRule=-1;
    window.badLootSave=bad;
}`);
assert.throws(()=>run('mergeDefaults(window.badLootSave)'),/탐험 재화 저장/);
assert.deepEqual(copy('game.actExploration.loot'),loot,'invalid restore cannot mutate the live rewards');

// The claim primitive receives a domain-authorised clear; combat progression tests exercise that transition.
run(`game.actExploration.status='cleared';game.settings.autoEquipEmptySlots=true;
    game.inventory=Array.from({length:1000},(_,i)=>({...game.actExploration.loot.equipment[0],id:400000+i}));`);
assert.equal(run('canStoreEquipmentItems(game.actExploration.loot.equipment,game)'),false,'fixture has no inventory capacity');
run('finishEncounterRun();');
assert.equal(run('game.currencies.goldenRule'),(before.currencies.goldenRule||0)+3);
assert.equal(run('game.currencies.divine'),run('game.currencies.goldenRule'),'legacy currency accessors survive settlement');
assert.deepEqual(copy('game.inventory.at(-1)'),loot.equipment[0]);
assert.equal(run('game.inventory.length'),1001,'overflow cannot discard or auto-salvage pending equipment');
assert.deepEqual(copy('game.equipment'),before.equipment,'settlement does not silently change the active build');
const claimed=copy('({inventory:game.inventory,currencies:game.currencies})');
run('finishEncounterRun();');
assert.deepEqual(copy('({inventory:game.inventory,currencies:game.currencies})'),claimed,'repeat settlement grants nothing');

run(`startEncounterRun(true);
    actExplorationLoot.capture(game,game.actExploration,()=>awardEnemyLootCurrency('goldenRule',4));
    actExplorationProgress.defeat(game);`);
assert.equal(run('game.actExploration.loot.phase'),'lost');
assert.deepEqual(copy('game.actExploration.loot.currencies'),{});
assert.deepEqual(copy('({inventory:game.inventory,currencies:game.currencies})'),claimed,'death loses only unclaimed drops');
run(`startEncounterRun(true);
    actExplorationLoot.capture(game,game.actExploration,()=>awardEnemyLootCurrency('goldenRule',5));
    actExplorationProgress.depart(game);`);
assert.equal(run('game.actExploration'),null);
assert.deepEqual(copy('({inventory:game.inventory,currencies:game.currencies})'),claimed,'departure discards pending rewards');

assert.throws(()=>run(`startEncounterRun(true);actExplorationLoot.capture(game,game.actExploration,()=>{
    awardEnemyLootCurrency('goldenRule',8);throw Error('producer failure');});`),/producer failure/);
assert.deepEqual(copy('game.actExploration.loot.currencies'),{},'a failed loot production does not keep a partial packet');
run(`awardEnemyLootCurrency('goldenRule',1);`);
assert.equal(run('game.currencies.goldenRule'),claimed.currencies.goldenRule+1,'failed producer releases the synchronous capture boundary');

run(`window.claimFailureState={inventory:[],equipment:{},currencies:{goldenRule:Number.MAX_VALUE},
    noti:{},skyTower:{condensedPower:0},currencyDropVersion:0};
    window.claimFailureRun={status:'cleared',loot:actExplorationLoot.create()};
    window.claimFailureRun.loot.currencies.goldenRule=Number.MAX_VALUE;`);
const failedState=copy('window.claimFailureState'),failedRun=copy('window.claimFailureRun');
assert.throws(()=>run('actExplorationLoot.claim(window.claimFailureState,window.claimFailureRun)'),/수령 한도/);
assert.deepEqual(copy('window.claimFailureState'),failedState,'failed settlement does not apply a partial balance');
assert.deepEqual(copy('window.claimFailureRun'),failedRun,'failed settlement leaves pending rewards claimable');

run(`startEncounterRun(true);game.actExploration.status='cleared';
    window.beforeChainCurrency=game.currencies.goldenRule;
    actExplorationLoot.capture(game,game.actExploration,()=>awardEnemyLootCurrency('goldenRule',2));`);
assert.equal(run('game.currencies.goldenRule'),run('window.beforeChainCurrency'),
    'chain kills in the boss-death tick remain pending until the completion transaction');
assert.equal(run('game.actExploration.loot.currencies.goldenRule'),2);
run('actExplorationProgress.defeat(game);');
assert.equal(run('game.currencies.goldenRule'),run('window.beforeChainCurrency'),
    'a simultaneous defeat cannot retain rewards from the uncommitted clear');

// Settlement failures must not reserve story completion before the inventory transaction succeeds.
run(`startEncounterRun(true);game.actExploration.status='cleared';
    game.actExploration.loot.currencies.goldenRule=Number.MAX_VALUE;game.currencies.goldenRule=Number.MAX_VALUE;`);
const beforeCompletionFailure=copy('game');
assert.throws(()=>run('finishEncounterRun()'),/수령 한도/);
assert.deepEqual(copy('game'),beforeCompletionFailure,'failed actual completion cannot consume the clear or mutate combat/story state');
run(`game.actExploration.loot.currencies.goldenRule=1;game.currencies.goldenRule=0;finishEncounterRun();`);
assert.equal(run('game.actExploration.completionApplied'),true,'completion can retry once its invalid balance is corrected');
assert.equal(run('game.currencies.goldenRule'),1);

// v8 held flask discoveries and alchemy glass; flasks were removed (2026-10-01) and go without compensation.
run(`game=mergeDefaults({level:100,season:3,settings:{showLootLog:false,pauseGameOnOverlay:false,mapCompleteAction:'stop'}});
    startEncounterRun(true);window.v8LootSave=JSON.parse(serializeSaveState(game));
    Object.assign(window.v8LootSave.actExploration.loot,{version:8,flasks:['h2','granite1'],alchemyGlass:4});`);
const upgradedLoot=copy('mergeDefaults(window.v8LootSave).actExploration.loot');
assert.equal(upgradedLoot.version,9);
assert(!('flasks' in upgradedLoot)&&!('alchemyGlass' in upgradedLoot),'pending flask discoveries and glass are dropped');
run(`window.oldLootSave=JSON.parse(serializeSaveState(game));window.oldLootSave.actExploration.loot.version=1;`);
const fromV1=copy('mergeDefaults(window.oldLootSave).actExploration.loot');
assert(fromV1.version===9&&!('flasks' in fromV1),'legacy immediate flask rewards are never regenerated');
console.log('act exploration loot smoke passed');
