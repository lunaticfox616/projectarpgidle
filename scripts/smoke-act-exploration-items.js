const assert=require('node:assert/strict');
const {run}=require('./lib/replay-fixture')(97);
const copy=expression=>JSON.parse(run(`JSON.stringify(${expression})`));
run(`game.currentZoneId=0;game.season=25;game.settings.mapCompleteAction='stop';
    game.contentProgression.inherited.push('growth','jewel');contentProgression.sync(game);
    game.settings.growthAutoSalvageEnabled=false;game.settings.growthUseItemFilter=false;
    game.settings.jewelAutoSalvageEnabled=false;startEncounterRun(true);`);
const baseline=copy('({growth:game.growthInventory,jewels:game.jewelInventory,currencies:game.currencies,codex:game.uniqueCodex})');
run(`actExplorationLoot.capture(game,game.actExploration,()=>{
    const item=generateGrowthUniqueItem(20,'세계수의 심장');
    addDroppedGrowthItem(item,{delivery:actExplorationLoot.delivery(game,'growthItems'),silent:true});
    receiveJewelDrop(generateJewelDrop(20),actExplorationLoot.delivery(game,'jewels'));
});`);
assert.deepEqual(copy('({growth:game.growthInventory,jewels:game.jewelInventory,currencies:game.currencies,codex:game.uniqueCodex})'),baseline);
assert.equal(run('game.actExploration.loot.growthItems.length'),1);
assert.equal(run('game.actExploration.loot.jewels.length'),1);
assert.equal(run('game.actExploration.loot.growthCodex.length'),1);
const held=copy('game.actExploration.loot');
for(const payload of ['JSON.parse(serializeSaveState(game))','createCloudSavePayload(game)',
    'JSON.parse(createCloudSaveRequestBody("test",game)).save_data']) {
    run(`game=mergeDefaults(${payload});`);
    assert.deepEqual(copy('game.actExploration.loot'),held,'exact stats and discovery survive every save path');
}
run('refreshItemIdCounter();');
const newId=run('generateJewelDrop(20).id');
assert(![held.growthItems[0].id,held.jewels[0].id].includes(newId),'next jewel cannot reuse a held id');
run(`window.bad=JSON.parse(serializeSaveState(game));window.bad.actExploration.loot.growthItems[0].growthShapeId='missing';`);
assert.throws(()=>run('mergeDefaults(window.bad)'),/탐험 장비 저장/);
run(`window.bad=JSON.parse(serializeSaveState(game));window.bad.actExploration.loot.jewels[0].id=1.5;`);
assert.throws(()=>run('mergeDefaults(window.bad)'),/탐험 장비 저장/);
run(`game.actExploration.status='cleared';finishEncounterRun();`);
assert.deepEqual(copy('game.growthInventory'),held.growthItems);
assert.deepEqual(copy('game.jewelInventory'),held.jewels);
assert.notDeepEqual(copy('game.uniqueCodex'),baseline.codex,'codex is registered only after claim');
const claimed=copy('({growth:game.growthInventory,jewels:game.jewelInventory,currencies:game.currencies,codex:game.uniqueCodex})');
run('finishEncounterRun();');
assert.deepEqual(copy('({growth:game.growthInventory,jewels:game.jewelInventory,currencies:game.currencies,codex:game.uniqueCodex})'),claimed);

// Fill both inventories. Two pending rewards also count toward capacity before settlement.
run(`startEncounterRun(true);
    game.growthInventory=Array.from({length:getGrowthInventoryLimit()-1},()=>createGrowthItemFromBase(GROWTH_BASE_DB[0],'normal',1));
    game.jewelInventory=Array.from({length:getJewelInventoryLimit()-1},()=>({...generateJewelDrop(1),rarity:'normal'}));
    window.beforeSalvage=JSON.stringify(game.currencies);
    actExplorationLoot.capture(game,game.actExploration,()=>{
        for(let n=0;n<2;n++) {
            addDroppedGrowthItem(createGrowthItemFromBase(GROWTH_BASE_DB[0],'normal',1),{delivery:actExplorationLoot.delivery(game,'growthItems'),silent:true});
            receiveJewelDrop({...generateJewelDrop(1),rarity:'normal'},actExplorationLoot.delivery(game,'jewels'));
        }
        receiveJewelDrop({...generateJewelDrop(1),rarity:'rare'},actExplorationLoot.delivery(game,'jewels'));
        receiveJewelDrop({...generateJewelDrop(1),rarity:'unique'},actExplorationLoot.delivery(game,'jewels'));
    });`);
assert.equal(run('JSON.stringify(game.currencies)===window.beforeSalvage'),true,'salvage currencies cannot be spent before clear');
assert.equal(run('game.actExploration.loot.growthItems.length'),1);
assert.equal(run('game.actExploration.loot.jewels.length'),3,'rare and unique jewels retain overflow protection');
assert(run('game.actExploration.loot.currencies.growthEssence')>0);
assert.equal(run('game.actExploration.loot.currencies.jewelShard'),2);
const salvage=copy('game.actExploration.loot.currencies');
run(`game=mergeDefaults(JSON.parse(serializeSaveState(game)));`);
assert.deepEqual(copy('game.actExploration.loot.currencies'),salvage,'salvage is not rolled again at restore');
run(`actExplorationProgress.defeat(game);`);
assert.deepEqual(copy('game.actExploration.loot.currencies'),{});
assert.equal(run('JSON.stringify(game.currencies)===window.beforeSalvage'),true,'death loses salvage gains too');

// Explicit auto-salvage still overrides rare/unique protection. No codex for auto-salvaged growth.
run(`startEncounterRun(true);game.settings.growthAutoSalvageEnabled=true;
    game.settings.growthAutoSalvageRarities.unique=true;
    game.settings.jewelAutoSalvageEnabled=true;game.settings.jewelAutoSalvageRarities.unique=true;
    actExplorationLoot.capture(game,game.actExploration,()=>{
        addDroppedGrowthItem(generateGrowthUniqueItem(20,'세계수의 심장'),{delivery:actExplorationLoot.delivery(game,'growthItems'),silent:true});
        receiveJewelDrop({...generateJewelDrop(1),rarity:'unique'},actExplorationLoot.delivery(game,'jewels'));
    });`);
assert.equal(run('game.actExploration.loot.growthItems.length'),0);
assert.equal(run('game.actExploration.loot.growthCodex.length'),0);
assert.equal(run('game.actExploration.loot.jewels.length'),0);
assert.equal(run('game.actExploration.loot.currencies.jewelShard'),18);
const pendingCurrency=copy('game.actExploration.loot.currencies'),beforeCurrency=copy('game.currencies');
run(`game.actExploration.status='cleared';finishEncounterRun();`);
for(const [key,amount] of Object.entries(pendingCurrency))assert.equal(run(`game.currencies[${JSON.stringify(key)}]`),(beforeCurrency[key]||0)+amount);

// Same pickup policy outside exploration, including direct overflow and configured salvage.
run(`actExplorationProgress.depart(game);game.settings.jewelAutoSalvageEnabled=false;`);
const immediateCount=run('game.jewelInventory.length');
for(const rarity of ['rare','unique']) {
    assert.equal(run(`receiveJewelDrop({...generateJewelDrop(1),rarity:'${rarity}'}).stored`),true);
}
assert.equal(run('game.jewelInventory.length'),immediateCount+2);
run(`game.settings.jewelAutoSalvageEnabled=true;`);
assert.equal(run("receiveJewelDrop({...generateJewelDrop(1),rarity:'unique'}).stored"),false);

run(`startEncounterRun(true);game.growthInventory=[];game.jewelInventory=[];
    game.settings.growthAutoSalvageEnabled=false;game.settings.jewelAutoSalvageEnabled=false;
    const dropRandom=Math.random;
    try {
        Math.random=()=>0;
        grantEnemyLoot(game.actExploration.packs.find(pack=>pack.stage!==null).waiting[0]);
    } finally {Math.random=dropRandom;}`);
assert.equal(run('game.growthInventory.length+game.jewelInventory.length'),0);
assert.equal(run('game.actExploration.loot.growthItems.length'),1,'real enemy loot uses growth delivery');
assert.equal(run('game.actExploration.loot.jewels.length'),1,'real enemy loot uses jewel delivery');
run(`actExplorationProgress.depart(game);startEncounterRun(true);
    actExplorationLoot.capture(game,game.actExploration,()=>
        salvageGrowthItemObject(createGrowthItemFromBase(GROWTH_BASE_DB[0],'normal',1),true,
            {essenceRandom:()=>0.99,deferCurrency:actExplorationLoot.delivery(game,'growthItems').currency}));`);
assert.equal(run('game.actExploration.loot.currencies.growthEssence'),undefined,'a zero essence roll does not produce an invalid zero reward');
assert.equal(run('game.actExploration.loot.currencies.magicBud'),1);
run(`actExplorationProgress.depart(game);startEncounterRun(true);
    game.settings.growthUseItemFilter=true;game.settings.itemFilterEnabled=true;
    game.settings.itemFilterRarities.normal=false;
    actExplorationLoot.capture(game,game.actExploration,()=>
        addDroppedGrowthItem(createGrowthItemFromBase(GROWTH_BASE_DB[0],'normal',1),
            {delivery:actExplorationLoot.delivery(game,'growthItems'),silent:true}));`);
assert.equal(run('game.actExploration.loot.growthItems.length'),0);
assert.deepEqual(copy('game.actExploration.loot.currencies'),{},'pickup-filter exclusion is not salvage');
run(`window.v4=JSON.parse(serializeSaveState(game));window.v4.actExploration.loot.version=4;
    delete window.v4.actExploration.loot.growthItems;delete window.v4.actExploration.loot.jewels;
    delete window.v4.actExploration.loot.growthCodex;`);
assert.deepEqual(copy('mergeDefaults(window.v4).actExploration.loot.growthItems'),[]);
assert.deepEqual(copy('mergeDefaults(window.v4).actExploration.loot.jewels'),[]);
console.log('act exploration growth/jewel escrow, salvage, capacity protection, ids and settlement: OK');
