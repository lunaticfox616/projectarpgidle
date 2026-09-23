const assert=require('node:assert/strict');
const vm=require('node:vm');
const {buildGameRuntime}=require('./lib/game-runtime');
const runtime=buildGameRuntime();
const run=code=>vm.runInContext(code,runtime);
const copy=code=>JSON.parse(run(`JSON.stringify(${code})`));
run('game=mergeDefaults({});game.season=30;game.loopCount=29;game.maxZoneId=9;');
for(let act=1;act<=10;act++) {
    runtime.act=act;
    run('game.currentZoneId=act-1;startEncounterRun(true);');
    const state=copy('game.actExploration'),map=run('actExplorationMap.layout(act)');
    assert.equal(state.act,act);
    assert.equal(run('game.enemies.length'),0,'unseen enemies are preplaced, not running combat');
    assert.equal(run('actExplorationState.remainingElites(game.actExploration)'),2);
    assert.equal(run('canPlaceGridFootprint(new Set(),0,0,{columns:1,rows:1})'),false,'walls cannot be entered');
    runtime.gate=map.gate;
    assert.equal(run('canPlaceGridFootprint(new Set(),gate.gx,gate.gy,{columns:1,rows:1})'),false,'locked gate blocks real movement');
    assert.equal(run('actExplorationState.selectDestination(game.actExploration,{gx:0,gy:0})'),false);
    run(`{
        const boss=actExplorationMap.layout(act).rooms.find(room=>room.role==='boss');
        game.actExploration.discovered.push(actExplorationMap.index(actExplorationMap.layout(act),boss));
        if(actExplorationState.selectDestination(game.actExploration,boss))throw Error('Sealed boss destination accepted');
        const pending=game.actExploration.packs[0].waiting[0];
        if(!getGridBlockedCells(game.gridPlayer).has(gridCellKey(pending.gx,pending.gy)))throw Error('Waiting enemy cell is unoccupied');
    }`);
    const initial=copy('game.actExploration');
    run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));');
    assert.deepEqual(copy('game.actExploration'),initial,'all preplaced enemies and exploration progress survive restore');
    run(`{
        const active=game.actExploration;
        const target=active.packs.find(pack=>pack.eliteIds.length>0).waiting[0];
        game.gridPlayer={gx:target.gx,gy:target.gy+1,gridMoveTimer:0.23};
        const visible=actExplorationState.discover(active,game.gridPlayer);
        actExplorationState.engage(game,visible);
        const enemy=game.enemies.find(row=>row.isElite);
        enemy.hp=Math.max(1,Math.floor(enemy.maxHp*0.37));
        enemy.attackTimer=0.37;enemy.gridMoveTimer=0.24;
    }`);
    const active=copy('game.enemies'),waiting=copy('game.actExploration'),player=copy('game.gridPlayer');
    assert.ok(active.length>0);
    run('actExplorationState.engage(game,actExplorationState.discover(game.actExploration,game.gridPlayer));');
    assert.deepEqual(copy('game.enemies'),active,'repeat visibility does not duplicate or reset enemies');
    run('game.realmDeathWard={amount:70,readyAt:1234};game.pendingSlamEchoHits=[{enemyId:game.enemies[0].id,damage:15,at:900}];');
    for(const saveExpression of ['JSON.parse(serializeSaveState(game))','createCloudSavePayload(game)',
        'JSON.parse(createCloudSaveRequestBody("test",game)).save_data']) {
        run(`game=mergeDefaults(${saveExpression});`);
        assert.deepEqual(copy('game.actExploration'),waiting,'waiting roster preserved in local and both cloud paths');
        assert.deepEqual(copy('game.gridPlayer'),player,'position and partial movement preserved');
        assert.equal(run('game.realmDeathWard.amount'),70,'exploration ward does not recharge on reconnect');
        assert.equal(run('game.pendingSlamEchoHits.length'),1,'pending hit is not lost by cloud projection');
        for(const enemy of active) {
            const restored=copy(`game.enemies.find(row=>row.id===${enemy.id})`);
            for(const key of ['gx','gy','hp','maxHp','attackTimer','gridMoveTimer','variantSeed'])assert.equal(restored[key],enemy[key],key);
        }
    }
    // Consume both elites through the real kill/reward pipeline, then confirm the gate opens.
    run(`{
        const active=game.actExploration;
        for(const pack of active.packs.filter(row=>row.eliteIds.length)) {
            const room=actExplorationMap.layout(act).rooms.find(row=>row.id===pack.roomId);
            game.gridPlayer={gx:room.gx,gy:room.gy+1,gridMoveTimer:0};
            actExplorationState.engage(game,actExplorationState.discover(active,game.gridPlayer));
        }
        for(const enemy of [...game.enemies].filter(row=>row.isElite)) {
            enemy.hp=0;handleEnemyDeath(enemy,getPlayerStats());
            if(actExplorationState.recordDeath(game,enemy))throw Error('Duplicate kill accepted');
        }
    }`);
    assert.equal(run('actExplorationState.remainingElites(game.actExploration)'),0);
    assert.equal(run('canPlaceGridFootprint(new Set(),gate.gx,gate.gy,{columns:1,rows:1})'),true);
    assert.equal(run('game.actExploration.status'),'active','elites alone cannot complete the dungeon');
    run('game.actExploration.mode="full";');
    assert.notEqual(run('actExplorationState.destination(game.actExploration,game.gridPlayer).role'),'boss','full exploration visits remaining ordinary and optional rooms');
    run(`{
        const boss=actExplorationMap.layout(act).rooms.find(room=>room.role==='boss');
        game.gridPlayer={gx:boss.gx-1,gy:boss.gy,gridMoveTimer:0};
        actExplorationState.engage(game,actExplorationState.discover(game.actExploration,game.gridPlayer));
    }`);
    assert.equal(run('game.enemies.filter(enemy=>enemy.isBoss).length'),1,'only one boss stage fights at a time, without adds');
    run('{const first=game.enemies.find(enemy=>enemy.isBoss);first.hp=0;handleEnemyDeath(first,getPlayerStats());}');
    if(act===4) {
        assert.equal(run('game.actExploration.status'),'active','Act 4 first boss is not the final clear');
        run('actExplorationState.engage(game,actExplorationState.discover(game.actExploration,game.gridPlayer));');
        assert.equal(run('game.enemies.filter(enemy=>enemy.isBoss).length'),1);
        run('{const second=game.enemies.find(enemy=>enemy.isBoss);second.hp=0;handleEnemyDeath(second,getPlayerStats());}');
    }
    assert.equal(run('game.actExploration.status'),'cleared');
    if(act===1) {
        assert.ok(run('game.enemies.some(enemy=>!enemy.isBoss&&enemy.hp>0)'), 'fixture retains an engaged ordinary enemy');
        run(`{
            const chained=game.enemies.find(enemy=>!enemy.isBoss&&enemy.hp>0);
            window.chainedDeathId=chained.id;chained.hp=0;handleEnemyDeath(chained,getPlayerStats());
        }`);
        assert.equal(run('game.actExploration.packs.some(pack=>pack.aliveIds.includes(window.chainedDeathId))'),false,
            'a chain kill after the last boss must retire its roster id before saving');
    }
    run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));');
    assert.equal(run('game.actExploration.status'),'cleared','completed bosses do not reappear at reconnect');
}
// Invalid input fails at the save boundary without rerolling or mutating the incoming roster.
run('game.currentZoneId=0;startEncounterRun(true);');
const entryVisibility=copy('actExplorationState.discover(game.actExploration,game.gridPlayer)');
run('game.actExploration.discovered=[];game.actExploration.visitedRooms=[];');
assert.deepEqual(copy('actExplorationState.discover(game.actExploration,game.gridPlayer)'),entryVisibility,
    'replaced discovery state at the same cell must regain its actual visible area');
assert.deepEqual(copy('game.actExploration.discovered'),entryVisibility);
assert.deepEqual(copy('game.actExploration.visitedRooms'),['entry'],'room discovery is reapplied to replaced visit state');
const stationary=copy('game.actExploration');
run('for(let n=0;n<100;n++)actExplorationState.discover(game.actExploration,game.gridPlayer);');
assert.deepEqual(copy('game.actExploration'),stationary,'stationary perception does not change saved progress or enemies');
const mutations=[
    'bad.actExploration.layoutId="unknown"',
    'bad.actExploration.packs[0].waiting[0].gx=999',
    'bad.actExploration.packs[0].waiting[0].hp=-1',
    'bad.actExploration.packs[0].waiting=[]',
    'bad.actExploration.packs[0].aliveIds.push(bad.actExploration.packs[0].aliveIds[0])',
    'bad.actExploration.packs.pop()',
    'bad.actExploration.status="cleared"',
    'bad.currentZoneId=1',
    'bad.actExploration.departure={zoneId:1,remainingMs:100}',
    'bad.actExploration.departure=false'
];
for(const mutation of mutations) {
    run(`bad=JSON.parse(serializeSaveState(game));${mutation};`);
    const original=copy('bad.actExploration');
    assert.throws(()=>run('mergeDefaults(bad)'),/탐험|보스/);
    assert.deepEqual(copy('bad.actExploration'),original,'failed save restore leaves source roster intact');
}
assert.equal(run('mergeDefaults({}).actExploration'),null,'old saves do not invent a new run');
run('game.actExploration=null;game.currentZoneId="trial_1";');
assert.equal(run('getCombatGridSize().columns'),9,'special arenas keep their original bounds');
const beforeRejectedStart=copy('game');
assert.throws(()=>run('startEncounterRun(true)'),/일반 액트/);
assert.deepEqual(copy('game'),beforeRejectedStart,'invalid exploration start does not reset existing battle state');
console.log('10-act preplacement, fog engagement, real kills, elite gate, two-stage boss and local/cloud restore: OK');
