'use strict';
// Diagnostic instrumentation only; wrappers always execute the real function.
const fs = require('node:fs');
const { performance } = require('node:perf_hooks');
const fixture = require('./lib/replay-fixture');
const configure = require('./lib/offline-endgame-fixture');
const { runtime, run } = fixture(17);
run(`(${configure.toString()})()`);
const names = ['getPlayerStats', 'getGrowthEffectSnapshot', 'getResolvedEquipmentStatLists',
    'getEffectivePassiveNodeEffects', 'getGemBonusSources', 'getTargetGemBonusSources',
    'getEquippedJewelGemLevelBonusSources', 'estimateSummonDps', 'getActiveSkillStats',
    'getArcanaGemDamageBonus', 'getPreciseTalentRatio', 'recalculateStarWedgeMutations'];
const results = {};
for (const name of names) {
    const original = runtime[name];
    if (typeof original !== 'function') throw new Error(`Missing diagnostic target ${name}`);
    results[name] = { calls: 0, inclusiveMs: 0 };
    runtime[name] = function (...args) {
        const start = performance.now();
        try { return original.apply(this, args); }
        finally { results[name].calls++; results[name].inclusiveMs += performance.now() - start; }
    };
}
for (let i = 0; i < 100; i++) runtime.getPlayerStats(false);
const report = Object.entries(results).map(([name, row]) => ({ name, callsPerEvaluation: row.calls / 100,
    inclusiveMsPerEvaluation: row.inclusiveMs / 100 }));
fs.mkdirSync('artifacts/player-stats', { recursive: true });
fs.writeFileSync(`artifacts/player-stats/profile-${process.argv[2] || 'current'}.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
