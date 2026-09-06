const assert=require('node:assert/strict');
const {buildGameRuntime}=require('./lib/game-runtime');
const r=buildGameRuntime();
for(const time of [undefined,null,-1,NaN,Infinity,'broken']){
    const migrated=r.mergeDefaults({combatTimeMs:time,level:12,isBackgroundCalculation:true,backgroundKillMix:{normal:4}});
    assert.equal(migrated.combatTimeMs,0);
    assert.equal(migrated.level,12);
    assert.equal(migrated.isBackgroundCalculation,undefined);
    assert.equal(migrated.backgroundKillMix,undefined);
}
assert.equal(r.mergeDefaults({combatTimeMs:12345}).combatTimeMs,12345);
console.log('smoke-combat-clock-migration passed');
