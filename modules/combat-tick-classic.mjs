import * as tickPart0 from './combat/tick-conditions.mjs';
import * as tickPart1 from './combat/tick-travel.mjs';
import * as tickPart2 from './combat/tick-recovery.mjs';
import * as tickPart3 from './combat/tick-hazards.mjs';
import * as tickPart4 from './combat/tick-fight.mjs';
import * as tickPart5 from './combat/tick-rift.mjs';
import * as tickPart6 from './combat/skill-delivery-rules.mjs';
import * as tickPart7 from './combat/skill-contact-targets.mjs';
import * as tickPart8 from './combat/skill-travel-effects.mjs';
import * as tickPart9 from './combat/skill-attack-queue.mjs';
import * as tickPart10 from './combat/skill-stage-resolution.mjs';
import * as tickPart11 from './combat/tick-delayed-damage.mjs';
import * as tickPart12 from './combat/skill-unique-rules.mjs';

// Phase 6 replaces these late ports with the shared application runtime.
const deps = {
    get expireConditionEffects() { return expireConditionEffects; },
    get getCombatTime() { return getCombatTime; },
    get runReturnRules() { return runReturnRules; },
    get talismanCombat() { return talismanCombat; },
    get advanceSkillGemCasts() { return advanceSkillGemCasts; },
    get updateCombatChannelRuntime() { return updateCombatChannelRuntime; },
    get ascendancyNodeRules() { return ascendancyNodeRules; },
    get applyConditionPhysicalReductionEffects() { return applyConditionPhysicalReductionEffects; },
    get applyCosmosPlayerDebuffsToStats() { return applyCosmosPlayerDebuffsToStats; },
    get tickAilments() { return tickAilments; },
    get getPlayerShockTakenDamageIncreasePct() { return getPlayerShockTakenDamageIncreasePct; },
    get recordPassiveCycleAilmentEnd() { return typeof recordPassiveCycleAilmentEnd === 'undefined' ? undefined : recordPassiveCycleAilmentEnd; },
    get handlePlayerDefeat() { return handlePlayerDefeat; },
    get getZone() { return getZone; },
    get finishWoodsmanEntrance() { return finishWoodsmanEntrance; },
    get markPlayerMovementCompleted() { return markPlayerMovementCompleted; },
    get startEncounterRun() { return startEncounterRun; },
    get isBeehiveRunLockedForMapTravel() { return typeof isBeehiveRunLockedForMapTravel === 'undefined' ? undefined : isBeehiveRunLockedForMapTravel; },
    get isSkyTowerAtRewardLimit() { return isSkyTowerAtRewardLimit; },
    get finishTownReturnAction() { return finishTownReturnAction; },
    get pruneEnemyRuntimeDebuffMaps() { return pruneEnemyRuntimeDebuffMaps; },
    get getPlayerRecoveryHpCap() { return getPlayerRecoveryHpCap; },
    get applyActRestRecovery() { return applyActRestRecovery; },
    get tickPlayerLeech() { return tickPlayerLeech; },
    get tickPlayerRecoup() { return tickPlayerRecoup; },
    get getPlayerEnergyShieldRecoveryCap() { return getPlayerEnergyShieldRecoveryCap; },
    get hasKeystone() { return hasKeystone; },
    get tickEnemyDotEffects() { return tickEnemyDotEffects; },
    get tickEnemyAilments() { return tickEnemyAilments; },
    get getCombatChannelGate() { return getCombatChannelGate; },
    get getWalkingChargeScale() { return getWalkingChargeScale; },
    get performPlayerAttack() { return performPlayerAttack; },
    get combatTacticsRuntime() { return window.GameModules.state.combat.combatTacticsRuntime; },
    get getPlayerAttackRecoveryMs() { return getPlayerAttackRecoveryMs; },
    get mobilitySkill() { return mobilitySkill; },
    get actExplorationProgress() { return actExplorationProgress; },
    get runSummonAttackTick() { return runSummonAttackTick; },
    get performMonsterAttacks() { return performMonsterAttacks; },
    get updatePlayerGridEngagement() { return updatePlayerGridEngagement; },
    get random() { return Math.random; },
    get tickColonyRun() { return tickColonyRun; },
    get getUnderworldLifeDrainPerTick() { return getUnderworldLifeDrainPerTick; },
    get getSkyStoneReductionPct() { return getSkyStoneReductionPct; },
    get floorIncomingDamage() { return floorIncomingDamage; },
    get absorbDamageWithTalentStoneShield() { return absorbDamageWithTalentStoneShield; },
    get ensureEncounterRun() { return ensureEncounterRun; },
    get isVoidRiftCombatZone() { return isVoidRiftCombatZone; },
    get spawnVoidBreachReinforcement() { return spawnVoidBreachReinforcement; },
    get _t() { return _t; },
    get combatLootReceipts() { return combatLootReceipts; },
    get awardCurrency() { return awardCurrency; },
    get GRAND_BREACH_ENCOUNTER() { return GRAND_BREACH_ENCOUNTER; },
    get canQueueTutorialNotice() { return typeof queueTutorialNotice === 'function'; },
    get applyDamageToEnemyResource() { return applyDamageToEnemyResource; },
    get getElementColor() { return getElementColor; },
    get i18n() { return i18n; },
    get formatNumberKR() { return formatNumberKR; },
    get handleEnemyDeath() { return handleEnemyDeath; },
    get getPlayerStats() { return getPlayerStats; },
    get isTalentCardActive() { return typeof isTalentCardActive === 'undefined' ? undefined : isTalentCardActive; },
    get getAliveEnemyByRuntimeKey() { return getAliveEnemyByRuntimeKey; },
    get hasGridCell() { return hasGridCell; },
    get COMBAT_PROJECTILE_MIN_TRAVEL_MS() { return COMBAT_PROJECTILE_MIN_TRAVEL_MS; },
    get COMBAT_PROJECTILE_MS_PER_CELL() { return COMBAT_PROJECTILE_MS_PER_CELL; },
    get gridLineCells() { return gridLineCells; },
    get selectGridSkillTargets() { return selectGridSkillTargets; },
    get getGridSkillTargetMult() { return getGridSkillTargetMult; },
    get getGridUnitCells() { return getGridUnitCells; },
    get COMBAT_GRID_CONFIG() { return COMBAT_GRID_CONFIG; },
    get getGridWaveDrawnDistance() { return getGridWaveDrawnDistance; },
    get getGridUnitCenter() { return getGridUnitCenter; },
    get SKILL_HIT_SEQUENCE_CONFIG() { return SKILL_HIT_SEQUENCE_CONFIG; },
    get projectileShots() { return projectileShots; },
    get supports() { return window.GameModules.combat.supports; },
    get startSkillGemCombat() { return startSkillGemCombat; },
    get getCombatChannelCycleMs() { return getCombatChannelCycleMs; },
    get beginCombatChannel() { return beginCombatChannel; },
    get noteCombatTacticAttack() { return noteCombatTacticAttack; },
    get getSkillBandSide() { return getSkillBandSide; },
    get createContinuousChannelStages() { return createContinuousChannelStages; },
    get getSkillStageFootprint() { return getSkillStageFootprint; },
    get getGridUnitDistance() { return getGridUnitDistance; },
    get actExplorationState() { return actExplorationState; },
    get beginExplorationGridStep() { return beginExplorationGridStep; },
    get gridStepToward() { return gridStepToward; },
    get getGridBlockedCells() { return getGridBlockedCells; },
    get UNIQUE_DB() { return typeof UNIQUE_DB === 'undefined' ? undefined : UNIQUE_DB; }
};
const runtime = {
    get pTimer() { return window.GameModules.state.session.pTimer; },
    set pTimer(value) { window.GameModules.state.session.pTimer = value; },
    get progressStallTicks() { return window.GameModules.state.session.progressStallTicks; },
    set progressStallTicks(value) { window.GameModules.state.session.progressStallTicks = value; },
    get pendingSkillStageHits() { return window.GameModules.state.combat.pendingSkillStageHits; },
    set pendingSkillStageHits(value) { window.GameModules.state.combat.pendingSkillStageHits = value; },
    get nextPlayerDamageTextGroupId() { return window.GameModules.state.combat.nextPlayerDamageTextGroupId; },
    set nextPlayerDamageTextGroupId(value) { window.GameModules.state.combat.nextPlayerDamageTextGroupId = value; }
};
const env = { get owner() { return game; }, deps, runtime };
const presentation = {
    get addBattleFx() { return addBattleFx; },
    get addLog() { return addLog; },
    get queueTutorialNotice() { return queueTutorialNotice; }
};
// Presentation/reentry responses finish synchronously at each original effect boundary.
function runTickCommands(commands, ui) {
    let step = commands.next();
    while (!step.done) {
        const command = step.value;
        const receiver = command.kind === 'say' || command.kind === 'enterGrand' ? ui : presentation;
        const result = receiver[command.kind](...command.args);
        step = commands.next(result);
    }
    return step.value;
}
const combatTick = {
    applyTickConditions(pStats) { return runTickCommands(tickPart0.tickApplyTickConditions(env, pStats)); },
    stopTickBeforeCombat(pStats) { return tickPart1.tickStopTickBeforeCombat(env, pStats); },
    isCombatProgressStopped(zone) { return tickPart1.tickIsCombatProgressStopped(env, zone); },
    recoverPlayerTick(pStats) { return tickPart2.tickRecoverPlayerTick(env, pStats); },
    advanceTravelTick() { return tickPart1.tickAdvanceTravelTick(env); },
    pruneEnemyRuntimeOnSchedule() { return tickPart1.tickPruneEnemyRuntimeOnSchedule(env); },
    beehiveHoldsTick() { return tickPart1.tickBeehiveHoldsTick(env); },
    tickZoneHazards(zone, pStats) { return tickPart3.tickTickZoneHazards(env, zone, pStats); },
    trackProgressStall(progressBefore) { return tickPart3.tickTrackProgressStall(env, progressBefore); },
    runFightTick(pStats, hazardEvasion, walkedMs) { return tickPart4.tickRunFightTick(env, pStats, hazardEvasion, walkedMs); },
    tickVoidRiftWave(zone, ui) { return runTickCommands(tickPart5.tickTickVoidRiftWave(env, zone), ui); },
    copyCombatGridCell(unit) { return tickPart6.tickCopyCombatGridCell(env, unit); },
    getSkillCombatDelivery(skill) { return tickPart6.tickGetSkillCombatDelivery(skill); },
    getCombatTravelMs(sourceCell, targetCell, skill) { return tickPart6.tickGetCombatTravelMs(env, sourceCell, targetCell, skill); },
    pickWhirlSpinTargets(row) { return tickPart7.tickPickWhirlSpinTargets(env, row); },
    pickWaveFrontTargets(row) { return tickPart7.tickPickWaveFrontTargets(env, row); },
    getPendingSkillImpactTargets(row) { return tickPart7.tickGetPendingSkillImpactTargets(env, row); },
    addChainHopTravelFx(row, attackContext, now) { return runTickCommands(tickPart8.tickAddChainHopTravelFx(env, row, attackContext, now)); },
    queuePlayerAttackSequence(pStats, stages, context) { return runTickCommands(tickPart9.tickQueuePlayerAttackSequence(env, pStats, stages, context)); },
    queuePendingSkillStageHits(stages, pStats, attackContext) { return runTickCommands(tickPart9.tickQueuePendingSkillStageHits(env, stages, pStats, attackContext)); },
    advanceHeroForStage(row) { return tickPart10.tickAdvanceHeroForStage(env, row); },
    processPendingSkillStageHits() { return tickPart10.tickProcessPendingSkillStageHits(env); },
    processTalentInquisitorMarks() { return runTickCommands(tickPart11.tickProcessTalentInquisitorMarks(env)); },
    convertSkillDamageToChaos(skill) { return tickPart12.tickConvertSkillDamageToChaos(skill); },
    getUniqueEffectImplementationReport() { return tickPart12.tickGetUniqueEffectImplementationReport(env); },
    recordPlayerEvadeUniqueEffects(pStats, aliveEnemyCount, now) { return tickPart12.tickRecordPlayerEvadeUniqueEffects(env, pStats, aliveEnemyCount, now); }
};
safeExposeGlobals(combatTick);
