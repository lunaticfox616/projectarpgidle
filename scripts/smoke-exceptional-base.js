#!/usr/bin/env node
// Regression: a dropped item can become an "exceptional base" where one base
// option rolls 20% above its max roll, and the item/stat is flagged for display.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const utilsSource = fs.readFileSync('js/utils.js', 'utf8');
const canvasSource = fs.readFileSync('js/canvas-passive-tree.js', 'utf8');
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

assert(!uiSource.includes('특출난 베이스'), 'tooltip must not render a separate exceptional-base summary line');
assert(!uiSource.includes('✦특출'), 'tooltip must not print the word 특출 next to exceptional option values');
assert(uiSource.includes('font-weight:700;">✦+20%</span>'), 'tooltip should keep a compact star +20% marker for exceptional option lines');
assert(uiSource.includes("let valueColor = stat.exceptional ? '#ffb454'"), 'exceptional non-defense option values should be orange');
assert(uiSource.includes("let valueColor = (src && src.exceptional) ? '#ffb454'"), 'exceptional defense option values should be orange');
const starCtx = {};
vm.createContext(starCtx);
vm.runInContext(
  `${extractFunction(utilsSource, 'getExceptionalBaseStarCount')}\n${extractFunction(utilsSource, 'getExceptionalBaseStars')}\nthis.getExceptionalBaseStars = getExceptionalBaseStars;`,
  starCtx
);
assert.strictEqual(starCtx.getExceptionalBaseStars(item1), '✦✦', 'item name star suffix must repeat once per exceptional base line');
assert(uiSource.includes('${item.name}${exceptionalStars}'), 'item tooltip title should append exceptional stars to the item name');
assert(canvasSource.includes('${hi(item.name)}${exceptionalStars}'), 'inventory cards should append exceptional stars to the item name');
assert(canvasSource.includes('${item.name}${exceptionalStars}'), 'equipped item cards should append exceptional stars to the item name');

console.log('exceptional base smoke checks passed');
