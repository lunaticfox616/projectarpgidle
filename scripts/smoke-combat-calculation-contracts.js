const assert=require('assert');
const audit=require('./audit-combat-20260905');

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
console.log('smoke-combat-calculation-contracts passed');
