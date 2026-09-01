const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const source = fs.readFileSync('js/ui.js', 'utf8');

['resetCombatCatchupClock', 'consumeCombatCatchupSteps', 'runCombatCatchupSteps'].forEach(name => {
  assert(!source.includes(name), `${name} should not remain in runtime ui.js`);
});
['calculateBackgroundProgressMs', 'recordBackgroundCombatEntry', 'handleBackgroundCombatReturn', 'simulateBackgroundCombat'].forEach(name => {
  assert(source.includes(`function ${name}`), `${name} should remain for background progress`);
});

const loopStart = source.indexOf('gameTickHandle = setInterval(() => {');
assert(loopStart >= 0, 'foreground game interval not found');
const loopEnd = source.indexOf('        }, 100);', loopStart);
assert(loopEnd > loopStart, 'foreground game interval end not found');
const loopBody = source.slice(loopStart, loopEnd);
assert.strictEqual((loopBody.match(/runUiCoreLoop\(\);/g) || []).length, 1, 'foreground tick must run core loop exactly once');
assert(loopBody.includes('if (blockingOverlayOpen || optionalOverlayOpen) return;'), 'overlay pause guard must remain');
assert(loopBody.includes('overlayPause && (isTutorialOpen() || isPauseSettingOverlayOpen())'),
  'tutorial and unlock guidance must follow the overlay-pause setting');
assert(loopBody.includes('tickOceanOxygen(now)'), 'ocean oxygen should use the foreground tick timestamp');
assert(!/let\s+combatSteps|consumeCombatCatchupSteps|runCombatCatchupSteps|resetCombatCatchupClock/.test(loopBody), 'foreground tick must not use removed catch-up helpers');
assert.strictEqual((loopBody.match(/let now = Date\.now\(\);/g) || []).length, 1, 'foreground tick should declare now once');

const runtime = buildGameRuntime();
const activeClasses = new Set();
let pauseToggleListener = null;
let importantSaveCount = 0;
const elements = {
  'tutorial-overlay': { classList: { add: name => activeClasses.add(name), remove: name => activeClasses.delete(name), contains: name => activeClasses.has(name) } },
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
vm.runInContext('gameplayStarted = true', runtime);
assert.strictEqual(vm.runInContext('isForegroundGameplayPausedForBackground()', runtime), false,
  'an active tutorial notice must not pause gameplay when the overlay-pause setting is disabled');
elements['tutorial-pause-overlay-toggle'].checked = true;
pauseToggleListener();
assert.strictEqual(vm.runInContext('isForegroundGameplayPausedForBackground()', runtime), true,
  'an active tutorial notice must pause gameplay when the overlay-pause setting is enabled');
console.log('smoke-foreground-game-loop passed');
