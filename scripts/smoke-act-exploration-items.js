const assert=require('node:assert/strict');
const {run}=require('./lib/replay-fixture')(97);
const copy=expression=>JSON.parse(run(`JSON.stringify(${expression})`));
run(`game.currentZoneId=0;game.season=25;game.settings.mapCompleteAction='stop';
    game.contentProgression.inherited.push('talisman','jewel');contentProgression.sync(game);
    stumpBox.sync(game,'test');
    startEncounterRun(true);`);
const baseline=copy('({jewels:game.jewelInventory,currencies:game.currencies})');
run(`actExplorationLoot.capture(game,game.actExploration,()=>{
    receiveJewelDrop(generateJewelDrop(20),actExplorationLoot.delivery(game,'jewels'));
});`);
assert.deepEqual(copy('({jewels:game.jewelInventory,currencies:game.currencies})'),baseline);
assert.equal(run('game.actExploration.loot.jewels.length'),1);
assert(!('growthItems' in copy('game.actExploration.loot')),'the pending loot has no growth items any more');
const held=copy('game.actExploration.loot');
for(const payload of ['JSON.parse(serializeSaveState(game))','createCloudSavePayload(game)',
    'JSON.parse(createCloudSaveRequestBody("test",game)).save_data']) {
    run(`game=mergeDefaults(${payload});`);
    assert.deepEqual(copy('game.actExploration.loot'),held,'exact stats survive every save path');
}
run('refreshItemIdCounter();');
const newId=run('generateJewelDrop(20).id');
assert.notEqual(held.jewels[0].id,newId,'next jewel cannot reuse a held id');
run(`window.bad=JSON.parse(serializeSaveState(game));window.bad.actExploration.loot.jewels[0].id=1.5;`);
assert.throws(()=>run('mergeDefaults(window.bad)'),/탐험 장비 저장/);
run(`game.actExploration.status='cleared';finishEncounterRun();`);
assert.deepEqual(copy('game.jewelInventory'),held.jewels);
const claimed=copy('({jewels:game.jewelInventory,currencies:game.currencies})');
run('finishEncounterRun();');
assert.deepEqual(copy('({jewels:game.jewelInventory,currencies:game.currencies})'),claimed);

// Fill the jewel store. Two pending rewards also count toward capacity before settlement.
run(`startEncounterRun(true);const fillRandom=Math.random;Math.random=()=>0.1;try{
    game.jewelInventory=Array.from({length:getJewelInventoryLimit()-1},()=>({...generateJewelDrop(1),rarity:'normal'}));
    window.beforeSalvage=JSON.stringify(game.currencies);
    actExplorationLoot.capture(game,game.actExploration,()=>{
        for(let n=0;n<2;n++) receiveJewelDrop({...generateJewelDrop(1),rarity:'normal'},actExplorationLoot.delivery(game,'jewels'));
        receiveJewelDrop({...generateJewelDrop(1),rarity:'rare'},actExplorationLoot.delivery(game,'jewels'));
        receiveJewelDrop({...generateJewelDrop(1),rarity:'unique'},actExplorationLoot.delivery(game,'jewels'));
    });}finally{Math.random=fillRandom;}`);
assert.equal(run('JSON.stringify(game.currencies)===window.beforeSalvage'),true,'salvage currencies cannot be spent before clear');
assert.equal(run('game.actExploration.loot.jewels.length'),3,'rare and unique jewels retain overflow protection');
assert.equal(run('game.actExploration.loot.currencies.jewelShard'),2);
const salvage=copy('game.actExploration.loot.currencies');
run(`game=mergeDefaults(JSON.parse(serializeSaveState(game)));`);
assert.deepEqual(copy('game.actExploration.loot.currencies'),salvage,'salvage is not rolled again at restore');
run(`actExplorationProgress.defeat(game);`);
assert.deepEqual(copy('game.actExploration.loot.currencies'),{});
assert.equal(run('JSON.stringify(game.currencies)===window.beforeSalvage'),true,'death loses salvage gains too');

// Jewels have no auto-salvage since 2026-09-30 (the jewel window went away), so a unique jewel is always kept.
run(`startEncounterRun(true);
    actExplorationLoot.capture(game,game.actExploration,()=>{
        receiveJewelDrop({...generateJewelDrop(1),rarity:'unique'},actExplorationLoot.delivery(game,'jewels'));
    });`);
assert.equal(run('game.actExploration.loot.jewels.length'),1);
assert.equal(run('game.actExploration.loot.currencies.jewelShard'),undefined);
const pendingCurrency=copy('game.actExploration.loot.currencies'),beforeCurrency=copy('game.currencies');
run(`game.actExploration.status='cleared';finishEncounterRun();`);
for(const [key,amount] of Object.entries(pendingCurrency))assert.equal(run(`game.currencies[${JSON.stringify(key)}]`),(beforeCurrency[key]||0)+amount);

// Same pickup policy outside exploration: direct overflow keeps rare/unique jewels and salvages the rest.
run(`actExplorationProgress.depart(game);`);
const immediateCount=run('game.jewelInventory.length');
for(const rarity of ['rare','unique']) {
    assert.equal(run(`receiveJewelDrop({...generateJewelDrop(1),rarity:'${rarity}'}).stored`),true);
}
assert.equal(run('game.jewelInventory.length'),immediateCount+2);
assert.equal(run("receiveJewelDrop({...generateJewelDrop(1),rarity:'magic'}).stored"),false,'a full store salvages ordinary jewels');

// Real enemy loot in a story act: jewels use the escrow; wild talismans (loop 25+) are not rolled there,
// like the stump box's own drops.
run(`startEncounterRun(true);game.jewelInventory=[];window.stumpBefore=JSON.stringify(game.stumpBox.items);
    const dropRandom=Math.random;
    try {
        Math.random=()=>0;
        grantEnemyLoot(game.actExploration.packs.find(pack=>pack.stage!==null).waiting[0]);
    } finally {Math.random=dropRandom;}`);
assert.equal(run('talismans.wildDropsOpen(game)'),true,'wild talisman drops are open at loop 25');
assert.equal(run('game.jewelInventory.length'),0);
assert.equal(run('game.actExploration.loot.jewels.length'),1,'real enemy loot uses jewel delivery');
assert.equal(run('JSON.stringify(game.stumpBox.items)===window.stumpBefore'),true,'no wild talisman is rolled in a story act');
run(`window.v4=JSON.parse(serializeSaveState(game));window.v4.actExploration.loot.version=4;
    delete window.v4.actExploration.loot.jewels;`);
const v4=copy('mergeDefaults(window.v4).actExploration.loot');
assert.deepEqual(v4.jewels,[]);
assert(v4.version===10&&!('growthItems' in v4)&&!('growthCodex' in v4),'v4 upgrades through v5 growth collections to v10 without them');
console.log('act exploration jewel escrow, salvage, capacity protection, ids, settlement and story-act talisman rule: OK');
