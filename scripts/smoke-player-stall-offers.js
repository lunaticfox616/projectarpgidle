const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const ctx = buildGameRuntime();
ctx.Math = Object.create(Math); ctx.Math.random = () => 0.999999;
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
const start = 1700000000000, hour = 3600000, minute = 60000;
function fresh(count = 1, price = 1000000, negotiate = true) {
    run(`game=mergeDefaults({season:2,contentProgression:JSON.parse(JSON.stringify(defaultGame.contentProgression))});
        contentProgression.sync(game); contentProgression.purchase('craft',game);
        playerStall.advance(game,${start});
        game.inventory=Array.from({length:${count}},()=>createItemFromBase(BASE_ITEM_DB.find(base=>base.id==='apocalypse_greatblade'),'rare',20,{affixTierCap:20}));
        game.inventory.forEach(item=>{item.stats=['flatDmg','aspd','crit'].map(id=>rollAffixValueInTierRange(MOD_DB.find(mod=>mod.id===id&&mod.slots.includes('무기')),20,20));});
        game.inventory=game.inventory.map(item=>normalizeItem(item));
        game.inventory.slice().forEach(item=>playerStall.list(game,item.id,${price},${start},${negotiate}));`);
}
function offered(count = 1) {
    fresh(count);
    run(`playerStall.advance(game,${start + 4 * hour})`);
    assert.equal(run('game.playerStall.listings.filter(row=>row.offer).length'), count, 'real seeded visits create offers');
    return json('game');
}
function restore(saved) { run(`game=mergeDefaults(${JSON.stringify(saved)})`); }

fresh();
run(`playerStall.advance(game,${start + minute - 1})`);
assert.equal(run('game.playerStall.offerSequence'), 0, 'offers obey the same minimum viewing time as purchases');
fresh(1, 1000000, false);
run(`playerStall.advance(game,${start + 12 * hour})`);
assert.equal(run('game.playerStall.offerSequence'), 0, 'buy-now-only listings never receive unsolicited bids');
fresh(1, 1, true);
run(`playerStall.advance(game,${start + 4 * hour})`);
assert.equal(run('game.playerStall.proceeds'), 1, 'one-dew listings sell normally instead of zero-price offers');

const saved = offered(), row = saved.playerStall.listings[0], offer = row.offer, now = saved.playerStall.lastAt;
assert(offer.amount > 0 && offer.amount < row.price);
assert(offer.amount <= run('itemAppraisal.quote(game.playerStall.listings[0].item).ceiling'));
assert.equal(saved.playerStall.proceeds, 0, 'a proposal does not pay the seller before acceptance');
assert(!Object.hasOwn(saved.playerStall,'budgetMs'), 'new stalls have no accumulated buyer credit');
const unchanged = json('game');
assert.equal(run(`playerStall.acceptOffer(game,${row.id},${offer.id + 100},${now}).ok`), false);
assert.equal(run(`playerStall.acceptOffer(game,${row.id},${offer.id},${start - 1}).ok`), false);
assert.deepEqual(json('game'), unchanged, 'stale IDs and rollback clocks cannot alter state');
run('game.isBackgroundCalculation=true');
assert.equal(run(`playerStall.acceptOffer(game,${row.id},${offer.id},${now}).ok`), false);
run('game.isBackgroundCalculation=false');
assert.equal(run(`playerStall.acceptOffer(game,${row.id},${offer.id},${now}).ok`), true);
assert.equal(run('game.playerStall.listings.length'), 0);
assert.equal(run('game.inventory.length'), 0, 'the escrow item is sold, not returned to the owner');
assert.equal(run('game.playerStall.proceeds'), offer.amount);
assert.deepEqual(json('game.equipment'), unchanged.equipment);
assert.equal(run(`playerStall.acceptOffer(game,${row.id},${offer.id},${now}).ok`), false);
run('game.expertCurrencyGainPct=900;game.currencies.formlessDew=7');
assert.equal(run('playerStall.collect(game)'), offer.amount);
assert.equal(run('playerStall.collect(game)'), 0);
assert.equal(run('game.currencies.formlessDew'), 7 + offer.amount);

restore(saved);
assert.deepEqual(json('game.playerStall'), saved.playerStall, 'pending proposals survive an ordinary save round trip');
run(`playerStall.advance(game,${now + 8 * hour})`);
const offline = json('game.playerStall');
restore(saved);
for (let elapsed = minute; elapsed <= 8 * hour; elapsed += minute) run(`playerStall.advance(game,${now + elapsed})`);
assert.deepEqual(json('game.playerStall'), offline, 'online/offline chunking agrees including held items and visits');

restore(saved);
assert.equal(run(`playerStall.acceptOffer(game,${row.id},${offer.id},${offer.expiresAt - 1}).ok`), true, 'last millisecond before expiry is valid');
restore(saved);
assert.equal(run(`playerStall.acceptOffer(game,${row.id},${offer.id},${offer.expiresAt}).ok`), false, 'expiry is exclusive');
assert.equal(run('game.playerStall.listings[0].offer'), null);
assert.equal(run('game.playerStall.proceeds'), 0);
restore(saved);
run(`playerStall.advance(game,${now + 72 * hour})`);
assert.equal(run('game.playerStall.listings[0].offer'), null, 'a capped offline settlement still expires against the actual return time');
assert.equal(run('game.playerStall.proceeds'), 0, 'expired proposals are never auto-accepted');

restore(saved);
assert.equal(run(`playerStall.rejectOffer(game,${row.id},${offer.id},${now}).ok`), true);
assert.equal(run('game.playerStall.proceeds'),0, 'rejection cannot create a refund or sales proceeds');
assert.equal(run('game.playerStall.listings.length'), 1);
const rng = run('game.playerStall.rng');
run(`playerStall.setNegotiation(game,${row.id},false,${now}); playerStall.setNegotiation(game,${row.id},true,${now});
    playerStall.withdraw(game,${row.id});playerStall.list(game,game.inventory[0].id,1000000,${now},true)`);
assert.equal(run('game.playerStall.rng'), rng, 'UI actions cannot reroll the buyer RNG');
assert.equal(run('game.playerStall.nextOfferAt'), now + 30 * minute, 'relisting or toggling cannot clear the global cooldown');
run(`playerStall.advance(game,${now + 29 * minute})`);
assert.equal(run('game.playerStall.listings[0].offer'), null);
restore(saved);
assert.equal(run(`playerStall.reprice(game,${row.id},-1,${now})`), false);
assert.deepEqual(json('game.playerStall.listings[0].offer'), offer, 'invalid price edits preserve the proposal');
assert.equal(run(`playerStall.reprice(game,${row.id},99,${now})`), true);
assert.equal(run('game.playerStall.listings[0].offer'), null);
assert.equal(run('game.playerStall.proceeds'),0);
restore(saved);
run(`game.inventory=Array.from({length:250},()=>createItemFromBase(BASE_ITEM_DB.find(base=>base.slot==='갑옷'),'normal',1))`);
assert.equal(run(`playerStall.withdraw(game,${row.id}).ok`), false);
assert.deepEqual(json('game.playerStall.listings[0].offer'), offer, 'failed recovery into a full inventory keeps both escrow and its offer');
run('game.inventory=[]');
assert.equal(run(`playerStall.withdraw(game,${row.id}).ok`), true);
assert.equal(run('game.inventory[0].id'), row.item.id);
assert.equal(run('game.playerStall.proceeds'),0);

const many = offered(4);
run(`playerStall.advance(game,${start + 12 * hour})`);
for (const held of many.playerStall.listings) assert.equal(run(`playerStall.acceptOffer(game,${held.id},${held.offer.id},${start + 12 * hour}).ok`), true);
const total = many.playerStall.listings.reduce((sum, held) => sum + held.offer.amount, 0);
assert.equal(run('game.playerStall.proceeds'), total);

// Save-boundary corruption cancels only offers, preserving their original equipment and proceeds.
for (const mutation of [o=>o.amount=1000000, o=>o.customerId=-1, o=>o.expiresAt++, o=>o.id=NaN]) {
    const damaged = structuredClone(saved); mutation(damaged.playerStall.listings[0].offer); restore(damaged);
    assert.equal(run('game.playerStall.listings[0].offer'), null);
    assert.equal(run('game.playerStall.listings[0].item.id'), row.item.id);
    assert.equal(run('game.playerStall.proceeds'), saved.playerStall.proceeds);
}
const legacyCredit = structuredClone(many);
legacyCredit.playerStall.version = 4;
legacyCredit.playerStall.budgetMs = 0;
restore(legacyCredit);
assert.equal(run('game.playerStall.listings.filter(held=>held.offer).length'),4,'valid independent offers survive even an empty legacy NPC wallet');
assert.equal(run('game.playerStall.proceeds'),0,'discarded NPC credit never becomes player proceeds');
assert(!Object.hasOwn(json('game.playerStall'),'budgetMs'));
const migratedCredit = json('game'); restore(migratedCredit);
assert.deepEqual(json('game.playerStall'),migratedCredit.playerStall,'credit retirement is idempotent');
const legacy = structuredClone(saved);
delete legacy.playerStall.listings[0].negotiate; delete legacy.playerStall.listings[0].offer;
delete legacy.playerStall.offerSequence; delete legacy.playerStall.nextOfferAt; legacy.playerStall.version=1;
restore(legacy);
assert.equal(run('game.playerStall.version'), 8);
assert.equal(run('game.playerStall.listings[0].negotiate'), false, 'old buy-now listings keep their previous selling behavior');
assert.equal(run('game.playerStall.offerSequence'), 0);

fresh(1, 100);
run(`playerStall.advance(game,${start + 4 * hour})`);
const modestAskOffer = json('game.playerStall.listings[0].offer');
fresh(1, 1000000);
run(`playerStall.advance(game,${start + 4 * hour})`);
assert.deepEqual(json('game.playerStall.listings[0].offer'), modestAskOffer, 'raising an already excessive asking price does not increase the same buyer offer');
restore(saved);
run(`playerStall.rejectOffer(game,${row.id},${offer.id},${now});playerStall.advance(game,${now + 4 * hour})`);
const replacement = json('game.playerStall.listings[0].offer');
assert(replacement && replacement.id > offer.id);
assert.equal(run(`playerStall.acceptOffer(game,${row.id},${offer.id},${now + 4 * hour}).ok`), false);
assert.deepEqual(json('game.playerStall.listings[0].offer'), replacement, 'an old accept button cannot accept a fresh offer on the same listing');
assert.equal(run(`playerStall.setNegotiation(game,${row.id},false,${now + 4 * hour})`), true);
run(`playerStall.advance(game,${now + 12 * hour})`);
assert.equal(run('game.playerStall.listings[0].offer'), null);

const heldTwo = offered(2);
run(`game.inventory=[{...JSON.parse(JSON.stringify(game.playerStall.listings[0].item)),id:999999}];
    playerStall.list(game,999999,3,${now},false);playerStall.advance(game,${now + hour});`);
assert.equal(run('game.playerStall.proceeds'), 3, 'independent buy-now customers can purchase while other items await offer responses');
assert.equal(run('game.playerStall.listings.filter(entry=>entry.offer).length'), 2);
for(const held of heldTwo.playerStall.listings) assert.equal(run(`playerStall.acceptOffer(game,${held.id},${held.offer.id},${now + hour}).ok`),true);
assert.equal(run('game.playerStall.proceeds'),3 + heldTwo.playerStall.listings.reduce((sum,entry)=>sum+entry.offer.amount,0));
console.log('player stall offers: independent customers, escrow, expiry, offline parity, cooldown, payout and legacy credit retirement passed');
