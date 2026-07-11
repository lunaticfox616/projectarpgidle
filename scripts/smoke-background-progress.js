const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('js/ui.js', 'utf8');
const start = source.indexOf('const BACKGROUND_PROGRESS_RATE = 0.1;');
const end = source.indexOf('function syncLoop10PanelCopies', start);
assert(start >= 0 && end > start, 'background progress block not found');
const context = {
  console,
  Date: { now: () => context.now },
  now: 0,
  game: {},
  mergeDefaults: state => state,
  updateStaticUI: () => { context.updated = (context.updated || 0) + 1; },
  runUiCoreLoop: () => {
    context.game.exp += 1;
    context.game.killsInZone += 1;
    context.game.currencies.chaos = (context.game.currencies.chaos || 0) + 1;
  }
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);
const calc = ms => vm.runInContext(`calculateBackgroundProgressMs(${ms}, BACKGROUND_PROGRESS_RATE, MAX_BACKGROUND_PROGRESS_MS)`, context);
assert.strictEqual(calc(10 * 60 * 1000), 60 * 1000);
assert.strictEqual(calc(30 * 60 * 1000), 3 * 60 * 1000);
assert.strictEqual(calc(60 * 60 * 1000), 6 * 60 * 1000);
assert.strictEqual(calc(5 * 60 * 60 * 1000), 30 * 60 * 1000);
assert.strictEqual(calc(10 * 60 * 60 * 1000), 30 * 60 * 1000);
assert.strictEqual(calc(-1000), 0);
assert.strictEqual(calc((4 * 60 + 59) * 60 * 1000), 1794000);
assert.strictEqual(calc(5 * 60 * 60 * 1000), 1800000);
assert.strictEqual(calc((5 * 60 + 1) * 60 * 1000), 1800000);

context.game = { currentZoneId: 1, playerHp: 100, combatHalted: true, enemies: [], encounterPlan: [], moveTimer: 0, currencies: {}, inventory: [], exp: 0, killsInZone: 0 };
vm.runInContext('recordBackgroundCombatEntry(1000)', context);
assert.strictEqual(vm.runInContext('handleBackgroundCombatReturn(11 * 60 * 1000)', context), false);
assert.strictEqual(context.game.exp, 0);

context.game = { currentZoneId: 1, playerHp: 100, combatHalted: false, enemies: [{ hp: 5 }], encounterPlan: [], moveTimer: 0, currencies: { chaos: 0 }, inventory: [], exp: 0, killsInZone: 0 };
vm.runInContext('recordBackgroundCombatEntry(1000)', context);
context.game.currentZoneId = 2;
assert.strictEqual(vm.runInContext('handleBackgroundCombatReturn(11 * 60 * 1000)', context), false);
assert.strictEqual(context.game.exp, 0);

context.game = { currentZoneId: 1, playerHp: 100, combatHalted: false, enemies: [{ hp: 5 }], encounterPlan: [], moveTimer: 0, currencies: { chaos: 0 }, inventory: [], exp: 0, killsInZone: 0 };
vm.runInContext('recordBackgroundCombatEntry(1000)', context);
assert.strictEqual(vm.runInContext('handleBackgroundCombatReturn(11 * 60 * 1000)', context), true);
const onceExp = context.game.exp;
assert(onceExp > 0, 'background combat should award simulated exp once');
assert.strictEqual(vm.runInContext('handleBackgroundCombatReturn(12 * 60 * 1000)', context), false);
assert.strictEqual(context.game.exp, onceExp);
assert.strictEqual(vm.runInContext('backgroundCombatRuntime.processing', context), false);

context.game = { currentZoneId: 1, playerHp: 100, combatHalted: false, enemies: [{ hp: 5 }], encounterPlan: [], moveTimer: 0, currencies: {}, inventory: [], exp: 0, killsInZone: 0, pendingLoopReady: true };
vm.runInContext('recordBackgroundCombatEntry(1000)', context);
assert.strictEqual(vm.runInContext('handleBackgroundCombatReturn(11 * 60 * 1000)', context), false);
console.log('smoke-background-progress passed');
