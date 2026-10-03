const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const ctx = buildGameRuntime(), start = 1700000000000, hour = 3600000;
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
ctx.Math = Object.create(Math); ctx.Math.random = () => 0.999999;
let warnings = [];
ctx.console.warn = text => warnings.push(text);
function fresh(count = 5) {
    warnings = [];
    run(`game=mergeDefaults({season:2,contentProgression:JSON.parse(JSON.stringify(defaultGame.contentProgression))});
        contentProgression.sync(game); contentProgression.purchase('craft',game);
        playerStall.advance(game,${start});
        game.inventory=Array.from({length:${count}},()=>createItemFromBase(BASE_ITEM_DB.find(base=>base.id==='apocalypse_greatblade'),'rare',20,{affixTierCap:20}));
        game.inventory.forEach(item=>{item.stats=['flatDmg','aspd','crit'].map(id=>rollAffixValueInTierRange(MOD_DB.find(mod=>mod.id===id&&mod.slots.includes('무기')),20,20));});
        game.inventory=game.inventory.map(item=>normalizeItem(item));`);
}
function list(options, price = 1000000, now = start) {
    return run(`playerStall.list(game,game.inventory[0].id,${price},${now},${options}).ok`);
}
function restore(saved) { run(`game=mergeDefaults(${JSON.stringify(saved)})`); }
function failedWithoutMutation(code, message) {
    const before = json('game');
    assert.equal(run(code), false, message);
    assert.deepEqual(json('game'), before, `${message}: no partial state, visit, or ownership changes`);
}

fresh();
assert.equal(list('{negotiate:true,slot:3}'), true);
assert.equal(list('false'), true);
assert.equal(list('{negotiate:false,slot:1}'), true);
assert.deepEqual(json('game.playerStall.listings.map(row=>[row.slot,row.negotiate])'), [[3,true],[0,false],[1,false]],
    'explicit positions and legacy boolean auto-placement coexist');
const listed = json('game.playerStall.listings');
assert.equal(run(`playerStall.withdraw(game,${listed[1].id}).ok`), true);
assert.deepEqual(json('game.playerStall.listings.map(row=>row.slot)'), [3,1], 'removing a row leaves other positions fixed');
assert.equal(list('true'), true);
assert.deepEqual(json('game.playerStall.listings.map(row=>row.slot)'), [3,1,0], 'auto-placement reuses the first empty physical position');
const saved = json('game'); restore(saved);
assert.deepEqual(json('game.playerStall'), saved.playerStall, 'positions survive ordinary save restoration');

// Reject bad destinations before advancing time: even a later visit must not occur on a failed placement.
for (const slot of ['3','-1','4','1.5','NaN','Infinity','"2"','null','undefined']) {
    failedWithoutMutation(`playerStall.list(game,game.inventory[0].id,1,${start + 4 * hour},{negotiate:true,slot:${slot}}).ok`,
        `invalid or occupied destination ${slot}`);
}
failedWithoutMutation(`playerStall.list(game,-987,1,${start + hour},{slot:2}).ok`, 'stale inventory item');
assert.equal(list('{slot:2}'), true);
failedWithoutMutation(`playerStall.list(game,game.inventory[0].id,1,${start + hour},true).ok`, 'full stall');
const full = json('game.playerStall');
failedWithoutMutation(`playerStall.moveListing(game,${full.listings[0].id},1).ok`, 'moving onto another item');
failedWithoutMutation('playerStall.moveListing(game,-99,0).ok', 'stale listing');

// Moving an active offer changes exactly one display field, including after save/reload.
fresh(2); assert.equal(list('{negotiate:true,slot:0}'), true);
run(`playerStall.advance(game,${start + 4 * hour})`);
const pending = json('game'), row = pending.playerStall.listings[0];
assert(row.offer, 'actual seeded visits create a held offer');
assert.equal(run(`playerStall.moveListing(game,${row.id},3).ok`), true);
pending.playerStall.listings[0].slot = 3;
assert.deepEqual(json('game'), pending, 'movement preserves age, offer, inventory, visits, wallet, RNG and cooldown');
assert.equal(run(`playerStall.moveListing(game,${row.id},3).ok`), true);
assert.deepEqual(json('game'), pending, 'moving to the same position is an idempotent no-op');
for (const slot of ['-1','4','1.5','"1"','null','NaN']) {
    failedWithoutMutation(`playerStall.moveListing(game,${row.id},${slot}).ok`, `bad move destination ${slot}`);
}
for (const key of ['woodsmanBuildLock','isBackgroundCalculation']) {
    run(`game.${key}=true`);
    failedWithoutMutation(`playerStall.moveListing(game,${row.id},1).ok`, `blocked movement during ${key}`);
    run(`game.${key}=false`);
}
restore(pending);
assert.equal(run(`playerStall.acceptOffer(game,${row.id},${row.offer.id},${pending.playerStall.lastAt}).ok`), true);
assert.equal(run('game.playerStall.proceeds'), row.offer.amount, 'the original offer remains actionable after repositioning');

fresh(2); assert.equal(list('{slot:0}', 1), true); assert.equal(list('{slot:3}', 1000000), true);
run(`playerStall.advance(game,${start + 8 * hour})`);
assert.equal(run('game.playerStall.proceeds'), 1, 'the cheap item sells through real NPC simulation');
assert.deepEqual(json('game.playerStall.listings.map(row=>row.slot)'), [3], 'a sale does not compact the surviving display');
failedWithoutMutation('playerStall.moveListing(game,1,0).ok', 'a sold item cannot move or reappear');

// Slot-less legacy saves migrate deterministically; valid saved positions win over missing/corrupt ones.
fresh(4);
for (let index = 0; index < 4; index++) assert.equal(list('true'), true);
const four = json('game');
const legacy = structuredClone(four); legacy.playerStall.listings.forEach(entry => { delete entry.slot; });
warnings = []; restore(legacy);
assert.deepEqual(json('game.playerStall.listings.map(entry=>entry.slot)'), [0,1,2,3]);
assert.equal(warnings.length, 0, 'ordinary legacy position migration is not reported as corruption');
const migrated = json('game'); restore(migrated);
assert.deepEqual(json('game.playerStall'), migrated.playerStall, 'migration is idempotent');
const damaged = structuredClone(four);
delete damaged.playerStall.listings[0].slot;
damaged.playerStall.listings[1].slot = 0;
damaged.playerStall.listings[2].slot = 0;
damaged.playerStall.listings[3].slot = 99;
warnings = []; restore(damaged);
assert.deepEqual(json('game.playerStall.listings.map(entry=>entry.slot)'), [1,0,2,3]);
assert.equal(run('game.inventory.length'), 0, 'repairing duplicate/out-of-bounds positions never discards gear');
assert(warnings.some(text => text.includes('진열 위치')), 'corrupt positions report recovery');

// More than four rows recover actual excess gear, including when the inventory is already full.
const excess = structuredClone(four);
fresh(251); const inventory = json('game.inventory');
excess.inventory = inventory.slice(0,250);
excess.playerStall.listings.push({ ...structuredClone(excess.playerStall.listings[0]), id: 2000, slot: 3, item: inventory[250] });
excess.playerStall.sequence = 2000;
warnings = []; restore(excess);
assert.equal(run('game.playerStall.listings.length'), 4);
assert.equal(run('game.inventory.length+game.equipmentTemporaryStorage.length'), 251, 'save recovery preserves gear beyond ordinary inventory capacity');
assert.equal(run(`[...game.inventory,...game.equipmentTemporaryStorage].filter(item=>item.id===${inventory[250].id}).length`), 1);
assert(warnings.some(text => text.includes('초과한 장비')), 'overflow recovery reports where the item went');
const recovered = json('game'); restore(recovered);
assert.deepEqual(json('game.playerStall'), recovered.playerStall, 'repeated loads preserve the repaired physical display');
assert.deepEqual(json('[...game.inventory,...game.equipmentTemporaryStorage].map(item=>item.id).sort((a,b)=>a-b)'),
    [...recovered.inventory,...recovered.equipmentTemporaryStorage].map(item=>item.id).sort((a,b)=>a-b), 'repeated loads never duplicate recovered equipment');
console.log('player stall placement: stable slots, atomic failures, move with held offers, legacy migration and overflow recovery passed');
