const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

// Snapshot of the released balance, independent of the new requirement/reward tables.
function previousRequirement(level) {
    if (level <= 20) return Math.floor((24 + level ** 1.34 * 14) * 2);
    const base20 = Math.floor((24 + 20 ** 1.34 * 14) * 2);
    if (level <= 50) return Math.floor(base20 + 90 * (level - 20) ** 1.42);
    const base50 = Math.floor(base20 + 90 * 30 ** 1.42);
    if (level <= 100) return Math.floor(base50 + 252 * (level - 50) ** 1.55);
    return Math.floor(base50 + 252 * 50 ** 1.55)
        + Math.floor(4200 * (level - 100) ** 1.85 + 900 * (level - 100) ** 2);
}

run('game=JSON.parse(JSON.stringify(defaultGame));game.currentZoneId=1;game.season=1;game.level=1');
for (let level = 1; level <= 10; level++) {
    assert.equal(run(`getExpReq(${level})`), previousRequirement(level), 'intro requirements are unchanged');
    for (const season of [1, 10, 41]) {
        run(`game.season=${season};game.level=${level}`);
        const bonus = run(`levelProgression.loopExperienceMultiplier(${season},${level},${level})`);
        const expected = Math.floor(Math.max(24, previousRequirement(level) * .06) * bonus);
        assert.equal(run(`getEnemyExperienceReward({level:${level}},{expGain:0})`), expected);
    }
}
run('game.season=1;game.level=1');
for (let level = 11; level <= 100; level++) {
    assert.equal(run(`getEnemyExperienceReward({level:${level}},{expGain:0})`),
        Math.floor(Math.max(24, previousRequirement(level) * .06)), 'existing pre-101 monster and gem XP are preserved');
    assert.ok(run(`getExpReq(${level})`) > previousRequirement(level));
}

let lastPremium = 1, lastStep = 0, lastKills = 0;
for (let level = 20; level <= 100; level += 10) {
    const required = run(`getExpReq(${level})`);
    const premium = required / previousRequirement(level);
    const step = premium - lastPremium;
    const kills = required / run(`getEnemyExperienceReward({level:${level}},{expGain:0})`);
    assert.ok(step > lastStep, 'each decade adds a larger growth premium');
    assert.ok(kills > lastKills, 'higher rewards must not cancel the longer leveling curve');
    lastPremium = premium; lastStep = step; lastKills = kills;
}
for (let level = 2; level <= 200; level++) {
    assert.ok(run(`getExpReq(${level}) > getExpReq(${level - 1})`), 'no downward threshold at a decade boundary');
}
for (const level of [101, 110, 150, 200]) {
    assert.equal(run(`getExpReq(${level}) - getExpReq(100)`),
        previousRequirement(level) - previousRequirement(100), 'retain the released steep post-100 increments');
}
const endgameEffortRatio = run('(getExpReq(199)/levelProgression.monsterExperience(199))/(getExpReq(100)/levelProgression.monsterExperience(100))');
assert.ok(endgameEffortRatio > 10 && endgameEffortRatio < 20,
    'last levels remain a long-term goal without the previous thirtyfold same-level kill burden');
for (const level of [200, 201, 1000]) {
    assert.ok(Number.isFinite(run(`levelProgression.monsterExperience(${level})`)));
    assert.ok(run(`levelProgression.monsterExperience(${level}) > levelProgression.monsterExperience(${level - 1})`));
}

run('game.level=80;game.season=41');
const plain = run('getEnemyExperienceReward({level:80},{expGain:0})');
assert.equal(run('getEnemyExperienceReward({level:80,isElite:true},{expGain:0})'), Math.floor(plain * 1.8));
assert.equal(run('getEnemyExperienceReward({level:80,isBoss:true},{expGain:0})'), plain * 6);
assert.equal(run('getEnemyExperienceReward({level:80},{expGain:100})'), plain * 2);
run('game.isBackgroundCalculation=true');
assert.equal(run('getEnemyExperienceReward({level:80},{expGain:0})'), plain, 'offline and online share XP rules');
run('game.level=100');
assert.ok(run('getEnemyExperienceReward({level:80},{expGain:0})') < plain / 3, 'overlevel penalty still applies');

run(`game=JSON.parse(JSON.stringify(defaultGame));game.level=11;game.exp=123;game.passivePoints=4;
    game.currentZoneId=1;game=mergeDefaults(JSON.parse(JSON.stringify(game)));`);
assert.deepEqual(json('({level:game.level,exp:game.exp,points:game.passivePoints})'), {level:11,exp:123,points:4},
    'existing saves retain earned levels, experience and invested-point budget');
run(`var stats=getPlayerStats(false);var reward=getEnemyExperienceReward({level:11},stats);
    game.exp=getExpReq(11)-reward-1;var oldPoints=game.passivePoints;`);
run('grantExpAndGem({level:11},stats)');
assert.equal(run('game.level'), 11, 'one XP short does not level up');
assert.equal(run('game.passivePoints'), 4);
run('game.exp=getExpReq(11)-reward;grantExpAndGem({level:11},stats)');
assert.deepEqual(json('({level:game.level,exp:game.exp,points:game.passivePoints})'), {level:12,exp:0,points:5},
    'exact threshold grants one level and one passive point');
console.log('smoke-experience-curve passed');
