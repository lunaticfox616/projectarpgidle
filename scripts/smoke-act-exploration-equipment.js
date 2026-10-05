const assert=require('node:assert/strict');
const {run}=require('./lib/replay-fixture')(113);
const copy=code=>JSON.parse(run(`JSON.stringify(${code})`));
run(`game.currentZoneId=0;game.settings.mapCompleteAction='stop';startEncounterRun(true);
    window.drop=generateEquipmentDrop(game.actExploration.packs[0].waiting[0],{zone:getZone(0)});
    window.drop.rarity='normal';window.drop.stats=[];
    game.settings.autoEquipEmptySlots=false;game.settings.itemFilterEnabled=true;
    game.settings.itemFilterRarities.normal=false;`);
const before=copy('({inventory:game.inventory,currencies:game.currencies,recovery:game.salvageRecovery})');
assert.equal(run('addItemToInventory(window.drop)'),false);
assert.deepEqual(copy('({inventory:game.inventory,currencies:game.currencies,recovery:game.salvageRecovery})'),before,'filtered loot gives no items or salvage');
run(`game.settings.itemFilterEnabled=false;game.settings.autoSalvageEnabled=true;
    game.settings.autoSalvageRarities.normal=true;addItemToInventory(window.drop);`);
assert.equal(run('game.salvageRecovery.entries.length'),1,'salvaged equipment is recoverable immediately');
assert.ok(run('Object.values(game.currencies).reduce((a,b)=>a+b,0)')>Object.values(before.currencies).reduce((a,b)=>a+b,0));
const salvaged=copy('({currencies:game.currencies,recovery:game.salvageRecovery})');
for(const payload of ['JSON.parse(serializeSaveState(game))','createCloudSavePayload(game)',
    'JSON.parse(createCloudSaveRequestBody("test",game)).save_data']) {
    run(`game=mergeDefaults(${payload});`);
    assert.deepEqual(copy('({currencies:game.currencies,recovery:game.salvageRecovery})'),salvaged);
}
run(`game.actExploration.status='cleared';finishEncounterRun();finishEncounterRun();startEncounterRun(true);actExplorationProgress.defeat(game);`);
assert.deepEqual(copy('({currencies:game.currencies,recovery:game.salvageRecovery})'),salvaged,'no repeat payout or death loss');
run(`startEncounterRun(true);game.inventory=[];game.settings.autoSalvageEnabled=false;
    for(let n=0;n<300;n++)addItemToInventory({...window.drop,id:920000+n});`);
assert.ok(run('game.inventory.length')>0&&run('game.inventory.length')<300,'normal capacity applies immediately');
assert.equal(run('game.salvageRecovery.entries.length'),8);
run(`window.count=game.inventory.length;game.settings.itemFilterEnabled=true;game.settings.autoSalvageEnabled=true;
    game.settings.equipmentTargets={enabled:true,slot:'any',scope:'explicit',minMatches:1,rules:[{statId:'flatHp',minValue:1,minTier:1}]};
    addItemToInventory({...window.drop,id:930000,stats:[{id:'flatHp',val:20,tier:1}]});`);
assert.equal(run('game.inventory.length'),run('window.count+1'),'target equipment survives full bag, filter and auto-salvage');
run(`game.inventory=[];game.settings.itemFilterEnabled=false;game.settings.equipmentTargets.enabled=false;
    game.salvageRecovery.entries=[];game.settings.autoSalvageRarities={normal:true,magic:true,rare:true,unique:true};
    rollEquipmentLoot(game.actExploration.packs[0].waiting[0],getZone(0),1);`);
assert.equal(run('game.inventory.length'),0);
assert.equal(run('game.salvageRecovery.entries.length'),1,'real drop path respects automatic salvage');
console.log('immediate equipment filter, salvage, recovery, capacity and target protection: OK');
