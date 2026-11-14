import { sumOrderedPlayerStatSources } from '../common/stat-bucket.mjs';
// Ordered, per-evaluation stages; c is private scratch state, never saved or shared between calls.

export function prepareCriticalMovement(c) {
    c.gearCrit = c.gearBase.crit + c.gearExplicit.crit;
    c.passiveCrit = c.passive.crit + c.season.crit + c.ascend.crit + c.reward.crit;
    c.finalCrit = (2.5 + c.gearCrit + c.passiveCrit + c.support.crit + (c.skill.crit || 0)) * 0.82;
    c.finalMove = c.baseMove + c.gearBase.move + c.gearExplicit.move + c.passive.move + c.season.move + c.ascend.move + c.support.move + c.reward.move + c.starBlessing.move;
    if (c.authoredPassiveRules.flags.bloodAcceleration && c.tick.get('leechActive')) c.finalMove *= 1.15;
    c.danceStacks = c.uniqueEvasionDance ? c.tick.get('evasionDanceStacks') : null;
    c.activeEvasionDanceStacks = c.danceStacks !== null
        ? Math.max(0, Math.min(c.uniqueEvasionDance.maxStacks, c.danceStacks))
        : 0;
    if (c.activeEvasionDanceStacks > 0) c.finalMove += c.activeEvasionDanceStacks * Math.max(0, c.uniqueEvasionDance.movePerStack);
    c.owner.oceanOxygenMaxBonus = Math.max(0, c.gearBase.oxygenMax + c.gearExplicit.oxygenMax + c.passive.oxygenMax + c.season.oxygenMax + c.ascend.oxygenMax + c.reward.oxygenMax);
    c.owner.oceanOxygenDrainReductionPct = Math.max(0, Math.min(80, c.gearBase.oxygenRegen + c.gearExplicit.oxygenRegen + c.passive.oxygenRegen + c.season.oxygenRegen + c.ascend.oxygenRegen + c.reward.oxygenRegen));
}

export function applyMovementEffects(c, s) {
    c.activeShadowStealth = c.uniqueDeflectStealth && c.tick.get('shadowStealth');
    if (c.activeShadowStealth) c.finalMove += Math.max(0, Number(c.uniqueDeflectStealth.move || 20));
    c.killMoveStacks = c.uniqueKillMoveStacks ? c.tick.get('killMoveStacks') : null;
    if (c.killMoveStacks !== null) c.finalMove += c.killMoveStacks * Math.max(0, Number(c.uniqueKillMoveStacks.movePerStack || 10));
    c.finalMove += c.tick.get('regionMoveBonus');
    c.regionResult = s.finalMath.region(c);
    ({
        zoneSpeedMultiplier: c.zoneSpeedMultiplier, oceanPressureDamageMul: c.oceanPressureDamageMul, oceanCurrentResPenaltyF: c.oceanCurrentResPenaltyF, oceanCurrentResPenaltyC: c.oceanCurrentResPenaltyC
    } = c.regionResult);
    ({
        finalAspd: c.finalAspd, finalMove: c.finalMove, playerAccuracy: c.playerAccuracy
    } = c.regionResult);
}

export function applyRegionDamage(c, deps) {
    c.currentStatsZone = deps.zone(c.owner.currentZoneId);
    c.activeCosmosMastery = c.currentStatsZone && c.currentStatsZone.type === 'cosmos' && typeof deps.cosmosMastery === 'function';
    c.cosmosMasteryFinalDamagePct = c.activeCosmosMastery ? Math.max(0, Number(deps.cosmosMastery('resonanceDrive')) || 0) * 0.6 : 0;
    c.cosmosMasteryTakenLessPct = c.activeCosmosMastery ? Math.max(0, Number(deps.cosmosMastery('riftGuard')) || 0) * 0.7 : 0;
    c.cosmosMasteryBossDamagePct = c.activeCosmosMastery ? Math.max(0, Number(deps.cosmosMastery('starbreaker')) || 0) * 1.8 : 0;
    c.finalDamageMultiplier = (1 + c.cosmosMasteryFinalDamagePct / 100) * c.oceanPressureDamageMul;
    c.finalDamageMultiplier *= 1 + Math.max(0, c.authoredPassiveRules.combatDamageMorePct) / 100;
    c.finalDamageMultiplier *= 1 + deps.loopMorePct(c.owner.loopDeepStats) / 100;
    c.finalDamageMultiplier *= 1 + deps.barkEffect().damagePct / 100;
}

export function applyConditionalDamage(c, deps) {
    if (c.authoredPassiveRules.flags.selfExperiment) c.finalDamageMultiplier *= 1 + c.tick.get('playerAilmentCount') * 0.05;
    c.wisdomLeapActive = typeof deps.passiveNode === 'function'
        && !!deps.passiveNode('지혜의 도약');
    c.passiveWisdomElement = c.wisdomLeapActive ? c.authoredPassiveRules.wisdomElement : '';
    if (c.authoredPassiveRules.fanaticismStacks > 0) {
        c.finalDamageMultiplier *= 1 + c.authoredPassiveRules.fanaticismStacks * 0.015;
    }
    c.cosmosBossDamageMorePct = Math.max(c.cosmosBossDamageMorePct, c.cosmosMasteryBossDamagePct);
    if (c.uniqueLabyrinthShackles) {
        c.finalDamageMultiplier *= deps.shacklesMultiplier(c.finalMove);
        c.finalMove = 100;
    }
}

export function prepareDefenses(c, s) {
    ({ totalArmorPct: c.totalArmorPct, totalEvasionPct: c.totalEvasionPct, totalEnergyShieldPct: c.totalEnergyShieldPct, finalArmor: c.finalArmor, finalEvasion: c.finalEvasion, finalEnergyShield: c.finalEnergyShield } = s.math.defenseBase(c));
    c.shieldBonusesResult = s.math.shieldBonuses(c);
    ({ omniscientActive: c.omniscientActive } = c.shieldBonusesResult);
    ({ finalEnergyShield: c.finalEnergyShield } = c.shieldBonusesResult);
    ({ finalEnergyShieldRegenRate: c.finalEnergyShieldRegenRate, finalEnergyShieldRechargeDelay: c.finalEnergyShieldRechargeDelay, referenceIncomingPhysical: c.referenceIncomingPhysical, armorReduction: c.armorReduction, enemyAccuracy: c.enemyAccuracy, evadeChance: c.evadeChance, finalDeflectChance: c.finalDeflectChance, finalDeflectDamageReduce: c.finalDeflectDamageReduce } = s.math.defenseRates(c));
    ({ finalCritDmg: c.finalCritDmg, rawLeech: c.rawLeech, wildnessLeech: c.wildnessLeech, finalLeech: c.finalLeech, finalSpellLeech: c.finalSpellLeech } = s.math.leech(c));
    c.leechCapsResult = s.math.leechCaps(c);
    ({ finalLeechRateCap: c.finalLeechRateCap, finalLeechTotalCap: c.finalLeechTotalCap, finalLeechInstanceCap: c.finalLeechInstanceCap, finalLeechKeepFullLife: c.finalLeechKeepFullLife } = c.leechCapsResult);
    ({ finalLeech: c.finalLeech, finalSpellLeech: c.finalSpellLeech } = c.leechCapsResult);
    ({ rawDr: c.rawDr, finalDr: c.finalDr, finalPhysIgnore: c.finalPhysIgnore } = s.math.physicalMitigation(c));
}

export function applyPassiveDefenseCosts(c, deps) {
    c.allowNegativePhysIgnore = false;
    c.warriorPhysDamageMultiplier = 1;
    c.warriorTakenDamageMultiplier = 1;
    c.genericTakenDamageMultiplier = 1;
    c.genericTakenDamageMultiplier *= 1 - Math.max(0, c.authoredPassiveRules.guardTakenLessPct) / 100;
    c.forbiddenManifestation = typeof deps.passiveNode === 'function' && deps.passiveNode('금단의 만상');
    if (c.forbiddenManifestation) {
        c.finalArmor = Math.floor(c.finalArmor * 0.4);
        c.finalEvasion = Math.floor(c.finalEvasion * 0.4);
        c.finalEnergyShield = Math.floor(c.finalEnergyShield * 0.4);
        c.finalDeflectChance = Math.min(25, c.finalDeflectChance);
    }
    if (c.authoredPassiveRules.fanaticismStacks > 0) {
        let defenseMultiplier = Math.max(0, 1 - c.authoredPassiveRules.fanaticismStacks * 0.0075);
        c.finalArmor = Math.floor(c.finalArmor * defenseMultiplier);
        c.finalEvasion = Math.floor(c.finalEvasion * defenseMultiplier);
        c.finalEnergyShield = Math.floor(c.finalEnergyShield * defenseMultiplier);
        c.finalAspd = Math.min(12, c.finalAspd * (1 + c.authoredPassiveRules.fanaticismStacks * 0.005));
    }
}

export function prepareTakenReduction(c) {
    c.genericTakenDamageReducePct = Math.max(0, Math.min(90, (c.gearBase.genericTakenDamageReducePct || 0) + (c.gearExplicit.genericTakenDamageReducePct || 0) + (c.passive.genericTakenDamageReducePct || 0) + (c.season.genericTakenDamageReducePct || 0) + (c.ascend.genericTakenDamageReducePct || 0) + (c.support.genericTakenDamageReducePct || 0) + (c.reward.genericTakenDamageReducePct || 0)));
    c.genericTakenDamageMultiplier *= (1 - c.genericTakenDamageReducePct / 100);
}

export function prepareAscendancyDefaults(c) {
    c.bossDamageDealtMultiplier = 1;
    c.bossTakenDamageMultiplier = 1;
    c.ailmentResistBonusPct = 0;
    c.inquisitorAbsoluteDoctrinePct = 0;
    c.swiftOpeningTakenMultiplier = 1;
    c.guardianReflectDamage = 0;
    c.guardianBlockChance = 0;
    c.guardianDamageNullifyChance = 0;
    c.guardianHitCapPct = 0;
    c.guardianArmorDamageBonus = false;
    c.sbSummonAspdBonus = 0;
    c.sbPlayerAttackPower = 0;
    c.sbSummonAttackPower = 0;
    c.sbSummonShareToPlayer = 0;
    c.ailmentResistPenPct = 0;
    c.crusaderLightningIgnoreRes = false;
    c.crusaderNoResPenOnLightning = false;
    c.crusaderHolyFlatDmg = 0;
    c.crusaderHolyScaledDmg = 0;
}

export function prepareRepeatAndRecovery(c) {
    c.baseDsFromSources = c.gearBase.ds + c.gearExplicit.ds + c.passive.ds + c.season.ds + c.ascend.ds + c.support.ds + c.reward.ds;
    c.skillDsBonus = c.skill.dsBonus || 0;
    c.finalDs = c.baseDsFromSources + c.skillDsBonus;
    c.finalSlamEchoChance = c.gearBase.slamEchoChance + c.gearExplicit.slamEchoChance + c.passive.slamEchoChance + c.season.slamEchoChance + c.ascend.slamEchoChance + c.support.slamEchoChance + c.reward.slamEchoChance;
    c.finalSlamEchoDamagePct = Math.max(0, c.coreCubeSlamEchoDamagePct || 0);
    c.finalRegen = c.gearBase.regen + c.gearExplicit.regen + c.passive.regen + c.season.regen + c.ascend.regen + c.support.regen + c.reward.regen + (c.skill.regenBonus || 0);
    c.flatRegen = c.gearBase.regenFlat + c.gearExplicit.regenFlat + c.passive.regenFlat + c.season.regenFlat + c.ascend.regenFlat + c.support.regenFlat + c.reward.regenFlat;
    c.finalRegen += (c.flatRegen / Math.max(1, c.finalMaxHp)) * 100;
    if (c.cosmosTideEsRegenToLife) { c.finalRegen += Math.max(0, c.finalEnergyShieldRegenRate); c.finalEnergyShieldRegenRate = 0; }
    if (c.activeUniqueIds.has('uj_hurried_mind')) {
        if (c.tick.get('aliveEnemies') === 0) c.finalMove *= 1.5;
    }
    c.finalRegenSuppress = c.gearBase.regenSuppress + c.gearExplicit.regenSuppress + c.passive.regenSuppress + c.season.regenSuppress + c.ascend.regenSuppress + c.support.regenSuppress + c.reward.regenSuppress;
    c.finalResPen = c.gearBase.resPen + c.gearExplicit.resPen + c.passive.resPen + c.season.resPen + c.ascend.resPen + c.support.resPen + c.reward.resPen + (c.skill.resPenBonus || 0);
}

export function prepareAilmentReduction(c) {
    c.finalChillEffectReducePct = c.gearBase.chillEffectReducePct + c.gearExplicit.chillEffectReducePct + c.passive.chillEffectReducePct + c.season.chillEffectReducePct + c.ascend.chillEffectReducePct + c.support.chillEffectReducePct + c.reward.chillEffectReducePct;
    c.finalFreezeDurationReducePct = c.gearBase.freezeDurationReducePct + c.gearExplicit.freezeDurationReducePct + c.passive.freezeDurationReducePct + c.season.freezeDurationReducePct + c.ascend.freezeDurationReducePct + c.support.freezeDurationReducePct + c.reward.freezeDurationReducePct;
    c.finalShockEffectReducePct = c.gearBase.shockEffectReducePct + c.gearExplicit.shockEffectReducePct + c.passive.shockEffectReducePct + c.season.shockEffectReducePct + c.ascend.shockEffectReducePct + c.support.shockEffectReducePct + c.reward.shockEffectReducePct;
    c.finalCritResist = sumOrderedPlayerStatSources(c, 'critResist');
    c.finalIgniteDamageReducePct = c.gearBase.igniteDamageReducePct + c.gearExplicit.igniteDamageReducePct + c.passive.igniteDamageReducePct + c.season.igniteDamageReducePct + c.ascend.igniteDamageReducePct + c.support.igniteDamageReducePct + c.reward.igniteDamageReducePct;
    c.finalBleedDamageReducePct = c.gearBase.bleedDamageReducePct + c.gearExplicit.bleedDamageReducePct + c.passive.bleedDamageReducePct + c.season.bleedDamageReducePct + c.ascend.bleedDamageReducePct + c.support.bleedDamageReducePct + c.reward.bleedDamageReducePct;
    c.finalPoisonDamageReducePct = c.gearBase.poisonDamageReducePct + c.gearExplicit.poisonDamageReducePct + c.passive.poisonDamageReducePct + c.season.poisonDamageReducePct + c.ascend.poisonDamageReducePct + c.support.poisonDamageReducePct + c.reward.poisonDamageReducePct;
    c.finalDotTakenDamageReducePct = c.gearBase.dotTakenDamageReducePct + c.gearExplicit.dotTakenDamageReducePct + c.passive.dotTakenDamageReducePct + c.season.dotTakenDamageReducePct + c.ascend.dotTakenDamageReducePct + c.support.dotTakenDamageReducePct + c.reward.dotTakenDamageReducePct;
    c.finalTakenDamageReduceWhen2EnemiesPct = c.gearBase.takenDamageReduceWhen2EnemiesPct + c.gearExplicit.takenDamageReduceWhen2EnemiesPct + c.passive.takenDamageReduceWhen2EnemiesPct + c.season.takenDamageReduceWhen2EnemiesPct + c.ascend.takenDamageReduceWhen2EnemiesPct + c.support.takenDamageReduceWhen2EnemiesPct + c.reward.takenDamageReduceWhen2EnemiesPct;
    c.finalTakenDamageReduceWhen1EnemyPct = c.gearBase.takenDamageReduceWhen1EnemyPct + c.gearExplicit.takenDamageReduceWhen1EnemyPct + c.passive.takenDamageReduceWhen1EnemyPct + c.season.takenDamageReduceWhen1EnemyPct + c.ascend.takenDamageReduceWhen1EnemyPct + c.support.takenDamageReduceWhen1EnemyPct + c.reward.takenDamageReduceWhen1EnemyPct;
    c.finalIgniteDamageMultiplierPct = c.gearBase.igniteDamageMultiplierPct + c.gearExplicit.igniteDamageMultiplierPct + c.passive.igniteDamageMultiplierPct + c.season.igniteDamageMultiplierPct + c.ascend.igniteDamageMultiplierPct + c.support.igniteDamageMultiplierPct + c.reward.igniteDamageMultiplierPct;
    c.finalPoisonDamageMultiplierPct = c.gearBase.poisonDamageMultiplierPct + c.gearExplicit.poisonDamageMultiplierPct + c.passive.poisonDamageMultiplierPct + c.season.poisonDamageMultiplierPct + c.ascend.poisonDamageMultiplierPct + c.support.poisonDamageMultiplierPct + c.reward.poisonDamageMultiplierPct;
    c.finalChillEffectBonusPct = Math.max(0, c.sumStatAcrossBuckets('chillEffect'));
    c.finalShockEffectBonusPct = (c.gearExplicit.shockEffect || 0) + (c.passive.shockEffect || 0) + (c.season.shockEffect || 0) + (c.ascend.shockEffect || 0) + (c.reward.shockEffect || 0) + Math.max(0, Number(c.uniqueShockTracer && c.uniqueShockTracer.shockEffectPct || 0));
}

export function prepareDamageRange(c, deps) {
    c.finalMinDmgRoll = Math.max(5, 80 + c.gearBase.minDmgRoll + c.gearExplicit.minDmgRoll + c.passive.minDmgRoll + c.season.minDmgRoll + c.ascend.minDmgRoll + c.support.minDmgRoll + c.reward.minDmgRoll);
    c.finalMaxDmgRoll = Math.max(c.finalMinDmgRoll, 100 + c.gearBase.maxDmgRoll + c.gearExplicit.maxDmgRoll + c.passive.maxDmgRoll + c.season.maxDmgRoll + c.ascend.maxDmgRoll + c.support.maxDmgRoll + c.reward.maxDmgRoll);
    if (c.authoredPassiveRules.flags.maximumRoll) c.finalMinDmgRoll = c.finalMaxDmgRoll;
    if (c.uniqueMaxHpPct) c.finalMaxHp = Math.floor(c.finalMaxHp * (1 + Math.max(0, c.uniqueMaxHpPct) / 100));
    applyMeleeArmorStacks(c);
    if (c.uniqueMinRollEqualsMaxRoll) {
        c.finalMaxDmgRoll = deps.absoluteFloorRoll(c.finalMaxDmgRoll);
        c.finalMinDmgRoll = c.finalMaxDmgRoll;
    }
    if (c.uniqueHpToPhysPct && c.skill.ele === 'phys' && !c.skillHasElementalConversion) c.finalBaseDmg = Math.floor(c.finalBaseDmg * (1 + (c.finalMaxHp / 100) / 100));
}

function applyMeleeArmorStacks(c) {
    c.meleeArmorAmpStacks = c.uniqueMeleeArmorAmp ? c.tick.get('meleeArmorAmpStacks') : null;
    if (c.meleeArmorAmpStacks !== null) {
        let stacks = Math.max(0, Math.min(Math.floor(c.uniqueMeleeArmorAmp.maxStacks || 3), c.meleeArmorAmpStacks));
        if (stacks > 0) c.finalArmor = Math.floor(c.finalArmor * Math.pow(1 + Math.max(0, Number(c.uniqueMeleeArmorAmp.ampPct || 5)) / 100, stacks));
    }
}
