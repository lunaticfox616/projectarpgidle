const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const start = uiSource.indexOf('function captureCombatLogScroll');
const end = uiSource.indexOf('function flushLogQueue', start);
assert(start >= 0 && end > start, 'combat-log scroll behavior should be executable in isolation');

const context = {};
vm.createContext(context);
vm.runInContext(uiSource.slice(start, end), context, { filename: 'combat-log-scroll-follow.js' });

const readingLog = { scrollHeight: 1000, clientHeight: 200, scrollTop: 430 };
const readingState = context.captureCombatLogScroll(readingLog);
assert.strictEqual(readingState.followsLatest, false, 'scrolling upward should pause latest-log following');
readingLog.scrollHeight = 1060;
context.restoreCombatLogScroll(readingLog, readingState);
assert.strictEqual(readingLog.scrollTop, 490, 'new rows should preserve the same visible log content while reading');

const bottomLog = { scrollHeight: 1000, clientHeight: 200, scrollTop: 785 };
const bottomState = context.captureCombatLogScroll(bottomLog);
assert.strictEqual(bottomState.followsLatest, true, 'returning within the bottom threshold should resume latest-log following');
bottomLog.scrollHeight = 1080;
context.restoreCombatLogScroll(bottomLog, bottomState);
assert.strictEqual(bottomLog.scrollTop, 1080, 'following mode should move to the latest log after new rows arrive');

const prunedLog = { scrollHeight: 1000, clientHeight: 200, scrollTop: 300 };
const prunedState = context.captureCombatLogScroll(prunedLog);
prunedLog.scrollHeight = 700;
context.restoreCombatLogScroll(prunedLog, prunedState);
assert.strictEqual(prunedLog.scrollTop, 0, 'history pruning should clamp a preserved position to the remaining range');

console.log('smoke-combat-log-scroll-follow passed');
