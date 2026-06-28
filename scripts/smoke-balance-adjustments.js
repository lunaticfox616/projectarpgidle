#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
const itemsSource = fs.readFileSync('js/items.js', 'utf8');
const itemDataSource = fs.readFileSync('data/items.js', 'utf8');
const skillDataSource = fs.readFileSync('data/skills.js', 'utf8');
const stateSource = fs.readFileSync('js/state.js', 'utf8');

function extractFunction(source, name) {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert(match, `${name} must exist`);
  return match[0];
}

const formulaContext = {};
vm.createContext(formulaContext);
vm.runInContext([
  extractFunction(combatSource, 'getLabyrinthShacklesDamageMultiplier'),
  extractFunction(combatSource, 'getAbsoluteFloorDamageRoll'),
  extractFunction(combatSource, 'getSolitaryHuntDoubleStrikeBonus'),
  'this.getLabyrinthShacklesDamageMultiplier = getLabyrinthShacklesDamageMultiplier;',
  'this.getAbsoluteFloorDamageRoll = getAbsoluteFloorDamageRoll;',
  'this.getSolitaryHuntDoubleStrikeBonus = getSolitaryHuntDoubleStrikeBonus;',
].join('\n'), formulaContext);
assert.strictEqual(formulaContext.getLabyrinthShacklesDamageMultiplier(200), 1.5, '100 excess movement speed should grant 50% more damage');
assert.strictEqual(formulaContext.getAbsoluteFloorDamageRoll(100), 85, 'Absolute Floor should reduce maximum damage roll by 15%');
assert.strictEqual(formulaContext.getSolitaryHuntDoubleStrikeBonus(6), 500, 'the first five removed targets should grant 100%p each');
assert.strictEqual(formulaContext.getSolitaryHuntDoubleStrikeBonus(8), 600, 'removed targets after five should grant 50%p each');
assert(combatSource.includes('finalCrit = Math.min(1000, finalCrit + dsAsCrit);'), 'Annihilation Shot conversion must be capped at 1000%');
assert(combatSource.includes("if (game.ascendClass === 'hunter' && hasKeystone('h8')) finalCrit = Math.min(1000, finalCrit);"), 'final critical chance must retain the 1000% cap');

const rollBaseStats = extractFunction(passivesSource, 'rollBaseStats');
const rollContext = { getStatName(id) { return id; }, Math: Object.create(Math) };
rollContext.Math.random = () => 0;
vm.createContext(rollContext);
vm.runInContext(`${rollBaseStats}; this.rollBaseStats = rollBaseStats;`, rollContext);
let integerBaseRoll = rollContext.rollBaseStats({ baseStats: [{ id: 'test', baseMin: 0, baseMax: 1 }] }, 1)[0];
assert.strictEqual(integerBaseRoll.val, 1, 'an integer base roll in the 0~1 range must never roll zero');
assert.strictEqual(integerBaseRoll.valMin, 1, 'the displayed integer base range must not advertise zero');
let decimalBaseRoll = rollContext.rollBaseStats({ baseStats: [{ id: 'regen', baseMin: 0, baseMax: 1 }] }, 1)[0];
assert.strictEqual(decimalBaseRoll.val, 0.1, 'a decimal base roll in the 0~1 range must never roll zero');

assert(itemDataSource.includes("name: \"운명의 쌍현\", slots: [\"목걸이\"], reqTier: 14, dropOnly: { type: 'cosmos' }"), 'Fate Twin must be cosmos-only');
const marketContext = {};
vm.createContext(marketContext);
vm.runInContext(`${extractFunction(itemsSource, 'isUniqueEligibleForBlackMarket')}; this.isUniqueEligibleForBlackMarket = isUniqueEligibleForBlackMarket;`, marketContext);
assert.strictEqual(marketContext.isUniqueEligibleForBlackMarket({ name: '운명의 쌍현', dropOnly: { type: 'cosmos' } }), false, 'realm-only uniques must not be eligible for the black market');
assert.strictEqual(marketContext.isUniqueEligibleForBlackMarket({ name: '일반 고유' }), true, 'ordinary uniques must remain eligible for the black market');
assert(itemsSource.includes('isUniqueEligibleForBlackMarket'), 'black market unique eligibility helper must exist');
assert(itemsSource.includes('return isUniqueEligibleForBlackMarket(unique) ? offer : null;'), 'stale restricted unique offers must be removed');
assert(passivesSource.includes('UNIQUE_DB.filter(unique => canDropUniqueInZone(unique))'), 'unique fallback pools must preserve zone restrictions');

assert(combatSource.includes('let originalPierceTargets = new Set(targets.map(entry => entry && entry.enemy).filter(Boolean));'), 'Piercing Shot must track every original target');
assert(combatSource.includes('let pierceOverkillCarryStartedTargets = new Set();'), 'Piercing Shot must track carry starts per original target');
assert(combatSource.includes('!pierceOverkillCarryStartedTargets.has(targetEnemy)'), 'each original target must be allowed to start carry once');
assert(combatSource.includes('pierceOverkillCarryStartedTargets.add(targetEnemy)'), 'a carry start must only consume that original target');
assert(combatSource.includes('!originalPierceTargets.has(enemy)'), 'carry chains must not consume other pending original targets');
assert(combatSource.includes('for (let chainIdx = 0; chainIdx < chainLimit && remainingDamage > 0; chainIdx++)'), 'overkill damage must continue chaining while damage remains');
assert(skillDataSource.includes('각 원본 타겟의 처치 후 남은 피해'), 'Piercing Shot description must explain that every original target can start a chain');
assert(stateSource.includes('줄어든 타겟 5개까지 각 연속 타격 +100%p, 이후 각 +50%p'), 'Solitary Hunt description must match the diminishing formula');

console.log('balance adjustment smoke checks passed');
