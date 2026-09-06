// Read-only product audit: synthetic inputs, real domain execution; no production mutations.
const fs=require('fs');
const fixture=require('./lib/replay-fixture');

function prepare() {
    const env=fixture(7), {runtime:r,state}=env;
    state.currentZoneId=1;
    state.gridPlayer={gx:3,gy:4,gridMoveTimer:0};
    const enemy=r.createEnemy(r.getZone(1),{at:20,count:1},0);
    Object.assign(enemy,{id:100,gx:4,gy:4,hp:10000000,maxHp:10000000,armor:0,evasion:0,
        evasionChance:0,dr:0,resF:0,resC:0,resL:0,resChaos:0,firstHitGuard:0,hitRateGuard:0,
        comboTakenLessPct:0,attackTimer:0,regenRate:0,attackKind:'melee',attackRange:1});
    state.enemies=[enemy];
    return {...env,enemy};
}

function damageCase(extraElement,physicalTakenMul) {
    const {runtime:r,run,enemy}=prepare(), stats=r.getPlayerStats();
    Object.assign(stats,{baseDmg:1000,minDmgRoll:100,maxDmgRoll:100,accuracy:1000000,crit:0,
        passiveAlwaysHit:true,flatElementHitDamage:extraElement ? {[extraElement]:1000} : {},
        addedDamagePctByElement:{},finalDamageMultiplier:1});
    enemy.physicalDamageTakenMul=physicalTakenMul;
    r.performPlayerAttack(stats,{forcedCrit:false});
    run('pendingSkillStageHits.forEach(row=>{row.at=0;});processPendingSkillStageHits();');
    return {extraElement,physicalTakenMul,damage:enemy.maxHp-enemy.hp};
}

function chilledEnemyCase(reduction) {
    const {runtime:r,enemy}=prepare(), stats=r.getPlayerStats();
    stats.chillEffectReducePct=reduction;
    enemy.ailments=[{type:'chill',time:10,power:1}];
    r.performMonsterAttacks(stats);
    return {playerChillReduction:reduction,enemyAttackGaugePerTick:enemy.attackTimer};
}

function cadenceCase(skillName,aspdBonus,doubleStrike=0) {
    const {runtime:r,run,state,enemy}=prepare();
    state.skills=['기본 공격',skillName]; state.activeSkill=skillName;
    state.gemData[skillName]={level:1,exp:0,quality:0};
    state.equipment['장갑']={id:999,name:'Audit speed input',slot:'장갑',rarity:'normal',tier:1,
        baseStats:[],stats:[{id:'aspd',val:aspdBonus},{id:'ds',val:doubleStrike}]};
    state.moveTimer=0; state.runProgress=20; enemy.noAttack=true;
    const stats=r.getPlayerStats(), start=r.getCombatTime();
    const casts=new Map();
    for(let tick=1;tick<=200;tick++) {
        state.runProgress=20;
        r.coreLoop(start+tick*100);
        for(const fx of run('battleFx').filter(fx=>fx.type==='playerSwing')) {
            if(!casts.has(fx.id)) casts.set(fx.id,{at:r.getCombatTime()-start,duration:fx.duration});
        }
    }
    const times=[...casts.values()].map(row=>row.at);
    return {skillName,aspdBonus,displayedAspd:stats.aspd,casts20Seconds:times.length,
        firstIntervals:times.slice(1,12).map((at,i)=>at-times[i]),firstMotion:[...casts.values()][0],
        damage:enemy.maxHp-enemy.hp,alive:enemy.hp>0,zone:state.currentZoneId};
}

function flatDpsCase(value) {
    const {runtime:r,run,state,enemy}=prepare();
    state.equipment['장갑']={id:999,name:'Audit flat input',slot:'장갑',rarity:'normal',tier:1,
        baseStats:[],stats:[{id:'fireFlatDmg',val:value}]};
    const stats=r.getPlayerStats();
    const displayed=stats.totalDps;
    stats.minDmgRoll=100;stats.maxDmgRoll=100;stats.passiveAlwaysHit=true;
    r.performPlayerAttack(stats,{forcedCrit:false});
    run('pendingSkillStageHits.forEach(row=>{row.at=0;});processPendingSkillStageHits();');
    return {fireFlatDmg:value,displayedDps:displayed,flatDamage:stats.flatElementHitDamage.fire,actualHit:enemy.maxHp-enemy.hp};
}

function scalingCase(season) {
    const {runtime:r,state}=prepare();state.season=season;state.loopCount=season-1;
    return [1,10].map(zoneId=> {
        const zone=r.getZone(zoneId), enemy=r.createEnemy(zone,{at:90,boss:true,count:1},0);
        return {season,zoneId,tier:zone.tier,loopInputs:r.getLoopDifficultyInputs(zone),hp:enemy.maxHp,
            armor:enemy.armor,penetration:enemy.penetration,patternMode:enemy.patternMode};
    });
}

function queuePressureCase() {
    const {runtime:r,run,state}=prepare();
    state.skills=['기본 공격','공허 절삭광'];state.activeSkill='공허 절삭광';
    state.gemData['공허 절삭광']={level:1,exp:0,quality:0};
    const stats=r.getPlayerStats();
    r.performPlayerAttack(stats,{forcedCrit:false});
    const stagesPerCast=run('pendingSkillStageHits.length');
    for(let cast=1;cast<42;cast++) r.performPlayerAttack(stats,{forcedCrit:false});
    return {casts:42,expectedStages:stagesPerCast*42,remainingStages:run('pendingSkillStageHits.length')};
}

function auditCombat() {
const report={damage:['', 'phys','fire'].flatMap(element=>[1,0.5].map(mul=>damageCase(element,mul))),
    chill:[0,50,95].map(chilledEnemyCase),
    flatDps:[0,100].map(flatDpsCase),scaling:[1,6,20,40].flatMap(scalingCase),
    queuePressure:queuePressureCase(),
    cadence:['기본 공격','공허 절삭광'].flatMap(name=>[0,500,5000].map(bonus=>cadenceCase(name,bonus)))};
fs.writeFileSync('artifacts/combat-audit-20260905.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
}
if(require.main===module) auditCombat();
module.exports={prepare,damageCase,chilledEnemyCase,cadenceCase,flatDpsCase,queuePressureCase};
