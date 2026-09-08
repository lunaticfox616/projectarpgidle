const assert=require('assert'),vm=require('vm');
const {buildGameRuntime}=require('./lib/game-runtime');
const runtime=buildGameRuntime(),run=code=>vm.runInContext(code,runtime);
const json=code=>JSON.parse(run('JSON.stringify('+code+')'));
function defeatTarget() {
 assert(!run('bountyRuntime.claimTreasure().ok'),'a reward cannot be claimed before hunting');
 assert(run('bountyRuntime.startHunt()'));
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
console.log('smoke-bounty-hunt passed: treasure countdown, gates, rare events, unique slot, migration and single claim');
