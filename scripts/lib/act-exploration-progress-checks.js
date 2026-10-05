// Real coreLoop travel checks for the act explorations, shared by smoke-act-exploration-progress.js (direct travel, manual destination)
// and smoke-act-exploration-progress-full.js (full exploration). Split 2026-10-04 so each script stays well inside the runner's
// 60 s per-script limit on CI (the single script took ~45 s locally and timed out on the slower runner); the checks are unchanged.
const assert=require('node:assert/strict');
const fixture=require('./replay-fixture');

module.exports=function actExplorationProgressChecks(seed=29) {
    const {runtime,run}=fixture(seed);
    // The run's facing is random (js/combat.js rollExplorationFacing); these checks walk the drawn map's fixed coordinates.
    run('rollExplorationFacing=()=>undefined;');
    const copy=code=>JSON.parse(run(`JSON.stringify(${code})`));
    let tick=0;
    function advance(count=1) {
        for(let n=0;n<count;n++)run(`coreLoop(${1800000000000+(++tick)*100})`);
    }
    function start(act,mode='direct') {
        runtime.act=act;runtime.mode=mode;tick=0;
        run(`
            game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',
                level:100,combatTimeMs:1800000000000,settings:{pauseGameOnOverlay:false,mapCompleteAction:'stop'}});
            game.currentZoneId=act-1;game.maxZoneId=act-1;
            // Synthetic overpowered equipment isolates routing/progression from balance and deaths.
            // Attacks, movement, damage, enemy deaths and story completion use the actual game loop.
            game.equipment['무기']={id:90001,slot:'무기',name:'진행 검사',rarity:'rare',
                baseStats:[{id:'flatDmg',val:1000000},{id:'flatHp',val:1000000}],stats:[]};
            startEncounterRun();game.actExploration.mode=mode;game.playerHp=getPlayerStats().maxHp;
        `);
    }
    /** Ten acts walked to their bosses in one travel mode ('direct' or 'full'), with reconnects and once-only completion. */
    function checkTravel(mode) {
        for(let act=1;act<=10;act++) {
            start(act,mode);
            const roster=copy('game.actExploration.packs.map(pack=>pack.aliveIds)');
            advance(80);
            const checkpoint=copy('game.actExploration');
            const player=copy('game.gridPlayer');
            run('game=JSON.parse(serializeSaveState(game));recoverRuntimeState();runUiGlobalFunction("ensureEncounterRun");reconcileMapProgressRuntimeState();');
            assert.deepEqual(copy('game.actExploration'),checkpoint,'reconnect does not replace the authored run with a progress-based wave');
            assert.deepEqual(copy('game.gridPlayer'),player,'reconnect preserves exploration position');
            while(tick<3000 && run('game.actExploration && !game.actExploration.completionApplied'))advance();
            assert.equal(run('game.actExploration?.status'),'cleared',`Act ${act} ${mode} reaches its boss through real combat`);
            assert.equal(run('game.actExploration.completionApplied'),true);
            assert.equal(run('game.combatHalted'),true,'stop-on-clear is honored');
            assert.equal(run('game.runProgress'),100,'stopping on a completed exploration displays full progress');
            assert.equal(run('actExplorationState.remainingElites(game.actExploration)'),0);
            const remaining=run('game.actExploration.packs.reduce((sum,pack)=>sum+pack.aliveIds.length,0)');
            if(mode==='full')assert.equal(remaining,0,'full exploration defeats all preplaced monsters');
            else assert.ok(remaining>0,'direct route leaves optional enemies alive');
            assert.equal(run('game.actExploration.packs.filter(pack=>pack.stage!==null).length'),act===4?2:1);
            assert.deepEqual(copy('game.actExploration.packs.map(pack=>pack.aliveIds)').map((ids,i)=>ids.filter(id=>!roster[i].includes(id))),
                roster.map(()=>[]),'no replacement enemies are rolled during traversal');
            const settled=copy('game');
            advance(20);run('finishEncounterRun();');
            assert.deepEqual(copy('game'),settled,'completed exploration cannot apply rewards or story progression a second time');
            run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));');
            assert.equal(run('game.actExploration.completionApplied'),true,'completed maps remain settled after reconnect');
            assert.equal(run('game.runProgress'),100,'completion progress survives reconnect');
        }
    }
    /** Manual mode waits for a destination, stops there, and resumes when switched to full exploration. */
    function checkManual() {
        start(1,'manual');
        const entry=copy('game.gridPlayer');
        advance(20);
        assert.deepEqual(copy('game.gridPlayer'),entry,'manual mode waits for an actual destination');
        run(`{
            const map=actExplorationMap.layout(1),next=actExplorationMap.neighbors(map,game.gridPlayer)[0];
            if(!actExplorationState.selectDestination(game.actExploration,next))throw Error('Visible manual destination rejected');
        }`);
        const target=copy('game.actExploration.destination');
        advance(20);
        assert.equal(run('game.gridPlayer.gx'),target.gx);assert.equal(run('game.gridPlayer.gy'),target.gy);
        assert.equal(run('game.actExploration.destination'),null,'manual travel stops at the selected cell');
        run('game.actExploration.mode="full";');advance(30);
        assert.notDeepEqual(copy('game.gridPlayer'),entry,'switching to full exploration resumes travel');
    }
    return {checkTravel,checkManual};
};
