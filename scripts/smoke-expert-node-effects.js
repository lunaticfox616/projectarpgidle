#!/usr/bin/env node
// Regression: every expert tree node effect is wired into gameplay, plus the
// behaviour of the combined cost reduction and awakened-gem pity helpers.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const stateSource = fs.readFileSync('js/state.js', 'utf8');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
const skillsSource = fs.readFileSync('js/skills.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');

function extractLine(source, name) {
  const line = source.split('\n').find(l => l.startsWith(`function ${name}(`));
  assert(line, `${name} must be a single-line declaration`);
  return line;
}
function extractBlock(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert(start >= 0, `${startToken} must exist`);
  const end = source.indexOf(endToken, start);
  assert(end >= 0, `${endToken} must follow ${startToken}`);
  return source.slice(start, end + endToken.length);
}

// ---- 1. No node effect is dead: every effect key has a consumer beyond its definition. ----
const effectBlock = extractBlock(stateSource, 'const EXPERT_TREE_NODES = [', '];');
const effectKeys = Array.from(new Set((effectBlock.match(/effect:\s*\{\s*([A-Za-z0-9_]+)/g) || [])
  .map(m => m.replace(/effect:\s*\{\s*/, ''))));
assert(effectKeys.length >= 20, 'should discover the full set of node effect keys');
const allJs = ['js/state.js', 'js/combat.js', 'js/passives.js', 'js/skills.js', 'js/ui.js']
  .map(f => fs.readFileSync(f, 'utf8')).join('\n');
for (const key of effectKeys) {
  const count = allJs.split(key).length - 1; // occurrences of the raw key string
  assert(count >= 2, `node effect '${key}' must have at least one consumer beyond its definition (found ${count})`);
}

// ---- 2. Targeted wiring of the seven previously-unconnected effects. ----
assert(/getExpertNodeEffectValue\('fossilDropPct'\)/.test(combatSource), 'fossilDropPct must scale fossil drops in combat');
assert(/getExpertNodeEffectValue\('gemGainPct'\)/.test(combatSource), 'gemGainPct must scale gem drops in combat');
assert(/getExpertNodeEffectValue\('expertRareChancePct'\)/.test(combatSource), 'expertRareChancePct must scale rare fossils in combat');
assert(/getExpertNodeEffectValue\('expertRareChancePct'\)/.test(uiSource), 'expertRareChancePct must scale rare beehive rewards');
assert(/getExpertNodeEffectValue\('mycoSporeGainPct'\)/.test(passivesSource), 'mycoSporeGainPct must scale spore gain in awardCurrency');
assert(/getExpertNodeEffectValue\('constellationLock'\)/.test(passivesSource), 'constellationLock must gate constellation locking');
assert(/expertCostReducePct/.test(stateSource), 'expertCostReducePct must feed the combined cost reduction helper');
// The five specific cost sites now stack the common reduction via the shared helper.
assert(/getExpertCombinedCostReduction\('gemQualityCostReducePct'\)/.test(skillsSource), 'gem quality cost must use combined reduction');
assert(/getExpertCombinedCostReduction\('inscriptionCostReducePct'\)/.test(skillsSource), 'inscription cost must use combined reduction');
assert(/getExpertCombinedCostReduction\('starWedgeRerollCostReducePct'\)/.test(passivesSource), 'star wedge reroll must use combined reduction');
assert(/getExpertCombinedCostReduction\('sporeCostReducePct'\)/.test(passivesSource), 'spore cost must use combined reduction');
assert(/getExpertCombinedCostReduction\(/.test(uiSource), 'beehive craft must use combined reduction');

// ---- 3. Behaviour of the new helpers (deterministic). ----
const expertiseState = { nodes: {}, awakenedPity: 0 };
const context = { Math, Object, ensureExpertiseState: () => expertiseState };
vm.createContext(context);
vm.runInContext([
  effectBlock,
  extractLine(stateSource, 'getExpertNodeEffectValue'),
  extractLine(stateSource, 'getExpertCombinedCostReduction'),
  extractLine(stateSource, 'getExpertAwakenedPity'),
  extractLine(stateSource, 'bumpExpertAwakenedPity'),
  extractLine(stateSource, 'getAwakenedDropChance'),
  'this.getExpertCombinedCostReduction = getExpertCombinedCostReduction;',
  'this.bumpExpertAwakenedPity = bumpExpertAwakenedPity;',
  'this.getAwakenedDropChance = getAwakenedDropChance;',
].join('\n'), context);
const { getExpertCombinedCostReduction, bumpExpertAwakenedPity, getAwakenedDropChance } = context;

// Combined cost reduction: common '반복 작업'(2%/lv) stacks with a domain-specific node.
expertiseState.nodes = { common_cost_reduce: 5, gem_quality_cost: 5 }; // 10% common + 20% specific
assert.strictEqual(Number(getExpertCombinedCostReduction('gemQualityCostReducePct').toFixed(4)), 0.30, 'common and specific reductions stack');
assert.strictEqual(Number(getExpertCombinedCostReduction('waxCostReducePct').toFixed(4)), 0.10, 'common reduction applies even without a matching specific node');
expertiseState.nodes = { common_cost_reduce: 100 }; // far past cap
assert.strictEqual(getExpertCombinedCostReduction('sporeCostReducePct'), 0.75, 'combined reduction is capped at 75%');

// Awakened pity: keystone adds chance per consecutive miss and resets on a hit.
expertiseState.nodes = { gem_keystone_awakened: 1 }; // awakenedPityBonusPct 15
expertiseState.awakenedPity = 0;
assert.strictEqual(Number(getAwakenedDropChance(0.035).toFixed(4)), 0.035, 'fresh pity uses the base chance');
for (let i = 0; i < 10; i++) bumpExpertAwakenedPity(false);
assert.strictEqual(Number(getAwakenedDropChance(0.035).toFixed(4)), 0.05, '10 misses raise the awakened chance');
bumpExpertAwakenedPity(true);
assert.strictEqual(Number(getAwakenedDropChance(0.035).toFixed(4)), 0.035, 'an awakened hit resets pity');
expertiseState.awakenedPity = 100000;
assert.strictEqual(getAwakenedDropChance(0.035), 0.25, 'pity-boosted chance is capped');
// Without the keystone there is no pity correction regardless of the counter.
expertiseState.nodes = {};
expertiseState.awakenedPity = 50;
assert.strictEqual(getAwakenedDropChance(0.035), 0.035, 'no keystone means no pity bonus');

console.log('expert node effects smoke checks passed');
