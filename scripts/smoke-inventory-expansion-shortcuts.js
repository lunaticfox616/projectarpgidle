const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const context = buildGameRuntime();
const run = code => vm.runInContext(code, context);
// The jewel store's +5 button lives in the jewel dialog since 2026-09-30 (the jewel window went away).
// The growth storage shortcut went with the growth board (2026-09-30).
const storeFooter = () => {
    let captured = '';
    context.document.body = { append(node) { captured = node.innerHTML; node.remove = () => {}; } };
    run('equipmentSocketsUi.openStore()');
    return captured;
};
const jewelExpandDisabled = html => /equipmentSocketsUi\.expand\(\)" disabled/.test(html);
run('game=mergeDefaults({});game.season=100;game.currencies.goldenRule=100;contentProgression.sync();');
assert(!storeFooter().includes('+5칸'), 'the jewel store offers no expansion before the market opens');
assert.strictEqual(run("typeof syncInventoryExpansionShortcuts"), 'undefined', 'no growth storage shortcut is left');
run("contentProgression.purchase('craft');game.contentProgression.inherited.push('jewel');contentProgression.sync();");
const open = storeFooter();
assert(open.includes('+5칸 (황금률') && open.includes('보유 100') && !jewelExpandDisabled(open), 'the jewel store offers the expansion');
run('game.currencies.goldenRule=0;');
const poor = storeFooter();
assert(jewelExpandDisabled(poor) && poor.includes('보유 0'), 'an unaffordable expansion is disabled');
console.log('smoke-inventory-expansion-shortcuts passed');
