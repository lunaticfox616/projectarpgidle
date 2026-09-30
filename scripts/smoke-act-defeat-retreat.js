// Early-game death spiral (review 2026-10-01): story-act defeats under automatic progression retreat one act and wait
// for ACT_RETREAT_LEVELS levels; the death report states the discarded expedition loot; rooms between fights recover
// life; the death report never pauses the idle loop.
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { runtime, run } = fixture(71);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));
let tick = 0;
function fresh(zoneId, settings = {}, extra = '') {
    Object.assign(runtime, { testZone: zoneId, testSettings: settings }); tick = 0;
    run(`game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero2',selectedClassId:'warrior',level:5,
        currentZoneId:testZone,maxZoneId:Math.max(1,testZone),combatTimeMs:1800000000000,
        settings:{pauseGameOnOverlay:false,showDeathNotice:false,autoEquipEmptySlots:false,...testSettings}});
        game.playerHp=getPlayerStats().maxHp;contentProgression.sync();${extra}`);
}
function advance(count = 1) {
    for (let i = 0; i < count; i++) run(`coreLoop(${1800000000000 + (++tick) * 100})`);
}
function until(condition, message) {
    const limit = tick + 4000;
    while (tick < limit && !run(condition)) advance();
    assert.ok(run(condition), message);
}

// A defeat in act 2 under automatic progression: the loot held by the expedition is counted, the act is left for act 1,
// and the report says both.
fresh(1, { mapCompleteAction: 'nextZone' });
run(`ensureEncounterRun();
    actExplorationLoot.capture(game,game.actExploration,()=>{awardEnemyLootCurrency('goldenRule',2);
        actExplorationLoot.delivery(game,'equipment').store(createItemFromBase(BASE_ITEM_DB.find(base=>base.slot==='무기'),'magic',3));});
    game.playerHp=0;`);
advance();
assert.equal(run('game.currentZoneId'), 0, 'automatic progression falls back to the previous act');
assert.deepEqual(copy('game.actRetreat'), { frontierZoneId: 1, level: 5 });
const report = copy('game.lastDeathLog');
assert.equal(report.lostItems, 1, 'the discarded expedition item is reported');
assert.equal(report.lostCurrencies, 1, 'the discarded currency kind is reported');
assert.equal(report.retreatZoneName, run('getZone(0).name'));
assert.equal(run('game.loopDeaths'), 1);
assert.deepEqual(copy('mergeDefaults(JSON.parse(serializeSaveState(game))).actRetreat'), { frontierZoneId: 1, level: 5 }, 'the retreat survives a reload');

// A player who chose to stay (repeat), and act 1 itself, never retreat.
fresh(1, { mapCompleteAction: 'repeatZone' });
run('ensureEncounterRun();game.playerHp=0;');
advance();
assert.equal(run('game.currentZoneId'), 1);
assert.equal(run('game.actRetreat'), null);
fresh(0, { mapCompleteAction: 'nextZone' });
run('ensureEncounterRun();game.playerHp=0;');
advance();
assert.equal(run('game.currentZoneId'), 0);
assert.equal(run('game.actRetreat'), null);

// While retreating, finishing act 1 repeats it until the level rose by ACT_RETREAT_LEVELS; then the frontier resumes.
const strong = `game.equipment['무기']={id:90001,slot:'무기',name:'검사용 검',rarity:'rare',
    baseStats:[{id:'flatDmg',val:1000000},{id:'flatHp',val:1000000}],stats:[]};game.playerHp=getPlayerStats().maxHp;`;
fresh(0, { mapCompleteAction: 'nextZone' }, `${strong}game.level=100;game.actRetreat={frontierZoneId:1,level:100};`);
run('ensureEncounterRun();window.entryRun=game.actExploration;');
until('window.entryRun.completionApplied', 'the retreat map completes');
until('!!game.actExploration && game.actExploration!==window.entryRun', 'a new map starts after the retreat map');
assert.equal(run('game.actExploration.act'), 1, 'no level gained: act 1 again');
assert.deepEqual(copy('game.actRetreat'), { frontierZoneId: 1, level: 100 });
fresh(0, { mapCompleteAction: 'nextZone' }, `${strong}game.level=100;game.actRetreat={frontierZoneId:1,level:98};`);
run('ensureEncounterRun();window.entryRun=game.actExploration;');
until('window.entryRun.completionApplied', 'the retreat map completes');
until('!!game.actExploration && game.actExploration!==window.entryRun', 'the next map starts');
assert.equal(run('game.actExploration.act'), 2, 'two levels gained: back to the frontier act');
assert.equal(run('game.actRetreat'), null);

// Rest between fights: only in story acts, only while no enemy is alive, never above the recovery cap.
fresh(0, {}, 'game.enemies=[];');
const max = run('getPlayerStats().maxHp');
run('game.playerHp=10;applyActRestRecovery(getPlayerStats(),getPlayerRecoveryHpCap(getPlayerStats()));');
assert.ok(Math.abs(run('game.playerHp') - (10 + max * run('ACT_REST_RECOVERY_PCT_PER_SEC') / 1000)) < 1e-6, 'one tick recovers a tenth of the per-second rate');
run(`game.enemies=[createEnemy(getZone(0),{elite:false},0)];game.playerHp=10;
    applyActRestRecovery(getPlayerStats(),getPlayerRecoveryHpCap(getPlayerStats()));`);
assert.equal(run('game.playerHp'), 10, 'no rest while an enemy is alive');
run(`game.enemies=[];game.playerHp=getPlayerRecoveryHpCap(getPlayerStats())-0.001;
    applyActRestRecovery(getPlayerStats(),getPlayerRecoveryHpCap(getPlayerStats()));`);
assert.equal(run('game.playerHp'), run('getPlayerRecoveryHpCap(getPlayerStats())'), 'recovery stops at the cap');

// Corrupted or foreign retreat records are dropped on load.
for (const bad of [{ frontierZoneId: 0, level: 5 }, { frontierZoneId: 'abyss_1', level: 5 }, { frontierZoneId: 2, level: 0 }, 'x']) {
    runtime.badRetreat = bad;
    assert.equal(run('mergeDefaults({...JSON.parse(serializeSaveState(game)),actRetreat:badRetreat}).actRetreat'), null);
}

// The death report is reading material: an open report never pauses the foreground loop.
run('gameplayStarted=true;game.heroSelectionInitialized=true;game.settings.pauseGameOnOverlay=true;');
runtime.isDeathOverlayOpen = () => true;
assert.equal(run('isForegroundGameplayPausedForBackground()'), false, 'an open death report keeps the idle loop running');
console.log('act defeat retreat smoke passed');
