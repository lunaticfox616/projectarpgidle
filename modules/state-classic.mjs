// Shared state bridge: remove the aliases when the last classic consumer uses the application entry.
import { createProgressionDefinitions } from './data/world-progression-definitions.mjs';
import { createPassivesDefinitions } from './data/season-passive-definitions.mjs';
import { createSupportsDefinitions } from './data/support-gem-definitions.mjs';
import { createAffixesDefinitions } from './data/equipment-affix-definitions.mjs';
import { createRunesDefinitions } from './data/underworld-rune-definitions.mjs';
import { createBasesDefinitions } from './data/equipment-base-definitions.mjs';
import { initializeSkillDefaults } from './data/skill-defaults.mjs';
import { PassiveEquipmentRules } from './domain/passive-equipment-rules.mjs';
import { WorldNotices } from './application/world-notices.mjs';
import { StoryActLabels } from './domain/story-act-labels.mjs';
import { ChaosRealmState } from './state/chaos-realm.mjs';
import { RealmDifficulty } from './common/realm-difficulty.mjs';
import { RealmProgress } from './state/realm-progress.mjs';
import { RealmUnlockRules } from './domain/realm-unlocks.mjs';
import { OceanProgressState } from './state/ocean-progress.mjs';
import { OceanEnvironment } from './domain/ocean-environment.mjs';
import { SkyTowerProgressState } from './state/sky-tower-progress.mjs';
import { SkyTowerRules } from './domain/sky-tower-rules.mjs';
import { ChallengeZoneDefinitions } from './domain/challenge-zone-definitions.mjs';
import { WorldZoneCatalog } from './domain/world-zone-catalog.mjs';
import { TimeRiftState } from './state/time-rift-progress.mjs';
import { TimeRiftInheritance } from './domain/time-rift-inheritance.mjs';
import { LoopEntryProgress } from './domain/loop-entry-progress.mjs';
import { ChaosNavigation } from './combat/chaos-navigation.mjs';
import { LoopPermanentBonuses } from './domain/loop-permanent-bonuses.mjs';
import { PassiveProgression } from './domain/passive-progression.mjs';
import { createDefaultGame } from './state/default-game.mjs';
import { consumeDomainCommands as consumeCommands } from './common/consume-commands.mjs';

const progressionData = createProgressionDefinitions({ STORY_ACTS, OCEAN_FISH_DB, OCEAN_FISH_COLLECTION_MILESTONES, HERO_SELECTION_DEFS, PLAYER_CLASS_DEFS });
const passivesData = createPassivesDefinitions();
initializeSkillDefaults(SKILL_DB);
const supportsData = createSupportsDefinitions();
const affixesData = createAffixesDefinitions({ REGION_AFFIX_MODS, INFLUENCE_AFFIX_MODS, AFFIX_TAG_LISTS, resolveAffixTagList });
const runesData = createRunesDefinitions();
const basesData = createBasesDefinitions();
const data = { ...progressionData, ...passivesData, ...supportsData, ...affixesData, ...runesData, ...basesData };
const effects = {
    get addLog() { return addLog; },
    get updateStaticUI() { return updateStaticUI; },
    get warnBeehiveMapTravelBlocked() { return warnBeehiveMapTravelBlocked; },
    get startMoving() { return startMoving; },
    get enterAutomaticMapInterruptionAfterClear() { return enterAutomaticMapInterruptionAfterClear; },
};
const equipmentDeps = {
    get PASSIVE_EQUIPMENT_RESTRICTIONS() { return PASSIVE_EQUIPMENT_RESTRICTIONS; },
    get game() { return window.GameModules.state.game; },
};
const equipment = new PassiveEquipmentRules(equipmentDeps, data);
const noticesDeps = {
    get contentProgression() { return typeof contentProgression === 'undefined' ? undefined : contentProgression; },
    get game() { return window.GameModules.state.game; },
    get tutorialHistory() { return window.GameModules.state.tutorials; },
};
const notices = new WorldNotices(noticesDeps, data);
const storyDeps = {
    get STORY_ACTS() { return STORY_ACTS; },
    get _t() { return _t; },
};
const story = new StoryActLabels(storyDeps, data);
const chaosDeps = {
    get game() { return window.GameModules.state.game; },
};
const chaos = new ChaosRealmState(chaosDeps, data);
const difficultyDeps = {
    get TIME_RIFT_EQUIVALENT_CHAOS_DEPTHS() { return TIME_RIFT_EQUIVALENT_CHAOS_DEPTHS; },
    get TIME_RIFT_LOOP_BEHIND_DEPTH() { return TIME_RIFT_LOOP_BEHIND_DEPTH; },
    get TIME_RIFT_MAX_PRESSURE() { return TIME_RIFT_MAX_PRESSURE; },
    get UNDERWORLD_DEEP_FLOOR_REWARD() { return UNDERWORLD_DEEP_FLOOR_REWARD; },
    get UNDERWORLD_DIFFICULTY_CONFIG() { return UNDERWORLD_DIFFICULTY_CONFIG; },
    get hashSeed() { return hashSeed; },
};
const difficulty = new RealmDifficulty(difficultyDeps, data);
const progressDeps = {
    get METEOR_SITE_UNLOCK_ACT() { return METEOR_SITE_UNLOCK_ACT; },
    get METEOR_SITE_UNLOCK_LOOP() { return METEOR_SITE_UNLOCK_LOOP; },
    get game() { return window.GameModules.state.game; },
};
const progress = new RealmProgress(progressDeps, data, { difficulty });
const unlocksDeps = {
    get MAP_PRIMARY_CONTENTS() { return MAP_PRIMARY_CONTENTS; },
    get OCEAN_UNLOCK_LOOP() { return OCEAN_UNLOCK_LOOP; },
    get _t() { return _t; },
    get game() { return window.GameModules.state.game; },
};
const unlocks = new RealmUnlockRules(unlocksDeps, data, { chaos, progress });
const oceanDeps = {
    get OCEAN_AUTO_REDIVE() { return OCEAN_AUTO_REDIVE; },
    get OCEAN_FISHING_STRATEGIES() { return OCEAN_FISHING_STRATEGIES; },
    get OCEAN_FISH_DB() { return OCEAN_FISH_DB; },
    get OCEAN_UNLOCK_LOOP() { return OCEAN_UNLOCK_LOOP; },
    get game() { return window.GameModules.state.game; },
};
const ocean = new OceanProgressState(oceanDeps, data);
const oceanRulesDeps = {
    get game() { return window.GameModules.state.game; },
};
const oceanRules = new OceanEnvironment(oceanRulesDeps, data, { ocean, difficulty });
const skyDeps = {
    get game() { return window.GameModules.state.game; },
};
const sky = new SkyTowerProgressState(skyDeps, data, { progress });
const skyRulesDeps = {
    get _t() { return _t; },
    get canAddLog() { return typeof addLog === 'function'; },
    get game() { return window.GameModules.state.game; },
};
const skyRules = new SkyTowerRules(skyRulesDeps, data, { sky, progress });
const challengesDeps = {
    get BEYOND_BOUNDARY_DAMAGE_GROWTH() { return BEYOND_BOUNDARY_DAMAGE_GROWTH; },
    get BEYOND_BOUNDARY_DIFFICULTY_OFFSET() { return BEYOND_BOUNDARY_DIFFICULTY_OFFSET; },
    get BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER() { return BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER; },
    get BEYOND_BOUNDARY_HP_GROWTH() { return BEYOND_BOUNDARY_HP_GROWTH; },
    get BEYOND_BOUNDARY_INTENSITY_DB() { return BEYOND_BOUNDARY_INTENSITY_DB; },
    get BEYOND_BOUNDARY_MUTATOR_DB() { return BEYOND_BOUNDARY_MUTATOR_DB; },
    get BEYOND_BOUNDARY_REWARD_FOCUS_DB() { return BEYOND_BOUNDARY_REWARD_FOCUS_DB; },
    get BEYOND_BOUNDARY_TIER_CAP() { return BEYOND_BOUNDARY_TIER_CAP; },
    get BEYOND_BOUNDARY_ZONE_ID() { return BEYOND_BOUNDARY_ZONE_ID; },
    get COSMOS_EXPEDITION_DIRECTIVE_DB() { return typeof COSMOS_EXPEDITION_DIRECTIVE_DB === 'undefined' ? undefined : COSMOS_EXPEDITION_DIRECTIVE_DB; },
    get GRAND_BREACH_ENCOUNTER() { return GRAND_BREACH_ENCOUNTER; },
    get actExplorationDoors() { return typeof actExplorationDoors === 'undefined' ? undefined : actExplorationDoors; },
    get clampNumber() { return clampNumber; },
    get contentMaps() { return contentMaps; },
    get getBeyondBoundaryRewardMul() { return getBeyondBoundaryRewardMul; },
};
const challenges = new ChallengeZoneDefinitions(challengesDeps, data, { difficulty });
const riftDeps = {
    get TIME_RIFT_MAX_PRESSURE() { return TIME_RIFT_MAX_PRESSURE; },
    get game() { return window.GameModules.state.game; },
};
const rift = new TimeRiftState(riftDeps, data);
const zonesDeps = {
    get ATLAS() { return ATLAS; },
    get BEYOND_BOUNDARY_ZONE_ID() { return BEYOND_BOUNDARY_ZONE_ID; },
    get LABYRINTH_ZONE_ID() { return LABYRINTH_ZONE_ID; },
    get METEOR_FALL_ZONE_ID() { return METEOR_FALL_ZONE_ID; },
    get METEOR_KINDS() { return METEOR_KINDS; },
    get OCEAN_ZONE_ID() { return OCEAN_ZONE_ID; },
    get SEASON_BOSS_ZONES() { return SEASON_BOSS_ZONES; },
    get TIME_RIFT_FUTURE_ZONE_ID() { return TIME_RIFT_FUTURE_ZONE_ID; },
    get TIME_RIFT_PAST_ZONE_ID() { return TIME_RIFT_PAST_ZONE_ID; },
    get TRIAL_ZONES() { return TRIAL_ZONES; },
    get actExplorationDoors() { return typeof actExplorationDoors === 'undefined' ? undefined : actExplorationDoors; },
    get atlas() { return atlas; },
    get contentMaps() { return contentMaps; },
    get game() { return window.GameModules.state.game; },
};
const zones = new WorldZoneCatalog(zonesDeps, data, { challenges, difficulty, chaos, sky, skyRules, rift, ocean, oceanRules });
const riftRulesDeps = {
    get TIME_RIFT_KEEP_CAP() { return TIME_RIFT_KEEP_CAP; },
    get TIME_RIFT_MAX_PRESSURE() { return TIME_RIFT_MAX_PRESSURE; },
    get TIME_RIFT_OPTION_KEEP() { return TIME_RIFT_OPTION_KEEP; },
    get TIME_RIFT_OPTION_KEEP_PAST_CAP() { return TIME_RIFT_OPTION_KEEP_PAST_CAP; },
};
const riftRules = new TimeRiftInheritance(riftRulesDeps, data);
const loopDeps = {
    get LOOP_GATE_ABYSS_DEPTH_CAP() { return LOOP_GATE_ABYSS_DEPTH_CAP; },
    get LOOP_GATE_ALT_COSMOS_PLANET_ID() { return LOOP_GATE_ALT_COSMOS_PLANET_ID; },
    get LOOP_GATE_ALT_COSMOS_PLANET_NAME() { return LOOP_GATE_ALT_COSMOS_PLANET_NAME; },
    get LOOP_GATE_ALT_START_SEASON() { return LOOP_GATE_ALT_START_SEASON; },
    get SEASON_CONTENT_ROADMAP() { return SEASON_CONTENT_ROADMAP; },
    get _t() { return _t; },
    get clampNumber() { return clampNumber; },
    get game() { return window.GameModules.state.game; },
};
const loop = new LoopEntryProgress(loopDeps, data, { progress, difficulty });
const navigationDeps = {
    get _t() { return _t; },
    get canWarnBeehiveMapTravelBlocked() { return typeof warnBeehiveMapTravelBlocked === 'function'; },
    get ensureNextEndlessChaosDepthUnlocked() { return ensureNextEndlessChaosDepthUnlocked; },
    get game() { return window.GameModules.state.game; },
    get isBeehiveRunLockedForMapTravel() { return typeof isBeehiveRunLockedForMapTravel === 'undefined' ? undefined : isBeehiveRunLockedForMapTravel; },
};
const navigation = new ChaosNavigation(navigationDeps, data, { zones, progress, difficulty });
const bonusesDeps = {
    get LOOP_DEEP_STATS() { return LOOP_DEEP_STATS; },
    get PINNACLE_FIRST_KILL_JOURNALS() { return PINNACLE_FIRST_KILL_JOURNALS; },
    get WORLD_TREE_BARK() { return WORLD_TREE_BARK; },
    get _t() { return _t; },
    get contentProgression() { return typeof contentProgression === 'undefined' ? undefined : contentProgression; },
    get game() { return window.GameModules.state.game; },
    get getStatName() { return getStatName; },
};
const bonuses = new LoopPermanentBonuses(bonusesDeps, data);
const passivesDeps = {
    get ASCENDANCIES_BY_PLAYER_CLASS() { return ASCENDANCIES_BY_PLAYER_CLASS; },
    get CLASS_KEYSTONE_DEFS() { return CLASS_KEYSTONE_DEFS; },
    get CLASS_TEMPLATES() { return CLASS_TEMPLATES; },
    get PASSIVE_TREE_V22() { return typeof PASSIVE_TREE_V22 === 'undefined' ? undefined : PASSIVE_TREE_V22; },
    get game() { return window.GameModules.state.game; },
};
const passives = new PassiveProgression(passivesDeps, data);
data.MAP_ZONES = STORY_ACTS.map((act, idx) => ({
    id: idx,
    name: story.getActZoneDisplayName(idx),
    type: 'act',
    tier: act.tier,
    maxKills: act.maxKills,
    ele: act.ele,
    storyActId: act.id,
    storyOrder: act.order
}));
for (let i = 1; i <= 20; i++) data.MAP_ZONES.push({ id: data.ABYSS_START_ZONE_ID + (i - 1), name: "혼돈 " + i, type: "abyss", tier: data.abyssTiers[i - 1], maxKills: 1, ele: "chaos", depth: i });
const defaultGame = createDefaultGame({ CONTENT_UNLOCK_RECORD_VERSION, PASSIVE_LAYOUT_VERSION, BEYOND_BOUNDARY_STATE_VERSION, createDefaultChaosRealmState: chaos.createDefaultChaosRealmState, createDefaultSkyTowerState: sky.createDefaultSkyTowerState, createDefaultOceanState: ocean.createDefaultOceanState });
const runtime = window.GameModules.state;
runtime.defaultDefinitions = defaultGame;
runtime.normalizeTimeRiftResult = rift.normalizeTimeRiftResult;
runtime.underworldMilestoneReward = difficulty.underworldMilestoneReward;
const classicStateAccessors = {
    startupOverlayActive: { configurable: true, get() { return runtime.controls.startupOverlayActive; }, set(value) { runtime.controls.startupOverlayActive = value; } },
    gameplayStarted: { configurable: true, get() { return runtime.controls.gameplayStarted; }, set(value) { runtime.controls.gameplayStarted = value; } },
    gameEntryRunning: { configurable: true, get() { return runtime.controls.gameEntryRunning; }, set(value) { runtime.controls.gameEntryRunning = value; } },
    pendingMapRevealZoneId: { configurable: true, get() { return runtime.controls.pendingMapRevealZoneId; }, set(value) { runtime.controls.pendingMapRevealZoneId = value; } },
    pendingMapRevealToken: { configurable: true, get() { return runtime.controls.pendingMapRevealToken; }, set(value) { runtime.controls.pendingMapRevealToken = value; } },
    backgroundCombatRuntime: { configurable: true, get() { return runtime.controls.backgroundCombatRuntime; }, set(value) { runtime.controls.backgroundCombatRuntime = value; } },
    tutorialQueue: { configurable: true, get() { return runtime.tutorialQueue; }, set(value) { runtime.tutorialQueue = value; } },
    cloudState: { configurable: true, get() { return window.GameModules.cloudAccountState.current; }, set(value) { window.GameModules.cloudAccountState.current = value; } },
};
Object.defineProperties(window, classicStateAccessors);
if (globalThis !== window) Object.defineProperties(globalThis, classicStateAccessors);
const classicNames = {
    TUTORIAL_SEEN_ALIASES: data.TUTORIAL_SEEN_ALIASES,
    ACT_ZONE_COUNT: data.ACT_ZONE_COUNT,
    LAST_STORY_ZONE_ID: data.LAST_STORY_ZONE_ID,
    ABYSS_START_ZONE_ID: data.ABYSS_START_ZONE_ID,
    OUTSIDE_CHAOS_ZONE_ID: data.OUTSIDE_CHAOS_ZONE_ID,
    CHAOS_REALM_ZONE_ID: data.CHAOS_REALM_ZONE_ID,
    SKY_TOWER_ZONE_ID: data.SKY_TOWER_ZONE_ID,
    WOODSMAN_ECHO_ZONE_ID: data.WOODSMAN_ECHO_ZONE_ID,
    UNDERWORLD_ZONE_ID: data.UNDERWORLD_ZONE_ID,
    abyssTiers: data.abyssTiers,
    CHAOS_REALM_DEFAULT_BONUSES: data.CHAOS_REALM_DEFAULT_BONUSES,
    ABYSS_ENDLESS_STEEP_FLOOR_HP_MUL: data.ABYSS_ENDLESS_STEEP_FLOOR_HP_MUL,
    ABYSS_ENDLESS_STEEP_PLAYER_TAKEN_PER_FLOOR: data.ABYSS_ENDLESS_STEEP_PLAYER_TAKEN_PER_FLOOR,
    CHAOS_REALM_AFFIX_POOL: data.CHAOS_REALM_AFFIX_POOL,
    OCEAN_PERMANENT_UPGRADE_DEFS: data.OCEAN_PERMANENT_UPGRADE_DEFS,
    OCEAN_PERMANENT_UPGRADE_KEYS: data.OCEAN_PERMANENT_UPGRADE_KEYS,
    OCEAN_STATE_FISH_KEYS: data.OCEAN_STATE_FISH_KEYS,
    OCEAN_COLLECTION_REQUIRED_COUNTS: data.OCEAN_COLLECTION_REQUIRED_COUNTS,
    OCEAN_CURRENT_POOL: data.OCEAN_CURRENT_POOL,
    ENDLESS_CONTENT_DROP_MULTIPLIER_CAP: data.ENDLESS_CONTENT_DROP_MULTIPLIER_CAP,
    UNDERWORLD_DROP_RATE_MULTIPLIER: data.UNDERWORLD_DROP_RATE_MULTIPLIER,
    HERO_SELECTION_ORDER: data.HERO_SELECTION_ORDER,
    PLAYER_CLASS_ORDER: data.PLAYER_CLASS_ORDER,
    COMBAT_TACTIC_TARGET_PRIORITIES: data.COMBAT_TACTIC_TARGET_PRIORITIES,
    COMBAT_TACTIC_POSITION_MODES: data.COMBAT_TACTIC_POSITION_MODES,
    SEASON_NODES: data.SEASON_NODES,
    SEASON_NODE_ROWS: data.SEASON_NODE_ROWS,
    SEASON_OUROBOROS_RING_NODES: data.SEASON_OUROBOROS_RING_NODES,
    SEASON_INNER_NODES: data.SEASON_INNER_NODES,
    JEWEL_RARITY_ORDER: data.JEWEL_RARITY_ORDER,
    P_STATS: data.P_STATS,
    PASSIVE_TIER_SIZE_ORDER: data.PASSIVE_TIER_SIZE_ORDER,
    PASSIVE_TIER_FALLBACK: data.PASSIVE_TIER_FALLBACK,
    SUPPORT_GEM_DB: data.SUPPORT_GEM_DB,
    MOD_DB: data.MOD_DB,
    FOSSIL_DB: data.FOSSIL_DB,
    FOSSIL_EXCLUSIVE_MODS: data.FOSSIL_EXCLUSIVE_MODS,
    UNDERWORLD_RUNE_DB: data.UNDERWORLD_RUNE_DB,
    BASE_ITEM_DB: data.BASE_ITEM_DB,
    MAP_ZONES: data.MAP_ZONES,
    get startupOverlayActive() { return runtime.controls.startupOverlayActive; },
    get gameplayStarted() { return runtime.controls.gameplayStarted; },
    get gameEntryRunning() { return runtime.controls.gameEntryRunning; },
    get pendingMapRevealZoneId() { return runtime.controls.pendingMapRevealZoneId; },
    get pendingMapRevealToken() { return runtime.controls.pendingMapRevealToken; },
    get backgroundCombatRuntime() { return runtime.controls.backgroundCombatRuntime; },
    get tutorialQueue() { return runtime.tutorialQueue; },
    get cloudState() { return window.GameModules.cloudAccountState.current; },
    defaultGame,
    queueTutorialNotice: notices.queueTutorialNotice,
    isTransientGameState: notices.isTransientGameState,
    normalizeOceanFishingProgress: ocean.normalizeOceanFishingProgress,
    loopGateDepthName: loop.loopGateDepthName,
    hasLoopGateCosmosPath: loop.hasLoopGateCosmosPath,
    getPassiveEquipmentRestriction: equipment.getPassiveEquipmentRestriction,
    enforcePassiveEquipmentRestrictions: equipment.enforcePassiveEquipmentRestrictions,
    queueContentNotice: notices.queueContentNotice,
    formatStoryActLabel: story.formatStoryActLabel,
    getStoryActByZoneId: story.getStoryActByZoneId,
    getStoryActByOrder: story.getStoryActByOrder,
    getActZoneDisplayName: story.getActZoneDisplayName,
    createDefaultChaosRealmState: chaos.createDefaultChaosRealmState,
    ensureChaosRealmState: chaos.ensureChaosRealmState,
    getChaosRealmTier: difficulty.getChaosRealmTier,
    getUnderworldTier: difficulty.getUnderworldTier,
    getUnderworldGravityActionMultiplier: difficulty.getUnderworldGravityActionMultiplier,
    getUnderworldLifeDrainPerTick: difficulty.getUnderworldLifeDrainPerTick,
    getChaosRealmAffixScale: difficulty.getChaosRealmAffixScale,
    getChaosRealmAffixes: difficulty.getChaosRealmAffixes,
    hasCurrentLoopChaos20Clear: progress.hasCurrentLoopChaos20Clear,
    canEnterChaosRealm: unlocks.canEnterChaosRealm,
    getUnderworldEntryLockReason: unlocks.getUnderworldEntryLockReason,
    getUnderworldEntryBlock: unlocks.getUnderworldEntryBlock,
    getUnderworldUnlockChecks: unlocks.getUnderworldUnlockChecks,
    canEnterUnderworld: unlocks.canEnterUnderworld,
    isUnderworldUnlockReady: unlocks.isUnderworldUnlockReady,
    isCosmosContentUnlockReady: unlocks.isCosmosContentUnlockReady,
    getCosmosUnlockChecks: unlocks.getCosmosUnlockChecks,
    isMapPrimaryContentUnlockReady: unlocks.isMapPrimaryContentUnlockReady,
    isMapPrimaryContentUnlocked: unlocks.isMapPrimaryContentUnlocked,
    reconcileMapPrimaryContentUnlocks: unlocks.reconcileMapPrimaryContentUnlocks,
    getMapPrimaryContentEntryCondition: unlocks.getMapPrimaryContentEntryCondition,
    getOceanCurrentAffixes: difficulty.getOceanCurrentAffixes,
    hasOceanCurrent: difficulty.hasOceanCurrent,
    getColonyWaveEnemyCount: difficulty.getColonyWaveEnemyCount,
    createDefaultOceanState: ocean.createDefaultOceanState,
    getOceanPermanentUpgradeLevel: ocean.getOceanPermanentUpgradeLevel,
    getOceanPermanentUpgradeEffect: ocean.getOceanPermanentUpgradeEffect,
    mergeOceanState: ocean.mergeOceanState,
    ensureOceanState: ocean.ensureOceanState,
    canEnterOceanDepth: oceanRules.canEnterOceanDepth,
    getOceanOxygenMax: ocean.getOceanOxygenMax,
    getOceanOxygenSavingPct: oceanRules.getOceanOxygenSavingPct,
    getOceanPressureResistUpgradePct: oceanRules.getOceanPressureResistUpgradePct,
    getOceanOxygenDrainPerSec: oceanRules.getOceanOxygenDrainPerSec,
    getOceanOxygenPerAttackCost: oceanRules.getOceanOxygenPerAttackCost,
    getOceanDepthTier: oceanRules.getOceanDepthTier,
    getOceanBossBoundaryInterval: oceanRules.getOceanBossBoundaryInterval,
    getOceanPendingBossBoundary: oceanRules.getOceanPendingBossBoundary,
    getOceanDiveRecord: oceanRules.getOceanDiveRecord,
    getOceanFishingGaugeGainMul: oceanRules.getOceanFishingGaugeGainMul,
    createDefaultSkyTowerState: sky.createDefaultSkyTowerState,
    ensureSkyTowerState: sky.ensureSkyTowerState,
    getSkyTowerLoopClearLimit: sky.getSkyTowerLoopClearLimit,
    normalizeSkyTowerResult: sky.normalizeSkyTowerResult,
    getSkyTowerRemainingClears: skyRules.getSkyTowerRemainingClears,
    isSkyTowerAtRewardLimit: skyRules.isSkyTowerAtRewardLimit,
    hasCurrentLoopChaosAccess: progress.hasCurrentLoopChaosAccess,
    maybeUnlockSkyTowerFromChaos20: (...args) => consumeCommands(skyRules.maybeUnlockSkyTowerFromChaos20(...args), effects),
    canEnterSkyTower: skyRules.canEnterSkyTower,
    getSkyTowerTier: skyRules.getSkyTowerTier,
    getSkyTowerRewardAmount: skyRules.getSkyTowerRewardAmount,
    getSkyStoneMaxLevel: sky.getSkyStoneMaxLevel,
    getSkyStoneReductionPct: skyRules.getSkyStoneReductionPct,
    getSkyStoneNextCost: skyRules.getSkyStoneNextCost,
    getSkyTowerGemBoostMaxLevel: sky.getSkyTowerGemBoostMaxLevel,
    getSkyTowerGemBoostLevel: skyRules.getSkyTowerGemBoostLevel,
    getSkyTowerGemBoostCost: skyRules.getSkyTowerGemBoostCost,
    getAbyssDepthFromZoneId: difficulty.getAbyssDepthFromZoneId,
    getAbyssZoneIdForDepth: difficulty.getAbyssZoneIdForDepth,
    getAbyssZoneTier: difficulty.getAbyssZoneTier,
    getTimeRiftEquivalentChaosDepth: difficulty.getTimeRiftEquivalentChaosDepth,
    getTimeRiftFixedSeason: difficulty.getTimeRiftFixedSeason,
    getMeteorSiteUnlockReady: progress.getMeteorSiteUnlockReady,
    getClearedSkyTowerFloor: progress.getClearedSkyTowerFloor,
    getSeasonBossProgressGate: unlocks.getSeasonBossProgressGate,
    createCosmosChallengeZone: challenges.createCosmosChallengeZone,
    getBeyondBoundaryTierProfile: challenges.getBeyondBoundaryTierProfile,
    createBeehiveZone: challenges.createBeehiveZone,
    getGrandBreachProgress: challenges.getGrandBreachProgress,
    getUnderworldZone: challenges.getUnderworldZone,
    getRunZone: zones.getRunZone,
    getFloorZone: zones.getFloorZone,
    getTimeRiftZone: zones.getTimeRiftZone,
    getLabyrinthZoneNow: zones.getLabyrinthZoneNow,
    getChaosDepthZone: zones.getChaosDepthZone,
    ensureTimeRiftState: rift.ensureTimeRiftState,
    getTimeRiftOptionKeepChance: riftRules.getTimeRiftOptionKeepChance,
    getTimeRiftLossOdds: riftRules.getTimeRiftLossOdds,
    getTimeRiftFusionGrade: riftRules.getTimeRiftFusionGrade,
    getSeasonAbyssDepthCap: loop.getSeasonAbyssDepthCap,
    getLoopAbyssRequirementText: loop.getLoopAbyssRequirementText,
    getLoopAbyssRequirementPrompt: loop.getLoopAbyssRequirementPrompt,
    hasCurrentLoopChaosRequirementClear: loop.hasCurrentLoopChaosRequirementClear,
    hasCurrentLoopCosmosRequirementClear: loop.hasCurrentLoopCosmosRequirementClear,
    hasCurrentLoopAbyssRequirementClear: loop.hasCurrentLoopAbyssRequirementClear,
    getAvailableLoopAdvancePaths: loop.getAvailableLoopAdvancePaths,
    markLoopCosmosPlanetClear: loop.markLoopCosmosPlanetClear,
    getSeasonFinalZoneId: loop.getSeasonFinalZoneId,
    getCurrentSeasonFinalZoneId: loop.getCurrentSeasonFinalZoneId,
    getVisibleHuntingMapCapZoneId: loop.getVisibleHuntingMapCapZoneId,
    getHighestUnlockedEndlessChaosDepth: progress.getHighestUnlockedEndlessChaosDepth,
    getContentReturnZoneId: navigation.getContentReturnZoneId,
    getAutoProgressZoneId: navigation.getAutoProgressZoneId,
    getAbyssMonsterScales: difficulty.getAbyssMonsterScales,
    getContentDropRateMultiplier: difficulty.getContentDropRateMultiplier,
    capEndlessContentDropMultiplier: difficulty.capEndlessContentDropMultiplier,
    applySeasonContentProgression: (...args) => consumeCommands(loop.applySeasonContentProgression(...args), effects),
    getLoop10StatCost: bonuses.getLoop10StatCost,
    allocateLoop10BonusStat: (...args) => consumeCommands(bonuses.allocateLoop10BonusStat(...args), effects),
    enterNextEndlessChaosDepth: (...args) => consumeCommands(navigation.enterNextEndlessChaosDepth(...args), effects),
    enterUnlockedEndlessDepth: (...args) => consumeCommands(navigation.enterUnlockedEndlessDepth(...args), effects),
    getWorldTreeBarkLayers: bonuses.getWorldTreeBarkLayers,
    getWorldTreeBarkReach: bonuses.getWorldTreeBarkReach,
    getWorldTreeBarkEarned: bonuses.getWorldTreeBarkEarned,
    normalizeWorldTreeBark: bonuses.normalizeWorldTreeBark,
    getLoopDeepStatCost: bonuses.getLoopDeepStatCost,
    allocateLoopDeepStat: (...args) => consumeCommands(bonuses.allocateLoopDeepStat(...args), effects),
    getAscendanciesForClass: passives.getAscendanciesForClass,
    getAscendancyOrder: passives.getAscendancyOrder,
    isAscendancyOfClass: passives.isAscendancyOfClass,
    getAllAscendKeystoneDefs: passives.getAllAscendKeystoneDefs,
    pickRandomAscendKeystoneId: passives.pickRandomAscendKeystoneId,
    rememberLoopAscendancyPlan: passives.rememberLoopAscendancyPlan,
    getAscendKeystoneName: passives.getAscendKeystoneName,
    getSeasonPassiveNodeDef: passives.getSeasonPassiveNodeDef,
    getAllSeasonPassiveNodeIds: passives.getAllSeasonPassiveNodeIds,
    getSeasonPassiveUnlockLoop: passives.getSeasonPassiveUnlockLoop,
    getPassiveStatTierValue: passives.getPassiveStatTierValue,
    hasPermanentTalentTabUnlock: passives.hasPermanentTalentTabUnlock,
    syncPermanentTalentTabUnlock: passives.syncPermanentTalentTabUnlock,
    normalizeCombatTacticsSettings: passives.normalizeCombatTacticsSettings,
    hasCombatTacticsUnlockProgress: passives.hasCombatTacticsUnlockProgress,
    isFreePassiveStartNodeId: passives.isFreePassiveStartNodeId,
    getPaidPassiveNodeIds: passives.getPaidPassiveNodeIds,
    getZone: zones.getZone,
};
safeExposeGlobals(classicNames);
if (globalThis !== window) Object.assign(globalThis, classicNames);
window.GameModules.worldState = { equipment, notices, story, chaos, difficulty, progress, unlocks, ocean, oceanRules, sky, skyRules, challenges, zones, rift, riftRules, loop, navigation, bonuses, passives, data };
