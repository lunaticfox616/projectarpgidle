const assert=require('node:assert/strict');
const {runtime,run}=require('./lib/replay-fixture')(29);
const copy=code=>JSON.parse(run(`JSON.stringify(${code})`));
const packet=()=>({version:10,phase:'pending',currencies:{},equipment:[],gems:[],cores:[],jewels:[],salvagedEquipment:[]});
function fresh() {
    run(`game=mergeDefaults({level:100,season:3,currentZoneId:0,
        settings:{mapCompleteAction:'stop',autoEquipEmptySlots:false,showLootLog:false}});
        startEncounterRun(true);`);
}
fresh();
const gold=run('game.currencies.goldenRule'),count=run('game.inventory.length');
run(`awardEnemyLootCurrency('goldenRule',3);
    rollEquipmentLoot(game.actExploration.packs[0].waiting[0],getZone(0),1);`);
assert.equal(run('game.currencies.goldenRule'),gold+3,'a drop is spendable while the map is active');
assert.equal(run('game.inventory.length'),count+1,'equipment is owned before the boss');
assert.equal(run('game.actExploration.status'),'active');
assert.equal(run('game.actExploration.loot'),undefined,'new maps have no temporary inventory');
const earned=copy('({inventory:game.inventory,currencies:game.currencies})');
const withoutInstanceIds=value=>JSON.parse(JSON.stringify(value,(key,row)=>key==='instanceId'?undefined:row));
for(const payload of ['JSON.parse(serializeSaveState(game))','createCloudSavePayload(game)',
    'JSON.parse(createCloudSaveRequestBody("test",game)).save_data']) {
    run(`game=mergeDefaults(${payload});`);
    assert.deepEqual(withoutInstanceIds(copy('({inventory:game.inventory,currencies:game.currencies})')),earned,'all save routes preserve immediate pickups');
}
run(`game.actExploration.status='cleared';finishEncounterRun();finishEncounterRun();`);
assert.deepEqual(withoutInstanceIds(copy('({inventory:game.inventory,currencies:game.currencies})')),earned,'completion cannot grant drops again');
run(`startEncounterRun(true);actExplorationProgress.defeat(game);actExplorationProgress.depart(game);`);
assert.deepEqual(withoutInstanceIds(copy('({inventory:game.inventory,currencies:game.currencies})')),earned,'defeat and departure keep earned loot');

// Existing pending saves recover their exact rewards once, even if their bag is full.
fresh();
run(`window.oldItem=createItemFromBase(BASE_ITEM_DB.find(base=>base.slot==='무기'),'magic',3);
    normalizeItem(window.oldItem);
    game.inventory=Array.from({length:1000},(_,i)=>({...window.oldItem,id:400000+i}));`);
runtime.legacyPacket={...packet(),currencies:{goldenRule:3},equipment:[copy('window.oldItem')]};
run(`window.oldSave=JSON.parse(serializeSaveState(game));oldSave.actExploration.loot=legacyPacket;`);
const oldSave=copy('window.oldSave');
run('game=mergeDefaults(window.oldSave);');
assert.equal(run('game.currencies.goldenRule'),3);
assert.equal(run('game.currencies.divine'),3,'legacy currency accessors remain live');
assert.equal(run('game.inventory.length+game.equipmentTemporaryStorage.length'),1001,'migration protects already rolled overflow equipment');
assert.deepEqual(withoutInstanceIds(copy('game.inventory.at(-1)')),oldSave.actExploration.loot.equipment[0]);
assert.equal(run('game.actExploration.loot'),undefined);
assert.deepEqual(copy('window.oldSave.actExploration'),oldSave.actExploration,'restoring does not mutate the supplied legacy packet');
const migrationSnapshot=()=>withoutInstanceIds(copy('({inventory:[...game.inventory,...game.equipmentTemporaryStorage].sort((a,b)=>a.id-b.id),currencies:game.currencies})'));
const migrated=migrationSnapshot();
run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));');
assert.deepEqual(migrationSnapshot(),migrated,'migrated save cannot pay twice');
run('refreshItemIdCounter();');
assert.ok(run("createItemFromBase(BASE_ITEM_DB.find(base=>base.slot==='무기'),'normal',1).id")>400999);
for(const mutation of [
    "bad.actExploration.loot.currencies.goldenRule=-1",
    "bad.actExploration.loot.equipment.push({...bad.actExploration.loot.equipment[0]})",
    "bad.actExploration.loot.phase='claimed'",
    "bad.actExploration.loot.equipment[0].id=400001"
]) {
    run(`window.bad=JSON.parse(JSON.stringify(window.oldSave));${mutation};`);
    assert.throws(()=>run('mergeDefaults(window.bad)'),/탐험/,'invalid legacy packets must not partially pay');
    assert.deepEqual(migrationSnapshot(),migrated);
}
// Removed historical rewards stay removed; valid currencies still transfer.
for(const version of [1,4,5,6,7,8,9]) {
    runtime.legacyPacket={...packet(),version,currencies:{goldenRule:2},
        blurred45:4,growthItems:[],growthCodex:[],flasks:['h2'],alchemyGlass:3};
    if(version<=7)runtime.legacyPacket.currencies.growthEssence=4;
    if(version<=9)runtime.legacyPacket.currencies.meteorShard=5;
    fresh();
    run('window.legacy=JSON.parse(serializeSaveState(game));legacy.actExploration.loot=legacyPacket;game=mergeDefaults(legacy);');
    assert.equal(run('game.currencies.goldenRule'),2);
    assert.equal(run('game.actExploration.loot'),undefined);
}
fresh();runtime.legacyPacket={...packet(),currencies:{goldenRule:2}};
run('window.legacy=JSON.parse(serializeSaveState(game));legacy.actExploration.loot=legacyPacket;legacy.maxZoneId=1;legacy.currentZoneId=1;game=mergeDefaults(legacy);');
assert.equal(run('game.actExploration'),null);
assert.equal(run('game.currencies.goldenRule'),2,'a stale map cannot discard earned legacy rewards');
fresh();runtime.legacyPacket={...packet(),currencies:{goldenRule:Number.MAX_VALUE}};
run('window.legacy=JSON.parse(serializeSaveState(game));legacy.actExploration.loot=legacyPacket;legacy.currencies.goldenRule=Number.MAX_VALUE;');
const beforeOverflow=copy('game');
assert.throws(()=>run('mergeDefaults(legacy)'),/수령 한도/);
assert.deepEqual(copy('game'),beforeOverflow,'failed migration cannot mutate the live game');
console.log('immediate exploration loot, save migration, overflow protection and no duplicate rewards: OK');
