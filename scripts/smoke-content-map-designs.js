// 콘텐츠별 맵 디자인 (js/content-maps.js, docs/atlas-pinnacles-20261002.md 1절): progress-bar contents walk the painted act maps of
// their mood (chaos through all ten, realm ruins and stars, tower isles over the void, underworld trunk and roots, the rift's courtyard in two
// eras), boss contents start at an arena gate, wave and timed contents keep their board; the real combat loop clears them, and wide-map loot
// escrow holds wallet-only currencies.
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { run } = fixture(71);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));
let tick = 0;
const advance = () => run(`coreLoop(${1800000000000 + (++tick) * 100})`);
function setup(extra = '') {
    run(`game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',level:100,
        combatTimeMs:1800000000000,settings:{pauseGameOnOverlay:false,mapCompleteAction:'repeatZone',showDeathNotice:false}});
        game.season=35;game.loopCount=34;game.maxZoneId=29;game.chaosRealm.unlocked=true;game.loopProgressCurrent.chaos20Cleared=true;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        game.equipment['무기']={id:90001,slot:'무기',name:'검사',rarity:'rare',baseStats:[{id:'flatDmg',val:1e12},{id:'flatHp',val:1e12}],stats:[]};
        ${extra};game.playerHp=getPlayerStats().maxHp;`);
}
setup();

// ---------------------------------------------------------------- which content walks which map
const designs = copy(`(() => {
    const look = id => { const zone = getZone(id); return zone && zone.exploration ? [zone.exploration.act, !!zone.exploration.arena, zone.packExtra || 0] : null; };
    game.chaosRealm.currentFloor = 3; ensureSkyTowerState().currentFloor = 4; game.underworldProgress.currentFloor = 2;
    return {
        chaos: look(getAbyssZoneIdForDepth(5)), deep: look(getAbyssZoneIdForDepth(24)), realm: look(CHAOS_REALM_ZONE_ID), sky: look(SKY_TOWER_ZONE_ID),
        under: look(UNDERWORLD_ZONE_ID), past: look(TIME_RIFT_PAST_ZONE_ID), future: look(TIME_RIFT_FUTURE_ZONE_ID), lab: look(LABYRINTH_ZONE_ID),
        trial: look('trial_1'), boss: look(SEASON_BOSS_ZONES[0].id), rival: look('rival_overheat'), sea: look('pinnacle_leviathan'), meteor: look(METEOR_FALL_ZONE_ID),
        woodsman: look(OUTSIDE_CHAOS_ZONE_ID), breach: look('grand_breach_run'), echo: look(WOODSMAN_ECHO_ZONE_ID), ocean: look(OCEAN_ZONE_ID)
    };
})()`);
assert.deepEqual(designs.chaos, [8, false, 3], 'chaos 5 walks the fifth map of the cycle with dense rooms');
assert.deepEqual(designs.deep, [5, false, 4], 'deep chaos packs its rooms tighter still');
assert.deepEqual(designs.realm.slice(0, 2), [8, false], 'the chaos realm walks ruins, stars and veils');
assert.deepEqual(designs.sky.slice(0, 2), [3, false], 'the sky tower climbs isles over the void');
assert.deepEqual(designs.under.slice(0, 2), [1, false], 'the underworld walks the trunk, the roots and the black water');
assert.deepEqual([designs.past[0], designs.future[0]], [2, 6], 'the rift shows one courtyard in two eras');
assert.equal(designs.lab[0], 4, 'the labyrinth starts in the bookshelf maze');
assert.deepEqual(designs.trial.slice(0, 2), [5, false], 'a class trial walks elite-led rooms before its guardian');
for (const key of ['boss', 'rival', 'sea', 'meteor']) assert.equal(designs[key][1], true, `${key} starts at an arena gate`);
assert.deepEqual([designs.boss[0], designs.rival[0], designs.sea[0]], [7, 6, 2], 'arenas take the map of their content look');
for (const key of ['woodsman', 'breach', 'echo', 'ocean']) assert.equal(designs[key], null, `${key} keeps its board (waves, timers, depth)`);
assert.equal(run('SEASON_BOSS_ZONES[0].exploration === undefined'), true, 'the data rows stay untouched');

const twice = copy('[getZone(getAbyssZoneIdForDepth(5)).exploration.seed, (game.nextEnemyId += 5, getZone(getAbyssZoneIdForDepth(5)).exploration.seed)]');
assert.notEqual(twice[0], twice[1], 'every chaos run seeds new packs on its map');

// ---------------------------------------------------------------- the real loop clears them
function clearsVia(label, entry, probe) {
    setup(entry);
    const before = run(probe);
    for (let n = 0; n < 3000; n++) {
        advance();
        if (run(probe) !== before) return run('game.loopDeaths');
    }
    throw new Error(`${label} never progressed`);
}
assert.equal(clearsVia('chaos', `game.currentZoneId=getAbyssZoneIdForDepth(5)`, 'game.abyssClearedDepths.includes(5)'), 0, 'a chaos shaft is cleared through the loop');
assert.equal(clearsVia('realm', `game.chaosRealm.currentFloor=3;game.chaosRealm.highestFloor=3;game.currentZoneId=CHAOS_REALM_ZONE_ID`, 'game.chaosRealm.highestFloor'), 0);
assert.equal(clearsVia('sky', `ensureSkyTowerState().unlocked=true;game.skyTower.currentFloor=4;game.skyTower.highestFloor=4;game.currentZoneId=SKY_TOWER_ZONE_ID`, 'game.skyTower.highestFloor'), 0);
assert.equal(clearsVia('under', `game.underworldProgress.currentFloor=2;game.underworldProgress.highestFloor=2;game.currentZoneId=UNDERWORLD_ZONE_ID`, 'game.underworldProgress.highestFloor'), 0);
assert.equal(clearsVia('trial', `game.currentZoneId='trial_1'`, 'game.completedTrials.length'), 0, 'a trial corridor is won through the loop');

// ---------------------------------------------------------------- wide-map loot holds wallet-only currencies
setup(`game.currentZoneId=getAbyssZoneIdForDepth(24);game.abyssEndlessDepth=24`);
for (let n = 0; n < 200 && run('!game.actExploration || !!game.actExploration.arrival'); n++) advance();
run(`awardEnemyLootCurrency('colonyTrace', 1);`);
assert.equal(copy('game.currencies.colonyTrace'), 1, 'a deep-chaos colony trace is granted immediately');
const restored = copy('mergeDefaults(JSON.parse(serializeSaveState(game))).currencies.colonyTrace');
assert.equal(restored, 1, 'and survives a reload');
console.log('content map designs: chaos/deep/realm/sky/underworld/rift/labyrinth on painted act maps, arena gates, boards kept, real clears, escrow: OK');
