#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');

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

const completionLogs = [];
const completionContext = {
  console, Date, Math, Array, Object, Number, JSON,
  window: null,
  game: {},
  safeExposeGlobals(exposed) {
    Object.assign(completionContext, exposed);
  },
  METEOR_FALL_ZONE_ID: 'meteor_fall_site',
  UNDERWORLD_ZONE_ID: 'underworld_core',
  LABYRINTH_ZONE_ID: 'labyrinth',
  CHAOS_REALM_ZONE_ID: 'chaos_realm',
  FOSSIL_DB: [],
  getZone(id) {
    if (id === 'meteor_fall_site') return { id, type: 'meteor', tier: 12, name: '운석 낙하 지점' };
    if (id === 'underworld_core') {
      let floor = completionContext.game.underworldProgress.currentFloor;
      return { id, type: 'underworld', floor, tier: 30, name: `지하계 ${floor}층` };
    }
    return { id, type: 'act', tier: 1, maxKills: 1, name: `지역 ${id}` };
  },
  getCurrentSeasonFinalZoneId: () => 20,
  getAbyssZoneIdForDepth: depth => depth,
  getStoryActByZoneId: () => null,
  getAutoProgressZoneId: id => id,
  ensureChaosRealmState: () => ({ highestFloor: 1, currentFloor: 1 }),
  ensureStarWedgeState: () => completionContext.game.starWedge,
  grantMeteorEncounterRewards() {},
  clearWoodsmanBuildLock() {},
  triggerMapUnlockReveal() {},
  markActRewardReady() {},
  checkUnlocks() {},
  queueImportantSave() {},
  updateStaticUI() {},
  addLog(message) { completionLogs.push(message); },
  isBeehiveRunLockedForMapTravel: () => false,
  P_STATS: {}, PASSIVES: {}, SEASON_NODES: {}, ASCEND_NODES: {}, SUPPORT_GEMS: {},
  SKILLS: { slash: { id: 'slash', name: '기본 공격', ele: 'phys', dmg: 1, spd: 1, tags: ['attack'], targets: 1 } },
  UNIQUE_EFFECTS: {}, UNIQUE_JEWELS: {}, UNIQUE_JEWEL_EFFECTS: {}, UNDERWORLD_RUNE_DB: [], PASSIVE_STAR_BLESSING: {},
  DOT_TICK_INTERVAL: 1, DOT_EFFECT_DURATION: 4, DOT_STACK_MAX: 5,
  LEECH_BASE_INSTANCE_CAP_PCT: 10, LEECH_BASE_TOTAL_CAP_PCT: 20, LEECH_BASE_RATE_CAP_PCT: 2,
  getEquippedSupportGems: () => [], getSupportGemLevel: () => 1, getSkillGemLevel: () => 1,
  getSkillDef: id => completionContext.SKILLS[id] || completionContext.SKILLS.slash,
  getActiveSkillStats: () => ({ ...completionContext.SKILLS.slash }), getClassTreeDef: () => ({}), hasKeystone: () => false,
  isDualWielding: () => false, getHeroSelectionDef: () => ({ stats: [] }), getSkyTowerLoopBonus: () => ({}),
  getLoopDeepBonus: () => ({}), getFavorEffects: () => ({}), getActiveShrineBuff: () => null,
  getActiveConstellationBonus: () => null, getSkillTargets: skill => skill.targets || 1, getGemAddedBaseDamage: () => 0,
  getGemPresentation: () => ({}), getCodexBonusPct: () => 0, getConditionGemStatDelta: () => 0,
  recalculateStarWedgeMutations: () => {}, assignStarWedgeSockets: () => {}, getArmorPhysicalReductionPct: () => 0,
  getEvasionChancePct: () => 0, getEnemyAccuracy: () => 100, getSkillTagDamageStatId: () => null,
  translateSkillTag: tag => tag, estimateSummonDps: () => ({ total: 0, lines: [] }), safeGetEquippedItem: () => null,
  getActiveSupportLinks: () => [], getActiveEnemyShockTakenDamageIncreasePct: () => 0,
  getPlayerShockTakenDamageIncreasePct: () => 0, getEnemyShockTakenDamageIncreasePct: () => 0,
  isDamageAilmentType: () => false, getDamageAilmentBaseDpsFromHit: () => 0, getDotStackMultiplier: stacks => stacks,
  dispatchRuntimeEvent: () => {}, clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
};
completionContext.window = completionContext;
vm.createContext(completionContext);
['js/utils.js', 'js/items.js', 'js/core-cube.js', 'js/combat.js'].forEach(file => {
  vm.runInContext(fs.readFileSync(file, 'utf8'), completionContext, { filename: file });
  if (file === 'js/utils.js') vm.runInContext('game = window.game;', completionContext);
});

completionContext.game = {
  ...makeDoctrineGame(),
  currentZoneId: 10,
  maxZoneId: 12,
  killsInZone: 0,
  season: 1,
  settings: { mapCompleteAction: 'nextZone', townReturnAction: 'retry', autoEnterMeteor: true },
  loopProgressCurrent: { specialBosses: [], chaos20Cleared: false, bestAbyssDepth: 25, bestLabyrinthFloor: 8, bestChaosRealmFloor: 4 },
  starWedge: { unlocked: true, skyRiftReady: true, skyRiftMinTier: 12, skyRiftGauge: 100, skyRiftCarryGauge: 7, entriesCleared: 0, activeMeteorTier: null },
  beehive: { inRun: false },
  voidRift: {},
  noti: {},
  enemies: [],
  encounterPlan: [],
};
vm.runInContext('game = window.game;', completionContext);
completionContext.finishEncounterRun();
assert.strictEqual(completionContext.game.currentZoneId, 'meteor_fall_site', 'normal map completion must trigger the production automatic-meteor entry path');
assert.strictEqual(completionContext.game.starWedge.meteorReturnZoneId, 12, 'automatic meteor entry must preserve the destination selected by map completion');
assert.strictEqual(completionContext.game.starWedge.activeMeteorTier, 12, 'automatic meteor entry must initialize the encounter tier through the production entry path');
assert.strictEqual(completionContext.game.starWedge.skyRiftReady, false, 'automatic meteor entry must consume the ready rift');
assert.strictEqual(completionContext.game.starWedge.skyRiftGauge, 7, 'automatic meteor entry must carry the configured overflow gauge');
assert(completionContext.game.moveTimer > 0, 'normal map completion must continue through the real movement transition');
assert(completionLogs.some(message => message.includes('자동입장')), 'automatic meteor entry must remain observable in the combat log');

completionContext.finishEncounterRun();
assert.strictEqual(completionContext.game.currentZoneId, 12, 'meteor completion must resume the destination interrupted by automatic entry');
assert.strictEqual(completionContext.game.starWedge.meteorReturnZoneId, null, 'meteor return destination must be consumed after the encounter');
assert.strictEqual(completionContext.game.starWedge.entriesCleared, 1, 'meteor completion rewards and counters must remain intact');

completionContext.game = {
  ...makeDoctrineGame(),
  currentZoneId: 'underworld_core',
  maxZoneId: 5,
  killsInZone: 0,
  settings: { mapCompleteAction: 'repeatZone', townReturnAction: 'retry' },
  underworldProgress: { highestFloor: 7, currentFloor: 7 },
  underworldRunes: { unlockedSlots: 0, unlockedRunesMaxNumber: 0, obtainedRunes: [] },
  enemies: [],
  encounterPlan: [],
};
vm.runInContext('game = window.game;', completionContext);
completionContext.finishEncounterRun();
assert.strictEqual(completionContext.game.underworldProgress.currentFloor, 7, 'repeat-zone must keep the cleared underworld floor selected');
assert.strictEqual(completionContext.game.underworldProgress.highestFloor, 8, 'repeating an underworld floor must still unlock the next floor');
assert.strictEqual(completionContext.game.currentZoneId, 'underworld_core', 'repeat-zone must remain in the underworld map');


completionContext.game = {
  ...makeDoctrineGame(),
  loopProgressCurrent: { specialBosses: [], chaos20Cleared: true, bestAbyssDepth: 20, bestLabyrinthFloor: 0, bestChaosRealmFloor: 0 },
  abyssUnlockedDepths: [20, 21, 30],
};
vm.runInContext('game = window.game;', completionContext);
const depth20NextLoopTarget = completionContext.resolveNextLoopBestPlusOneZone({ id: 20, type: 'abyss', depth: 20 });
assert.strictEqual(depth20NextLoopTarget, completionContext.getAbyssZoneIdForDepth(21), 'nextLoopBestPlusOne must go to the next area from the current loop depth after chaos 20');
completionContext.game.loopProgressCurrent.bestAbyssDepth = 30;
const missingUnlockedNextTarget = completionContext.resolveNextLoopBestPlusOneZone({ id: 20, type: 'abyss', depth: 20 });
assert.strictEqual(missingUnlockedNextTarget, null, 'nextLoopBestPlusOne must not fall back to an older highest unlocked deep chaos floor when the current-loop next depth is unavailable');
completionContext.game.abyssUnlockedDepths.push(31);
const depth30NextLoopTarget = completionContext.resolveNextLoopBestPlusOneZone({ id: 30, type: 'abyss', depth: 30 });
assert.strictEqual(depth30NextLoopTarget, completionContext.getAbyssZoneIdForDepth(31), 'nextLoopBestPlusOne may continue to the next unlocked current-loop deep chaos floor');

function makeDoctrineGame() {
  return {
    level: 1,
    equipment: {},
    passives: [],
    seasonNodes: [],
    ascendNodes: [],
    ascendClass: 'inquisitor',
    ascendKeystones: [],
    actRewardBonuses: [{ stat: 'resPen', value: 30 }],
    journalBonuses: [],
    equippedSupports: [],
    selectedSkill: 'flame',
    activeSkill: 'flame',
    skillLevels: { flame: 1 },
    supportLinks: {},
    season: 20,
    loopCount: 20,
    talismanPlacements: {},
    talismanBoard: [],
    jewelSlots: [],
    coreCube: { completed: false, revealedOptions: [], powers: {}, faces: [null, null, null, null, null, null] },
    unlocks: {},
    enemies: [],
    class: 'warrior',
    resonancePower: 0,
  };
}

function createDoctrineHarness() {
  const context = {
    console, Date, Math, window: null,
    game: makeDoctrineGame(),
    safeExposeGlobals: exposed => Object.assign(context, exposed),
    P_STATS: {}, PASSIVES: {}, SEASON_NODES: {}, ASCEND_NODES: {}, SUPPORT_GEMS: {},
    SKILLS: { flame: { id: 'flame', name: '화염 공격', ele: 'fire', dmg: 1, spd: 1, tags: ['attack'], targets: 1 } },
    UNIQUE_EFFECTS: {}, UNIQUE_JEWELS: {}, UNIQUE_JEWEL_EFFECTS: {}, UNDERWORLD_RUNE_DB: [], PASSIVE_STAR_BLESSING: {},
    DOT_TICK_INTERVAL: 1, DOT_EFFECT_DURATION: 4, DOT_STACK_MAX: 5,
    LEECH_BASE_INSTANCE_CAP_PCT: 10, LEECH_BASE_TOTAL_CAP_PCT: 20, LEECH_BASE_RATE_CAP_PCT: 2,
    getEquippedSupportGems: () => [], getSupportGemLevel: () => 1, getSkillGemLevel: () => 1,
    getSkillDef: id => context.SKILLS[id] || context.SKILLS.flame,
    getActiveSkillStats: () => ({ ...context.SKILLS.flame }),
    getClassTreeDef: () => ({}),
    hasKeystone: id => context.game.ascendKeystones.includes(id),
    isDualWielding: () => false, getHeroSelectionDef: () => ({ stats: [] }), getSkyTowerLoopBonus: () => ({}),
    getLoopDeepBonus: () => ({}), ensureChaosRealmState: () => ({ permanentBonuses: {} }), getFavorEffects: () => ({}),
    getActiveShrineBuff: () => null, getActiveConstellationBonus: () => null, getSkillTargets: skill => skill.targets || 1,
    getGemAddedBaseDamage: () => 0, getGemPresentation: () => ({}), getCodexBonusPct: () => 0,
    getZone: () => ({ resistPenalty: 0, accuracy: 100 }), getConditionGemStatDelta: () => 0,
    recalculateStarWedgeMutations: () => {}, assignStarWedgeSockets: () => {}, getArmorPhysicalReductionPct: () => 0,
    getEvasionChancePct: () => 0, getEnemyAccuracy: () => 100, getSkillTagDamageStatId: () => null,
    translateSkillTag: tag => tag, estimateSummonDps: () => ({ total: 0, lines: [] }), safeGetEquippedItem: () => null,
    getActiveSupportLinks: () => [], getActiveEnemyShockTakenDamageIncreasePct: () => 0,
    getPlayerShockTakenDamageIncreasePct: () => 0, getEnemyShockTakenDamageIncreasePct: () => 0,
    isDamageAilmentType: () => false, getDamageAilmentBaseDpsFromHit: () => 0, getDotStackMultiplier: stacks => stacks,
    dispatchRuntimeEvent: () => {}, clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  };
  context.window = context;
  vm.createContext(context);
  ['js/utils.js', 'js/core-cube.js', 'js/combat.js'].forEach(file => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
    if (file === 'js/utils.js') vm.runInContext('game = window.game;', context);
  });
  return context;
}

const doctrineContext = createDoctrineHarness();
const withoutDoctrine = doctrineContext.getPlayerStats();
doctrineContext.game.ascendKeystones = ['iq8'];
const withDoctrine = doctrineContext.getPlayerStats();
const doctrineDpsLine = withDoctrine.breakdowns.dps.lines.find(line => line.includes('절대 교리 반영'));
assert.strictEqual(withDoctrine.baseDmg, Math.floor(withoutDoctrine.baseDmg * 1.3), 'Absolute Doctrine must apply the same 30% contribution shown in the DPS breakdown');
assert(withDoctrine.directDps > withoutDoctrine.directDps, 'Absolute Doctrine must increase displayed DPS for an elemental skill with resistance penetration');
assert(doctrineDpsLine && doctrineDpsLine.includes('저항 관통 +30%'), 'DPS breakdown must show the applied 30% resistance-penetration contribution');
assert(doctrineDpsLine.includes('평균 한 방/DPS에 적용'), 'DPS breakdown must explain that Absolute Doctrine is included in average hit and DPS');
assert(!withoutDoctrine.breakdowns.dps.lines.some(line => line.includes('절대 교리 반영')), 'DPS breakdown must omit Absolute Doctrine when the keystone is inactive');

doctrineContext.game.ascendKeystones = ['iq3'];
doctrineContext.game.resonancePower = 10;
doctrineContext.game.sealedSkills = [];
doctrineContext.game.sealedSupports = [];
const scriptureExpansionStats = doctrineContext.getPlayerStats();
assert.strictEqual(scriptureExpansionStats.inquisitorResonanceBonus, 10, 'Scripture Expansion must grant a flat +10 resonance bonus');
assert.strictEqual(doctrineContext.game.resonancePower, 10, 'reading player stats must not mutate stored resonance power');

const resonanceUiContext = {
  Math,
  game: doctrineContext.game,
  getUiPlayerStats: () => scriptureExpansionStats,
};
vm.createContext(resonanceUiContext);
vm.runInContext(`${extractFunction(uiSource, 'getEffectiveResonanceCap')}; this.getEffectiveResonanceCap = getEffectiveResonanceCap;`, resonanceUiContext);
assert.strictEqual(resonanceUiContext.getEffectiveResonanceCap(), 20, 'the support-gem UI must display base resonance 10 plus the iq3 bonus 10');
doctrineContext.game.ascendKeystones = ['iq1'];
const doctrineExecutionOnly = doctrineContext.getPlayerStats();
doctrineContext.game.ascendKeystones = ['iq1', 'iq3'];
const doctrineWithExpansion = doctrineContext.getPlayerStats();
assert(doctrineWithExpansion.baseDmg > doctrineExecutionOnly.baseDmg, 'iq1 damage scaling must use the +10 resonance granted by iq3');

doctrineContext.game.ascendKeystones = ['iq3'];
doctrineContext.game.resonancePower = 14;
doctrineContext.game.sealedSkills = ['a', 'b'];
doctrineContext.game.sealedSupports = ['c', 'd'];
const sealedGemStats = doctrineContext.getPlayerStats();
resonanceUiContext.game = doctrineContext.game;
resonanceUiContext.getUiPlayerStats = () => sealedGemStats;
assert.strictEqual(sealedGemStats.inquisitorResonanceBonus, 11, 'Scripture Expansion must add +1 resonance per four sealed gems');
assert.strictEqual(resonanceUiContext.getEffectiveResonanceCap(), 25, 'effective resonance must include stored seal resonance and the iq3 sealed-gem bonus exactly once');

console.log('inquisitor and map completion regression checks passed');
