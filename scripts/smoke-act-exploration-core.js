const assert=require('node:assert/strict');
const {run}=require('./lib/replay-fixture')(83);
const copy=code=>JSON.parse(run(`JSON.stringify(${code})`));
run(`game.currentZoneId=0;game.settings.mapCompleteAction='stop';
    game.contentProgression.inherited.push('cube');contentProgression.sync(game);
    game.underworldProgress.highestFloor=11;startEncounterRun(true);window.core=coreItems.receiveDrop();`);
const received=copy('window.core');
assert.equal(received.lines.length,4);
assert.deepEqual(copy('game.cores.owned'),[received],'core is available during exploration');
for(const payload of ['JSON.parse(serializeSaveState(game))','createCloudSavePayload(game)',
    'JSON.parse(createCloudSaveRequestBody("test",game)).save_data']) {
    run(`game=mergeDefaults(${payload});`);
    assert.deepEqual(copy('game.cores.owned'),[received]);
}
assert.equal(run('coreItems.equip(window.core.id)'),true,'the drop can be equipped before completion');
run(`game.actExploration.status='cleared';finishEncounterRun();finishEncounterRun();
    startEncounterRun(true);actExplorationProgress.defeat(game);actExplorationProgress.depart(game);`);
assert.deepEqual(copy('game.cores.equipped'),received,'completion, death and departure preserve the core');
assert.equal(run('game.cores.owned.length'),0,'no second core is created');
run('while(game.cores.owned.length<CORE_ITEM_RULES.capacity)coreItems.receiveDrop();');
assert.equal(run('coreItems.receiveDrop()'),null);
assert.equal(run('game.cores.owned.length'),run('CORE_ITEM_RULES.capacity'));
console.log('immediate exploration core ownership, equip, save, retention and capacity: OK');
