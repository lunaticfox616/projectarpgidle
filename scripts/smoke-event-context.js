const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
runtime.switchTab = () => {}; // DOM navigation only; content entry and combat rules remain real.
// Toasts are a browser boundary; use DOM nodes without replacing game behavior.
const createElement = runtime.document.createElement;
runtime.document.getElementById = id => id==='game-toast-region' ? createElement() : null;
runtime.document.createElement = (...args) => {
    const element = createElement(...args);
    element.querySelector = () => createElement();
    return element;
};
const run = code => vm.runInContext(code, runtime);
runtime.document.body.insertAdjacentHTML = () => {}; // Overlay rendering is verified in browser tests.
function reset(season = 10) {
    run(`game=mergeDefaults({});window.game=game;game.season=${season};game.loopCount=${season - 1};
        game.settings.autoEquipEmptySlots=false;contentProgression.sync();Math.random=()=>0.99`);
}
const checks = [];
function check(name, action) {
    try { action(); console.log('PASS', name); } catch (error) { checks.push(name); console.error('FAIL', name, error.stack); }
}
check('earned treasure keeps its source tier after moving and reloading', () => {
    reset(2);
    run(`game.currentZoneId=8;game.maxZoneId=8;game.bountyHunt.remaining=1;
        bountyRuntime.advanceAfterBossKill(getZone(8),{isBoss:true});
        game.currentZoneId=0;game=mergeDefaults(JSON.parse(JSON.stringify(game)))`);
    assert.equal(run('bountyRuntime.openTreasure().item.itemTier'), 9);
});
check('cosmos treasure uses cosmos affix cap', () => {
    reset(50);
    run(`game.cosmosAtlas.activeChallenge={galaxy:5,lootTier:25,tier:86};
        game.currentZoneId='cosmos_challenge';game.bountyHunt.remaining=1;
        bountyRuntime.advanceAfterBossKill(getZone(game.currentZoneId),{isBoss:true});game.currentZoneId=0`);
    const item = run('bountyRuntime.openTreasure().item');
    assert.equal(item.itemTier, 20); assert.equal(item.affixTierCap, 20); assert.equal(item.dropRealm, 'cosmos');
});
check('ready treasure is settled before a loop can discard equipment', () => {
    reset(2);
    run(`game.currentZoneId=8;game.bountyHunt.remaining=1;
        bountyRuntime.advanceAfterBossKill(getZone(8),{isBoss:true});bountyRuntime.openTreasure()`);
    run(`bountyRuntime.startHunt(game.bountyHunt.pending.offerIds[0]);startEncounterRun(false);
        var target=createEnemy(getZone(game.currentZoneId),game.encounterPlan.find(entry=>entry.bountyId),0);
        game.enemies=[target];target.hp=0;handleEnemyDeath(target,getPlayerStats());game.pendingLoopReady=true;
        confirmLoopReady()`);
    assert.equal(run('game.season'), 2); assert(run('game.pendingLoopReady'));
    assert(run('bountyRuntime.claimTreasure().ok'));
    run('confirmLoopReady()');
    assert.equal(run('game.season'), 3);
    assert.equal(run('game.inventory.some(item=>item.itemTier===9 && !item.sealed)'), false);
});
check('defeat ends accepted treasure hunts and permits the earned loop', () => {
    reset(2);
    run(`game.currentZoneId=8;game.settings.showDeathNotice=false;game.bountyHunt.remaining=0;
        bountyRuntime.openTreasure();bountyRuntime.startHunt(game.bountyHunt.pending.offerIds[0]);startEncounterRun(false);
        handlePlayerDefeat(getZone(8),getPlayerStats(),null,{noToast:true})`);
    assert.equal(run('game.bountyHunt.pending'),null);
    assert.equal(run('game.bountyHunt.remaining'),10);
    assert.equal(run('game.bountyHunt.completed'),0);
    assert(!run('game.encounterPlan.some(entry=>entry.bountyId)'));
    assert(!run('bountyRuntime.claimTreasure().ok'));
    run('game.pendingLoopReady=true;confirmLoopReady()');
    assert.equal(run('game.season'),3);
});
check('colony entrance uses this loop, not a previous loop depth', () => {
    reset();
    run('game.abyssEndlessDepth=200;game.loopProgressCurrent.bestAbyssDepth=21;game.currencies.colonyTrace=1;startColonyRun()');
    assert.equal(run('game.colony.entryDeepChaosDepth'), 21);
    run('game.abyssEndlessDepth=300;game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
    assert.equal(run('game.colony.entryDeepChaosDepth'),21,'entry remains stable during the run');
    run(`game.colony.wave=5;spawnColonyWave()`);
    const boss=run('game.enemies.find(enemy=>enemy.isBoss)');
    const base=run('createEnemy(getZone("colony_run"),{boss:true},19)');
    assert.equal(boss.maxHp,Math.floor(base.maxHp*3.4),'boss keeps normal boss tuning without a second health wall');
});
check('colony resumes a stopped hunt, settles a wave once, and retains its rewards on retreat', () => {
    reset(50);
    run(`game.combatHalted=true;game.settings.mapCompleteAction='stop';game.currentZoneId=8;
        game.abyssEndlessDepth=40;game.loopProgressCurrent.bestAbyssDepth=30;
        game.colony.wave=12;game.colony.entryDeepChaosDepth=21;game.currencies.colonyTrace=1;`);
    assert.equal(run('getZone("colony_run").entryDeepChaosDepth'),30,'preview uses the next paid entry');
    assert.equal(run('getZone("colony_run").tier'),30,'an idle preview starts at wave one');
    run('startColonyRun()');
    assert.equal(run('game.combatHalted'),false,'explicit entry resumes combat even with stop settings');
    assert.equal(run('game.currencies.colonyTrace'),0);
    run(`var firstWave=game.enemies.slice();firstWave.forEach(enemy=>{enemy.hp=0;handleEnemyDeath(enemy,getPlayerStats());});`);
    assert.equal(run('game.colony.wave'),2);
    assert.equal(run('game.currencies.colonyShard'),1);
    run('forfeitColonyRun();forfeitColonyRun()');
    assert.equal(run('game.currentZoneId'),8);
    assert.equal(run('game.currencies.colonyShard'),1,'retreat cannot lose or duplicate the paid reward');
    assert.equal(run('game.colony.wave-1'),1,'the active wave was not cleared');
});
check('colony melee reaches a distant enemy and completes the wave through combat ticks', () => {
    reset(50);
    run(`game.currentZoneId=8;game.currencies.colonyTrace=1;game.level=100;
        game.pendingLoopHeroSelection=false;game.pendingLoopDecision=false;game.pendingLoopReady=false;
        startColonyRun();ensureCombatGridRuntime();game.moveTimer=0;game.playerHp=getPlayerStats().maxHp;
        game.gridPlayer.gx=1;game.gridPlayer.gy=6;
        var distant=game.enemies[0];distant.gx=7;distant.gy=1;distant.hp=distant.maxHp=1;
        distant.energyShield=0;distant.noAttack=true;distant.colonyDist=140;
        game.enemies=[distant];game.colony.kills=game.colony.requiredKills-1;pTimer=0;
        for(let i=1;i<=300&&game.colony.wave===1;i++)coreLoop(1000+i*100);`);
    assert.equal(run('game.colony.wave'),2,'a melee player must approach and kill the final distant enemy');
    assert.equal(run('game.currencies.colonyShard'),1,'actual combat pays the completed wave once');
    assert.equal(run('game.currentZoneId'),'colony_run','wave completion stays in the defense expedition');
    assert(run('game.enemies.length>0'),'the next wave spawns normally');
});
check('beehive entrance does not inherit past-loop depth or contaminate defaults', () => {
    reset();
    run('game.abyssEndlessDepth=200;game.loopProgressCurrent.bestAbyssDepth=25;game.currencies.hiveKey=1;startBeehiveRun()');
    assert.equal(run('game.beehive.entryDeepChaosDepth'),25);
    assert.equal(run('defaultGame.beehive.inRun'),false);
    run('triggerSeasonReset()');
    assert.equal(run('game.beehive.inRun'),false);
});
check('meteor tier is frozen independently of the next gauge', () => {
    reset();
    run(`game.starWedge.skyRiftMinTier=35;game.starWedge.skyRiftAllCosmos=true;
        prepareMeteorEncounterEntry(8);game.currentZoneId=METEOR_FALL_ZONE_ID;
        game.starWedge.skyRiftAllCosmos=false;game.starWedge.skyRiftMinTier=8`);
    assert.equal(run('getZone(METEOR_FALL_ZONE_ID).tier'), 35);
    run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
    assert.equal(run('getZone(METEOR_FALL_ZONE_ID).tier'), 35);
    run('prepareMeteorEncounterEntry(8)');
    assert.equal(run('getZone(METEOR_FALL_ZONE_ID).tier'),8,'a new expedition uses the new gauge');
});
check('grand breach survives reload and rewards kills without raising boss difficulty', () => {
    reset();
    run(`game.voidRift.grandBreachUnlock=true;enterGrandBreach();
        game=mergeDefaults(JSON.parse(JSON.stringify(game)))`);
    assert.equal(run('game.currentZoneId'), 'grand_breach_run');
    const tier = run('getZone(game.currentZoneId).tier');
    run('game.voidRift.grandRun.kills=150');
    assert.equal(run('getZone(game.currentZoneId).tier'), tier);
    assert(run('getGrandBreachRewardSummary(150).voidChisel>getGrandBreachRewardSummary(0).voidChisel'));
    const bosses=[0,150].map(kills => {
        run(`game.combatTimeMs=1000;game.voidRift.grandRun={inRun:true,phase:'survival',kills:${kills},timeLeft:0,lastTickAt:1000};
            tickGrandBreachRun(getZone('grand_breach_run'))`);
        return run('({hp:game.enemies[0].maxHp,attack:game.enemies[0].atkMul})');
    });
    assert.deepEqual(bosses[0],bosses[1],'kill count cannot raise boss HP or attack');
    assert.equal(run('defaultGame.voidRift.grandRun'),undefined);
});
check('loop reset ends active side encounters', () => {
    reset();
    run(`game.voidRift.grandBreachUnlock=true;enterGrandBreach();triggerSeasonReset()`);
    assert.equal(run('!!game.voidRift.grandRun?.inRun'), false);
});
check('hive waves keep a small elite escort and queen pressure matches the map estimate', () => {
    for (const season of [10, 50]) {
        reset(season);
        run(`game.currencies.hiveKey=1;startBeehiveRun()`);
        for (const step of [1, 6, 10]) {
            run(`Object.assign(game.beehive,{branchStep:${step},awaitingClear:true,pendingChoice:null,enemyEmpower:10});spawnBeehiveWave(false)`);
            assert.ok(run('game.enemies.length') <= 8);
            assert.equal(run('game.enemies.filter(e=>e.isElite).length'), step >= 6 ? 3 : 2);
            run('spawnBeehiveWave(true)');
            assert.equal(run('game.enemies.length'), 1);
            assert.equal(run('game.enemies[0].patternMode'), 'burst');
            const ratio = run('game.enemies[0].maxHp / (game.enemies[0].trait?.hpMul || 1) / (estimateMapZonePowerRequirements(getZone("beehive_run")).dps * 30)');
            assert.ok(Math.abs(ratio - 1) < 0.01, `queen HP and displayed DPS must use the same scaling: ${ratio}`);
            assert.ok(run('game.enemies[0].atkMul') < 2, 'ten stacks cannot multiply queen attack frequency several times');
            assert.equal(run('game.currencies.hiveKey'), 0, 'waves do not consume additional keys');
        }
    }
});
check('grand breach keeps its actual paid result across reload without paying again', () => {
    reset();
    run(`game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        game.voidRift.grandBreachUnlock=true;enterGrandBreach();
        Object.assign(game.voidRift.grandRun,{kills:121,timeLeft:0});
        tickGrandBreachRun(getZone(game.currentZoneId));`);
    assert.strictEqual(run('game.voidRift.grandRun.rewardVoidChisel'),null);
    const before=run('game.currencies.voidChisel||0');
    run('game.enemies[0].hp=0;handleEnemyDeath(game.enemies[0],getPlayerStats())');
    const paid=run('game.currencies.voidChisel')-before;
    assert.equal(paid,14);
    assert.equal(run('game.voidRift.grandRun.rewardVoidChisel'),paid);
    run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
    const saved=run('JSON.stringify(game)');
    const html=run('sideEncounterUi.grandPanel(game.voidRift,"")');
    assert.ok(html.includes('군주 격파')&&html.includes('121처치')&&html.includes('공허의 끌 +14'));
    assert.equal(run('JSON.stringify(game)'),saved,'viewing the receipt cannot award or change anything');
    run('game.voidRift.grandBreachUnlock=true;enterGrandBreach()');
    assert.equal(run('game.voidRift.grandRun.rewardVoidChisel'),null,'a new expedition clears the last result');
    assert.ok(!run('sideEncounterUi.grandPanel(game.voidRift,"")').includes('최근 원정'));
});
check('grand breach legacy and failed results never invent a paid reward', () => {
    for(const reward of ['undefined','null','-2','Infinity','"14"']) {
        reset();
        run(`game.voidRift.grandRun={inRun:false,phase:'done',kills:121,rewardVoidChisel:${reward}};
            game=mergeDefaults(game)`);
        assert.equal(run('game.voidRift.grandRun.rewardVoidChisel'),null);
        const html=run('sideEncounterUi.grandPanel(game.voidRift,"")');
        assert.ok(html.includes('정산 완료')&&!html.includes('공허의 끌 +14'));
    }
    reset();
    run(`game.voidRift.grandBreachUnlock=true;enterGrandBreach();game.voidRift.grandRun.kills=5;
        game.settings.showDeathNotice=false;handlePlayerDefeat(getZone(game.currentZoneId),getPlayerStats(),null,{noToast:true});
        game=mergeDefaults(JSON.parse(JSON.stringify(game)))`);
    const html=run('sideEncounterUi.grandPanel(game.voidRift,"")');
    assert.ok(html.includes('군주 격파 실패')&&html.includes('5처치')&&html.includes('군주 보상 없음'));
    assert.equal(run('game.currencies.voidChisel||0'),0);
});
check('grand breach with locked jewels does not advertise or record unawarded currency', () => {
    reset();
    run(`game.voidRift.grandBreachUnlock=true;enterGrandBreach();
        Object.assign(game.voidRift.grandRun,{kills:121,timeLeft:0});
        tickGrandBreachRun(getZone(game.currentZoneId));`);
    assert.ok(!run('sideEncounterUi.grandPanel(game.voidRift,"")').includes('공허의 끌'));
    run('game.enemies[0].hp=0;handleEnemyDeath(game.enemies[0],getPlayerStats())');
    assert.strictEqual(run('game.voidRift.grandRun.rewardVoidChisel'),0);
    assert.strictEqual(run('game.currencies.voidChisel'),0);
    assert.ok(run('sideEncounterUi.grandPanel(game.voidRift,"")').includes('지급된 제작 재화 없음'));
});
check('boundary completes five encounters once and paid retry survives defeat and reload', () => {
    reset(50);
    run(`window.game=game;game.level=100;game.settings.showDeathNotice=false;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);
        game.beyondBoundary.unlocked=true;game.beyondBoundary.selectedIntensityId='etched';
        game.currencies.formlessDew=9;game.actRewardBonuses=[{stat:'strength',value:52}];
        game.equipment['무기']=createItemFromBase(BASE_ITEM_DB.find(b=>b.id==='bloodletter_blade'),'normal',10);
        enterBeyondBoundaryRun();enterBeyondBoundaryRun();`);
    assert.equal(run('game.currencies.formlessDew'), 6);
    const itemId = run("game.equipment['무기'].id");
    for (let wave = 1; wave <= 5; wave++) {
        run('game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;');
        assert.equal(run('game.beyondBoundary.activeRun.wave'), wave);
        assert.equal(run("getPlayerStats(false).disabledEquipment['무기']"), undefined);
        run('finishEncounterRun()');
    }
    assert.equal(run('game.beyondBoundary.completions'), 1);
    assert.equal(run('game.beyondBoundary.highestTier'), 2);
    assert.equal(run('game.beyondBoundary.activeRun'), null);
    assert.equal(run('game.currentZoneId'), 0);
    assert(run('game.inventory.length>0'));
    // The first save assigns loadout instance IDs; compare the normalized reward thereafter.
    run('game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;');
    const earned = run('JSON.stringify({items:game.inventory,seals:game.beyondBoundary.seals})');
    assert.equal(run('completeBeyondBoundaryEncounter(game).ok'), false);
    run(`enterBeyondBoundaryRun();finishEncounterRun();handlePlayerDefeat(getZone(game.currentZoneId),getPlayerStats(),null,{noToast:true});
        game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;`);
    assert.equal(run('game.beyondBoundary.activeRun'), null);
    assert.equal(run('game.beyondBoundary.completions'), 1);
    assert.equal(run('JSON.stringify({items:game.inventory,seals:game.beyondBoundary.seals})'), earned);
    assert.equal(run("game.equipment['무기'].id"), itemId);
    assert.equal(run('game.currencies.formlessDew'), 3);
    run('enterBeyondBoundaryRun()');
    assert.equal(run('game.currencies.formlessDew'), 0);
    assert.equal(run('game.beyondBoundary.activeRun.wave'), 1);
});
check('completed ocean encounters grant a first catch and preserve it across surface and reload', () => {
    reset(50);
    run(`game.ocean.unlocked=true;enterOceanDive();
        for(let clear=0;clear<5;clear++)finishEncounterRun();`);
    assert.equal(run('game.ocean.fishStock.shallowSilverfin'),1);
    assert.equal(run('game.ocean.fishCaughtTotal.shallowSilverfin'),1);
    run(`forceSurfaceOcean('manual');game=mergeDefaults(JSON.parse(JSON.stringify(game)));
        enterOceanDive();`);
    assert.equal(run('game.ocean.fishStock.shallowSilverfin'),1);
    assert.equal(run('game.ocean.fishCaughtTotal.shallowSilverfin'),1);
    run(`game.ocean.depthM=500;game.ocean.checkpointM=500;game.oceanBossRunPending=true;
        game.ocean.fishingGauge=80;finishEncounterRun();`);
    assert.equal(run('game.ocean.fishingGauge'),80,'guardian rewards do not also claim normal-encounter fish');
});
check('ocean guardian rewards and oxygen retreat keep progress and equipment across reload', () => {
    reset(50);
    run(`window.game=game;game.level=100;game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);
        game.actRewardBonuses=[{stat:'strength',value:52}];
        game.equipment['무기']=createItemFromBase(BASE_ITEM_DB.find(b=>b.id==='bloodletter_blade'),'normal',10);
        enterOceanDive();game.ocean.depthM=500;game.ocean.checkpointM=500;game.oceanBossRunPending=true;
        game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;startEncounterRun();finishEncounterRun();`);
    assert.equal(run('game.ocean.bossClearM'), 500);
    assert.equal(run('game.currencies.reefFragment'), 3);
    run('finishEncounterRun()');
    assert.equal(run('game.currencies.reefFragment'), 3, 'guardian reward is not granted again by another completion');
    run(`game.ocean.depthM=550;game.ocean.oxygenCur=0;game.playerHp=1;applyOceanDrowningDamage(game.ocean,1);
        game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;`);
    assert.equal(run('game.ocean.diving'), false);
    assert.equal(run('game.currentZoneId'), 0);
    assert.equal(run('game.ocean.depthM'), 500);
    assert.equal(run('game.ocean.bossClearM'), 500);
    assert.equal(run("getPlayerStats(false).disabledEquipment['무기']"), undefined);
    run('enterOceanDive()');
    assert.equal(run('game.ocean.depthM'), 500);
    assert.equal(run('game.ocean.oxygenCur'), run('game.ocean.oxygenMax'));
});
check('save restoration accepts defined special regions and rejects non-zone properties', () => {
    reset(50);
    run('game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);');
    const zones = run('[TIME_RIFT_PAST_ZONE_ID,TIME_RIFT_FUTURE_ZONE_ID,WOODSMAN_ECHO_ZONE_ID,...SEASON_BOSS_ZONES.map(zone=>zone.id)]');
    for (const id of zones) {
        run(`game.currentZoneId=${JSON.stringify(id)};game.timeRift.activePressure=7;
            game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;`);
        assert.equal(run('game.currentZoneId'), id, `${id} is a defined region`);
        assert.equal(run('game.timeRift.activePressure'), 7);
    }
    for (const id of ['missing-region','constructor','__proto__','length','trial_unknown','fake_boss_unknown']) {
        run(`game.currentZoneId=${JSON.stringify(id)};game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;`);
        assert.equal(run('game.currentZoneId'), 0, 'invalid zone must return safely without admitting array properties');
    }
});
check('floor completion stop settles progress but does not move or auto-enter another event', () => {
    for (const [id, setup, progress] of [
        ['chaos_realm','ensureChaosRealmState().currentFloor=10','game.chaosRealm.highestFloor'],
        ['labyrinth_endless','game.labyrinthFloor=10','game.labyrinthUnlockedMaxFloor'],
        ['sky_tower','Object.assign(ensureSkyTowerState(),{highestFloor:10,currentFloor:10})','game.skyTower.highestFloor'],
        ['underworld_core','game.underworldProgress.currentFloor=10','game.underworldProgress.highestFloor']
    ]) {
        reset(50);
        run(`window.game=game;${setup};game.currentZoneId=${JSON.stringify(id)};
            game.settings.mapCompleteAction='stop';game.settings.autoEnterMeteor=true;
            Object.assign(ensureStarWedgeState(),{unlocked:true,skyRiftReady:true,skyRiftMinTier:20});
            finishEncounterRun();`);
        assert.equal(run('game.currentZoneId'), id, 'stop overrides automatic meteor entry');
        assert.equal(run('getZone(game.currentZoneId).floor'), 10, 'stop stays on the completed floor');
        assert.equal(run('game.combatHalted'), true, `${id} must obey completion stop`);
        assert.equal(run('game.moveTimer'), 0, 'movement must not restart a halted encounter');
        assert.equal(run(progress), 11, 'next floor unlock is still settled');
        assert.equal(run('game.starWedge.skyRiftReady'), true, 'unconsumed event remains available');
        run('game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;');
        assert.equal(run('game.combatHalted'), true, 'saved stopped state remains stopped');
        assert.equal(run('game.currentZoneId'), id);
    }
});
check('underworld rune milestones unlock on completion, not on entering the next floor', () => {
    reset(50);
    run("game.settings.mapCompleteAction='repeatZone';game.currentZoneId=UNDERWORLD_ZONE_ID;");
    for (const floor of [9,10,59,60,299,300,301]) {
        const priorMilestone = Math.floor((floor-1)/10);
        run(`game.underworldRunes.unlockedSlots=${Math.min(6,priorMilestone)};
            game.underworldRunes.unlockedRunesMaxNumber=${Math.min(30,priorMilestone)};
            game.underworldProgress.currentFloor=${floor};finishEncounterRun();
            game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;`);
        assert.equal(run('game.underworldRunes.unlockedSlots'), Math.min(6,Math.floor(floor/10)));
        assert.equal(run('game.underworldRunes.unlockedRunesMaxNumber'), Math.min(30,Math.floor(floor/10)));
        assert.equal(run('game.underworldProgress.highestFloor'), floor+1);
        const runes = run('JSON.stringify(game.underworldRunes)');
        run('finishEncounterRun()');
        assert.equal(run('JSON.stringify(game.underworldRunes)'), runes, 'repeat clears do not multiply rune slots');
    }
});
check('chaos and sky first-clear rewards remain one-time through saves and loop reset', () => {
    for (const realm of ['chaos','sky']) {
        reset(50);
        const state = realm==='chaos' ? 'game.chaosRealm' : 'game.skyTower';
        const reward = realm==='chaos' ? `${state}.permanentBonuses` : `${state}.condensedPower`;
        run(`game.currentZoneId=${realm==='chaos'?'CHAOS_REALM_ZONE_ID':'SKY_TOWER_ZONE_ID'};
            Object.assign(${state},{highestFloor:25,currentFloor:25});game.settings.mapCompleteAction='repeatZone';
            finishEncounterRun();`);
        const earned = run(`JSON.stringify(${reward})`);
        if (realm==='chaos') assert.equal(run('game.chaosRealm.permanentBonuses.aspd'), 5);
        else assert.equal(run('game.skyTower.condensedPower'), 8);
        run(`game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;finishEncounterRun();`);
        assert.equal(run(`JSON.stringify(${reward})`), earned);
        if (realm==='sky') assert.equal(run('getSkyTowerRemainingClears()'), 23);
        run(`game.loopProgressCurrent.bestAbyssDepth=getSeasonAbyssDepthCap(game.season);triggerSeasonReset();
            game.currentZoneId=${realm==='chaos'?'CHAOS_REALM_ZONE_ID':'SKY_TOWER_ZONE_ID'};
            ${state}.currentFloor=25;game.settings.mapCompleteAction='repeatZone';finishEncounterRun();`);
        assert.equal(run('game.season'), 51, 'the test must actually advance the loop');
        assert.equal(run(`JSON.stringify(${reward})`), earned, 'new loop cannot farm first-clear permanent rewards');
        if (realm==='sky') assert.equal(run('getSkyTowerRemainingClears()'), 24);
    }
});
check('ticketed side runs preserve legal equipment across save, defeat and paid retry', () => {
    for (const [entry, stateKey, currency] of [
        ['startBeehiveRun()', 'beehive', 'hiveKey'], ['startColonyRun()', 'colony', 'colonyTrace']
    ]) {
        reset(50);
        run(`window.game=game;game.level=100;game.settings.showDeathNotice=false;
            game.actRewardBonuses=[{stat:'strength',value:52}];
            game.equipment['무기']=createItemFromBase(BASE_ITEM_DB.find(b=>b.id==='bloodletter_blade'),'normal',10);
            game.currencies[${JSON.stringify(currency)}]=2;${entry};${entry};`);
        assert.equal(run(`game.currencies[${JSON.stringify(currency)}]`), 1, 'duplicate entry consumes only one ticket');
        const itemId = run("game.equipment['무기'].id");
        for (let attempt = 0; attempt < 2; attempt++) {
            run(`game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;`);
            assert.equal(run(`game[${JSON.stringify(stateKey)}].inRun`), true, 'save resumes the paid run');
            assert.equal(run("getPlayerStats(false).disabledEquipment['무기']"), undefined);
            run(`handlePlayerDefeat(getZone(game.currentZoneId),getPlayerStats(),null,{noToast:true});
                game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;`);
            assert.equal(run(`game[${JSON.stringify(stateKey)}].inRun`), false, 'defeated run stays ended after reload');
            assert.equal(run('game.currentZoneId'), 0);
            assert.equal(run("game.equipment['무기'].id"), itemId, 'defeat must preserve owned equipment');
            assert.equal(run("getPlayerStats(false).disabledEquipment['무기']"), undefined);
            assert(run('Number.isFinite(game.playerHp) && game.playerHp>0'));
            run(entry);
            assert.equal(run(`game.currencies[${JSON.stringify(currency)}]`), 0);
            assert.equal(run(`game[${JSON.stringify(stateKey)}].inRun`), attempt === 0, 'retry needs another ticket');
        }
    }
});
check('labyrinth rewards use the cleared floor for repeat and advance alike', () => {
    for (const roll of [0.141, 0.001]) {
        const rewards = [];
        for (const action of ['repeatZone', 'nextZone']) {
            reset(50);
            run(`window.game=game;game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(def=>def.id);
                ensureExpertiseState().levels.mycologist=5;game.currentZoneId=LABYRINTH_ZONE_ID;
                game.labyrinthFloor=29;game.labyrinthUnlockedMaxFloor=29;
                game.settings.mapCompleteAction=${JSON.stringify(action)};Math.random=()=>${roll};
                finishEncounterRun();`);
            assert.equal(run('game.labyrinthFloor'), action === 'repeatZone' ? 29 : 30);
            assert.equal(run('game.labyrinthUnlockedMaxFloor'), 30, 'repeat farming still unlocks the next floor');
            rewards.push(run('JSON.stringify(game.currencies)'));
            assert.equal(run('game.currencies.radiantSealShard || 0'), 0, 'floor 30 reward must not arrive from floor 29');
        }
        assert.equal(rewards[0], rewards[1], 'automatic advance must not improve the reward of the defeated floor');
    }
});
check('queen completion uses hive loot level and cannot grant again after completion', () => {
    const results = [];
    for (const origin of [0, 'cosmos_challenge']) {
        reset(50);
        run(`window.game=game;game.cosmosAtlas.activeChallenge={galaxy:5,lootTier:21,tier:80};
            game.currentZoneId=${JSON.stringify(origin)};game.currencies.hiveKey=1;startBeehiveRun();
            Object.assign(game.beehive,{branchStep:10,awaitingClear:true,queenActive:true});
            game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;Math.random=()=>0.02;`);
        const expectedLevel = run('levelProgression.monsterLevel(getZone("beehive_run"),{isBoss:true})');
        run('onBeehiveWaveCleared()');
        const item = run('game.inventory.find(item=>item.rarity==="unique")');
        assert(item, 'the existing 8% queen bonus grants an actual item');
        assert(item.hiddenTier <= 15, 'queen reward keeps its unique tier within the hive candidate ceiling');
        assert.equal(item.itemLevel, expectedLevel, 'queen reward receives the defeated boss level');
        assert.equal(run('game.currentZoneId'), origin);
        const before = run('JSON.stringify({inventory:game.inventory,currencies:game.currencies})');
        run('completeBeehiveRun();onBeehiveWaveCleared()');
        assert.equal(run('JSON.stringify({inventory:game.inventory,currencies:game.currencies})'), before,
            'a completed or restored completion cannot grant another queen reward');
        results.push({name:item.name,base:item.baseId,requirements:run(`levelProgression.requirements(${JSON.stringify(item)})`)});
    }
    assert.deepEqual(results[0], results[1], 'return location does not choose the base or unique pool');
});
check('unlock-tier challenges exceed ordinary boss stats and recommendations follow actual tuning', () => {
    for (const [id, loop, hpFloor] of [['beehive_run',8,6],['grand_breach_run',9,3.5],['meteor',7,2]]) {
        for (const season of [loop, 50]) {
            reset(season);
            run(`game.currentZoneId=${JSON.stringify(id)}==='meteor'?METEOR_FALL_ZONE_ID:${JSON.stringify(id)};
                Math.random=()=>0.5`);
            const values = run(`(() => {
                const zone=getZone(game.currentZoneId), base={...zone,bossMods:{patternMode:zone.bossMods?.patternMode}};
                const enemy=createEnemy(zone,{boss:true},0), ordinary=createEnemy(base,{boss:true},0);
                const estimate=estimateMapZonePowerRequirements(zone), baseline=estimateMapZonePowerRequirements(base);
                return {hpRatio:enemy.maxHp/ordinary.maxHp,damageRatio:enemy.damageMul/ordinary.damageMul,
                    dpsRatio:estimate.dps/baseline.dps,ehpRatio:estimate.ehp/baseline.ehp,
                    hpEstimateRatio:enemy.maxHp/(enemy.trait?.hpMul||1)/(estimate.dps*estimate.clearTimeSec),
                    penetration:enemy.penetration,recommendedPenetration:estimate.resistancePressure};
            })()`);
            assert.ok(values.hpRatio >= hpFloor && values.dpsRatio >= hpFloor, `${id}: challenge HP and recommendation need a meaningful premium`);
            assert.ok(values.damageRatio >= 1.3 && values.ehpRatio >= 1.3, `${id}: defense matters as well as DPS`);
            assert.ok(Math.abs(values.hpEstimateRatio-1)<0.01, `${id}: recommendation must reflect the real boss`);
            assert.equal(values.penetration,values.recommendedPenetration, `${id}: resistance pressure cannot be hidden`);
        }
    }
});
check('grand breach erupts from three portals up to 16/24/32 enemies without overlap or catch-up floods', () => {
    reset();
    run(`game.combatTimeMs=1000;game.voidRift.grandBreachUnlock=true;enterGrandBreach();ensureCombatGridRuntime();Math.random=()=>0.1`);
    for (const [elapsed, capacity] of [[0,16],[10000,24],[23000,32]]) {
        run(`game.combatTimeMs=1000+${elapsed};tickGrandBreachRun(getZone(game.currentZoneId))`);
        assert.equal(run('game.enemies.length'), capacity);
        assert.ok(run('game.enemies.filter(e=>e.isElite).length') <= 4);
        assert.equal(run('new Set(game.enemies.map(e=>gridCellKey(e.gx,e.gy))).size'),capacity,'every monster occupies a distinct cell');
        assert.equal(run('game.enemies.some(e=>e.gx===game.gridPlayer.gx && e.gy===game.gridPlayer.gy)'),false);
        run('tickGrandBreachRun(getZone(game.currentZoneId))');
        assert.equal(run('game.enemies.length'), capacity, 'repeated tick cannot duplicate reinforcement');
    }
    run(`game.voidRift.grandRun.kills=31;game=mergeDefaults(JSON.parse(JSON.stringify(game)));
        game.combatTimeMs=50000;tickGrandBreachRun(getZone(game.currentZoneId))`);
    assert.equal(run('game.enemies.length'), 1);
    assert.equal(run('game.voidRift.grandRun.phase'), 'boss');
    assert.equal(run('game.enemies[0].patternMode'), 'intro');
    assert.equal(run('getGrandBreachRewardSummary(game.voidRift.grandRun.kills).voidChisel'), 5);
    const bossId = run('game.enemies[0].id');
    run('tickGrandBreachRun(getZone(game.currentZoneId))');
    assert.equal(run('game.enemies[0].id'), bossId, 'boss transition happens once');
});
check('a full battlefield cannot be overlaid by grand-breach reinforcements', () => {
    reset();
    run(`game.voidRift.grandBreachUnlock=true;enterGrandBreach();ensureCombatGridRuntime();
        game.enemies=[];game.summons=[];
        for(let gy=0;gy<8;gy++) for(let gx=0;gx<9;gx++) game.summons.push({gx,gy,hp:1,alive:true});`);
    const before=run('JSON.stringify(game.summons)');
    run('tickGrandBreachRun(getZone(game.currentZoneId))');
    assert.equal(run('game.enemies.length'),0);
    assert.equal(run('JSON.stringify(game.summons)'),before);
});
check('hive summaries distinguish paid rewards and pending chances without changing the run', () => {
    reset();
    run(`game.beehive.penaltyLedger=['위험','위험'];game.beehive.rewardLedger=['꽃가루 +10','보상 획득 실패'];
        game.beehive.pendingQueenRewards=[{text:'[여왕벌 보상] <열쇠> 50%',chance:0.5}];`);
    const before=run('JSON.stringify(game)');
    const html=run('sideEncounterUi.hiveSummary(game.beehive)');
    assert.ok(html.includes('꽃가루 +10') && html.includes('이미 지급됨'));
    assert.ok(html.includes('&lt;열쇠&gt; 50%') && html.includes('처치 시 추첨'));
    assert.ok(html.includes('×2') && !html.includes('보상 획득 실패'));
    assert.equal(run('JSON.stringify(game)'),before);
});
check('meteor guards finish before a lone boss with a consistent warning pattern', () => {
    reset();
    run(`prepareMeteorEncounterEntry(8);game.currentZoneId=METEOR_FALL_ZONE_ID;
        game.encounterPlan=generateEncounterPlan(getZone(game.currentZoneId));game.enemies=[]`);
    for (const [index, count, elite, boss] of [[0,3,0,0],[1,2,2,0],[2,1,0,1]]) {
        run(`game.enemies=[];spawnEncounterMarker(game.encounterPlan[${index}])`);
        assert.equal(run('game.enemies.length'), count);
        assert.equal(run('game.enemies.filter(e=>e.isElite).length'), elite);
        assert.equal(run('game.enemies.filter(e=>e.isBoss).length'), boss);
    }
    assert.equal(run('game.enemies[0].patternMode'), 'slam');
    run('game.enemies[0].patternAttackCount=2;refreshBossPatternPreview(game.enemies[0])');
    assert.equal(run('game.enemies[0].nextPatternState.isSpecial'), true);
    assert.equal(run('game.enemies[0].nextPatternState.telegraphKind'), 'ring');
});
check('void reinforcements respect field capacity without discarding pending enemies', () => {
    reset();
    run(`game.currentZoneId=getAbyssZoneIdForDepth(1);game.moveTimer=0;game.runProgress=20;
        game.pendingLoopHeroSelection=false;game.pendingLoopDecision=false;game.pendingLoopReady=false;
        game.voidRift={active:true,pendingWave:true,totalToSpawn:8,spawnedCount:0,defeatedCount:0,spawnTick:0};
        game.enemies=Array.from({length:8},(_,i)=>createEnemy(getZone(game.currentZoneId),{at:20},i));
        game.enemies.forEach(e=>{e.noAttack=true;e.hp=e.maxHp=1e12});pTimer=-1000;
        for(let i=1;i<=12;i++)coreLoop(1000+i*100)`);
    assert.equal(run('game.voidRift.spawnedCount'), 0, 'a full field pauses new arrivals');
    run(`game.enemies=[];for(let i=1;i<=24;i++){pTimer=-1000;game.enemies.forEach(e=>e.noAttack=true);coreLoop(3000+i*100)}`);
    assert.equal(run('game.voidRift.spawnedCount'), 4);
    assert.equal(run('game.enemies.filter(e=>e.fromVoidRift).length'), 4);
    assert.equal(run('game.voidRift.active'), true, 'remaining reinforcement is pending, not cleared');
});
check('hive material costs are affordable before rewards and reject stale choices atomically', () => {
    reset();
    run(`game.currencies.pollen=0;game.currencies.venomStinger=0;game.currencies.enchantedHoney=0`);
    assert.equal(run("getBeehivePenaltyPool(10,10).some(p=>getBeehivePenaltyCost(p))"), false);
    run(`game.currencies.pollen=6`);
    assert.equal(run("getBeehivePenaltyPool(1,1).some(p=>p.key==='pollen_tax')"), true);
    run(`game.currencies.hiveKey=1;startBeehiveRun();
        game.beehive.pendingChoice.a={effect:'pollen',amount:10,timing:'immediate',text:'[즉시 보상] 꽃가루 +10 / 대가: 꽃가루 -6',penalty:{key:'pollen_tax',text:'꽃가루 -6'}};
        game.currencies.pollen=5`);
    const before = run('JSON.stringify(game)');
    run("resolveBeehiveChoice('a','pollen_tax')");
    assert.equal(run('JSON.stringify(game)'), before);
    run("resolveBeehiveChoice('expertLevel')");
    assert.equal(run('JSON.stringify(game)'), before);
    run(`game.currencies.pollen=6;game=mergeDefaults(JSON.parse(JSON.stringify(game)));resolveBeehiveChoice('a','pollen_tax')`);
    assert.equal(run('game.currencies.pollen'),10);
    assert.equal(run('game.beehive.branchStep'),1);
    assert.equal(run('game.beehive.penaltyLedger[0]'),'꽃가루 -6');
    assert.equal(run('game.beehive.rewardLedger[0]'),'꽃가루 +10');
    const once = run('JSON.stringify(game)');
    run("resolveBeehiveChoice('a','pollen_tax')");
    assert.equal(run('JSON.stringify(game)'), once);
});
check('saved hive choices retain rewards and visibly replace one impossible cost', () => {
    reset();
    run(`game.currencies.hiveKey=1;startBeehiveRun();game.currencies.pollen=0;
        ['a','b','c'].forEach(key=>game.beehive.pendingChoice[key]={effect:'pollen',amount:10,timing:'immediate',text:'[즉시 보상] 꽃가루 +10 / 대가: 꽃가루 -6',penalty:{key:'pollen_tax',text:'꽃가루 -6'}});
        game=mergeDefaults(JSON.parse(JSON.stringify(game)))`);
    const before = run('JSON.stringify(game)');
    const html = run('getBeehiveChoiceButtonsHtml(game.beehive.pendingChoice)');
    assert.ok(html.includes('재료 부족으로 대가 변경') && html.includes('군체 분노 +1'));
    assert.equal((html.match(/ disabled/g)||[]).length,2);
    assert.equal(run('JSON.stringify(game)'), before, 'preview must not reroll or mutate choices');
    run("resolveBeehiveChoice('c','pollen_tax')");
    assert.equal(run('JSON.stringify(game)'), before, 'stale displayed cost requires another selection');
    run("resolveBeehiveChoice('c','swarm')");
    assert.equal(run('game.beehive.enemyEmpower'),1);
    assert.equal(run('game.currencies.pollen'),10);
});
check('chance costs record actual consumption and cannot charge missing materials', () => {
    reset();
    for (const [key, currency, name] of [['venom_tax','venomStinger','독벌침'],['honey_tax','enchantedHoney','벌꿀']]) {
        run(`game.currencies.${currency}=1;Math.random=()=>0.99`);
        assert.equal(run(`applyBeehiveChoicePenalty({key:'${key}'},game.beehive)`),`${name} 소모 없음`);
        assert.equal(run(`game.currencies.${currency}`),1);
        run('Math.random=()=>0');
        assert.equal(run(`applyBeehiveChoicePenalty({key:'${key}'},game.beehive)`),`${name} -1`);
        assert.equal(run(`game.currencies.${currency}`),0);
        assert.equal(run(`applyBeehiveChoicePenalty({key:'${key}'},game.beehive)`),null);
    }
});
check('ten hive branches survive a mid-run save and settle queen rewards exactly once', () => {
    reset();
    run(`game.currencies.hiveKey=2;game.currencies.pollen=0;game.currentZoneId=8;startBeehiveRun()`);
    for (let step=1; step<=10; step++) {
        run(`game.beehive.pendingChoice.c={effect:'pollen',amount:2,chance:1,timing:'queen',text:'[여왕벌 보상] 꽃가루 +2',penalty:{key:'swarm',text:'군체 분노 +1',power:1}};
            resolveBeehiveChoice('c','swarm')`);
        assert.equal(run('game.beehive.branchStep'),step);
        assert.equal(run('game.currencies.pollen'),0, 'queen rewards remain pending');
        assert.equal(run('game.beehive.pendingQueenRewards.length'),step);
        run('game.enemies.forEach(enemy=>enemy.hp=0);onBeehiveWaveCleared()');
        if (step===5) run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
    }
    assert.equal(run('game.beehive.queenActive'),true);
    assert.equal(run('game.enemies.length'),1);
    run('game.enemies.forEach(enemy=>enemy.hp=0);onBeehiveWaveCleared()');
    assert.equal(run('game.beehive.inRun'),false);
    assert.equal(run('game.currencies.pollen'),20);
    assert.equal(run('game.currencies.hiveKey'),1);
    assert.equal(run('game.currentZoneId'),8);
    assert.equal(run("game.journalEntries.includes('beehive_queen')"),true);
    const settled=run('JSON.stringify(game.currencies)');
    run('game=mergeDefaults(JSON.parse(JSON.stringify(game)));onBeehiveWaveCleared();completeBeehiveRun()');
    assert.equal(run('JSON.stringify(game.currencies)'),settled);
});
assert.deepEqual(checks, [], 'event context regressions');
