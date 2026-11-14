import * as part0 from './combat/player-targets.mjs';
import * as part1 from './combat/player-skill-mobility.mjs';
import * as part2 from './combat/player-approach.mjs';
import * as part3 from './combat/chaos-floor-rewards.mjs';
import * as part4 from './combat/chaos-enemy-affixes.mjs';
import * as part5 from './combat/cosmos-attack-setup.mjs';
import * as part6 from './combat/enemy-spawn-wards.mjs';
import * as part7 from './combat/cosmos-enemy-traits.mjs';
import * as part8 from './combat/cosmos-player-debuffs.mjs';
import * as part9 from './combat/cosmos-enemy-modifiers.mjs';
import * as part10 from './domain/enemy-loop-difficulty.mjs';
import * as part11 from './domain/enemy-content-difficulty.mjs';
import * as part12 from './combat/enemy-spawn-look.mjs';
import * as part13 from './domain/enemy-spawn-bonuses.mjs';
import * as part14 from './combat/enemy-spawn.mjs';
import * as part15 from './combat/enemy-spawn-record.mjs';
import * as part16 from './combat/enemy-spawn-defence.mjs';
import * as part17 from './combat/zone-encounter-profiles.mjs';
import { createEnemyWardMemory } from './combat/enemy-spawn-wards.mjs';
import { buildGetChaosRealmBonusSummary } from './ui/chaos-bonus-details.mjs';
// Removed after remaining classic consumers and bootstrap import their native owners.
const deps = {
    get skillEffectExpansion() { return skillEffectExpansion; },
    get actExplorationState() { return actExplorationState; },
    get skillGemCasts() { return skillGemCasts; },
    get selectGridSkillTargets() { return selectGridSkillTargets; },
    get ACT_EXPLORATION_VISION() { return ACT_EXPLORATION_VISION; },
    get ensureCombatGridRuntime() { return ensureCombatGridRuntime; },
    get getCombatTime() { return getCombatTime; },
    get resolveConditionalCombatTactics() { return resolveConditionalCombatTactics; },
    get normalizeCombatTacticsSettings() { return normalizeCombatTacticsSettings; },
    get getSkillGridProfile() { return getSkillGridProfile; },
    get getGridUnitDistance() { return getGridUnitDistance; },
    get isPlayerAttackRecovering() { return isPlayerAttackRecovering; },
    get advanceGridTacticalMovement() { return advanceGridTacticalMovement; },
    get COMBAT_GRID_CONFIG() { return COMBAT_GRID_CONFIG; },
    get getSkillBand() { return getSkillBand; },
    get getTacticalMoveAttackDelayMs() { return getTacticalMoveAttackDelayMs; },
    get actExplorationMotion() { return actExplorationMotion; },
    get copyCombatGridCell() { return copyCombatGridCell; },
    get gridStepToward() { return gridStepToward; },
    get getGridBlockedCells() { return getGridBlockedCells; },
    get findFreeGridCell() { return findFreeGridCell; },
    get hasGridCell() { return hasGridCell; },
    get actExplorationProgress() { return actExplorationProgress; },
    get hasPlayerChannelBreakingAilment() { return hasPlayerChannelBreakingAilment; },
    get getBossWarningCells() { return getBossWarningCells; },
    get isTrialHazardPositionHeld() { return isTrialHazardPositionHeld; },
    get isApexFight() { return isApexFight; },
    get bossWarningApproach() { return bossWarningApproach; },
    get getCombatChannelGate() { return getCombatChannelGate; },
    get groundHazardCells() { return groundHazardCells; },
    get mobilitySkill() { return mobilitySkill; },
    get syncCombatTacticsEncounterRuntime() { return syncCombatTacticsEncounterRuntime; },
    get resolvePlayerApproachTarget() { return resolvePlayerApproachTarget; },
    get advanceGridUnitMovement() { return advanceGridUnitMovement; },
    get canGridUnitStepToward() { return canGridUnitStepToward; },
    get findNearestGridEnemy() { return findNearestGridEnemy; },
    get gridCellKey() { return gridCellKey; },
    get getGridApproachStep() { return getGridApproachStep; },
    get getGridBandApproachCell() { return getGridBandApproachCell; },
    get getChaosRealmAffixScale() { return getChaosRealmAffixScale; },
    get getChaosRealmAffixes() { return getChaosRealmAffixes; },
    get atlasMaps() { return atlasMaps; },
    get getZone() { return getZone; },
    get OUTSIDE_CHAOS_ZONE_ID() { return OUTSIDE_CHAOS_ZONE_ID; },
    get ensureChaosRealmState() { return ensureChaosRealmState; },
    get _t() { return _t; },
    get cosmosRouteRuntime() { return cosmosRouteRuntime; },
    get getCosmosGalaxyBossMechanic() { return typeof getCosmosGalaxyBossMechanic === 'undefined' ? undefined : getCosmosGalaxyBossMechanic; },
    get i18n() { return i18n; },
    get cosmosGravityHarness() { return typeof window.getCosmosMasteryValue === 'function' ? Math.max(0, Number(window.getCosmosMasteryValue('gravityHarness')) || 0) : 0; },
    get cosmosGalaxyEnvironment() { return globalThis.COSMOS_GALAXY_ENVIRONMENT_DB; },
    get ACT_LOOP_SCALE_CAP() { return ACT_LOOP_SCALE_CAP; },
    get getAbyssDepthFromZoneId() { return getAbyssDepthFromZoneId; },
    get CHAOS_LOOP_RAMP_PER_DEPTH() { return CHAOS_LOOP_RAMP_PER_DEPTH; },
    get MONSTER_LOOP_GROWTH() { return MONSTER_LOOP_GROWTH; },
    get MONSTER_LOOP_HP_CURVE() { return MONSTER_LOOP_HP_CURVE; },
    get BOSS_LOOP_HP_SHARE() { return BOSS_LOOP_HP_SHARE; },
    get BOSS_TIER_HP_EASE() { return BOSS_TIER_HP_EASE; },
    get MONSTER_LOOP_POWER_SCALE() { return MONSTER_LOOP_POWER_SCALE; },
    get UNDERWORLD_DIFFICULTY_CONFIG() { return UNDERWORLD_DIFFICULTY_CONFIG; },
    get BOSS_DEFENSE_SPECIALTIES() { return BOSS_DEFENSE_SPECIALTIES; },
    get ENEMY_DEFENSE_TIER20() { return ENEMY_DEFENSE_TIER20; },
    get hashSeed() { return hashSeed; },
    get ENEMY_TRAIT_POOL() { return ENEMY_TRAIT_POOL; },
    get getBossAssetKeyForZone() { return typeof getBossAssetKeyForZone === 'undefined' ? undefined : getBossAssetKeyForZone; },
    get WISP_ENEMY_RULES() { return WISP_ENEMY_RULES; },
    get WISP_NEUTRAL_RULES() { return WISP_NEUTRAL_RULES; },
    get getRealmMonsterVisualSet() { return typeof getRealmMonsterVisualSet === 'undefined' ? undefined : getRealmMonsterVisualSet; },
    get getMonsterVariantDefinition() { return typeof getMonsterVariantDefinition === 'undefined' ? undefined : getMonsterVariantDefinition; },
    get getRealmMonsterVisualDefinition() { return typeof getRealmMonsterVisualDefinition === 'undefined' ? undefined : getRealmMonsterVisualDefinition; },
    get refreshBossPatternPreview() { return typeof refreshBossPatternPreview === 'undefined' ? undefined : refreshBossPatternPreview; },
    get COSMOS_ROUTE_G1() { return COSMOS_ROUTE_G1; },
    get loopMutation() { return loopMutation; },
    get levelProgression() { return levelProgression; },
    get getAbyssMonsterScales() { return getAbyssMonsterScales; },
    get pickEnemyElement() { return pickEnemyElement; },
    get getBossNameForZone() { return getBossNameForZone; },
    get getChaosBossElements() { return getChaosBossElements; },
    get rndChoice() { return rndChoice; },
    get CHAOS_BOSS_ELEMENTS() { return CHAOS_BOSS_ELEMENTS; },
    get getBossPatternModesForLoop() { return getBossPatternModesForLoop; },
    get METEOR_KINDS() { return METEOR_KINDS; },
    get applyGrandBreachMobTuning() { return applyGrandBreachMobTuning; },
    get assignEnemyGridCombatProfile() { return assignEnemyGridCombatProfile; },
    get maybeApplySeveredWanderer() { return typeof maybeApplySeveredWanderer === 'undefined' ? undefined : maybeApplySeveredWanderer; },
    get atlasEndgame() { return atlasEndgame; },
    get startHiddenJournalBossRun() { return startHiddenJournalBossRun; },
    get bossVariants() { return typeof bossVariants === 'undefined' ? undefined : bossVariants; }
};
const runtime = {
    get combatTacticsRuntime() { return window.GameModules.state.combat.combatTacticsRuntime; },
    get pendingEnemyCombatAttacks() { return window.GameModules.state.combat.pendingEnemyCombatAttacks; }
};
const env = { get owner() { return game; }, runtime, memory: createEnemyWardMemory(), deps };
const presentation = {
    chaosFloorBonusMessage(floor) {
        const chaosRealmBonusSummary = buildGetChaosRealmBonusSummary(env);
        return _t('🌌 혼돈계 {floor}층 최초 돌파 보너스: {chaosRealmBonusSummary}', { floor, chaosRealmBonusSummary });
    },
    get addBattleFx() { return addBattleFx; },
    get addLog() { return addLog; },
    get primeEnemyHpDamageGhost() { return typeof primeEnemyHpDamageGhost === 'undefined' ? undefined : primeEnemyHpDamageGhost; }
};
function runCommands(commands) {
    let step = commands.next();
    while (!step.done) {
        const command = step.value, effect = presentation[command.kind];
        if (command.kind === 'primeEnemyHpDamageGhost' && typeof effect !== 'function') step = commands.next();
        else step = commands.next(effect(...command.args));
    }
    return step.value;
}
const api = {
    addUncappedSkillTargets(skill, name) { return part0.buildAddUncappedSkillTargets(env, skill, name); },
    getSkillTargetPreference(tactics, now) { return part0.buildGetSkillTargetPreference(env, tactics, now); },
    selectCombatGemTargets(name, skill, source, enemies, options) { return part0.buildSelectCombatGemTargets(env, name, skill, source, { enemies, options }); },
    getSplashDormantEnemies() { return part0.buildGetSplashDormantEnemies(env); },
    getAttackTargets(pStats) { return part0.buildGetAttackTargets(env, pStats); },
    beginSkillMobility(pStats, target, isStageReplay) { return runCommands(part1.buildBeginSkillMobility(env, pStats, target, isStageReplay)); },
    applySkillMobilityBeforeAttack(skill, target, pStats) { return runCommands(part1.buildApplySkillMobilityBeforeAttack(env, skill, target, pStats)); },
    advancePlayerExplorationFrame(now, pStats) { return part2.buildAdvancePlayerExplorationFrame(env, now, pStats); },
    continuePlayerExplorationApproach(pStats) { return part2.buildContinuePlayerExplorationApproach(env, pStats); },
    updatePlayerGridEngagement(pStats, options) { return part2.buildUpdatePlayerGridEngagement(env, pStats, options); },
    warningAllowsStep(target, avoidCells) { return part2.buildWarningAllowsStep(env, target, avoidCells); },
    maybeUnlockChaosRealmFromWoodsman(enemy, options) { return runCommands(part3.buildMaybeUnlockChaosRealmFromWoodsman(env, enemy, options)); },
    applyZoneEnemyMods(enemy, zone) { return part4.buildApplyZoneEnemyMods(env, enemy, zone); },
    grantChaosRealmFloorBonus(floor) { return runCommands(part3.buildGrantChaosRealmFloorBonus(env, floor)); },
    applyCosmosJudgmentOnHit(enemy, pStats, element) { return part5.buildApplyCosmosJudgmentOnHit(enemy, pStats, element); },
    getBossDefenseTargets(zone, ele) { return part6.buildGetBossDefenseTargets(env, zone, ele); },
    getCosmosExclusiveEnemyTrait(zone, isElite, isBoss, seed) { return part7.buildGetCosmosExclusiveEnemyTrait(env, zone, isElite, isBoss, seed); },
    applyCosmosBossPlayerDebuff(enemy) { return runCommands(part8.buildApplyCosmosBossPlayerDebuff(env, enemy)); },
    applyCosmosBossAttackSetup(enemy, pattern, pStats) { return part5.buildApplyCosmosBossAttackSetup(env, enemy, pattern, pStats); },
    applyCosmosPlayerDebuffsToStats(pStats) { return part8.buildApplyCosmosPlayerDebuffsToStats(env, pStats); },
    getCosmosEnemyModifiers(zone, isElite, isBoss) { return part9.buildGetCosmosEnemyModifiers(env, zone, isElite, isBoss); },
    getSoftenedLoopDepth(depth) { return part10.buildGetSoftenedLoopDepth(depth); },
    getLoopDifficultyInputs(zone) { return part10.buildGetLoopDifficultyInputs(env, zone); },
    getMonsterLoopGrowthScale(zone, kind, seasonDepth, tierShare) { return part10.buildGetMonsterLoopGrowthScale(env, zone, kind, seasonDepth, tierShare); },
    getMonsterLoopHpMultiplier(zone, loopInputs, tierProgress) { return part10.buildGetMonsterLoopHpMultiplier(env, zone, loopInputs, tierProgress); },
    getBossHpEase(tier, loopMul) { return part10.buildGetBossHpEase(env, tier, loopMul); },
    getEliteLoopHpMultiplier(zone, loopCount) { return part10.buildGetEliteLoopHpMultiplier(zone, loopCount); },
    getMonsterLoopPowerScale(zone, kind) { return part10.buildGetMonsterLoopPowerScale(env, zone, kind); },
    interpolateLoopCurve(points, loop) { return part10.buildInterpolateLoopCurve(points, loop); },
    getLoopHpScale(loopCount) { return part10.buildGetLoopHpScale(loopCount); },
    getDifficultyBenchmarkProfile(zone) { return part11.buildGetDifficultyBenchmarkProfile(zone); },
    getEntryBossTuning(zone, isBoss) { return part11.buildGetEntryBossTuning(zone, isBoss); },
    getUnderworldEnemyDamageMultiplier(zone) { return part11.buildGetUnderworldEnemyDamageMultiplier(env, zone); },
    getWispEnemyDefenseBonuses(monsterVariant) { return part12.buildGetWispEnemyDefenseBonuses(env, monsterVariant); },
    getEnemyGemDropMul(enemy) { return part13.buildGetEnemyGemDropMul(env, enemy); },
    createEnemy(zone, marker, groupIndex) { return runCommands(part14.buildCreateEnemy(env, zone, marker, groupIndex)); },
    getEnemySeeds(zone, marker, groupIndex) { return part14.buildGetEnemySeeds(env, zone, marker, groupIndex); },
    getEnemyRewardRecord(zone, mods) { return part15.buildGetEnemyRewardRecord(env, zone, mods); },
    tuneMeteorEnemy(enemy, zone) { return part14.buildTuneMeteorEnemy(env, enemy, zone); },
    giveEnemyEnergyShield(enemy, pct) { return part16.buildGiveEnemyEnergyShield(enemy, pct); },
    finishBossSpawn(enemy, zone) { return part14.buildFinishBossSpawn(env, enemy, zone); },
    getZoneEncounterProfile(zone) { return part17.buildGetZoneEncounterProfile(env, zone); },
    resolveMapEstimateContentScale(zone) { return part11.buildResolveMapEstimateContentScale(env, zone); },
    getSkillTargets(pStats, dormant) { return part0.buildGetSkillTargets(env, pStats, dormant); }
};
safeExposeGlobals(api);
