const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const mapSource = fs.readFileSync('data/maps.js', 'utf8');
const stateSource = fs.readFileSync('js/state.js', 'utf8');

const match = mapSource.match(/const TIME_RIFT_EQUIVALENT_CHAOS_DEPTHS = Object\.freeze\((\[[^;]+\])\);/);
assert(match, 'time-rift equivalent chaos depths must be explicit progression data');
const equivalentDepths = JSON.parse(match[1]);
assert.deepStrictEqual(equivalentDepths, [1, 6, 11, 16, 22, 29, 37, 47, 62, 90]);

const start = stateSource.indexOf('function getTimeRiftEquivalentChaosDepth');
const end = stateSource.indexOf('function getStarWedgeUnlockReady', start);
assert(start >= 0 && end > start, 'time-rift difficulty helpers must remain available');
const context = {
  Number,
  Math,
  TIME_RIFT_MAX_PRESSURE: 10,
  TIME_RIFT_EQUIVALENT_CHAOS_DEPTHS: equivalentDepths,
  getAbyssZoneTier() { return 8; }
};
vm.createContext(context);
vm.runInContext(stateSource.slice(start, end), context, { filename: 'time-rift-difficulty-helpers.js' });

const tiers = Array.from({ length: 10 }, (_, index) => context.getTimeRiftDifficultyTier(index + 1));
assert.strictEqual(tiers[0], 8, 'pressure 1 should use the chaos 1 combat tier');
assert.deepStrictEqual(tiers, [8, 13, 18, 23, 29, 36, 44, 54, 69, 97]);
const deltas = tiers.slice(1).map((tier, index) => tier - tiers[index]);
assert.ok(deltas.slice(0, 3).every(delta => delta === 5), 'early pressure should rise by about five tiers');
assert.ok(deltas[8] >= 25 && deltas[8] > deltas[7], 'pressure 9 to 10 should be an exceptional difficulty wall');

assert(stateSource.includes("let pressureMul = phase === 'past' ? 1 : 1.18;"), 'past pressure 1 should have no hidden multiplier while future stays slightly harder');
assert(stateSource.includes('tier: difficultyTier'), 'time-rift encounters must consume the nonlinear tier curve');
assert(stateSource.includes('equivalentChaosDepth: equivalentChaosDepth'), 'time-rift drops must retain their chaos-depth equivalent');

console.log('smoke-time-rift-difficulty passed');

// Follow the actual altar/inventory/encounter/save flow, including corrected unique slots.
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
runtime.showGameToast = () => {}; // DOM presentation boundary only.
const run = source => vm.runInContext(source, runtime);
const json = source => JSON.parse(run(`JSON.stringify(${source})`));
function resetRift() {
    run(`game=mergeDefaults({});window.game=game;game.season=50;game.loopCount=49;game.level=100;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);
        game.settings.autoEquipEmptySlots=false;game.settings.mapCompleteAction='stop';
        game.settings.showDeathNotice=false;Math.random=()=>0.99;`);
}
function prepareAltar() {
    resetRift();
    run(`changeZone(TIME_RIFT_PAST_ZONE_ID);startEncounterRun();finishEncounterRun();
        var unique=generateUniqueItem(10,null,'첫 계약');
        var rare=createItemFromBase(BASE_ITEM_DB.find(base=>base.id===unique.baseId),'rare',20,
            {dropRealm:'cosmos',affixTierCap:20,affixTierFloor:20});
        game.inventory=[unique,rare];
        selectForCrafting(unique.id,false);placeItemOnTimeAltar();
        selectForCrafting(rare.id,false);placeItemOnTimeAltar();
        game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;`);
}

resetRift();
run('game.season=TIME_RIFT_UNLOCK_LOOP-1;changeZone(TIME_RIFT_PAST_ZONE_ID)');
assert.equal(run('game.currentZoneId'), 0, 'past cannot be entered before its loop gate');
resetRift();
run('changeZone(TIME_RIFT_FUTURE_ZONE_ID)');
assert.equal(run('game.currentZoneId'), 0, 'an empty altar cannot start a future challenge');
prepareAltar();
assert.equal(run('game.timeRift.altarOpen'), true);
assert.equal(run('game.combatHalted'), true, 'past completion respects stop after returning');
assert.equal(run('game.inventory.length'), 0);
const original = json('game.timeRift');
assert(original.altarRare.stats.some(stat=>stat.tier===20), 'exercise T20 inheritance into a low-tier unique');
run('setTimeRiftPressure(3)');
assert.equal(run('game.timeRift.pressure'), original.pressure, 'altar locks difficulty until retrieved or settled');
run(`changeZone(TIME_RIFT_FUTURE_ZONE_ID);startEncounterRun();
    game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;
    handlePlayerDefeat(getZone(game.currentZoneId),getPlayerStats(),null,{noToast:true});`);
assert.deepEqual(json('game.timeRift.altarUnique'), original.altarUnique);
assert.deepEqual(json('game.timeRift.altarRare'), original.altarRare);
assert.equal(run('game.timeRift.fusionCount'), 0, 'defeat never consumes the offering');
run(`game.settings.autoEquipEmptySlots=true;changeZone(TIME_RIFT_FUTURE_ZONE_ID);Math.random=()=>0;finishEncounterRun();
    game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;`);
assert.equal(run('game.timeRift.fusionCount'), 1);
assert.equal(run('game.timeRift.altarUnique'), null);
assert.equal(run('game.timeRift.altarRare'), null);
const fused = json('game.inventory[0]');
assert(fused.fusedRelic);
assert.equal(fused.baseId, original.altarUnique.baseId);
assert.deepEqual(json('levelProgression.requirements(game.inventory[0])'),
    json('levelProgression.requirements(unique)'), 'fusion retains the unique base requirements');
assert.equal(fused.stats.filter(stat=>stat.fusedFromRare).length, original.altarRare.stats.length);
// Unique normalization represents an absent exceptional-roll backup as null, including compound stats.
const rolledSnapshots = [fused.stats.filter(stat=>stat.fusedFromRare), original.altarRare.stats.map(stat=>({...stat,fusedFromRare:true}))]
    .map(stats=>JSON.stringify(stats,(key,value)=>key==='originalVal' && value==null ? undefined : value));
assert.equal(rolledSnapshots[0],rolledSnapshots[1], 'saving fusion must not reroll or clamp inherited values');
assert.equal(run('game.combatHalted'), true, 'future completion respects stop after returning');
assert.equal(run('resolveTimeRiftFusion()'), null, 'a settled altar cannot grant again');
assert.equal(run('game.inventory.length'), 1);

prepareAltar();
run(`game.inventory=Array.from({length:500},()=>createItemFromBase(BASE_ITEM_DB[0],'normal',1));`);
const fullAltar = json('game.timeRift');
assert.equal(run('resolveTimeRiftFusion()'), null);
assert.deepEqual(json('game.timeRift'), fullAltar, 'no space preserves both items and pressure');
assert.equal(run('game.inventory.length'), 500);
run(`game.inventory=[];game.settings.autoEquipEmptySlots=true;game.settings.autoSalvageEnabled=true;game.settings.autoSalvageRarities.unique=true;
    game.settings.autoSalvageRarities.rare=true;retrieveTimeAltarItems();retrieveTimeAltarItems();`);
assert.equal(run('game.inventory.length'), 2, 'retrieval ignores salvage and cannot duplicate');
assert.equal(run('game.timeRift.altarOpen'), false);

// An old glove unique can become a helmet on load; its paired rare glove must not be consumed.
resetRift();
run(`var oldUnique=generateUniqueItem(30,null,'타락각 투구');delete oldUnique.uniqueEquipmentVersion;
    oldUnique.slot='장갑';oldUnique.baseId='hide_gloves';oldUnique.baseName='가죽 장갑';
    game.timeRift.altarOpen=true;game.timeRift.altarUnique=oldUnique;
    game.timeRift.altarRare=createItemFromBase(BASE_ITEM_DB.find(base=>base.id==='hide_gloves'),'rare',10);
    game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;`);
assert.equal(run('game.timeRift.altarUnique.slot'), '투구');
const mismatched = json('game.timeRift');
run('changeZone(TIME_RIFT_FUTURE_ZONE_ID)');
assert.equal(run('game.currentZoneId'), 0, 'migrated mismatched offerings must block entry');
assert.equal(run('resolveTimeRiftFusion()'), null, 'already active old saves cannot fuse mismatched slots');
assert.deepEqual(json('game.timeRift'), mismatched);
run('retrieveTimeAltarItems()');
assert.equal(run('game.inventory.length'), 2);
assert.deepEqual(json('game.inventory.map(item=>item.slot).sort()'), ['장갑','투구']);
console.log('time-rift altar, failure, inventory and migration flow passed');
