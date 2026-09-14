const assert=require('assert');
const NativeBridge=require('./fixtures/world-tree-v37-bridge.cjs');
const slashGallery=require('./fixtures/world-tree-v37-slash.json');
const {runtime:r,run}=require('./lib/replay-fixture')(37);
const projection={tileW:48,tileH:48,cellToScreen:(gx,gy)=>({x:gx*48+24,y:gy*48+24})};
let clock=100000;
r.performance.now=()=>clock;
run('battleAssets.images.skillFxWorldTree={complete:true,naturalWidth:1024,naturalHeight:1728};');
function recorder(){
 const rows=[],state={x:0,y:0,rotation:0},stack=[];
 const ctx={save(){stack.push({...state});},restore(){Object.assign(state,stack.pop());},
  translate(x,y){state.x+=x;state.y+=y;},scale(){},rotate(angle){state.rotation+=angle;},
  drawImage(_,sx,sy,sw,sh,x,y,w,h){rows.push([state.x,state.y,state.rotation,sx,sy,w,h].map(n=>Math.round(n*1e8)/1e8));}};
 return {ctx,rows};
}
function compare(fx,expected,label){
 // Transport geometry is sampled historically here; live contact gating is checked separately.
 const {contactSchedule,...historicalFx}=fx;
 if(fx.resolvedSkillContact)expected=expected.filter(event=>event.kind!=='hit');
 // The authored gallery supersedes the optional bridge's generic hit durations for slash.
 if(fx.skillName==='연속 베기')expected=expected.map(event=>({...event,duration:slashGallery.events.find(row=>row.kind===event.kind).duration}));
 const actual=recorder(),reference=recorder();
 const times=new Set([fx.start-1,fx.start,fx.start+fx.duration]);
 for(const event of expected)for(const age of [0,1,event.duration*.2,event.duration*.6,event.duration-1,event.duration])times.add(event.at+age);
 for(const now of times){
  actual.rows.length=0;reference.rows.length=0;r.worldTreeSkillFx.beginFrame();
  if(fx.type==='combatTravel')r.worldTreeSkillFx.travel(actual.ctx,historicalFx,now,projection);
  // Native v3.38 visual tails outlive bridge records; their lifecycle is checked separately.
  else r.worldTreeSkillFx.drawQueued(actual.ctx,run('battleVisualState.skillEffects.filter(row=>!row.tailEvent)'),now);
  r.worldTreeSkillFx.beginFrame();
  for(const event of expected.filter(e=>e.kind!=='hit').concat(expected.filter(e=>e.kind==='hit')))r.worldTreeSkillFx.renderEvent(reference.ctx,event,now,projection);
  assert.deepStrictEqual(actual.rows,reference.rows,`${label} at ${now-fx.start}ms`);
 }
}
function cast(name){
 clock+=10000;r.inputName=name;r.inputClock=clock;
 run(`game.activeSkill=inputName;game.skills.push(inputName);game.gemData[inputName]={level:1,exp:0,quality:0};
  resetCombatChannelRuntime();pendingSkillStageHits=[];battleFx=[];battleVisualState.skillEffects=[];
  game.combatTimeMs=inputClock;game.gridPlayer={gx:3,gy:4};game.playerCastDelayUntil=0;
  game.enemies=[{gx:4,gy:4},{gx:5,gy:3},{gx:5,gy:5},{gx:6,gy:4}].map((cell,i)=>Object.assign(
   createEnemy(getZone(1),{at:20,count:1},i),cell,{hp:10000000,maxHp:10000000}));`);
 r.performPlayerAttack(r.getPlayerStats(),{skillName:name,forcedCrit:false});
 const events=new Map(),capture=()=>{for(const fx of run('battleFx'))if(fx.skillName===name)events.set(fx.id,fx);};
 capture();
 for(const time of [...new Set(Array.from(run('pendingSkillStageHits'),row=>row.at))].sort((a,b)=>a-b)){
  clock=time;r.inputClock=time;run('game.combatTimeMs=inputClock;processPendingSkillStageHits();');capture();
 }
 return [...events.values()];
}
let travels=0,hits=0;
// Playback captured from the actual v3.7 gallery, including its missing cast windup.
function verifySlashGallery(){
 clock=0;
 run(`resetCombatChannelRuntime();pendingSkillStageHits=[];battleFx=[];battleVisualState.skillEffects=[];
  game.combatTimeMs=100000;game.gridPlayer={gx:2,gy:4};game.playerCastDelayUntil=0;
  game.activeSkill='연속 베기';game.enemies=[{gx:3,gy:4},{gx:2,gy:3}].map((cell,i)=>Object.assign(
   createEnemy(getZone(1),{at:20,count:1},i),cell,{hp:1000000,maxHp:1000000,evasion:0,evasionChance:0}));`);
 const stats=r.getPlayerStats();stats.aspd=1.8;
 r.performPlayerAttack(stats,{skillName:'연속 베기',forcedCrit:false});
 const swing=run('battleFx.find(fx=>fx.type==="playerSwing")');
 assert.strictEqual(swing.impactDelayMs,360);
 clock=360;run('game.combatTimeMs=100360;processPendingSkillStageHits();');
 const contacts=run('battleFx.filter(fx=>fx.type==="hit")');
 assert.strictEqual(contacts.length,4);
 for(const fx of contacts)r.queueSkillGemVfx({...fx,footprint:r.projectSkillFootprint(fx.attackFootprint,projection,fx.sourceCell)},
  projection.cellToScreen(fx.targetCell.gx,fx.targetCell.gy),projection.cellToScreen(fx.sourceCell.gx,fx.sourceCell.gy),{},fx.start,1);
 const before=run('JSON.stringify(game)'),actual=recorder(),reference=recorder();
 for(let time=0;time<=660;time+=30){
  actual.rows.length=0;reference.rows.length=0;r.worldTreeSkillFx.beginFrame();
  r.worldTreeSkillFx.drawQueued(actual.ctx,run('battleVisualState.skillEffects'),time);
  r.worldTreeSkillFx.swing(actual.ctx,swing,time,projection);
  r.worldTreeSkillFx.beginFrame();
  for(const event of slashGallery.events.filter(event=>event.kind!=='hit'))r.worldTreeSkillFx.renderEvent(reference.ctx,event,time,projection);
  assert.deepStrictEqual(actual.rows,reference.rows,`original slash gallery at ${time}ms`);
 }
 assert.strictEqual(run('JSON.stringify(game)'),before);
}
verifySlashGallery();
// v3.7 bridge applies to the original 43 skills; new controllers have their own contact tests.
const names=run('Object.keys(SKILL_FX_ATLAS).filter(name=>SKILL_DB[name] && !SKILL_DB[name].nativeCastId)');
for(const name of names){
 const events=cast(name),bridge=new NativeBridge();
 const before=run('JSON.stringify(game)');
 for(const fx of events.filter(fx=>fx.type==='combatTravel')){
  const expected=new NativeBridge();expected.consumeBattleFx('combatTravel',fx,{now:fx.start,channelId:fx.channelId});
  compare(fx,expected.effects,name+'/travel');travels++;
 }
 for(const fx of events.filter(fx=>fx.type==='hit'&&!fx.dot)){
  const cell=fx.targetCell||run(`game.enemies.find(e=>e.id===${fx.enemyId})`);
  const source=fx.sourceCell||run('game.gridPlayer');
  bridge.consumeBattleFx('hit',fx,{now:fx.start,playerCell:source,resolveEnemyCell:()=>cell,channelId:fx.channelId});
  r.queueSkillGemVfx({...fx,footprint:r.projectSkillFootprint(fx.attackFootprint,projection,source)},projection.cellToScreen(cell.gx,cell.gy),projection.cellToScreen(source.gx,source.gy),{},fx.start,1);
  compare(fx,bridge.effects,name+'/hit');hits++;
 }
 assert.strictEqual(run('JSON.stringify(game)'),before,'presentation must leave combat unchanged');
}
assert.strictEqual(names.length,43);assert(travels>30&&hits>50,'exercise actual casts, not only synthetic layouts');

// A fan still emits its empty rays when only one enemy is present.
const fan={type:'combatTravel',owner:'player',skillName:'연발',delivery:'projectileCell',start:2000000,duration:600,
 releaseDelayMs:80,flightMs:400,sourceCell:{gx:3,gy:4},targetCells:[{gx:4,gy:4}],
 attackFootprint:{cells:[{gx:4,gy:4},{gx:7,gy:4},{gx:5,gy:2},{gx:5,gy:6},{gx:3,gy:1},{gx:3,gy:7}]}};
fan.skillName=run('Object.values(SKILL_FX_ATLAS).find(row=>row.id===25).name');
const nativeFan=new NativeBridge();nativeFan.consumeBattleFx('combatTravel',fan,{now:fan.start});
assert.strictEqual(nativeFan.effects.length,5);compare(fan,nativeFan.effects,'five rays / one enemy');

run('battleVisualState.skillEffects=[];');
const late={type:'hit',skillName:'연속 베기',start:3000000,duration:320,damageTextGroupId:'late-render',
 sourceCell:{gx:3,gy:4},targetCell:{gx:4,gy:4}};
r.queueSkillGemVfx(late,projection.cellToScreen(4,4),projection.cellToScreen(3,4),{},late.start+140,1);
assert(run('battleVisualState.skillEffects.every(fx=>fx.startAt===3000000)'),'late rendering retains the original onset');
const lateReference=new NativeBridge();lateReference.consumeBattleFx('hit',late,{now:late.start,resolveEnemyCell:()=>late.targetCell});
compare(late,lateReference.effects,'late rendering');

// Cancellation crosses the combat/animation clock boundary and also stops queued contacts.
const channelEvents=cast('집중 광선');
const channel=channelEvents.find(fx=>fx.type==='combatTravel'),contact=channelEvents.find(fx=>fx.type==='hit');
assert(channel.channelId>0);assert.strictEqual(contact.channelId,channel.channelId);
const snap=run('JSON.stringify(game.enemies.map(e=>e.hp))');
run('battleVisualState.skillEffects=[];');
r.queueSkillGemVfx({...contact,combatFx:contact,footprint:r.projectSkillFootprint(contact.attackFootprint,projection,contact.sourceCell)},projection.cellToScreen(contact.targetCell.gx,contact.targetCell.gy),projection.cellToScreen(contact.sourceCell.gx,contact.sourceCell.gy),{},contact.start,1);
const active=recorder();r.worldTreeSkillFx.beginFrame();r.worldTreeSkillFx.travel(active.ctx,channel,channel.start+channel.flightMs+1,projection);
assert(active.rows.length>0,'channel is visible before cancellation');
assert.strictEqual(r.cancelCombatChannel('test'),true);
assert.strictEqual(channel.cancelled,true);assert.strictEqual(contact.cancelled,true);
const cancelled=recorder();r.worldTreeSkillFx.beginFrame();
r.worldTreeSkillFx.travel(cancelled.ctx,channel,channel.start+channel.flightMs+2,projection);
r.worldTreeSkillFx.drawQueued(cancelled.ctx,run('battleVisualState.skillEffects'),contact.start+2);
assert.strictEqual(cancelled.rows.length,0);assert.strictEqual(run('JSON.stringify(game.enemies.map(e=>e.hp))'),snap);
assert.strictEqual(r.cancelCombatChannel('again'),false);

// Deferred effects retain their cast's provenance even after the player equips another gem.
cast('폭열 창탄');
run(`battleFx=[];game.enemies.forEach(e=>{e.skillPeriodics=[];e.hp=10000000;});
 applySkillPeriodicOnHit(game.enemies[0],SKILL_DB['폭열 창탄'],100,'폭열 창탄');
 game.activeSkill='얼음 창';`);
const periodicStats=r.getPlayerStats();
r.tickEnemySkillPeriodicEffects(periodicStats,.24);
assert.strictEqual(run('battleFx.length'),0,'no deferred flash before the confirmed tick');
r.tickEnemySkillPeriodicEffects(periodicStats,.02);
const periodic=run('battleFx.find(fx=>fx.delivery==="confirmedPeriodic")');
assert(periodic);assert.strictEqual(periodic.skillName,'폭열 창탄');
compare(periodic,[{skillName:'폭열 창탄',kind:'stage',sourceCell:periodic.sourceCell,targetCells:periodic.targetCells,
 element:periodic.element,at:periodic.start,duration:180}],'confirmed periodic');
r.tickEnemySkillPeriodicEffects(periodicStats,1);
assert.strictEqual(run('battleFx.filter(fx=>fx.delivery==="confirmedPeriodic").length'),1,'completed periodic must not emit twice');

run(`battleFx=[];game.enemies[0].dotState={skillName:'심연 전염',ele:'chaos',timeLeft:4,rawTickDamage:100,stacks:1};
 game.enemies[0].hp=0;transferSkillDotOnDeath(game.enemies[0]);`);
const transfer=run('battleFx.find(fx=>fx.delivery==="confirmedTransfer")');
assert(transfer);assert.strictEqual(transfer.skillName,'심연 전염');
compare(transfer,[{skillName:'심연 전염',kind:'transfer',sourceCell:transfer.sourceCell,targetCells:transfer.targetCells,
 element:transfer.element,at:transfer.start,duration:220}],'confirmed transfer');
// A short combat event keeps its authored visual tail without delaying damage.
run('clearBattleVisualBacklog();');
const frost={type:'combatTravel',owner:'player',skillName:'서리 폭발',delivery:'magicCell',
 start:4000000,duration:260,flightMs:80,sourceCell:{gx:2,gy:4},targetCells:[{gx:4,gy:4}],
 attackFootprint:{center:{gx:4,gy:4},radius:2,cells:[{gx:4,gy:4}]}};
const tailArt=recorder();r.worldTreeSkillFx.beginFrame();
r.worldTreeSkillFx.travel(tailArt.ctx,frost,frost.start+120,projection);
assert.strictEqual(frost.duration,260,'presentation cannot lengthen the combat record');
const tails=run('battleVisualState.skillEffects');
assert.strictEqual(tails.length,1);assert(tails[0].tailGround);
tailArt.rows.length=0;r.worldTreeSkillFx.beginFrame();
r.worldTreeSkillFx.drawQueued(tailArt.ctx,tails,frost.start+350,'ground');
assert(tailArt.rows.length>0,'the final ice shards remain visible after the combat record expires');
tailArt.rows.length=0;r.worldTreeSkillFx.drawQueued(tailArt.ctx,tails,frost.start+350,'foreground');
assert.strictEqual(tailArt.rows.length,0,'ground tails are not duplicated above actors');
frost.cancelled=true;r.worldTreeSkillFx.drawQueued(tailArt.ctx,tails,frost.start+360,'ground');
assert.strictEqual(tailArt.rows.length,0,'channel/source cancellation also removes its tail');
r.cleanupBattleVisualState(frost.start+700);
assert.strictEqual(run('battleVisualState.skillEffects.length'),0,'visual tails expire');
console.log(`world-tree combat bridge: ${names.length} real skills, ${travels} travel events, ${hits} hit events, cancellation and visual tails passed`);
