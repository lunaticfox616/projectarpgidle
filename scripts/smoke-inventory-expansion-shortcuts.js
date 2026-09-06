const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const context = buildGameRuntime();
const run = code => vm.runInContext(code, context);
const jewel = {}, growth = {};
context.document.getElementById = id => ({
    'btn-jewel-inventory-expand': jewel, 'btn-growth-inventory-expand': growth
})[id] || null;
run('game=mergeDefaults({});game.season=100;game.currencies.goldenRule=100;contentProgression.sync();syncInventoryExpansionShortcuts()');
assert(jewel.hidden && growth.hidden);
run("contentProgression.purchase('craft');syncInventoryExpansionShortcuts()");
assert(jewel.hidden && growth.hidden, 'high loop must not bypass feature purchases');
run("game.contentProgression.inherited.push('jewel','growth');contentProgression.sync();syncInventoryExpansionShortcuts()");
assert(!jewel.hidden && !growth.hidden);
assert(!jewel.disabled && !growth.disabled);
assert(jewel.textContent.includes('보유 100') && growth.textContent.includes('보유 100'));
assert(jewel.title.includes(run('getJewelInventoryLimit()')+'칸'));
run('game.currencies.goldenRule=0;syncInventoryExpansionShortcuts()');
assert(jewel.disabled && growth.disabled);
assert(jewel.textContent.includes('보유 0'));
console.log('smoke-inventory-expansion-shortcuts passed');
