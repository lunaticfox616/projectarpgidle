const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const ctx = buildGameRuntime(), start = 1700000000000, hour = 3600000;
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
ctx.Math = Object.create(Math); ctx.Math.random = () => 0.999999;
run(`function currencyFixture(base='apocalypse_greatblade',tier=20,extra=false) {
    const item=createItemFromBase(BASE_ITEM_DB.find(entry=>entry.id===base),'rare',20,{affixTierCap:20});
    const mods=extra?['flatDmg','weaponFlatDmgPct','attackPctDmg','aspd','crit','critDmg']:['flatDmg','aspd','crit'];
    item.stats=mods.map(id=>rollAffixValueInTierRange(MOD_DB.find(mod=>mod.id===id&&mod.slots.includes('무기')),tier,tier));
    return normalizeItem(item);
}`);
function fresh(count = 2) {
    run(`game=mergeDefaults({season:2,contentProgression:JSON.parse(JSON.stringify(defaultGame.contentProgression))});
        contentProgression.sync(game);contentProgression.purchase('craft',game);playerStall.advance(game,${start});
        game.inventory=Array.from({length:${count}},()=>currencyFixture());`);
}
function list(currency, price = 1, negotiate = false) {
    assert.equal(run(`playerStall.list(game,game.inventory[0].id,${price},${start},{currency:'${currency}',negotiate:${negotiate}}).ok`), true);
}
function restore(saved) { run(`game=mergeDefaults(${JSON.stringify(saved)})`); }
function unchangedFailure(code) {
    const before = json('game'); assert.equal(run(code), false); assert.deepEqual(json('game'), before);
}

// Each sale stores whole currency units while the scheduler keeps its numeric dew-equivalent signal.
fresh(); list('magicBud'); list('formlessDew');
assert.equal(run(`playerStall.advance(game,${start + 4 * hour})`), 1.125);
assert.deepEqual(json('[game.playerStall.proceeds,game.playerStall.budProceeds]'), [1,1]);
assert.deepEqual(json('game.playerStall.history.filter(event=>event.sold).map(event=>event.currency).sort()'), ['formlessDew','magicBud']);
run('game.currencies.formlessDew=7;game.currencies.magicBud=11;game.expertCurrencyGainPct=900');
const version = run('game.currencyDropVersion || 0');
assert.equal(run('playerStall.collect(game)'), 1.125);
assert.deepEqual(json('[game.currencies.formlessDew,game.currencies.magicBud]'), [8,12]);
assert.equal(run('game.currencyDropVersion'), version + 1, 'both payouts form one inventory revision');
assert.equal(run('playerStall.collect(game)'), 0);
assert.equal(run('game.currencyDropVersion'), version + 1);
fresh(1); list('magicBud');
assert.equal(run(`playerStall.advance(game,${start + 4 * hour})`), 0.125, 'a bud-only sale still triggers UI settlement');

// Collection checks both destination balances before moving either currency.
for (const currency of ['magicBud','formlessDew','goldenRule']) {
    fresh(0); run(`game.playerStall.proceeds=2;game.playerStall.budProceeds=3;game.playerStall.goldProceeds=1;game.currencies.${currency}=Number.MAX_SAFE_INTEGER`);
    const before = json('game'); assert.equal(run('playerStall.collect(game)'), 0); assert.deepEqual(json('game'), before);
}
fresh(0); run('game.playerStall.budProceeds=5');
assert.match(run('playerStall.loopBlockReason(game)'), /새싹 5개/);
const beforeLoop = json('game'); assert.equal(run('triggerSeasonReset({})'), false); assert.deepEqual(json('game'), beforeLoop);
assert.equal(run('playerStall.collect(game)'), 0.625);
assert.equal(run('playerStall.loopBlockReason(game)'), '');

// Invalid currency cannot advance visitors, take an item, cancel an offer, or reprice it.
fresh();
for (const currency of ['null','"ouroboros"','""','42','{}']) {
    unchangedFailure(`playerStall.list(game,game.inventory[0].id,1,${start + hour},{currency:${currency}}).ok`);
}
list('magicBud',1000000,true);
run(`playerStall.advance(game,${start + 4 * hour})`);
const pending = json('game'), row = pending.playerStall.listings[0];
assert(row.offer && Number.isSafeInteger(row.offer.amount));
for (const currency of ['null','"ouroboros"','{}']) unchangedFailure(`playerStall.reprice(game,${row.id},2,${start + 5 * hour},${currency})`);
assert.equal(run(`playerStall.moveListing(game,${row.id},3).ok`), true);
assert.deepEqual(json('game.playerStall.listings[0]'), {...row,slot:3}, 'visual movement preserves offer and denomination');
assert.equal(run(`playerStall.acceptOffer(game,${row.id},${row.offer.id},${start + 4 * hour}).ok`), true);
assert.deepEqual(json('[game.playerStall.proceeds,game.playerStall.budProceeds]'), [0,row.offer.amount]);
restore(pending);
assert.equal(run(`playerStall.reprice(game,${row.id},2,${start + 4 * hour},'formlessDew')`), true);
assert.deepEqual(json('[game.playerStall.listings[0].currency,game.playerStall.listings[0].offer,game.playerStall.listings[0].listedAt,game.playerStall.listings[0].priceChangedAt]'), ['formlessDew',null,start,start + 4 * hour]);
assert.deepEqual(json('[game.playerStall.proceeds,game.playerStall.budProceeds]'),[0,0],'currency changes never mint refunds');
restore(pending);
assert.equal(run(`playerStall.reprice(game,${row.id},3,${start + 4 * hour})`), true);
assert.equal(run('game.playerStall.listings[0].currency'), 'magicBud', 'omitting reprice currency preserves the existing denomination');

// Mixed offers are independent commitments, including after restoration and chunked settlement.
fresh(4);
for (const currency of ['magicBud','formlessDew','magicBud','formlessDew']) list(currency,1000000,true);
run(`playerStall.advance(game,${start + 12 * hour})`);
const mixed = json('game'); assert.equal(mixed.playerStall.listings.filter(entry=>entry.offer).length,4);
const legacyMixed = structuredClone(mixed); legacyMixed.playerStall.version=4; legacyMixed.playerStall.budgetMs=0;
restore(legacyMixed);
assert.equal(run('game.playerStall.listings.filter(entry=>entry.offer).length'),4, 'legacy credit no longer invalidates independent mixed offers');
restore(mixed);
for (const held of mixed.playerStall.listings) assert.equal(run(`playerStall.acceptOffer(game,${held.id},${held.offer.id},${start + 12 * hour}).ok`),true);
for(const currency of ['magicBud','formlessDew']) assert.equal(run(`game.playerStall[PLAYER_STALL_RULES.proceedsKeys['${currency}']]`),
    mixed.playerStall.listings.filter(entry=>entry.currency===currency).reduce((sum,entry)=>sum+entry.offer.amount,0));
restore(mixed); run(`playerStall.advance(game,${start + 20 * hour})`); const offline = json('game.playerStall');
restore(mixed);
for(let elapsed=60000;elapsed<=8*hour;elapsed+=60000) run(`playerStall.advance(game,${start + 12 * hour}+${elapsed})`);
assert.deepEqual(json('game.playerStall'),offline,'online/offline mixed holds consume exactly the same RNG and visits');

// Legacy history and listings remain dew; malformed denomination recovers the original equipment once.
const legacy = structuredClone(pending); legacy.playerStall.version = 2; legacy.playerStall.proceeds = 7;
delete legacy.playerStall.budProceeds;
legacy.playerStall.listings[0].item = run("currencyFixture('rusted_blade',10)");
legacy.playerStall.listings[0].price = 2; legacy.playerStall.listings[0].offer.amount = 1;
delete legacy.playerStall.listings[0].currency;
legacy.playerStall.history.push({at:start,sold:true,price:2,name:'이전 판매',customer:'이전 손님'});
legacy.playerStall.history.forEach(event=>{delete event.currency;});
restore(legacy);
assert.equal(run('game.playerStall.version'),8);
assert.deepEqual(json('[game.playerStall.proceeds,game.playerStall.budProceeds,game.playerStall.listings[0].currency]'),[7,0,'formlessDew']);
assert(run('game.playerStall.history.every(event=>event.currency==="formlessDew")'));
assert(run('game.playerStall.listings[0].offer'), 'an already agreed one-dew proposal is not cancelled only because demand became low');
const oldRow = json('game.playerStall.listings[0]');
assert.equal(run(`playerStall.acceptOffer(game,${oldRow.id},${oldRow.offer.id},${start + 4 * hour}).ok`),true);
const corrupt = structuredClone(pending); corrupt.playerStall.listings[0].currency = 'ouroboros';
restore(corrupt);
assert.equal(run('game.playerStall.listings.length'),0);
assert.equal(run(`game.inventory.filter(item=>item.id===${row.item.id}).length`),1);
assert.deepEqual(json('[game.playerStall.proceeds,game.playerStall.budProceeds]'),[0,0]);
const recovered = json('game'); restore(recovered); assert.deepEqual(json('game.playerStall'),recovered.playerStall);

// A low-value item has different sellability in the two currencies; high asking prices cannot summon a dew offer.
fresh(0); const ownerTemplate = json('game'), weak = json("currencyFixture('rusted_blade',8)");
let dewSales = 0, budSales = 0;
for(let seed=1;seed<=200;seed++) {
    for(const currency of ['formlessDew','magicBud']) {
        run(`game=${JSON.stringify(ownerTemplate)};game.inventory=[${JSON.stringify(weak)}];game.playerStall.rng=${seed}`);
        list(currency,1,false); run(`playerStall.advance(game,${start + 12 * hour})`);
        if (currency==='formlessDew') dewSales += run('game.playerStall.proceeds'); else budSales += run('game.playerStall.budProceeds');
    }
    run(`game=${JSON.stringify(ownerTemplate)};game.inventory=[${JSON.stringify(weak)}];game.playerStall.rng=${seed}`);
    list('formlessDew',seed%2?2:1000000,true); run(`playerStall.advance(game,${start + 12 * hour})`);
    assert.equal(run('game.playerStall.offerSequence'),0, 'overpricing sub-unit goods cannot bypass low demand via a 1-unit bid');
    assert.equal(run('game.playerStall.proceeds'),0);
}
assert(dewSales<10 && budSales>180, `low item sales across 200 fixed seeds: dew=${dewSales}, buds=${budSales}`);

// Exclude low-value goods before choosing the customer's favourite item; expensive bids are independent.
fresh(2); run("game.inventory[0]=currencyFixture('rusted_blade',10)");
list('formlessDew',1000000,true); list('formlessDew',1000000,true);
run(`playerStall.advance(game,${start + 4 * hour})`);
assert.equal(run('game.playerStall.listings[0].offer'),null);
assert(run('game.playerStall.listings[1].offer'),'a higher-ID worthwhile item is not hidden behind equally appealing low-value stock');
fresh(2); run("game.inventory[0]=currencyFixture('apocalypse_greatblade',20,true)");
list('formlessDew',1000000,true); list('formlessDew',1000000,true);
run(`playerStall.advance(game,${start + hour})`);
assert(run('game.playerStall.listings[0].offer'),'premium bids do not wait for accumulated credit');
assert(run('game.playerStall.listings[1].offer'),'a premium proposal cannot block the next visitor from bidding on other stock');

// Fresh stalls can trade high-value gear without empty-shop prewarming in every denomination.
function premiumShop() {
    fresh(1); run("game.inventory[0]=currencyFixture('apocalypse_greatblade',20,true)");
}
const premiumAt = start, premiumEnd = premiumAt + hour;
const highAsks = { goldenRule:27, formlessDew:2700, magicBud:13500 };
for (const [currency,price] of Object.entries(highAsks)) {
    premiumShop();
    assert.equal(run(`playerStall.list(game,game.inventory[0].id,${price},${premiumAt},{currency:'${currency}'}).ok`),true);
    const reporting = run(`playerStall.advance(game,${premiumEnd})`);
    assert.equal(reporting,price * run(`itemAppraisal.unitValue('${currency}')`));
    assert.equal(run(`game.playerStall[PLAYER_STALL_RULES.proceedsKeys['${currency}']]`),price);
    assert.equal(run('game.playerStall.history.find(event=>event.sold).currency'),currency);
}

premiumShop();
assert.equal(run(`playerStall.list(game,game.inventory[0].id,3,${premiumAt},{currency:'goldenRule'}).ok`),true);
assert.equal(run(`playerStall.advance(game,${premiumEnd})`),300);
run('game.playerStall.proceeds=2;game.playerStall.budProceeds=3;game.currencies.goldenRule=7;game.currencies.magicBud=11;game.currencies.formlessDew=13');
const triple = json('game'); restore(triple);
assert.deepEqual(json('game.playerStall'),triple.playerStall,'gold proceeds persist with both older balances');
assert.match(run('playerStall.loopBlockReason(game)'),/황금률 3개/);
const tripleRevision = run('game.currencyDropVersion || 0');
assert.equal(run('playerStall.collect(game)'),302.375);
assert.deepEqual(json('[game.currencies.goldenRule,game.currencies.formlessDew,game.currencies.magicBud]'),[10,15,14]);
assert.deepEqual(json('Object.values(PLAYER_STALL_RULES.proceedsKeys).map(key=>game.playerStall[key])'),[0,0,0]);
assert.equal(run('game.currencyDropVersion'),tripleRevision + 1);
assert.equal(run('playerStall.collect(game)'),0);

const offerAt = start, offerEnd = offerAt + hour;
premiumShop();
assert.equal(run(`playerStall.list(game,game.inventory[0].id,1000000,${offerAt},{currency:'goldenRule',negotiate:true}).ok`),true);
run(`playerStall.advance(game,${offerEnd})`);
const premium = json('game'), goldRow = premium.playerStall.listings[0];
assert(goldRow.offer?.amount >= 15,'a fresh stall receives a substantial multi-gold bid within one hour');
assert.equal(premium.playerStall.goldProceeds,0);
restore(premium); assert.deepEqual(json('game.playerStall'),premium.playerStall);
assert.equal(run(`playerStall.acceptOffer(game,${goldRow.id},${goldRow.offer.id},${offerEnd}).ok`),true);
assert.equal(run('game.playerStall.goldProceeds'),goldRow.offer.amount);
assert.equal(run(`playerStall.acceptOffer(game,${goldRow.id},${goldRow.offer.id},${offerEnd}).ok`),false);
restore(premium);
assert.equal(run(`playerStall.reprice(game,${goldRow.id},100,${offerEnd},'formlessDew')`),true);
assert.equal(run('game.playerStall.listings[0].offer'),null);
assert.equal(run('game.playerStall.goldProceeds'),0);
assert.equal(run(`playerStall.acceptOffer(game,${goldRow.id},${goldRow.offer.id},${offerEnd}).ok`),false,'currency changes invalidate the exact old gold proposal');
restore(premium); run(`playerStall.advance(game,${offerEnd + 8 * hour})`); const goldOffline = json('game.playerStall');
restore(premium);
for(let elapsed=60000;elapsed<=8*hour;elapsed+=60000) run(`playerStall.advance(game,${offerEnd}+${elapsed})`);
assert.deepEqual(json('game.playerStall'),goldOffline,'gold proposals have identical online/offline progression');

// High denominations cannot turn a rounded one-unit floor into a lottery for low-quality goods.
fresh(1); run("game.inventory[0]=currencyFixture('rusted_blade',8)");
assert.equal(run("itemAppraisal.quote(game.inventory[0],'goldenRule').ceiling"),0);
assert.equal(run("playerStall.chance(game.inventory[0],1,PLAYER_STALL_CUSTOMERS[1],'goldenRule')"),0);
list('goldenRule',1,true); run(`playerStall.advance(game,${start + 12 * hour})`);
assert.deepEqual(json('[game.playerStall.goldProceeds,game.playerStall.offerSequence,game.playerStall.listings.length]'),[0,0,1]);
assert.equal(run(`playerStall.reprice(game,1,1000000,${start + 12 * hour},'goldenRule')`),true);
run(`playerStall.advance(game,${start + 24 * hour})`);
assert.deepEqual(json('[game.playerStall.goldProceeds,game.playerStall.offerSequence]'),[0,0]);

const oldThree = structuredClone(triple); oldThree.playerStall.version=3; delete oldThree.playerStall.goldProceeds;
restore(oldThree);
assert.deepEqual(json('[game.playerStall.version,game.playerStall.proceeds,game.playerStall.budProceeds,game.playerStall.goldProceeds]'),[8,2,3,0]);
const migratedThree = json('game'); restore(migratedThree);
assert.deepEqual(json('game.playerStall'),migratedThree.playerStall,'v3 proceeds migrate once without re-crediting either old currency');
premiumShop(); list('goldenRule',27,true);
const freshListing = json('game');
let reference;
for(const credit of [0,Number.MAX_SAFE_INTEGER]) {
    const old = structuredClone(freshListing); old.playerStall.version=4; old.playerStall.budgetMs=credit;
    restore(old); run(`playerStall.advance(game,${start + hour})`);
    assert.equal(run('game.playerStall.goldProceeds'),27,'fair-priced premium gear sells with either legacy NPC credit balance');
    assert(!Object.hasOwn(json('game.playerStall'),'budgetMs'));
    if(reference) assert.deepEqual(json('game.playerStall'),reference,'legacy accumulated credit cannot change sale timing or proceeds');
    reference=json('game.playerStall');
}
console.log(`player stall currencies: three integer payouts, fresh premium sales/offers, atomic collection, independent visitors, legacy recovery and low-value anti-bypass passed (200 seeds: dew ${dewSales}, buds ${budSales})`);
