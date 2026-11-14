import { NO_RUNE_BONUS_LEVELS } from './data/rune-runtime-settings.mjs';
import { playerGrantStoneShieldOnBlock, playerGrantEliteTraitOnKill } from './combat/player-stat-events.mjs';
import { createPlayerUniqueEffects } from './domain/player-unique-effects.mjs';
import { createPlayerPassiveStats } from './domain/player-passive-stats.mjs';
import { createPlayerStatFinish } from './domain/player-stat-finish.mjs';
import { createPlayerStatMath } from './domain/player-stat-math.mjs';
import { createPlayerGrowthStats } from './domain/player-growth-stats.mjs';
import { createPlayerAscendancyStats } from './domain/player-ascendancy-stats.mjs';
import { createPlayerStatFinal } from './domain/player-stat-final.mjs';
import { createPlayerDpsEstimate } from './domain/player-dps-estimate.mjs';
import { createPlayerStatResult } from './domain/player-stat-result.mjs';
import { createPlayerStatDescriptions } from './domain/player-stat-descriptions.mjs';
import { createPlayerStatInputs } from './domain/player-stat-inputs.mjs';
import { createPlayerStatPipeline } from './domain/player-stat-pipeline.mjs';
import { createPlayerCombatEffects } from './domain/player-combat-effects.mjs';
import { createGemPresentation } from './domain/gem-presentation.mjs';
import { cooldownStatValues, oceanStatValues, uniqueSocketedJewels, labyrinthShacklesMultiplier, absoluteFloorDamageRoll, solitaryHuntDoubleStrike, deferredTalentTargetEffect } from './domain/player-stat-values.mjs';

// One calculator instance. Existing call names survive until their classic consumers and bootstrap migrate.
const uniqueEffects = createPlayerUniqueEffects({
    mergeParams: (previous, next) => mergeBetterUniqueParams(previous, next),
    repelParams: params => readRepelMeleeParams(params), pursuitPct: params => readPursuitMovePct(params),
    bottleStats: bucket => addThousandBottlesStats(bucket), deferredTarget: effect => isDeferredTalentProjectileTargetEffect(effect),
    translate: (...args) => _t(...args), get projectilePatterns() { return PROJECTILE_PATTERN_MODE_DB; }
});
const passive = createPlayerPassiveStats({
    damageTags: skill => getSkillDamageTagSet(skill), keystone: (id, owner) => hasKeystone(id, owner),
    get values() { return ASCENDANCY_KEYSTONE_VALUES; }, get runes() { return gemDropRewards; }
});
const finalizer = createPlayerStatFinish({ now: () => getCombatTime(),
    summonEstimate: (owner, stats, includeBreakdowns, evaluation) => estimateSummonDps(stats, includeBreakdowns, evaluation),
    appendDps: (stats, estimate) => appendPlayerDpsBreakdowns(stats, estimate) });
// Late ports retain the current game's talent/keystone helpers until those consumers migrate too.
const math = createPlayerStatMath({
    spellBase: (...args) => getGemSpellBaseDamage(...args), keystoneActive: id => hasKeystone(id),
    codexPct: () => getCodexBonusPct(),
    get talentDerived() { return typeof getTalentPreciseDerivedBonuses === 'function' ? getTalentPreciseDerivedBonuses : undefined; },
    get talentKnee() { return typeof getTalentAttackSpeedSoftcapKnee === 'function' ? getTalentAttackSpeedSoftcapKnee : undefined; },
    keystoneSpeed: (...args) => scaleKeystoneAttackSpeed(...args), get SKILL_DELAY_REDUCE_CAP() { return SKILL_DELAY_REDUCE_CAP; },
    get passiveNode() { return typeof findAllocatedPassiveKeystone === 'function' ? findAllocatedPassiveKeystone : undefined; },
    zoneOf: id => getZone(id), armorMitigation: (...args) => getArmorPhysicalReductionPct(...args),
    zoneAccuracy: zone => getEnemyAccuracyForZone(zone), evasionChance: (...args) => getEvasionChancePct(...args),
    get CRIT_DAMAGE_BASE_MULTIPLIER() { return CRIT_DAMAGE_BASE_MULTIPLIER; }, capLeech: value => applyLeechSoftcap(value),
    get LEECH_BASE_RATE_CAP_PCT() { return LEECH_BASE_RATE_CAP_PCT; }, get LEECH_BASE_TOTAL_CAP_PCT() { return LEECH_BASE_TOTAL_CAP_PCT; },
    get LEECH_BASE_INSTANCE_CAP_PCT() { return LEECH_BASE_INSTANCE_CAP_PCT; }, get PLAYER_PHYSICAL_REDUCTION_CAP_PCT() { return PLAYER_PHYSICAL_REDUCTION_CAP_PCT; }
});
const growth = createPlayerGrowthStats({
    voidCount: owner => getVirtualVoidPassiveCount(owner), weaponStance: () => getEquippedWeaponStance(),
    hasAuthoredKeystone: title => hasAuthoredPassiveKeystone(title), voidCraft: id => getVoidPassiveCraft(id),
    voidLinkScale: id => getVoidLinkScale(id), voidStats: (...args) => passiveRouting.voidStats(...args),
    transcendentStats: (...args) => getTranscendentVoidPassiveStats(...args), nodeEffects: (...args) => getEffectivePassiveNodeEffects(...args),
    get passiveTree() { return PASSIVE_TREE; }, get weaponConditions() { return WEAPON_CONDITION_STATS; },
    seasonStats: (...args) => accumulateCombatSeasonStats(...args), ascendStats: (...args) => accumulateCombatAscendStats(...args),
    loopStats: (...args) => accumulateCombatLoopStats(...args), chaosState: () => ensureChaosRealmState(),
    runeStats: (...args) => accumulateCombatRuneStats(...args), breathStats: breath => combatIncidents.breathStats(breath),
    accountStats: reward => applyAccountRewardStats(reward),
    get relicStats() { return typeof getCosmosBossRelicStatTotals === 'function' ? getCosmosBossRelicStatTotals : undefined; },
    boundaryStats: owner => getBeyondBoundaryGlobalStats(owner), get heroDefs() { return HERO_SELECTION_DEFS; },
    get starBlessing() { return PASSIVE_STAR_BLESSING; }, talismanSummary: () => talismanEffects.summarize()
});
const ascendancy = createPlayerAscendancyStats({
    keystone: (id, owner) => hasKeystone(id, owner), get values() { return ASCENDANCY_KEYSTONE_VALUES; },
    dualWielding: () => isDualWielding(), get physicalCap() { return PLAYER_PHYSICAL_REDUCTION_CAP_PCT; },
    solitaryBonus: targets => getSolitaryHuntDoubleStrikeBonus(targets), get damageTags() { return TAGGED_DAMAGE_STAT_BY_TAG; },
    summonPower: (...args) => getRepresentativeSummonAttackPower(...args)
});
const finalMath = createPlayerStatFinal({
    zoneOf: id => getZone(id),
    get skyReduction() { return typeof getSkyStoneReductionPct === 'function' ? getSkyStoneReductionPct : undefined; },
    gravityMultiplier: (...args) => getUnderworldGravityActionMultiplier(...args),
    get oceanResistanceUpgrade() { return typeof getOceanPressureResistUpgradePct === 'function' ? getOceanPressureResistUpgradePct : undefined; },
    oceanCurrent: (...args) => hasOceanCurrent(...args), armorMitigation: (...args) => getArmorPhysicalReductionPct(...args),
    evasionChance: (...args) => getEvasionChancePct(...args),
    get preciseTalent() { return typeof getPreciseTalentLevel === 'function' ? getPreciseTalentLevel : undefined; },
    keystone: id => hasKeystone(id), critSoftcap: value => applyCritDamageSoftcap(value),
    critReduction: value => getCritDamageSoftcapReduction(value), averageCriticalHit: (...args) => getAverageCriticalHitDamage(...args),
    get physicalCap() { return PLAYER_PHYSICAL_REDUCTION_CAP_PCT; }, ailmentResistance: (...args) => getPlayerAilmentResistChance(...args)
});
const dps = createPlayerDpsEstimate({
    get talentConversion() { return typeof getTalentDamageConversion === 'function' ? getTalentDamageConversion : undefined; },
    wisdomMultiplier: (...args) => getPassiveWisdomLeapDamageMultiplier(...args),
    get projectileBonusPct() { return PROJECTILE_BONUS_SHOT_DAMAGE_PCT; },
    projectileMultiplier: (...args) => getProjectileExtraShotDpsMultiplier(...args),
    get dotInterval() { return DOT_TICK_INTERVAL; }, get dotDuration() { return DOT_EFFECT_DURATION; },
    get dotStackMax() { return DOT_STACK_MAX; }, get dotHitRatio() { return DOT_TICK_FROM_HIT_RATIO; },
    stackMultiplier: count => getDotStackMultiplier(count),
    get sequenceMultiplier() { return typeof getSkillHitSequenceDpsMultiplier === 'function' ? getSkillHitSequenceDpsMultiplier : undefined; },
    splitFan: (...args) => splitFanSpreadDps(...args),
    supportMultiplier: skill => window.GameModules.combat.supports.expectedMultiplier(skill)
});
const result = createPlayerStatResult({
    get skyReduction() { return typeof getSkyStoneReductionPct === 'function' ? getSkyStoneReductionPct : undefined; },
    recoveryCap: (...args) => getPlayerRecoveryHpCap(...args), capLeech: value => applyLeechSoftcap(value),
    get passiveNode() { return typeof findAllocatedPassiveKeystone === 'function' ? findAllocatedPassiveKeystone : undefined; },
    get damageTags() { return TAGGED_DAMAGE_STAT_BY_TAG; }, auraFlat: values => window.GameModules.combat.supports.auraFlat(values),
    summonCap: sum => getSummonCapFromSum(sum), keystone: id => hasKeystone(id),
    oceanStats: sum => collectOceanStats(sum), cooldownStats: sum => collectCooldownStats(sum),
    get regionAffixes() { return regionAffixEffects; },
    get postStats() { return typeof applyTalentPrecisePostStats === 'function' ? applyTalentPrecisePostStats : undefined; }
});
const descriptions = createPlayerStatDescriptions({
    translate: (...args) => _t(...args), sourceLine: (...args) => makeSourceLine(...args),
    ailmentLabel: name => getAilmentDisplayLabel(name), statName: name => getStatName(name),
    valueText: (...args) => formatValue(...args), summonMaximum: () => getSummonCapMaximum(),
    keystone: id => hasKeystone(id), percentMultiplier: value => formatPercentMultiplier(value),
    totalEvadeChance: (...args) => getEnemyTotalEvadeChance(...args), fanLines: (...args) => getFanSpreadDpsLines(...args),
    get P_STATS() { return P_STATS; }, get CRIT_DAMAGE_BASE_MULTIPLIER() { return CRIT_DAMAGE_BASE_MULTIPLIER; },
    get COMBAT_GRID_CONFIG() { return COMBAT_GRID_CONFIG; },
    get LEECH_BASE_INSTANCE_CAP_PCT() { return LEECH_BASE_INSTANCE_CAP_PCT; },
    get LEECH_BASE_TOTAL_CAP_PCT() { return LEECH_BASE_TOTAL_CAP_PCT; },
    get LEECH_BASE_RATE_CAP_PCT() { return LEECH_BASE_RATE_CAP_PCT; },
    get PLAYER_PHYSICAL_REDUCTION_CAP_PCT() { return PLAYER_PHYSICAL_REDUCTION_CAP_PCT; },
    get PLAYER_ACCURACY_BASE() { return PLAYER_ACCURACY_BASE; },
    get PLAYER_ACCURACY_PER_LEVEL() { return PLAYER_ACCURACY_PER_LEVEL; },
    get PLAYER_ACCURACY_PER_DEXTERITY() { return PLAYER_ACCURACY_PER_DEXTERITY; },
    get DOT_TICK_FROM_HIT_RATIO() { return DOT_TICK_FROM_HIT_RATIO; },
    get DOT_TICK_INTERVAL() { return DOT_TICK_INTERVAL; }, get DOT_STACK_MAX() { return DOT_STACK_MAX; },
    get WARRIOR_RAGE_STACK_MAX() { return WARRIOR_RAGE_STACK_MAX; }
});
const inputs = createPlayerStatInputs({
    itemEntries: owner => getPlayerStatSourceItemEntries(owner), resolveLists: (...args) => getResolvedEquipmentStatLists(...args),
    passiveNode: title => findAllocatedPassiveKeystone(title), keystone: (id, owner) => hasKeystone(id, owner),
    equipmentContributions: (...args) => getCombatEquipmentContributions(...args), talentEffects: () => getActiveTalentUniqueEffects(),
    uniqueJewels: owner => getEquippedUniqueJewels(owner), mirroredJewels: owner => getMirroredRingJewels(owner),
    jewelStats: item => getJewelStats(item), addDefensePct: (...args) => addGlobalDefensePct(...args),
    appendKeystoneEffects: (...args) => pushBuildKeystoneUniqueEffects(...args),
    buildMemo: owner => getBackgroundBuildMemo(owner), gemEvaluation: stats => createGemBonusEvaluation(stats),
    gemSources: (...args) => getTargetGemBonusSources(...args), activeSkill: bonus => window.GameModules.combat.supports.activeSkillStats(bonus),
    supportValues: (...args) => window.GameModules.combat.supports.values(...args),
    constellation: (...args) => addConstellationBuffStat(...args), summonCap: sum => getSummonCapFromSum(sum),
    auraValues: (...args) => window.GameModules.combat.supports.auraValues(...args),
    projectileMode: (...args) => applyProjectilePatternMode(...args),
    get authoredRules() { return typeof applyAuthoredPassiveStatRules === 'function' ? applyAuthoredPassiveStatRules : undefined; },
    accuracy: (...args) => calculatePlayerAccuracy(...args), bladeShots: (...args) => getBladeBundleShots(...args),
    uncappedTargets: (...args) => addUncappedSkillTargets(...args)
});
// Only the classic boundary owns these late globals. Calculation stages have no browser/global access.
const pipeline = createPlayerStatPipeline({ uniqueEffects, passive, math, growth, ascendancy, finalMath, dps, result, descriptions, inputs }, {
    refreshTwinKeystones: () => recomputeCosmosTwinKeystones(),
    requirementAttributes: (...args) => readRequirementAttributes(...args),
    get talentStatMap() { return typeof getActiveTalentStatMap === 'function' ? getActiveTalentStatMap : undefined; },
    get talentCardStats() { return typeof getActiveTalentCardStatBonuses === 'function' ? getActiveTalentCardStatBonuses : undefined; },
    resonancePower: (...args) => getBonusResonancePower(...args), tagLabel: tag => translateSkillTag(tag),
    keystone: id => hasKeystone(id), translate: (...args) => _t(...args), zone: id => getZone(id),
    loopMorePct: value => getLoopDeepMorePct(value), barkEffect: () => getWorldTreeBarkEffect(),
    get passiveNode() { return typeof findAllocatedPassiveKeystone === 'function' ? findAllocatedPassiveKeystone : undefined; },
    shacklesMultiplier: move => getLabyrinthShacklesDamageMultiplier(move), absoluteFloorRoll: value => getAbsoluteFloorDamageRoll(value),
    campaignPenalty: maxZone => getCampaignResistPenalty(maxZone), get keystoneValues() { return ASCENDANCY_KEYSTONE_VALUES; },
    get wards() { return typeof colonyWards === 'object' ? colonyWards : undefined; },
    flameDecayTaken: stats => getFlameDecayIgniteTakenMultiplier(stats),
    grantsAttributes: (...args) => window.GameModules.combat.supports.grantsAttributes(...args),
    nativeDot: skill => window.GameModules.combat.supports.nativeDot(skill),
    get cosmosMastery() { return window.getCosmosMasteryValue; }
});
// These services run on attack/display events, outside the cached stat core.
const effects = createPlayerCombatEffects({
    clock: () => getCombatTime(), recoveryCap: stats => getPlayerEnergyShieldRecoveryCap(stats),
    consumeBlockEmpower: at => regionAffixEffects.consumeBlockEmpower(at),
    regionMultiplier: (stats, attacker) => regionAffixEffects.takenDamageMultiplier(stats, attacker)
});
const presentation = createGemPresentation({
    get forgeRules() { return GEM_CORE_FORGE; }, get supports() { return SUPPORT_GEM_DB; }, get skills() { return SKILL_DB; },
    get tierCap() { return typeof getSupportTierCap === 'function' ? getSupportTierCap : undefined; },
    get tierMultiplier() { return typeof getSupportTierMultiplier === 'function' ? getSupportTierMultiplier : undefined; },
    get activeTier() { return typeof getSupportActiveTier === 'function' ? getSupportActiveTier : undefined; },
    get noBonusLevels() { return NO_RUNE_BONUS_LEVELS; }, bonusLevels: (...args) => getSkillRuneBonusLevels(...args),
    forgeEffects: gem => gemCoreForge.effects(gem), translate: (...args) => _t(...args),
    tags: skill => getSkillTagList(skill), sources: (...args) => getTargetGemBonusSources(...args),
    skyPattern: name => getSkyProjectilePatternMode(name), applyPattern: (...args) => applyProjectilePatternMode(...args),
    resolve: skill => window.GameModules.combat.supports.resolve(skill)
});
const values = Object.freeze({ cooldownStatValues, oceanStatValues, uniqueSocketedJewels, labyrinthShacklesMultiplier,
    absoluteFloorDamageRoll, solitaryHuntDoubleStrike, deferredTalentTargetEffect });

function collectCooldownStats(sum) {
    return values.cooldownStatValues(sum);
}

const getProjectileTargetBreakdowns = (b, extra) => descriptions.projectileTargets(b, extra);

function collectOceanStats(sum) {
    const upgrade = typeof getOceanPressureResistUpgradePct === 'function' ? getOceanPressureResistUpgradePct() : 0;
    return values.oceanStatValues(sum, upgrade);
}

function applySituationalTakenReduction(dmg, pStats, attacker, aliveEnemies) {
    return effects.taken(dmg, pStats, attacker, aliveEnemies);
}

function grantTalentStoneShieldOnBlock(stats) { return presentPlayerStatEvent(playerGrantStoneShieldOnBlock(statEventEnv, stats)); }

function recoverEnergyShieldOnBlock(pStats) {
    return effects.recoverBlock(game, pStats);
}

function consumeLoneEvasionCounterMultiplier(pStats, now) {
    return effects.consumeCounter(game, pStats, now);
}

function advanceEnergyShieldRechargeOnCrit(pStats, now) {
    return effects.advanceRecharge(game, pStats, now);
}

function triggerUniqueEnergyShieldBreakRecharge(pStats, energyShieldBeforeHit, now) {
    return effects.breakRecharge(game, pStats, energyShieldBeforeHit, now);
}

function getEquippedUniqueJewels(owner = game) {
    return values.uniqueSocketedJewels(getSocketedJewels(owner));
}

function getLabyrinthShacklesDamageMultiplier(moveSpeed) {
    return values.labyrinthShacklesMultiplier(moveSpeed);
}

function getAbsoluteFloorDamageRoll(maxDamageRoll) {
    return values.absoluteFloorDamageRoll(maxDamageRoll);
}

function getSolitaryHuntDoubleStrikeBonus(originalTargets) {
    return values.solitaryHuntDoubleStrike(originalTargets, ASCENDANCY_KEYSTONE_VALUES.h7);
}

function isDeferredTalentProjectileTargetEffect(effect) {
    return values.deferredTalentTargetEffect(effect);
}

function applyTimedRewardStats(tick, bucket) {
    growth.timed(tick, bucket);
}

function grantEliteTraitBuffFromEnemy(enemy, stats) { return presentPlayerStatEvent(playerGrantEliteTraitOnKill(statEventEnv, enemy, stats)); }

function finishPlayerStats(core, includeBreakdowns) {
    return finalizer.finish(game, core, includeBreakdowns);
}

function appendPlayerDpsBreakdowns(stats, summonEstimate) {
    return descriptions.appendDps(stats, summonEstimate);
}

function getGemPresentation(name, isSupport, statsOverride) {
    return presentation.read(game, name, isSupport, statsOverride || window.getPlayerStats());
}

function getSupportGemPresentation(name, stats, targetGemSources, activeTierOf) {
    return presentation.support(game, name, { stats, sources: targetGemSources }, activeTierOf);
}

function getSupportGemTier(name, gem, activeTierOf) {
    return presentation.tier(name, gem, activeTierOf);
}

function getSkillGemLevels(name, db, gem, targetGemSources) {
    return presentation.levels(name, db, gem, targetGemSources);
}

function getAscendancyNodeStatMultipliers(tick, maxLife) {
    return ascendancy.nodeMultipliers(game, tick, maxLife);
}

function getPlayerStats(includeBreakdowns = !game.isBackgroundCalculation, attributesOnly = false, equipmentView = false, tick = null) {
    if (!equipmentView) return combatEquipmentStats.read(includeBreakdowns);
    const keepCore = tick !== null;
    tick = tick || playerStatTick.create();
    const result = pipeline.calculate(game, { includeBreakdowns, attributesOnly, tick });
    return attributesOnly || keepCore ? result : finishPlayerStats(result, includeBreakdowns);
}

// Preserve the stable equipment/cache entry even when diagnostics replace the public getPlayerStats hook.
const equipmentStatCalculator = getPlayerStats;
const statEventEnv = { get owner() { return game; }, deps: {
    get grantTalentStoneShield() { return typeof grantTalentStoneShield === 'undefined' ? undefined : grantTalentStoneShield; },
    get getCombatTime() { return getCombatTime; }, get _t() { return _t; }
} };
const statEventEffects = { get addLog() { return addLog; }, get addBattleFx() { return addBattleFx; } };
function presentPlayerStatEvent(events) {
    let step = events.next();
    while (!step.done) {
        const { kind, args } = step.value;
        step = events.next(statEventEffects[kind](...args));
    }
    return step.value;
}
safeExposeGlobals({ getAscendancyNodeStatMultipliers, collectCooldownStats, getProjectileTargetBreakdowns, collectOceanStats, applySituationalTakenReduction, grantTalentStoneShieldOnBlock, recoverEnergyShieldOnBlock, consumeLoneEvasionCounterMultiplier, advanceEnergyShieldRechargeOnCrit, triggerUniqueEnergyShieldBreakRecharge, getEquippedUniqueJewels, getLabyrinthShacklesDamageMultiplier, getAbsoluteFloorDamageRoll, getSolitaryHuntDoubleStrikeBonus, isDeferredTalentProjectileTargetEffect, applyTimedRewardStats, grantEliteTraitBuffFromEnemy, finishPlayerStats, appendPlayerDpsBreakdowns, getGemPresentation, getSupportGemPresentation, getSupportGemTier, getSkillGemLevels, getPlayerStats, equipmentStatCalculator });
