import { createCombatDefeat } from './domain/combat-defeat.mjs';
import { consumeDomainCommands } from './common/consume-commands.mjs';
import { createEnemyEngagement } from './domain/enemy-engagement.mjs';
import { createCombatHazards } from './domain/combat-hazards.mjs';
import { createEnemyFlights } from './domain/enemy-flights.mjs';
import { createMonsterAttackResolver } from './domain/enemy-attack.mjs';
import { createIncomingMitigation } from './domain/incoming-mitigation.mjs';
import { createPlayerAilments } from './domain/player-ailments.mjs';
export const mitigation = createIncomingMitigation({
    get ENEMY_CRITICAL_DAMAGE_MULTIPLIER() { return ENEMY_CRITICAL_DAMAGE_MULTIPLIER; },
    get clampNumber() { return clampNumber; },
    get hasKeystone() { return hasKeystone; },
    get MIN_PENETRATED_RESISTANCE() { return MIN_PENETRATED_RESISTANCE; },
    get getArmorPhysicalReductionPct() { return getArmorPhysicalReductionPct; },
});
export const ailments = createPlayerAilments({
    get clampNumber() { return clampNumber; },
    random: () => Math.random(),
    get isDamageAilmentType() { return isDamageAilmentType; },
    get getDamageAilmentScore() { return getDamageAilmentScore; },
    get getStoredAilmentHitDamage() { return getStoredAilmentHitDamage; },
    get recordPassiveCycleAilmentStart() { return typeof recordPassiveCycleAilmentStart === 'undefined' ? undefined : recordPassiveCycleAilmentStart; },
    get getCombatTime() { return getCombatTime; },
    get getAilmentDisplayLabel() { return getAilmentDisplayLabel; },
    get recordIncomingDamage() { return recordIncomingDamage; },
    get getPlayerDamageAilmentDps() { return getPlayerDamageAilmentDps; },
    get getWoodsmanCurseDamageTakenMul() { return getWoodsmanCurseDamageTakenMul; },
    get floorIncomingDamage() { return floorIncomingDamage; },
    get absorbDamageWithTalentStoneShield() { return absorbDamageWithTalentStoneShield; },
    get absorbDamageWithRealmDeathWard() { return absorbDamageWithRealmDeathWard; },
    get trackHiddenJournalPlayerDamage() { return trackHiddenJournalPlayerDamage; },
    get getPlayerRecoveryHpCap() { return getPlayerRecoveryHpCap; },
    get recordPassiveCycleAilmentEnd() { return typeof recordPassiveCycleAilmentEnd === 'undefined' ? undefined : recordPassiveCycleAilmentEnd; },
});
export const flights = createEnemyFlights({
    get enemyAttackRules() { return enemyAttackRules; },
    get copyCombatGridCell() { return copyCombatGridCell; },
    get getCombatTime() { return getCombatTime; },
    get BOSS_ATTACK_IMPACT_DELAY_MS() { return BOSS_ATTACK_IMPACT_DELAY_MS; },
    get getCombatTravelMs() { return getCombatTravelMs; },
    get woodsmanAttackFxElement() { return woodsmanAttackFxElement; },
    get pendingEnemyCombatAttacks() { return window.GameModules.state.combat.pendingEnemyCombatAttacks; },
    get bossMoves() { return bossMoves; },
    get addBattleFx() { return addBattleFx; },
    get getBossStageActor() { return getBossStageActor; },
    get battleFx() { return battleFx; },
    get woodsmanStumps() { return woodsmanStumps; },
    get woodsmanBattle() { return woodsmanBattle; },
});
export const defeat = createCombatDefeat({
    get OCEAN_ZONE_ID() { return OCEAN_ZONE_ID; },
    get isAutoOceanDive() { return isAutoOceanDive; },
    get ensureOceanState() { return ensureOceanState; },
    get getDefeatRecoveryZoneId() { return getDefeatRecoveryZoneId; },
    get CAMPAIGN_RESIST_PENALTY() { return CAMPAIGN_RESIST_PENALTY; },
    get getCampaignResistPenalty() { return getCampaignResistPenalty; },
    get _t() { return _t; },
    get queueTutorialNotice() { return queueTutorialNotice; },
    get ACT_RETREAT_LEVELS() { return ACT_RETREAT_LEVELS; },
    get getZone() { return getZone; },
    get ACT_REST_RECOVERY_PCT_PER_SEC() { return ACT_REST_RECOVERY_PCT_PER_SEC; },
    get actExplorationProgress() { return actExplorationProgress; },
    get recordPlayerDefeatStart() { return recordPlayerDefeatStart; },
    get recordImmortalHeroDeathPenalty() { return typeof recordImmortalHeroDeathPenalty === 'undefined' ? undefined : recordImmortalHeroDeathPenalty; },
    get addLog() { return addLog; },
    get exitBeehiveRun() { return typeof exitBeehiveRun === 'undefined' ? undefined : exitBeehiveRun; },
    get withDirectionParticle() { return withDirectionParticle; },
    get getPlayerHpCap() { return getPlayerHpCap; },
    get atlasRun() { return atlasRun; },
    get startMoving() { return startMoving; },
    get updateStaticUI() { return updateStaticUI; },
    get queueImportantSave() { return queueImportantSave; },
    get OUTSIDE_CHAOS_ZONE_ID() { return OUTSIDE_CHAOS_ZONE_ID; },
    get forceSurfaceOcean() { return forceSurfaceOcean; },
    get actExplorationState() { return actExplorationState; },
    get addWoodsmanPendingScore() { return addWoodsmanPendingScore; },
    get maybeUnlockChaosRealmFromWoodsman() { return maybeUnlockChaosRealmFromWoodsman; },
    get clearWoodsmanBuildLock() { return clearWoodsmanBuildLock; },
    get colonyRun() { return window.GameModules.colonyRun; },
    get abandonBeyondBoundaryRun() { return abandonBeyondBoundaryRun; },
    get ensureMeteorSiteState() { return ensureMeteorSiteState; },
    get ensureTimeRiftState() { return ensureTimeRiftState; },
    get getExpReq() { return getExpReq; },
    get buildDeathDamageSummary() { return buildDeathDamageSummary; },
    get normalizeDamageElementKey() { return normalizeDamageElementKey; },
    get getCombatTime() { return getCombatTime; },
    get DEATH_REASON_TEXT() { return DEATH_REASON_TEXT; },
    get buildDeathMonsterSummary() { return buildDeathMonsterSummary; },
    get snapshotPlayerAilmentsForDeathLog() { return snapshotPlayerAilmentsForDeathLog; },
    get retreatAfterActDefeat() { return retreatAfterActDefeat; },
    get takeDeathFightSummary() { return takeDeathFightSummary; },
});
export const engagement = createEnemyEngagement({
    lose,
    get getColonyRoomRun() { return getColonyRoomRun; },
    get actExplorationMap() { return actExplorationMap; },
    get getGridUnitDistance() { return getGridUnitDistance; },
    get hasGridCell() { return hasGridCell; },
    get COMBAT_GRID_CONFIG() { return COMBAT_GRID_CONFIG; },
    get enemyAttackRules() { return enemyAttackRules; },
    get getBossPatternPreview() { return getBossPatternPreview; },
    get BOSS_REACH() { return BOSS_REACH; },
    get woodsmanBattle() { return woodsmanBattle; },
    get enemyAmbush() { return enemyAmbush; },
    get getGridUnitStepSec() { return getGridUnitStepSec; },
    get advanceGridUnitMovement() { return advanceGridUnitMovement; },
    get getCombatTime() { return getCombatTime; },
    get getSummonEvadeChance() { return getSummonEvadeChance; },
    get resolveEntropyEvasion() { return resolveEntropyEvasion; },
    get addBattleFx() { return addBattleFx; },
    get failColonyDefense() { return failColonyDefense; },
    get getMonsterLoopGrowthScale() { return getMonsterLoopGrowthScale; },
    get getUnderworldEnemyDamageMultiplier() { return getUnderworldEnemyDamageMultiplier; },
    get getMonsterLoopPowerScale() { return getMonsterLoopPowerScale; },
    get pendingEnemyCombatAttacks() { return window.GameModules.state.combat.pendingEnemyCombatAttacks; },
    get getPlayerEnergyShieldRecoveryCap() { return getPlayerEnergyShieldRecoveryCap; },
    get applyDamageToEnemyResource() { return applyDamageToEnemyResource; },
    get getElementColor() { return getElementColor; },
    get handleEnemyDeath() { return handleEnemyDeath; },
    get recordIncomingDamage() { return recordIncomingDamage; },
});
export const hazards = createCombatHazards({
    lose,
    ailments,
    get trialHazardRuntime() { return window.GameModules.state.combat.trialHazardRuntime; },
    set trialHazardRuntime(value) { window.GameModules.state.combat.trialHazardRuntime = value; },
    get getArmorPhysicalReductionPct() { return getArmorPhysicalReductionPct; },
    get getCombatGridSize() { return getCombatGridSize; },
    get getTrialHazardProfile() { return getTrialHazardProfile; },
    get gridCellKey() { return gridCellKey; },
    get isGridCellInBounds() { return isGridCellInBounds; },
    get getGridPlacementTerrain() { return getGridPlacementTerrain; },
    get canPlaceGridFootprint() { return canPlaceGridFootprint; },
    get addBattleFx() { return addBattleFx; },
    get COMBAT_GRID_CONFIG() { return COMBAT_GRID_CONFIG; },
    get hasGridCell() { return hasGridCell; },
    get getCombatTime() { return getCombatTime; },
    get hasPlayerChannelBreakingAilment() { return hasPlayerChannelBreakingAilment; },
    get isPlayerAttackRecovering() { return isPlayerAttackRecovering; },
    get advanceGridHazardEscape() { return advanceGridHazardEscape; },
    get cancelCombatChannel() { return cancelCombatChannel; },
    get getTacticalMoveAttackDelayMs() { return getTacticalMoveAttackDelayMs; },
    get combatTacticsRuntime() { return window.GameModules.state.combat.combatTacticsRuntime; },
    get isGridUnitInCellSet() { return isGridUnitInCellSet; },
    get getBossWarningCells() { return getBossWarningCells; },
    get pendingEnemyCombatAttacks() { return window.GameModules.state.combat.pendingEnemyCombatAttacks; },
    get floorIncomingDamage() { return floorIncomingDamage; },
    get triggerUniqueEnergyShieldBreakRecharge() { return triggerUniqueEnergyShieldBreakRecharge; },
    get absorbDamageWithTalentStoneShield() { return absorbDamageWithTalentStoneShield; },
    get absorbDamageWithRealmDeathWard() { return absorbDamageWithRealmDeathWard; },
    get recordIncomingDamage() { return recordIncomingDamage; },
    get addLog() { return addLog; },
    get _t() { return _t; },
    get dispatchRuntimeEvent() { return dispatchRuntimeEvent; },
    get clampNumber() { return clampNumber; },
    get getPlayerShockTakenDamageIncreasePct() { return getPlayerShockTakenDamageIncreasePct; },
    get getZone() { return getZone; },
});
export function lose(owner, zone, stats, message, options) {
    /*! @dev-only */ if (combatTestImmortal) { owner.playerHp = getPlayerHpCap(stats || getPlayerStats()); return; } /*! @end-dev-only */
    return consumeDomainCommands(defeat.handlePlayerDefeat(owner, zone, stats, message, options), defeatEffects);
}
const defeatEffects = { requestDeathReport: log => window.GameModules.playFeedback.death.request(log) };
// Remove with the remaining combat consumers and native application bootstrap.
const resolver=createMonsterAttackResolver({
    ...mitigation,
    flights,
    ailments,
    engagement,
    lose,
    get getZone() { return getZone; },
    get getAbyssMonsterScales() { return getAbyssMonsterScales; },
    get woodsmanBattle() { return woodsmanBattle; },
    get getCombatTime() { return getCombatTime; },
    get actExplorationState() { return actExplorationState; },
    get enemyAttackRules() { return enemyAttackRules; },
    get applyEnemyRegen() { return applyEnemyRegen; },
    get getSoftenedLoopDepth() { return getSoftenedLoopDepth; },
    get getLoopDifficultyInputs() { return getLoopDifficultyInputs; },
    get clampNumber() { return clampNumber; },
    get getConditionDebuffDelta() { return getConditionDebuffDelta; },
    get ascendancyNodeRules() { return ascendancyNodeRules; },
    get pendingEnemyCombatAttacks() { return window.GameModules.state.combat.pendingEnemyCombatAttacks; },
    get strikeRescueTarget() { return strikeRescueTarget; },
    get bossMoves() { return bossMoves; },
    get enemyTimeSlowed() { return enemyTimeSlowed; },
    get TIME_SLOW_MOVE() { return TIME_SLOW_MOVE; },
    get getDifficultyBenchmarkProfile() { return getDifficultyBenchmarkProfile; },
    get refreshBossPatternPreview() { return typeof refreshBossPatternPreview === 'undefined' ? undefined : refreshBossPatternPreview; },
    get updateBossPatternTelegraph() { return updateBossPatternTelegraph; },
    get consumeBossPatternAttack() { return typeof consumeBossPatternAttack === 'undefined' ? undefined : consumeBossPatternAttack; },
    get applyCosmosBossAttackSetup() { return applyCosmosBossAttackSetup; },
    get applyCosmosBossPlayerDebuff() { return applyCosmosBossPlayerDebuff; },
    get applyCosmosAstraStance() { return applyCosmosAstraStance; },
    get rndChoice() { return rndChoice; },
    get addLog() { return addLog; },
    get _t() { return _t; },
    get skillGemCombatRuntime() { return window.GameModules.state.combat.skillGemCombatRuntime; },
    get skillGemCasts() { return skillGemCasts; },
    get getEntryBossTuning() { return getEntryBossTuning; },
    get addBattleFx() { return addBattleFx; },
    get loopMutation() { return loopMutation; },
    get getArmorPhysicalReductionPct() { return getArmorPhysicalReductionPct; },
    get applyPassiveAshuraDamageBreakdown() { return typeof applyPassiveAshuraDamageBreakdown === 'undefined' ? undefined : applyPassiveAshuraDamageBreakdown; },
    get getGridDirectHitDistanceMultiplier() { return getGridDirectHitDistanceMultiplier; },
    get normalizeDamageElementKey() { return normalizeDamageElementKey; },
    get getWoodsmanCurseDamageTakenMul() { return getWoodsmanCurseDamageTakenMul; },
    get hasKeystone() { return hasKeystone; },
    get applySituationalTakenReduction() { return applySituationalTakenReduction; },
    get isTalentMonsterAlwaysHit() { return typeof isTalentMonsterAlwaysHit === 'undefined' ? undefined : isTalentMonsterAlwaysHit; },
    get resolveEntropyEvasion() { return resolveEntropyEvasion; },
    get addEvasionCombatLog() { return addEvasionCombatLog; },
    get recordPlayerEvadeUniqueEffects() { return recordPlayerEvadeUniqueEffects; },
    get repelMeleeAttacker() { return repelMeleeAttacker; },
    get recoverEnergyShieldOnBlock() { return recoverEnergyShieldOnBlock; },
    get regionAffixEffects() { return regionAffixEffects; },
    get grantTalentStoneShieldOnBlock() { return grantTalentStoneShieldOnBlock; },
    get floorIncomingDamage() { return floorIncomingDamage; },
    get getPassiveAshuraAilmentChance() { return typeof getPassiveAshuraAilmentChance === 'undefined' ? undefined : getPassiveAshuraAilmentChance; },
    get isDamageAilmentType() { return isDamageAilmentType; },
    get grantWarriorRageOnHit() { return grantWarriorRageOnHit; },
    get getPreciseTalentRatio() { return typeof getPreciseTalentRatio === 'undefined' ? undefined : getPreciseTalentRatio; },
    get getPreciseTalentLevel() { return getPreciseTalentLevel; },
    get getPlayerRecoveryHpCap() { return getPlayerRecoveryHpCap; },
    get getSummonRedirectPct() { return getSummonRedirectPct; },
    get getSummonEvadeChance() { return getSummonEvadeChance; },
    get triggerUniqueEnergyShieldBreakRecharge() { return triggerUniqueEnergyShieldBreakRecharge; },
    get absorbDamageWithTalentStoneShield() { return absorbDamageWithTalentStoneShield; },
    get absorbDamageWithRealmDeathWard() { return absorbDamageWithRealmDeathWard; },
    get recordPassiveKarmaLoss() { return typeof recordPassiveKarmaLoss === 'undefined' ? undefined : recordPassiveKarmaLoss; },
    get trackHiddenJournalPlayerDamage() { return trackHiddenJournalPlayerDamage; },
    get addPlayerRecoupInstance() { return addPlayerRecoupInstance; },
    get recordIncomingDamage() { return recordIncomingDamage; },
    get getElementColor() { return getElementColor; },
    get getPlayerHpCap() { return getPlayerHpCap; },
    get getDamageElementIcon() { return getDamageElementIcon; },
    get formatNumberKR() { return formatNumberKR; },
    get getDamageElementLabel() { return getDamageElementLabel; },
    random:()=>Math.random()
});
export const resolve=(owner,stats)=>resolver.resolve(owner,stats);

// Old public names are retained for the remaining classic callers, without a nested runtime fragment.
function noteCampaignResistPenalty(zoneId) { return defeat.noteCampaignResistPenalty(game, zoneId); }
function holdActRetreat(zone) { return defeat.holdActRetreat(game, zone); }
function applyActRestRecovery(pStats, hpCap) { return defeat.applyActRestRecovery(game, pStats, hpCap); }
function handlePlayerDefeat(zone, pStats, message, options) { return lose(game, zone, pStats, message, options); }
function holdAfterDefeat() { return defeat.holdAfterDefeat(game); }
function defeatInOceanDive(zone, message, opts, ui) { return defeat.defeatInOceanDive(game, zone, message, opts, ui); }
function clearDefeatedEncounter() { return defeat.clearDefeatedEncounter(game); }
function defeatInGrandBreach(zone, message, opts, ui) { return defeat.defeatInGrandBreach(game, zone, message, opts, ui); }
function defeatBeyondBoundary(zone, message, opts, ui) { return defeat.defeatBeyondBoundary(game, zone, message, opts, ui); }
function defeatAtMeteor(zone, message, opts, ui) { return defeat.defeatAtMeteor(game, zone, message, opts, ui); }
function defeatInTimeRift(zone, message, opts, ui) { return defeat.defeatInTimeRift(game, zone, message, opts, ui); }
function defeatInRootBossFight(zone, message, opts, ui) { return defeat.defeatInRootBossFight(game, zone, message, opts, ui); }
function defeatInTrial(zone, message, opts, ui) { return defeat.defeatInTrial(game, zone, message, opts, ui); }
function defeatOnUnderworldFloor(zone, message, opts, ui) { return defeat.defeatOnUnderworldFloor(game, zone, message, opts, ui); }
function getPlayerAilmentResistChance(type, pStats) { return ailments.resist(type, pStats); }
function applyPlayerAilment(type, duration, power, ...detail) {
    const [pStats, sourceHitDamage, options] = detail;
    return ailments.apply(game, {type, duration, power, pStats, sourceHitDamage, options});
}
function tickAilments(pStats, dt) { return ailments.tick(game, pStats, dt); }
function isEnemyInGridAttackRange(enemy, target) { return engagement.isEnemyInGridAttackRange(game, enemy, target); }
function canEnemyAttackFromHere(enemy, target) { return engagement.canEnemyAttackFromHere(game, enemy, target); }
function advanceEnemyGridApproach(enemy, target, slowPct) { return engagement.advanceEnemyGridApproach(game, enemy, target, slowPct); }
function getSummonRespawnAt(summon, shortened) { return engagement.getSummonRespawnAt(game, summon, shortened); }
function getClosestLivingSummonToPlayer() { return engagement.getClosestLivingSummonToPlayer(game); }
function applyMonsterDamageToSummon(summon, rawDamage, enemy, pStats, bossPattern) { return engagement.applyMonsterDamageToSummon(game, {summon, rawDamage, enemy, pStats, bossPattern}); }
function queueEnemyCombatAttack(enemy, target, bossPattern, delivery) { return flights.queue(game, enemy, target, bossPattern, delivery); }
function announceEnemyAttackRelease(enemy, bossPattern, delivery, target) { return flights.release(game, enemy, bossPattern, delivery, target); }
function retireDeadEnemyAttacks(enemy) { return flights.retire(game, enemy); }
function dropEnemyAttack(index, now) { return flights.drop(game, index, now); }
function settleLastEnemyAttacks(pStats) {
    if ((game.enemies || []).length > 0 || window.GameModules.state.combat.pendingEnemyCombatAttacks.length === 0) return;
    performMonsterAttacks(pStats);
}
function takePendingEnemyCombatAttack(enemyId, now) { return flights.take(game, enemyId, now); }
function getEnemyCombatImpactTargets(pendingAttack) { return flights.targets(game, pendingAttack); }
function getMonsterBaseHitDamage(zone, seasonDepth, tierPressure, benchmarkProfile) { return engagement.getMonsterBaseHitDamage(game, zone, seasonDepth, tierPressure, benchmarkProfile); }
function performMonsterAttacks(pStats) { resolve(game,pStats); }
function calculateTrialTrapDamage(zone, pStats, trapElement) { return hazards.calculateTrialTrapDamage(game, zone, pStats, trapElement); }
function getBloomTrialRegenSuppressNext(zone, currentSuppress) { return hazards.getBloomTrialRegenSuppressNext(zone, currentSuppress); }
function buildTrialHazardCells(zone, origin, sequence) { return hazards.buildTrialHazardCells(game, zone, origin, sequence); }
function createTrialHazard(zone, now) { return hazards.createTrialHazard(game, zone, now); }
function isTrialHazardPositionHeld() { return hazards.isTrialHazardPositionHeld(game); }
function bossWarningApproach(warned) { return hazards.bossWarningApproach(game, warned); }
function updateCombatHazardEvasion(pStats) { return hazards.updateCombatHazardEvasion(game, pStats); }
function dealTrialTrapDamage(zone, pStats, hazard, trapDamage) { return hazards.dealTrialTrapDamage(game, zone, pStats, hazard, trapDamage); }
function resolveTrialHazardImpact(zone, pStats, hazard, now) { return hazards.resolveTrialHazardImpact(game, zone, pStats, hazard, now); }
function applyTrialTrapTick(pStats, deferEscape) { return hazards.applyTrialTrapTick(game, pStats, deferEscape); }
function defeatReturnZone(returnZoneId) { return defeat.defeatReturnZone(game, returnZoneId); }
function isApexFight() { return hazards.isApexFight(game); }
function groundHazardCells() { return hazards.groundHazardCells(game); }

/*! @dev-only */
let combatTestImmortal = false;
function setCombatTestImmortal(on) { combatTestImmortal = !!on; }
safeExposeGlobals({ setCombatTestImmortal });
/*! @end-dev-only */

safeExposeGlobals({ defeatReturnZone, isApexFight, groundHazardCells, noteCampaignResistPenalty, holdActRetreat, applyActRestRecovery, handlePlayerDefeat, holdAfterDefeat, defeatInOceanDive, clearDefeatedEncounter, defeatInGrandBreach, defeatBeyondBoundary, defeatAtMeteor, defeatInTimeRift, defeatInRootBossFight, defeatInTrial, defeatOnUnderworldFloor, getPlayerAilmentResistChance, applyPlayerAilment, tickAilments, isEnemyInGridAttackRange, canEnemyAttackFromHere, advanceEnemyGridApproach, getSummonRespawnAt, getClosestLivingSummonToPlayer, applyMonsterDamageToSummon, queueEnemyCombatAttack, announceEnemyAttackRelease, retireDeadEnemyAttacks, dropEnemyAttack, settleLastEnemyAttacks, takePendingEnemyCombatAttack, getEnemyCombatImpactTargets, getMonsterBaseHitDamage, performMonsterAttacks, calculateTrialTrapDamage, getBloomTrialRegenSuppressNext, buildTrialHazardCells, createTrialHazard, isTrialHazardPositionHeld, bossWarningApproach, updateCombatHazardEvasion, dealTrialTrapDamage, resolveTrialHazardImpact, applyTrialTrapTick });
