const assert=require('assert'),vm=require('vm');
const {buildGameRuntime}=require('./lib/game-runtime');
const runtime=buildGameRuntime(),run=code=>vm.runInContext(code,runtime);
const json=code=>JSON.parse(run('JSON.stringify('+code+')'));
function defeatTarget() {
 assert(!run('bountyRuntime.claimTreasure().ok'),'a reward cannot be claimed before hunting');
 assert(run('bountyRuntime.startHunt(game.bountyHunt.pending.offerIds[0])'));
 const savedBonus=json('game.bountyHunt.pending');
 run('game=mergeDefaults(JSON.parse(JSON.stringify(game)));startMoving(false)');
 assert.deepEqual(json('game.bountyHunt.pending'),savedBonus,'reload and return retain the same target and bonus');
 run(`startEncounterRun();var marker=game.encounterPlan.find(entry=>entry.bountyId);
     var target=createEnemy(getZone(game.currentZoneId),marker,0);game.enemies=[target]`);
 assert(run('target.isBountyTarget'));
 assert(Number.isFinite(run('target.maxHp')));
 for(const key of ['damageMul','attackSpeedVar','expMul','penetration','resChaos']) assert(Number.isFinite(run('target.'+key)));
 assert(!run('bountyRuntime.completeTarget(target)'),'living targets cannot yield rewards');
 run('target.hp=0');
 const itemsBefore=run('game.inventory.length');
 assert(run('bountyRuntime.completeTarget(target)'));
 assert(run('game.inventory.length')>itemsBefore,'original target equipment is additional to the saved treasure');
 assert(!run('bountyRuntime.completeTarget(target)'),'duplicate defeat cannot pay again');
}
const reset=()=>run("game=mergeDefaults({});game.season=2;game.currentZoneId=4;game.settings.autoEquipEmptySlots=false;contentProgression.sync()");
reset();run('Math.random=()=>0.99;game.bountyHunt.remaining=0;startEncounterRun();game.runProgress=37;game.playerHp=73');
const choices=json('bountyRuntime.openTreasure()');
assert.equal(choices.offerIds.length,3,'three targets are offered');
assert.equal(new Set(choices.offerIds).size,3,'offered targets are distinct');
assert(!choices.offerIds.includes('root_poacher'),'later-loop targets are excluded');
assert.equal(choices.targetId,null,'opening the chooser does not accept a target');
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)));Math.random=()=>0.01');
assert.deepEqual(json('bountyRuntime.openTreasure()'),choices,'reopening and reloading cannot reroll the targets or bonus');
assert(!run('bountyRuntime.startHunt()'),'accepting requires an explicit choice');
assert(!run("bountyRuntime.startHunt('root_poacher')"),'unoffered targets cannot be selected');
const combatBefore=json('[game.currentZoneId,game.runProgress,game.moveTimer,game.playerHp,game.enemies,game.encounterPlan]');
assert(run('bountyRuntime.startHunt(game.bountyHunt.pending.offerIds[1])'));
assert.equal(run('game.bountyHunt.pending.targetId'),choices.offerIds[1]);
assert.deepEqual(json('[game.currentZoneId,game.runProgress,game.moveTimer,game.playerHp,game.enemies,game.encounterPlan]'),combatBefore,
    'selecting reserves a hunt without restarting or changing the current encounter');
assert.equal(run('game.bountyHunt.pending.offerIds.length'),0,'only the selected target remains');
assert(!run('game.encounterPlan.some(marker=>marker.bountyId)'),'the current encounter has no new target');
assert(!run("bountyRuntime.injectEncounterMarker([],{type:'trial',loopScaleExempt:true})"),'ineligible encounters do not consume the reservation');
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)));game.currentZoneId=5;startEncounterRun()');
assert.equal(run('game.encounterPlan.filter(marker=>marker.bountyId).length'),1,'the next eligible encounter gets one target');
assert.equal(run('game.encounterPlan.find(marker=>marker.bountyId).bountyId'),choices.offerIds[1]);
assert(!run('bountyRuntime.injectEncounterMarker(game.encounterPlan,getZone(5))'),'an encounter cannot duplicate the target');

reset();run("game.bountyHunt=bountyRuntime.restore({version:4,remaining:0,pending:{id:'golden_reliquary',targetId:'storm_smuggler',status:'offered'}})");
assert(run("bountyRuntime.openTreasure().offerIds.includes('storm_smuggler')"),'old unselected targets remain among the three choices');
assert.equal(run('game.bountyHunt.pending.offerIds.length'),3);
assert.equal(run('game.bountyHunt.pending.id'),'golden_reliquary','an existing bonus is not rerolled by migration');

reset();
assert.equal(run('bountyRuntime.ensureState().remaining'),10);
run('game.season=1');
assert.equal(run("bountyRuntime.advanceAfterBossKill({type:'act'},{isBoss:true}).reason"),'ineligible');
run('game.season=2');
for(let count=0;count<10;count++){
 const result=run("bountyRuntime.advanceAfterBossKill({type:'act'},{isBoss:true})");
 assert.equal(result.remaining,9-count);assert.equal(result.offered,count===9);
}
const ready=json('game.bountyHunt');
run("bountyRuntime.advanceAfterBossKill({type:'act'},{isBoss:true})");
assert.deepEqual(json('game.bountyHunt'),ready,'ready treasure never accumulates duplicate rewards');
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.equal(run('game.bountyHunt.remaining'),0);
run('Math.random=()=>0.001');
let pending=json('bountyRuntime.openTreasure()');
assert(!['golden_reliquary','fairy_hollow','gem_cache','fossil_seam','sky_cache','craft_stash'].includes(pending.id),'locked currency events cannot be offered');
assert(run('bountyRuntime.canAdvanceLoop()'),'an unselected hunt must not block a loop');
run('startEncounterRun()');
assert(!run('game.encounterPlan.some(entry=>entry.bountyId)'),'an offered hunt cannot spawn without selection');
const before=json('game.bountyHunt.pending');
run('Math.random=()=>0.999;bountyRuntime.openTreasure();game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.deepEqual(json('game.bountyHunt.pending'),before,'postponing/reloading does not reroll the event or gear');
defeatTarget();assert(run('bountyRuntime.claimTreasure().ok'));
assert.equal(run('game.bountyHunt.remaining'),10);
assert(!run('bountyRuntime.claimTreasure().ok'),'reward can be claimed once');
reset();
run("contentProgression.purchase('craft');game.bountyHunt.remaining=0;Math.random=()=>0.001");
assert.equal(run('bountyRuntime.openTreasure().id'),'golden_reliquary');
const gold=run('game.currencies.goldenRule');
defeatTarget();assert(run('bountyRuntime.claimTreasure().ok'));
assert.equal(run('game.currencies.goldenRule'),gold+1);
run('game.bountyHunt.remaining=0;Math.random=()=>0.003');
assert.equal(run('bountyRuntime.openTreasure().id'),'fairy_hollow');
const ring=run('game.currencies.fairyRing');
defeatTarget();assert(run('bountyRuntime.claimTreasure().ok'));
assert.equal(run('game.currencies.fairyRing'),ring+1);
run('game.bountyHunt.remaining=0;Math.random=()=>0.03');
pending=json('bountyRuntime.openTreasure()');
assert(pending.id.startsWith('lost_'));
assert.equal(pending.item.rarity,'unique');
assert.equal(pending.item.slot,run('TREASURE_EVENT_DB[game.bountyHunt.pending.id].slot'));
assert(run("!UNIQUE_DB.find(item=>item.name===game.bountyHunt.pending.item.name).dropOnly"));
assert(!run("UNIQUE_DB.find(item=>item.name===game.bountyHunt.pending.item.name).ultraRare"));
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.equal(run('game.bountyHunt.pending.item.id'),pending.item.id);
run('refreshItemIdCounter()');
assert(run('itemIdCounter>=game.bountyHunt.pending.item.id'),'unclaimed treasure reserves its equipment id across reloads');
defeatTarget();assert(run('bountyRuntime.claimTreasure().ok'));
run("game.contentProgression.inherited.push('fossil','gemForge');Math.random=()=>0.999");
const ids=new Set();
for(let i=0;i<100;i++){
 run('game.bountyHunt.remaining=0;game.bountyHunt.pending=null');
 run('Math.random=()=>'+(0.06+i*0.0093));
 pending=json('bountyRuntime.openTreasure()');ids.add(pending.id);
 assert(!run("TREASURE_EVENT_DB[game.bountyHunt.pending.id].key==='ouroboros'"));
}
assert(ids.has('fossil_seam')&&ids.has('gem_cache'),'unlocked fossil and core rewards participate in actual rolls');
for(const raw of [{pity:7},{activeId:'root_poacher',status:'queued'},{offerIds:['iron_collector']}]){
 runtime.__saved=raw;run('game=mergeDefaults({season:2,bountyHunt:__saved})');
 assert.equal(run('game.bountyHunt.remaining'),raw.pity?3:0);
 const saved=json('game.bountyHunt');run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
 assert.deepEqual(json('game.bountyHunt'),saved,'legacy progress migrates only once');
}
for (const raw of [null,{version:2,remaining:Infinity,completed:Infinity},
 {version:2,remaining:-3,pending:{id:'lost_weapon',item:{rarity:'unique'}}},
 {version:2,remaining:10,pending:{id:'unknown'}}]) {
 runtime.__saved=raw;
 const restored=json('bountyRuntime.restore(__saved)');
 assert(Number.isFinite(restored.completed)&&restored.remaining>=0&&restored.remaining<=10);
 assert.equal(restored.pending,null);
}
reset();run("contentProgression.purchase('craft');game.bountyHunt=bountyRuntime.restore({version:2,remaining:0,pending:{id:'golden_reliquary'}})");
assert(run('bountyRuntime.claimTreasure().ok'),'already discovered v2 treasure remains claimable after migration');
assert(!run('bountyRuntime.claimTreasure().ok'));
reset();run('game.bountyHunt.remaining=0;bountyRuntime.openTreasure()');
const unselected=json('game.bountyHunt');
assert(!run('bountyRuntime.failHunt()'),'unselected hunts are not failed by ordinary deaths');
assert.deepEqual(json('game.bountyHunt'),unselected);
run('bountyRuntime.startHunt(game.bountyHunt.pending.offerIds[0])');
assert(!run('bountyRuntime.canAdvanceLoop()'));
const belongings=json('[game.inventory,game.currencies]');
assert(run('bountyRuntime.failHunt()'));
assert.deepEqual(json('[game.inventory,game.currencies]'),belongings,'failure grants or removes no items or currency');
assert.equal(run('game.bountyHunt.remaining'),10);
assert.equal(run('game.bountyHunt.pending'),null);
assert.equal(run('game.bountyHunt.source'),null);
assert.equal(run('game.bountyHunt.completed'),0);
assert(run('bountyRuntime.canAdvanceLoop()'));
assert(!run('bountyRuntime.failHunt()'),'repeated failure cannot reset later progress');
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
for(let count=0;count<9;count++) run("bountyRuntime.advanceAfterBossKill(getZone(4),{isBoss:true})");
assert.equal(run('bountyRuntime.openTreasure()'),null,'nine boss kills are insufficient');
run("bountyRuntime.advanceAfterBossKill(getZone(4),{isBoss:true});startEncounterRun()");
assert(!run('game.encounterPlan.some(entry=>entry.bountyId)'),'meeting the condition cannot auto-start a hunt');
assert(run('bountyRuntime.canAdvanceLoop()'));
run('bountyRuntime.openTreasure();startEncounterRun()');
assert(!run('game.encounterPlan.some(entry=>entry.bountyId)'),'previewing is not accepting');
defeatTarget();
const earned=json('game.bountyHunt');
assert(!run('bountyRuntime.failHunt()'),'death after target defeat cannot discard earned treasure');
assert.deepEqual(json('game.bountyHunt'),earned);

// A single low-tier boss caps all ten kills, regardless of its order or the later hunting location.
for (const lowIndex of [0,4,9]) {
 reset();run('Math.random=()=>0.99');
 for (let kill=0;kill<10;kill++) {
  run(`bountyRuntime.advanceAfterBossKill(getZone(${kill===lowIndex?0:8}),{isBoss:true})`);
  if (kill===4) run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
 }
 assert.equal(run('game.bountyHunt.source.zone.tier'),1);
 const frozenSource=json('game.bountyHunt.source');
 run('game.currentZoneId=8;bountyRuntime.advanceAfterBossKill(getZone(8),{isBoss:true})');
 assert.deepEqual(json('game.bountyHunt.source'),frozenSource,'later kills cannot upgrade a ready hunt');
 assert.equal(run('bountyRuntime.openTreasure().item.itemTier'),1,'the saved bonus uses the lowest boss');
 const oldIds=new Set(json('game.inventory.map(item=>item.id)'));
 defeatTarget();
 const loot=json('game.inventory').filter(item=>!oldIds.has(item.id));
 assert(loot.length>0 && loot.every(item=>item.itemTier===1),'hunting at T9 cannot upgrade T1 target loot');
 assert(run('bountyRuntime.claimTreasure().ok'));
 assert.equal(run('game.bountyHunt.source'),null,'claiming clears the previous minimum');
 run('bountyRuntime.advanceAfterBossKill(getZone(8),{isBoss:true})');
 assert.equal(run('game.bountyHunt.source.itemTier'),9,'a new countdown can earn higher-tier loot');
}

for (const zoneId of [0,8]) {
 reset();run("contentProgression.purchase('craft');Math.random=()=>0.7");
 for(let kill=0;kill<10;kill++) run(`bountyRuntime.advanceAfterBossKill(getZone(${zoneId}),{isBoss:true})`);
 assert.equal(run('bountyRuntime.openTreasure().id'),'craft_stash');
 const multiplier=zoneId===0?1:2;
 assert.equal(run('game.bountyHunt.source.materialMultiplier'),multiplier);
 assert(run(`bountyRuntime.rewardLabel(game.bountyHunt.pending).includes('${2*multiplier}개')`));
 run('game.currentZoneId=4;game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
 const sapBefore=run('game.currencies.sapBud');
 defeatTarget();
 assert.equal(run('game.currencies.sapBud'),sapBefore+multiplier,'target materials use the saved multiplier');
 const budsBefore=run('game.currencies.magicBud');
 assert(run('bountyRuntime.claimTreasure().ok'));
 assert.equal(run('game.currencies.magicBud'),budsBefore+2*multiplier,'the advertised material count is paid');
}

reset();run('game.season=25;game.contentProgression.inherited.push("growth");Math.random=()=>0.4');
for(let kill=0;kill<10;kill++) run('bountyRuntime.advanceAfterBossKill(getZone(0),{isBoss:true})');
assert(run("bountyRuntime.openTreasure().offerIds.includes('root_poacher')"));
run(`game.currentZoneId=8;bountyRuntime.startHunt('root_poacher');startEncounterRun();Math.random=()=>0.99;
    var growthTarget=createEnemy(getZone(8),game.encounterPlan.find(entry=>entry.bountyId),0);growthTarget.hp=0`);
assert(run('bountyRuntime.completeTarget(growthTarget)'));
assert.equal(run('game.growthInventory.length'),1);
assert.equal(run('game.growthInventory[0].itemTier'),1,'growth loot also uses the saved lowest boss');

reset();run('game.bountyHunt=bountyRuntime.restore({version:3,remaining:3,completed:5})');
assert.equal(run('game.bountyHunt.remaining'),3,'old partial counts are retained');
assert.equal(run('game.bountyHunt.source.itemTier'),1,'unknown old boss tiers cannot be upgraded by a final high kill');
assert.equal(run('game.bountyHunt.completed'),5);
for(let kill=0;kill<3;kill++) run('bountyRuntime.advanceAfterBossKill(getZone(8),{isBoss:true})');
assert.equal(run('bountyRuntime.openTreasure().item.itemTier'),1);
console.log('smoke-bounty-hunt passed: treasure countdown, gates, rare events, unique slot, migration and single claim');
