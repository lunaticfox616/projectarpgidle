const assert=require('node:assert/strict');
const {run}=require('./lib/replay-fixture')(73);
const copy=code=>JSON.parse(run(`JSON.stringify(${code})`));
run(`game.season=30;game.level=100;game.settings.mapCompleteAction='stop';game.settings.showLootLog=false;
    game.contentProgression.inherited=['support','research'];ensureExpertiseState().levels.gemEngraver=13;
    startEncounterRun(true);window.gemTestEnemy={...game.actExploration.packs[0].waiting[0],isBoss:true};
    window.originalGemRandom=Math.random;Math.random=()=>0;`);
const before=copy('({skills:game.skills,gemData:game.gemData,supports:game.supports,supportGemData:game.supportGemData,currencies:game.currencies})');
run('grantEnemyLoot(window.gemTestEnemy);grantEnemyLoot(window.gemTestEnemy);Math.random=window.originalGemRandom;');
const attacks=copy('game.actExploration.loot.gems');
assert.equal(attacks.length,2);
assert.ok(attacks.every(row=>row.kind==='attack'&&row.awakened));
assert.notEqual(attacks[0].name,attacks[1].name,'already pending attack gems are not rolled again');
assert.deepEqual(copy('({skills:game.skills,gemData:game.gemData,supports:game.supports,supportGemData:game.supportGemData,currencies:game.currencies})'),before,
    'real enemy drops do not expose new gems or fragments before completion');
assert.ok(run('game.actExploration.loot.currencies.gemShard')>=2);

run(`game.supports=[];game.sealedSupports=[];game.supportGemData={};
    window.supportName=Object.keys(SUPPORT_GEM_DB)[0];window.gemRolls=[];
    actExplorationLoot.capture(game,game.actExploration,()=>{
        for(let i=0;i<4;i++) {
            let draw=0;Math.random=()=>draw++%2===0?0.75:0;
            const reward=rollEnemyGemReward(window.gemTestEnemy,13);window.gemRolls.push(reward);
            if(reward.gem)actExplorationLoot.gem(game,reward.gem);
        }
    });Math.random=window.originalGemRandom;`);
assert.equal(run('getSupportTierCap(window.supportName)'),3);
assert.deepEqual(copy('window.gemRolls.map(row=>row.gem?.tier||0)'),[1,2,3,0]);
assert.equal(run('window.gemRolls[3].shards'),4,'a max-tier pending support converts to the existing boss fragment reward');
assert.equal(run('game.actExploration.loot.gems.find(row=>row.kind==="support").tier'),3);
assert.deepEqual(copy('game.supports'),[]);
assert.deepEqual(copy('game.supportGemData'),{});
const ledger=copy('game.actExploration.loot');
for(const save of ['JSON.parse(serializeSaveState(game))','createCloudSavePayload(game)',
    'JSON.parse(createCloudSaveRequestBody("test",game)).save_data']) {
    run(`game=mergeDefaults(${save});`);
    assert.deepEqual(copy('game.actExploration.loot'),ledger,'exact gem identities and tiers survive local/cloud restores');
}
for(const mutation of ['bad.actExploration.loot.gems[0].name="missing"',
    'bad.actExploration.loot.gems[0].awakened=1',
    'bad.actExploration.loot.gems.find(row=>row.kind==="support").tier=4']) {
    run(`window.bad=JSON.parse(serializeSaveState(game));${mutation}`);
    assert.throws(()=>run('mergeDefaults(window.bad)'),/탐험.*젬/);
}

// Research during exploration may independently acquire the same gem; settlement must merge, not reset it.
run(`window.heldAttack=game.actExploration.loot.gems.find(row=>row.kind==='attack').name;
    game.currencies.gemShard=100;researchMissingGem('attack',window.heldAttack);
    gainGemExperience(game.gemData[window.heldAttack],1234);
    Object.assign(game.gemData[window.heldAttack],{quality:17,bossCoreLevel:3,bossCoreFailures:1,skyCoreLevel:2,skyCoreFailures:2,skyEnhanceCap:3});
    game.supports.push(window.supportName);game.supportGemData[window.supportName]=normalizeGemRecord({level:10,exp:20,unlockedTier:2,activeTier:2,quality:11});
    game.equippedSupports=[window.supportName];`);
const independent=copy('({attack:game.gemData[window.heldAttack],support:game.supportGemData[window.supportName],equipped:game.equippedSupports})');
run(`game.actExploration.status='cleared';finishEncounterRun();`);
assert.equal(run('game.skills.filter(name=>name===window.heldAttack).length'),1);
for(const field of ['level','exp','quality','bossCoreLevel','bossCoreFailures','skyCoreLevel','skyCoreFailures','skyEnhanceCap']) {
    assert.equal(run(`game.gemData[window.heldAttack].${field}`),independent.attack[field]);
}
assert.equal(run('game.gemData[window.heldAttack].awakened'),true);
for(const field of ['level','exp','quality','activeTier'])assert.equal(run(`game.supportGemData[window.supportName].${field}`),independent.support[field]);
assert.equal(run('game.supportGemData[window.supportName].unlockedTier'),3);
assert.deepEqual(copy('game.equippedSupports'),independent.equipped,'settlement cannot change the active support selection');
const granted=copy('({skills:game.skills,gemData:game.gemData,supportGemData:game.supportGemData,currencies:game.currencies})');
run('finishEncounterRun();');
assert.deepEqual(copy('({skills:game.skills,gemData:game.gemData,supportGemData:game.supportGemData,currencies:game.currencies})'),granted);

run(`startEncounterRun(true);Math.random=()=>0;grantEnemyLoot(window.gemTestEnemy);Math.random=window.originalGemRandom;
    actExplorationProgress.defeat(game);`);
assert.deepEqual(copy('game.actExploration.loot.gems'),[]);
assert.deepEqual(copy('({skills:game.skills,gemData:game.gemData,supportGemData:game.supportGemData,currencies:game.currencies})'),granted,'death discards gems and shards');

// Immediate (non-exploration) support drops retain automatic tier activation, bounded by resonance.
run(`game.actExploration=null;game.supportGemData[window.supportName]=normalizeGemRecord({level:10,exp:20,unlockedTier:1,activeTier:1});
    gemDropRewards.grant(game,{kind:'support',name:window.supportName,tier:2},getSupportResonanceCostAtTier(window.supportName,1));`);
assert.equal(run('game.supportGemData[window.supportName].activeTier'),1);
run(`gemDropRewards.grant(game,{kind:'support',name:window.supportName,tier:3},100);`);
assert.equal(run('game.supportGemData[window.supportName].activeTier'),3);
assert.equal(run('game.supportGemData[window.supportName].level'),10);

run(`startEncounterRun(true);window.tierlessName=Object.keys(SUPPORT_GEM_DB).find(name=>SUPPORT_GEM_DB[name].noTiers);
    actExplorationLoot.capture(game,game.actExploration,()=>{
        const row=gemDropRewards.nextSupport(game,window.tierlessName);actExplorationLoot.gem(game,row);
        window.tierlessDuplicate=gemDropRewards.nextSupport(game,window.tierlessName,actExplorationLoot.pending(game).gems);
    });`);
assert.equal(run('window.tierlessDuplicate'),null,'tierless gems have no phantom higher-tier drops');
assert.throws(()=>run('gemDropRewards.validate([{kind:"support",name:window.tierlessName,tier:2}])'),/젬 등급/);
run(`startEncounterRun(true);game.skills=Object.keys(SKILL_DB).filter(name=>SKILL_DB[name].isGem);
    game.sealedSkills=[game.skills.pop()];Math.random=()=>0;
    actExplorationLoot.capture(game,game.actExploration,()=>window.maxCollectionDrop=rollEnemyGemReward(window.gemTestEnemy,13));
    Math.random=window.originalGemRandom;`);
assert.equal(run('window.maxCollectionDrop.gem'),null,'sealed gems still count towards a complete collection');
assert.equal(run('window.maxCollectionDrop.shards'),5,'full attack collection keeps its existing boss fragment conversion');
assert.equal(run('game.actExploration.loot.currencies.gemShard'),5);
console.log('act exploration gem drops, pending tiers, fragments, merge-safe settlement and ordinary activation: OK');
