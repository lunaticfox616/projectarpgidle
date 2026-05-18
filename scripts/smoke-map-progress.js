#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const exposed = {};
const context = {
  console,
  window: {},
  game: {},
  safeExposeGlobals(obj) {
    Object.assign(exposed, obj);
    Object.assign(context, obj);
    Object.assign(context.window, obj);
  },
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(repoRoot, 'js/items.js'), 'utf8'), context, { filename: 'js/items.js' });
Object.assign(context, {
  performance: { now: () => 0 },
  ENEMY_CROWD_PAUSE_LIMIT: 999,
  getZone(id) { return { id, type: 'act', tier: 1, maxKills: 10, ele: 'phys' }; },
  isCrowdProgressPaused() { return false; },
  getAbyssMonsterScales() { return { mapProgressMul: 1 }; },
  ensureChaosRealmState() { return { highestFloor: 0 }; },
});
vm.runInContext(fs.readFileSync(path.join(repoRoot, 'js/combat.js'), 'utf8'), context, { filename: 'js/combat.js' });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function resetGame(overrides) {
  context.game = Object.assign({
    currentZoneId: 3,
    maxZoneId: 5,
    beehive: { inRun: false },
    enemies: [],
    encounterPlan: [],
    encounterIndex: 0,
    runProgress: 0,
    combatHalted: false,
  }, overrides || {});
}

resetGame({
  currentZoneId: 3,
  beehive: { inRun: false },
  encounterPlan: [{ at: 999 }],
  encounterIndex: 0,
  runProgress: 0,
});
exposed.advanceMapProgress({ moveSpeed: 100 });
assert(context.game.runProgress > 0, 'normal map progress should advance when beehive was never entered');

resetGame({
  currentZoneId: 'beehive_run',
  beehive: { inRun: true, returnZoneId: 4 },
  runProgress: 0,
  combatHalted: true,
});
assert(exposed.isBeehiveRunLockedForMapTravel() === false, 'stale beehive_run state should not stay locked');
assert(context.game.currentZoneId === 4, 'stale beehive_run state should return to saved returnZoneId');
assert(context.game.beehive.inRun === false, 'stale beehive_run state should clear inRun');
assert(context.game.combatHalted === false, 'stale beehive_run state should unhalt combat');

resetGame({
  currentZoneId: 7,
  beehive: { inRun: true, pendingChoice: { a: {} }, returnZoneId: 7 },
  runProgress: 0,
  combatHalted: true,
});
assert(exposed.isBeehiveRunLockedForMapTravel() === false, 'off-map beehive flags should not lock normal map progress');
assert(context.game.currentZoneId === 7, 'off-map beehive reconcile should keep current normal map');
assert(context.game.beehive.inRun === false, 'off-map beehive reconcile should clear inRun');

resetGame({
  currentZoneId: 'beehive_run',
  beehive: { inRun: true, pendingChoice: { a: {} }, returnZoneId: 4 },
});
assert(exposed.isBeehiveRunLockedForMapTravel() === true, 'active beehive choice should still lock travel');
assert(context.game.beehive.inRun === true, 'active beehive choice should preserve inRun');

resetGame({
  currentZoneId: 7,
  beehive: { inRun: true, pendingChoice: { a: {} }, returnZoneId: 7 },
  encounterPlan: [{ at: 999 }],
  encounterIndex: 0,
  runProgress: 0,
  combatHalted: true,
});
exposed.advanceMapProgress({ moveSpeed: 100 });
assert(context.game.runProgress > 0, 'normal map progress should advance after stale beehive reconciliation');
assert(context.game.beehive.inRun === false, 'advanceMapProgress should clear off-map stale beehive state');


resetGame({
  currentZoneId: 'beehive_run',
  beehive: { inRun: true, pendingChoice: { a: {} } },
  encounterPlan: [{ at: 999 }],
  encounterIndex: 0,
  runProgress: 0,
  combatHalted: true,
});
assert(exposed.isBeehiveRunLockedForMapTravel() === false, 'beehive_run pending choice without returnZone should be treated as stale');
assert(context.game.currentZoneId === 5, 'stale beehive_run without returnZone should fall back to maxZoneId');
exposed.advanceMapProgress({ moveSpeed: 100 });
assert(context.game.runProgress > 0, 'normal map progress should advance after clearing beehive_run pending-choice stale state');

console.log('map progress stale beehive smoke passed');
