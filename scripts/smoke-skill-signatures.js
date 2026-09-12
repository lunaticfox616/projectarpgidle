const assert=require('assert');
const {runtime:r,run,state}=require('./lib/replay-fixture')();
const source={gx:3,gy:4};
const projection={tileW:40,tileH:40,cellToScreen:(gx,gy)=>({x:gx*40,y:gy*40})};
const definition=name=>run(`SKILL_DB[${JSON.stringify(name)}]`);
const enemy=(id,gx,gy)=>({id,gx,gy,hp:100000,maxHp:100000});
const ids=rows=>Array.from(rows,row=>row.enemy.id);
const has=(cells,gx,gy)=>cells.some(cell=>cell.gx===gx && cell.gy===gy);
state.gridPlayer={...source};
state.enemies=[enemy(1,4,4),enemy(2,5,4),enemy(3,6,4),enemy(4,5,5),enemy(5,4,6)];
function sequence(name) {
    const skill=definition(name);
    const selected=r.selectGridSkillTargets(name,skill,state.gridPlayer,state.enemies,{preferredEnemyId:1});
    return r.buildSkillHitSequence(name,skill,selected);
}

assert.deepStrictEqual(Array.from(r.buildSkillHitSequence('중력 붕괴',definition('중력 붕괴'),[])),[]);
const erosion=sequence('빙결 침식');
assert.deepStrictEqual(Array.from(erosion,phase=>phase.impactCells.length),[1,5,13]);
assert.deepStrictEqual(Array.from(erosion,phase=>phase.delayMs),[0,240,480]);
assert(!has(erosion[1].impactCells,6,4));
assert(has(erosion[2].impactCells,6,4),'the final spreading frost really reaches the outer enemy');
const gravity=sequence('중력 붕괴');
assert.deepStrictEqual(Array.from(gravity,phase=>phase.impactCells.length),[21,9]);
assert(gravity[1].skipGridControl,'compression must not pull again');
assert(!has(gravity[1].impactCells,6,4));
const lava=sequence('용암 강타');
assert.strictEqual(lava[0].impactCells.length,1);
assert(has(lava[1].impactCells,5,5));
assert(!has(lava[1].impactCells,2,4),'lava cannot erupt behind the caster');
const tri=sequence('삼원 파동');
assert.deepStrictEqual(Array.from(tri,phase=>phase.element),['fire','cold','light']);
assert(tri[0].impactCells.length<tri[1].impactCells.length && tri[1].impactCells.length<tri[2].impactCells.length);
const voidCut=sequence('공허 베기');
assert.strictEqual(voidCut.length,1,'one cut across many victims');
assert(has(voidCut[0].impactCells,6,4));
assert(!has(voidCut[0].impactCells,5,5));
for(const name of ['중력 붕괴','빙결 침식','용암 강타','혈기 폭쇄','삼원 파동','공허 베기']) {
    assert(Math.abs(r.getSkillHitSequenceDpsMultiplier(name,definition(name))-1)<1e-9,`${name}: phase coefficients conserve the base total`);
}
const mine=sequence('룬 지뢰')[0];
assert(has(mine.impactCells,6,4) && has(mine.impactCells,4,6));
assert(!has(mine.impactCells,5,5),'cross mine excludes diagonal victims');
const potion=sequence('원소 포션 투척');
assert(potion.every(phase=>phase.delivery==='magicCell'));
assert(has(potion[0].impactCells,5,5) && !has(potion[0].impactCells,6,4),'potion leaves a small area, not a piercing line');

// First-target branches cannot walk further down the battlefield like sequential chain lightning.
state.gridPlayer={gx:0,gy:4};
state.enemies=[enemy(1,1,4),enemy(2,3,4),enemy(3,5,4),enemy(4,7,4)];
assert.deepStrictEqual(ids(r.selectGridSkillTargets('연쇄 폭풍',definition('연쇄 폭풍'),state.gridPlayer,state.enemies)),[1,2,3,4]);
assert.deepStrictEqual(ids(r.selectGridSkillTargets('천뢰 분기',definition('천뢰 분기'),state.gridPlayer,state.enemies)),[1,2]);
const fork=r.buildSkillHitSequence('천뢰 분기',definition('천뢰 분기'),state.enemies.slice(0,3).map(enemy=>({enemy,mult:1})));
assert.deepStrictEqual(Array.from(fork,phase=>phase.delayMs),[0,110,110]);
assert.deepStrictEqual(Array.from(fork.slice(1),phase=>phase.chainFromEnemyId),[1,1]);
state.gridPlayer={...source};
state.enemies=[enemy(1,4,4),enemy(2,5,4),enemy(3,4,5)];
const wave=sequence('불멸의 진동');
assert.deepStrictEqual(Array.from(wave,phase=>phase.delayMs),[110,220]);
assert(wave.every(phase=>phase.aimCell.gx===3 && phase.aimCell.gy===4),'resonance grows from the player');

// Real scheduling: phase-specific collision, element and fixed aim survive movement/death.
state.activeSkill='삼원 파동';
const stats=r.getPlayerStats(); stats.sSkill={...stats.sSkill,...definition('삼원 파동')};
run('pendingSkillStageHits=[]; battleFx=[];');
r.performPlayerAttack(stats,{skillName:'삼원 파동',forcedCrit:false});
const rows=run('pendingSkillStageHits');
assert.deepStrictEqual(Array.from(rows,row=>row.options.forcedElement),['fire','cold','light']);
assert(!ids(r.getPendingSkillImpactTargets(rows[0])).includes(2),'distant enemy cannot be hit by the short first wave');
assert(ids(r.getPendingSkillImpactTargets(rows[2])).includes(2));
const frozen=JSON.stringify(rows.map(row=>row.options.attackFootprint));
state.enemies[0].hp=0; state.gridPlayer.gx=0;
assert.strictEqual(JSON.stringify(rows.map(row=>row.options.attackFootprint)),frozen);
assert(ids(r.getPendingSkillImpactTargets(rows[2])).includes(2),'later ground phase survives primary victim death');

// The renderer samples real sprite cells and preserves the immutable game state.
state.gridPlayer={...source}; state.enemies=[enemy(1,4,4),enemy(2,5,4),enemy(3,4,5)];
const before=JSON.stringify(state);
const styles=run('Object.entries(SKILL_GEM_VFX_PROFILES).filter(([,profile])=>profile.signature).map(([name])=>name)');
run('Object.values(SKILL_SIGNATURE_SPRITES).forEach(spec=>{battleAssets.images[spec.asset]={complete:true,naturalWidth:1254,naturalHeight:1254};});');
assert.strictEqual(styles.length,19,'nineteen signatures plus the existing dedicated earth spikes');
for(const name of styles) {
    const phases=sequence(name), calls=[];
    const ctx=new Proxy({}, {get:(obj,key)=>key in obj ? obj[key] : (...args)=>calls.push({key,args})});
    const phase=phases[0], area=r.getSkillStageFootprint(name,definition(name),phase,source);
    const fx={skillName:name,sourceCell:source,attackFootprint:area,start:1000,duration:800,flightMs:400,
        stageIndex:0,stageDelayMs:phase.delayMs,waveDurationMs:220,element:'fire'};
    const view={now:1460,launchAt:1000,arriveAt:1400,source:{x:120,y:160},targets:[{x:160,y:160}]};
    assert(r.drawSkillSignatureTravel(ctx,fx,view,projection));
    assert.strictEqual(calls.filter(call=>call.key==='drawImage').length,1,`${name}: one sprite draw per stage frame`);
    assert(!calls.some(call=>['stroke','fillRect','lineTo','bezierCurveTo'].includes(call.key)),`${name}: no procedural effect drawing`);
    const crop=calls.find(call=>call.key==='drawImage').args.slice(1,5);
    assert(crop.every(Number.isInteger),`${name}: integer atlas crop even with odd sheet dimensions`);
    assert(crop[0]+crop[2]<=1254 && crop[1]+crop[3]<=1254);
    assert(!calls.some(call=>call.key==='clip'),'artwork is not cropped at the map boundary');
    const originalSize=calls.find(call=>call.key==='drawImage').args.slice(7);
    calls.length=0;
    r.drawSkillSignatureTravel(ctx,fx,{...view,now:1480},projection);
    assert(!calls.some(call=>call.key==='clip'),'subsequent frames remain unclipped');
    assert(calls.flatMap(call=>call.args).filter(arg=>typeof arg==='number').every(Number.isFinite),`${name}: finite coordinates`);
    calls.length=0;
    r.drawSkillSignatureTravel(ctx,{...fx,stageIndex:1},{...view,now:1300},projection);
    assert.strictEqual(calls.length,0,`${name}: later stages are not drawn early`);
    r.drawSkillSignatureTravel(ctx,fx,{...view,now:1900},projection);
    assert.strictEqual(calls.length,0,`${name}: expired effects draw nothing`);
    const spec=run(`SKILL_SIGNATURE_SPRITES[SKILL_GEM_VFX_PROFILES[${JSON.stringify(name)}].signature]`);
    const images=run('battleAssets.images'), loaded=images[spec.asset];
    delete images[spec.asset];
    r.drawSkillSignatureTravel(ctx,fx,view,projection);
    assert.strictEqual(calls.length,0,`${name}: unloaded sprite does not invoke a procedural fallback`);
    images[spec.asset]=loaded;
    r.drawSkillSignatureTravel(ctx,fx,view,{tileW:50,tileH:50,cellToScreen:(gx,gy)=>({x:gx*50,y:gy*50})});
    assert.notDeepStrictEqual(calls.find(call=>call.key==='drawImage').args.slice(7),originalSize,'viewport resize updates sprite dimensions');
}
assert.strictEqual(JSON.stringify(state),before,'all nineteen renderers leave game state unchanged');
const ground={type:'combatTravel',delivery:'magicCell',skillName:'빙결 침식'};
assert(r.isGroundSkillCast(ground),'frost is drawn under actors');
assert(r.isGroundSkillCast({...ground,skillName:'화염 폭풍핵'}),'the supplied quiet fire field is drawn under actors');
assert(!r.isGroundSkillCast({...ground,type:'hit'}),'contact hits retain foreground depth');
// One frozen atlas crop fades across a real attack cycle; damage still has three stages.
state.activeSkill='빙결 침식';
const frostStats=r.getPlayerStats(); frostStats.aspd=0.8;
frostStats.sSkill={...frostStats.sSkill,...definition('빙결 침식')};
run('battleFx=[];pendingSkillStageHits=[]');
r.performPlayerAttack(frostStats,{skillName:'빙결 침식',forcedCrit:false});
const frostQueue=Array.from(run('battleFx')).filter(fx=>fx.type==='combatTravel');
assert.strictEqual(frostQueue.length,1,'one field per attack instead of three animated fields');
assert.strictEqual(run('pendingSkillStageHits.length'),3,'all damage stages remain scheduled');
assert.strictEqual(frostQueue[0].attackFootprint.cells.length,13,'even one image covers the entire final area');
assert(frostQueue[0].spriteFrame>=7 && frostQueue[0].spriteFrame<=11,'choose a fully formed ice image');
const frostFx=frostQueue[0], arriveAt=frostFx.start+frostFx.releaseDelayMs+frostFx.flightMs;
const lifetime=frostFx.start+frostFx.duration-arriveAt;
assert(lifetime>=1250,'the field follows the configured attack cycle');
const sampled=[];
const frostCtx=new Proxy({}, {get:(obj,key)=>key in obj ? obj[key] : (...args)=>{if(key==='drawImage')sampled.push(args.slice(1,3));}});
r.drawSkillSignatureTravel(frostCtx,frostFx,{now:arriveAt+lifetime*0.2,arriveAt},projection);
const firstAlpha=frostCtx.globalAlpha;
r.drawSkillSignatureTravel(frostCtx,frostFx,{now:arriveAt+lifetime*0.8,arriveAt},projection);
assert.deepStrictEqual(sampled[0],sampled[1],'the chosen image never animates through other frames');
assert(frostCtx.globalAlpha<firstAlpha && frostCtx.globalAlpha>0,'fades continuously throughout the cycle');
r.drawSkillSignatureTravel(frostCtx,frostFx,{now:frostFx.start+frostFx.duration,arriveAt},projection);
assert.strictEqual(sampled.length,2,'expired ice no longer draws');
for (const name of ['빙결 침식','혈기 폭쇄','룬 지뢰','삼원 파동','공허 베기']) {
    const many=sequence(name);
    state.enemies=state.enemies.slice(0,1);
    const one=sequence(name);
    assert.deepStrictEqual(Array.from(one,p=>p.impactCells.length),Array.from(many,p=>p.impactCells.length),
        name+': area is independent of the number of enemies');
    state.enemies=[enemy(1,4,4),enemy(2,5,4),enemy(3,4,5)];
}
console.log('smoke-skill-signatures passed');
