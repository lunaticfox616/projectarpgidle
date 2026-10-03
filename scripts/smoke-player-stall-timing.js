const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const ctx = buildGameRuntime();
ctx.Math = Object.create(Math); ctx.Math.random = () => 0.999999;
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
const start = 1700000000000, minute = 60000, hour = 3600000;
run(`game=mergeDefaults({season:2,contentProgression:JSON.parse(JSON.stringify(defaultGame.contentProgression))});
    contentProgression.sync(game);contentProgression.purchase('craft',game);playerStall.advance(game,${start});
    {const gear=createItemFromBase(BASE_ITEM_DB.find(base=>base.id==='apocalypse_greatblade'),'rare',20,{affixTierCap:20});
    gear.stats=['flatDmg','weaponFlatDmgPct','attackPctDmg','aspd','crit','critDmg'].map(id=>
        rollAffixValueInTierRange(MOD_DB.find(mod=>mod.id===id),20,20));game.inventory=[normalizeItem(gear)];}`);
const template = json('game'), item = template.inventory[0];
const fair = run("itemAppraisal.quote(game.inventory[0],'goldenRule').fair"), cheap = Math.floor(fair / 2);
function shop(price, seed, negotiate = true) {
    run(`game=mergeDefaults(${JSON.stringify(template)});game.playerStall.rng=${seed};
        playerStall.list(game,game.inventory[0].id,${price},${start},{currency:'goldenRule',negotiate:${negotiate}});`);
}
shop(cheap, 10);
const before = json('game');
assert.equal(run(`playerStall.advance(game,${start + minute - 1})`),0);
assert.equal(run('game.playerStall.rng'),before.playerStall.rng);
assert.equal(run('game.playerStall.offerSequence'),0);
assert.equal(run('game.playerStall.listings[0].item.id'),item.id);
const probabilities = json(`PLAYER_STALL_CUSTOMERS.map(customer=>[${cheap},${fair}].map(price=>
    [59999,60000,600000].map(age=>playerStall.chance(game.playerStall.listings[0].item,price,customer,'goldenRule',age))))`);
for(const [discounted, ordinary] of probabilities) {
    assert.equal(discounted[0],0); assert.equal(ordinary[0],0);
    assert(discounted[1] > ordinary[1] * 3 && discounted[1] > 0 && ordinary[1] < 0.025);
    assert(ordinary[2] >= ordinary[1] && discounted[2] >= discounted[1]);
}
assert(probabilities.some(([, ordinary]) => ordinary[1] > 0), 'a fair ask attracts buyers whose taste and budget fit the item');

const rates = { cheap: { firstTwoMinutes:0, sold:0, offers:0 }, fair: { firstTwoMinutes:0, sold:0, offers:0, lowballOffers:0 } };
let lowOffer, lowOfferFixture, fairLowballFixture;
for(let index=1;index<=400;index++) {
    const seed=Math.imul(index,2654435761)>>>0;
    for(const [mode,price] of [['cheap',cheap],['fair',fair]]) {
        shop(price,seed);
        let sawOffer=false;
        for(let elapsed=minute;elapsed<=2*hour;elapsed+=minute) {
            run(`playerStall.advance(game,${start + elapsed})`);
            if(elapsed===2*minute && run('game.playerStall.goldProceeds')>0) rates[mode].firstTwoMinutes++;
            const offer=json('game.playerStall.listings[0]?.offer || null');
            if(offer) {
                assert(Number.isSafeInteger(offer.amount) && offer.amount >= 1 && offer.amount < price);
                if(!sawOffer) {
                    rates[mode].offers++;
                    if(mode==='fair' && offer.amount <= fair * 0.45) {
                        rates.fair.lowballOffers++;
                        if(!fairLowballFixture) fairLowballFixture={seed,minutes:elapsed/minute,amount:offer.amount};
                    }
                    sawOffer=true;
                }
                if(mode==='cheap' && !lowOffer) { lowOffer=json('game'); lowOfferFixture={seed,minutes:elapsed/minute}; }
            }
            if(!run('game.playerStall.listings.length')) break;
        }
        if(run('game.playerStall.goldProceeds')>0) rates[mode].sold++;
        assert.equal(run('game.playerStall.goldProceeds'),run('game.playerStall.listings.length')?0:price);
    }
}
assert(rates.cheap.firstTwoMinutes > rates.fair.firstTwoMinutes * 3);
assert(rates.cheap.firstTwoMinutes > 12 && rates.fair.firstTwoMinutes < 20);
assert(rates.cheap.offers > 0 && rates.cheap.offers < rates.cheap.sold / 3,'discounted asks sometimes receive a lower bid, usually a direct purchase');
assert(rates.cheap.sold >= 390 && rates.fair.sold >= 380,'pending bids cannot prevent fair/discounted automatic sales');
assert(rates.fair.lowballOffers > 0,'a normally priced item can receive an offer far below its fair value');

// Observe real proposals without direct sales censoring the amount distribution.
let lowballCount=0, regularCount=0, extreme;
for(let index=1;index<=400;index++) {
    shop(fair*10,Math.imul(index,2654435761)>>>0);
    run(`playerStall.advance(game,${start + 2*hour})`);
    const pending=json('game.playerStall.listings[0].offer');
    assert(pending,'an above-ceiling listing receives a genuine visitor offer within this seeded horizon');
    assert(pending.amount >= 1 && pending.amount < fair && pending.amount < fair*10);
    assert.equal(run('game.playerStall.goldProceeds'),0,'even an extreme low bid needs the seller to accept');
    if(pending.amount <= fair*0.45) {
        lowballCount++;
        assert(pending.amount >= Math.floor(fair*0.2));
        if(!extreme) extreme=json('game');
    } else {
        regularCount++;
        assert(pending.amount >= Math.floor(fair*0.65),'ordinary negotiations retain their usual range');
    }
}
assert(lowballCount > 20 && lowballCount < 120,'deep low bids are a minority of proposals, not the default price');
assert(regularCount > 280);
const extremeRow=extreme.playerStall.listings[0], extremeNow=extreme.playerStall.lastAt;
run(`game=mergeDefaults(${JSON.stringify(extreme)})`);
assert.equal(run(`playerStall.rejectOffer(game,${extremeRow.id},${extremeRow.offer.id},${extremeNow}).ok`),true);
assert.equal(run('game.playerStall.listings.length'),1);
assert.equal(run('game.playerStall.goldProceeds'),0);
run(`game=mergeDefaults(${JSON.stringify(extreme)})`);
assert.equal(run(`playerStall.acceptOffer(game,${extremeRow.id},${extremeRow.offer.id},${extremeNow}).ok`),true);
assert.equal(run('game.playerStall.goldProceeds'),extremeRow.offer.amount);
const goldBefore=run('game.currencies.goldenRule');
run('playerStall.collect(game);playerStall.collect(game)');
assert.equal(run('game.currencies.goldenRule'),goldBefore+extremeRow.offer.amount);

// A pending low bid competes with buy-now; a stale accept cannot pay twice or delete another listing.
assert(lowOffer);
run(`game=mergeDefaults(${JSON.stringify(lowOffer)});game.inventory=[{...JSON.parse(JSON.stringify(game.playerStall.listings[0].item)),id:999999}];
    playerStall.list(game,999999,1000000,${lowOffer.playerStall.lastAt},{currency:'goldenRule',negotiate:true});`);
const racing = json('game'), row = racing.playerStall.listings[0], end = racing.playerStall.lastAt + 2 * hour;
run(`playerStall.advance(game,${end})`); const direct = json('game.playerStall');
assert.equal(direct.goldProceeds,cheap); assert.equal(direct.listings.length,1);
for(const action of ['acceptOffer','rejectOffer']) {
    run(`game=mergeDefaults(${JSON.stringify(racing)})`);
    assert.equal(run(`playerStall.${action}(game,${row.id},${row.offer.id},${end}).ok`),false);
    assert.deepEqual(json('game.playerStall'),direct,'settlement invalidates the exact sold proposal and preserves other stock');
}
run(`game=mergeDefaults(${JSON.stringify(racing)});playerStall.advance(game,${end})`);
const revision=run('game.currencyDropVersion || 0');
assert.equal(run('playerStall.collect(game)'),cheap * 100);
assert.equal(run('playerStall.collect(game)'),0);
assert.equal(run('game.currencyDropVersion'),revision + 1);

// Migrate the old cadence once; existing proceeds, proposals, identities and clocks never replay.
const old=structuredClone(racing); old.playerStall.version=5;
old.playerStall.nextVisitAt=old.playerStall.lastAt+6*minute;
run(`game=mergeDefaults(${JSON.stringify(old)})`);
assert.equal(run('game.playerStall.version'),8);
assert.equal(run('game.playerStall.nextVisitAt'),old.playerStall.lastAt+minute);
assert.deepEqual(json('game.playerStall.listings'),old.playerStall.listings);
assert.equal(run('game.playerStall.rng'),old.playerStall.rng);
const migrated=json('game'); run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.deepEqual(json('game.playerStall'),migrated.playerStall);
run(`playerStall.advance(game,${end})`); const offline=json('game.playerStall');
run(`game=mergeDefaults(${JSON.stringify(migrated)})`);
for(let elapsed=10000;elapsed<=2*hour;elapsed+=10000) run(`playerStall.advance(game,${migrated.playerStall.lastAt + elapsed})`);
assert.deepEqual(json('game.playerStall'),offline,'age ramp and nonexclusive offers keep exact online/offline parity');
console.log('player stall timing: early discounted sales, deep low bids, nonexclusive offers, exact payouts and offline parity passed',JSON.stringify({rates,lowOfferFixture,fairLowballFixture,proposalDistribution:{lowballCount,regularCount,example:extremeRow.offer.amount,fair}}));
