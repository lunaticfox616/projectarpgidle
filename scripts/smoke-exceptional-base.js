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

// random = 0 → every line passes its independent 1% gate → ALL lines become exceptional (+20%).
const hit = makeContext(0);
const item1 = { baseStats: [
  { id: 'flatDmg', val: 10, baseRollMax: 20, statName: '기본 피해' },
  { id: 'crit', val: 5, baseRollMax: 10, statName: '치명타' },
] };
hit.maybeApplyExceptionalBase(item1);
assert.strictEqual(item1.exceptionalBase, true, 'item should be flagged as exceptional');
assert.strictEqual(item1.baseStats[0].exceptional, true, 'line 1 should be flagged');
assert.strictEqual(item1.baseStats[1].exceptional, true, 'line 2 should be flagged');
assert.strictEqual(item1.baseStats[0].val, 24, 'line 1 boosted to floor(20*1.2)=24');
assert.strictEqual(item1.baseStats[1].val, 12, 'line 2 boosted to floor(10*1.2)=12');
assert.strictEqual(item1.exceptionalStatNames.length, 2, 'both lines recorded for display');
assert.strictEqual(item1.exceptionalAllLines, true, 'all lines exceptional flag set');

// random = 0.5 → every line fails its gate → unchanged, not exceptional.
const miss = makeContext(0.5);
const item2 = { baseStats: [{ id: 'flatDmg', val: 10, baseRollMax: 20 }, { id: 'crit', val: 5, baseRollMax: 10 }] };
miss.maybeApplyExceptionalBase(item2);
assert(!item2.exceptionalBase, 'most drops must not be exceptional');
assert.strictEqual(item2.baseStats[0].val, 10, 'non-exceptional line 1 unchanged');
assert.strictEqual(item2.baseStats[1].val, 5, 'non-exceptional line 2 unchanged');

console.log('exceptional base smoke checks passed');
