const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

// Scheduler assertions below execute the real combat rules.

const runtime = buildGameRuntime();
const activeClasses = new Set();
let pauseToggleListener = null;
let importantSaveCount = 0;
const elements = {
  'tutorial-overlay': { classList: { add: name => activeClasses.add(name), remove: name => activeClasses.delete(name), contains: name => activeClasses.has(name), toggle: (name, enabled) => enabled ? activeClasses.add(name) : activeClasses.delete(name) } },
  'tutorial-kicker': { innerText: '' }, 'tutorial-title': { innerText: '' }, 'tutorial-body': { innerHTML: '' },
  'tutorial-open-btn': { style: {}, innerText: '' }, 'tutorial-dismiss-btn': { style: {}, innerText: '' },
  'tutorial-pause-overlay-toggle': { checked: false, addEventListener: (type, listener) => { if (type === 'change') pauseToggleListener = listener; } },
  'tutorial-pause-overlay-status': { innerText: '' },
  'chk-pause-overlay': { checked: false }
};
runtime.document.getElementById = id => elements[id] || null;
runtime.queueImportantSave = () => { importantSaveCount += 1; };
runtime.isStartupOverlayOpen = () => false;
runtime.isLoadingOverlayOpen = () => false;
runtime.isRewardOpen = () => false;
runtime.isLoopHeroSelectOpen = () => false;
runtime.isDeathOverlayOpen = () => true;
vm.runInContext("game.settings.pauseGameOnOverlay = true; game.seenTutorials = []; queueTutorialNotice('tutorial_battle_basics', '전투 기본 가이드', '읽는 동안 안전해야 합니다.')", runtime);
assert.strictEqual(activeClasses.has('active'), false, 'tutorial notice must wait while the death overlay is open');
runtime.isDeathOverlayOpen = () => false;
vm.runInContext('showNextTutorial()', runtime);
assert.strictEqual(activeClasses.has('active'), true, 'queued tutorial notice must open after the blocking overlay closes');
assert.strictEqual(elements['tutorial-pause-overlay-toggle'].checked, true, 'the first tutorial must show pause enabled by default');
assert.ok(elements['tutorial-body'].innerHTML.includes('켜짐'), 'the first tutorial must explain the enabled pause state');
elements['tutorial-pause-overlay-toggle'].checked = false;
pauseToggleListener();
assert.strictEqual(vm.runInContext('game.settings.pauseGameOnOverlay', runtime), false, 'the tutorial toggle must disable overlay pause immediately');
assert.strictEqual(elements['chk-pause-overlay'].checked, false, 'the tutorial toggle must stay synchronized with settings');
assert.strictEqual(elements['tutorial-pause-overlay-status'].innerText, '꺼짐', 'the tutorial toggle must show its disabled state');
assert.strictEqual(importantSaveCount, 1, 'changing the tutorial pause choice must queue a save');
vm.runInContext('gameplayStarted = true; game.heroSelectionInitialized = true', runtime);
assert.strictEqual(vm.runInContext('isForegroundGameplayPausedForBackground()', runtime), false,
  'an active tutorial notice must not pause gameplay when the overlay-pause setting is disabled');
elements['tutorial-pause-overlay-toggle'].checked = true;
pauseToggleListener();
assert.strictEqual(vm.runInContext('isForegroundGameplayPausedForBackground()', runtime), true,
  'an active tutorial notice must pause gameplay when the overlay-pause setting is enabled');
const fixture = require('./lib/replay-fixture')();
const r = fixture.runtime;
const initialTime = fixture.state.combatTimeMs;
assert.strictEqual(r.runForegroundCombat(0), 0);
assert.strictEqual(r.runForegroundCombat(99), 0);
assert.strictEqual(r.runForegroundCombat(100), 1);
assert.strictEqual(r.runForegroundCombat(450), 3);
assert.strictEqual(fixture.state.combatTimeMs, initialTime + 400);
assert.strictEqual(r.runForegroundCombat(10000), 10, 'catch-up is bounded');
r.document.hidden = true;
assert.strictEqual(r.runForegroundCombat(20000), 0);
r.document.hidden = false;
assert.strictEqual(r.runForegroundCombat(20100), 1, 'hidden time is discarded');
fixture.run('backgroundCombatRuntime.processing = true');
assert.strictEqual(r.runForegroundCombat(30100), 0);
const clock = {lastAtMs: null, remainderMs: 0};
assert.strictEqual(r.takeForegroundCombatSteps(clock, 100, false), 0);
assert.strictEqual(r.takeForegroundCombatSteps(clock, 0, false), 0);
assert.throws(() => r.takeForegroundCombatSteps(clock, NaN, false), /finite/);
console.log('smoke-foreground-game-loop passed');
