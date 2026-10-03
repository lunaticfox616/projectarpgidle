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

// Phone with another menu open (review 2026-10-01): the log sits in a hidden tab. Reading its scroll metrics forced a style
// recalculation of the page on every flush, so nothing may be read; once the tab shows again the log follows the latest row.
const pane = { active: false, classList: { contains: name => name === 'active' && pane.active } };
const metrics = { scrollHeight: 1000, clientHeight: 200, scrollTop: 300 };
const hiddenLog = { closest: selector => (selector === '.tab-content' ? pane : null) };
for (const key of Object.keys(metrics)) {
    Object.defineProperty(hiddenLog, key, {
        get() { if (!pane.active) throw new Error('read ' + key + ' while hidden'); return metrics[key]; },
        set(value) { if (!pane.active) throw new Error('wrote ' + key + ' while hidden'); metrics[key] = value; }
    });
}
const hiddenState = context.captureCombatLogScroll(hiddenLog);
assert.strictEqual(hiddenState, null, 'a hidden log is not measured');
context.restoreCombatLogScroll(hiddenLog, hiddenState);
pane.active = true;
const shownState = context.captureCombatLogScroll(hiddenLog);
assert.strictEqual(shownState.followsLatest, true, 'rows added while hidden show from the latest once the log is visible');
metrics.scrollHeight = 1100;
context.restoreCombatLogScroll(hiddenLog, shownState);
assert.strictEqual(metrics.scrollTop, 1100);
metrics.scrollTop = 300;
assert.strictEqual(context.captureCombatLogScroll(hiddenLog).followsLatest, false,
    'after catching up, scrolling upward pauses following again');

// A folded combat feed hides #log (display:none) on both layouts: same rule, nothing is measured until it opens again.
const folded = { closest: selector => (selector === '.combat-feed.collapsed' ? {} : null) };
['scrollHeight', 'clientHeight', 'scrollTop'].forEach(key => Object.defineProperty(folded, key, { get() { throw new Error('measured a folded log'); } }));
assert.strictEqual(context.captureCombatLogScroll(folded), null, 'a folded log is not measured');

// PC 전투 기록 창(2026-10-03, js/message-frames-ui.js): 채팅 탭이 보이거나 창을 접으면 기록은 창 밖 보관 칸(display:none)에서 기다린다.
const stashed = { closest: selector => (selector === '.message-frame-stash' ? {} : null) };
['scrollHeight', 'clientHeight', 'scrollTop'].forEach(key => Object.defineProperty(stashed, key, { get() { throw new Error('measured a stashed log'); } }));
assert.strictEqual(context.captureCombatLogScroll(stashed), null, 'a log waiting in the frame stash is not measured');

console.log('smoke-combat-log-scroll-follow passed');
