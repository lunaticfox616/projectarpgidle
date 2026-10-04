const assert=require('node:assert/strict');
const {run}=require('./lib/replay-fixture')(67);
const copy=code=>JSON.parse(run(`JSON.stringify(${code})`));
run(`game=mergeDefaults({season:30,level:100});startEncounterRun(true);
    window.attack=Object.keys(SKILL_DB).find(name=>SKILL_DB[name].isGem);
    window.support=Object.keys(SUPPORT_GEM_DB).find(name=>getSupportTierCap(name)===3);
    game.skills.push(attack);game.supports.push(support);
    game.gemData[attack]=normalizeGemRecord({level:9,exp:14,quality:12});
    game.supportGemData[support]=normalizeGemRecord({level:8,exp:11,unlockedTier:1,activeTier:1});
    window.oldSave=JSON.parse(serializeSaveState(game));
    oldSave.actExploration.loot={version:10,phase:'pending',equipment:[normalizeItem(generateUniqueItem(16,'방패','마지막 기도의 문'))],
        currencies:{goldenRule:3},cores:[coreItems.roll()],jewels:[generateJewelDrop(20)],
        gems:[{kind:'attack',name:attack,awakened:true},{kind:'support',name:support,tier:3}],
        salvagedEquipment:[{item:normalizeItem(createItemFromBase(BASE_ITEM_DB.find(b=>b.slot==='무기'),'magic',3)),rewards:{goldenRule:3}}]};
    oldSave.uniqueHuntTargets=[getUniqueCodexKeyByItem(oldSave.actExploration.loot.equipment[0])];
    game=mergeDefaults(oldSave);`);
assert.equal(run('game.cores.owned[0].id'),run('oldSave.actExploration.loot.cores[0].id'));
assert.deepEqual(copy('game.cores.owned[0].lines'),copy('oldSave.actExploration.loot.cores[0].lines'),'core lines are not rerolled');
assert.equal(run('game.jewelInventory[0].id'),run('oldSave.actExploration.loot.jewels[0].id'));
assert.deepEqual(copy('game.jewelInventory[0].stats'),copy('oldSave.actExploration.loot.jewels[0].stats'));
assert.equal(run('game.gemData[attack].level'),9);
assert.equal(run('game.gemData[attack].quality'),12);
assert.equal(run('game.gemData[attack].awakened'),true);
assert.equal(run('game.supportGemData[support].unlockedTier'),3);
assert.equal(run('game.supportGemData[support].activeTier'),1,'loading old rewards preserves the selected support tier');
assert.equal(run('game.salvageRecovery.entries.length'),1);
assert.equal(run('game.currencies.goldenRule'),3,'salvage records are not a second currency payout');
assert.equal(run('game.uniqueCodex[getUniqueCodexKeyByItem(oldSave.actExploration.loot.equipment[0])].name'),'마지막 기도의 문','recovered uniques enter the collection history');
assert.equal(run('game.uniqueHuntTargets.length'),0,'recovered target gear completes its hunt');
const snapshot=()=>copy('({cores:game.cores,gems:game.gemData,supports:game.supportGemData,currencies:game.currencies,recovery:game.salvageRecovery,codex:game.uniqueCodex})');
const once=snapshot();
run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));');
assert.deepEqual(snapshot(),once);
for(const corrupt of [
    "bad.actExploration.loot.cores[0].lines[0].id='missing'",
    'bad.actExploration.loot.jewels.push({...bad.actExploration.loot.jewels[0]})',
    'bad.actExploration.loot.gems[1].tier=4',
    'bad.actExploration.loot.salvagedEquipment[0].rewards.goldenRule=-1'
]) {
    run(`window.bad=JSON.parse(JSON.stringify(oldSave));${corrupt};`);
    assert.throws(()=>run('mergeDefaults(bad)'),/탐험/);
    assert.deepEqual(snapshot(),once,'one corrupt collection cannot partially pay any rewards to the live game');
}
run(`window.failed=JSON.parse(JSON.stringify(oldSave));failed.actExploration.status='failed';
    failed.actExploration.loot={version:10,phase:'lost',equipment:[],currencies:{},cores:[],jewels:[],gems:[],salvagedEquipment:[]};
    game=mergeDefaults(failed);`);
assert.equal(run('game.currencies.goldenRule'),0,'already lost historical packets cannot be reconstructed or granted');
assert.equal(run('game.actExploration.loot'),undefined);
console.log('Legacy core/jewel/gem/salvage rewards recover once, preserve progression, reject corruption and respect old losses: OK');
