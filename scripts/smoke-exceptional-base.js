#!/usr/bin/env node
// Regression: a dropped item can become an "exceptional base" where one base
// option rolls 20% above its max roll, and the item/stat is flagged for display.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
function extractFunction(source, name) {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert(match, `${name} must exist`);
  return match[0];
}

function makeContext(randomValue) {
  const ctx = {
    Math: Object.assign(Object.create(Math), { random: () => randomValue }),
    getStatName: (id) => id,
  };
  vm.createContext(ctx);
  vm.runInContext(extractFunction(passivesSource, 'maybeApplyExceptionalBase') + '\nthis.maybeApplyExceptionalBase = maybeApplyExceptionalBase;', ctx);
  return ctx;
}

// random = 0 → under 1% gate → becomes exceptional, first base stat boosted to floor(max * 1.2).
const hit = makeContext(0);
const item1 = { baseStats: [{ id: 'flatDmg', val: 10, baseRollMax: 20, statName: '기본 피해' }] };
hit.maybeApplyExceptionalBase(item1);
assert.strictEqual(item1.exceptionalBase, true, 'item should be flagged as exceptional');
assert.strictEqual(item1.baseStats[0].exceptional, true, 'the boosted stat should be flagged');
assert.strictEqual(item1.baseStats[0].val, 24, 'boosted value must be floor(maxRoll * 1.2) = floor(20*1.2)=24');
assert.strictEqual(item1.exceptionalStatId, 'flatDmg', 'exceptional stat id should be recorded for display');

// random = 0.5 → above 1% gate → unchanged.
const miss = makeContext(0.5);
const item2 = { baseStats: [{ id: 'flatDmg', val: 10, baseRollMax: 20 }] };
miss.maybeApplyExceptionalBase(item2);
assert(!item2.exceptionalBase, 'most drops must not be exceptional');
assert.strictEqual(item2.baseStats[0].val, 10, 'non-exceptional stat value unchanged');

console.log('exceptional base smoke checks passed');
