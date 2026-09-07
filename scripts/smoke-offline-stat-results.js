const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const configureEndgame = require('./lib/offline-endgame-fixture');
const { runtime: r, run } = fixture(17);
run(`(${configureEndgame.toString()})()`);
const numeric = stats => JSON.stringify(stats, (key, value) => key === 'breakdowns' ? undefined : value);
const full = r.getPlayerStats(true);
const lean = r.getPlayerStats(false);
assert.equal(lean.breakdowns, null, 'replay must omit unshown tooltip allocations');
assert.equal(numeric(lean), numeric(full), 'full gear, growth, passives and summons must keep all combat values');
assert.ok(full.breakdowns.dps.lines.length > 0);
assert.ok(full.breakdowns.resF.lines.length > 0);

const initialBoard = run('JSON.stringify(game.growthBoard)');
run('game.growthBoard.loadouts[0].placements = {}; invalidateGrowthEffects();');
const emptyBoard = r.getPlayerStats(false);
assert.notEqual(numeric(emptyBoard), numeric(lean), 'a new evaluation must observe a changed board');
run(`game.growthBoard = ${initialBoard}; invalidateGrowthEffects();`);
assert.equal(numeric(r.getPlayerStats(false)), numeric(lean), 'restoring the board must restore its bonuses');

const result = r.simulateBackgroundCombat({ snapshot: run('game'), elapsedMs: 1000 });
assert.equal(result.processedMs, 1000);
assert.equal(result.game.lastCombatStats.breakdowns, null);
assert.ok(r.getPlayerStats().breakdowns.dps, 'visible stats still have explanations after replay');

// Reusing build inputs must never freeze time-dependent or resource-dependent combat stats.
run('game.isBackgroundCalculation = true');
const plain = r.getPlayerStats(false);
run(`game.uniqueEliteTraitBuff = { expiresAt: getCombatTime() + 500,
    trait: { attackSpeedVarMul: 1.18, resF: 12 } };`);
const buffed = r.getPlayerStats(false);
assert.ok(buffed.aspd > plain.aspd, 'a new buff applies even while equipment inputs are cached');
run('game.combatTimeMs += 500');
assert.equal(r.getPlayerStats(false).aspd, plain.aspd, 'buff expiry refreshes at the exact combat deadline');
run('game.actRewardBonuses.push({stat:"gemLevel",value:2})');
assert.equal(r.getGemBonusSources('서리늑대 소환').reward,
    lean.gemBonusSources.reward + 2, 'a reward inside a kill is immediately reflected');
run('game.growthBoard.loadouts[0].placements = {}; invalidateGrowthEffects();');
const replayEmpty = r.getPlayerStats(false);
run('delete game.isBackgroundCalculation');
assert.equal(numeric(replayEmpty), numeric(r.getPlayerStats(false)),
    'explicit build invalidation restores the same values as foreground evaluation');
run('coreLoop(getCombatTime() + 100)');
assert.equal(run('game.lastCombatStats.breakdowns'), null, 'foreground ticks do not allocate tooltip text');
assert.ok(r.getUiPlayerStats().breakdowns.dps, 'visible stat details remain available on demand');
run(`game.passives.push(PASSIVE_KEYSTONE_NODE_ID_BY_TITLE['움직이는 성벽']);
    game.isBackgroundCalculation = true;`);
const converted = numeric(r.getPlayerStats(false));
assert.equal(numeric(r.getPlayerStats(false)), converted, 'repeated keystone conversions cannot mutate cached equipment');
run('delete game.isBackgroundCalculation');
assert.equal(numeric(r.getPlayerStats(false)), converted, 'cached and foreground defense conversions agree');
console.log('smoke-offline-stat-results passed');
