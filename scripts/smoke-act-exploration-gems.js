const assert=require('node:assert/strict');
const {run}=require('./lib/replay-fixture')(73);
const copy=code=>JSON.parse(run(`JSON.stringify(${code})`));
run(`game=mergeDefaults({...JSON.parse(serializeSaveState(game)),season:30,level:100});game.settings.mapCompleteAction='stop';game.settings.showLootLog=false;
    game.contentProgression.inherited=['support','research','gemAwakening'];
    startEncounterRun(true);window.enemy={...game.actExploration.packs[0].waiting[0],isBoss:true};
    window.originalRandom=Math.random;window.beforeSkills=game.skills.slice();Math.random=()=>0;
    try {grantEnemyLoot(window.enemy);grantEnemyLoot(window.enemy);}finally{Math.random=window.originalRandom;}
    window.newSkills=game.skills.filter(name=>!window.beforeSkills.includes(name));`);
assert.equal(run('window.newSkills.length'),2,'real drops immediately add two different attack gems');
assert.ok(run('window.newSkills.every(name=>game.gemData[name].awakened)'));
assert.ok(run('game.currencies.gemShard')>=2,'gem fragments are spendable before clear');
run(`game.supports=[];game.sealedSupports=[];game.supportGemData={};
    window.supportName=Object.keys(SUPPORT_GEM_DB)[0];window.rolls=[];
    try {for(let i=0;i<4;i++) {
        let draw=0;Math.random=()=>draw++%2===0?0.75:0;
        const reward=rollEnemyGemReward(window.enemy,13);window.rolls.push(reward);
        if(reward.gem)gemDropRewards.grant(game,reward.gem,getEffectiveResonanceCap());
    }}finally{Math.random=window.originalRandom;}`);
assert.deepEqual(copy('window.rolls.map(row=>row.gem?.tier||0)'),[1,2,3,0]);
assert.equal(run('window.rolls[3].shards'),4,'max-tier duplicates use the existing fragment reward');
assert.equal(run('game.supportGemData[window.supportName].unlockedTier'),3);
assert.ok(run('game.supports.includes(window.supportName)'));
const owned=copy('({skills:game.skills,gemData:game.gemData,supports:game.supports,supportGemData:game.supportGemData,currencies:game.currencies})');
for(const payload of ['JSON.parse(serializeSaveState(game))','createCloudSavePayload(game)',
    'JSON.parse(createCloudSaveRequestBody("test",game)).save_data']) {
    run(`game=mergeDefaults(${payload});`);
    assert.deepEqual(copy('({skills:game.skills,gemData:game.gemData,supports:game.supports,supportGemData:game.supportGemData,currencies:game.currencies})'),owned);
}
run(`game.actExploration.status='cleared';finishEncounterRun();finishEncounterRun();startEncounterRun(true);
    actExplorationProgress.defeat(game);actExplorationProgress.depart(game);`);
assert.deepEqual(copy('({skills:game.skills,gemData:game.gemData,supports:game.supports,supportGemData:game.supportGemData,currencies:game.currencies})'),owned,'gems neither repeat nor disappear at completion or death');
run(`startEncounterRun(true);game.equippedSupports=[window.supportName];game.supportGemData[window.supportName]=normalizeGemRecord({level:10,exp:20,unlockedTier:1,activeTier:1});
    gemDropRewards.grant(game,{kind:'support',name:window.supportName,tier:2},getSupportResonanceCostAtTier(window.supportName,1));`);
assert.equal(run('game.supportGemData[window.supportName].activeTier'),1,'automatic tier activation respects resonance during exploration');
run(`gemDropRewards.grant(game,{kind:'support',name:window.supportName,tier:3},100);`);
assert.equal(run('game.supportGemData[window.supportName].activeTier'),3);
assert.equal(run('game.supportGemData[window.supportName].level'),10);
run(`window.tierless=Object.keys(SUPPORT_GEM_DB).find(name=>SUPPORT_GEM_DB[name].noTiers);
    gemDropRewards.grant(game,gemDropRewards.nextSupport(game,window.tierless),100);`);
assert.equal(run('gemDropRewards.nextSupport(game,window.tierless)'),null);
assert.throws(()=>run('gemDropRewards.validate([{kind:"support",name:window.tierless,tier:2}])'),/젬 등급/);
run(`game.skills=Object.keys(SKILL_DB).filter(name=>SKILL_DB[name].isGem);game.sealedSkills=[game.skills.pop()];
    window.fragmentsBefore=game.currencies.gemShard;Math.random=()=>0;
    try {window.fullDrop=rollEnemyGemReward(window.enemy,13);}finally{Math.random=window.originalRandom;}`);
assert.equal(run('window.fullDrop.gem'),null,'sealed gems count towards the complete collection');
assert.equal(run('window.fullDrop.shards'),5);
assert.equal(run('game.currencies.gemShard'),run('window.fragmentsBefore+5'));
console.log('immediate gems, support tiers, duplicate conversion, resonance and save round trips: OK');
