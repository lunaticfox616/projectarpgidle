const assert=require('assert');
const audit=require('./audit-combat-20260905');

// Exercise the scheduler too: calling a recovery helper with an explicit dt hid a missing tick argument.
const recovery=audit.prepare();
recovery.state.equipment['장갑']={id:998,name:'흡혈 검증',slot:'장갑',rarity:'normal',tier:1,
    baseStats:[],stats:[{id:'leech',val:10}]};
recovery.state.playerHp=60;recovery.state.moveTimer=0;recovery.state.runProgress=20;
recovery.enemy.noAttack=true;
const recoveryStats=recovery.runtime.getPlayerStats();
recovery.runtime.performPlayerAttack(recoveryStats,{forcedCrit:false});
recovery.run('pendingSkillStageHits.forEach(row=>{row.at=0;});processPendingSkillStageHits();');
assert(recovery.enemy.hp<recovery.enemy.maxHp,'an actual hit must create the leech');
assert(recovery.state.playerLeechInstances.length>0,'the hit must produce pending recovery');
const pendingLeech=recovery.state.playerLeechInstances.reduce((sum,row)=>sum+row.remaining,0);
const leechPerTick=recovery.state.playerLeechInstances.reduce((sum,row)=>sum+Math.min(row.remaining,row.rate*0.1),0);
recovery.runtime.coreLoop(recovery.runtime.getCombatTime()+100);
assert(Number.isFinite(recovery.state.playerHp),'attacking with leech must never turn player HP into NaN');
assert(recovery.state.playerHp>60,'leech must recover life after attacking');
assert(Math.abs(recovery.state.playerLeechInstances.reduce((sum,row)=>sum+row.remaining,0)
    -(pendingLeech-leechPerTick))<1e-8,'one combat tick consumes only 0.1 seconds of leech');

const recoup=audit.prepare();
recoup.state.playerHp=60;recoup.state.moveTimer=0;recoup.state.runProgress=20;recoup.enemy.noAttack=true;
recoup.runtime.addPlayerRecoupInstance(10,4);
recoup.runtime.coreLoop(recoup.runtime.getCombatTime()+100);
assert(Number.isFinite(recoup.state.playerHp) && recoup.state.playerHp>60,'damage recoup must recover finite HP');
assert.strictEqual(recoup.state.playerRecoupInstances[0].remaining,9.75,'recoup retains the remaining recovery');
recoup.state.playerHp=recoup.runtime.getPlayerHpCap(recoup.runtime.getPlayerStats());
for(let tick=0;tick<40;tick++) recoup.runtime.coreLoop(recoup.runtime.getCombatTime()+100);
assert.strictEqual(recoup.state.playerHp,recoup.runtime.getPlayerHpCap(recoup.runtime.getPlayerStats()),'recovery respects full life');
assert.strictEqual(recoup.state.playerRecoupInstances.length,0,'finished recovery expires');

for(const type of ['poison','ignite','bleed']) {
    const ailment=audit.prepare();
    ailment.state.moveTimer=0;ailment.state.runProgress=20;ailment.enemy.noAttack=true;
    ailment.state.playerHp=ailment.runtime.getPlayerStats().maxHp;
    const beforeHp=ailment.state.playerHp;
    ailment.state.playerAilments=[{type,time:2,power:1,sourceHitDamage:10}];
    ailment.runtime.coreLoop(ailment.runtime.getCombatTime()+100);
    assert(ailment.state.playerHp>0 && ailment.state.playerHp<beforeHp,`${type} deals finite periodic damage`);
    assert.strictEqual(ailment.state.playerAilments[0].time,1.9,`${type} retains its duration after one tick`);
}

const periodic=audit.prepare();
periodic.state.moveTimer=0;periodic.state.runProgress=20;periodic.enemy.noAttack=true;
periodic.state.playerAilments=[{type:'freeze',time:2,power:1}];
periodic.enemy.ailments=[{type:'poison',time:2,power:1,sourceHitDamage:100}];
periodic.enemy.dotState={timeLeft:2,tickInterval:0.1,tickTimer:0.1,rawTickDamage:10,ele:'chaos'};
periodic.enemy.skillPeriodics=[{timer:0.1,interval:0.5,hitsLeft:2,damage:10,ele:'phys'}];
periodic.runtime.coreLoop(periodic.runtime.getCombatTime()+100);
assert(periodic.enemy.hp<periodic.enemy.maxHp,'periodic effects damage the enemy without a new attack');
assert.strictEqual(periodic.enemy.ailments[0].time,1.9,'enemy ailments retain their duration');
assert.strictEqual(periodic.enemy.dotState.timeLeft,1.9,'skill DOT duration advances in seconds');
assert.strictEqual(periodic.enemy.skillPeriodics[0].hitsLeft,1,'scheduled skill pulses resolve on time');
assert.strictEqual(periodic.enemy.skillPeriodics[0].timer,0.5,'the next pulse remains scheduled');

assert.strictEqual(audit.damageCase('',0.5).damage,500,'physical main hit control');
assert.strictEqual(audit.damageCase('phys',0.5).damage,1000,'physical mitigation applies to each portion exactly once');
assert.strictEqual(audit.damageCase('fire',0.5).damage,1500,'physical mitigation cannot reduce the added fire portion');
assert.strictEqual(audit.chilledEnemyCase(50).enemyAttackGaugePerTick,audit.chilledEnemyCase(0).enemyAttackGaugePerTick,
    'player chill protection cannot accelerate an enemy');
const plain=audit.flatDpsCase(0), added=audit.flatDpsCase(100);
assert(added.displayedDps>plain.displayedDps*4,'flat elemental damage must change displayed DPS');
assert.strictEqual(added.actualHit-plain.actualHit,100,'flat damage retains actual damage');
const channel=audit.cadenceCase('공허 절삭광',5000);
assert(channel.casts20Seconds>=225 && channel.casts20Seconds<=240,'12/s channel keeps cadence after initial preparation');
assert(!channel.firstIntervals.includes(500),'continuous channel does not restart its windup');
const doubled=audit.cadenceCase('공허 절삭광',5000,100);
assert.strictEqual(doubled.casts20Seconds,channel.casts20Seconds*2,'double strikes preserve channel cast count');
assert(doubled.damage>channel.damage*1.8 && doubled.damage<channel.damage*2.2,'double strikes add damage now rather than extending a future channel backlog');
const pressure=audit.queuePressureCase();
assert.strictEqual(pressure.remainingStages,pressure.expectedStages,'damage scheduling never drops old hits');
const slow=audit.cadenceCase('기본 공격',0), fast=audit.cadenceCase('기본 공격',5000);
assert.strictEqual(slow.firstMotion.duration,360,'ordinary-speed swing retains readable anticipation');
assert(fast.firstMotion.duration<=100 && fast.firstMotion.duration>=80,'high-speed swing fits its attack cycle');

// Cancelling a channel removes every queued cycle, not just the newest cycle id.
const cancelled=audit.prepare(), {runtime:r,run,state,enemy}=cancelled;
state.skills=['기본 공격','공허 절삭광'];state.activeSkill='공허 절삭광';
state.gemData['공허 절삭광']={level:1,exp:0,quality:0};
const stats=r.getPlayerStats();
r.performPlayerAttack(stats,{forcedCrit:false});r.performPlayerAttack(stats,{forcedCrit:false});
state.playerAilments=[{type:'freeze',time:1,power:1}];
r.updateCombatChannelRuntime(r.getCombatTime());
run('pendingSkillStageHits.forEach(row=>{row.at=0;});processPendingSkillStageHits();');
assert.strictEqual(enemy.hp,enemy.maxHp,'freeze stops all queued channel damage');

const frozen=audit.prepare();
frozen.state.playerAilments=[{type:'freeze',time:2,power:1}];
frozen.state.moveTimer=0; frozen.enemy.noAttack=true;
const frozenStart=frozen.runtime.getCombatTime(), frozenCell={...frozen.state.gridPlayer};
for(let tick=1;tick<=10;tick++) {
    frozen.state.runProgress=20; frozen.runtime.coreLoop(frozenStart+tick*100);
}
assert.strictEqual(frozen.enemy.hp,frozen.enemy.maxHp,'freeze prevents starting ordinary attacks too');
assert.strictEqual(frozen.state.gridPlayer.gx,frozenCell.gx,'freeze stops approach movement');
assert.strictEqual(frozen.state.gridPlayer.gy,frozenCell.gy);
assert(Math.abs(frozen.state.playerAilments[0].time-1)<1e-8,'two-second freeze lasts beyond the first second');
console.log('smoke-combat-calculation-contracts passed');
