const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('js/ui.js', 'utf8');
assert(!source.includes('10)}% 속도로 전투가 진행됩니다'), 'background speed message should be removed');
assert(source.includes('background-combat-progress-bar-fill'), 'background calculation gauge should be present');
assert(source.includes('background-combat-fast-button'), 'background calculation needs a user-selectable fast mode');
assert(source.includes('BACKGROUND_PROGRESS_MAX_REAL_MS = 3 * 60 * 60 * 1000'), 'background accumulation must cap at three real hours');
assert(source.includes('총 처치') && source.includes('총 경험치') && source.includes('잃은 경험치') && source.includes('사망 횟수'), 'background result metrics should be present');
const start = source.indexOf('const BACKGROUND_PROGRESS_MIN_REAL_MS = 60 * 1000;');
const end = source.indexOf('function getUiConditionGemStatDelta', start);
assert(start >= 0 && end > start, 'background progress block not found');
const context = {
  console,
  Date: { now: () => context.now },
  now: 0,
  game: {},
  getExpReq: () => 10,
  mergeDefaults: state => state,
  updateStaticUI: () => { context.updated = (context.updated || 0) + 1; },
  safeExposeGlobals: entries => Object.assign(context, entries),
  runUiCoreLoop: () => {
    context.observedNow.push(context.Date.now());
    context.game.exp += 3;
    while (context.game.exp >= context.getExpReq(context.game.level)) {
      context.game.exp -= context.getExpReq(context.game.level);
      context.game.level += 1;
    }
    context.game.killsInZone += 1;
    context.game.loopKills += 1;
    if (context.game.killsInZone >= 7) context.game.killsInZone = 0;
    context.game.currencies.chaos = (context.game.currencies.chaos || 0) + 1;
  },
  observedNow: []
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);
const calc = ms => vm.runInContext(`calculateBackgroundProgressMs(${ms}, BACKGROUND_PROGRESS_MIN_REAL_MS, BACKGROUND_PROGRESS_RATE, BACKGROUND_PROGRESS_MAX_SIMULATED_MS)`, context);
assert.strictEqual(calc(0), 0);
assert.strictEqual(calc(10 * 1000), 0);
assert.strictEqual(calc(59999), 0);
assert.strictEqual(calc(60 * 1000), 6 * 1000);
assert.strictEqual(calc(60001), 6000);
assert.strictEqual(calc(10 * 60 * 1000), 60 * 1000);
assert.strictEqual(calc(60 * 60 * 1000), 6 * 60 * 1000);
assert.strictEqual(calc(3 * 60 * 60 * 1000), 18 * 60 * 1000);
assert.strictEqual(calc(5 * 60 * 60 * 1000), 18 * 60 * 1000);
assert.strictEqual(calc(24 * 60 * 60 * 1000), 18 * 60 * 1000);
assert.strictEqual(calc(-1000), 0);
vm.runInContext('requestFasterBackgroundCombat()', context);
assert.strictEqual(vm.runInContext('backgroundCombatRuntime.accelerationTier', context), 1, 'first click should select fast calculation');
vm.runInContext('requestFasterBackgroundCombat()', context);
assert.strictEqual(vm.runInContext('backgroundCombatRuntime.accelerationTier', context), 2, 'second click should select ultra calculation');
assert(vm.runInContext('BACKGROUND_COMBAT_ULTRA_CHUNK_BUDGET_MS', context) <= 16, 'ultra calculation must stay within a single frame budget so the UI keeps rendering smoothly');
assert(!source.includes('보상 85%') && !source.includes('보상 65%'), 'acceleration must not advertise a reward penalty');

context.game = { saveMeta: { lastModifiedAt: 1000 }, currentZoneId: 1, playerHp: 100, combatHalted: false, enemies: [], encounterPlan: [], moveTimer: 0, currencies: {}, inventory: [], level: 1, exp: 0, killsInZone: 0, loopKills: 0, loopDeaths: 0 };
assert.strictEqual(vm.runInContext('recordOfflineCombatEntry(11 * 60 * 1000)', context), true, 'saved timestamp should stage offline progress after a full disconnect');
assert.strictEqual(vm.runInContext('backgroundCombatRuntime.hiddenAtMs', context), 1000);
assert.strictEqual(vm.runInContext('recordOfflineCombatEntry(12 * 60 * 1000)', context), false, 'offline progress should only be staged once per session');

context.game = { currentZoneId: 1, playerHp: 100, combatHalted: true, enemies: [], encounterPlan: [], moveTimer: 0, currencies: {}, inventory: [], level: 1, exp: 0, killsInZone: 0, loopKills: 0, loopDeaths: 0 };
vm.runInContext('recordBackgroundCombatEntry(1000)', context);
assert.strictEqual(vm.runInContext('handleBackgroundCombatReturn(11 * 60 * 1000)', context), false);
assert.strictEqual(context.game.exp, 0);

context.game = { currentZoneId: 1, playerHp: 100, combatHalted: false, enemies: [{ hp: 5 }], encounterPlan: [], moveTimer: 0, currencies: { chaos: 0 }, inventory: [], level: 1, exp: 0, killsInZone: 0, loopKills: 0, loopDeaths: 0 };
vm.runInContext('recordBackgroundCombatEntry(1000)', context);
context.game.currentZoneId = 2;
assert.strictEqual(vm.runInContext('handleBackgroundCombatReturn(11 * 60 * 1000)', context), false);
assert.strictEqual(context.game.exp, 0);

context.game = { currentZoneId: 1, playerHp: 100, combatHalted: false, enemies: [{ hp: 5 }], encounterPlan: [], moveTimer: 0, currencies: { chaos: 0 }, inventory: [], level: 1, exp: 0, killsInZone: 0, loopKills: 0, loopDeaths: 0 };
vm.runInContext('recordBackgroundCombatEntry(1000)', context);
assert.strictEqual(vm.runInContext('handleBackgroundCombatReturn(11 * 60 * 1000)', context), true);
assert.deepStrictEqual(context.observedNow.slice(0, 3), [1000, 1100, 1200], 'background replay should advance Date.now per combat step');
assert.strictEqual(context.Date.now(), 0, 'Date.now should be restored after background replay');
const onceExp = context.game.exp;
assert(onceExp > 0, 'background combat should award simulated exp once');
assert(context.game.level > 1, 'background combat should preserve level-ups');
assert(context.game.loopKills > 0, 'background combat should preserve total kills');
assert.strictEqual(vm.runInContext('handleBackgroundCombatReturn(12 * 60 * 1000)', context), false);
assert.strictEqual(context.game.exp, onceExp);
assert.strictEqual(vm.runInContext('backgroundCombatRuntime.processing', context), false);

const metricResult = vm.runInContext(`simulateBackgroundCombat({ elapsedMs: 1000, snapshot: { currentZoneId: 1, playerHp: 100, combatHalted: false, enemies: [{ hp: 5 }], encounterPlan: [], moveTimer: 0, currencies: {}, inventory: [], level: 1, exp: 0, killsInZone: 0, loopKills: 0, loopDeaths: 0 }, startNowMs: 1000 })`, context);
assert.strictEqual(metricResult.metrics.kills, 10, 'kill metrics should not depend on zone kill counter resets');
assert.strictEqual(metricResult.metrics.exp, 30, 'experience metrics should include experience spent on level-ups');
const deathMetricResult = vm.runInContext(`simulateBackgroundCombat({ elapsedMs: 100, snapshot: { currentZoneId: 1, playerHp: 100, combatHalted: false, enemies: [{ hp: 5 }], encounterPlan: [], moveTimer: 0, currencies: {}, inventory: [], level: 1, exp: 2, killsInZone: 0, loopKills: 0, loopDeaths: 0 }, startNowMs: 1000, stepFn: () => { game.exp += 5; game.loopDeaths += 1; game.exp -= 3; game.lastDeathLog = { at: Date.now(), expLost: 3 }; } })`, context);
assert.strictEqual(deathMetricResult.metrics.exp, 5, 'gross experience should include experience earned before a death penalty');
assert.strictEqual(deathMetricResult.metrics.expLost, 3, 'lost experience should be tracked separately');
assert.strictEqual(deathMetricResult.metrics.deaths, 1, 'background deaths should be counted');

context.game = { currentZoneId: 1, playerHp: 100, combatHalted: false, enemies: [{ hp: 5 }], encounterPlan: [], moveTimer: 0, currencies: {}, inventory: [], level: 1, exp: 0, killsInZone: 0, loopKills: 0, loopDeaths: 0, pendingLoopReady: true };
vm.runInContext('recordBackgroundCombatEntry(1000)', context);
assert.strictEqual(vm.runInContext('handleBackgroundCombatReturn(11 * 60 * 1000)', context), false);
context.game = { currentZoneId: 1, playerHp: 100, combatHalted: false, enemies: [{ hp: 5 }], encounterPlan: [], moveTimer: 0, currencies: {}, inventory: [], level: 1, exp: 0, killsInZone: 0, loopKills: 0, loopDeaths: 0 };
vm.runInContext('gameplayStarted = false; recordBackgroundCombatEntry(1000)', context);
assert.strictEqual(vm.runInContext('backgroundCombatRuntime.snapshot', context), null, 'startup/login gate should not record a background combat snapshot');
console.log('smoke-background-progress passed');
