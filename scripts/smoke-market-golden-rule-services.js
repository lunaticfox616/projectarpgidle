const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const context = buildGameRuntime();
const run = code => vm.runInContext(code, context);
const snapshot = code => JSON.parse(run('JSON.stringify(' + code + ')'));

async function main() {
    run('game = mergeDefaults({}); game.maxZoneId = 5');
    assert(!run('isMarketUnlocked()'), 'act five alone must not open the market');
    run('game.season=2;contentProgression.sync()');
    for (const id of ['market','hall']) assert(!run("contentProgression.isUnlocked('" + id + "')"));
    assert(run("contentProgression.purchase('craft').ok"));
    assert.equal(run('contentProgression.balance()'), 1);
    for (const id of ['market','hall']) assert(run("contentProgression.isUnlocked('" + id + "')"));
    const paid = snapshot('game.contentProgression');
    assert(!run("contentProgression.purchase('market').ok"));
    assert.deepEqual(snapshot('game.contentProgression'), paid);
    run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
    assert(run('isMarketUnlocked()'));
    run('game.currencies.magicBud=40;game.currencies.formlessDew=0;requestGameConfirmation=async()=>false');
    for (const quantity of [0,-1,1.5,6]) await run('exchangeAtMarket("m1",false,'+quantity+')');
    await run('exchangeAtMarket("m1",false,2)');
    assert.equal(run('game.currencies.magicBud'),40);
    assert.equal(run('game.currencies.formlessDew'),0);
    run('requestGameConfirmation=async()=>true');
    await run('exchangeAtMarket("m1",false,2)');
    assert.equal(run('game.currencies.magicBud'),24);
    assert.equal(run('game.currencies.formlessDew'),2);
    run('requestGameConfirmation=async()=>{game.currencies.magicBud=0;return true}');
    await run('exchangeAtMarket("m1",true)');
    assert.equal(run('game.currencies.formlessDew'),2,'confirmation race cannot grant unpaid currency');

    run('game.season=100;game.currencies.goldenRule=10;requestGameConfirmation=async()=>true');
    await run('marketExpandJewelInventoryByDivine()');
    assert.equal(run('game.jewelInventoryExpandLevel'),0,'loop number is not a jewel unlock');
    run("game.contentProgression.inherited.push('jewel')");
    const cost=run('getJewelMarketExpandCost()'), limit=run('getJewelInventoryLimit()');
    await run('marketExpandJewelInventoryByDivine()');
    assert.equal(run('game.currencies.goldenRule'),10-cost);
    assert.equal(run('getJewelInventoryLimit()'),limit+5);
    run('game.season++;game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
    assert.equal(run('game.jewelInventoryExpandLevel'),1,'expansion survives loop change and load');
    await verifyAnnul();
    run("game.season=1;game.contentProgression.unlocked=[];game.contentProgression.inherited=[];game.contentProgression.automatic=['market','hall'];game=mergeDefaults(JSON.parse(JSON.stringify(game)))");
    assert(run("isMarketUnlocked() && contentProgression.isUnlocked('hall')"), 'previously open markets and halls remain accessible after loading');
    assert(!run("contentProgression.isUnlocked('craft')"), 'retaining access must not silently grant a paid growth feature');
    run("delete game.contentProgression;game.maxZoneId=5;game=mergeDefaults(JSON.parse(JSON.stringify(game)))");
    assert(run('isMarketUnlocked()'), 'pre-ledger act-five saves also retain their former market');
    console.log('smoke-market-golden-rule-services passed');
}
async function verifyAnnul() {
    run(`game.inventory=[createItemFromBase(BASE_ITEM_DB.find(row=>row.id==='war_helm'),'rare',10)];
        selectForCrafting(game.inventory[0].id,false);
        game.inventory[0].stats=[{id:'flatHp',val:10},{id:'armor',val:5,lockedByHoney:true}];
        game.currencies.goldenRule=10;`);
    await run('marketAnnulSelectedStat(1)');
    assert.equal(run('game.currencies.goldenRule'),10);
    run('requestGameConfirmation=async()=>{game.inventory[0].stats[0].lockedByRift=true;return true}');
    await run('marketAnnulSelectedStat(0)');
    assert.equal(run('game.inventory[0].stats.length'),2,'protection added during confirmation must be honored');
    assert.equal(run('game.currencies.goldenRule'),10);
    run('delete game.inventory[0].stats[0].lockedByRift;requestGameConfirmation=async()=>true');
    await run('marketAnnulSelectedStat(0)');
    assert.equal(run('game.inventory[0].stats.length'),1);
    assert(run('game.inventory[0].stats[0].lockedByHoney'));
    assert.equal(run('game.currencies.goldenRule'),8);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
