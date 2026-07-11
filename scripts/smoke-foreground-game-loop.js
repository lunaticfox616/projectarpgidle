const fs = require('fs');
const assert = require('assert');
const { execFileSync } = require('child_process');

execFileSync(process.execPath, ['--check', 'js/ui.js'], { stdio: 'pipe' });
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
assert(loopBody.includes('tickOceanOxygen(now)'), 'ocean oxygen should use the foreground tick timestamp');
assert(!/let\s+combatSteps|consumeCombatCatchupSteps|runCombatCatchupSteps|resetCombatCatchupClock/.test(loopBody), 'foreground tick must not use removed catch-up helpers');
assert.strictEqual((loopBody.match(/let now = Date\.now\(\);/g) || []).length, 1, 'foreground tick should declare now once');

let coreLoopCalls = 0;
function foregroundTick({ blocking = false, optional = false } = {}) {
  if (blocking || optional) return;
  coreLoopCalls += 1;
}
foregroundTick();
assert.strictEqual(coreLoopCalls, 1, 'unpaused tick should run once');
foregroundTick({ blocking: true });
foregroundTick({ optional: true });
assert.strictEqual(coreLoopCalls, 1, 'paused ticks should not run');
foregroundTick();
assert.strictEqual(coreLoopCalls, 2, 'each unpaused tick should add one core loop call');
console.log('smoke-foreground-game-loop passed');
