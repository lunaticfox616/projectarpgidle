import { lootJewelColor } from './ui/kill-loot-format.mjs';
import { lootShowEquipmentDelivery, lootQueueGroundReceipt, lootConsumeNotices, lootConsumeFloorPickup, lootConsumeRoll, lootAnnounceColonyWard } from './ui/kill-loot-feedback.mjs';
import { killGetEnemyExperienceReward, killGrantExpAndGem, killAwardLevelPassivePoint } from './combat/kill-experience.mjs';
import { killApplyGrandBreachMobTuning, killIsMapProgressHeld, killIsVoidRiftCombatZone, killApplyVoidRiftMobTuning, killRollRandomVoidRiftOnKill } from './combat/rift-kill-state.mjs';
import { killClearDotFxThrottleForEnemy, killGrantLoopStarterWeaponOnFirstKill, killResolveEnemyDeath, killTickTalentKillRuntime } from './combat/kill-state.mjs';
import { killCountKillForContent } from './combat/kill-counters.mjs';
import { killExplodeCorpsesOnKill, killHandleEnemyDeath } from './combat/kill-death.mjs';
import { killApplyUniqueKillEffects, killGetOverkillSplash, killGetRangerWeakpointBonus } from './combat/kill-unique-effects.mjs';
import { killAdvanceColonyWaveOnKill } from './combat/kill-colony-wave.mjs';
import { killFinishGrandBreachOnBossKill, killGetGrandBreachRewardSummary } from './combat/kill-grand-breach.mjs';
import { killFlagHeavyUiAfterKill } from './combat/kill-refresh.mjs';
import { killTransferSkillDotOnDeath } from './combat/kill-dot-transfer.mjs';
import { killOnChaos20Cleared, killEnterAutomaticMapInterruptionAfterClear, killAutoRediveOceanAfterClear } from './combat/clear-interruption.mjs';
import { killCallOceanGuardianAtBoundary, killNoteOceanKill, killCallOceanGuardianAdds } from './combat/ocean-guardian-state.mjs';
import { killResolvePlayerApproachTarget } from './combat/approach-destination.mjs';
import { coreCorpseExplosionLine } from './ui/combat-log-format.mjs';
import { clearEnsureNextEndlessChaosDepthUnlocked } from './combat/clear-progression.mjs';
import { clearGetTrialSkillGemRewardChance, clearFinishTrialEncounter } from './combat/trial-completion.mjs';
import { clearGrantUnderworldFloorMilestone, clearFinishUnderworldEncounter } from './combat/underworld-completion.mjs';
import { clearFinishEncounterRun } from './combat/encounter-completion.mjs';
import { clearFinishBeyondBoundaryEncounter } from './combat/boundary-completion.mjs';
import { clearFinishMeteorEncounter, clearFinishOutsideChaosEncounter } from './combat/special-completion.mjs';
import { clearFinishOceanEncounter } from './combat/ocean-completion.mjs';
import { clearFinishChaosRealmEncounter } from './combat/chaos-realm-completion.mjs';
import { clearFinishSkyTowerEncounter } from './combat/tower-completion.mjs';
import { clearFinishTimeRiftEncounter, clearFinishTimeRiftFusion } from './combat/time-rift-completion.mjs';
import { clearFinishSeasonBossEncounter, clearDepartSeasonBoss } from './combat/season-boss-completion.mjs';
import { clearGrantSeasonBossRewards } from './combat/pinnacle-payouts.mjs';
import { clearFinishLabyrinthEncounter } from './combat/labyrinth-completion.mjs';
import { clearFinishCosmosEncounter } from './combat/cosmos-completion.mjs';
import { clearFinishZoneClear } from './combat/zone-completion.mjs';
import { createKillProgression } from './domain/kill-progression.mjs';
import { createLootDelivery } from './domain/loot-delivery.mjs';
import { createEnemyDropRolls } from './domain/enemy-drop-rolls.mjs';
import { createKillLoot } from './domain/kill-loot.mjs';
// Legacy consumers keep these acquisition names until the UI/bootstrap phases import the owners.
export const progression = createKillProgression({
    levels: levelProgression, skills: SKILL_DB, experience: LEVEL_PROGRESSION, forge: GEM_CORE_FORGE, maxLevel: MAX_PLAYER_LEVEL
});

export const delivery = createLootDelivery({
    get exploration() { return actExplorationState; }, get floor() { return actExplorationState.groundLoot; },
    get policy() { return equipmentLootPolicy; }, get moments() { return lootMoments; },
    get bagItems() { return bagItems; }, get coreItems() { return coreItems; },
    get talismans() { return talismans; }, get stumpBox() { return stumpBox; },
    get gems() { return gemDropRewards; }, get knitting() { return knitting; },
    get receipts() { return combatLootReceipts; }, get statCache() { return playerStatCache; },
    get hasGridCell() { return hasGridCell; }, get getPlayerStats() { return getPlayerStats; },
    get previewEquipmentPickup() { return previewEquipmentPickup; },
    get isGuaranteedEquipmentPickup() { return isGuaranteedEquipmentPickup; },
    get addItemToInventory() { return addItemToInventory; }, get receiveJewelDrop() { return receiveJewelDrop; },
    get resolveCurrencyAward() { return resolveCurrencyAward; }, get commitCurrencyGain() { return commitCurrencyGain; }
});

export const drops = createEnemyDropRolls({ ROOM_INVADER, SUPPORT_GEM_DB, FOSSIL_DB }, {
    delivery, random: () => Math.random(), choose: rows => rndChoice(rows),
    get content() { return contentProgression; }, get gems() { return gemDropRewards; },
    get chooseSkill() { return pickSkillRuneReward; }, get currencies() { return getCurrencyDrops; },
    get equipment() { return rollEquipmentDrop; }, get fossilChances() { return getLabyrinthFossilDropChances; }
});

export const loot = createKillLoot(delivery, drops, {
    random: () => Math.random(), get variants() { return equipmentDropVariants; },
    get generateEquipment() { return generateEquipmentDrop; }, get rootWeapon() { return getRootMonsterWeapon; },
    get rootChance() { return ROOT_MONSTER_RULES.weaponDropChance; }, get wards() { return colonyWards; },
    get realmUnique() { return generateRealmBossUniqueDrop; }, get zone() { return getZone; },
    get supports() { return window.GameModules.combat.supports; }, get contentMultiplier() { return getContentDropRateMultiplier; },
    get content() { return contentProgression; }, get floor() { return actExplorationState.groundLoot; },
    get chances() { return getEquipmentDropChances; }, get wildTalisman() { return rollWildTalismanDrop; },
    get atlasPassives() { return atlasPassives; }, get gemMultiplier() { return getEnemyGemDropMul; },
    get runeReward() { return rollEnemyGemReward; }, get gems() { return gemDropRewards; },
    get stats() { return getPlayerStats; }, get cores() { return coreItems; }, get generateJewel() { return generateJewelDrop; },
    get receiveJewel() { return receiveJewelDrop; }, get awardCurrency() { return awardCurrency; }
});

// Existing public acquisition boundary is also observed by the drop simulator.
safeExposeGlobals({ rollEnemyGemReward: (awakening, boss) => drops.rune(game, awakening, boss), receiveKnittingYarn: id => {
    const result = delivery.receiveYarn(game, id);
    if (result) dispatchRuntimeEvent('knitting-yarn', result);
} });


// Remove this synchronous command boundary once content/renderer consumers and bootstrap import their owners.
const rewardDeps = {
    get getZone() { return getZone; },
    get actExplorationProgress() { return actExplorationProgress; },
    get getEncounterTelemetryContext() { return getEncounterTelemetryContext; },
    get atlasRun() { return atlasRun; },
    get startMoving() { return startMoving; },
    get finishWoodsmanEchoRun() { return finishWoodsmanEchoRun; },
    get getAbyssDepthFromZoneId() { return getAbyssDepthFromZoneId; },
    get getAutoProgressZoneId() { return getAutoProgressZoneId; },
    get getAbyssZoneIdForDepth() { return getAbyssZoneIdForDepth; },
    get LABYRINTH_ZONE_ID() { return LABYRINTH_ZONE_ID; },
    get ensureChaosRealmState() { return ensureChaosRealmState; },
    get CHAOS_REALM_ZONE_ID() { return CHAOS_REALM_ZONE_ID; },
    get isSkyTowerAtRewardLimit() { return isSkyTowerAtRewardLimit; },
    get holdActRetreat() { return holdActRetreat; },
    get BEYOND_BOUNDARY_REWARD_FOCUS_DB() { return BEYOND_BOUNDARY_REWARD_FOCUS_DB; },
    get getBeyondBoundaryRewardFocusStatus() { return getBeyondBoundaryRewardFocusStatus; },
    get BEYOND_BOUNDARY_INTENSITY_DB() { return BEYOND_BOUNDARY_INTENSITY_DB; },
    get BEYOND_BOUNDARY_ZONE_ID() { return BEYOND_BOUNDARY_ZONE_ID; },
    get getUnderworldTier() { return getUnderworldTier; },
    get _t() { return _t; },
    get generateEquipmentDrop() { return generateEquipmentDrop; },
    get addItemToInventory() { return addItemToInventory; },
    get generateJewelDrop() { return generateJewelDrop; },
    get bagItems() { return bagItems; },
    get salvageJewelObject() { return salvageJewelObject; },
    get getBeyondBoundaryPayoutTier() { return getBeyondBoundaryPayoutTier; },
    get awardCurrency() { return awardCurrency; },
    get completeBeyondBoundaryEncounter() { return completeBeyondBoundaryEncounter; },
    get BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER() { return BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER; },
    get BEYOND_BOUNDARY_SEAL_DB() { return BEYOND_BOUNDARY_SEAL_DB; },
    get prepareActExplorationArrival() { return prepareActExplorationArrival; },
    get grantMeteorEncounterRewards() { return grantMeteorEncounterRewards; },
    get ensureMeteorSiteState() { return ensureMeteorSiteState; },
    get clearWoodsmanBuildLock() { return clearWoodsmanBuildLock; },
    get addWoodsmanPendingScore() { return addWoodsmanPendingScore; },
    get unlockJournalEntry() { return typeof unlockJournalEntry === 'undefined' ? undefined : unlockJournalEntry; },
    get maybeUnlockChaosRealmFromWoodsman() { return maybeUnlockChaosRealmFromWoodsman; },
    get markLoopSpecialBossKill() { return markLoopSpecialBossKill; },
    get ensureOceanState() { return ensureOceanState; },
    get OCEAN_ZONE_ID() { return OCEAN_ZONE_ID; },
    get advanceOceanDiveFromKill() { return advanceOceanDiveFromKill; },
    get getOceanPendingBossBoundary() { return getOceanPendingBossBoundary; },
    get getOceanDepthTier() { return getOceanDepthTier; },
    get grantChaosRealmFloorBonus() { return grantChaosRealmFloorBonus; },
    get ensureSkyTowerState() { return ensureSkyTowerState; },
    get getSkyTowerRemainingClears() { return getSkyTowerRemainingClears; },
    get SKY_TOWER_ZONE_ID() { return SKY_TOWER_ZONE_ID; },
    get getSkyTowerLoopClearLimit() { return getSkyTowerLoopClearLimit; },
    get getSkyTowerRewardAmount() { return getSkyTowerRewardAmount; },
    get ensureTimeRiftState() { return ensureTimeRiftState; },
    get resolveTimeRiftFusion() { return typeof resolveTimeRiftFusion === 'undefined' ? undefined : resolveTimeRiftFusion; },
    get pickParticle() { return pickParticle; },
    get pickSkillRuneReward() { return pickSkillRuneReward; },
    get gemDropRewards() { return gemDropRewards; },
    get startEncounterRun() { return startEncounterRun; },
    get handleTalentBloomClear() { return handleTalentBloomClear; },
    get UNIQUE_DB() { return UNIQUE_DB; },
    get generateUniqueItem() { return generateUniqueItem; },
    get ORB_DB() { return ORB_DB; },
    get ROOT_BOSS_UNIQUE_RULES() { return ROOT_BOSS_UNIQUE_RULES; },
    get SEASON_BOSS_ZONES() { return SEASON_BOSS_ZONES; },
    get FOSSIL_DB() { return FOSSIL_DB; },
    get contentProgression() { return contentProgression; },
    get UNDERWORLD_ZONE_ID() { return UNDERWORLD_ZONE_ID; },
    get underworldMilestoneReward() { return window.GameModules.state.underworldMilestoneReward; },
    get UNDERWORLD_DEEP_FLOOR_REWARD() { return UNDERWORLD_DEEP_FLOOR_REWARD; },
    get cosmosAtlas() { return window.GameModules.cosmosAtlas; },
    get markActRewardReady() { return markActRewardReady; },
    get worldTreeBark() { return worldTreeBark; },
    get recordActClear() { return typeof recordActClear === 'undefined' ? undefined : recordActClear; },
    get getStoryActByZoneId() { return getStoryActByZoneId; },
    get getCurrentSeasonFinalZoneId() { return getCurrentSeasonFinalZoneId; },
    get getSeasonAbyssDepthCap() { return getSeasonAbyssDepthCap; },
    get handleSeasonLoopConditionMet() { return handleSeasonLoopConditionMet; },
    get enterNextEndlessChaosDepth() { return enterNextEndlessChaosDepth; },
    get hasCurrentLoopChaos20Clear() { return typeof hasCurrentLoopChaos20Clear === 'undefined' ? undefined : hasCurrentLoopChaos20Clear; },
    get npcShop() { return typeof npcShop === 'undefined' ? undefined : npcShop; },
    get noteCampaignResistPenalty() { return noteCampaignResistPenalty; },
    get getAbyssMonsterScales() { return getAbyssMonsterScales; },
    get progressionRules() { return progression; },
    get mobilitySkill() { return mobilitySkill; },
    get SKILL_DB() { return SKILL_DB; },
    get getPlayerHpCap() { return getPlayerHpCap; },
    get getPlayerStats() { return getPlayerStats; },
    get runPassiveTreeAutoInvest() { return typeof runPassiveTreeAutoInvest === 'undefined' ? undefined : runPassiveTreeAutoInvest; },
    get actExplorationState() { return actExplorationState; },
    get createClassStarterWeapon() { return createClassStarterWeapon; },
    get basicSkills() { return basicSkills; },
    get WOODSMAN_ECHO_ZONE_ID() { return WOODSMAN_ECHO_ZONE_ID; },
    get ensureWoodsmanEchoRunState() { return ensureWoodsmanEchoRunState; },
    get isTalentCardActive() { return typeof isTalentCardActive === 'undefined' ? undefined : isTalentCardActive; },
    get combatIncidents() { return combatIncidents; },
    get completeHiddenJournalBossRun() { return completeHiddenJournalBossRun; },
    get getGrandBreachProgress() { return getGrandBreachProgress; },
    get GRAND_BREACH_ENCOUNTER() { return GRAND_BREACH_ENCOUNTER; },
    get getCombatTime() { return getCombatTime; },
    get ASCENDANCY_KEYSTONE_VALUES() { return ASCENDANCY_KEYSTONE_VALUES; },
    get getColonyRoomRun() { return getColonyRoomRun; },
    get actExplorationMap() { return actExplorationMap; },
    get colonyWards() { return colonyWards; },
    get getColonyWaveEnemyCount() { return getColonyWaveEnemyCount; },
    get spawnColonyWave() { return spawnColonyWave; },
    get copyCombatGridCell() { return copyCombatGridCell; },
    get prepareMeteorEncounterEntry() { return prepareMeteorEncounterEntry; },
    get METEOR_FALL_ZONE_ID() { return METEOR_FALL_ZONE_ID; },
    get maybeUnlockSkyTowerFromChaos20() { return maybeUnlockSkyTowerFromChaos20; },
    get isBeehiveRunLockedForMapTravel() { return typeof isBeehiveRunLockedForMapTravel === 'undefined' ? undefined : isBeehiveRunLockedForMapTravel; },
    get autoEnterGrandBreachIfReady() { return typeof autoEnterGrandBreachIfReady === 'undefined' ? undefined : autoEnterGrandBreachIfReady; },
    get enterOceanDive() { return enterOceanDive; },
    get isOceanAutoRediveHalted() { return isOceanAutoRediveHalted; },
    get getZoneTravelBlockReason() { return getZoneTravelBlockReason; },
    get getContentStartBlockReason() { return getContentStartBlockReason; },
    get applyOceanKill() { return applyOceanKill; },
    get OCEAN_COMBAT_DIVE() { return OCEAN_COMBAT_DIVE; },
    get hasGridCell() { return hasGridCell; },
    get getGridBlockedCells() { return getGridBlockedCells; },
    get findFreeGridCell() { return findFreeGridCell; },
    get createEnemy() { return createEnemy; },
    get getBattleSpawnStamp() { return getBattleSpawnStamp; },
    get gridCellKey() { return gridCellKey; },
    get getElementColor() { return getElementColor; },
    get combatTacticsRuntime() { return window.GameModules.state.combat.combatTacticsRuntime; },
    get findNearestGridEnemy() { return findNearestGridEnemy; },
    get woodsmanStumps() { return woodsmanStumps; },
    get playerStatCache() { return playerStatCache; },
    get combatSupports() { return window.GameModules.combat.supports; },
    get STAGE_STORY_ART() { return STAGE_STORY_ART; },
    get stumpBox() { return typeof stumpBox === 'undefined' ? undefined : stumpBox; },
    get weaponMastery() { return typeof weaponMastery === 'undefined' ? undefined : weaponMastery; },
    get bossVariants() { return typeof bossVariants === 'undefined' ? undefined : bossVariants; },
    get stumpNursery() { return typeof stumpNursery === 'undefined' ? undefined : stumpNursery; },
    get combatLootReceipts() { return combatLootReceipts; },
    get placeFloorItem() { return placeFloorItem; },
    get gainSkyRiftGaugeFromCombat() { return gainSkyRiftGaugeFromCombat; },
    get applyAilmentEffectsOnDeath() { return applyAilmentEffectsOnDeath; },
    get applyDamageToEnemyResource() { return applyDamageToEnemyResource; },
    get countBeehiveWaveAlive() { return countBeehiveWaveAlive; },
    get onBeehiveWaveCleared() { return typeof onBeehiveWaveCleared === 'undefined' ? undefined : onBeehiveWaveCleared; },
    get hasKeystone() { return hasKeystone; },
    get i18n() { return i18n; },
    get withDirectionParticle() { return withDirectionParticle; }
};
const rewardEnv = { get owner() { return game; }, deps: rewardDeps };
const completionEffects = {
    get addLog() { return addLog; },
    get dispatchRuntimeEvent() { return dispatchRuntimeEvent; },
    get queueImportantSave() { return queueImportantSave; },
    get queueTutorialNotice() { return queueTutorialNotice; },
    get checkUnlocks() { return checkUnlocks; },
    get updateStaticUI() { return updateStaticUI; },
    get collectExplorationFloorLoot() { return collectExplorationFloorLoot; },
    showGameToast(...args) { return window.showGameToast(...args); },
    renderCosmosAtlas() { return window.GameModules.cosmosAtlas.view.renderCosmosAtlas(); },
    finishSyncOpened() { return contentUnlockUi.syncOpened(); }
};
function runCompletionCommands(commands, feedback) {
    let step = commands.next();
    while (!step.done) {
        const { kind, args } = step.value;
        if (kind === 'captureFinishFeedback') { feedback = { say: addLog, redraw: updateStaticUI, unlocks: checkUnlocks, get reveal() { return triggerMapUnlockReveal; } }; step = commands.next(); }
        else if (['finishSay','finishRedraw','finishUnlocks','finishReveal'].includes(kind)) {
            const method = kind.slice(6).toLowerCase();
            step = commands.next(feedback[method](...args));
        } else step = commands.next(completionEffects[kind](...args));
    }
    return step.value;
}

export function ensureNextEndlessChaosDepthUnlocked(depth) { return clearEnsureNextEndlessChaosDepthUnlocked(rewardEnv, depth); }
export function getTrialSkillGemRewardChance(zone, isFirstClear) { return clearGetTrialSkillGemRewardChance(zone, isFirstClear); }
export function grantUnderworldFloorMilestone(floor, progress) { return runCompletionCommands(clearGrantUnderworldFloorMilestone(rewardEnv, floor, progress)); }
export function finishEncounterRun() { return runCompletionCommands(clearFinishEncounterRun(rewardEnv)); }
export function finishBeyondBoundaryEncounter(zone, mapAction, ui) { return runCompletionCommands(clearFinishBeyondBoundaryEncounter(rewardEnv, zone, mapAction), ui); }
export function finishMeteorEncounter(zone, mapAction, ui) { return runCompletionCommands(clearFinishMeteorEncounter(rewardEnv, zone, mapAction), ui); }
export function finishOutsideChaosEncounter(zone, mapAction, ui) { return runCompletionCommands(clearFinishOutsideChaosEncounter(rewardEnv, zone, mapAction), ui); }
export function finishOceanEncounter(zone, mapAction, ui) { return runCompletionCommands(clearFinishOceanEncounter(rewardEnv, zone, mapAction), ui); }
export function finishChaosRealmEncounter(zone, mapAction, ui) { return runCompletionCommands(clearFinishChaosRealmEncounter(rewardEnv, zone, mapAction), ui); }
export function finishSkyTowerEncounter(zone, mapAction, ui) { return runCompletionCommands(clearFinishSkyTowerEncounter(rewardEnv, zone, mapAction), ui); }
export function finishTimeRiftEncounter(zone, mapAction, ui) { return runCompletionCommands(clearFinishTimeRiftEncounter(rewardEnv, zone, mapAction), ui); }
export function finishTimeRiftFusion(rift, ui) { return runCompletionCommands(clearFinishTimeRiftFusion(rewardEnv, rift), ui); }
export function finishTrialEncounter(zone, mapAction, ui) { return runCompletionCommands(clearFinishTrialEncounter(rewardEnv, zone, mapAction), ui); }
export function finishSeasonBossEncounter(zone, mapAction, ui) { return runCompletionCommands(clearFinishSeasonBossEncounter(rewardEnv, zone, mapAction), ui); }
export function grantSeasonBossRewards(zone, firstRootBossClear, ui) { return runCompletionCommands(clearGrantSeasonBossRewards(rewardEnv, zone, firstRootBossClear), ui); }
export function departSeasonBoss(zone, ui) { return runCompletionCommands(clearDepartSeasonBoss(rewardEnv, zone), ui); }
export function finishLabyrinthEncounter(zone, mapAction, ui) { return runCompletionCommands(clearFinishLabyrinthEncounter(rewardEnv, zone, mapAction), ui); }
export function finishUnderworldEncounter(zone, mapAction, ui) { return runCompletionCommands(clearFinishUnderworldEncounter(rewardEnv, zone, mapAction), ui); }
export function finishCosmosEncounter(zone, mapAction, ui) { return runCompletionCommands(clearFinishCosmosEncounter(rewardEnv, zone, mapAction), ui); }
export function finishZoneClear(zone, mapAction, ui) { return runCompletionCommands(clearFinishZoneClear(rewardEnv, zone, mapAction), ui); }




const settlementEffects = {
    get addLog() { return addLog; },
    get addBattleFx() { return addBattleFx; },
    get addConfirmedSkillEffect() { return addConfirmedSkillEffect; },
    get checkUnlocks() { return checkUnlocks; },
    get queueImportantSave() { return queueImportantSave; },
    get runPassiveTreeAutoInvest() { return runPassiveTreeAutoInvest; },
    get keepEquipmentDrop() { return keepEquipmentDrop; },
    get keepCurrencyDrop() { return keepCurrencyDrop; },
    get collectExplorationFloorLoot() { return collectExplorationFloorLoot; },
    get grantEnemyLoot() { return grantEnemyLoot; },
    requestHeavyUiRefresh() { pendingHeavyUiRefresh = true; },
    corpseExplosionLine(...args) { return coreCorpseExplosionLine(rewardEnv, ...args); }
};
function runSettlementCommands(commands, overrides) {
    // Depth-first settlement: finish a blast victim before resuming the hit that killed it.
    // An explicit stack avoids both a domain import cycle and a growing JS call stack.
    const stack = [{ commands, say: overrides ? overrides.say : addLog }];
    let result;
    while (stack.length) {
        const frame = stack[stack.length - 1];
        const step = frame.commands.next(result);
        result = undefined;
        if (step.done) { stack.pop(); result = step.value; continue; }
        const { kind, args } = step.value;
        if (kind === 'settleDeath') stack.push({ commands: killHandleEnemyDeath(rewardEnv, ...args), say: addLog });
        else if (kind === 'killSay') result = frame.say(...args);
        else if (kind === 'announceColonyWard') result = lootAnnounceColonyWard(lootUiEnv, args[0], frame.say);
        else result = settlementEffects[kind](...args);
    }
    return result;
}

export function getEnemyExperienceReward(enemy, pStats, kind = 'experience') { return killGetEnemyExperienceReward(rewardEnv, enemy, pStats, kind); }
export function grantExpAndGem(enemy, pStats) { return runSettlementCommands(killGrantExpAndGem(rewardEnv, enemy, pStats)); }
export function awardLevelPassivePoint() { return killAwardLevelPassivePoint(rewardEnv); }
export function applyGrandBreachMobTuning(zone, enemy) { return killApplyGrandBreachMobTuning(zone, enemy); }
export function isMapProgressHeld(zone, rift) { return killIsMapProgressHeld(rewardEnv, zone, rift); }
export function isVoidRiftCombatZone(zone) { return killIsVoidRiftCombatZone(zone); }
export function applyVoidRiftMobTuning(enemy) { return killApplyVoidRiftMobTuning(enemy); }
export function clearDotFxThrottleForEnemy(enemyId) { return killClearDotFxThrottleForEnemy(rewardEnv, enemyId); }
export function grantLoopStarterWeaponOnFirstKill(enemy) { return runSettlementCommands(killGrantLoopStarterWeaponOnFirstKill(rewardEnv, enemy)); }
export function resolveEnemyDeath(enemy) { return killResolveEnemyDeath(rewardEnv, enemy); }
export function countKillForContent(enemy, zone, pStats) { return runSettlementCommands(killCountKillForContent(rewardEnv, enemy, zone, pStats)); }
export function tickTalentKillRuntime(enemy) { return killTickTalentKillRuntime(rewardEnv, enemy); }
export function rollRandomVoidRiftOnKill(enemy, zone, say) { return runSettlementCommands(killRollRandomVoidRiftOnKill(rewardEnv, enemy, zone), { say }); }
export function explodeCorpsesOnKill(enemy, pStats, say) { return runSettlementCommands(killExplodeCorpsesOnKill(rewardEnv, enemy, pStats), { say }); }
export function applyUniqueKillEffects(pStats) { return killApplyUniqueKillEffects(rewardEnv, pStats); }
export function getOverkillSplash(enemy, pStats) { return killGetOverkillSplash(enemy, pStats); }
export function advanceColonyWaveOnKill(zone, say, enemy) { return runSettlementCommands(killAdvanceColonyWaveOnKill(rewardEnv, zone, enemy), { say }); }
export function finishGrandBreachOnBossKill(enemy, zone, say) { return runSettlementCommands(killFinishGrandBreachOnBossKill(rewardEnv, enemy, zone), { say }); }
export function flagHeavyUiAfterKill(enemy, zone, gemLeveled, currencyDropVersionBefore) { return runSettlementCommands(killFlagHeavyUiAfterKill(rewardEnv, enemy, zone, gemLeveled, currencyDropVersionBefore)); }
export function transferSkillDotOnDeath(enemy) { return runSettlementCommands(killTransferSkillDotOnDeath(rewardEnv, enemy)); }
export function getRangerWeakpointBonus(enemy, hitDamage) { return killGetRangerWeakpointBonus(rewardEnv, enemy, hitDamage); }
export function onChaos20Cleared() { return killOnChaos20Cleared(rewardEnv); }
export function enterAutomaticMapInterruptionAfterClear(clearedZone) { return runSettlementCommands(killEnterAutomaticMapInterruptionAfterClear(rewardEnv, clearedZone)); }
export function callOceanGuardianAtBoundary() { return killCallOceanGuardianAtBoundary(rewardEnv); }
export function noteOceanKill(enemy, zone) { return runSettlementCommands(killNoteOceanKill(rewardEnv, enemy, zone)); }
export function callOceanGuardianAdds(say) { return runSettlementCommands(killCallOceanGuardianAdds(rewardEnv), { say }); }
export function autoRediveOceanAfterClear(clearedZone) { return killAutoRediveOceanAfterClear(rewardEnv, clearedZone); }
export function resolvePlayerApproachTarget(alive) { return killResolvePlayerApproachTarget(rewardEnv, alive); }
export function getGrandBreachRewardSummary(kills) { return killGetGrandBreachRewardSummary(kills); }
export function handleEnemyDeath(enemy, pStats) { return runSettlementCommands(killHandleEnemyDeath(rewardEnv, enemy, pStats)); }

const lootUiEnv = { get owner() { return game; }, deps: {
    get _t() { return _t; },
    get ORB_DB() { return ORB_DB; },
    get battleFxSuppressed() { return battleFxSuppressed; },
    get addBattleFx() { return addBattleFx; },
    get receiveKnittingYarn() { return receiveKnittingYarn; },
    get dispatchRuntimeEvent() { return dispatchRuntimeEvent; },
    get announceWildTalisman() { return announceWildTalisman; },
    get atlasFinds() { return atlasFinds; },
    get checkUnlocks() { return checkUnlocks; },
    get addLog() { return addLog; },
    get colonyWardsUi() { return colonyWardsUi; },
    get formatValue() { return formatValue; },
    get getStyledOrbName() { return typeof getStyledOrbName === 'undefined' ? undefined : getStyledOrbName; }
} };

export function keepEquipmentDrop(enemy, item, options) {
    const result = delivery.keepEquipment(game, enemy, item, options);
    lootShowEquipmentDelivery(lootUiEnv, enemy, item, result);
    return result.status;
}

export function receiveStumpDropRow(row) {
    dispatchRuntimeEvent('stump-box-changed', delivery.receiveStump(game, row));
}

export function receiveDeferredRune(row) {
    dispatchRuntimeEvent('gem-loot-received', delivery.receiveRune(game, row));
}

export function placeFloorItem(enemy, kind, item, overflow) {
    return delivery.placeItem(game, enemy, kind, { item, overflow });
}

export function explorationFloorFor(enemy) {
    return delivery.floorFor(game, enemy);
}

export function keepCurrencyDrop(enemy, currencyKey, amount) {
    const result = delivery.keepCurrency(game, enemy, currencyKey, amount);
    if (result.receipt) queueEnemyGroundLoot(enemy, result.receipt);
    return { gain: result.gain, floor: result.floor };
}

export function grantEquipmentPick(enemy, zone, minimumRarity, slot) {
    return lootConsumeNotices(lootUiEnv, loot.equipment(game, enemy, zone, minimumRarity, slot));
}

export function grantRootWeaponPick(enemy, zone) {
    return lootConsumeNotices(lootUiEnv, loot.rootWeapon(game, enemy, zone));
}

export function rollCurrencyAndGear(enemy, zone, itemChance) {
    return drops.currencyAndGear(enemy, zone, itemChance);
}

export function grantEnemyLoot(enemy) {
    return combatLootReceipts.capture(game,()=>{
        // 한 몸의 처치에서 기존 정예 머리 몫도 한 번만 지급한다. 떨어지는 자리는 본체의 발밑이다.
        for(const part of enemy.cerberusRewards||[])rollLootForEnemy({...part,gx:enemy.gx,gy:enemy.gy},addLog);
        atlasRun.onKill(enemy);roomInvaders.grantExtraLoot(enemy);return rollLootForEnemy(enemy,addLog);
    });
}

export function awardEnemyLootCurrency(key, amount, source = 'reward') {
    return delivery.awardCurrency(game, key, amount, source);
}

export function rollEnemyAttackGem(awakening, boss) {
    return drops.attackRune(awakening, boss);
}

export function ownedAndReservedRuneState() {
    return delivery.reservedRuneState(game);
}

export function rollKnittingYarn(enemy, zone) {
    const id = delivery.rollYarn(game, enemy, zone);
    if (id) receiveKnittingYarn(id);
}

export function queueEnemyGroundLoot(enemy, receipt) { return lootQueueGroundReceipt(lootUiEnv, enemy, receipt); }
export function getJewelLootColor(jewel) { return lootJewelColor(jewel); }
export function collectExplorationFloorLoot(rows) { return lootConsumeFloorPickup(lootUiEnv, delivery.collect(game, rows)); }
export function rollLootForEnemy(enemy, say = addLog) { return lootConsumeRoll(lootUiEnv, loot.roll(game, enemy), say); }

safeExposeGlobals({ handleEnemyDeath, getEnemyExperienceReward, grantExpAndGem, awardLevelPassivePoint, applyGrandBreachMobTuning, isMapProgressHeld, isVoidRiftCombatZone, applyVoidRiftMobTuning, queueEnemyGroundLoot, getJewelLootColor, keepEquipmentDrop, collectExplorationFloorLoot, receiveStumpDropRow, receiveDeferredRune, placeFloorItem, explorationFloorFor, keepCurrencyDrop, grantEquipmentPick, grantRootWeaponPick, rollCurrencyAndGear, grantEnemyLoot, awardEnemyLootCurrency, rollEnemyAttackGem, ownedAndReservedRuneState, rollLootForEnemy, rollKnittingYarn, clearDotFxThrottleForEnemy, grantLoopStarterWeaponOnFirstKill, resolveEnemyDeath, countKillForContent, tickTalentKillRuntime, rollRandomVoidRiftOnKill, explodeCorpsesOnKill, applyUniqueKillEffects, getOverkillSplash, advanceColonyWaveOnKill, finishGrandBreachOnBossKill, flagHeavyUiAfterKill, transferSkillDotOnDeath, getRangerWeakpointBonus, ensureNextEndlessChaosDepthUnlocked, onChaos20Cleared, enterAutomaticMapInterruptionAfterClear, callOceanGuardianAtBoundary, noteOceanKill, callOceanGuardianAdds, autoRediveOceanAfterClear, resolvePlayerApproachTarget, getTrialSkillGemRewardChance, getGrandBreachRewardSummary, grantUnderworldFloorMilestone, finishEncounterRun, finishBeyondBoundaryEncounter, finishMeteorEncounter, finishOutsideChaosEncounter, finishOceanEncounter, finishChaosRealmEncounter, finishSkyTowerEncounter, finishTimeRiftEncounter, finishTimeRiftFusion, finishTrialEncounter, finishSeasonBossEncounter, grantSeasonBossRewards, departSeasonBoss, finishLabyrinthEncounter, finishUnderworldEncounter, finishCosmosEncounter, finishZoneClear });
