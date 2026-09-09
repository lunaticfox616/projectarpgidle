'use strict';
// Isolate stat/gem functions from a known pre-refactor revision, retaining unrelated working changes.
// Usage: node scripts/benchmark-player-stats.js <pre-refactor git revision>
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const espree = require('espree');
const fixture = require('./lib/replay-fixture');
const configureEndgame = require('./lib/offline-endgame-fixture');
const revision = process.argv[2];
assert.ok(revision, 'Pass the pre-refactor git revision explicitly');
const source = fs.readFileSync('js/combat.js', 'utf8');
const original = execFileSync('git', ['show', `${revision}:js/combat.js`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const functions = text => espree.parse(text, { ecmaVersion: 'latest', range: true }).body
    .filter(node => node.type === 'FunctionDeclaration');
let baseline = source;
for (const node of functions(source).filter(node => ['getPlayerStats', 'estimateSummonDps'].includes(node.id.name)).reverse()) {
    const previous = functions(original).find(candidate => candidate.id.name === node.id.name);
    assert.ok(previous, `Missing baseline function ${node.id.name}`);
    baseline = baseline.slice(0, node.range[0]) + original.slice(...previous.range) + baseline.slice(node.range[1]);
}
const skills = fs.readFileSync('js/skills.js', 'utf8');
const oldSkills = execFileSync('git', ['show', `${revision}:js/skills.js`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const currentGem = functions(skills).find(node => node.id.name === 'getGemBonusSources');
const previousGem = functions(oldSkills).find(node => node.id.name === 'getGemBonusSources');
const baselineSkills = skills.slice(0, currentGem.range[0]) + oldSkills.slice(...previousGem.range) + skills.slice(currentGem.range[1]);
const before = fixture(17, { 'js/combat.js': baseline, 'js/skills.js': baselineSkills });
const after = fixture(17);
const report = { revision, method: 'Node VM; alternating runs; median of 5 rounds, 60 evaluations per round', equivalence: [], timings: [] };
function compare(name, setup = '') {
    before.run(setup);
    after.run(setup);
    for (const detail of [false, true]) {
        assert.equal(JSON.stringify(after.runtime.getPlayerStats(detail)), JSON.stringify(before.runtime.getPlayerStats(detail)), `${name}: stats/detail=${detail}`);
    }
    assert.equal(after.run('JSON.stringify(game)'), before.run('JSON.stringify(game)'), `${name}: game state`);
    report.equivalence.push(name);
}
function measure(runtime, detail) {
    const start = performance.now();
    for (let i = 0; i < 60; i++) runtime.getPlayerStats(detail);
    return (performance.now() - start) / 60;
}
function benchmark(name) {
    for (const detail of [false, true]) {
        measure(before.runtime, detail);
        measure(after.runtime, detail);
        const samples = { before: [], after: [] };
        for (let round = 0; round < 5; round++) {
            const order = round % 2 ? ['after', 'before'] : ['before', 'after'];
            for (const side of order) samples[side].push(measure(side === 'before' ? before.runtime : after.runtime, detail));
        }
        const median = values => values.sort((a, b) => a - b)[2];
        const beforeMs = median(samples.before), afterMs = median(samples.after);
        report.timings.push({ name, detail, beforeMs, afterMs, reductionPct: 100 * (1 - afterMs / beforeMs) });
    }
}
compare('starter');
benchmark('starter');
compare('endgame-eight-summons', `(${configureEndgame.toString()})()`);
benchmark('endgame-eight-summons');
compare('loop-investment-and-runes', `
    game.loop10BonusStats = { flatHp: 13, flatDmg: 17, aspd: 9, move: 5 };
    game.loopDeepStats = { flatHp: 21, flatDmg: 7, aspd: 3, move: 4, dr: 5, crit: 6 };
    game.underworldRunes = { unlockedSlots: 6, equippedRunes: UNDERWORLD_RUNE_DB.slice(0, 6).map(r => r.no),
        enhanceLvByNo: { 1: 13 }, bonusLinesByNo: { 1: [{ stat: 'flatHp', val: 19 }] } };
`);
compare('low-life-and-shield', 'game.playerHp = 1; game.playerEnergyShield = 0;');
compare('boss-target', 'game.enemies = [createEnemy(getZone(game.currentZoneId), {at:0,count:1,boss:true}, 0)];');
compare('target-resistance', 'game.enemies[0].resC = 70;');
compare('buff-active', `game.uniqueEliteTraitBuff = { expiresAt: getCombatTime() + 500, trait: { attackSpeedVarMul: 1.18, resF: 12 } };`);
compare('buff-expired', 'game.combatTimeMs += 500;');
compare('equipment-removed', "game.equipment['무기'] = null;");
compare('reward-gem-level', "game.actRewardBonuses.push({stat:'gemLevel',value:2});");
compare('summons-disabled', "game.ascendKeystones.push('sb5');");
compare('missing-optional-progression', 'game.loop10BonusStats = null; game.loopDeepStats = null; game.underworldRunes = null;');
fs.mkdirSync('artifacts/player-stats', { recursive: true });
fs.writeFileSync('artifacts/player-stats/benchmark.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
