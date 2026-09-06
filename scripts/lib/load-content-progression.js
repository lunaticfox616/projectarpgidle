// Isolated legacy UI fixtures load the actual catalog and policy, not stubbed unlock decisions.
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./game-runtime');
let runtime;
module.exports = function loadContentProgression(context, includeUi = false) {
    runtime ||= buildGameRuntime();
    context.CONTENT_UNLOCK_CATALOG = runtime.CONTENT_UNLOCK_CATALOG;
    context.CONTENT_UNLOCK_POINTS_PER_LOOP = runtime.CONTENT_UNLOCK_POINTS_PER_LOOP;
    context.ORB_DB ||= runtime.ORB_DB;
    context.getCanonicalCurrencyKey ||= runtime.getCanonicalCurrencyKey;
    context.safeExposeGlobals ||= definitions => Object.assign(context, definitions);
    vm.runInContext(fs.readFileSync('js/content-progression.js', 'utf8'), context, { filename: 'js/content-progression.js' });
    if (includeUi) {
        context.document ||= {};
        context.document.addEventListener ||= () => {};
        vm.runInContext(fs.readFileSync('js/content-progression-ui.js', 'utf8'), context, { filename: 'js/content-progression-ui.js' });
    }
};
