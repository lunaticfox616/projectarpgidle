const assert = require('assert');
const fs = require('fs');
const vm = require('vm');


function extractConstBlock(source, name) {
  const start = source.indexOf(`const ${name} =`);
  assert(start >= 0, `${name} must exist`);
  const end = source.indexOf(';', start);
  assert(end > start, `${name} must end with semicolon`);
  return source.slice(start, end + 1);
}

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} must exist`);
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`failed to extract ${name}`);
}

const stateSource = fs.readFileSync('js/state.js', 'utf8');
const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
const runtime = [
  extractConstBlock(stateSource, 'OCEAN_PERMANENT_UPGRADE_DEFS'),
  extractConstBlock(stateSource, 'OCEAN_PERMANENT_UPGRADE_KEYS'),
  extractFunction(stateSource, 'createDefaultOceanState'),
  extractFunction(stateSource, 'ensureOceanPermanentUpgrades'),
  extractFunction(stateSource, 'ensureOceanState'),
  extractFunction(stateSource, 'getOceanPermanentUpgradeLevel'),
  extractFunction(stateSource, 'getOceanPermanentUpgradeEffect'),
  extractFunction(stateSource, 'getOceanOxygenSavingPct'),
  extractFunction(stateSource, 'getOceanPressureResistUpgradePct'),
  extractFunction(stateSource, 'getOceanOxygenMax'),
  extractFunction(stateSource, 'getOceanOxygenDrainPerSec'),
  extractFunction(stateSource, 'getOceanOxygenPerAttackCost'),
  extractFunction(stateSource, 'getOceanDepthTier'),
  extractFunction(stateSource, 'getOceanPendingBossBoundary'),
  extractFunction(stateSource, 'getOceanMoveSpeedDepthBonus'),
  extractFunction(passivesSource, 'getOceanPermanentUpgradeCost'),
  extractFunction(passivesSource, 'canPayOceanUpgradeCost'),
  extractFunction(passivesSource, 'payOceanUpgradeCost'),
  extractFunction(passivesSource, 'upgradeOceanPermanent'),
  extractFunction(passivesSource, 'tickOceanDepth')
].join('\n');

const logs = [];
const context = {
  console,
  game: { season: 11, ocean: { permanentUpgrades: {} }, currencies: {} },
  OCEAN_UNLOCK_LOOP: 11,
  addLog(message) { logs.push(message); },
  updateStaticUI() {},
  queueImportantSave() {},
  getPlayerStats() { return { moveSpeed: 100, oceanDepthGainPct: 0 }; },
  clampNumber(value, min, max) { return Math.max(min, Math.min(max, value)); }
};
vm.createContext(context);
vm.runInContext(runtime, context);

assert.strictEqual(context.getOceanOxygenDrainPerSec(), 0.5, 'time oxygen drain must be half of the former 1 oxygen per second base');
assert.strictEqual(context.getOceanOxygenPerAttackCost(), 0.25, 'attack oxygen drain must be half of the former 0.5 oxygen per attack base');
assert.strictEqual(context.getOceanPendingBossBoundary({ depthM: 500, bossClearM: 0 }), 0, 'ocean depth must not create special boss boundaries');

context.game.ocean.permanentUpgrades = { oxygenMax: 1, oxygenSaving: 1, pressureResist: 1 };
assert.strictEqual(context.getOceanOxygenMax(), 110, 'oxygen max upgrade should add real max oxygen');
assert.strictEqual(context.getOceanOxygenDrainPerSec(), 0.485, 'oxygen saving upgrade should reduce real per-second oxygen drain');
assert.strictEqual(context.getOceanOxygenPerAttackCost(), 0.2425, 'oxygen saving upgrade should reduce real per-attack oxygen drain');
assert.strictEqual(context.getOceanPressureResistUpgradePct(), 4, 'pressure upgrade should provide persistent pressure penalty reduction');

context.game.ocean.permanentUpgrades = { oxygenMax: 0, oxygenSaving: 0, pressureResist: 0 };
context.game.ocean.oxygenMax = 100;
context.game.ocean.oxygenCur = 100;
context.game.currencies = { skyEssence: 6, oceanRerollShard: 1, reefFragment: 2, bossCore: 0 };
assert.strictEqual(context.upgradeOceanPermanent('oxygenMax'), true, 'paid ocean upgrade should succeed with required sky and ocean currencies');
assert.strictEqual(context.game.ocean.permanentUpgrades.oxygenMax, 1, 'paid ocean upgrade should increment selected level');
assert.deepStrictEqual(context.game.currencies, { skyEssence: 0, oceanRerollShard: 0, reefFragment: 0, bossCore: 0 }, 'paid ocean upgrade should consume exact real currency costs');

const oceanState = { depthM: 499, checkpointM: 400, bossClearM: 0 };
context.tickOceanDepth(oceanState, 2);
assert.strictEqual(oceanState.depthM, 505, 'depth must continue past the former 500m boundary without a boss clear');
assert.strictEqual(oceanState.checkpointM, 500, 'continuous depth should still record 100m checkpoint milestones');
assert.strictEqual(oceanState.pressureLevel, 5, 'pressure tier must follow the continuously increasing depth');

console.log('ocean continuous depth smoke checks passed');
