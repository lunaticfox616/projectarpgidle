const assert=require('node:assert/strict');
const {run}=require('./lib/replay-fixture')(83);
const copy=expression=>JSON.parse(run(`JSON.stringify(${expression})`));
run(`game.currentZoneId=0;game.settings.mapCompleteAction='stop';
    game.contentProgression.inherited.push('cube');contentProgression.sync(game);
    Object.assign(game.coreCube,{everUnlocked:true,unlocked:false,relockUntilDrop:true,blurred45:7});
    game.unlocks.cube=false;game.noti.cube=false;startEncounterRun(true);`);
const before=copy('({cube:game.coreCube,unlocks:game.unlocks,noti:game.noti,currencies:game.currencies})');
assert.equal(run(`actExplorationLoot.capture(game,game.actExploration,()=>
    addCoreCubeBlurred45(3,amount=>actExplorationLoot.blurred45(game,amount)))`),3);
assert.deepEqual(copy('({cube:game.coreCube,unlocks:game.unlocks,noti:game.noti,currencies:game.currencies})'),before,
    'pending cube material cannot be used or reopen a relocked cube');
assert.equal(run('game.actExploration.loot.blurred45'),3);
for(const payload of ['JSON.parse(serializeSaveState(game))','createCloudSavePayload(game)',
    'JSON.parse(createCloudSaveRequestBody("test",game)).save_data']) {
    assert.equal(run(`mergeDefaults(${payload}).actExploration.loot.blurred45`),3,
        'local and cloud payloads retain exact cube material');
}
run(`window.bad=JSON.parse(serializeSaveState(game));window.bad.actExploration.loot.blurred45=0.5;`);
assert.throws(()=>run('mergeDefaults(window.bad)'),/큐브 재료 저장/);
assert.equal(run('game.actExploration.loot.blurred45'),3);
run(`window.legacy=JSON.parse(serializeSaveState(game));window.legacy.actExploration.loot.version=3;
    delete window.legacy.actExploration.loot.blurred45;`);
assert.equal(run('mergeDefaults(window.legacy).actExploration.loot.blurred45'),0,
    'old already-paid material is never reconstructed');

// Unrelated crafting/preset edits while exploring must survive settlement.
run(`game.coreCube.selectedFace=8;game.coreCube.powers['12']=4;
    game.actExploration.status='cleared';finishEncounterRun();`);
assert.equal(run('game.coreCube.blurred45'),10);
assert.equal(run('game.coreCube.unlocked'),true);
assert.equal(run('game.coreCube.relockUntilDrop'),false);
assert.equal(run('game.unlocks.cube'),true);
assert.equal(run('game.noti.cube'),true);
assert.equal(run('game.coreCube.selectedFace'),8);
assert.equal(run("game.coreCube.powers['12']"),4);
assert.equal(run('game.actExploration.loot.blurred45'),0);
run('finishEncounterRun();');
assert.equal(run('game.coreCube.blurred45'),10,'settlement grants once');

run(`startEncounterRun(true);actExplorationLoot.capture(game,game.actExploration,()=>
    addCoreCubeBlurred45(2,amount=>actExplorationLoot.blurred45(game,amount)));
    actExplorationProgress.defeat(game);`);
assert.equal(run('game.coreCube.blurred45'),10);
assert.equal(run('game.actExploration.loot.blurred45'),0,'death loses pending material');
run(`startEncounterRun(true);actExplorationLoot.capture(game,game.actExploration,()=>
    addCoreCubeBlurred45(2,amount=>actExplorationLoot.blurred45(game,amount)));
    actExplorationProgress.depart(game);`);
assert.equal(run('game.coreCube.blurred45'),10);
assert.equal(run('game.actExploration'),null);

run(`startEncounterRun(true);game.coreCube.blurred45=Number.MAX_SAFE_INTEGER;
    actExplorationLoot.capture(game,game.actExploration,()=>{
        awardEnemyLootCurrency('goldenRule',4);
        addCoreCubeBlurred45(1,amount=>actExplorationLoot.blurred45(game,amount));
    });game.actExploration.status='cleared';`);
const preFailure=copy('({cube:game.coreCube,currencies:game.currencies,run:game.actExploration})');
assert.throws(()=>run('finishEncounterRun()'),/45면체 수령 한도/);
assert.deepEqual(copy('({cube:game.coreCube,currencies:game.currencies,run:game.actExploration})'),preFailure,
    'overflow rejects before any currency or completion commit');
run(`game.coreCube.blurred45=0;finishEncounterRun();`);
assert.equal(run('game.coreCube.blurred45'),1,'failed settlement can be retried');

run(`game.noti.cube=false;addCoreCubeBlurred45(2);`);
assert.equal(run('game.coreCube.blurred45'),3,'ordinary grants are still immediate');
assert.equal(run('game.noti.cube'),false,'ordinary drops do not repeatedly light the cube tab');
run(`game.contentProgression.inherited=game.contentProgression.inherited.filter(key=>key!=='cube');
    contentProgression.sync(game);`);
assert.equal(run('addCoreCubeBlurred45(1)'),0,'locked content still receives nothing');
assert.equal(run('game.coreCube.blurred45'),3);
console.log('act exploration cube material escrow, restore, loss, atomic settlement and ordinary grants: OK');
