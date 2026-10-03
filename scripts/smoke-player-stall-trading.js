const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const ctx = buildGameRuntime(), start = 1700000000000, hour = 3600000;
ctx.Math = Object.create(Math); ctx.Math.random = () => 0.999999;
const run = source => vm.runInContext(source, ctx);
const json = source => JSON.parse(run(`JSON.stringify(${source})`));
run(`game=mergeDefaults({season:2});contentProgression.sync(game);contentProgression.purchase('craft',game);
    playerStall.advance(game,${start});
    {const item=createItemFromBase(BASE_ITEM_DB.find(base=>base.id==='apocalypse_greatblade'),'rare',20,{affixTierCap:20});
    item.stats=['flatDmg','weaponFlatDmgPct','attackPctDmg','aspd','crit','critDmg'].map(id=>{
        const stat=rollAffixValueInTierRange(MOD_DB.find(mod=>mod.id===id),20,20);stat.val=stat.valMax;return stat;
    });item.baseStats.forEach(stat=>{stat.val=stat.valMax;});game.inventory=[normalizeItem(item)];
    playerStall.list(game,item.id,1000000,${start},{currency:'goldenRule',negotiate:true});}
    playerStall.advance(game,${start + 4 * hour});`);
const saved = json('game'), row = saved.playerStall.listings[0], offer = row.offer, now = saved.playerStall.lastAt;
assert(offer && offer.amount < offer.buyerLimit, 'a real customer leaves room for negotiation');
const restore = owner => run(`game=mergeDefaults(${JSON.stringify(owner)})`);

// Repricing keeps exposure history; unchanged terms do not discard a pending offer.
restore(saved);
const beforeSame = json('game.playerStall');
assert(run(`playerStall.reprice(game,${row.id},${row.price},${now},'goldenRule')`));
assert.deepEqual(json('game.playerStall'), beforeSame);
assert(run(`playerStall.reprice(game,${row.id},1,${now},'goldenRule')`));
assert.equal(run('game.playerStall.listings[0].listedAt'), start);
assert.equal(run('game.playerStall.listings[0].priceChangedAt'), now);
assert.equal(run('game.playerStall.listings[0].offer'), null);
const repriced = json('game');
restore(repriced);
assert.deepEqual(json('game.playerStall'), repriced.playerStall);
run(`game.playerStall.nextVisitAt=${now + 19999};playerStall.advance(game,${now + 19999})`);
assert.equal(run('game.playerStall.listings.length'), 1, 'no immediate sale during the short price exposure delay');
let fastSale = false;
for (let seed = 1; seed <= 40; seed++) {
    restore(repriced);
    run(`game.playerStall.rng=${Math.imul(seed,2654435761)>>>0};game.playerStall.nextVisitAt=${now + 21000};playerStall.advance(game,${now + 21000})`);
    fastSale ||= run('game.playerStall.goldProceeds') > 0;
}
assert(fastSale, 'an aged item can sell after the short update delay without a new one-minute wait');

// Invalid, stale, locked and expired counteroffers never pay or reroll their customer.
for (const amount of [0, NaN, offer.amount, row.price + 1, 1.5]) {
    restore(saved); const before = json('game.playerStall');
    assert.equal(run(`playerStall.counterOffer(game,{listingId:${row.id},offerId:${offer.id},amount:${amount}},${now}).ok`), false);
    assert.deepEqual(json('game.playerStall'), before);
}
restore(saved);
run('game.isBackgroundCalculation=true');
assert.equal(run(`playerStall.counterOffer(game,{listingId:${row.id},offerId:${offer.id},amount:${offer.amount+1}},${now}).ok`),false);
run('game.isBackgroundCalculation=false');
assert.equal(run(`playerStall.counterOffer(game,{listingId:${row.id},offerId:${offer.id+1},amount:${offer.amount+1}},${now}).ok`),false);
assert.equal(run(`playerStall.counterOffer(game,{listingId:${row.id},offerId:${offer.id},amount:${offer.amount+1}},${offer.expiresAt}).ok`),false);
assert.equal(run('game.playerStall.goldProceeds'),0);
restore(saved);run('game.playerStall.goldProceeds=Number.MAX_SAFE_INTEGER');
const fullBank=json('game.playerStall');
assert.equal(run(`playerStall.counterOffer(game,{listingId:${row.id},offerId:${offer.id},amount:${offer.amount+1}},${now}).ok`),false);
assert.deepEqual(json('game.playerStall'),fullBank,'a full proceeds balance preserves the original offer and customer RNG');

const outcomes = { accepted: 0, final: 0, left: 0 };
let accepted, final;
for (let seed = 1; seed <= 120; seed++) {
    for (const amount of [offer.amount + 1, offer.buyerLimit + 2]) {
        restore(saved); run(`game.playerStall.rng=${Math.imul(seed,2654435761)>>>0}`);
        const result = json(`playerStall.counterOffer(game,{listingId:${row.id},offerId:${offer.id},amount:${amount}},${now})`);
        assert(result.ok);
        const owner = json('game'), held = owner.playerStall.listings[0];
        if (!held) {
            outcomes.accepted++; accepted ||= owner;
            assert.equal(owner.playerStall.goldProceeds, amount);
            assert(amount <= run(`itemAppraisal.quote(${JSON.stringify(row.item)},'goldenRule').ceiling`));
            assert.equal(owner.playerStall.sales.length,1);
            assert.equal(owner.playerStall.sales[0].price,amount);
        } else if (held.offer) {
            outcomes.final++; final ||= owner;
            assert(held.offer.negotiated && held.offer.id !== offer.id);
            assert(held.offer.amount > offer.amount && held.offer.amount < amount);
        } else outcomes.left++;
        const once = json('game.playerStall');
        assert.equal(run(`playerStall.counterOffer(game,{listingId:${row.id},offerId:${offer.id},amount:${amount}},${now}).ok`),false);
        assert.deepEqual(json('game.playerStall'),once,'repeated counter clicks cannot reroll or double pay');
    }
}
assert(Object.values(outcomes).every(count => count > 0));
restore(final);
const finalBid = json('game.playerStall.listings[0].offer');
const finalBefore = json('game.playerStall');
assert.equal(run(`playerStall.counterOffer(game,{listingId:${row.id},offerId:${finalBid.id},amount:${finalBid.amount+1}},${now}).ok`),false);
assert.deepEqual(json('game.playerStall'),finalBefore,'the final bid cannot be bargained again after reload');
assert(run(`playerStall.acceptOffer(game,${row.id},${finalBid.id},${now}).ok`));
assert.equal(run('game.playerStall.goldProceeds'),finalBid.amount);

// Receipts survive collection/reload and never become owned equipment or fresh proceeds.
restore(accepted);
const receipt = json('game.playerStall.sales[0]');
assert.deepEqual(receipt.item,row.item);
run('playerStall.collect(game);playerStall.collect(game)');
assert.deepEqual(json('game.playerStall.sales[0]'),receipt);
const collected = json('game'); restore(collected);
assert.deepEqual(json('game.playerStall.sales[0]'),receipt);
assert.equal(run('game.inventory.length'),0);
assert.equal(run('game.playerStall.goldProceeds'),0);
const legacy = structuredClone(collected);
legacy.playerStall.version=7;delete legacy.playerStall.sales;delete legacy.playerStall.saleSequence;
restore(legacy);
assert.equal(run('game.playerStall.sales.length'),1);
assert.equal(run('game.playerStall.sales[0].item'),null,'legacy records retain only the details actually recorded');
const migrated = json('game');restore(migrated);
assert.equal(run('game.playerStall.sales.length'),1);
assert.equal(run('game.playerStall.goldProceeds'),0);
const damaged = structuredClone(collected);
damaged.playerStall.sales.push({...receipt}, {...receipt,id:2,price:-1});
restore(damaged); assert.equal(run('game.playerStall.sales.length'),1);

// Keep a bounded ledger through real independent acceptances, with no archival currency source.
let archive = [], sequence = 0, total = 0;
for (let index=0;index<55;index++) {
    const owner=structuredClone(saved);owner.playerStall.sales=archive;owner.playerStall.saleSequence=sequence;
    restore(owner);
    assert(run(`playerStall.acceptOffer(game,${row.id},${offer.id},${now}).ok`));
    archive=json('game.playerStall.sales');sequence=run('game.playerStall.saleSequence');total+=offer.amount;
}
assert.equal(archive.length,50);assert.equal(sequence,55);
assert.equal(run('game.playerStall.goldProceeds'),offer.amount);
assert(total>0);

// Presentation consumes live events only while the actual panel is visible; opening never replays history.
restore(saved);
const lane={dataset:{},innerHTML:''};let showing=true;
const realGet=ctx.document.getElementById;
ctx.document.getElementById=id=>id==='stall-visitors'?lane:id==='market-panel-stall'?{getClientRects:()=>showing?[{}]:[]}:realGet(id);
ctx.document.hidden=false;
run('marketUi.section="stall";playerStallUi.visitorsVisible=false;playerStallUi.visitorTickAt=0');
run(`playerStallUi.tickVisitors(${now})`);
assert.equal(lane.innerHTML,'');
let at=run('game.playerStall.nextVisitAt');
run(`playerStall.advance(game,${at});playerStallUi.tickVisitors(${at})`);
assert(lane.innerHTML.includes('stall-visitor'),'a real visible visit produces the customer presentation');
const sameDomain=json('game.playerStall');
run(`playerStallUi.tickVisitors(${at+12000})`);assert.equal(lane.innerHTML,'');
assert.deepEqual(json('game.playerStall'),sameDomain,'animation cannot mutate purchases, RNG or receipts');
showing=false;run(`playerStallUi.tickVisitors(${at+13000})`);
at=run('game.playerStall.nextVisitAt');run(`playerStall.advance(game,${at});playerStallUi.tickVisitors(${at})`);
assert.equal(lane.innerHTML,'');showing=true;run(`playerStallUi.tickVisitors(${at+1000})`);
assert.equal(lane.innerHTML,'','hidden visits are not replayed on reopening');
ctx.document.hidden=true;run(`playerStallUi.tickVisitors(${at+2000})`);assert.equal(lane.innerHTML,'');
console.log('player stall trading: retained exposure, one-shot counter outcomes, receipts, migration, bounded history and visibility-only live customers passed',JSON.stringify(outcomes));
