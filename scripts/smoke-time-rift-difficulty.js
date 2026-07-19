const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const mapSource = fs.readFileSync('data/maps.js', 'utf8');
const stateSource = fs.readFileSync('js/state.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');

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
assert(uiSource.includes('혼돈 ${equivalentChaosDepth} 상당 · 전투 난이도 ${riftDifficultyTier}'), 'the selected pressure difficulty should be visible before entry');

console.log('smoke-time-rift-difficulty passed');
