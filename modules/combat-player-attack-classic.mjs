import * as castPart0 from './combat/player-hit-modifiers.mjs';
import * as castPart1 from './combat/player-cast-effects.mjs';
import * as castPart2 from './combat/player-cast-runtime.mjs';
import * as castPart3 from './combat/player-cast-controls.mjs';
import * as castPart4 from './combat/player-defeat-progress.mjs';
import * as castPart5 from './combat/player-attack-execution.mjs';
import { castIsEnemyPetrified, TIME_SLOW_MOVE } from './combat/player-cast-controls.mjs';
import { createPlayerAttackResolver } from './domain/player-attack.mjs';

// Temporary classic dependencies. Remove with combat consumers and the native application entry.
const resolver = createPlayerAttackResolver({
    get getAttackProjectileShots() { return getAttackProjectileShots; },
    get isTalentPlayerAttackDisabled() { return typeof isTalentPlayerAttackDisabled === 'undefined' ? undefined : isTalentPlayerAttackDisabled; },
    get consumeCombatChannelContinuation() { return consumeCombatChannelContinuation; },
    get getCombatTime() { return getCombatTime; },
    get applyDamageToEnemyResource() { return applyDamageToEnemyResource; },
    get prepareTalentPlayerAttackContext() { return prepareTalentPlayerAttackContext; },
    get isTalentCardActive() { return typeof isTalentCardActive === 'undefined' ? undefined : isTalentCardActive; },
    get getAttackTargets() { return getAttackTargets; },
    get beginPassiveKarmaAttack() { return typeof beginPassiveKarmaAttack === 'undefined' ? undefined : beginPassiveKarmaAttack; },
    get consumeLoneEvasionCounterMultiplier() { return consumeLoneEvasionCounterMultiplier; },
    get beginSkillMobility() { return beginSkillMobility; },
    get getTalentMoonReturnConfig() { return typeof getTalentMoonReturnConfig === 'undefined' ? undefined : getTalentMoonReturnConfig; },
    get buildSkillHitSequence() { return typeof buildSkillHitSequence === 'undefined' ? undefined : buildSkillHitSequence; },
    get recordPassiveFanaticSkillUse() { return typeof recordPassiveFanaticSkillUse === 'undefined' ? undefined : recordPassiveFanaticSkillUse; },
    get hasKeystone() { return hasKeystone; },
    get rollTalentPlayerCrit() { return typeof rollTalentPlayerCrit === 'undefined' ? undefined : rollTalentPlayerCrit; },
    get talentOnPlayerAttack() { return typeof talentOnPlayerAttack === 'undefined' ? undefined : talentOnPlayerAttack; },
    get getElementalistOverloadStacks() { return getElementalistOverloadStacks; },
    get recordElementalistOverloadAttack() { return recordElementalistOverloadAttack; },
    get ASCENDANCY_KEYSTONE_VALUES() { return ASCENDANCY_KEYSTONE_VALUES; },
    get getTalentDamageConversion() { return typeof getTalentDamageConversion === 'undefined' ? undefined : getTalentDamageConversion; },
    get getTalentPlayerAttackDamageMultiplier() { return getTalentPlayerAttackDamageMultiplier; },
    get queuePlayerAttackSequence() { return queuePlayerAttackSequence; },
    get getZone() { return getZone; },
    get talismanCombat() { return talismanCombat; },
    get getEnemyConditionDebuffFactor() { return getEnemyConditionDebuffFactor; },
    get addBattleFx() { return addBattleFx; },
    get getEffectiveEnemyMitigation() { return getEffectiveEnemyMitigation; },
    get mutationHitScale() { return mutationHitScale; },
    get maybeUnlockChaosRealmFromWoodsman() { return maybeUnlockChaosRealmFromWoodsman; },
    get notePlayerHitSummary() { return notePlayerHitSummary; },
    get getElementColor() { return getElementColor; },
    get applyEnemyAilmentFromHit() { return applyEnemyAilmentFromHit; },
    get transferPassiveChaosErosionToTarget() { return transferPassiveChaosErosionToTarget; },
    get getHitEnemyResistance() { return getHitEnemyResistance; },
    get ascendancyNodeRules() { return ascendancyNodeRules; },
    get getPassiveChaosConversionShare() { return getPassiveChaosConversionShare; },
    get getPreciseTalentRatio() { return typeof getPreciseTalentRatio === 'undefined' ? undefined : getPreciseTalentRatio; },
    get getTalentCritDamageMultiplier() { return typeof getTalentCritDamageMultiplier === 'undefined' ? undefined : getTalentCritDamageMultiplier; },
    get getGemCritHitPerkMul() { return getGemCritHitPerkMul; },
    get applyAilingTargetDamage() { return applyAilingTargetDamage; },
    get getTalentPrecisePlayerHitMultiplier() { return typeof getTalentPrecisePlayerHitMultiplier === 'undefined' ? undefined : getTalentPrecisePlayerHitMultiplier; },
    get getTalentButcherBossMultiplier() { return typeof getTalentButcherBossMultiplier === 'undefined' ? undefined : getTalentButcherBossMultiplier; },
    get getPassiveKeystoneHitMultiplier() { return getPassiveKeystoneHitMultiplier; },
    get getSkillRepeatDamageMultiplier() { return getSkillRepeatDamageMultiplier; },
    get getSkillConditionalDamageMultiplier() { return getSkillConditionalDamageMultiplier; },
    get getEnemyTotalEvadeChance() { return getEnemyTotalEvadeChance; },
    get getTalentAlwaysHit() { return typeof getTalentAlwaysHit === 'undefined' ? undefined : getTalentAlwaysHit; },
    get resolveEntropyEvasion() { return resolveEntropyEvasion; },
    get _t() { return _t; },
    get addEvasionCombatLog() { return addEvasionCombatLog; },
    get getPassiveWisdomLeapDamageMultiplier() { return getPassiveWisdomLeapDamageMultiplier; },
    get loopMutation() { return loopMutation; },
    get getActiveEnemyShockTakenDamageIncreasePct() { return getActiveEnemyShockTakenDamageIncreasePct; },
    get getShockedEnemyHitDamageIncreaseMultiplier() { return getShockedEnemyHitDamageIncreaseMultiplier; },
    get getKeystoneEnemyTakenMultiplier() { return getKeystoneEnemyTakenMultiplier; },
    get getAbyssMonsterScales() { return getAbyssMonsterScales; },
    get getGridDirectHitDistanceMultiplier() { return getGridDirectHitDistanceMultiplier; },
    get handleEnemyDeath() { return handleEnemyDeath; },
    get getEnemyLifeAndShield() { return getEnemyLifeAndShield; },
    get getTalentDotOccupancyDamage() { return typeof getTalentDotOccupancyDamage === 'undefined' ? undefined : getTalentDotOccupancyDamage; },
    get getRangerWeakpointBonus() { return getRangerWeakpointBonus; },
    get getCombatTalentCardLevel() { return getCombatTalentCardLevel; },
    get updateTalentButcherHitMark() { return updateTalentButcherHitMark; },
    get canApplyTalentExecuteThreshold() { return canApplyTalentExecuteThreshold; },
    get addPlayerHitVisualFx() { return addPlayerHitVisualFx; },
    get applySkillDotFromHit() { return applySkillDotFromHit; },
    get getAilmentTypeFromElement() { return getAilmentTypeFromElement; },
    get getSkillAilmentStats() { return getSkillAilmentStats; },
    get regionAffixEffects() { return regionAffixEffects; },
    get spreadSkillAilmentOnHit() { return spreadSkillAilmentOnHit; },
    get applySkillPeriodicOnHit() { return applySkillPeriodicOnHit; },
    get applySkillGridControlOnHit() { return applySkillGridControlOnHit; },
    get applySupportEchoOnHit() { return applySupportEchoOnHit; },
    get applySupportChaosErosionOnHit() { return applySupportChaosErosionOnHit; },
    get applyCosmosJudgmentOnHit() { return applyCosmosJudgmentOnHit; },
    get applyPlayerHitLeech() { return applyPlayerHitLeech; },
    get getPlayerEnergyShieldRecoveryCap() { return getPlayerEnergyShieldRecoveryCap; },
    get advanceEnergyShieldRechargeOnCrit() { return advanceEnergyShieldRechargeOnCrit; },
    get getPlayerHitCombatLog() { return getPlayerHitCombatLog; },
    get supports() { return window.GameModules.combat.supports; },
    random: () => Math.random()
});

// The session variable is still shared by replay and the mobility slot. Phase 6 owns its replacement.
const deps = {
    get getGridUnitDistance() { return getGridUnitDistance; },
    get hasGridCell() { return hasGridCell; },
    get getGridUnitCenter() { return getGridUnitCenter; },
    get getElementColor() { return getElementColor; },
    get copyCombatGridCell() { return copyCombatGridCell; },
    get skillGemCasts() { return skillGemCasts; },
    get getCombatTime() { return getCombatTime; },
    get noteCombatTacticAttack() { return noteCombatTacticAttack; },
    get hasPlayerChannelBreakingAilment() { return hasPlayerChannelBreakingAilment; },
    get rollProjectileExtraShots() { return rollProjectileExtraShots; },
    get cancelCombatChannel() { return cancelCombatChannel; },
    get getSplashDormantEnemies() { return getSplashDormantEnemies; },
    get supports() { return window.GameModules.combat.supports; },
    get mobilitySkill() { return mobilitySkill; },
    get canPushEnemy() { return canPushEnemy; },
    get gridStepToward() { return gridStepToward; },
    get getGridBlockedCells() { return getGridBlockedCells; },
    get actExplorationMotion() { return actExplorationMotion; },
    get actExplorationProgress() { return actExplorationProgress; },
    get actExplorationState() { return actExplorationState; },
    get getEffectiveEnemyMitigation() { return getEffectiveEnemyMitigation; },
    get getZone() { return getZone; },
    get applyDamageToEnemyResource() { return applyDamageToEnemyResource; },
    get loopMutation() { return loopMutation; },
    get handleEnemyDeath() { return handleEnemyDeath; },
    get PROJECTILE_BONUS_SHOT_DAMAGE_PCT() { return PROJECTILE_BONUS_SHOT_DAMAGE_PCT; },
    get applyEnemyAilmentFromHit() { return applyEnemyAilmentFromHit; },
    get cosmosRouteRuntime() { return cosmosRouteRuntime; },
    get resetHiddenJournalBossRun() { return resetHiddenJournalBossRun; },
    get getEncounterTelemetryContext() { return getEncounterTelemetryContext; },
    get CAMPAIGN_RESIST_PENALTY() { return CAMPAIGN_RESIST_PENALTY; },
    get performTalentMoonReturn() { return performTalentMoonReturn; }
};
const env = {
    get owner() { return game; }, deps, resolver,
    get nativeCasts() { return window.GameModules.state.combat.skillGemCombatRuntime; },
    set nativeCasts(value) { window.GameModules.state.combat.skillGemCombatRuntime = value; }
};
// Presentation is bound only at the application boundary; native combat emits ordered commands.
// Remove this classic binding with the final application entry, like encounter presentation.
const presentation = {
    get addBattleFx() { return addBattleFx; },
    get addLog() { return addLog; },
    get dispatchRuntimeEvent() { return dispatchRuntimeEvent; }
};
// Drain at each yielded boundary, before resuming damage/death/movement commands.
function runPlayerCastEffects(commands) {
    for (const command of commands) {
        presentation[command.kind](...command.args);
    }
}
const playerCastRuntime = {
    scaleKeystoneAttackSpeed(aspd, flags) { return castPart0.castScaleKeystoneAttackSpeed(aspd, flags); },
    addThousandBottlesStats(bucket) { return castPart0.castAddThousandBottlesStats(bucket); },
    getPassiveKeystoneHitMultiplier(pStats, target, hitIndex, targetIndex, skillName) { return castPart0.castGetPassiveKeystoneHitMultiplier(env, pStats, target, { hitIndex, targetIndex, skillName }); },
    addPlayerHitVisualFx(pStats, options, targetEnemy, hit) { return runPlayerCastEffects(castPart1.castAddPlayerHitVisualFx(env, pStats, options, targetEnemy, hit)); },
    startSkillGemCombat(stats, options) { return runPlayerCastEffects(castPart2.castStartSkillGemCombat(env, stats, options)); },
    noteNativeGemSwing(name, stats) { return runPlayerCastEffects(castPart1.castNoteNativeGemSwing(env, name, stats)); },
    shouldDeferNativeGemCast(stats, options) { return castPart2.castShouldDeferNativeGemCast(env, stats, options); },
    getAttackProjectileShots(stats) { return castPart2.castGetAttackProjectileShots(env, stats); },
    updateSkillGemCombat(stats) { return runPlayerCastEffects(castPart2.castUpdateSkillGemCombat(env, stats)); },
    advanceSkillGemCasts(stats) { return runPlayerCastEffects(castPart2.castAdvanceSkillGemCasts(env, stats)); },
    skillGemRuntimeChanged(name) { return castPart2.castSkillGemRuntimeChanged(env, name); },
    petrifyEnemy(enemy, at, seconds) { return castPart3.castPetrifyEnemy(enemy, at, seconds); },
    enemyTimeSlowed(enemy) { return castPart3.castEnemyTimeSlowed(env, enemy); },
    pullEnemyToward(enemy, command) { return castPart3.castPullEnemyToward(env, enemy, command); },
    getDefeatRecoveryZoneId() { return castPart4.castGetDefeatRecoveryZoneId(env); },
    recordPlayerDefeatStart(zone, options) { return runPlayerCastEffects(castPart4.castRecordPlayerDefeatStart(env, zone, options)); },
    retreatAfterActDefeat(zone) { return castPart4.castRetreatAfterActDefeat(env, zone); },
    getCampaignResistPenalty(maxZoneId) { return castPart4.castGetCampaignResistPenalty(env, maxZoneId); },
    performPlayerAttack(pStats, attackOptions) { return runPlayerCastEffects(castPart5.castPerformPlayerAttack(env, pStats, attackOptions)); }
};
safeExposeGlobals({
    scaleKeystoneAttackSpeed: playerCastRuntime.scaleKeystoneAttackSpeed,
    addThousandBottlesStats: playerCastRuntime.addThousandBottlesStats,
    getPassiveKeystoneHitMultiplier: playerCastRuntime.getPassiveKeystoneHitMultiplier,
    addPlayerHitVisualFx: playerCastRuntime.addPlayerHitVisualFx,
    startSkillGemCombat: playerCastRuntime.startSkillGemCombat,
    noteNativeGemSwing: playerCastRuntime.noteNativeGemSwing,
    shouldDeferNativeGemCast: playerCastRuntime.shouldDeferNativeGemCast,
    getAttackProjectileShots: playerCastRuntime.getAttackProjectileShots,
    updateSkillGemCombat: playerCastRuntime.updateSkillGemCombat,
    advanceSkillGemCasts: playerCastRuntime.advanceSkillGemCasts,
    skillGemRuntimeChanged: playerCastRuntime.skillGemRuntimeChanged,
    petrifyEnemy: playerCastRuntime.petrifyEnemy,
    enemyTimeSlowed: playerCastRuntime.enemyTimeSlowed,
    pullEnemyToward: playerCastRuntime.pullEnemyToward,
    getDefeatRecoveryZoneId: playerCastRuntime.getDefeatRecoveryZoneId,
    recordPlayerDefeatStart: playerCastRuntime.recordPlayerDefeatStart,
    retreatAfterActDefeat: playerCastRuntime.retreatAfterActDefeat,
    getCampaignResistPenalty: playerCastRuntime.getCampaignResistPenalty,
    performPlayerAttack: playerCastRuntime.performPlayerAttack,
    isEnemyPetrified: castIsEnemyPetrified, TIME_SLOW_MOVE
});
