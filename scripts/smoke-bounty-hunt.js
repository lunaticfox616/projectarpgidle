const assert=require('assert'),vm=require('vm');
const {buildGameRuntime}=require('./lib/game-runtime');
const runtime=buildGameRuntime(),run=code=>vm.runInContext(code,runtime);
const json=code=>JSON.parse(run('JSON.stringify('+code+')'));
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
assert(run('bountyRuntime.claimTreasure().ok'));
assert.equal(run('game.bountyHunt.remaining'),10);
assert(!run('bountyRuntime.claimTreasure().ok'),'reward can be claimed once');
reset();
run("contentProgression.purchase('craft');game.bountyHunt.remaining=0;Math.random=()=>0.001");
assert.equal(run('bountyRuntime.openTreasure().id'),'golden_reliquary');
const gold=run('game.currencies.goldenRule');
assert(run('bountyRuntime.claimTreasure().ok'));
assert.equal(run('game.currencies.goldenRule'),gold+1);
run('game.bountyHunt.remaining=0;Math.random=()=>0.003');
assert.equal(run('bountyRuntime.openTreasure().id'),'fairy_hollow');
const ring=run('game.currencies.fairyRing');
assert(run('bountyRuntime.claimTreasure().ok'));
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
assert(run('bountyRuntime.claimTreasure().ok'));
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
console.log('smoke-bounty-hunt passed: treasure countdown, gates, rare events, unique slot, migration and single claim');
