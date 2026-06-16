#!/usr/bin/env node
// 루프 10 이전 루프 조건 달성 시: 즉시 리셋하지 않고 시간 정지 상태(pendingLoopReady)로
// 전환해 정리 시간을 주고, [루프 진행] 확정 시에만 리셋한다.
const fs = require('fs');
const path = require('path');
const assertNode = require('assert');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const combatSource = fs.readFileSync(path.join(repoRoot, 'js/combat.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const uiPolishSource = fs.readFileSync(path.join(repoRoot, 'css/ui-polish.css'), 'utf8');
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
  clampNumber(value, min, max) { return Math.max(min, Math.min(max, value)); },
  createSeededRng() { return () => 0.5; },
  isCrowdProgressPaused() { return false; },
  getAbyssMonsterScales() { return { mapProgressMul: 1 }; },
  ensureChaosRealmState() { return { highestFloor: 0 }; },
  addLog() {},
  updateStaticUI() {},
});
vm.runInContext(fs.readFileSync(path.join(repoRoot, 'js/combat.js'), 'utf8'), context, { filename: 'js/combat.js' });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assertNode(combatSource.includes('let preservedTalismanUnlocked = !!game.talismanUnlocked || !!(game.unlocks && game.unlocks.talisman);'), 'loop reset must capture permanent talisman tab unlock state');
assertNode(combatSource.includes('if (preservedTalismanUnlocked) game.unlocks.talisman = true;'), 'loop reset must restore the talisman tab unlock flag');
assertNode(!combatSource.includes('game.talismanUnlocked = false;'), 'loop reset must not force the talisman tab back to locked');
assertNode(
  indexSource.indexOf('id="ui-enemy-list"') < indexSource.indexOf('id="loop-ready-banner"'),
  'loop ready button must render below the enemy info area instead of the global overlay stack'
);
assertNode(
  indexSource.includes('<button type="button" onclick="confirmLoopReady()">루프 진행 ▶</button>'),
  'loop ready action must be a stable button inside the enemy area'
);
const loopReadyCssBlock = (uiPolishSource.match(/\.loop-ready-banner \{[\s\S]*?\n\}/) || [''])[0];
assertNode(
  loopReadyCssBlock && !loopReadyCssBlock.includes('position: fixed;') && loopReadyCssBlock.includes('width: 100%;'),
  'loop ready banner must be inline and full-width so reflows do not steal clicks from the button'
);

let resetCalls = 0;
context.triggerSeasonReset = () => {
  resetCalls++;
  context.game.pendingLoopReady = false;
  context.game.pendingLoopDecision = false;
};

function resetGame(overrides) {
  context.game = Object.assign({
    season: 3,
    currentZoneId: 3,
    maxZoneId: 5,
    settings: {},
    beehive: { inRun: false },
    enemies: [{ hp: 10 }],
    encounterPlan: [{ at: 50 }],
    encounterIndex: 1,
    runProgress: 40,
    moveTimer: 0,
    combatHalted: false,
    pendingLoopReady: false,
    pendingLoopDecision: false,
  }, overrides || {});
}

// 루프 10 미만: 정지 상태로 전환되고 즉시 리셋하지 않는다.
resetGame({ season: 3 });
exposed.handleSeasonLoopConditionMet();
assert(context.game.pendingLoopReady === true, 'pre-loop-10 clear must enter pendingLoopReady pause');
assert(context.game.combatHalted === true, 'pre-loop-10 clear must halt combat');
assert(context.game.enemies.length === 0, 'pre-loop-10 clear must clear remaining enemies');
assert(context.game.runProgress === 0, 'pre-loop-10 clear must reset run progress');
assert(resetCalls === 0, 'pre-loop-10 clear must not trigger the season reset immediately');

// 정지 중에는 자동 재개/사냥터 이동이 막힌다.
let reconciled = exposed.reconcileMapProgressRuntimeState();
assert(context.game.combatHalted === true, 'combat must stay halted while pendingLoopReady is set');
assert(context.game.pendingLoopReady === true, `reconcile must not consume the pause flag (changed=${reconciled})`);
exposed.changeZone ? exposed.changeZone(4) : context.changeZone(4);
assert(context.game.currentZoneId === 3, 'changeZone must be blocked while pendingLoopReady is set');

// [루프 진행] 확정 시에만 리셋이 1회 실행된다.
exposed.confirmLoopReady();
assert(resetCalls === 1, 'confirmLoopReady must trigger exactly one season reset');
assert(context.game.pendingLoopReady === false, 'confirmLoopReady must consume the pause flag');
exposed.confirmLoopReady();
assert(resetCalls === 1, 'confirmLoopReady must be a no-op once the flag is consumed');

// 루프 10 이상: 기존처럼 즉시 리셋 경로를 따른다.
resetGame({ season: 10 });
exposed.handleSeasonLoopConditionMet();
assert(resetCalls === 2, 'loop 10+ non-abyss path must keep the immediate reset behavior');
assert(context.game.pendingLoopReady === false, 'loop 10+ path must not enter the pause state');

console.log('loop ready pause smoke checks passed');
