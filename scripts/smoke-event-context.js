const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
// Toasts are a browser boundary; use DOM nodes without replacing game behavior.
const createElement = runtime.document.createElement;
runtime.document.getElementById = id => id==='game-toast-region' ? createElement() : null;
runtime.document.createElement = (...args) => {
    const element = createElement(...args);
    element.querySelector = () => createElement();
    return element;
};
const run = code => vm.runInContext(code, runtime);
function reset(season = 10) {
    run(`game=mergeDefaults({});game.season=${season};game.loopCount=${season - 1};
        game.settings.autoEquipEmptySlots=false;contentProgression.sync();Math.random=()=>0.99`);
}
const checks = [];
function check(name, action) {
    try { action(); console.log('PASS', name); } catch (error) { checks.push(name); console.error('FAIL', name, error.message); }
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
    run(`bountyRuntime.startHunt(game.bountyHunt.pending.offerIds[0]);startEncounterRun();
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
        bountyRuntime.openTreasure();bountyRuntime.startHunt(game.bountyHunt.pending.offerIds[0]);startEncounterRun();
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
assert.deepEqual(checks, [], 'event context regressions');
