import { PASSIVE_REVELATION_IDS, PASSIVE_REVELATION_LABELS, PASSIVE_WISDOM_ELEMENTS, PASSIVE_WISDOM_ELEMENT_BY_NODE_ID, PASSIVE_AILMENT_BY_ELEMENT, PASSIVE_KARMA_PER_TARGET_CAP, PASSIVE_KEYSTONE_NODE_ID_BY_TITLE, PASSIVE_CYCLE_BUFF_EFFECTS, PASSIVE_START_GATE_CLASS_BY_TITLE, PASSIVE_TREE_PRESET_SLOTS } from './data/passive-rule-settings.mjs';
import { METEOR_SITE_FLAGS, METEOR_SITE_NUMBERS } from './data/meteor-progress-settings.mjs';
import { ENEMY_CROWD_PAUSE_LIMIT, DOT_STACK_MAX, DOT_STACK_GROWTH_PER_STACK, DOT_TICK_INTERVAL, DOT_EFFECT_DURATION, DOT_TICK_FROM_HIT_RATIO } from './data/combat-dot-settings.mjs';
import { DEBUG_BATTLE_ANCHORS, TAB_UNLOCK_GATES, MOBILE_BATTLE_BREAKPOINT } from './data/panel-layout-settings.mjs';
import { createVoidPassiveOptionPool, voidOptionRows } from './data/void-passive-options.mjs';
import { createTranscendentVoidPassiveDefinitions, createTranscendentVoidStatLines } from './data/transcendent-void-passives.mjs';
import { createOceanModCategoryRules } from './data/ocean-mod-categories.mjs';
import { isAutoOceanDive, isOceanAutoRediveHalted as oceanRediveHalted } from './domain/ocean-auto-dive.mjs';
const VOID_PASSIVE_OPTION_POOL = createVoidPassiveOptionPool(SKILL_RUNE_STANCE_LABELS);
const TRANSCENDENT_VOID_PASSIVE_DB = createTranscendentVoidPassiveDefinitions((...args) => _t(...args), {
    TRANSCENDENT_ANDROMEDA_RADIUS, TRANSCENDENT_ASTEROID_RADIUS, TRANSCENDENT_VOID_VALUES
});
const TRANSCENDENT_VOID_STAT_LINES = createTranscendentVoidStatLines(TRANSCENDENT_ASTEROID_RADIUS);
const OCEAN_MOD_CATEGORY_RULES = createOceanModCategoryRules(AFFIX_TAG_LISTS, MOD_DB, resolveAffixTagList);
const isOceanAutoRediveHalted = state => oceanRediveHalted(state, OCEAN_AUTO_REDIVE.missLimit);

import { BuildStatPreview } from './application/build-stat-preview.mjs';
import { buildStatPreviewParts as formatBuildStatPreviewParts } from './ui/build-stat-preview-labels.mjs';
import { VoidPassiveLabels } from './ui/void-passive-labels.mjs';
import { OceanProgressPresentation } from './ui/ocean-progress-presentation.mjs';
import { PanelLayout } from './ui/panel-layout.mjs';
import * as damageElements from './common/damage-elements.mjs';
import { resetBeehiveRunModifiers } from './state/beehive-run-reset.mjs';
import { createMeteorProgress } from './domain/meteor-progress.mjs';
import { createOceanProgress } from './domain/ocean-progress.mjs';
import { createOceanWorkshop } from './domain/ocean-workshop.mjs';
import { createOceanShard } from './domain/ocean-shard.mjs';
import { createOceanWorkshopEffects } from './ui/ocean-workshop-effects.mjs';
import * as oceanCraftData from './data/ocean-workshop.mjs';
import { createPassiveAllocation } from './domain/passive-allocation.mjs';
import { createPassivePlanner } from './domain/passive-planner.mjs';
import { createJournalProgress } from './domain/journal-progress.mjs';
import { createActRewards } from './domain/act-rewards.mjs';
import { createVoidPassives } from './domain/void-passives.mjs';
import { consumeDomainCommands } from './common/consume-commands.mjs';
import { createPassiveRules } from './domain/passive-rules.mjs';
import { createAscendTree } from './domain/ascend-tree.mjs';
import { PassiveVisibility } from './domain/passive-visibility.mjs';
import { DeathDamageHistory } from './combat/death-damage-history.mjs';

export const deathHistory = new DeathDamageHistory({
    get ailmentLabel() { return getAilmentDisplayLabel; },
    get storedHitDamage() { return getStoredAilmentHitDamage; },
    get elementKey() { return normalizeDamageElementKey; }
});

const ascendTree = createAscendTree({
    get classes() { return CLASS_TEMPLATES; },
    get nodes() { return ASCENDANCY_NODE_DEFS; },
    get fallback() { return ASCENDANCY_NODE_FALLBACK; },
    get talents() { return TALENT_BLOOM_SPECIALIZATION_DEFS; },
    get layout() { return ASCENDANCY_NODE_LAYOUT; },
    get stats() { return P_STATS; }
});

// Removed when the remaining passive renderer and controllers import their dependencies.
const rules = createPassiveRules({
    get CLASS_KEYSTONE_DEFS() { return CLASS_KEYSTONE_DEFS; },
    get PASSIVE_KEYSTONE_NODE_ID_BY_TITLE() { return PASSIVE_KEYSTONE_NODE_ID_BY_TITLE; },
    get PASSIVE_TREE() { return PASSIVE_TREE; },
    get PASSIVE_WISDOM_ELEMENT_BY_NODE_ID() { return PASSIVE_WISDOM_ELEMENT_BY_NODE_ID; },
    get PASSIVE_REVELATION_IDS() { return PASSIVE_REVELATION_IDS; },
    get PASSIVE_WISDOM_ELEMENTS() { return PASSIVE_WISDOM_ELEMENTS; },
    get PASSIVE_CYCLE_BUFF_EFFECTS() { return PASSIVE_CYCLE_BUFF_EFFECTS; },
    get PASSIVE_AILMENT_BY_ELEMENT() { return PASSIVE_AILMENT_BY_ELEMENT; },
    get getCombatTime() { return getCombatTime; },
    get PASSIVE_KARMA_PER_TARGET_CAP() { return PASSIVE_KARMA_PER_TARGET_CAP; },
    get addStatToBucket() { return addStatToBucket; },
    get PASSIVE_REVELATION_LABELS() { return PASSIVE_REVELATION_LABELS; },
    get passiveRouting() { return passiveRouting; }
});
const passiveRules = Object.freeze({ ...rules,
    isPassiveTreePathEdge: (...args) => rules.isPassiveTreePathEdge(game, ...args),
    isPassiveTreeEdgeAvailable: (...args) => rules.isPassiveTreeEdgeAvailable(game, ...args),
    getPassiveTreeAdjacency: (...args) => rules.getPassiveTreeAdjacency(game, ...args),
    ensurePassiveSpecializationState: (...args) => rules.ensurePassiveSpecializationState(game, ...args),
    getPassiveNodeActivationState: (...args) => rules.getPassiveNodeActivationState(game, ...args),
    getEffectivePassiveNodeEffects: (...args) => rules.getEffectivePassiveNodeEffects(game, ...args),
    getVoidLinkScale: (...args) => rules.getVoidLinkScale(game, ...args),
    getAllocatedPassiveStatValue: (...args) => rules.getAllocatedPassiveStatValue(game, ...args),
    hasAuthoredPassiveKeystone: (...args) => rules.hasAuthoredPassiveKeystone(game, ...args),
    findAllocatedPassiveKeystone: (...args) => rules.findAllocatedPassiveKeystone(game, ...args),
    recordPassiveCycleAilmentEnd: (...args) => rules.recordPassiveCycleAilmentEnd(game, ...args),
    recordPassiveCycleAilmentStart: (...args) => rules.recordPassiveCycleAilmentStart(game, ...args),
    getActivePassiveCycleBuffEffects: (...args) => rules.getActivePassiveCycleBuffEffects(game, ...args),
    recordPassiveFanaticSkillUse: (...args) => rules.recordPassiveFanaticSkillUse(game, ...args),
    recordPassiveKarmaLoss: (...args) => rules.recordPassiveKarmaLoss(game, ...args),
    beginPassiveKarmaAttack: (...args) => rules.beginPassiveKarmaAttack(game, ...args),
    applyPassiveKeystoneBucketRules: (...args) => rules.applyPassiveKeystoneBucketRules(game, ...args),
    getBladeBundleShots: (...args) => rules.getBladeBundleShots(game, ...args),
    applyAuthoredPassiveStatRules: (...args) => rules.applyAuthoredPassiveStatRules(game, ...args),
    getVirtualVoidPassiveCount: (owner = game) => rules.getVirtualVoidPassiveCount(owner)
});
const allocationRules = createPassiveAllocation({
    get PASSIVE_TREE_V22() { return typeof PASSIVE_TREE_V22 === 'undefined' ? undefined : PASSIVE_TREE_V22; },
    get PASSIVE_TREE() { return PASSIVE_TREE; },
    get PASSIVE_START_GATE_CLASS_BY_TITLE() { return PASSIVE_START_GATE_CLASS_BY_TITLE; },
    get passiveRouting() { return passiveRouting; },
    get isPassiveTreePathEdge() { return rules.isPassiveTreePathEdge; },
    get getPassiveTreeAdjacency() { return rules.getPassiveTreeAdjacency; },
    get getPassiveKeystoneNodeId() { return rules.getPassiveKeystoneNodeId; },
    get enforcePassiveEquipmentRestrictions() { return enforcePassiveEquipmentRestrictions; },
    get contentProgression() { return typeof contentProgression === 'undefined' ? undefined : contentProgression; },
    get PASSIVE_DISCOVERY_RADIUS() { return PASSIVE_DISCOVERY_RADIUS; },
    get _t() { return _t; },
    get hasAuthoredPassiveKeystone() { return rules.hasAuthoredPassiveKeystone; },
    get PASSIVE_REVELATION_IDS() { return PASSIVE_REVELATION_IDS; },
    get getAllocatedPassiveStatValue() { return rules.getAllocatedPassiveStatValue; },
    get findAllocatedPassiveKeystone() { return rules.findAllocatedPassiveKeystone; },
    get ensurePassiveSpecializationState() { return rules.ensurePassiveSpecializationState; }
});
const allocationEffects = {
    get passiveNormalizeSupport() { return normalizeSupportLoadout.bind(undefined); },
    get passiveJournal() { return unlockJournalEntry.bind(undefined); },
    get passiveReveal() { return revealAroundNode.bind(undefined); },
    get passiveLog() { return addLog.bind(undefined); },
    get passiveTutorial() { return queueTutorialNotice.bind(undefined); },
    get passiveRenderDirty() {
        return typeof markPassiveRenderCacheDirty === 'function' ? markPassiveRenderCacheDirty.bind(undefined) : () => undefined;
    }
};
const passiveAllocation = Object.freeze({ ...allocationRules,
    getPassiveTreeRootNodeId: state => allocationRules.getPassiveTreeRootNodeId(state || (typeof game !== 'undefined' ? game : null) || {}),
    getPassiveTreeRootNode: state => allocationRules.getPassiveTreeRootNode(state || (typeof game !== 'undefined' ? game : null) || {}),
    getPassiveGatedStartIds: (owner = game) => allocationRules.getPassiveGatedStartIds(owner),
    getPassiveBlockedStartIds: (owner = game) => allocationRules.getPassiveBlockedStartIds(owner),
    getPassiveRouting: (owner = game) => allocationRules.getPassiveRouting(owner),
    isPassiveNodeAvailable: (...args) => allocationRules.isPassiveNodeAvailable(game, ...args),
    isVoidSocketHidden: (...args) => allocationRules.isVoidSocketHidden(game, ...args),
    getPassiveConnectionNodeIds: (...args) => allocationRules.getPassiveConnectionNodeIds(game, ...args),
    getPassiveConstellationAwakeningProgress: (...args) => allocationRules.getPassiveConstellationAwakeningProgress(game, ...args),
    unlockPassiveStarEvolution: (...args) => consumeDomainCommands(allocationRules.unlockPassiveStarEvolution(game, ...args), allocationEffects),
    rebasePassiveTreeForClassChange: (...args) => consumeDomainCommands(allocationRules.rebasePassiveTreeForClassChange(game, ...args), allocationEffects),
    setPassiveRevelation: (...args) => allocationRules.setPassiveRevelation(game, ...args),
    getPassiveActivationPath: (...args) => allocationRules.getPassiveActivationPath(game, ...args),
    getPassiveKeystoneConflict: (...args) => allocationRules.getPassiveKeystoneConflict(game, ...args),
    activatePassivePath: (...args) => consumeDomainCommands(allocationRules.activatePassivePath(game, ...args), allocationEffects),
    getPassiveLinkedNodeIds: (...args) => allocationRules.getPassiveLinkedNodeIds(game, ...args)
});
const visibilityRules = new PassiveVisibility({
    get tree() { return PASSIVE_TREE; },
    get routing() { return passiveRouting; },
    get radius() { return PASSIVE_DISCOVERY_RADIUS; },
    get rootEdgeDepth() { return PASSIVE_ROOT_DISCOVERY_EDGE_DEPTH; },
    get edgeDepth() { return PASSIVE_DISCOVERY_EDGE_DEPTH; }
}, window.GameModules.passiveTree, allocationRules, rules);
window.GameModules.passiveVisibility = visibilityRules;
const plannerRules = createPassivePlanner({
    get PASSIVE_TREE() { return PASSIVE_TREE; },
    get PASSIVE_NODE_ID_MIGRATIONS() { return typeof PASSIVE_NODE_ID_MIGRATIONS === 'undefined' ? undefined : PASSIVE_NODE_ID_MIGRATIONS; },
    get PASSIVE_NODE_ID_MERGED() { return PASSIVE_NODE_ID_MERGED; },
    get PASSIVE_NODE_ID_LEGACY_PREFIX() { return PASSIVE_NODE_ID_LEGACY_PREFIX; },
    get PASSIVE_TREE_PRESET_SLOTS() { return PASSIVE_TREE_PRESET_SLOTS; },
    get PASSIVE_LAYOUT_VERSION() { return PASSIVE_LAYOUT_VERSION; },
    get contentProgression() { return contentProgression; },
    get _t() { return _t; },
    allocation: allocationRules,
    encodePresetPayload: payload => btoa(unescape(encodeURIComponent(payload))),
    decodePresetPayload: body => decodeURIComponent(escape(atob(body)))
});
// Inherit late-bound getters without reading functions whose classic aliases initialize after this bundle.
const plannerEffects = Object.create(allocationEffects, Object.getOwnPropertyDescriptors({
    get passiveReachable() { return calculateReachableNodes.bind(undefined); },
    get passiveVisibility() { return refreshPassiveVisibility.bind(undefined); }
}));
const passivePlanner = Object.freeze({ ...plannerRules,
    ensurePassiveTreePlannerState: () => plannerRules.ensurePassiveTreePlannerState(game),
    saveCurrentPassiveTreePreset: (...args) => plannerRules.saveCurrentPassiveTreePreset(game, ...args),
    setActivePassiveTreePreset: (...args) => plannerRules.setActivePassiveTreePreset(game, ...args),
    setPassiveTreeAutoInvest: (...args) => plannerRules.setPassiveTreeAutoInvest(game, ...args),
    encodePassiveTreePreset: (...args) => plannerRules.encodePassiveTreePreset(game, ...args),
    importPassiveTreePreset: (...args) => plannerRules.importPassiveTreePreset(game, ...args),
    runPassiveTreeAutoInvest: () => consumeDomainCommands(plannerRules.runPassiveTreeAutoInvest(game), plannerEffects)
});
const voidRules = createVoidPassives({
    get PASSIVE_TREE() { return PASSIVE_TREE; },
    get P_STATS() { return P_STATS; },
    get STAT_DISPLAY_NAMES() { return STAT_DISPLAY_NAMES; },
    get TRANSCENDENT_VOID_PASSIVE_DB() { return TRANSCENDENT_VOID_PASSIVE_DB; },
    get TRANSCENDENT_VOID_STAT_LINES() { return TRANSCENDENT_VOID_STAT_LINES; },
    get getVoidLinkScale() { return passiveRules.getVoidLinkScale; },
    get VOID_PASSIVE_OPTION_POOL() { return VOID_PASSIVE_OPTION_POOL; },
    get rndChoice() { return rndChoice; },
    get passiveRouting() { return passiveRouting; },
    get getPassiveRouting() { return allocationRules.getPassiveRouting; },
    get unlockPassiveStarEvolution() { return allocationRules.unlockPassiveStarEvolution; },
    get _t() { return _t; },
    get ORB_DB() { return ORB_DB; }
});
const voidEffects = Object.create(allocationEffects, Object.getOwnPropertyDescriptors({
    get voidLog() { return addLog.bind(undefined); },
    get voidRefresh() { return updateStaticUI.bind(undefined); },
    get voidSave() { return queueImportantSave.bind(undefined); },
    get voidReachable() { return calculateReachableNodes.bind(undefined); },
    get voidVisibility() { return refreshPassiveVisibility.bind(undefined); },
    voidCanLog: () => typeof addLog === 'function',
    voidInvalidateStats: () => playerStatCache.invalidate(),
    voidTranscendentLabel: entry => formatTranscendentVoidPassive(entry).replace(/<[^>]*>/g, ''),
    voidEffectLabel: nodeId => getVoidPassiveEffectLabel(nodeId).replace(/<[^>]*>/g, '')
}));
const voidPassives = Object.freeze({ ...voidRules,
    getVoidPassiveCraft: (...args) => voidRules.getVoidPassiveCraft(game, ...args),
    getChameleonChoices: (...args) => voidRules.getChameleonChoices(game, ...args),
    getTranscendentVoidPassiveStats: (nodeId, entry, voidCount, owner = game) => voidRules.getTranscendentVoidPassiveStats(owner, nodeId, entry, voidCount),
    getTranscendentVoidPassiveCount: (id, owner = game) => voidRules.getTranscendentVoidPassiveCount(owner, id, owner === game),
    refreshPassiveConnectivity: (...args) => consumeDomainCommands(voidRules.refreshPassiveConnectivity(game, ...args), voidEffects),
    convertChameleonVoidPassive: (...args) => consumeDomainCommands(voidRules.convertChameleonVoidPassive(game, ...args), voidEffects),
    recordImmortalHeroDeathPenalty: (...args) => consumeDomainCommands(voidRules.recordImmortalHeroDeathPenalty(game, ...args), voidEffects),
    applyVoidPassiveCurrency: (...args) => consumeDomainCommands(voidRules.applyVoidPassiveCurrency(game, ...args), voidEffects)
});
// Presentation and recoverable browser-boundary failures retain their original order.
const progressEffects = {
    get progressLog() { return addLog.bind(undefined); },
    get progressRefresh() { return updateStaticUI.bind(undefined); },
    get progressSave() { return queueImportantSave.bind(undefined); },
    get progressAwardCurrency() { return awardCurrency.bind(undefined); },
    get progressBattleFx() { return addBattleFx.bind(undefined); },
    get progressCostText() { return getOceanUpgradeCostText.bind(undefined); },
    get progressGenerateEquipment() { return generateEquipmentDrop.bind(undefined); },
    get progressStoreEquipment() { return addItemToInventory.bind(undefined); },
    get progressItemName() { return getItemDisplayName.bind(undefined); },
    get progressJournal() { return unlockJournalEntry.bind(undefined); },
    get progressMoveAfterSurface() { return moveAfterSurfacing.bind(undefined); },
    get progressOptionalSave() { return typeof queueImportantSave === 'function' ? queueImportantSave.bind(undefined) : () => undefined; },
    get progressOptionalRefresh() { return typeof updateStaticUI === 'function' ? updateStaticUI.bind(undefined) : () => undefined; },
    progressRareFishChance: readOceanRareFishChance,
    progressAutoSurface: completeOceanAutoSurface
};
function readOceanRareFishChance() {
    try {
        return typeof getPlayerStats === 'function' ? Math.max(0, Number(getPlayerStats().oceanRareFishChancePct) || 0) : 0;
    } catch (error) { console.warn('failed to read ocean rare fish chance stat:', error); return 0; }
}
function completeOceanAutoSurface(returnZoneId) {
    try {
        progressEffects.progressMoveAfterSurface(returnZoneId);
        progressEffects.progressOptionalRefresh();
    } catch (error) { console.warn('failed to auto-surface from ocean:', error); }
}
const meteorProgressRules = createMeteorProgress({
    get METEOR_FALL_ZONE_ID() { return METEOR_FALL_ZONE_ID; },
    get METEOR_SITE_FLAGS() { return METEOR_SITE_FLAGS; },
    get METEOR_SITE_NUMBERS() { return METEOR_SITE_NUMBERS; },
    get METEOR_KINDS() { return METEOR_KINDS; },
    get getMeteorSiteUnlockReady() { return getMeteorSiteUnlockReady; },
    get _t() { return _t; },
    get contentProgression() { return contentProgression; },
    get getCombatTime() { return getCombatTime; },
    get clampNumber() { return clampNumber; },
    get METEOR_SITE_UNLOCK_ACT() { return METEOR_SITE_UNLOCK_ACT; },
    get atlasPassives() { return atlasPassives; },
    get rndChoice() { return rndChoice; },
    get METEOR_CONSTELLATION_POOL() { return METEOR_CONSTELLATION_POOL; },
    get getZone() { return getZone; }
});
const meteorProgress = Object.freeze({ ...meteorProgressRules,
    ensureMeteorSiteState: (owner = game) => meteorProgressRules.ensureMeteorSiteState(owner),
    getMeteorKind: (...args) => meteorProgressRules.getMeteorKind(game, ...args),
    tryUnlockMeteorContentByProgress: (...args) => consumeDomainCommands(meteorProgressRules.tryUnlockMeteorContentByProgress(game, ...args), progressEffects),
    gainSkyRiftGaugeFromCombat: (...args) => consumeDomainCommands(meteorProgressRules.gainSkyRiftGaugeFromCombat(game, ...args), progressEffects),
    grantMeteorEncounterRewards: (...args) => consumeDomainCommands(meteorProgressRules.grantMeteorEncounterRewards(game, ...args), progressEffects)
});
const oceanProgressRules = createOceanProgress({
    get ensureOceanState() { return ensureOceanState; },
    get OCEAN_FISHING_STRATEGIES() { return OCEAN_FISHING_STRATEGIES; },
    get OCEAN_FISH_DB() { return OCEAN_FISH_DB; },
    get OCEAN_FISH_COLLECTION_MILESTONES() { return OCEAN_FISH_COLLECTION_MILESTONES; },
    get _t() { return _t; },
    get withDirectionParticle() { return withDirectionParticle; },
    get getOceanDepthTier() { return getOceanDepthTier; },
    get getOceanFishingGaugeGainMul() { return getOceanFishingGaugeGainMul; },
    get hasOceanCurrent() { return hasOceanCurrent; },
    get clampNumber() { return clampNumber; },
    get OCEAN_FISH_RARITY_META() { return OCEAN_FISH_RARITY_META; },
    get withObjectParticle() { return withObjectParticle; },
    get OCEAN_PERMANENT_UPGRADE_DEFS() { return OCEAN_PERMANENT_UPGRADE_DEFS; },
    get getOceanPermanentUpgradeLevel() { return getOceanPermanentUpgradeLevel; },
    get getOceanOxygenMax() { return getOceanOxygenMax; },
    get getZoneTravelBlockReason() { return getZoneTravelBlockReason; },
    get OCEAN_ZONE_ID() { return OCEAN_ZONE_ID; },
    get getContentStartBlockReason() { return getContentStartBlockReason; },
    get getOceanDiveRecord() { return getOceanDiveRecord; },
    get getCombatTime() { return getCombatTime; },
    get getOceanBossBoundaryInterval() { return typeof getOceanBossBoundaryInterval === 'undefined' ? undefined : getOceanBossBoundaryInterval; },
    get OCEAN_AUTO_REDIVE() { return OCEAN_AUTO_REDIVE; },
    get getZone() { return getZone; },
    get getPlayerStats() { return typeof getPlayerStats === 'undefined' ? undefined : getPlayerStats; },
    get getOceanOxygenDrainPerSec() { return getOceanOxygenDrainPerSec; },
    get OCEAN_COMBAT_DIVE() { return OCEAN_COMBAT_DIVE; }
});
const oceanProgress = Object.freeze({ ...oceanProgressRules,
    getOceanFishingStrategyDef: (...args) => oceanProgressRules.getOceanFishingStrategyDef(game, ...args),
    getOceanFishCollectionProgress: (...args) => oceanProgressRules.getOceanFishCollectionProgress(game, ...args),
    getOceanFishCollectionBonus: (...args) => oceanProgressRules.getOceanFishCollectionBonus(game, ...args),
    setOceanFishingStrategy: (...args) => consumeDomainCommands(oceanProgressRules.setOceanFishingStrategy(game, ...args), progressEffects),
    claimOceanFishCollectionMilestone: (...args) => consumeDomainCommands(oceanProgressRules.claimOceanFishCollectionMilestone(game, ...args), progressEffects),
    advanceOceanDiveFromKill: (...args) => consumeDomainCommands(oceanProgressRules.advanceOceanDiveFromKill(game, ...args), progressEffects),
    getOceanPermanentUpgradeCost: (...args) => oceanProgressRules.getOceanPermanentUpgradeCost(game, ...args),
    canPayOceanUpgradeCost: (...args) => oceanProgressRules.canPayOceanUpgradeCost(game, ...args),
    upgradeOceanPermanent: (...args) => consumeDomainCommands(oceanProgressRules.upgradeOceanPermanent(game, ...args), progressEffects),
    installOceanReefFragment: (...args) => consumeDomainCommands(oceanProgressRules.installOceanReefFragment(game, ...args), progressEffects),
    enterOceanDive: (...args) => consumeDomainCommands(oceanProgressRules.enterOceanDive(game, ...args), progressEffects),
    forceSurfaceOcean: (...args) => consumeDomainCommands(oceanProgressRules.forceSurfaceOcean(game, ...args), progressEffects),
    recordOceanSurface: (...args) => oceanProgressRules.recordOceanSurface(game, ...args),
    setOceanAutoRedive: (...args) => oceanProgressRules.setOceanAutoRedive(game, ...args),
    tickOceanOxygen: (...args) => consumeDomainCommands(oceanProgressRules.tickOceanOxygen(game, ...args), progressEffects),
    tickOceanDepth: (...args) => consumeDomainCommands(oceanProgressRules.tickOceanDepth(...args), progressEffects),
    applyOceanKill: (...args) => oceanProgressRules.applyOceanKill(game, ...args)
});
const journalRules = createJournalProgress({
    get JOURNAL_DB() { return JOURNAL_DB; },
    get SEASON_BOSS_ZONES() { return typeof SEASON_BOSS_ZONES === 'undefined' ? undefined : SEASON_BOSS_ZONES; },
    get memoryLeaves() { return memoryLeaves; },
    get contentProgression() { return contentProgression; },
    get _t() { return _t; }
});
const journalEffects = {
    get journalAutoInvest() {
        return typeof runPassiveTreeAutoInvest === 'function' ? runPassiveTreeAutoInvest.bind(undefined) : () => undefined;
    },
    get journalInvalidateStats() { return playerStatCache.invalidate.bind(playerStatCache); },
    get journalLog() { return addLog.bind(undefined); },
    get journalPinnacleReward() { return worldTreeBark.rewardPinnacleFirstKill.bind(worldTreeBark); },
    get journalRefreshGoals() {
        return typeof requestGoalSystemRefresh === 'function' ? requestGoalSystemRefresh.bind(undefined) : () => undefined;
    }
};
const journalProgress = Object.freeze({ ...journalRules,
    getClaimedJournalPassivePointTotal: state => journalRules.getClaimedJournalPassivePointTotal(state && typeof state === 'object' ? state : game),
    grantJournalBonus: (entryId, state = game) => consumeDomainCommands(journalRules.grantJournalBonus(state, entryId, state === game), journalEffects),
    unlockJournalEntry: (entryId, state = game) => consumeDomainCommands(journalRules.unlockJournalEntry(state, entryId, state === game), journalEffects),
    ensureActJournalCompletionForLoop: options => consumeDomainCommands(journalRules.ensureActJournalCompletionForLoop(game, options, true), journalEffects)
});
const actRules = createActRewards({
    get ACT_REWARD_DB() { return ACT_REWARD_DB; },
    get ORB_DB() { return ORB_DB; },
    get contentProgression() { return contentProgression; },
    get HANA_WEAPON_COMBOS() { return HANA_WEAPON_COMBOS; },
    get WEAPON_CATEGORIES() { return WEAPON_CATEGORIES; },
    get _t() { return _t; },
    get keepWeaponCategoryBases() { return keepWeaponCategoryBases; },
    get BASE_ITEM_DB() { return BASE_ITEM_DB; },
    get createItemFromBase() { return createItemFromBase; },
    get rollBaseStat() { return rollBaseStat; },
    get FIRST_ACT_REWARD_STATS() { return FIRST_ACT_REWARD_STATS; },
    get MOD_DB() { return MOD_DB; },
    get getAffixTierRange() { return getAffixTierRange; },
    get updateItemName() { return updateItemName; },
    get SUPPORT_GEM_DB() { return SUPPORT_GEM_DB; },
    get getStatName() { return getStatName; },
    get P_STATS() { return P_STATS; },
    get MAP_ZONES() { return MAP_ZONES; }
});
const actEffects = {
    get actLog() { return addLog.bind(undefined); },
    get actStoreItem() { return addItemToInventory.bind(undefined); },
    get actCurrency() { return awardCurrency.bind(undefined); },
    get actPromptReward() { return window.GameModules.playFeedback.reward.promptActReward.bind(window.GameModules.playFeedback.reward); },
    get actOpenReward() { return openActReward.bind(undefined); },
    get actAutoInvest() { return journalEffects.journalAutoInvest; },
    get actCloseReward() { return closeRewardOverlay.bind(undefined); },
    get actCheckUnlocks() { return checkUnlocks.bind(undefined); },
    get actNormalizeSupports() { return normalizeSupportLoadout.bind(undefined); },
    get actRefresh() { return updateStaticUI.bind(undefined); },
    get actSave() { return queueImportantSave.bind(undefined); }
};
const actRewards = Object.freeze({
    getActRewardConfig: (zoneId, owner = game) => actRules.getActRewardConfig(owner, zoneId),
    isActRewardChoiceAvailable: (choice, owner = game) => actRules.isActRewardChoiceAvailable(owner, choice),
    getAvailableActRewardZoneIds: (owner = game) => actRules.getAvailableActRewardZoneIds(owner),
    getActRewardChoices: zoneId => actRules.getActRewardChoices(game, zoneId),
    createClassStarterWeapon: classId => actRules.createClassStarterWeapon(game, classId),
    buildActRewardPreviewItem: (zoneId, choice) => {
        const counter = window.GameModules.state.session.itemIdCounter;
        try { return actRules.buildActRewardPreviewItem(game, zoneId, choice); }
        finally { window.GameModules.state.session.itemIdCounter = counter; }
    },
    grantActRewardEntry: (...args) => consumeDomainCommands(actRules.grantActRewardEntry(game, ...args), actEffects),
    markActRewardReady: zoneId => consumeDomainCommands(actRules.markActRewardReady(game, zoneId), actEffects),
    claimActRewardChoice: (...args) => consumeDomainCommands(actRules.claimActRewardChoice(game, ...args), actEffects)
});
const oceanCraftRules = createOceanWorkshop({
    get categoryRules() { return OCEAN_MOD_CATEGORY_RULES; },
    get equipmentCrafting() { return equipmentCrafting; },
    get findStoredEquipmentAffix() { return findStoredEquipmentAffix; },
    get getAvailableMods() { return getAvailableMods; },
    get rollAffixValueInTierRange() { return rollAffixValueInTierRange; },
    get EXPLICIT_AFFIX_RULES() { return EXPLICIT_AFFIX_RULES; },
    get EXPLICIT_AFFIX_LINE_CAP() { return EXPLICIT_AFFIX_LINE_CAP; },
    get getItemExplicitOptionCount() { return getItemExplicitOptionCount; },
    get isFixedEquipmentAffix() { return isFixedEquipmentAffix; },
    get getStatName() { return getStatName; },
    get updateItemName() { return updateItemName; },
    get _t() { return _t; },
    get getEquipCandidateSlots() { return getEquipCandidateSlots; },
    get ensureOceanState() { return ensureOceanState; },
    get pickWeightedMod() { return pickWeightedMod; },
    get rollAffixValue() { return rollAffixValue; },
    get getItemCraftTier() { return getItemCraftTier; },
    get ORB_DB() { return ORB_DB; }
});
const oceanCraftEffects = createOceanWorkshopEffects({
    get awardCurrency() { return awardCurrency; },
    get addLog() { return addLog; },
    get normalizeItem() { return normalizeItem; },
    get queueImportantSave() { return queueImportantSave; },
    get _t() { return _t; },
    get getItemDisplayName() { return getItemDisplayName; }
});
const oceanShard = createOceanShard({
    get equipmentCrafting() { return equipmentCrafting; },
    get getAvailableMods() { return getAvailableMods; },
    get pickRandomMods() { return pickRandomMods; },
    get getItemCraftTier() { return getItemCraftTier; },
    get rollAffixValue() { return rollAffixValue; },
    get updateItemName() { return updateItemName; },
    get _t() { return _t; }
});
const oceanWorkshop = Object.freeze({ ...oceanCraftRules, ...oceanCraftData,
    getOceanShardBlockReason: item => oceanShard.blockReason(game, item),
    rerollSingleBaseOption: (...args) => consumeDomainCommands(oceanShard.reroll(game, ...args), oceanCraftEffects),
    isSeaGiftEquipmentTarget: item => oceanCraftRules.isSeaGiftEquipmentTarget(game, item),
    getSeaGiftTargetBlockReason: item => oceanCraftRules.getSeaGiftTargetBlockReason(game, item),
    getSeaGiftRecipeStatus: (recipeId, targetItem, category, count = 1) => oceanCraftRules.getSeaGiftRecipeStatus(game, recipeId,
        { item: targetItem || getSelectedCraftItem(), category, count }),
    craftSeaGift: (recipeId, targetItem, options) => consumeDomainCommands(oceanCraftRules.craftSeaGift(game, recipeId,
        { item: targetItem || getSelectedCraftItem(), category: options?.category, count: options?.count }), oceanCraftEffects)
});
export { passiveRules, passiveAllocation, passivePlanner, voidPassives, meteorProgress, oceanProgress, journalProgress, actRewards, oceanWorkshop, ascendTree };

const buildPreview = new BuildStatPreview(window.GameModules.state, (...args) => getPlayerStats(...args));
const voidLabels = new VoidPassiveLabels({
    get isVoidPassiveLineStat() { return isVoidPassiveLineStat; },
    get P_STATS() { return P_STATS; },
    get STAT_DISPLAY_NAMES() { return STAT_DISPLAY_NAMES; },
    get formatValue() { return formatValue; },
    get _t() { return _t; },
    get getStatName() { return getStatName; },
    get TRANSCENDENT_VOID_PASSIVE_DB() { return TRANSCENDENT_VOID_PASSIVE_DB; },
    get getVoidLinkScale() { return getVoidLinkScale; },
    get TRANSCENDENT_VOID_STAT_LINES() { return TRANSCENDENT_VOID_STAT_LINES; },
    get getVoidPassiveCraft() { return getVoidPassiveCraft; },
    get passiveRouting() { return passiveRouting; },
    get game() { return window.GameModules.state.game; }
});
const oceanPresentation = new OceanProgressPresentation({
    get getCurrencyInfo() { return getCurrencyInfo; },
    get changeZone() { return typeof changeZone === 'function' ? changeZone : undefined; },
    get game() { return window.GameModules.state.game; },
    get OCEAN_ZONE_ID() { return OCEAN_ZONE_ID; },
    get getSelectedCraftItem() { return typeof getSelectedCraftItem === 'function' ? getSelectedCraftItem : undefined; },
    get isSeaGiftEquipmentTarget() { return isSeaGiftEquipmentTarget; }
});
const panelLayout = new PanelLayout({
    get document() { return document; },
    get uiDisplay() { return uiDisplay; },
    get MOBILE_BATTLE_BREAKPOINT() { return MOBILE_BATTLE_BREAKPOINT; },
    get switchTab() { return switchTab; },
    get game() { return window.GameModules.state.game; },
    get _t() { return _t; }
}, window.GameModules.state.controls);
window.GameModules.panelLayout = panelLayout;
export const previewBuildStats = buildPreview.previewBuildStats.bind(buildPreview);
export const previewPassiveNodeStats = buildPreview.previewPassiveNodeStats.bind(buildPreview);
export const buildStatPreviewParts = preview => formatBuildStatPreviewParts(COMPARE_STAT_META, preview);
export const formatVoidPassiveStatLine = voidLabels.formatVoidPassiveStatLine.bind(voidLabels);
export const getVoidPassiveEffectLabel = voidLabels.getVoidPassiveEffectLabel.bind(voidLabels);
export const formatTranscendentVoidPassive = voidLabels.formatTranscendentVoidPassive.bind(voidLabels);
export const getOceanUpgradeCostText = oceanPresentation.getOceanUpgradeCostText.bind(oceanPresentation);
export const moveAfterSurfacing = oceanPresentation.moveAfterSurfacing.bind(oceanPresentation);
export const getSelectedSeaGiftEquipmentTarget = oceanPresentation.getSelectedSeaGiftEquipmentTarget.bind(oceanPresentation);
export const syncBattleTabLayout = panelLayout.syncBattleTabLayout.bind(panelLayout);
export const isTutorialOpen = panelLayout.isTutorialOpen.bind(panelLayout);
export const isLoadingOverlayOpen = panelLayout.isLoadingOverlayOpen.bind(panelLayout);
export const applyPanelLayoutSettings = panelLayout.applyPanelLayoutSettings.bind(panelLayout);
export const toggleLeftPaneCollapse = panelLayout.toggleLeftPaneCollapse.bind(panelLayout);
export const toggleCombatLogCollapse = panelLayout.toggleCombatLogCollapse.bind(panelLayout);
export const getAilmentDisplayLabel = damageElements.getAilmentDisplayLabel;
export const normalizeDamageElementKey = ele => damageElements.normalizeDamageElementKey(DAMAGE_ELEMENT_LABELS, ele);
export const getElementColor = ele => damageElements.getElementColor(DAMAGE_ELEMENT_LABELS, ele);
export const getDamageElementLabel = ele => damageElements.getDamageElementLabel(DAMAGE_ELEMENT_LABELS, (...args) => _t(...args), ele);
export const getDamageElementIcon = ele => damageElements.getDamageElementIcon(DAMAGE_ELEMENT_LABELS, DAMAGE_ELEMENT_ICONS, ele);
export { resetBeehiveRunModifiers };

// Transitional names remain live through save replacement; retire with their final classic consumers.
safeExposeGlobals({ mouseX: window.GameModules.state.controls.mouseX, mouseY: window.GameModules.state.controls.mouseY, pendingHeavyUiRefresh: window.GameModules.state.controls.pendingHeavyUiRefresh, crowdPauseActive: window.GameModules.state.controls.crowdPauseActive, activeTutorial: window.GameModules.state.controls.activeTutorial, activeTutorialStep: window.GameModules.state.controls.activeTutorialStep });
const controlAccessors = {
    mouseX: { configurable: true, get() { return window.GameModules.state.controls.mouseX; }, set(value) { window.GameModules.state.controls.mouseX = value; } },
    mouseY: { configurable: true, get() { return window.GameModules.state.controls.mouseY; }, set(value) { window.GameModules.state.controls.mouseY = value; } },
    pendingHeavyUiRefresh: { configurable: true, get() { return window.GameModules.state.controls.pendingHeavyUiRefresh; }, set(value) { window.GameModules.state.controls.pendingHeavyUiRefresh = value; } },
    crowdPauseActive: { configurable: true, get() { return window.GameModules.state.controls.crowdPauseActive; }, set(value) { window.GameModules.state.controls.crowdPauseActive = value; } },
    activeTutorial: { configurable: true, get() { return window.GameModules.state.controls.activeTutorial; }, set(value) { window.GameModules.state.controls.activeTutorial = value; } },
    activeTutorialStep: { configurable: true, get() { return window.GameModules.state.controls.activeTutorialStep; }, set(value) { window.GameModules.state.controls.activeTutorialStep = value; } }
};
Object.defineProperties(window, controlAccessors);
if (globalThis !== window) Object.defineProperties(globalThis, controlAccessors);

// Compatibility exports only: implementations live in the imported native owners.
const getModCategory = oceanWorkshop.getModCategory;
const getSeaGiftTierStepRows = oceanWorkshop.getSeaGiftTierStepRows;
const getSeaGiftRerollRows = oceanWorkshop.getSeaGiftRerollRows;
const getSeaGiftEchoTargets = oceanWorkshop.getSeaGiftEchoTargets;
const getSeaGiftEditableIndexes = oceanWorkshop.getSeaGiftEditableIndexes;
const getSeaGiftBenchSlot = oceanWorkshop.getSeaGiftBenchSlot;
const getSeaGiftTargetBlockReason = oceanWorkshop.getSeaGiftTargetBlockReason;
const getSeaGiftEffectBlockReason = oceanWorkshop.getSeaGiftEffectBlockReason;
const isSeaGiftEquipmentTarget = oceanWorkshop.isSeaGiftEquipmentTarget;
const getSeaGiftRecipeStatus = oceanWorkshop.getSeaGiftRecipeStatus;
const craftSeaGift = oceanWorkshop.craftSeaGift;
const getOceanShardBlockReason = oceanWorkshop.getOceanShardBlockReason;
const rerollSingleBaseOption = oceanWorkshop.rerollSingleBaseOption;
const OCEAN_WORKBENCH_OPTIONS = oceanWorkshop.OCEAN_WORKBENCH_OPTIONS;
const SEA_GIFT_RANDOM_ORB_KEYS = oceanWorkshop.SEA_GIFT_RANDOM_ORB_KEYS;
const SEA_GIFT_RECIPES = oceanWorkshop.SEA_GIFT_RECIPES;
const SEA_GIFT_ITEM_EFFECT_TYPES = oceanWorkshop.SEA_GIFT_ITEM_EFFECT_TYPES;
const getActRewardConfig = actRewards.getActRewardConfig;
const isActRewardChoiceAvailable = actRewards.isActRewardChoiceAvailable;
const getAvailableActRewardZoneIds = actRewards.getAvailableActRewardZoneIds;
const getActRewardChoices = actRewards.getActRewardChoices;
const createClassStarterWeapon = actRewards.createClassStarterWeapon;
const buildActRewardPreviewItem = actRewards.buildActRewardPreviewItem;
const grantActRewardEntry = actRewards.grantActRewardEntry;
const markActRewardReady = actRewards.markActRewardReady;
const claimActRewardChoice = actRewards.claimActRewardChoice;
const getClaimedJournalPassivePointTotal = journalProgress.getClaimedJournalPassivePointTotal;
const repairJournalEntriesFromProgress = journalProgress.repairJournalEntriesFromProgress;
const reachedTimeRiftFusion = journalProgress.reachedTimeRiftFusion;
const rebuildJournalBonusStateForLoad = journalProgress.rebuildJournalBonusStateForLoad;
const grantJournalBonus = journalProgress.grantJournalBonus;
const unlockJournalEntry = journalProgress.unlockJournalEntry;
const ensureActJournalCompletionForLoop = journalProgress.ensureActJournalCompletionForLoop;
const getPassiveActivationPath = passiveAllocation.getPassiveActivationPath;
const getPassiveKeystoneConflict = passiveAllocation.getPassiveKeystoneConflict;
const activatePassivePath = passiveAllocation.activatePassivePath;
const getCurrentPassiveNodeId = passivePlanner.getCurrentPassiveNodeId;
const migratePassiveNodeIdList = passivePlanner.migratePassiveNodeIdList;
const migratePassiveNodeIdRecord = passivePlanner.migratePassiveNodeIdRecord;
const normalizePassiveTreePlannerState = passivePlanner.normalizePassiveTreePlannerState;
const ensurePassiveTreePlannerState = passivePlanner.ensurePassiveTreePlannerState;
const saveCurrentPassiveTreePreset = passivePlanner.saveCurrentPassiveTreePreset;
const setActivePassiveTreePreset = passivePlanner.setActivePassiveTreePreset;
const setPassiveTreeAutoInvest = passivePlanner.setPassiveTreeAutoInvest;
const encodePassiveTreePreset = passivePlanner.encodePassiveTreePreset;
const importPassiveTreePreset = passivePlanner.importPassiveTreePreset;
const runPassiveTreeAutoInvest = passivePlanner.runPassiveTreeAutoInvest;
const ensureMeteorSiteState = meteorProgress.ensureMeteorSiteState;
const rollMeteorKind = meteorProgress.rollMeteorKind;
const getMeteorKind = meteorProgress.getMeteorKind;
const tryUnlockMeteorContentByProgress = meteorProgress.tryUnlockMeteorContentByProgress;
const getSkyRiftGaugeEffectiveTier = meteorProgress.getSkyRiftGaugeEffectiveTier;
const gainSkyRiftGaugeFromCombat = meteorProgress.gainSkyRiftGaugeFromCombat;
const grantMeteorEncounterRewards = meteorProgress.grantMeteorEncounterRewards;
const getOceanFishingStrategyDef = oceanProgress.getOceanFishingStrategyDef;
const getOceanFishCollectionProgress = oceanProgress.getOceanFishCollectionProgress;
const getOceanFishCollectionBonus = oceanProgress.getOceanFishCollectionBonus;
const setOceanFishingStrategy = oceanProgress.setOceanFishingStrategy;
const claimOceanFishCollectionMilestone = oceanProgress.claimOceanFishCollectionMilestone;
const advanceOceanDiveFromKill = oceanProgress.advanceOceanDiveFromKill;
const getOceanPermanentUpgradeCost = oceanProgress.getOceanPermanentUpgradeCost;
const canPayOceanUpgradeCost = oceanProgress.canPayOceanUpgradeCost;
const upgradeOceanPermanent = oceanProgress.upgradeOceanPermanent;
const installOceanReefFragment = oceanProgress.installOceanReefFragment;
const enterOceanDive = oceanProgress.enterOceanDive;
const getOceanShallowLiftM = oceanProgress.getOceanShallowLiftM;
const forceSurfaceOcean = oceanProgress.forceSurfaceOcean;
const recordOceanSurface = oceanProgress.recordOceanSurface;
const forgetOceanAutoDive = oceanProgress.forgetOceanAutoDive;
const setOceanAutoRedive = oceanProgress.setOceanAutoRedive;
const tickOceanOxygen = oceanProgress.tickOceanOxygen;
const tickOceanDepth = oceanProgress.tickOceanDepth;
const applyOceanKill = oceanProgress.applyOceanKill;
const getOceanKillAirSec = oceanProgress.getOceanKillAirSec;
const getPassiveTreeRootNodeId = passiveAllocation.getPassiveTreeRootNodeId;
const getPassiveTreeRootNode = passiveAllocation.getPassiveTreeRootNode;
const getPassiveBlockedStartIds = passiveAllocation.getPassiveBlockedStartIds;
const getPassiveRouting = passiveAllocation.getPassiveRouting;
const isPassiveNodeAvailable = passiveAllocation.isPassiveNodeAvailable;
const isVoidSocketHidden = passiveAllocation.isVoidSocketHidden;
const getPassiveConnectionNodeIds = passiveAllocation.getPassiveConnectionNodeIds;
const getPassiveApexNodeIds = passiveAllocation.getPassiveApexNodeIds;
const getPassiveConstellationAwakeningProgress = passiveAllocation.getPassiveConstellationAwakeningProgress;
const unlockPassiveStarEvolution = passiveAllocation.unlockPassiveStarEvolution;
const rebasePassiveTreeForClassChange = passiveAllocation.rebasePassiveTreeForClassChange;
const setPassiveRevelation = passiveAllocation.setPassiveRevelation;
const getVoidPassiveCraft = voidPassives.getVoidPassiveCraft;
const isVoidPassiveLineStat = voidPassives.isVoidPassiveLineStat;
const normalizeTranscendentVoidPassive = voidPassives.normalizeTranscendentVoidPassive;
const getChameleonChoices = voidPassives.getChameleonChoices;
const getVoidPassiveNodeIds = voidPassives.getVoidPassiveNodeIds;
const getTranscendentVoidPassiveStats = voidPassives.getTranscendentVoidPassiveStats;
const getTranscendentVoidPassiveCount = voidPassives.getTranscendentVoidPassiveCount;
const rollPlutoVoidCount = voidPassives.rollPlutoVoidCount;
const rollMagicBudOnVoid = voidPassives.rollMagicBudOnVoid;
const refreshPassiveConnectivity = voidPassives.refreshPassiveConnectivity;
const convertChameleonVoidPassive = voidPassives.convertChameleonVoidPassive;
const recordImmortalHeroDeathPenalty = voidPassives.recordImmortalHeroDeathPenalty;
const applyVoidPassiveCurrency = voidPassives.applyVoidPassiveCurrency;
const getClassKeystoneDefs = passiveRules.getClassKeystoneDefs;
const isPassiveTreeEdgeAvailable = passiveRules.isPassiveTreeEdgeAvailable;
const getPassiveTreeAdjacency = passiveRules.getPassiveTreeAdjacency;
const getPassiveWisdomElementFromNodeIds = passiveRules.getPassiveWisdomElementFromNodeIds;
const normalizePassiveSpecializationState = passiveRules.normalizePassiveSpecializationState;
const ensurePassiveSpecializationState = passiveRules.ensurePassiveSpecializationState;
const getPassiveNodeRawEffects = passiveRules.getPassiveNodeRawEffects;
const getPassiveNodeActivationState = passiveRules.getPassiveNodeActivationState;
const getEffectivePassiveNodeEffects = passiveRules.getEffectivePassiveNodeEffects;
const getVoidLinkScale = passiveRules.getVoidLinkScale;
const getAllocatedPassiveStatValue = passiveRules.getAllocatedPassiveStatValue;
const hasAuthoredPassiveKeystone = passiveRules.hasAuthoredPassiveKeystone;
const findAllocatedPassiveKeystone = passiveRules.findAllocatedPassiveKeystone;
const getMystiqueAffinity = passiveRules.getMystiqueAffinity;
const recordPassiveCycleAilmentEnd = passiveRules.recordPassiveCycleAilmentEnd;
const recordPassiveCycleAilmentStart = passiveRules.recordPassiveCycleAilmentStart;
const getActivePassiveCycleBuffEffects = passiveRules.getActivePassiveCycleBuffEffects;
const recordPassiveFanaticSkillUse = passiveRules.recordPassiveFanaticSkillUse;
const recordPassiveKarmaLoss = passiveRules.recordPassiveKarmaLoss;
const beginPassiveKarmaAttack = passiveRules.beginPassiveKarmaAttack;
const getPassiveAshuraAilmentChance = passiveRules.getPassiveAshuraAilmentChance;
const getPassiveAshuraDamageMultiplier = passiveRules.getPassiveAshuraDamageMultiplier;
const applyPassiveAshuraDamageBreakdown = passiveRules.applyPassiveAshuraDamageBreakdown;
const applyPassiveKeystoneBucketRules = passiveRules.applyPassiveKeystoneBucketRules;
const getBladeBundleShots = passiveRules.getBladeBundleShots;
const applyAuthoredPassiveStatRules = passiveRules.applyAuthoredPassiveStatRules;
const getVirtualVoidPassiveCount = passiveRules.getVirtualVoidPassiveCount;
const getPassiveTreeViewAngle = window.GameModules.passiveScene.getPassiveTreeViewAngle;
const syncPassiveTreeView = window.GameModules.passiveScene.syncPassiveTreeView;
const cleanupPassiveBursts = window.GameModules.passiveScene.cleanupPassiveBursts;
const getNodeRevealAmount = window.GameModules.passiveScene.getNodeRevealAmount;
const getClassTreeDef = (key, owner = game) => ascendTree.tree(owner, key);
const addAscendancyPairNodes = ascendTree.addPair;
const clampPassiveCamera = window.GameModules.passiveScene.clampPassiveCamera;
const fitPassiveCameraToBounds = window.GameModules.passiveScene.fitPassiveCameraToBounds;
const snapshotPlayerAilmentsForDeathLog = () => deathHistory.snapshotAilments(game);
const recordIncomingDamage = (ele, amount, sourceName, options) => deathHistory.record(game, ele, amount, sourceName, options);
const takeDeathFightSummary = () => deathHistory.takeFight(game);
const buildDeathDamageSummary = (windowMs, opts) => deathHistory.summarizeElements(game, windowMs, opts);
const buildDeathMonsterSummary = (windowMs, events) => deathHistory.summarizeMonsters(game, windowMs, events);

exposeFileGlobals({ getSeaGiftRecipeStatus, craftSeaGift, OCEAN_WORKBENCH_OPTIONS, SEA_GIFT_RANDOM_ORB_KEYS, SEA_GIFT_RECIPES, SEA_GIFT_ITEM_EFFECT_TYPES, resetBeehiveRunModifiers, getClassKeystoneDefs, getPassiveTreeViewAngle, syncPassiveTreeView, getPassiveTreeRootNodeId, getPassiveTreeRootNode, isPassiveTreeEdgeAvailable, getPassiveTreeAdjacency, rebasePassiveTreeForClassChange, getPassiveWisdomElementFromNodeIds, normalizePassiveSpecializationState, ensurePassiveSpecializationState, getPassiveNodeRawEffects, getPassiveNodeActivationState, getEffectivePassiveNodeEffects, getVoidLinkScale, getAllocatedPassiveStatValue, setPassiveRevelation, hasAuthoredPassiveKeystone, findAllocatedPassiveKeystone, getPassiveBlockedStartIds, getMystiqueAffinity, recordPassiveCycleAilmentEnd, recordPassiveCycleAilmentStart, getActivePassiveCycleBuffEffects, recordPassiveFanaticSkillUse, recordPassiveKarmaLoss, beginPassiveKarmaAttack, getPassiveAshuraAilmentChance, getPassiveAshuraDamageMultiplier, applyPassiveAshuraDamageBreakdown, applyPassiveKeystoneBucketRules, getBladeBundleShots, applyAuthoredPassiveStatRules, isPassiveNodeAvailable, isVoidSocketHidden, getPassiveApexNodeIds, getPassiveConstellationAwakeningProgress, unlockPassiveStarEvolution, ensureMeteorSiteState, rollMeteorKind, getMeteorKind, voidOptionRows, getVoidPassiveNodeIds, getVoidPassiveCraft, isVoidPassiveLineStat, formatVoidPassiveStatLine, getVoidPassiveEffectLabel, rollPlutoVoidCount, getVirtualVoidPassiveCount, getTranscendentVoidPassiveStats, normalizeTranscendentVoidPassive, formatTranscendentVoidPassive, rollMagicBudOnVoid, getChameleonChoices, convertChameleonVoidPassive, getTranscendentVoidPassiveCount, recordImmortalHeroDeathPenalty, applyVoidPassiveCurrency, getPassiveConnectionNodeIds, previewBuildStats, previewPassiveNodeStats, buildStatPreviewParts, refreshPassiveConnectivity, tryUnlockMeteorContentByProgress, getSkyRiftGaugeEffectiveTier, gainSkyRiftGaugeFromCombat, getOceanFishingStrategyDef, getOceanFishCollectionProgress, getOceanFishCollectionBonus, setOceanFishingStrategy, claimOceanFishCollectionMilestone, advanceOceanDiveFromKill, getOceanPermanentUpgradeCost, canPayOceanUpgradeCost, upgradeOceanPermanent, installOceanReefFragment, getPassiveRouting, enterOceanDive, getOceanShallowLiftM, forceSurfaceOcean, recordOceanSurface, forgetOceanAutoDive, setOceanAutoRedive, tickOceanOxygen, tickOceanDepth, applyOceanKill, getOceanKillAirSec, getModCategory, getSeaGiftTargetBlockReason, getSeaGiftEffectBlockReason, getSeaGiftTierStepRows, getSeaGiftRerollRows, getSeaGiftEchoTargets, isSeaGiftEquipmentTarget, getSelectedSeaGiftEquipmentTarget, getSeaGiftEditableIndexes, getSeaGiftBenchSlot, getOceanShardBlockReason, rerollSingleBaseOption, grantMeteorEncounterRewards, getPassiveActivationPath, getPassiveKeystoneConflict, activatePassivePath, getCurrentPassiveNodeId, migratePassiveNodeIdList, migratePassiveNodeIdRecord, normalizePassiveTreePlannerState, ensurePassiveTreePlannerState, saveCurrentPassiveTreePreset, setActivePassiveTreePreset, setPassiveTreeAutoInvest, encodePassiveTreePreset, importPassiveTreePreset, runPassiveTreeAutoInvest, cleanupPassiveBursts, getNodeRevealAmount, getClassTreeDef, addAscendancyPairNodes, syncBattleTabLayout, clampPassiveCamera, fitPassiveCameraToBounds, isTutorialOpen, isLoadingOverlayOpen, applyPanelLayoutSettings, toggleLeftPaneCollapse, getAilmentDisplayLabel, snapshotPlayerAilmentsForDeathLog, recordIncomingDamage, takeDeathFightSummary, buildDeathDamageSummary, buildDeathMonsterSummary, getActRewardConfig, isActRewardChoiceAvailable, getAvailableActRewardZoneIds, getActRewardChoices, createClassStarterWeapon, getClaimedJournalPassivePointTotal, repairJournalEntriesFromProgress, reachedTimeRiftFusion, rebuildJournalBonusStateForLoad, grantJournalBonus, unlockJournalEntry, ensureActJournalCompletionForLoop, markActRewardReady, buildActRewardPreviewItem, grantActRewardEntry, claimActRewardChoice, getElementColor, normalizeDamageElementKey, getDamageElementLabel, getDamageElementIcon, PASSIVE_REVELATION_IDS, PASSIVE_REVELATION_LABELS, PASSIVE_WISDOM_ELEMENTS, PASSIVE_WISDOM_ELEMENT_BY_NODE_ID, PASSIVE_AILMENT_BY_ELEMENT, PASSIVE_KARMA_PER_TARGET_CAP, PASSIVE_KEYSTONE_NODE_ID_BY_TITLE, PASSIVE_CYCLE_BUFF_EFFECTS, PASSIVE_START_GATE_CLASS_BY_TITLE, PASSIVE_TREE_PRESET_SLOTS, METEOR_SITE_FLAGS, METEOR_SITE_NUMBERS, ENEMY_CROWD_PAUSE_LIMIT, DOT_STACK_MAX, DOT_STACK_GROWTH_PER_STACK, DOT_TICK_INTERVAL, DOT_EFFECT_DURATION, DOT_TICK_FROM_HIT_RATIO, DEBUG_BATTLE_ANCHORS, TAB_UNLOCK_GATES, MOBILE_BATTLE_BREAKPOINT, VOID_PASSIVE_OPTION_POOL, TRANSCENDENT_VOID_PASSIVE_DB, TRANSCENDENT_VOID_STAT_LINES, OCEAN_MOD_CATEGORY_RULES, isAutoOceanDive, isOceanAutoRediveHalted, toggleCombatLogCollapse });
window.GameModules.passives = Object.freeze({
    get tree() { return window.PASSIVE_TREE; },
    get configs() { return { targetNodes: window.PASSIVE_TARGET_NODES, discoveryRadius: window.PASSIVE_DISCOVERY_RADIUS, previewRadius: window.PASSIVE_PREVIEW_RADIUS }; },
    rules: passiveRules, allocation: passiveAllocation, planner: passivePlanner, voidPassives,
    meteorProgress, oceanProgress, journalProgress, actRewards, oceanWorkshop, ascendTree, buildPreview
});

// Keep initial tree and game creation at their original ordered bootstrap boundary.
window.GameModules.passiveTreeBootstrap.bootstrap();
window.GameModules.state.startSession(JSON.parse(JSON.stringify(defaultGame)), Date.now());
