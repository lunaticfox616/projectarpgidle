import * as part0 from './combat/summon-growth.mjs';
import * as part1 from './combat/summon-runtime-stats.mjs';
import * as part2 from './combat/summon-damage-rules.mjs';
import * as part3 from './combat/summon-hit-roll.mjs';
import * as part4 from './combat/summon-hit-target.mjs';
import * as part5 from './combat/summon-ailments.mjs';
import * as part6 from './combat/summon-dps.mjs';
import * as part7 from './ui/summon-details.mjs';
import * as part8 from './combat/summon-lifecycle.mjs';
import * as part9 from './combat/summon-attacks.mjs';
import * as part10 from './combat/combat-cycle.mjs';
import { SUMMON_REGEN_PCT_PER_SEC, SUMMON_CURSE_SHRED_BY_ELEMENT } from './combat/summon-values.mjs';
// Retire this bridge when the bootstrap composes the combat owners and their consumers directly.
const deps = {
    get getTargetGemBonusSources() { return getTargetGemBonusSources; },
    get getGemSkyEnhanceGemLevelBonus() { return typeof getGemSkyEnhanceGemLevelBonus === 'undefined' ? undefined : getGemSkyEnhanceGemLevelBonus; },
    get SKILL_DB() { return typeof SKILL_DB === 'undefined' ? undefined : SKILL_DB; },
    get getSkillRuneBonusLevels() { return getSkillRuneBonusLevels; },
    get summonSupports() { return window.GameModules.combat.summonSupports; },
    get gemCoreForge() { return gemCoreForge; },
    get buildActiveSummonRuntimeDefs() { return buildActiveSummonRuntimeDefs; },
    get hasKeystone() { return hasKeystone; },
    get getPreciseTalentLevel() { return typeof getPreciseTalentLevel === 'undefined' ? undefined : getPreciseTalentLevel; },
    get TAGGED_DAMAGE_STAT_BY_TAG() { return TAGGED_DAMAGE_STAT_BY_TAG; },
    get wispSummons() { return wispSummons; },
    get getZone() { return getZone; },
    get ASCENDANCY_KEYSTONE_VALUES() { return ASCENDANCY_KEYSTONE_VALUES; },
    get getEnemyConditionDebuffFactor() { return getEnemyConditionDebuffFactor; },
    get loopMutation() { return loopMutation; },
    get getCombatTime() { return getCombatTime; },
    get _t() { return _t; },
    get getElementColor() { return getElementColor; },
    get resolveEntropyEvasion() { return resolveEntropyEvasion; },
    get getKeystoneEnemyTakenMultiplier() { return getKeystoneEnemyTakenMultiplier; },
    get getAbyssMonsterScales() { return getAbyssMonsterScales; },
    get getEffectiveEnemyMitigation() { return getEffectiveEnemyMitigation; },
    get applyEnemyAilmentFromHit() { return applyEnemyAilmentFromHit; },
    get combatSupports() { return window.GameModules.combat.supports; },
    get getDamageElementLabel() { return typeof getDamageElementLabel === 'undefined' ? undefined : getDamageElementLabel; },
    get getPlayerStats() { return typeof getPlayerStats === 'undefined' ? undefined : getPlayerStats; },
    get SUPPORT_GEM_DB() { return SUPPORT_GEM_DB; },
    get getSummonEvadeChance() { return getSummonEvadeChance; },
    get applyGrandlordGhostState() { return applyGrandlordGhostState; },
    get ensureCombatGridRuntime() { return ensureCombatGridRuntime; },
    get ascendancyNodeRules() { return ascendancyNodeRules; },
    get applyDamageToEnemyResource() { return applyDamageToEnemyResource; },
    get handleEnemyDeath() { return handleEnemyDeath; },
    get hasGridCell() { return hasGridCell; },
    get getGridUnitDistance() { return getGridUnitDistance; },
    get findNearestGridEnemy() { return findNearestGridEnemy; },
    get advanceGridUnitMovement() { return advanceGridUnitMovement; },
    get COMBAT_GRID_CONFIG() { return COMBAT_GRID_CONFIG; },
    get tickOceanOxygen() { return tickOceanOxygen; },
    get callOceanGuardianAtBoundary() { return callOceanGuardianAtBoundary; },
    get combatIncidents() { return combatIncidents; },
    get roomInvaders() { return roomInvaders; },
    get tickWoodsmanCurse() { return tickWoodsmanCurse; },
    get trackRecordBests() { return typeof trackRecordBests === 'undefined' ? undefined : trackRecordBests; },
    get enforceTalentCombatState() { return typeof enforceTalentCombatState === 'undefined' ? undefined : enforceTalentCombatState; },
    get getPlayerRecoveryHpCap() { return getPlayerRecoveryHpCap; },
    get refreshRealmDeathWard() { return refreshRealmDeathWard; },
    get cosmosRouteRuntime() { return cosmosRouteRuntime; },
    get actExplorationProgress() { return actExplorationProgress; },
    get sanitizeCombatRuntimeState() { return sanitizeCombatRuntimeState; },
    get reconcileMapProgressRuntimeState() { return reconcileMapProgressRuntimeState; },
    get advanceActExplorationDeparture() { return advanceActExplorationDeparture; },
    get applyTickConditions() { return applyTickConditions; },
    get stopTickBeforeCombat() { return stopTickBeforeCombat; },
    get recoverPlayerTick() { return recoverPlayerTick; },
    get advanceTravelTick() { return advanceTravelTick; },
    get syncCrowdPauseState() { return syncCrowdPauseState; },
    get pruneEnemyRuntimeOnSchedule() { return pruneEnemyRuntimeOnSchedule; },
    get beehiveHoldsTick() { return beehiveHoldsTick; },
    get tickZoneHazards() { return tickZoneHazards; },
    get isMapProgressHeld() { return isMapProgressHeld; },
    get advanceMapProgress() { return advanceMapProgress; },
    get trackProgressStall() { return trackProgressStall; },
    get updateCombatHazardEvasion() { return updateCombatHazardEvasion; },
    get handlePlayerDefeat() { return handlePlayerDefeat; },
    get runFightTick() { return runFightTick; },
    get settleLastEnemyAttacks() { return settleLastEnemyAttacks; },
    get playerStatCache() { return playerStatCache; },
    get finishEncounterRun() { return finishEncounterRun; }
};
const runtime = {
    get pTimer() { return window.GameModules.state.session.pTimer; },
    set pTimer(value) { window.GameModules.state.session.pTimer = value; },
    get trialHazardRuntime() { return window.GameModules.state.combat.trialHazardRuntime; }
};
const env = { get owner() { return game; }, runtime, deps };
const presentation = {
    get addBattleFx() { return addBattleFx; },
    get addEvasionCombatLog() { return addEvasionCombatLog; },
    presentSummonDps(rows, estimates, stats, count) { return part7.summonDescribeSummonDps(env, rows, estimates, stats, count); },
    disabledSummonDpsLine() { return _t('홀로서기 각인: 소환수 직접 공격 비활성화'); },
    holdRunsAtCycle() { return holdZoneBoundRuns(addLog); },
    callGuardianAddsAtCycle() { return callOceanGuardianAdds(addLog); },
    releaseWaveAtCycle() { return releaseExplorationWave(addLog); },
    releaseThirdRingAtCycle() { return releaseClosedThirdRing(addLog); },
    tickVoidRiftFromCycle(zone) {
        return tickVoidRiftWave(zone, { say: addLog, enterGrand: typeof autoEnterGrandBreachIfReady === 'function' ? autoEnterGrandBreachIfReady : () => false });
    }
};
// Run synchronously and resume with the effect's result before subsequent combat mutations.
function runSummonCommands(commands) {
    let step = commands.next();
    while (!step.done) {
        const command = step.value;
        step = commands.next(presentation[command.kind](...command.args));
    }
    return step.value;
}
const summonRuntime = {
    getRepresentativeSummonAttackPower(summonStats, evaluation) { return part0.summonGetRepresentativeSummonAttackPower(env, summonStats, evaluation); },
    getSummonEvasionRating(profile, gemLevel, pStats) { return part0.summonGetSummonEvasionRating(profile, gemLevel, pStats); },
    buildSummonRuntimeStats(row, pStats, now, gemLv) { return part1.summonBuildSummonRuntimeStats(env, row, pStats, now, gemLv); },
    getPassiveWisdomLeapDamageMultiplier(pStats, element) { return part2.summonGetPassiveWisdomLeapDamageMultiplier(pStats, element); },
    getPassiveChaosConversionShare(pStats, element) { return part2.summonGetPassiveChaosConversionShare(pStats, element); },
    getSummonAttackIntervalMs(pStats, summon) { return part2.summonGetSummonAttackIntervalMs(env, pStats, summon); },
    scaleSummonHit(hit, mul) { return part3.summonScaleSummonHit(hit, mul); },
    applySummonHitTargetScales(hit, ctx) { return runSummonCommands(part4.summonApplySummonHitTargetScales(env, hit, ctx)); },
    mutationHitScale(enemy, ele) { return runSummonCommands(part4.summonMutationHitScale(env, enemy, ele)); },
    dodgeSummonHitByEntropy(hit, target) { return runSummonCommands(part4.summonDodgeSummonHitByEntropy(env, hit, target)); },
    getSummonAilmentStats(pStats, element) { return part5.summonGetSummonAilmentStats(env, pStats, element); },
    applySummonAilmentFromHit(target, pStats, hitElement, hitDamage, isCrit) { return part5.summonApplySummonAilmentFromHit(env, target, pStats, { element: hitElement, damage: hitDamage, crit: isCrit, source: arguments[5] }); },
    estimateSummonDps(pStats, includeBreakdowns, evaluation) { return runSummonCommands(part6.summonEstimateSummonDps(env, pStats, includeBreakdowns, evaluation)); },
    getSummonTooltipPreview(gemName, pStats) { return part7.summonGetSummonTooltipPreview(env, gemName, pStats); },
    getSummonRedirectPct(pStats) { return part1.summonGetSummonRedirectPct(env, pStats); },
    ensureSummonRuntime(pStats) { return part8.summonEnsureSummonRuntime(env, pStats); },
    restoreAndRecallSummons(pStats) { return part8.summonRestoreAndRecallSummons(env, pStats); },
    resolveSummonHit(summon, pStats, target, canGrantCritStack, multiplier) { return runSummonCommands(part9.summonResolveSummonHit(env, summon, pStats, target, { canGrantCritStack, multiplier })); },
    runSummonAttackTick(pStats) { return runSummonCommands(part9.summonRunSummonAttackTick(env, pStats)); },
    markPlayerMovementCompleted() { return part10.cycleMarkPlayerMovementCompleted(env); },
    prepareCombatTick(nowMs) { return runSummonCommands(part10.cyclePrepareCombatTick(env, nowMs)); },
    isCombatDecisionPending(state) { return part10.cycleIsCombatDecisionPending(env, state); },
    sanitizeTickRuntime(pStats) { return part10.cycleSanitizeTickRuntime(env, pStats); },
    coreLoop(nowMs) { return runSummonCommands(part10.cycleCoreLoop(env, nowMs)); }
};
safeExposeGlobals(summonRuntime);
safeExposeGlobals({ SUMMON_REGEN_PCT_PER_SEC, SUMMON_CURSE_SHRED_BY_ELEMENT });
