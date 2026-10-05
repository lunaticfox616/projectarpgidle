const assert=require('node:assert/strict');
const {run}=require('./lib/replay-fixture')(97);
const copy=code=>JSON.parse(run(`JSON.stringify(${code})`));
run(`game=mergeDefaults({...JSON.parse(serializeSaveState(game)),currentZoneId:0,season:25});game.settings.mapCompleteAction='stop';
    game.contentProgression.inherited.push('talisman','jewel');contentProgression.sync(game);
    stumpBox.sync(game,'test');startEncounterRun(true);
    receiveJewelDrop(generateJewelDrop(20));`);
assert.equal(run('game.jewelInventory.length'),1,'jewels arrive before the boss');
const jewelStats=()=>copy('game.jewelInventory.map(({id,name,tier,hiddenTier,rarity,stats})=>({id,name,tier,hiddenTier,rarity,stats}))');
const owned=jewelStats();
for(const payload of ['JSON.parse(serializeSaveState(game))','createCloudSavePayload(game)',
    'JSON.parse(createCloudSaveRequestBody("test",game)).save_data']) {
    run(`game=mergeDefaults(${payload});`);
    assert.deepEqual(jewelStats(),owned);
}
run('refreshItemIdCounter();');
assert.notEqual(run('generateJewelDrop(20).id'),owned[0].id);
run(`game.actExploration.status='cleared';finishEncounterRun();finishEncounterRun();`);
assert.deepEqual(jewelStats(),owned,'completion cannot duplicate jewels');
run(`startEncounterRun(true);const random=Math.random;Math.random=()=>0.1;try{
    game.jewelInventory=Array.from({length:getJewelInventoryLimit()-1},()=>({...generateJewelDrop(1),rarity:'normal'}));
    window.beforeShards=game.currencies.jewelShard||0;
    for(let n=0;n<2;n++)receiveJewelDrop({...generateJewelDrop(1),rarity:'normal'});
    receiveJewelDrop({...generateJewelDrop(1),rarity:'rare'});
    receiveJewelDrop({...generateJewelDrop(1),rarity:'unique'});
}finally{Math.random=random;}`);
assert.equal(run('game.jewelInventory.length'),run('getJewelInventoryLimit()+2'),'rare and unique overflow is protected');
assert.equal(run('game.currencies.jewelShard'),run('window.beforeShards+2'),'overflow salvage pays immediately');
const full={jewels:jewelStats(),currencies:copy('game.currencies')};
run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));actExplorationProgress.defeat(game);');
assert.deepEqual({jewels:jewelStats(),currencies:copy('game.currencies')},full,'save and death preserve drops and salvage');
run(`startEncounterRun(true);game.jewelInventory=[];window.stumpBefore=JSON.stringify(game.stumpBox.items);
    const realDropRandom=Math.random;try {Math.random=()=>0;
        grantEnemyLoot(game.actExploration.packs.find(pack=>pack.stage!==null).waiting[0]);
    }finally{Math.random=realDropRandom;}`);
assert.equal(run('game.jewelInventory.length'),1,'the real enemy drop path delivers immediately');
assert.equal(run('JSON.stringify(game.stumpBox.items)===window.stumpBefore'),true,'story-act talisman restrictions stay intact');
console.log('immediate jewels, overflow salvage, protection, save and actual enemy drop path: OK');
