const fs = require('fs');
const vm = require('vm');

// Legacy isolated-domain tests still execute the real clock dependency.
module.exports = function loadCombatClock(context) {
    if (!context.safeExposeGlobals) context.safeExposeGlobals = entries => Object.assign(context, entries);
    vm.runInContext(fs.readFileSync('js/combat-clock.js', 'utf8'), context, { filename: 'js/combat-clock.js' });
};
