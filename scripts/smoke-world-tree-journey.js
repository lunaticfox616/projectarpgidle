const assert = require('node:assert');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const r = buildGameRuntime();
const run = source => vm.runInContext(source, r);
r.showGameToast = () => {};
assert.equal(run('mergeDefaults({}).mapExploreSubtab'),'map-explore-hunting','new saves open their first act, not the world overview');
assert.equal(run("mergeDefaults({mapExploreSubtab:'map-explore-atlas'}).mapExploreSubtab"),'map-explore-atlas','existing explicit overview selection is preserved');
run(`game=mergeDefaults({});window.game=game;game.settings.autoEquipEmptySlots=false;
    game.season=10;game.currentZoneId=0;game.combatHalted=true;`);
assert(run(`worldTreeJourney.lockReason(game,'worldtree_root')`));
run(`changeZone('worldtree_guardian')`);
assert.equal(r.game.currentZoneId, 0);
run(`game.chaosRealm.unlocked=true;game.loopProgressCurrent.chaos20Cleared=true;contentProgression.sync();`);
run(`game.season=9`);
assert(run(`worldTreeJourney.lockReason(game,'worldtree_root')`),'realm flag alone cannot bypass the loop gate');
run(`game.season=10`);
assert.equal(run(`contentProgression.canOpen('map-explore-worldtree')`),true);
assert.equal(run(`generateEncounterPlan(getZone('worldtree_guardian')).length`),1,'first guardian is a boss encounter, not the generic three-wave realm map');
assert.equal(run(`generateEncounterPlan(getZone('worldtree_root')).some(wave=>wave.boss)`),false,
    'the entrance should introduce pack combat without duplicating the region guardian');
assert.equal(run(`generateEncounterPlan(getZone('worldtree_crossing')).every(wave=>wave.elite && !wave.boss)`),true,
    'the crossing keeps its elite challenge while reserving bosses for the guardian node');
const beforeReadiness = run('JSON.stringify(game)');
const rootReadiness = run("estimateMapZonePowerRequirements(getZone('worldtree_root'))");
const guardianReadiness = run("estimateMapZonePowerRequirements(getZone('worldtree_guardian'))");
assert.equal(rootReadiness.basis,'packThreatWindow');
assert.equal(guardianReadiness.basis,'bossThreatWindow');
assert(rootReadiness.dps < guardianReadiness.dps);
assert.equal(rootReadiness.resistancePressure,3,'ordinary packs do not apply boss resistance pressure');
assert.equal(run('JSON.stringify(game)'),beforeReadiness,'readiness must not spawn enemies or alter progress');
// The first guardian is a step beyond the entry prerequisite; later depths retain the endgame wall.
const guardianCurve = run(`(() => {
    const random=Math.random;Math.random=()=>0.5;
    try {
        const gate=createEnemy(getZone(getAbyssZoneIdForDepth(20)),{boss:true,at:100},0);
        const stages=[1,2,3].map(stage=>{
            const state={...game,worldTreeJourney:{...game.worldTreeJourney,stage}};
            const zone=createWorldTreeJourneyZone('worldtree_guardian',state);
            const stock={...zone,bossMods:undefined};
            const enemy=createEnemy(zone,{boss:true,at:100},0);
            const baseline=createEnemy(stock,{boss:true,at:100},0);
            const guard=createEnemy(zone,{elite:true,at:50},0);
            const stockGuard=createEnemy(stock,{elite:true,at:50},0);
            return {hp:enemy.maxHp,baseline:baseline.maxHp,dr:enemy.dr,stockDr:baseline.dr,
                damage:enemy.damageMul,stockDamage:baseline.damageMul,regen:enemy.regenRate,stockRegen:baseline.regenRate,
                drop:enemy.dropMul,stockDrop:baseline.dropMul,
                guardHp:guard.maxHp,stockGuardHp:stockGuard.maxHp,estimate:estimateMapZonePowerRequirements(zone).dps};
        });
        return {gateHp:gate.maxHp,stages};
    } finally {Math.random=random;}
})()`);
assert(guardianCurve.stages[0].hp > guardianCurve.gateHp*2);
assert(guardianCurve.stages[0].hp < guardianCurve.gateHp*3,'first guardian must not inherit the full late-depth health wall');
for(const [index,stage] of guardianCurve.stages.entries()) {
    assert.equal(stage.dr,stage.stockDr);assert.equal(stage.damage,stage.stockDamage);
    assert.equal(stage.regen,stage.stockRegen);assert.equal(stage.guardHp,stage.stockGuardHp);
    assert.equal(stage.drop,stage.stockDrop,'health pacing must not change drop multipliers');
    if(index)assert(stage.hp>guardianCurve.stages[index-1].hp && stage.estimate>guardianCurve.stages[index-1].estimate);
}
assert.equal(guardianCurve.stages[2].hp,guardianCurve.stages[2].baseline,'last depth keeps the full guardian challenge');
assert.deepEqual(Array.from(run(`worldTreeJourney.pathTo(game,'worldtree_guardian','breach')`)),
    ['worldtree_root','worldtree_breach','worldtree_crossing','worldtree_guardian']);
run(`worldTreeJourneyUi.travel()`);
assert.equal(r.game.currentZoneId,'worldtree_root');
run(`game.currencies.hiveKey=1;startBeehiveRun();`);
assert.equal(r.game.currentZoneId,'worldtree_root','a hive visit cannot interrupt an unfinished map');
assert.equal(r.game.currencies.hiveKey,1,'blocked hive entry does not consume a key');
run(`worldTreeJourneyUi.pause();finishEncounterRun()`);
assert.equal(r.game.combatHalted,true);
assert.equal(r.game.worldTreeJourney.notice.kind,'paused','manual stop is not presented as reaching the destination');
run(`worldTreeJourneyUi.resume()`);
assert.equal(r.game.currentZoneId,'worldtree_grove');
run(`finishEncounterRun()`);
assert.equal(r.game.worldTreeJourney.hiveDiscovered,true);
assert.equal(r.game.combatHalted,true);
assert.equal(r.game.worldTreeJourney.active,null);
assert.equal(r.game.worldTreeJourney.plan.index,2);
assert.equal(r.game.worldTreeJourney.notice.kind,'discovery');
run(`game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;game.currencies.hiveKey=1;
    startBeehiveRun();exitBeehiveRun('','');`);
assert.equal(r.game.combatHalted,true,'returning from a hive visit waits for the player to resume the journey');
assert.equal(r.game.worldTreeJourney.plan.index,2,'the remaining route survives a saved discovery and hive visit');
const currencyBefore = JSON.stringify(r.game.currencies);
run(`finishEncounterRun();coreLoop(getCombatTime()+100);`);
assert.equal(JSON.stringify(r.game.currencies),currencyBefore,'duplicate completion grants no extra currency');
assert.equal(r.game.combatHalted,true,'discovery stays paused under normal auto-progress settings');
run(`worldTreeJourneyUi.resume();finishEncounterRun();finishEncounterRun()`);
assert.equal(run(`worldTreeJourney.unlockedStage(game)`),2);
assert.equal(r.game.chaosRealm.highestFloor,1,'expedition does not grant unrelated permanent floor bonuses');
run(`worldTreeJourneyUi.stage(3)`);
assert.equal(r.game.worldTreeJourney.stage,1,'future stages cannot be selected early');
run(`worldTreeJourneyUi.stage(2);worldTreeJourneyUi.route('breach');worldTreeJourneyUi.travel();
    game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;`);
assert.equal(r.game.worldTreeJourney.queue[0],'worldtree_breach','save before the fork must not switch back to the default grove path');
assert.equal(run(`generateEncounterPlan(getZone('worldtree_guardian'))[0].elite`),true);
assert.equal(run(`generateEncounterPlan(getZone('worldtree_guardian')).filter(row=>row.boss).length`),1,'guard waves never turn into extra reward bosses');
run(`finishEncounterRun();startEncounterRun();`);
assert.equal(r.game.currentZoneId,'worldtree_breach');
assert(r.game.voidRift.active);
const queueBefore = JSON.stringify(r.game.worldTreeJourney.queue);
assert(run(`getZone(game.currentZoneId).tier > getChaosRealmTier(1)`));
run(`game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;`);
assert.equal(r.game.currentZoneId,'worldtree_breach');
assert.equal(r.game.worldTreeJourney.stage,2);
assert(r.game.worldTreeJourney.active);
assert.equal(r.game.voidRift.active,true);
assert.equal(JSON.stringify(r.game.worldTreeJourney.queue),queueBefore,'saving preserves the chosen branch');
run(`worldTreeJourneyUi.pause();game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;`);
assert.deepEqual(Array.from(r.game.worldTreeJourney.queue),[],'saving preserves pause after the current map');
run(`game.settings.showDeathNotice=false;
    handlePlayerDefeat(getZone(game.currentZoneId),getPlayerStats(),'테스트 실패',{noToast:true});`);
assert.equal(r.game.combatHalted,true);
assert.equal(r.game.worldTreeJourney.active,null);
assert.equal(r.game.voidRift.active,false);
assert.equal(r.game.worldTreeJourney.notice.kind,'defeat');
run(`game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;worldTreeJourneyUi.resume();`);
assert.equal(r.game.currentZoneId,'worldtree_breach','retry resumes the failed map instead of restarting cleared maps');
assert.equal(r.game.worldTreeJourney.queue.at(-1),'worldtree_guardian');
run(`worldTreeJourney.fail(game,getZone(game.currentZoneId))`);
run(`game.worldTreeJourney.selected='worldtree_breach';worldTreeJourneyUi.travel();startEncounterRun();`);
assert.equal(r.game.voidRift.spawnedCount,0);
assert.equal(r.game.voidRift.active,true);
run(`returnToTown()`);
assert.equal(r.game.currentZoneId,0);
assert.equal(r.game.worldTreeJourney.active,null);
assert.equal(r.game.voidRift.active,false);
run(`game.worldTreeJourney.selected='worldtree_grove';worldTreeJourneyUi.travel();game.level=1;`);
const keyBefore=r.game.currencies.hiveKey;
const random=r.Math.random;
try {
    r.Math.random=()=>0.004;
    run(`rollLootForEnemy({id:992,isBoss:true,gx:3,gy:3,dropMul:1})`);
} finally {r.Math.random=random;}
assert.equal(r.game.currencies.hiveKey,keyBefore+1,'grove bosses use the existing hive-key drop table');
const discoveredBefore=JSON.stringify(r.game.worldTreeJourney.cleared);
run(`triggerSeasonReset('chaos')`);
assert.equal(r.game.season,11);
assert.equal(JSON.stringify(r.game.worldTreeJourney.cleared),discoveredBefore,'looping retains discoveries');
assert.equal(r.game.worldTreeJourney.active,null,'looping cancels ongoing travel');
assert(run(`worldTreeJourney.lockReason(game,'worldtree_root')`),'new loop still requires its chaos gate');
run(`game=mergeDefaults({worldTreeJourney:{stage:999,cleared:['bogus'],active:{id:'worldtree_guardian',stage:999},queue:['constructor']}});window.game=game;`);
assert.equal(r.game.worldTreeJourney.stage,1);
assert.equal(r.game.worldTreeJourney.cleared.length,0);
assert.equal(r.game.worldTreeJourney.queue.length,0);
run(`game.worldTreeJourney.plan={nodes:['worldtree_root','worldtree_guardian'],stage:1,index:99};worldTreeJourney.normalize(game);`);
assert.equal(r.game.worldTreeJourney.plan,null,'invalid saved route positions cannot skip maps');
run(`game=mergeDefaults({currentZoneId:'worldtree_root',combatHalted:false,worldTreeJourney:{active:null}});window.game=game;`);
assert.equal(r.game.combatHalted,true,'an untracked saved expedition cannot resume combat');
console.log('smoke-world-tree-journey passed');
