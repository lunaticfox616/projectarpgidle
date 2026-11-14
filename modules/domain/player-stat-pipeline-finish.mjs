// Ordered, per-evaluation stages; c is private scratch state, never saved or shared between calls.

export function applyAscendancy(c, s) {
    c.ascendancyResult = s.ascendancy.transform(captureAscendancyState(c), c);
    ({
        finalBaseDmg: c.finalBaseDmg, finalRegen: c.finalRegen, warriorTakenDamageMultiplier: c.warriorTakenDamageMultiplier, finalAspd: c.finalAspd,
        finalCrit: c.finalCrit, finalCritDmg: c.finalCritDmg, finalEvasion: c.finalEvasion, finalMaxDmgRoll: c.finalMaxDmgRoll,
        finalResPen: c.finalResPen, finalMaxHp: c.finalMaxHp, sbSummonAspdBonus: c.sbSummonAspdBonus, warriorPhysDamageMultiplier: c.warriorPhysDamageMultiplier,
        finalArmor: c.finalArmor, finalPhysIgnore: c.finalPhysIgnore, allowNegativePhysIgnore: c.allowNegativePhysIgnore, finalMove: c.finalMove,
        finalDamageMultiplier: c.finalDamageMultiplier, finalDs: c.finalDs, rawDr: c.rawDr, finalDr: c.finalDr,
        swiftOpeningTakenMultiplier: c.swiftOpeningTakenMultiplier, bossDamageDealtMultiplier: c.bossDamageDealtMultiplier, bossTakenDamageMultiplier: c.bossTakenDamageMultiplier, finalEnergyShieldRegenRate: c.finalEnergyShieldRegenRate,
        finalEnergyShield: c.finalEnergyShield, finalMinDmgRoll: c.finalMinDmgRoll, totalProjectileExtraShots: c.totalProjectileExtraShots, crusaderLightningIgnoreRes: c.crusaderLightningIgnoreRes,
        crusaderNoResPenOnLightning: c.crusaderNoResPenOnLightning, finalMaxResL: c.finalMaxResL, crusaderLightningMaxResBonus: c.crusaderLightningMaxResBonus, finalEnergyShieldRechargeDelay: c.finalEnergyShieldRechargeDelay,
        crusaderHolyFlatDmg: c.crusaderHolyFlatDmg, crusaderHolyScaledDmg: c.crusaderHolyScaledDmg, elementalistChaosConversionBonus: c.elementalistChaosConversionBonus, finalResChaos: c.finalResChaos,
        ailmentPowerMultiplier: c.ailmentPowerMultiplier, chaosDamageMultiplier: c.chaosDamageMultiplier, totalDotDamageMultiplier: c.totalDotDamageMultiplier, instantDamageMultiplier: c.instantDamageMultiplier,
        finalLeech: c.finalLeech, finalSpellLeech: c.finalSpellLeech, dotTickIntervalMultiplier: c.dotTickIntervalMultiplier, dotDurationMultiplier: c.dotDurationMultiplier,
        guardianArmorDamageBonus: c.guardianArmorDamageBonus, genericTakenDamageMultiplier: c.genericTakenDamageMultiplier, guardianReflectDamage: c.guardianReflectDamage, guardianDamageNullifyChance: c.guardianDamageNullifyChance,
        ailmentResistBonusPct: c.ailmentResistBonusPct, guardianHitCapPct: c.guardianHitCapPct, inquisitorAbsoluteDoctrinePct: c.inquisitorAbsoluteDoctrinePct, sbPlayerAttackPower: c.sbPlayerAttackPower,
        sbSummonAttackPower: c.sbSummonAttackPower, sbSummonShareToPlayer: c.sbSummonShareToPlayer
    } = c.ascendancyResult);
    ({ lastStandMaxHp: c.lastStandMaxHp } = c.ascendancyResult);
}

export function finishDefenseAndScales(c, s) {
    c.defenseTransformResult = s.finalMath.defenseTransform(c);
    ({
        finalCritDmg: c.finalCritDmg, finalArmor: c.finalArmor, finalEvasion: c.finalEvasion, armorReduction: c.armorReduction,
        evadeChance: c.evadeChance
    } = c.defenseTransformResult);
    c.damageScales.dot = c.dotMultiplier;
    c.damageScales.dotStat = c.dotStatMultiplier;
    c.damageScales.instantDamageMultiplier = c.instantDamageMultiplier;
    c.damageScales.finalDamageMultiplier = c.finalDamageMultiplier;
    c.damageScales.ailmentPowerMultiplier = c.ailmentPowerMultiplier;
    c.damageScales.chaosDamageMultiplier = c.chaosDamageMultiplier;
    c.damageScales.dotTickIntervalMultiplier = c.dotTickIntervalMultiplier;
    c.damageScales.dotDurationMultiplier = c.dotDurationMultiplier;
    c.damageScales.warlockElementalOvercapToChaos = c.warlockElementalOvercapToChaos;
}

export function finishCriticalEstimate(c, s) {
    c.criticalCapResult = s.finalMath.criticalCap(c);
    ({
        finalCritDmg: c.finalCritDmg, finalCrit: c.finalCrit
    } = c.criticalCapResult);
    c.varianceResult = s.finalMath.variance(c);
    ({
        finalBaseDmg: c.finalBaseDmg, finalMaxDmgRoll: c.finalMaxDmgRoll, finalMinDmgRoll: c.finalMinDmgRoll, finalCritDmg: c.finalCritDmg,
        finalDs: c.finalDs, finalEvasion: c.finalEvasion
    } = c.varianceResult);
    c.criticalEstimateResult = s.finalMath.criticalEstimate(c);
    ({
        rawFinalCritDmg: c.rawFinalCritDmg, critDmgSoftcapReduction: c.critDmgSoftcapReduction
    } = c.criticalEstimateResult);
    ({
        finalCritDmg: c.finalCritDmg, critChance: c.critChance, critMulti: c.critMulti, avgHit: c.avgHit,
        finalDps: c.finalDps
    } = c.criticalEstimateResult);
}

export function estimateDamage(c, s, deps) {
    c.coreCubeAddedDamageLabels = { phys: '물리', fire: '화염', cold: '냉기', light: '번개', chaos: '카오스' };
    c.coreCubeAddedDamageParts = Object.keys(c.coreCubeAddedDamagePct)
        .filter(ele => Math.max(0, Number(c.coreCubeAddedDamagePct[ele] || 0)) > 0)
        .map(ele => `${deps.translate(c.coreCubeAddedDamageLabels[ele])} ${Math.floor(c.coreCubeAddedDamagePct[ele])}%`);
    c.dpsEstimate = s.dps.estimate(c);
    ({
        avgRollMultiplier: c.avgRollMultiplier, expectedDoubleStrikeMultiplier: c.expectedDoubleStrikeMultiplier, coreCubeAddedDamageTotalPct: c.coreCubeAddedDamageTotalPct, expectedAddedDamageMultiplier: c.expectedAddedDamageMultiplier,
        warriorPhysicalDpsMultiplier: c.warriorPhysicalDpsMultiplier, finalDpsAdjusted: c.finalDpsAdjusted, isProjectileSkillForDps: c.isProjectileSkillForDps, projectileExtraShotsForDps: c.projectileExtraShotsForDps,
        projectileBonusShotDamagePct: c.projectileBonusShotDamagePct, projectileExtraShotDpsMul: c.projectileExtraShotDpsMul, estimatedSkillDotDps: c.estimatedSkillDotDps, nativeDotPattern: c.nativeDotPattern,
        skillSequenceDpsMultiplier: c.skillSequenceDpsMultiplier, fanSpread: c.fanSpread, finalDpsWithProjectileShots: c.finalDpsWithProjectileShots, finalPlayerSkillDps: c.finalPlayerSkillDps
    } = c.dpsEstimate);
    c.flameDecayIgniteTakenMultiplierPreview = c.skill.flameDecayDebuff ? deps.flameDecayTaken({ maxHp: c.finalMaxHp, sSkill: c.skill }) : 1;
    c.flameDecayDpsLines = c.includeBreakdowns && c.skill.flameDecayDebuff ? s.descriptions.flameDecay(c) : [];
}

export function applyWardVitals(c, s) {
    c.wardMaximaResult = s.finalMath.wardMaxima(c);
    ({
        finalMaxResF: c.finalMaxResF, finalMaxResC: c.finalMaxResC, finalMaxResL: c.finalMaxResL, finalMaxResChaos: c.finalMaxResChaos
    } = c.wardMaximaResult);
    c.wardVitalsResult = s.finalMath.wardVitals(c);
    ({
        riderCompassEvasionMorePct: c.riderCompassEvasionMorePct
    } = c.wardVitalsResult);
    ({
        finalMaxHp: c.finalMaxHp, finalArmor: c.finalArmor, finalEvasion: c.finalEvasion, armorReduction: c.armorReduction,
        evadeChance: c.evadeChance, finalEnergyShield: c.finalEnergyShield
    } = c.wardVitalsResult);
}

export function applyWardResistances(c, s) {
    c.wardResistanceResult = s.finalMath.wardResistance(c);
    ({
        rawDr: c.rawDr, finalDr: c.finalDr, finalResF: c.finalResF, finalResC: c.finalResC,
        finalResL: c.finalResL, finalResChaos: c.finalResChaos, finalRegen: c.finalRegen, finalEnergyShieldRegenRate: c.finalEnergyShieldRegenRate,
        finalCritResist: c.finalCritResist
    } = c.wardResistanceResult);
    c.wardAilmentDefenseResult = s.finalMath.wardAilmentDefense(c);
    ({
        finalDotTakenDamageReducePct: c.finalDotTakenDamageReducePct, finalIgniteDamageReducePct: c.finalIgniteDamageReducePct, finalBleedDamageReducePct: c.finalBleedDamageReducePct, finalPoisonDamageReducePct: c.finalPoisonDamageReducePct,
        finalTakenDamageReduceWhen2EnemiesPct: c.finalTakenDamageReduceWhen2EnemiesPct, finalTakenDamageReduceWhen1EnemyPct: c.finalTakenDamageReduceWhen1EnemyPct
    } = c.wardAilmentDefenseResult);
    c.medicineResult = s.finalMath.medicine(c);
    ({
        uncappedResF: c.uncappedResF, uncappedResC: c.uncappedResC, uncappedResL: c.uncappedResL, uncappedResChaos: c.uncappedResChaos,
        medicineResistanceAilmentBonus: c.medicineResistanceAilmentBonus
    } = c.medicineResult);
}

export function finishAilmentsAndBlock(c, s) {
    c.ailmentResistanceResult = s.finalMath.ailmentResistance(c);
    ({
        ailResIgniteTotal: c.ailResIgniteTotal, ailResFreezeTotal: c.ailResFreezeTotal, ailResShockTotal: c.ailResShockTotal, ailResPoisonTotal: c.ailResPoisonTotal,
        ailResBleedTotal: c.ailResBleedTotal, finalAilmentResistIgniteChance: c.finalAilmentResistIgniteChance, finalAilmentResistChillChance: c.finalAilmentResistChillChance, finalAilmentResistFreezeChance: c.finalAilmentResistFreezeChance,
        finalAilmentResistShockChance: c.finalAilmentResistShockChance, finalAilmentResistPoisonChance: c.finalAilmentResistPoisonChance, finalAilmentResistBleedChance: c.finalAilmentResistBleedChance, catalystAilmentSourceMultiplier: c.catalystAilmentSourceMultiplier
    } = c.ailmentResistanceResult);
    c.blockResult = s.finalMath.block(c);
    ({
        effectiveShieldBaseBlockChance: c.effectiveShieldBaseBlockChance, blockChanceFromOtherPct: c.blockChanceFromOtherPct, flatBlockChanceBonus: c.flatBlockChanceBonus, finalBlockChanceCap: c.finalBlockChanceCap,
        finalBlockChance: c.finalBlockChance
    } = c.blockResult);
}

// Snapshot before ordered class transforms; input c stays unchanged until all transforms finish.
function captureAscendancyState(c) {
    return {
        finalBaseDmg: c.finalBaseDmg,
        finalRegen: c.finalRegen,
        warriorTakenDamageMultiplier: c.warriorTakenDamageMultiplier,
        finalAspd: c.finalAspd,
        finalCrit: c.finalCrit,
        finalCritDmg: c.finalCritDmg,
        finalEvasion: c.finalEvasion,
        finalMaxDmgRoll: c.finalMaxDmgRoll,
        finalResPen: c.finalResPen,
        finalMaxHp: c.finalMaxHp,
        sbSummonAspdBonus: c.sbSummonAspdBonus,
        warriorPhysDamageMultiplier: c.warriorPhysDamageMultiplier,
        finalArmor: c.finalArmor,
        finalPhysIgnore: c.finalPhysIgnore,
        allowNegativePhysIgnore: c.allowNegativePhysIgnore,
        finalMove: c.finalMove,
        finalDamageMultiplier: c.finalDamageMultiplier,
        finalDs: c.finalDs,
        rawDr: c.rawDr,
        finalDr: c.finalDr,
        swiftOpeningTakenMultiplier: c.swiftOpeningTakenMultiplier,
        bossDamageDealtMultiplier: c.bossDamageDealtMultiplier,
        bossTakenDamageMultiplier: c.bossTakenDamageMultiplier,
        finalEnergyShieldRegenRate: c.finalEnergyShieldRegenRate,
        finalEnergyShield: c.finalEnergyShield,
        finalMinDmgRoll: c.finalMinDmgRoll,
        totalProjectileExtraShots: c.totalProjectileExtraShots,
        crusaderLightningIgnoreRes: c.crusaderLightningIgnoreRes,
        crusaderNoResPenOnLightning: c.crusaderNoResPenOnLightning,
        finalMaxResL: c.finalMaxResL,
        crusaderLightningMaxResBonus: c.crusaderLightningMaxResBonus,
        finalEnergyShieldRechargeDelay: c.finalEnergyShieldRechargeDelay,
        crusaderHolyFlatDmg: c.crusaderHolyFlatDmg,
        crusaderHolyScaledDmg: c.crusaderHolyScaledDmg,
        elementalistChaosConversionBonus: c.elementalistChaosConversionBonus,
        finalResChaos: c.finalResChaos,
        ailmentPowerMultiplier: c.ailmentPowerMultiplier,
        chaosDamageMultiplier: c.chaosDamageMultiplier,
        totalDotDamageMultiplier: c.totalDotDamageMultiplier,
        instantDamageMultiplier: c.instantDamageMultiplier,
        finalLeech: c.finalLeech,
        finalSpellLeech: c.finalSpellLeech,
        dotTickIntervalMultiplier: c.dotTickIntervalMultiplier,
        dotDurationMultiplier: c.dotDurationMultiplier,
        guardianArmorDamageBonus: c.guardianArmorDamageBonus,
        genericTakenDamageMultiplier: c.genericTakenDamageMultiplier,
        guardianReflectDamage: c.guardianReflectDamage,
        guardianDamageNullifyChance: c.guardianDamageNullifyChance,
        ailmentResistBonusPct: c.ailmentResistBonusPct,
        guardianHitCapPct: c.guardianHitCapPct,
        inquisitorAbsoluteDoctrinePct: c.inquisitorAbsoluteDoctrinePct,
        sbPlayerAttackPower: c.sbPlayerAttackPower,
        sbSummonAttackPower: c.sbSummonAttackPower,
        sbSummonShareToPlayer: c.sbSummonShareToPlayer
    };
}
