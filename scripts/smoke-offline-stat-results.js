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

// One-evaluation summon reuse must still observe target, level and loadout changes on the next call.
const summons = fixture(23);
summons.run(`(${configureEndgame.toString()})()`);
summons.run('game.enemies = [createEnemy(getZone(game.currentZoneId), {at:0,count:1,boss:true}, 0)]; game.enemies[0].resC = 0;');
const summonStats = summons.runtime.getPlayerStats(false);
const detailedSummons = summons.runtime.estimateSummonDps(summonStats);
const numericSummons = summons.runtime.estimateSummonDps(summonStats, false);
assert.equal(numericSummons.activeCount, 8);
assert.ok(numericSummons.total > 0);
assert.equal(numericSummons.total, detailedSummons.total);
assert.equal(numericSummons.lines.length, 0);
assert.ok(detailedSummons.lines.some(line => line.includes('×8')));
const stableState = summons.run('JSON.stringify(game)');
assert.equal(summons.runtime.estimateSummonDps(summonStats, false).total, numericSummons.total);
assert.equal(summons.run('JSON.stringify(game)'), stableState, 'repeated estimates do not advance combat or spend resources');
summons.run('game.enemies[0].resC = 70;');
assert.ok(summons.runtime.estimateSummonDps(summonStats, false).total < numericSummons.total, 'target mitigation cannot stay cached');
summons.run("game.enemies[0].resC = 0; game.gemData['서리늑대 소환'].level += 5;");
assert.ok(summons.runtime.estimateSummonDps(summonStats, false).total > numericSummons.total, 'gem upgrades apply on the next evaluation');
summons.run("game.ascendKeystones.push('sb5');");
assert.equal(summons.runtime.estimateSummonDps(summonStats, false).total, 0);
assert.equal(summons.runtime.estimateSummonDps(summonStats).activeCount, 0);

// Source phases own output buckets; the input investment and rune records remain reusable.
const sources = summons.run(`(() => {
    const bucket = createEmptyStatBucket();
    const loop = Object.freeze({ flatHp: 2, flatDmg: 3, aspd: 4, move: 5 });
    const deep = Object.freeze({ flatHp: 6, flatDmg: 7, aspd: 8, move: 9, dr: 10, crit: 11 });
    accumulateCombatLoopStats(bucket, loop, deep);
    const untouched = createEmptyStatBucket();
    accumulateCombatLoopStats(untouched, null, undefined);
    const rune = UNDERWORLD_RUNE_DB.find(row => row.stat === 'corpseExplodeChance');
    const state = { unlockedSlots: 1, equippedRunes: [rune.no, rune.no], enhanceLvByNo: { [rune.no]: 25 },
        bonusLinesByNo: { [rune.no]: [{stat:'flatHp',val:19}] } };
    const snapshot = JSON.stringify(state);
    const procs = accumulateCombatRuneStats(bucket, state);
    return { hp: bucket.flatHp, dmg: bucket.flatDmg, aspd: bucket.aspd, move: bucket.move,
        dr: bucket.dr, crit: bucket.crit, emptyHp: untouched.flatHp,
        proc: procs.runeCorpseExplodeChance, expectedProc: rune.val * 1.25, unchanged: JSON.stringify(state) === snapshot };
})()`);
assert.equal(sources.hp, 103);
assert.equal(sources.dmg, 23);
assert.equal(sources.aspd, 15.6);
assert.equal(sources.move, 12.2);
assert.equal(sources.dr, 5);
assert.equal(sources.crit, 6.6);
assert.equal(sources.emptyHp, 0);
assert.equal(sources.proc, sources.expectedProc, 'locked rune slots do not contribute');
assert.equal(sources.unchanged, true);
console.log('smoke-offline-stat-results passed');
