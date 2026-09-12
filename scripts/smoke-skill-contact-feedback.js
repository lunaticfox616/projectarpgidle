const assert = require('assert');
const {runtime:r,run} = require('./lib/replay-fixture')(42);
const projection = {tileW:48,tileH:48,cellToScreen:(gx,gy)=>({x:gx*48+24,y:gy*48+24})};
let clock = 10000;
r.performance.now = () => clock;
r.Math.random = () => .5;
run('battleAssets.images.skillFxWorldTree={complete:true,naturalWidth:1024,naturalHeight:1728};');
function cast() {
 run(`resetCombatChannelRuntime();pendingSkillStageHits=[];battleFx=[];battleVisualState.skillEffects=[];
  game.combatTimeMs=100000;game.gridPlayer={gx:2,gy:4};game.playerCastDelayUntil=0;
  game.activeSkill='얼음 창';game.enemies=[{gx:3,gy:4},{gx:5,gy:4}].map((cell,i)=>Object.assign(
   createEnemy(getZone(1),{at:20,count:1},i),cell,{hp:1000000,maxHp:1000000,evasion:0,evasionChance:0}));`);
 r.performPlayerAttack(r.getPlayerStats(),{skillName:'얼음 창',forcedCrit:false});
 return {fx:run('battleFx.find(fx=>fx.type==="combatTravel")'),rows:Array.from(run('pendingSkillStageHits'))};
}
function positions(fx,time) {
 const points=[],stack=[];let position,angle=0;
 const art=run('SKILL_FX_ATLAS["얼음 창"].remake.main');
 const ctx={save(){stack.push({position,angle});},restore(){({position,angle}=stack.pop());},translate(x,y){position={x,y};},
  scale(){},rotate(value){angle=value;},drawImage(image,sx,sy,sw,sh,x,y,w,h){
   const ax=(art.anchor.x+art.width/2)*w/sw,ay=art.anchor.y*h/sh;
   points.push({x:position.x+ax*Math.cos(angle)-ay*Math.sin(angle),y:position.y+ax*Math.sin(angle)+ay*Math.cos(angle)});
  }};
 r.worldTreeSkillFx.beginFrame();r.worldTreeSkillFx.travel(ctx,fx,time,projection);
 return points;
}
const {fx,rows}=cast();
assert.strictEqual(rows.length,2);
assert.strictEqual(fx.contactSchedule[0].state,rows[0].contactState);
const before=run('JSON.stringify(game)');
const late=fx.start+fx.releaseDelayMs+fx.flightMs+80;
const held=positions(fx,late);
assert(held.length>0,'the projectile must not disappear while its contact is pending');
assert(held[0].x<=projection.cellToScreen(3,4).x+1,'native tip cannot overshoot a pending victim beyond pixel rounding');
assert.strictEqual(run('JSON.stringify(game)'),before,'drawing cannot deal damage');
run(`game.combatTimeMs=${rows[0].at-1};processPendingSkillStageHits();`);
assert.strictEqual(run('game.enemies[0].hp'),1000000);
clock+=rows[0].at-100000+60;
run(`game.combatTimeMs=${rows[0].at};processPendingSkillStageHits();`);
assert(run('game.enemies[0].hp<1000000 && game.enemies[1].hp===1000000'));
assert.strictEqual(rows[0].contactState.resolved,true);
const contact=positions(fx,fx.start+fx.releaseDelayMs);
assert(Math.abs(contact[0].x-projection.cellToScreen(3,4).x)<1,'confirmed damage advances the native projectile tip under visual hit stop');
const hit=run('battleFx.find(fx=>fx.type==="hit")');
assert.strictEqual(hit.syncToSwing,false,'no second wait for the next player animation');
assert.strictEqual(hit.start,clock,'damage feedback is emitted with the confirmed hit');
r.queueSkillGemVfx(hit,projection.cellToScreen(3,4),projection.cellToScreen(2,4),{},clock,1);
assert.strictEqual(run('battleVisualState.skillEffects.length'),0,'a pierce must not restart its image on the victim');
run(`game.combatTimeMs=${rows[1].at};processPendingSkillStageHits();`);
assert(run('game.enemies[1].hp<1000000'));
const hp=run('JSON.stringify(game.enemies.map(e=>e.hp))');
r.processPendingSkillStageHits();
assert.strictEqual(run('JSON.stringify(game.enemies.map(e=>e.hp))'),hp,'contacts resolve only once');

clock+=10000;
const miss=cast();
run('game.enemies.forEach(enemy=>enemy.gy=0);');
run(`game.combatTimeMs=${miss.rows.at(-1).at};processPendingSkillStageHits();`);
assert(miss.rows.every(row=>row.contactState.resolved),'empty contacts also release the travelling image');
assert.strictEqual(run('battleFx.filter(fx=>fx.type==="hit").length'),0,'an image cannot invent a hit');
assert.strictEqual(positions(miss.fx,miss.fx.start+miss.fx.duration+1).length,0,'missed shots expire normally');
console.log('skill contact feedback: passage, fixed tick boundary, hit stop, no duplicate image, miss and no double damage passed');
run(`resetCombatChannelRuntime();pendingSkillStageHits=[];battleFx=[];game.combatTimeMs=200000;
 game.gridPlayer={gx:1,gy:2};game.playerCastDelayUntil=0;game.activeSkill='얼음 창';
 game.enemies=[{gx:3,gy:3},{gx:6,gy:5}].map((cell,i)=>Object.assign(
 createEnemy(getZone(1),{at:20,count:1},i),cell,{hp:1000000,maxHp:1000000,evasion:0,evasionChance:0}));`);
r.performPlayerAttack(r.getPlayerStats(),{skillName:'얼음 창',forcedCrit:false});
const oblique=run('battleFx.find(fx=>fx.type==="combatTravel")');
const obliqueRows=Array.from(run('pendingSkillStageHits'));
assert(obliqueRows.length>=2,'oblique regression exercises a real multi-target pierce');
const origin=oblique.travelPath[0],end=oblique.travelPath.at(-1);
for(const cell of oblique.travelPath) {
 assert(Math.abs((cell.gx-origin.gx)*(end.gy-origin.gy)-(cell.gy-origin.gy)*(end.gx-origin.gx))<1e-9,
  'all pierce waypoints lie on one straight ray instead of joining enemy centers');
}
for(let i=0;i<obliqueRows.length;i++) {
 assert.strictEqual(oblique.contactSchedule[i].offsetMs,obliqueRows[i].at-obliqueRows[0].launchAt,'contact times are preserved');
}
console.log('player oblique pierce retains one direction and original contact times');

function castRoute(name, trajectory, combatPattern) {
 r.routeName=name;
 run(`resetCombatChannelRuntime();pendingSkillStageHits=[];battleFx=[];game.combatTimeMs=300000;
  game.gridPlayer={gx:1,gy:2};game.playerCastDelayUntil=0;game.activeSkill=routeName;
  game.enemies=[{gx:3,gy:3},{gx:6,gy:5}].map((cell,i)=>Object.assign(
   createEnemy(getZone(1),{at:20,count:1},i),cell,{hp:1000000,maxHp:1000000,evasion:0,evasionChance:0}));`);
 if(name==='연발 사격')run('game.enemies[0].gx=3;game.enemies[0].gy=2;game.enemies[1].gx=4;game.enemies[1].gy=2;');
 const stats=r.getPlayerStats();
 if(trajectory)stats.sSkill={...stats.sSkill,projectilePattern:{...stats.sSkill.projectilePattern,trajectory}};
 if(combatPattern)stats.sSkill={...stats.sSkill,combatPattern};
 r.performPlayerAttack(stats,{skillName:name,forcedCrit:false});
 const effects=Array.from(run('battleFx.filter(fx=>fx.type==="combatTravel")'));
 const scheduled=Array.from(run('pendingSkillStageHits'));
 for(const at of scheduled.map(row=>row.at).sort((a,b)=>a-b)) {
  run(`game.combatTimeMs=${at};processPendingSkillStageHits();`);
 }
 return {effects,scheduled,hp:run('JSON.stringify(game.enemies.map(enemy=>enemy.hp))')};
}
const direct=castRoute('얼음 창'),custom=castRoute('얼음 창','stages');
assert.strictEqual(direct.effects.length,1);
assert.strictEqual(custom.effects.length,custom.scheduled.length);
assert(custom.effects.length>=2,'custom routes keep multiple flight segments');
for(let i=0;i<custom.effects.length;i++) {
 const effect=custom.effects[i],row=custom.scheduled[i];
 assert.strictEqual(effect.travelPath,undefined,'custom travel is not projected onto a common ray');
 assert.deepStrictEqual(effect.sourceCell,row.sourceCell);
 assert.deepStrictEqual(effect.targetCells,row.targetCells);
 assert.strictEqual(row.at,direct.scheduled[i].at,'route choice cannot change hit timing');
}
assert.strictEqual(custom.hp,direct.hp,'route choice cannot change damage');
for(const name of ['독창 투척','독니 사출']) {
 const special=castRoute(name);
 assert(special.effects.length>=2,`${name} retains separate projectiles`);
 assert(special.effects.every(effect=>!effect.travelPath),`${name} is not collapsed into one ray`);
 assert(special.scheduled.length>=2,`${name} retains real hit stages`);
}
const fan=castRoute('연발 사격');
assert(fan.effects.length>0);
assert(fan.effects.every(effect=>!effect.travelPath),'fan does not acquire one shared ray');
assert(fan.effects[0].attackFootprint.cells.length>2,'fan keeps its spread footprint');
const phased=castRoute('얼음 창',undefined,{kind:'authored',stages:[
 {label:'관통',delayMs:0,damagePct:70,grid:{kind:'line',range:6}},
 {label:'확산',delayMs:250,damagePct:30,grid:{kind:'blast',radius:1}}
]});
assert.strictEqual(phased.scheduled.length,2,'authored pierce and spread remain distinct hit phases');
assert.strictEqual(phased.effects.length,2,'authored phases remain separate even on a piercing skill');
assert(phased.effects.every(effect=>!effect.travelPath),'authored spread is never folded into the outbound ray');
assert.notDeepStrictEqual(phased.effects[0].attackFootprint.cells,phased.effects[1].attackFootprint.cells);
console.log('custom stage routes, chain, return and fan preserve their paths and damage');

run(`game.enemies=[{id:801,gx:5,gy:3,isBoss:true,hp:100},{id:802,gx:2,gy:3,hp:100}];`);
const bossRow={delivery:'projectileTarget',patternKind:'chain',sourceCell:{gx:5,gy:3},
 targetCells:[{gx:5,gy:3},{gx:2,gy:3}],targetEntries:[{enemyId:801},{enemyId:802}],
 options:{chainFromEnemyId:801},at:11000,launchAt:10000};
const rowBefore=JSON.stringify(bossRow), gameBefore=run('JSON.stringify(game)');
const endpoints=r.getSkillTravelVisualEndpoints(bossRow);
assert.equal(JSON.stringify(endpoints),JSON.stringify({sourceCell:{gx:5.5,gy:3.5},
 targetCells:[{gx:5.5,gy:3.5},{gx:2,gy:3}]}),'boss aims and chain origins use the body center; small enemies unchanged');
assert.equal(JSON.stringify(bossRow),rowBefore,'collision cells and contact times are immutable');
assert.equal(run('JSON.stringify(game)'),gameBefore);
r.addPendingSkillTravelFx(bossRow,{skillName:'연쇄 폭풍'},10000);
const centeredFx=run('battleFx[battleFx.length-1]');
assert.equal(JSON.stringify(centeredFx.targetCells),JSON.stringify(endpoints.targetCells),'travel effect carries centered snapshots');
assert.equal(JSON.stringify(centeredFx.sourceCell),JSON.stringify(endpoints.sourceCell));
assert.equal(centeredFx.flightMs,1000,'visual centering preserves flight duration');
for(const override of [{delivery:'projectileCell'},{delivery:'magicCell'},{patternKind:'boomerang'},
 {travelPath:[{gx:0,gy:0,offsetMs:0},{gx:5,gy:3,offsetMs:500}]}]) {
 const row={...bossRow,...override}, points=r.getSkillTravelVisualEndpoints(row);
 assert.strictEqual(points.sourceCell,row.sourceCell);
 assert.strictEqual(points.targetCells,row.targetCells,'ground areas and authored rays preserve their geometry');
}
const missing=r.getSkillTravelVisualEndpoints({...bossRow,targetEntries:[{enemyId:-1}],options:{}});
assert.strictEqual(missing.targetCells[0],bossRow.targetCells[0],'missing victim retains its snapshot');
console.log('large enemy visual centers preserve collision, range, rays and scheduled timing');
const potion=run('SKILL_DB["원소 포션 투척"]');
const source={gx:1,gy:4}, destination={gx:5,gy:4};
const priorFlight=r.getCombatTravelMs(source,destination,{...potion,projectileTravelTimeMultiplier:1});
const quickerFlight=r.getCombatTravelMs(source,destination,potion);
assert(Math.abs(quickerFlight-priorFlight/1.8)<=1,'existing elemental potion flight is also 1.8x faster');
assert.strictEqual(potion.combatPattern.intervalMs,240,'elemental field tick spacing is unchanged');
