const assert=require('node:assert/strict');
const {run}=require('./lib/replay-fixture')(113);
const copy=expression=>JSON.parse(run(`JSON.stringify(${expression})`));
run(`game.currentZoneId=0;game.settings.mapCompleteAction='stop';startEncounterRun(true);
    window.drop=generateEquipmentDrop(game.actExploration.packs[0].waiting[0],{zone:getZone(0)});
    window.drop.rarity='normal';window.drop.stats=[];
    game.settings.autoEquipEmptySlots=true;game.settings.itemFilterEnabled=true;
    game.settings.itemFilterRarities.normal=false;`);
const original=copy('({inventory:game.inventory,equipment:game.equipment,currencies:game.currencies,recovery:game.salvageRecovery})');
run(`actExplorationLoot.capture(game,game.actExploration,()=>
    addItemToInventory(window.drop,{delivery:actExplorationLoot.delivery(game,'equipment')}));`);
assert.equal(run('game.actExploration.loot.equipment.length'),0,'filtered equipment is not stashed');
assert.deepEqual(copy('game.actExploration.loot.currencies'),{},'filter exclusion is not auto-salvage');
assert.equal(run('game.actExploration.loot.salvagedEquipment.length'),0);

run(`game.settings.itemFilterEnabled=false;game.settings.autoSalvageEnabled=true;
    game.settings.autoSalvageRarities.normal=true;
    actExplorationLoot.capture(game,game.actExploration,()=>
        addItemToInventory(window.drop,{delivery:actExplorationLoot.delivery(game,'equipment')}));`);
assert.equal(run('game.actExploration.loot.equipment.length'),0,'configured salvage is applied at the original drop');
assert.equal(run('game.actExploration.loot.salvagedEquipment.length'),1);
assert(run('Object.values(game.actExploration.loot.currencies).reduce((s,n)=>s+n,0)')>0);
assert.deepEqual(copy('({inventory:game.inventory,equipment:game.equipment,currencies:game.currencies,recovery:game.salvageRecovery})'),original,
    'pending equipment cannot auto-equip, spend salvage gains or appear in salvage recovery');
const held=copy('game.actExploration.loot');
for(const payload of ['JSON.parse(serializeSaveState(game))','createCloudSavePayload(game)',
    'JSON.parse(createCloudSaveRequestBody("test",game)).save_data']) {
    run(`game=mergeDefaults(${payload});`);
    assert.deepEqual(copy('game.actExploration.loot'),held,'deferred salvage and raw recovery costs survive every save path');
}
run(`window.bad=JSON.parse(serializeSaveState(game));window.bad.actExploration.loot.salvagedEquipment[0].rewards.chaos=-1;`);
assert.throws(()=>run('mergeDefaults(window.bad)'),/탐험 재화 저장/);
run(`window.bad=JSON.parse(serializeSaveState(game));window.bad.actExploration.loot.equipment.push(window.drop);`);
assert.throws(()=>run('mergeDefaults(window.bad)'),/중복된 탐험 아이템 저장/);
run('refreshItemIdCounter();');
assert.notEqual(run('generateEquipmentDrop(game.actExploration.packs[0].waiting[0],{zone:getZone(0)}).id'),held.salvagedEquipment[0].item.id);
run(`game.actExploration.status='cleared';finishEncounterRun();`);
assert.deepEqual(copy('game.salvageRecovery.entries[0].item'),held.salvagedEquipment[0].item);
assert.deepEqual(copy('game.salvageRecovery.entries[0].rewards'),held.salvagedEquipment[0].rewards);
for(const [key,amount] of Object.entries(held.currencies))assert.equal(run(`game.currencies[${JSON.stringify(key)}]`),(original.currencies[key]||0)+amount);
const claimed=copy('({currencies:game.currencies,recovery:game.salvageRecovery})');
run('finishEncounterRun();');
assert.deepEqual(copy('({currencies:game.currencies,recovery:game.salvageRecovery})'),claimed,'repeated clear cannot add recovery entries or materials again');

run(`startEncounterRun(true);actExplorationLoot.capture(game,game.actExploration,()=>
    addItemToInventory({...window.drop,id:910000},{delivery:actExplorationLoot.delivery(game,'equipment')}));
    actExplorationProgress.defeat(game);`);
assert.deepEqual(copy('({currencies:game.currencies,recovery:game.salvageRecovery})'),claimed,'failure loses the pending recovery record as well');
assert.deepEqual(copy('game.actExploration.loot.salvagedEquipment'),[]);

// Full inventory must count held items. Protected targets bypass both filters and salvage.
run(`startEncounterRun(true);game.inventory=[];game.settings.autoSalvageEnabled=false;
    actExplorationLoot.capture(game,game.actExploration,()=>{
        for(let n=0;n<300;n++)addItemToInventory({...window.drop,id:920000+n},{delivery:actExplorationLoot.delivery(game,'equipment')});
    });`);
assert(run('game.actExploration.loot.equipment.length')>0);
assert(run('game.actExploration.loot.equipment.length')<300,'pending equipment consumes its grid footprint for subsequent pickups');
assert.equal(run('game.actExploration.loot.salvagedEquipment.length'),8,'recovery history stays bounded');
run(`window.beforeProtected=game.actExploration.loot.equipment.length;
    game.settings.itemFilterEnabled=true;game.settings.autoSalvageEnabled=true;
    game.settings.equipmentTargets={enabled:true,slot:'any',scope:'explicit',minMatches:1,rules:[{statId:'flatHp',minValue:1,minTier:1}]};
    actExplorationLoot.capture(game,game.actExploration,()=>
        addItemToInventory({...window.drop,id:930000,stats:[{id:'flatHp',val:20,tier:1}]},{delivery:actExplorationLoot.delivery(game,'equipment')}));`);
assert.equal(run('game.actExploration.loot.equipment.length'),run('window.beforeProtected+1'),'target option protection survives full capacity, filter and auto-salvage');
run(`game.actExploration.status='cleared';finishEncounterRun();`);
assert(run('game.inventory.some(item=>item.id===930000)'));
assert.equal(run('game.salvageRecovery.entries.length'),8);

// The actual equipment drop path uses the same policy, not just direct item delivery.
run(`startEncounterRun(true);game.inventory=[];game.settings.itemFilterEnabled=false;
    game.settings.equipmentTargets.enabled=false;
    game.settings.autoSalvageRarities={normal:true,magic:true,rare:true,unique:true};
    actExplorationLoot.capture(game,game.actExploration,()=>rollEquipmentLoot(game.actExploration.packs[0].waiting[0],getZone(0),1));`);
assert.equal(run('game.actExploration.loot.equipment.length'),0);
assert.equal(run('game.actExploration.loot.salvagedEquipment.length'),1);
run(`window.v5=JSON.parse(serializeSaveState(game));window.v5.actExploration.loot.version=5;
    delete window.v5.actExploration.loot.salvagedEquipment;`);
assert.deepEqual(copy('mergeDefaults(window.v5).actExploration.loot.salvagedEquipment'),[],'old opt-in saves never manufacture recovery entries');
console.log('act exploration equipment pickup smoke passed');
