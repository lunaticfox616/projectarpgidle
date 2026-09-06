// Load the real display adapter for legacy function fixtures; only browser boundaries are shimmed.
const fs = require('fs');
const vm = require('vm');
module.exports = function loadUiDisplay(context) {
    context.navigator ||= { userAgent: 'Windows' };
    context.document ||= {};
    context.document.addEventListener ||= () => {};
    context.window ||= context;
    context.safeExposeGlobals ||= definitions => Object.assign(context, definitions);
    vm.runInContext(fs.readFileSync('js/ui-display.js', 'utf8'), context, { filename: 'js/ui-display.js' });
};
