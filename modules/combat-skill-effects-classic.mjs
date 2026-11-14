import * as hitPart0 from './combat/trial-hazard-state.mjs';
import * as hitPart1 from './combat/talent-bloom-rewards.mjs';
import * as hitPart2 from './combat/skill-dot-state.mjs';
import * as hitPart3 from './combat/flame-decay.mjs';
import * as hitPart4 from './combat/skill-conditional-damage.mjs';
import * as hitPart5 from './combat/skill-grid-control.mjs';
import * as hitPart6 from './combat/ailment-spread.mjs';
import * as hitPart7 from './combat/skill-periodics.mjs';
import * as hitPart8 from './combat/skill-erosion.mjs';
import * as hitPart9 from './combat/kill-progression.mjs';
import * as hitPart10 from './domain/account-reward-stats.mjs';
import * as hitPart11 from './combat/ailment-death.mjs';
import * as hitPart12 from './domain/ailment-dot-damage.mjs';
import * as hitPart13 from './combat/ailment-hit-application.mjs';
import * as hitPart14 from './combat/ailment-ticks.mjs';
import * as hitPart15 from './combat/skill-dot-ticks.mjs';
import * as hitPart16 from './combat/crowd-pause.mjs';
import * as hitPart17 from './combat/woodsman-curse.mjs';
import * as hitPart18 from './combat/cosmos-astra-stance.mjs';
import * as hitPart19 from './domain/boss-regen-readiness.mjs';
import { ELEMENTAL_HIT_AILMENTS, CHAOS_BOSS_ELEMENTS, FLAME_DECAY_BURST, SKILL_PERIODIC_CHAIN_CAP, WOODSMAN_PHASE_OLD_FINAL_PROGRESS, WOODSMAN_PHASE_NEW_FINAL_PROGRESS, WOODSMAN_ELEMENTS, COSMOS_ASTRA_STANCES, COSMOS_ASTRA_STANCE_CYCLE_MS } from './data/skill-combat-values.mjs';
import * as part0 from './combat/encounter-telemetry.mjs';
import * as part1 from './combat/woodsman-phases.mjs';
import * as part2 from './domain/skill-effect-values.mjs';
import * as part3 from './domain/ailment-hit-scaling.mjs';
import * as part4 from './domain/ailment-probabilities.mjs';
import * as part5 from './combat/encounter-plans.mjs';
import * as part6 from './combat/atlas-pack-estimate.mjs';
import * as part7 from './combat/map-boss-estimate.mjs';
import * as part8 from './combat/encounter-elements.mjs';

// Classic-name bridge; remove after consumers and bootstrap import the native owners.
const deps = {
    get DOT_STACK_MAX() { return DOT_STACK_MAX; },
    get DOT_STACK_GROWTH_PER_STACK() { return DOT_STACK_GROWTH_PER_STACK; },
    get DOT_TICK_FROM_HIT_RATIO() { return DOT_TICK_FROM_HIT_RATIO; },
    get DOT_TICK_INTERVAL() { return DOT_TICK_INTERVAL; },
    get DOT_EFFECT_DURATION() { return DOT_EFFECT_DURATION; },
    get canTalentCardApplyEnemyAilment() { return typeof canTalentCardApplyEnemyAilment === 'undefined' ? undefined : canTalentCardApplyEnemyAilment; },
    get getZone() { return getZone; },
    get getEffectiveEnemyMitigation() { return getEffectiveEnemyMitigation; },
    get loopMutation() { return loopMutation; },
    get getCombatTime() { return getCombatTime; },
    get hasGridCell() { return hasGridCell; },
    get getGridUnitCells() { return getGridUnitCells; },
    get getGridUnitDistance() { return getGridUnitDistance; },
    get applyDamageToEnemyResource() { return applyDamageToEnemyResource; },
    get getElementColor() { return getElementColor; },
    get getAilmentDisplayLabel() { return getAilmentDisplayLabel; },
    get findGridRetreatCell() { return findGridRetreatCell; },
    get gridStepToward() { return gridStepToward; },
    get getGridBlockedCells() { return getGridBlockedCells; },
    get isEnemyPetrified() { return isEnemyPetrified; },
    get copyCombatGridCell() { return copyCombatGridCell; },
    get getGridUnitCenter() { return getGridUnitCenter; },
    get ascendancyNodeRules() { return ascendancyNodeRules; },
    get handleEnemyDeath() { return handleEnemyDeath; },
    get hasKeystone() { return hasKeystone; },
    get getTalentAilmentReplacement() { return typeof getTalentAilmentReplacement === 'undefined' ? undefined : getTalentAilmentReplacement; },
    get regionAffixEffects() { return regionAffixEffects; },
    get combatSupports() { return window.GameModules.combat.supports; },
    get decorateTalentAilmentPayload() { return typeof decorateTalentAilmentPayload === 'undefined' ? undefined : decorateTalentAilmentPayload; },
    get enhanceTalentAilmentReapplication() { return typeof enhanceTalentAilmentReapplication === 'undefined' ? undefined : enhanceTalentAilmentReapplication; },
    get trackHiddenJournalAilment() { return trackHiddenJournalAilment; },
    get afterTalentAilmentApplied() { return typeof afterTalentAilmentApplied === 'undefined' ? undefined : afterTalentAilmentApplied; },
    get ASCENDANCY_KEYSTONE_VALUES() { return ASCENDANCY_KEYSTONE_VALUES; },
    get shouldTalentSkipColdFreeze() { return typeof shouldTalentSkipColdFreeze === 'undefined' ? undefined : shouldTalentSkipColdFreeze; },
    get enemyAttackRules() { return enemyAttackRules; },
    get storeExpiredTalentAilmentSeed() { return typeof storeExpiredTalentAilmentSeed === 'undefined' ? undefined : storeExpiredTalentAilmentSeed; },
    get getTalentDotDamageMultiplier() { return typeof getTalentDotDamageMultiplier === 'undefined' ? undefined : getTalentDotDamageMultiplier; },
    get getPlayerStats() { return typeof getPlayerStats === 'undefined' ? undefined : getPlayerStats; },
    get coreItems() { return coreItems; },
    get addStatToBucket() { return addStatToBucket; },
    get stumpBox() { return typeof stumpBox === 'undefined' ? undefined : stumpBox; },
    get weaponMastery() { return typeof weaponMastery === 'undefined' ? undefined : weaponMastery; },
    get bossVariants() { return typeof bossVariants === 'undefined' ? undefined : bossVariants; },
    get combatLootReceipts() { return combatLootReceipts; },
    get stumpNursery() { return typeof stumpNursery === 'undefined' ? undefined : stumpNursery; },
    get placeFloorItem() { return placeFloorItem; },
    get getTalentBloomHeroIdForAscendancy() { return typeof getTalentBloomHeroIdForAscendancy === 'undefined' ? undefined : getTalentBloomHeroIdForAscendancy; },
    get HERO_SELECTION_DEFS() { return HERO_SELECTION_DEFS; },
    get queueTutorialNotice() { return typeof queueTutorialNotice === 'undefined' ? undefined : queueTutorialNotice; },
    get recordTalentBloomCard() { return typeof recordTalentBloomCard === 'undefined' ? undefined : recordTalentBloomCard; },
    get CLASS_TEMPLATES() { return CLASS_TEMPLATES; },
    get getAutoProgressZoneId() { return getAutoProgressZoneId; },
    get startMoving() { return startMoving; },
    get ENEMY_CROWD_PAUSE_LIMIT() { return ENEMY_CROWD_PAUSE_LIMIT; },
    get actExplorationDoors() { return actExplorationDoors; },
    get actExplorationState() { return actExplorationState; },
    get ENEMY_REGEN_STEP_MS() { return ENEMY_REGEN_STEP_MS; },
    get ENEMY_REGEN_FATIGUE_MS() { return ENEMY_REGEN_FATIGUE_MS; },
    get ACT_LOOP_SCALE_CAP() { return ACT_LOOP_SCALE_CAP; },
    get BOSS_LOOP_HP_SHARE() { return BOSS_LOOP_HP_SHARE; },
    get BOSS_TIER_HP_EASE() { return BOSS_TIER_HP_EASE; },
    get CHAOS_LOOP_RAMP_PER_DEPTH() { return CHAOS_LOOP_RAMP_PER_DEPTH; },
    get MONSTER_LOOP_GROWTH() { return MONSTER_LOOP_GROWTH; },
    get MONSTER_LOOP_HP_CURVE() { return MONSTER_LOOP_HP_CURVE; },
    get MONSTER_LOOP_POWER_SCALE() { return MONSTER_LOOP_POWER_SCALE; },
    get UNDERWORLD_DIFFICULTY_CONFIG() { return UNDERWORLD_DIFFICULTY_CONFIG; },
    get _t() { return _t; },
    get cosmosRouteRuntime() { return cosmosRouteRuntime; },
    get cosmosGalaxyEnvironment() { return globalThis.COSMOS_GALAXY_ENVIRONMENT_DB; },
    get cosmosGravityHarness() { return typeof window.getCosmosMasteryValue === 'function' ? Math.max(0, Number(window.getCosmosMasteryValue('gravityHarness')) || 0) : 0; },
    get getAbyssDepthFromZoneId() { return getAbyssDepthFromZoneId; },
    get CHAOS_BOSS_ELEMENTS() { return CHAOS_BOSS_ELEMENTS; },
    get hasOceanCurrent() { return hasOceanCurrent; },
    get BOSS_BODY_ELEMENTS() { return BOSS_BODY_ELEMENTS; },
    get rndChoice() { return rndChoice; },
    get getCosmosGalaxyBossMechanic() { return typeof getCosmosGalaxyBossMechanic === 'undefined' ? undefined : getCosmosGalaxyBossMechanic; },
    get getBossPatternPeakDamageMultiplier() { return getBossPatternPeakDamageMultiplier; },
    get getMaximumBossPatternDamageMultiplierForLoop() { return getMaximumBossPatternDamageMultiplierForLoop; },
    get ENEMY_CRITICAL_DAMAGE_MULTIPLIER() { return ENEMY_CRITICAL_DAMAGE_MULTIPLIER; },
    get getChaosRealmAffixes() { return typeof getChaosRealmAffixes === 'undefined' ? undefined : getChaosRealmAffixes; },
    get getChaosRealmAffixScale() { return typeof getChaosRealmAffixScale === 'undefined' ? undefined : getChaosRealmAffixScale; },
    get levelProgression() { return levelProgression; },
    get getAbyssMonsterScales() { return getAbyssMonsterScales; },
    get getMapBossRequiredDps() { return getMapBossRequiredDps; },
    get hashSeed() { return hashSeed; },
    get getMonsterBaseHitDamage() { return getMonsterBaseHitDamage; },
    get ensureOceanState() { return ensureOceanState; },
    get getOceanPendingBossBoundary() { return typeof getOceanPendingBossBoundary === 'undefined' ? undefined : getOceanPendingBossBoundary; },
    get createSeededRng() { return createSeededRng; },
    get PROJECTILE_BONUS_SHOT_DAMAGE_PCT() { return PROJECTILE_BONUS_SHOT_DAMAGE_PCT; },
    get WOODSMAN_PHASE_NEW_FINAL_PROGRESS() { return WOODSMAN_PHASE_NEW_FINAL_PROGRESS; },
    get WOODSMAN_PHASE_OLD_FINAL_PROGRESS() { return WOODSMAN_PHASE_OLD_FINAL_PROGRESS; },
    get WOODSMAN_ELEMENTS() { return WOODSMAN_ELEMENTS; },
    get OUTSIDE_CHAOS_ZONE_ID() { return OUTSIDE_CHAOS_ZONE_ID; }
};
const runtime = {
    get trialHazardRuntime() { return window.GameModules.state.combat.trialHazardRuntime; },
    set trialHazardRuntime(value) { window.GameModules.state.combat.trialHazardRuntime = value; },
    get crowdPauseActive() { return crowdPauseActive; },
    set crowdPauseActive(value) { crowdPauseActive = value; }
};
const env = { get owner() { return game; }, deps, runtime };

function getChaosBossElements(zone) { return part8.effectGetChaosBossElements(env, zone); }
function pickEnemyElement(zone, pool, isBoss) { return part8.effectPickEnemyElement(env, zone, pool, isBoss); }
function estimateMapZonePowerRequirements(zone) { return part7.effectEstimateMapZonePowerRequirements(env, zone); }
function getAtlasPackReadiness(zone, baseHp, bossEstimate) { return part6.effectGetAtlasPackReadiness(env, zone, baseHp, bossEstimate); }
function generateEncounterPlan(zone) { return part5.effectGenerateEncounterPlan(env, zone); }
function getTrialHazardProfile(zone) { return part2.effectGetTrialHazardProfile(zone); }
function getSkillAilmentStats(pStats, hitElement, curseFx) { return part3.effectGetSkillAilmentStats(pStats, hitElement, curseFx); }
function getSkillRepeatDamageMultiplier(skill, hitIndex, nativeRepeats) { return part2.effectGetSkillRepeatDamageMultiplier(env, skill, hitIndex, nativeRepeats); }
function readRepelMeleeParams(ep) { return part2.effectReadRepelMeleeParams(ep); }
function readPursuitMovePct(ep) { return part2.effectReadPursuitMovePct(ep); }
function getAilmentTypeFromElement(ele) { return part4.effectGetAilmentTypeFromElement(ele); }
function getPlayerAilmentChance(pStats, type) { return part4.effectGetPlayerAilmentChance(pStats, type); }
function getPassiveBleedMultiplier(pStats) { return part4.effectGetPassiveBleedMultiplier(pStats); }
function getPlayerShockTakenDamageIncreasePct(pStats, power) { return part3.effectGetPlayerShockTakenDamageIncreasePct(pStats, power); }
function getEnemyShockTakenDamageIncreasePct(ail, pStats) { return part3.effectGetEnemyShockTakenDamageIncreasePct(ail, pStats); }
function getActiveEnemyShockTakenDamageIncreasePct(enemy, pStats) { return part3.effectGetActiveEnemyShockTakenDamageIncreasePct(enemy, pStats); }
function getShockedEnemyHitDamageIncreaseMultiplier(enemy, pStats) { return part3.effectGetShockedEnemyHitDamageIncreaseMultiplier(enemy, pStats); }
function getDamageAilmentEffectiveDotScale(scale, critDotBonusPct, critDotBonusScale) { return part3.effectGetDamageAilmentEffectiveDotScale(scale, critDotBonusPct, critDotBonusScale); }
function getDamageAilmentScore(sourceDamage, critDotBonusPct, scale, critDotBonusScale) { return part3.effectGetDamageAilmentScore(sourceDamage, critDotBonusPct, scale, critDotBonusScale); }
function getFlameDecayIgniteTakenMultiplier(pStats) { return part2.effectGetFlameDecayIgniteTakenMultiplier(pStats); }
function getWoodsmanPhaseProgress(enemy) { return part1.effectGetWoodsmanPhaseProgress(env, enemy); }
function woodsmanAttackFxElement(enemy) { return part1.effectWoodsmanAttackFxElement(env, enemy); }
function getEncounterTelemetryContext(zone) { return part0.effectGetEncounterTelemetryContext(env, zone); }

const effects = {
    deliverSkillCue(callback, cue) { return callback(cue); },
    get addBattleFx() { return addBattleFx; },
    get addLog() { return addLog; },
    get queueTutorialNotice() { return typeof queueTutorialNotice === 'undefined' ? undefined : queueTutorialNotice; },
    get queueContentNotice() { return queueContentNotice; },
    get dispatchRuntimeEvent() { return dispatchRuntimeEvent; },
    get updateStaticUI() { return updateStaticUI; },
    get queueImportantSave() { return queueImportantSave; }
};
function runSkillCommands(commands) {
    let step = commands.next();
    while (!step.done) {
        const command = step.value;
        step = commands.next(effects[command.kind](...command.args));
    }
    return step.value;
}

function resetBattleRuntimeVisuals() {
    window.GameModules.battleVisuals.runtime.reset();
    window.GameModules.state.combat.pendingSkillStageHits = [];
    window.GameModules.state.combat.pendingEnemyCombatAttacks = [];
    window.GameModules.state.combat.nextPlayerDamageTextGroupId = 1;
    crowdPauseActive = false;
    window.GameModules.state.combat.trialHazardRuntime = { nextAt: 0, active: null };
}

function primeTrialHazardTimer(zone) { return hitPart0.hitPrimeTrialHazardTimer(env, zone); }
function handleTalentBloomClear(zone) { return runSkillCommands(hitPart1.hitHandleTalentBloomClear(env, zone)); }
function getDotStackMultiplier(stacks) { return hitPart2.hitGetDotStackMultiplier(env, stacks); }
function applySkillDotFromHit(enemy, hitDamage, pStats) { return runSkillCommands(hitPart3.hitApplySkillDotFromHit(env, enemy, hitDamage, pStats)); }
function detonateFlameDecay(enemy, hitDamage, pStats) { return runSkillCommands(hitPart3.hitDetonateFlameDecay(env, enemy, hitDamage, pStats)); }
function getSkillConditionalDamageMultiplier(skill, enemy, onCue) { return runSkillCommands(hitPart4.hitGetSkillConditionalDamageMultiplier(env, skill, enemy, onCue)); }
function pushEnemyAwayOnHit(enemy, skill) { return runSkillCommands(hitPart5.hitPushEnemyAwayOnHit(env, enemy, skill)); }
function repelMeleeAttacker(enemy, pStats) { return runSkillCommands(hitPart5.hitRepelMeleeAttacker(env, enemy, pStats)); }
function launchEnemyOnHit(enemy, skill) { return runSkillCommands(hitPart5.hitLaunchEnemyOnHit(env, enemy, skill)); }
function applySkillGridControlOnHit(enemy, skill, options = {}) { return runSkillCommands(hitPart5.hitApplySkillGridControlOnHit(env, enemy, skill, options)); }
function spreadSkillAilmentOnHit(source, skill, pStats) { return runSkillCommands(hitPart6.hitSpreadSkillAilmentOnHit(env, source, skill, pStats)); }
function applySkillPeriodicOnHit(enemy, skill, damage, skillName) { return hitPart7.hitApplySkillPeriodicOnHit(env, enemy, skill, damage, skillName); }
function addConfirmedSkillEffect(kind, visual, target, element) { return runSkillCommands(hitPart7.hitAddConfirmedSkillEffect(env, kind, visual, target, element)); }
function applySupportEchoOnHit(enemy, pStats, damage) { return hitPart7.hitApplySupportEchoOnHit(enemy, pStats, damage); }
function applySupportChaosErosionOnHit(enemy, pStats, hitElement) { return hitPart8.hitApplySupportChaosErosionOnHit(enemy, pStats, hitElement); }
function transferPassiveChaosErosionToTarget(enemy, pStats) { return hitPart8.hitTransferPassiveChaosErosionToTarget(env, enemy, pStats); }
function cloneEnemyAilmentForSpread(ail, pStats) { return hitPart6.hitCloneEnemyAilmentForSpread(env, ail, pStats); }
function mergeEnemyAilment(target, incoming, pStats) { return hitPart6.hitMergeEnemyAilment(env, target, incoming, pStats); }
function recordKillProgress(enemy) { return hitPart9.hitRecordKillProgress(env, enemy); }
function layStumpDrop(enemy) { return hitPart9.hitLayStumpDrop(env, enemy); }
function applyAccountRewardStats(reward) { return hitPart10.hitApplyAccountRewardStats(env, reward); }
function applyAilmentEffectsOnDeath(enemy, pStats) { return runSkillCommands(hitPart11.hitApplyAilmentEffectsOnDeath(env, enemy, pStats)); }
function getPlayerDamageAilmentFallbackDps(type, power, pStats) { return hitPart12.hitGetPlayerDamageAilmentFallbackDps(env, type, power, pStats); }
function applyEnemyAilmentFromHit(enemy, pStats, hitDamage, isCrit, options) { return hitPart13.hitApplyEnemyAilmentFromHit(env, enemy, pStats, { hitDamage, isCrit, options }); }
function tickEnemyAilments(pStats, dt) { return runSkillCommands(hitPart14.hitTickEnemyAilments(env, pStats, dt)); }
function tickEnemyDotEffects(pStats, dt) { return runSkillCommands(hitPart15.hitTickEnemyDotEffects(env, pStats, dt)); }
function syncCrowdPauseState() { return runSkillCommands(hitPart16.hitSyncCrowdPauseState(env)); }
function resetWoodsmanCurse() { return hitPart17.hitResetWoodsmanCurse(env); }
function startWoodsmanCurse() { return runSkillCommands(hitPart17.hitStartWoodsmanCurse(env)); }
function tickWoodsmanCurse() { return runSkillCommands(hitPart17.hitTickWoodsmanCurse(env)); }
function getWoodsmanCurseDamageTakenMul() { return hitPart17.hitGetWoodsmanCurseDamageTakenMul(env); }
function applyCosmosAstraStance(enemy) { return runSkillCommands(hitPart18.hitApplyCosmosAstraStance(env, enemy)); }
function isCrowdProgressPaused() { return hitPart16.hitIsCrowdProgressPaused(env); }
function isDamageAilmentType(type) { return hitPart12.hitIsDamageAilmentType(type); }
function getStoredAilmentHitDamage(ail) { return hitPart12.hitGetStoredAilmentHitDamage(ail); }
function getDamageAilmentBaseDpsFromHit(hitDamage, power, scale, critDotBonusPct, critDotBonusScale) { return hitPart12.hitGetDamageAilmentBaseDpsFromHit(hitDamage, power, scale, critDotBonusPct, critDotBonusScale); }
function getEnemyDamageAilmentDps(ail, pStats) { return hitPart12.hitGetEnemyDamageAilmentDps(env, ail, pStats); }
function getPlayerDamageAilmentDps(ail, pStats) { return hitPart12.hitGetPlayerDamageAilmentDps(env, ail, pStats); }
function getMapBossRequiredDps(bossHp, clearTimeSec, regenRate) { return hitPart19.hitGetMapBossRequiredDps(env, bossHp, clearTimeSec, regenRate); }
function flameDecayMitigated(enemy, damage, pStats) { return hitPart3.hitFlameDecayMitigated(env, enemy, damage, pStats); }
function canPushEnemy(enemy) { return hitPart5.hitCanPushEnemy(env, enemy); }

const api = { getChaosBossElements, pickEnemyElement, estimateMapZonePowerRequirements, getAtlasPackReadiness, generateEncounterPlan, resetBattleRuntimeVisuals, getTrialHazardProfile, primeTrialHazardTimer, handleTalentBloomClear, getDotStackMultiplier, applySkillDotFromHit, detonateFlameDecay, getSkillAilmentStats, getSkillConditionalDamageMultiplier, getSkillRepeatDamageMultiplier, pushEnemyAwayOnHit, repelMeleeAttacker, readRepelMeleeParams, readPursuitMovePct, launchEnemyOnHit, applySkillGridControlOnHit, spreadSkillAilmentOnHit, applySkillPeriodicOnHit, addConfirmedSkillEffect, applySupportEchoOnHit, applySupportChaosErosionOnHit, transferPassiveChaosErosionToTarget, getAilmentTypeFromElement, getPlayerAilmentChance, getPassiveBleedMultiplier, getPlayerShockTakenDamageIncreasePct, getEnemyShockTakenDamageIncreasePct, getActiveEnemyShockTakenDamageIncreasePct, getShockedEnemyHitDamageIncreaseMultiplier, getDamageAilmentEffectiveDotScale, getDamageAilmentScore, cloneEnemyAilmentForSpread, mergeEnemyAilment, recordKillProgress, layStumpDrop, applyAccountRewardStats, applyAilmentEffectsOnDeath, getFlameDecayIgniteTakenMultiplier, getPlayerDamageAilmentFallbackDps, applyEnemyAilmentFromHit, tickEnemyAilments, tickEnemyDotEffects, syncCrowdPauseState, resetWoodsmanCurse, startWoodsmanCurse, tickWoodsmanCurse, getWoodsmanCurseDamageTakenMul, getWoodsmanPhaseProgress, woodsmanAttackFxElement, getEncounterTelemetryContext, applyCosmosAstraStance, isCrowdProgressPaused, isDamageAilmentType, getStoredAilmentHitDamage, getDamageAilmentBaseDpsFromHit, getEnemyDamageAilmentDps, getPlayerDamageAilmentDps, ELEMENTAL_HIT_AILMENTS, CHAOS_BOSS_ELEMENTS, FLAME_DECAY_BURST, SKILL_PERIODIC_CHAIN_CAP, WOODSMAN_PHASE_OLD_FINAL_PROGRESS, WOODSMAN_PHASE_NEW_FINAL_PROGRESS, WOODSMAN_ELEMENTS, COSMOS_ASTRA_STANCES, COSMOS_ASTRA_STANCE_CYCLE_MS, getMapBossRequiredDps, flameDecayMitigated, canPushEnemy };
safeExposeGlobals(api);
