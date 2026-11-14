import { createCombatRuntime, captureCombatSnapshot, restoreCombatSnapshot } from './state/combat-runtime.mjs';
import * as runPart0 from './combat/woodsman-build-lock.mjs';
import * as runPart1 from './combat/run-zone-guards.mjs';
import * as runPart2 from './combat/run-state.mjs';
import * as runPart3 from './combat/colony-wave-spawn.mjs';
import * as runPart4 from './combat/colony-wave-rooms.mjs';
import * as runPart5 from './combat/colony-wave-tick.mjs';
import * as runPart6 from './combat/colony-run-controls.mjs';
import * as corePart0 from './combat/core-hit-math.mjs';
import * as corePart1 from './ui/combat-log-format.mjs';
import * as corePart2 from './combat/core-hit-results.mjs';
import * as corePart3 from './combat/core-recovery.mjs';
import * as corePart4 from './combat/core-keystones.mjs';
import * as corePart5 from './combat/core-socket-bonuses.mjs';
import * as corePart6 from './combat/core-talent-hits.mjs';
import * as corePart7 from './combat/core-wild-drop.mjs';
import * as corePart8 from './combat/core-conditions.mjs';
import * as corePart9 from './combat/core-summons.mjs';
import * as coreValues from './combat/core-values.mjs';
import * as controlPart0 from './combat/combat-channel.mjs';
import * as controlPart1 from './combat/combat-tactics.mjs';
// Legacy consumers connect to the single state owner below; no lexical combat state remains.
const runtime = {
    get combatTacticsRuntime() { return window.GameModules.state.combat.combatTacticsRuntime; },
    set combatTacticsRuntime(value) { window.GameModules.state.combat.combatTacticsRuntime = value; },
    get skillGemCombatRuntime() { return window.GameModules.state.combat.skillGemCombatRuntime; },
    set skillGemCombatRuntime(value) { window.GameModules.state.combat.skillGemCombatRuntime = value; },
    get combatChannelRuntime() { return window.GameModules.state.combat.combatChannelRuntime; },
    set combatChannelRuntime(value) { window.GameModules.state.combat.combatChannelRuntime = value; },
    get combatChannelResumeSkillName() { return window.GameModules.state.combat.combatChannelResumeSkillName; },
    set combatChannelResumeSkillName(value) { window.GameModules.state.combat.combatChannelResumeSkillName = value; },
    get nextCombatChannelId() { return window.GameModules.state.combat.nextCombatChannelId; },
    set nextCombatChannelId(value) { window.GameModules.state.combat.nextCombatChannelId = value; },
    get pendingSkillStageHits() { return window.GameModules.state.combat.pendingSkillStageHits; },
    set pendingSkillStageHits(value) { window.GameModules.state.combat.pendingSkillStageHits = value; },
    get pTimer() { return window.GameModules.state.session.pTimer; },
    set pTimer(value) { window.GameModules.state.session.pTimer = value; }
};
const deps = {
    get combatSupports() { return window.GameModules.combat.supports; },
    get resetWoodsmanCurse() { return resetWoodsmanCurse; },
    get OUTSIDE_CHAOS_ZONE_ID() { return OUTSIDE_CHAOS_ZONE_ID; },
    get WOODSMAN_ECHO_ZONE_ID() { return WOODSMAN_ECHO_ZONE_ID; },
    get atlasRun() { return atlasRun; },
    get handleEnemyDeath() { return handleEnemyDeath; },
    get getPlayerStats() { return getPlayerStats; },
    get ensureCombatGridRuntime() { return ensureCombatGridRuntime; },
    get assignEnemyGridCombatProfile() { return assignEnemyGridCombatProfile; },
    get COMBAT_GRID_CONFIG() { return COMBAT_GRID_CONFIG; },
    get getColonyWaveEnemyCount() { return getColonyWaveEnemyCount; },
    get REALM_MONSTER_VISUAL_SETS() { return REALM_MONSTER_VISUAL_SETS; },
    get createEnemy() { return createEnemy; },
    get estimateMapZonePowerRequirements() { return estimateMapZonePowerRequirements; },
    get getGridBlockedCells() { return getGridBlockedCells; },
    get fitBossFootprint() { return fitBossFootprint; },
    get findFreeGridCell() { return findFreeGridCell; },
    get getGridUnitFootprint() { return getGridUnitFootprint; },
    get getGridUnitCells() { return getGridUnitCells; },
    get gridCellKey() { return gridCellKey; },
    get actExplorationProgress() { return actExplorationProgress; },
    get startEncounterRun() { return startEncounterRun; },
    get actExplorationMap() { return actExplorationMap; },
    get chainRoomsOf() { return chainRoomsOf; },
    get STAGE_BOARD_ROOMS() { return STAGE_BOARD_ROOMS; },
    get fillRoomPack() { return fillRoomPack; },
    get defeatReturnZone() { return defeatReturnZone; },
    get clearDefeatedEncounter() { return clearDefeatedEncounter; },
    get getAutoProgressZoneId() { return getAutoProgressZoneId; },
    get getZone() { return getZone; },
    get random() { return Math.random; },
    get i18n() { return i18n; },
    get DOT_STACK_MAX() { return DOT_STACK_MAX; },
    get getDotStackMultiplier() { return getDotStackMultiplier; },
    get getDamageElementIcon() { return getDamageElementIcon; },
    get withDirectionParticle() { return withDirectionParticle; },
    get applyDamageToEnemyResource() { return applyDamageToEnemyResource; },
    get combatResources() { return window.GameModules.combat.resources; },
    get CLASS_KEYSTONE_DEFS() { return typeof CLASS_KEYSTONE_DEFS === 'undefined' ? undefined : CLASS_KEYSTONE_DEFS; },
    get equipmentSockets() { return equipmentSockets; },
    get combatEquipmentStats() { return combatEquipmentStats; },
    get pickRandomAscendKeystoneId() { return typeof pickRandomAscendKeystoneId === 'undefined' ? undefined : pickRandomAscendKeystoneId; },
    get refreshGrantedBloomMechanics() { return typeof refreshGrantedBloomMechanics === 'undefined' ? undefined : refreshGrantedBloomMechanics; },
    get getGemLevelTargetTags() { return typeof getGemLevelTargetTags === 'undefined' ? undefined : getGemLevelTargetTags; },
    get getBackgroundBuildMemo() { return getBackgroundBuildMemo; },
    get getJewelStats() { return typeof getJewelStats === 'undefined' ? undefined : getJewelStats; },
    get getSocketJewelMultiplier() { return getSocketJewelMultiplier; },
    get getAbyssJewelMultiplier() { return getAbyssJewelMultiplier; },
    get getEquippedUniqueJewels() { return typeof getEquippedUniqueJewels === 'undefined' ? undefined : getEquippedUniqueJewels; },
    get getPlayerStatSourceItemEntries() { return getPlayerStatSourceItemEntries; },
    get getGemBonusSources() { return typeof getGemBonusSources === 'undefined' ? undefined : getGemBonusSources; },
    get SUPPORT_GEM_DB() { return typeof SUPPORT_GEM_DB === 'undefined' ? undefined : SUPPORT_GEM_DB; },
    get getClassTreeDef() { return typeof getClassTreeDef === 'undefined' ? undefined : getClassTreeDef; },
    get isTalentCardActive() { return typeof isTalentCardActive === 'undefined' ? undefined : isTalentCardActive; },
    get getTalentAttackDamageMul() { return typeof getTalentAttackDamageMul === 'undefined' ? undefined : getTalentAttackDamageMul; },
    get performPlayerAttack() { return performPlayerAttack; },
    get talismans() { return talismans; },
    get actExplorationState() { return actExplorationState; },
    get placeFloorItem() { return placeFloorItem; },
    get TALISMAN_RARITY_TONES() { return TALISMAN_RARITY_TONES; },
    get ASCENDANCY_KEYSTONE_VALUES() { return ASCENDANCY_KEYSTONE_VALUES; },
    get SKILL_DB() { return SKILL_DB; },
    get canUseSkillWithCurrentEquipment() { return canUseSkillWithCurrentEquipment; },
    get summonSupports() { return window.GameModules.combat.summonSupports; },
    get getCombatTime() { return getCombatTime; },
    get getSkillTargets() { return getSkillTargets; },
    get _t() { return _t; },
    get mobilitySkill() { return mobilitySkill; },
    get wispSummons() { return wispSummons; },
    get ascendancyNodeRules() { return ascendancyNodeRules; },
    get PLAYER_ATTACK_RECOVERY() { return PLAYER_ATTACK_RECOVERY; },
    get PLAYER_WALKING_CHARGE() { return PLAYER_WALKING_CHARGE; }
};
const memo = { woodsmanSnapshotPrints: new WeakMap(), colonyLootWaits: new WeakMap(), evasionEntropyByDefender: new WeakMap(), ascendKeystoneOwnerIndex: null };
const env = { get owner() { return game; }, runtime, deps, memo };
const presentation = {
    get runLog() { return addLog; },
    get colonyLog() { return addLog; },
    get queueImportantSave() { return queueImportantSave; },
    get collectExplorationFloorLoot() { return collectExplorationFloorLoot; },
    requestHeavyUiRefresh() { pendingHeavyUiRefresh = true; },
    get addLog() { return addLog; },
    get queueEnemyGroundLoot() { return queueEnemyGroundLoot; },
    get dispatchRuntimeEvent() { return dispatchRuntimeEvent; },
    corpseExplosionLine(reached, splash, label, noun) { return corePart1.coreCorpseExplosionLine(env, reached, splash, label, noun); },
    cancelChannelVisuals(id) { for (const fx of battleFx) if (fx.channelId === id) fx.cancelled = true; },
    get resetBattleRuntimeVisuals() { return resetBattleRuntimeVisuals; },
    get addBattleFx() { return addBattleFx; }
};
function runControlCommands(commands, overrides) {
    let step = commands.next();
    while (!step.done) {
        const command = step.value;
        const handler = overrides && Object.prototype.hasOwnProperty.call(overrides, command.kind)
            ? overrides[command.kind] : presentation[command.kind];
        step = commands.next(handler(...command.args));
    }
    return step.value;
}
const combatControls = {
    hasPlayerChannelBreakingAilment() { return controlPart0.controlHasPlayerChannelBreakingAilment(env); },
    cancelCombatChannelVisuals() { return runControlCommands(controlPart0.controlCancelCombatChannelVisuals(env)); },
    updateCombatChannelRuntime(now) { return runControlCommands(controlPart0.controlUpdateCombatChannelRuntime(env, now)); },
    beginCombatChannel(skillName, motionMs, cycleMs, context) { return controlPart0.controlBeginCombatChannel(env, skillName, motionMs, cycleMs, context); },
    getCombatChannelCycleMs(attackSpeed) { return controlPart0.controlGetCombatChannelCycleMs(attackSpeed); },
    createContinuousChannelStages(stages, cycleMs) { return controlPart0.controlCreateContinuousChannelStages(stages, cycleMs); },
    consumeCombatChannelContinuation(skillName) { return controlPart0.controlConsumeCombatChannelContinuation(env, skillName); },
    getCombatChannelGate(pStats, now) { return controlPart0.controlGetCombatChannelGate(env, pStats, now); },
    resetCombatChannelRuntime() { return runControlCommands(controlPart0.controlResetCombatChannelRuntime(env)); },
    cancelCombatChannel(reason) { return runControlCommands(controlPart0.controlCancelCombatChannel(env, reason)); },
    createCombatTacticsRuntime(now) { return controlPart1.controlCreateCombatTacticsRuntime(env, now); },
    resetCombatTacticsRuntime() { return controlPart1.controlResetCombatTacticsRuntime(env); },
    resetCombatRuntimesForLoadedSave() { return runControlCommands(controlPart1.controlResetCombatRuntimesForLoadedSave(env)); },
    getPlayerAttackRecoveryMs(aspd) { return controlPart1.controlGetPlayerAttackRecoveryMs(env, aspd); },
    isPlayerAttackRecovering(now) { return controlPart1.controlIsPlayerAttackRecovering(env, now); },
    getWalkingChargeScale(pStats, walkedMs) { return controlPart1.controlGetWalkingChargeScale(env, pStats, walkedMs); },
    getTacticalMoveAttackDelayMs(moveSpeed) { return controlPart1.controlGetTacticalMoveAttackDelayMs(moveSpeed); },
    syncCombatTacticsEncounterRuntime() { return controlPart1.controlSyncCombatTacticsEncounterRuntime(env); },
    noteCombatTacticAttack(attackMotionMs) { return controlPart1.controlNoteCombatTacticAttack(env, attackMotionMs); }
};
safeExposeGlobals(combatControls);

const combatCore = {
    announceWildTalisman(drop) { return runControlCommands(corePart7.coreAnnounceWildTalisman(env, drop)); },
    getAverageCriticalHitDamage(damage, chancePct, damagePct, overflow) { return corePart0.coreGetAverageCriticalHitDamage(damage, chancePct, damagePct, overflow); },
    applyCritDamageSoftcap(rawCritDamage) { return corePart0.coreApplyCritDamageSoftcap(rawCritDamage); },
    getCritDamageSoftcapReduction(rawCritDamage) { return corePart0.coreGetCritDamageSoftcapReduction(rawCritDamage); },
    getArmorPhysicalReductionPct(armor, incomingPhysical) { return corePart0.coreGetArmorPhysicalReductionPct(armor, incomingPhysical); },
    getEvasionChancePct(evasion, enemyAccuracy) { return corePart0.coreGetEvasionChancePct(evasion, enemyAccuracy); },
    getEnemyAccuracyForZone(zone) { return corePart0.coreGetEnemyAccuracyForZone(zone); },
    getSummonEvadeChance(summon, enemy) { return corePart0.coreGetSummonEvadeChance(env, summon, enemy); },
    resolveEntropyEvasion(defender, evadeChance, now) { return corePart0.coreResolveEntropyEvasion(env, defender, evadeChance, now); },
    calculatePlayerAccuracy(level, dexterity, flatAccuracy, bonusPct) { return corePart0.coreCalculatePlayerAccuracy(level, dexterity, flatAccuracy, bonusPct); },
    getEnemyTotalEvadeChance(enemy, playerAccuracy) { return corePart0.coreGetEnemyTotalEvadeChance(enemy, playerAccuracy); },
    formatNumberKR(value) { return corePart1.coreFormatNumberKR(env, value); },
    addEvasionCombatLog(target, isPlayer) { return runControlCommands(corePart1.coreAddEvasionCombatLog(env, target, isPlayer)); },
    getPlayerHitCombatLog(summary, hit) { return corePart1.coreGetPlayerHitCombatLog(env, summary, hit); },
    notePlayerHitSummary(summary, enemy, dealt) { return corePart2.coreNotePlayerHitSummary(summary, enemy, dealt); },
    explodeCorpse(enemy, splash, label, onKill, noun) { return runControlCommands(corePart2.coreExplodeCorpse(env, enemy, splash, { label, noun }), { corpseDeath: onKill }); },
    applyLeechSoftcap(rawLeech) { return corePart3.coreApplyLeechSoftcap(env, rawLeech); },
    getPlayerHitLeechTarget(pStats) { return corePart3.coreGetPlayerHitLeechTarget(env, pStats); },
    applyPlayerHitLeech(pStats, hitDamage, chaosDamage) { return corePart3.coreApplyPlayerHitLeech(env, pStats, hitDamage, chaosDamage); },
    getLeechCaps(pStats, target) { return corePart3.coreGetLeechCaps(env, pStats, target); },
    getLeechOutstandingTotal() { return corePart3.coreGetLeechOutstandingTotal(env); },
    addPlayerLeechInstance(rawAmount, pStats, target) { return corePart3.coreAddPlayerLeechInstance(env, rawAmount, pStats, target); },
    applyInstantPlayerLeech(rawAmount, pStats, target) { return corePart3.coreApplyInstantPlayerLeech(env, rawAmount, pStats, target); },
    tickPlayerLeech(pStats, dt) { return corePart3.coreTickPlayerLeech(env, pStats, dt); },
    addPlayerRecoupInstance(rawAmount, durationSec) { return corePart3.coreAddPlayerRecoupInstance(env, rawAmount, durationSec); },
    tickPlayerRecoup(pStats, dt) { return corePart3.coreTickPlayerRecoup(env, pStats, dt); },
    refreshRealmDeathWard(pStats) { return runControlCommands(corePart3.coreRefreshRealmDeathWard(env, pStats)); },
    absorbDamageWithRealmDeathWard(amount, pStats) { return runControlCommands(corePart3.coreAbsorbDamageWithRealmDeathWard(env, amount, pStats)); },
    absorbDamageWithTalentStoneShield(amount) { return runControlCommands(corePart3.coreAbsorbDamageWithTalentStoneShield(env, amount)); },
    floorIncomingDamage(amount) { return corePart3.coreFloorIncomingDamage(env, amount); },
    getPlayerHpCap(pStats) { return corePart3.coreGetPlayerHpCap(env, pStats); },
    getPlayerRecoveryHpCap(pStats, tick) { return corePart3.coreGetPlayerRecoveryHpCap(env, pStats, tick); },
    getMossRecoveryOccupied() { return corePart3.coreGetMossRecoveryOccupied(env); },
    getPlayerEnergyShieldRecoveryCap(pStats) { return corePart3.coreGetPlayerEnergyShieldRecoveryCap(env, pStats); },
    getAscendKeystoneOwnerClass(id) { return corePart4.coreGetAscendKeystoneOwnerClass(env, id); },
    hasKeystone(id, owner) { return corePart4.coreHasKeystone(env, id, owner); },
    getElementalistOverloadStacks() { return corePart4.coreGetElementalistOverloadStacks(env); },
    recordElementalistOverloadAttack(isCrit) { return corePart4.coreRecordElementalistOverloadAttack(env, isCrit); },
    getWarriorRageStacks(now) { return corePart4.coreGetWarriorRageStacks(env, now); },
    getWarriorRagePhysicalDamageMultiplier(now) { return corePart4.coreGetWarriorRagePhysicalDamageMultiplier(env, now); },
    grantWarriorRageOnHit(now) { return corePart4.coreGrantWarriorRageOnHit(env, now); },
    clearAscendKeystoneRuntimeState(removedIds, options) { return corePart4.coreClearAscendKeystoneRuntimeState(env, removedIds, options); },
    collectSocketedJewels(equipment) { return corePart5.coreCollectSocketedJewels(env, equipment); },
    getSocketedJewels(owner) { return corePart5.coreGetSocketedJewels(env, owner); },
    getMirroredRingJewels(owner) { return corePart5.coreGetMirroredRingJewels(env, owner); },
    recomputeCosmosTwinKeystones() { return corePart5.coreRecomputeCosmosTwinKeystones(env); },
    isDualWielding() { return corePart5.coreIsDualWielding(env); },
    getEquippedJewelGemLevelBonusSources(target) { return corePart5.coreGetEquippedJewelGemLevelBonusSources(env, target); },
    getTargetGemBonusSources(target, fallbackSources, resolvedStats, evaluation) { return corePart5.coreGetTargetGemBonusSources(env, target, fallbackSources, resolvedStats, evaluation); },
    getAliveEnemyByRuntimeKey(enemyId) { return corePart6.coreGetAliveEnemyByRuntimeKey(env, enemyId); },
    getCombatTalentCardLevel(cardId) { return corePart6.coreGetCombatTalentCardLevel(env, cardId); },
    getActiveTalentUniqueEffects() { return corePart6.coreGetActiveTalentUniqueEffects(); },
    prepareTalentPlayerAttackContext(pStats) { return corePart6.corePrepareTalentPlayerAttackContext(env, pStats); },
    getTalentPlayerAttackDamageMultiplier() { return corePart6.coreGetTalentPlayerAttackDamageMultiplier(env); },
    performTalentMoonReturn(pStats, options, didHit) { return corePart6.corePerformTalentMoonReturn(env, pStats, options, didHit); },
    updateTalentButcherHitMark(enemy) { return corePart6.coreUpdateTalentButcherHitMark(env, enemy); },
    canApplyTalentExecuteThreshold(enemy, threshold) { return corePart6.coreCanApplyTalentExecuteThreshold(enemy, threshold); },
    rollWildTalismanDrop(enemy, chance) { return runControlCommands(corePart7.coreRollWildTalismanDrop(env, enemy, chance)); },
    expireConditionEffects(now) { return corePart8.coreExpireConditionEffects(env, now); },
    pruneEnemyRuntimeDebuffMaps() { return corePart8.corePruneEnemyRuntimeDebuffMaps(env); },
    getConditionDebuffDelta(deb) { return corePart8.coreGetConditionDebuffDelta(deb); },
    getEnemyConditionDebuffFactor(enemy, pStats) { return corePart8.coreGetEnemyConditionDebuffFactor(env, enemy, pStats); },
    getKeystoneEnemyTakenMultiplier(enemy, hitElement) { return corePart8.coreGetKeystoneEnemyTakenMultiplier(env, enemy, hitElement); },
    applyConditionPhysicalReductionEffects(pStats, conditionEffects) { return corePart8.coreApplyConditionPhysicalReductionEffects(pStats, conditionEffects); },
    getActiveSummonGemDefs() { return corePart9.coreGetActiveSummonGemDefs(env); },
    getSummonProfile(gemName) { return corePart9.coreGetSummonProfile(gemName); },
    getSummonRuntimeCap(pStats) { return corePart9.coreGetSummonRuntimeCap(env, pStats); },
    getSummonCapFromSum(sum) { return corePart9.coreGetSummonCapFromSum(env, sum); },
    getSummonCapMaximum() { return corePart9.coreGetSummonCapMaximum(env); },
    applyGrandlordGhostState() { return corePart9.coreApplyGrandlordGhostState(env); },
    buildActiveSummonRuntimeDefs(pStats) { return corePart9.coreBuildActiveSummonRuntimeDefs(env, pStats); }
};
safeExposeGlobals(combatCore);
safeExposeGlobals({
    LEECH_SOFTCAP_START: coreValues.LEECH_SOFTCAP_START,
    LEECH_SOFTCAP_MID: coreValues.LEECH_SOFTCAP_MID,
    LEECH_SOFTCAP_MID_EFF: coreValues.LEECH_SOFTCAP_MID_EFF,
    LEECH_SOFTCAP_HIGH_EFF: coreValues.LEECH_SOFTCAP_HIGH_EFF,
    LEECH_BASE_INSTANCE_CAP_PCT: coreValues.LEECH_BASE_INSTANCE_CAP_PCT,
    LEECH_BASE_TOTAL_CAP_PCT: coreValues.LEECH_BASE_TOTAL_CAP_PCT,
    LEECH_BASE_RATE_CAP_PCT: coreValues.LEECH_BASE_RATE_CAP_PCT,
    ARMOR_MITIGATION_SCALE: coreValues.ARMOR_MITIGATION_SCALE,
    SKILL_DELAY_REDUCE_CAP: coreValues.SKILL_DELAY_REDUCE_CAP,
    EVASION_ACCURACY_SCALE: coreValues.EVASION_ACCURACY_SCALE,
    EVASION_ENTROPY_RESET_MS: coreValues.EVASION_ENTROPY_RESET_MS,
    SUMMON_EVASION_CAP_PCT: coreValues.SUMMON_EVASION_CAP_PCT,
    SUMMON_EVASION_POST_20_STEP_MULTIPLIER: coreValues.SUMMON_EVASION_POST_20_STEP_MULTIPLIER,
    SUMMON_EFFICIENCY_EVASION_RATIO: coreValues.SUMMON_EFFICIENCY_EVASION_RATIO,
    PLAYER_ACCURACY_BASE: coreValues.PLAYER_ACCURACY_BASE,
    PLAYER_ACCURACY_PER_LEVEL: coreValues.PLAYER_ACCURACY_PER_LEVEL,
    PLAYER_ACCURACY_PER_DEXTERITY: coreValues.PLAYER_ACCURACY_PER_DEXTERITY,
    MIN_PENETRATED_RESISTANCE: coreValues.MIN_PENETRATED_RESISTANCE,
    CRIT_DAMAGE_BASE_MULTIPLIER: coreValues.CRIT_DAMAGE_BASE_MULTIPLIER,
    PLAYER_PHYSICAL_REDUCTION_CAP_PCT: coreValues.PLAYER_PHYSICAL_REDUCTION_CAP_PCT,
    CONDITION_GUARD_PHYSICAL_REDUCTION_CAP_PCT: coreValues.CONDITION_GUARD_PHYSICAL_REDUCTION_CAP_PCT,
    WARCRY_PHYSICAL_REDUCTION_CAP_BONUS_PCT: coreValues.WARCRY_PHYSICAL_REDUCTION_CAP_BONUS_PCT,
    COMBAT_PROJECTILE_MIN_TRAVEL_MS: coreValues.COMBAT_PROJECTILE_MIN_TRAVEL_MS,
    COMBAT_PROJECTILE_MS_PER_CELL: coreValues.COMBAT_PROJECTILE_MS_PER_CELL,
    BOSS_ATTACK_IMPACT_DELAY_MS: coreValues.BOSS_ATTACK_IMPACT_DELAY_MS,
    ENTRY_BOSS_EASING: coreValues.ENTRY_BOSS_EASING,
    UNDERWORLD_ENTRY_BENCHMARK_HP_MULTIPLIER: coreValues.UNDERWORLD_ENTRY_BENCHMARK_HP_MULTIPLIER,
    UNDERWORLD_ENTRY_BENCHMARK_DAMAGE_MULTIPLIER: coreValues.UNDERWORLD_ENTRY_BENCHMARK_DAMAGE_MULTIPLIER,
    OCEAN_GUARDIAN_BOARD_START_PROGRESS: coreValues.OCEAN_GUARDIAN_BOARD_START_PROGRESS,
    COMBAT_TACTIC_TARGET_LOCK_MS: coreValues.COMBAT_TACTIC_TARGET_LOCK_MS,
    COMBAT_TACTIC_STALL_MS: coreValues.COMBAT_TACTIC_STALL_MS,
    COMBAT_TACTIC_MAX_RETREATS: coreValues.COMBAT_TACTIC_MAX_RETREATS,
    PLAYER_ATTACK_RECOVERY: coreValues.PLAYER_ATTACK_RECOVERY,
    PLAYER_WALKING_CHARGE: coreValues.PLAYER_WALKING_CHARGE,
    PLAYER_HIT_SCALE_LABELS: coreValues.PLAYER_HIT_SCALE_LABELS,
    WARRIOR_RAGE_STACK_MAX: coreValues.WARRIOR_RAGE_STACK_MAX,
    WARRIOR_RAGE_STACK_DAMAGE_PCT: coreValues.WARRIOR_RAGE_STACK_DAMAGE_PCT,
    WARRIOR_RAGE_DURATION_MS: coreValues.WARRIOR_RAGE_DURATION_MS,
    ELEMENTALIST_OVERLOAD_STACK_MAX: coreValues.ELEMENTALIST_OVERLOAD_STACK_MAX,
    WOODSMAN_LOCKED_FIELDS: coreValues.WOODSMAN_LOCKED_FIELDS,
    WOODSMAN_LOCKED_POINTS: coreValues.WOODSMAN_LOCKED_POINTS,
    COLONY_MANUAL_LOOT_WAIT_MS: coreValues.COLONY_MANUAL_LOOT_WAIT_MS
});

const combatRuns = {
    snapshotWoodsmanBuildState() { return runPart0.runSnapshotWoodsmanBuildState(env); },
    enforceWoodsmanBuildLock() { return runPart0.runEnforceWoodsmanBuildLock(env); },
    clearWoodsmanBuildLock() { return runPart0.runClearWoodsmanBuildLock(env); },
    holdZoneBoundRuns(say) { return runControlCommands(runPart1.runHoldZoneBoundRuns(env), { runLog: say, colonyLog: say === undefined ? addLog : say }); },
    sanitizeCombatRuntimeState() { return runPart2.runSanitizeCombatRuntimeState(env); },
    spawnColonyWave() { return runPart3.runSpawnColonyWave(env); },
    getColonyRoomRun() { return runPart4.runGetColonyRoomRun(env); },
    countColonyWaveAlive() { return runPart4.runCountColonyWaveAlive(env); },
    tickColonyRun(pStats) { return runControlCommands(runPart5.runTickColonyRun(env, pStats)); },
    failColonyDefense() { return runControlCommands(runPart5.runFailColonyDefense(env)); }
};
safeExposeGlobals(combatRuns);
// Retire this classic object when its UI/start-run consumers use the native run owner.
window.GameModules.colonyRun = Object.freeze({
    returnWave(colony) { return runPart6.runColonyReturnWave(colony); },
    uncollected() { return runPart6.runColonyUncollected(env); },
    toggleReturn() { return runControlCommands(runPart6.runColonyToggleReturn(env)); },
    recordEnd(kind) { return runPart6.runColonyRecordEnd(env, kind); },
    finish(kind, move, say = addLog) { return runControlCommands(runPart6.runColonyFinish(env, kind, move), { colonyLog: say }); },
    finishScheduled(run) { return runControlCommands(runPart6.runColonyFinishScheduled(env, run)); }
});

const state = createCombatRuntime(combatControls.createCombatTacticsRuntime());
window.GameModules.state.combat = state;
const clock = window.GameModules.state.session;
const participants = {
    get mobilitySkill() { return mobilitySkill; },
    get wispSummons() { return wispSummons; },
    get ascendancyNodeRules() { return ascendancyNodeRules; }
};
const captureCombatRuntime = () => captureCombatSnapshot(state, clock, participants);
const restoreCombatRuntime = snapshot => restoreCombatSnapshot(state, clock, participants, snapshot);
safeExposeGlobals({ captureCombatRuntime, restoreCombatRuntime });
