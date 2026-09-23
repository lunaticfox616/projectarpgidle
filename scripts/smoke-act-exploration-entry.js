const assert=require('node:assert/strict');
const fixture=require('./lib/replay-fixture');
const {runtime,run}=fixture(93);
const copy=code=>JSON.parse(run(`JSON.stringify(${code})`));
let tick=0;
function fresh(act=1,settings={},season=1) {
    Object.assign(runtime,{testAct:act,testSettings:settings,testSeason:season});tick=0;
    run(`game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',
        level:100,season:testSeason,currentZoneId:testAct-1,maxZoneId:testAct-1,combatTimeMs:1800000000000,
        settings:{pauseGameOnOverlay:false,showDeathNotice:false,autoEquipEmptySlots:false,...testSettings}});
        game.equipment['무기']={id:90001,slot:'무기',name:'진행 검사',rarity:'rare',
            baseStats:[{id:'flatDmg',val:1000000},{id:'flatHp',val:1000000}],stats:[]};
        game.playerHp=getPlayerStats().maxHp;contentProgression.sync();`);
}
function advance(count=1) {
    for(let i=0;i<count;i++)run(`coreLoop(${1800000000000+(++tick)*100})`);
}
function until(condition,message) {
    const limit=tick+3000;
    while(tick<limit&&!run(condition))advance();
    assert.ok(run(condition),message);
}

// Existing saves finish their same wave/enemy records; the next encounter adopts the map.
fresh(1,{mapCompleteAction:'repeatZone'});
run(`startEncounterRun(false);game.enemies=[createEnemy(getZone(0),{elite:false},0)];
    assignEnemyGridSpawn(game.enemies[0],getGridBlockedCells());game.runProgress=12;
    game=mergeDefaults(JSON.parse(serializeSaveState(game)));`);
const legacy=copy('[game.enemies,game.encounterPlan,game.runProgress]');
run('ensureEncounterRun();reconcileMapProgressRuntimeState();');
assert.equal(run('game.actExploration'),null);
assert.deepEqual(copy('[game.enemies,game.encounterPlan,game.runProgress]'),legacy);
until('!!game.actExploration','legacy completion enters the default authored map');
assert.equal(run('game.actExploration.act'),1);

for(const action of ['nextZone','nextLoopBestPlusOne','repeatZone','stop']) {
    fresh(1,{mapCompleteAction:action,actExplorationMode:'full'});
    run('ensureEncounterRun();window.entryRun=game.actExploration');
    assert.equal(run('game.actExploration.mode'),'full');
    until('window.entryRun.completionApplied',action+' settles the whole map');
    assert.equal(run('window.entryRun.loot.phase'),'claimed');
    if(action==='stop') {
        assert.equal(run('game.currentZoneId'),0);assert.equal(run('game.combatHalted'),true);
        const settled=copy('[game.actExploration,game.currencies,game.inventory]');
        advance(20);
        assert.deepEqual(copy('[game.actExploration,game.currencies,game.inventory]'),settled);
    } else {
        assert.equal(run('game.actExploration.departure.remainingMs'),5500,'settlement holds the source map for the burst');
        const rewards=copy('[game.currencies,game.inventory.map(({instanceId,...item})=>item),game.maxZoneId]');
        advance(12);
        const exit=copy('game.actExploration.departure');
        run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));window.entryRun=game.actExploration');
        assert.deepEqual(copy('game.actExploration.departure'),exit,'reconnect retains the selected exit and remaining delay');
        for(const invalid of [{zoneId:-1,remainingMs:1},{zoneId:1,remainingMs:-1},{zoneId:1,remainingMs:5501}]) {
            runtime.invalidExit=invalid;
            assert.throws(()=>run('mergeDefaults({...JSON.parse(serializeSaveState(game)),actExploration:{...game.actExploration,departure:invalidExit}})'),/정산 후 이동/);
        }
        run('finishEncounterRun()');
        assert.deepEqual(copy('[game.currencies,game.inventory.map(({instanceId,...item})=>item),game.maxZoneId]'),rewards,'restored completion cannot pay or unlock twice');
        until('!!game.actExploration && game.actExploration!==window.entryRun','automatic restart creates one new map');
        assert.equal(run('game.actExploration.act'),action==='repeatZone'?1:2);
        assert.equal(run('game.actExploration.mode'),'full','route preference persists across maps');
        assert.equal(run('game.actExploration.loot.phase'),'pending');
    }
}

fresh(1,{mapCompleteAction:'nextZone',townReturnAction:'stop'});
run('ensureEncounterRun()');
until('game.actExploration?.completionApplied','town stop still commits completion');
assert.equal(run('game.currentZoneId'),0,'source map remains visible during settlement');
until('game.combatHalted','town stop waits for presentation, then halts');
assert.equal(run('game.currentZoneId'),1);
assert.equal(run('game.actExploration'),null);

// A queued hunt uses the same source/target and is preplaced once on every authored layout.
for(let act=1;act<=10;act++) {
    fresh(act,{mapCompleteAction:'stop'},2);
    run(`game.bountyHunt.remaining=0;bountyRuntime.openTreasure();
        bountyRuntime.startHunt(game.bountyHunt.pending.offerIds[0]);ensureEncounterRun();
        window.huntEnemy=game.actExploration.packs.flatMap(pack=>pack.waiting).find(enemy=>enemy.isBountyTarget);`);
    assert.ok(run('window.huntEnemy'));
    assert.match(run('runUiGlobalFunction("getBountyHudState").html'),/추적 중/);
    assert.equal(run('game.actExploration.packs.flatMap(pack=>pack.waiting).filter(enemy=>enemy.isBountyTarget).length'),1);
    assert.equal(run('window.huntEnemy.bountyId'),run('game.bountyHunt.pending.targetId'));
    const held=copy('game.actExploration');
    run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));ensureEncounterRun();');
    assert.deepEqual(copy('game.actExploration'),held,'reconnect never rerolls the hunt roster');
}
fresh(1,{mapCompleteAction:'stop'},2);
run(`game.bountyHunt.remaining=0;bountyRuntime.openTreasure();
    window.selectedHunt=game.bountyHunt.pending.offerIds.find(id=>Object.keys(BOUNTY_TARGET_DB[id].reward.currencies).length);
    bountyRuntime.startHunt(window.selectedHunt);ensureEncounterRun();`);
until('game.bountyHunt.pending.status==="reward"','real attacks defeat the preplaced hunt');
assert.ok(run('game.actExploration.loot.equipment.length')>=1,'target equipment stays in the dungeon');
assert.equal(run('game.inventory.length'),0,'enemy target rewards cannot be equipped before the boss');
for(const key of copy('Object.keys(BOUNTY_TARGET_DB[window.selectedHunt].reward.currencies)')) {
    assert.equal(run(`game.currencies[${JSON.stringify(key)}]`),0);
    assert.ok(run(`game.actExploration.loot.currencies[${JSON.stringify(key)}]`)>0,'target currency is held with equipment');
}
until('game.actExploration.completionApplied','the bounty does not strand the elite gate');
assert.ok(run('game.inventory.length')>=1);

// Death and manual return abandon the old packet; retry starts fresh through normal travel.
for(const action of ['returnToTown()','handlePlayerDefeat(getZone(0),getPlayerStats())']) {
    fresh(1,{mapCompleteAction:'repeatZone',townReturnAction:'retry'});
    run(`ensureEncounterRun();window.entryRun=game.actExploration;
        actExplorationLoot.capture(game,game.actExploration,()=>awardEnemyLootCurrency('goldenRule',2));${action};`);
    assert.equal(run('window.entryRun.loot.phase'),'lost');
    until('!!game.actExploration','retry creates a new exploration');
    assert.equal(run('game.currencies.goldenRule'),0);
    assert.notEqual(run('game.actExploration'),run('window.entryRun'));
}

fresh(1,{mapCompleteAction:'repeatZone',townReturnAction:'stop'});
run('ensureEncounterRun();returnToTown();');advance(30);
assert.equal(run('game.combatHalted'),true);assert.equal(run('game.actExploration'),null);
fresh(1,{mapCompleteAction:'repeatZone'});
run('ensureEncounterRun();game.combatHalted=true;normalizeLocalRuntimeAfterLoad();');
assert.equal(run('game.combatHalted'),true,'loading a paused empty entry room does not silently start travel');
run('game.currentZoneId="trial_1";actExplorationProgress.depart(game);startEncounterRun();');
assert.equal(run('game.actExploration'),null);assert.equal(run('getCombatGridSize().columns'),9);
assert.ok(run('game.encounterPlan.length')>0,'special arenas keep their own progression');

// Background execution owns the same map and escrow and leaves the live snapshot untouched.
fresh(1,{mapCompleteAction:'stop'});run('ensureEncounterRun();');
const live=copy('game');
run('window.replayed=simulateBackgroundCombat({elapsedMs:300000,snapshot:game});');
assert.deepEqual(copy('game'),live);
assert.equal(run('window.replayed.game.actExploration.completionApplied'),true);
assert.equal(run('window.replayed.game.actExploration.loot.phase'),'claimed');
assert.equal(run('window.replayed.game.combatHalted'),true);
assert.ok(run('window.replayed.metrics.kills')>0);
fresh(1,{mapCompleteAction:'stop'});
run(`ensureEncounterRun();game.offlineProgress.huntDirectiveUnlocked=true;game.offlineProgress.huntMode='stopBeforeBoss';
    window.replayed=simulateBackgroundCombat({elapsedMs:300000,snapshot:game});`);
assert.equal(run('window.replayed.stopReason'),'before-boss');
assert.equal(run('window.replayed.game.actExploration.completionApplied'),false);
assert.equal(run('window.replayed.game.actExploration.loot.phase'),'pending');
assert.equal(run('window.replayed.game.actExploration.packs.filter(pack=>pack.stage!==null).every(pack=>pack.waiting.every(enemy=>enemy.hp===enemy.maxHp))'),true,
    'stop-before-boss prevents even the first attack and preserves the same preplaced boss');
fresh(1,{mapCompleteAction:'stop'});
run(`ensureEncounterRun();game.actExploration.mode='manual';
    window.replayed=simulateBackgroundCombat({elapsedMs:1000,snapshot:game});`);
assert.deepEqual(copy('window.replayed.game.gridPlayer'),copy('game.gridPlayer'),'manual exploration is not silently changed to automatic offline');
assert.equal(run('mergeDefaults({settings:{actExplorationMode:"unknown"}}).settings.actExplorationMode'),'direct');
console.log('Default act entry, legacy saves, repeat/next/stop, bounty, death/return, arenas and offline settlement: OK');
