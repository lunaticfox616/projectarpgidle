// Wide-map content review fixes (2026-09-30, docs/atlas-endgame-20260930.md 사용자 결정 반영): each case failed before its fix.
// Cerberus keeps its board fight, the stump box drops on generated maps, a hidden tab replays a map walk, climbing past the cap
// takes the automatic entries, a wide map's boss starts its hidden-journal count when it wakes.
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { run } = fixture(88);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));
let tick = 0;
const advance = (count = 1) => { for (let n = 0; n < count; n++) run(`coreLoop(${1800000000000 + (++tick) * 100})`); };

run(`
    game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',level:100,
        combatTimeMs:1800000000000,settings:{pauseGameOnOverlay:false,mapCompleteAction:'repeatZone',showDeathNotice:false}});
    game.season=12;game.loopCount=11;game.maxZoneId=29;game.currentZoneId=getAbyssZoneIdForDepth(6);
    game.equipment['무기']={id:90001,slot:'무기',name:'검사',rarity:'rare',baseStats:[{id:'flatDmg',val:1000000},{id:'flatHp',val:1000000}],stats:[]};
    game.playerHp=getPlayerStats().maxHp;startMoving(false);
`);

// ---------------------------------------------------------------- Cerberus
const cerberus = copy(`(() => { game.season = 12; const zone = getZone('s6_beast_cerberus'), other = getZone('s2_boss_flame');
    return { board: !zone.exploration, phases: generateEncounterPlan(zone).map(row => row.phase), otherArena: !!(other && other.exploration) }; })()`);
assert.equal(cerberus.board, true, 'Cerberus keeps the 9×8 board (it used to become a one-boss arena)');
assert.deepEqual(cerberus.phases, [1, 2, 3], 'with its three phases of heads and body');
assert.equal(cerberus.otherArena, true, 'other root bosses keep their arenas');

// ---------------------------------------------------------------- the stump box on a generated map
for (let n = 0; n < 400 && !run('!!(game.actExploration && game.moveTimer <= 0)'); n++) advance();
assert.equal(run('game.actExploration.act'), null, 'a chaos map is a generated map');
const drops = copy(`(() => { game.stumpBox.acquired = true; const random = Math.random; Math.random = () => 0;
    const before = game.stumpBox.items.length; stumpBox.onEnemyKilled(game, { isBoss: true });
    Math.random = random; return game.stumpBox.items.length - before; })()`);
assert.equal(drops, 1, 'the stump box rolls its drops on generated maps (only story acts escrow them)');

// ---------------------------------------------------------------- a hidden tab while walking between rooms
const walking = copy(`(() => { const saved = game.enemies; game.enemies = []; game.moveTimer = 0; game.encounterPlan = [];
    const eligible = isBackgroundCombatEligible(game); game.enemies = saved; return eligible; })()`);
assert.equal(walking, true, 'a map walk with no fight in sight is still replayed when the tab is hidden');

// ---------------------------------------------------------------- the hidden journal count starts when a boss wakes
const journal = copy(`(() => {
    const zone = { id: 'test_pinnacle', type: 'seasonBoss', milestonePinnacle: true }, boss = { id: 424242, isBoss: true };
    startHiddenJournalBossRun(boss, zone); trackHiddenJournalFlaskUse(); trackHiddenJournalPlayerDamage(50);
    const walkedIn = { ...game.hiddenJournalBossRun };
    restartHiddenJournalBossRun(boss, zone);
    return { walkedIn: [walkedIn.flaskUses, walkedIn.hpDamageTaken], woke: [game.hiddenJournalBossRun.flaskUses, game.hiddenJournalBossRun.hpDamageTaken] };
})()`);
assert.deepEqual(journal.walkedIn, [1, 50]);
assert.deepEqual(journal.woke, [0, 0], 'flasks and hits on the walk to a waiting boss do not count against its hidden entries');
run('resetHiddenJournalBossRun();');

// ---------------------------------------------------------------- climbing past the cap takes the automatic entries
const climb = copy(`(() => {
    game.abyssEndlessDepth = 24; game.settings.autoEnterGrandBreach = true; game.voidRift.grandBreachUnlock = true;
    game.voidRift.grandRun = null; game.actExploration = null;
    enterNextEndlessChaosDepth();
    return { zone: game.currentZoneId, back: game.voidRift.grandRun && game.voidRift.grandRun.returnZoneId, depth: getAbyssZoneIdForDepth(25) };
})()`);
assert.equal(climb.zone, 'grand_breach_run', 'a ready grand breach is entered on the climb (it never fired past the cap)');
assert.equal(climb.back, climb.depth, 'and returns to the new depth');
console.log('wide-map review fixes: Cerberus board, stump drops on generated maps, hidden-tab map walks, climb auto-entries, hidden journal wake: OK');
