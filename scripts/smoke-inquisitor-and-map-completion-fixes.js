#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const combatSource = fs.readFileSync('js/combat.js', 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} must exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index++) {
    if (source[index] === '{') depth++;
    if (source[index] !== '}') continue;
    depth--;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} must have a complete body`);
}

const gemContext = {
  Math,
  Object,
  Array,
  Number,
  SUPPORT_GEM_DB: { '효과 증폭 보조': {} },
  game: {
    activeSkill: '원소 공격',
    ascendClass: 'inquisitor',
    ascendNodes: ['n12'],
  },
  getGemBonusSources: () => ({ gear: 0, passive: 0, reward: 0, total: 0 }),
  getEquippedJewelGemLevelBonusSources: () => 0,
  hasEmptyThroneSoloBonus: () => false,
  getGemLevelTargetTags: () => [],
  getClassTreeDef: () => ({ n12: { stat: 'gemLevel', val: 2 } }),
  hasKeystone: () => false,
};
vm.createContext(gemContext);
vm.runInContext(`${extractFunction(combatSource, 'getTargetGemBonusSources')}; this.getTargetGemBonusSources = getTargetGemBonusSources;`, gemContext);
const supportBonus = gemContext.getTargetGemBonusSources('효과 증폭 보조');
assert.strictEqual(supportBonus.passive, 2, 'Inquisitor fourth-ascendancy gem levels must apply to support gems');
assert.strictEqual(supportBonus.total, 2, 'support gem total level bonus must include the fourth-ascendancy node');

const completionContext = {
  Math,
  Array,
  Object,
  Number,
  METEOR_FALL_ZONE_ID: 'meteor_fall_site',
  UNDERWORLD_ZONE_ID: 'underworld_core',
  LABYRINTH_ZONE_ID: 'labyrinth',
  CHAOS_REALM_ZONE_ID: 'chaos_realm',
  game: {},
  getAbyssZoneIdForDepth: depth => `abyss_${depth}`,
  ensureChaosRealmState: () => ({ highestFloor: 1, currentFloor: 1 }),
  grantMeteorEncounterRewards() {},
  ensureStarWedgeState: () => completionContext.game.starWedge,
  clearWoodsmanBuildLock() {},
  getAutoProgressZoneId: id => id,
  startMoving() {},
  updateStaticUI() {},
  queueImportantSave() {},
  addLog() {},
};
completionContext.getZone = () => completionContext.zone;
vm.createContext(completionContext);
vm.runInContext([
  extractFunction(combatSource, 'resolveNextLoopBestPlusOneZone'),
  extractFunction(combatSource, 'enterAutomaticMeteorEncounter'),
  extractFunction(combatSource, 'finishEncounterRun'),
  'this.enterAutomaticMeteorEncounter = enterAutomaticMeteorEncounter;',
  'this.finishEncounterRun = finishEncounterRun;',
].join('\n'), completionContext);

completionContext.game = {
  currentZoneId: 'labyrinth',
  maxZoneId: 99,
  killsInZone: 0,
  settings: { mapCompleteAction: 'nextLoopBestPlusOne' },
  loopProgressCurrent: { bestAbyssDepth: 25, bestLabyrinthFloor: 8, bestChaosRealmFloor: 4 },
  starWedge: { entriesCleared: 0, activeMeteorTier: 3 },
};
completionContext.enterAutomaticMeteorEncounter();
assert.strictEqual(completionContext.game.currentZoneId, 'meteor_fall_site', 'automatic meteor entry must replace the prepared destination temporarily');
assert.strictEqual(completionContext.game.starWedge.meteorReturnZoneId, 'labyrinth', 'automatic meteor entry must preserve the exact interrupted destination');

completionContext.zone = { id: 'meteor_fall_site', type: 'meteor' };
completionContext.finishEncounterRun();
assert.strictEqual(completionContext.game.currentZoneId, 'labyrinth', 'meteor clear must resume the interrupted labyrinth instead of prioritizing an abyss record');
assert.strictEqual(completionContext.game.starWedge.meteorReturnZoneId, null, 'meteor return destination must be consumed after the encounter');
assert.strictEqual(completionContext.game.starWedge.entriesCleared, 1, 'meteor completion rewards and counters must remain intact');

completionContext.zone = { id: 'underworld_core', type: 'underworld', floor: 7 };
completionContext.game = {
  currentZoneId: 'underworld_core',
  killsInZone: 0,
  settings: { mapCompleteAction: 'repeatZone' },
  underworldProgress: { highestFloor: 7, currentFloor: 7 },
  underworldRunes: { unlockedSlots: 0, unlockedRunesMaxNumber: 0, obtainedRunes: [] },
};
completionContext.finishEncounterRun();
assert.strictEqual(completionContext.game.underworldProgress.currentFloor, 7, 'repeat-zone must keep the cleared underworld floor selected');
assert.strictEqual(completionContext.game.underworldProgress.highestFloor, 8, 'repeating an underworld floor must still unlock the next floor');
assert.strictEqual(completionContext.game.currentZoneId, 'underworld_core', 'repeat-zone must remain in the underworld map');

const doctrineLine = combatSource.match(/inquisitorAbsoluteDoctrinePct > 0 \? `([^`]+)` : null/);
assert(doctrineLine, 'Absolute Doctrine must add a DPS breakdown line');
assert(doctrineLine[1].includes('${Math.floor(inquisitorAbsoluteDoctrinePct)}%'), 'Absolute Doctrine DPS breakdown must show the applied resistance-penetration percentage');
assert(doctrineLine[1].includes('평균 한 방/DPS에 적용'), 'Absolute Doctrine DPS breakdown must explain that the value is included in DPS');

console.log('inquisitor and map completion regression checks passed');
