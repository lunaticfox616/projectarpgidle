import { sumOrderedPlayerStatSources } from '../common/stat-bucket.mjs';

// Ordered final public fields. Source buckets, skill and saved state remain owned by the caller.
function assembleRegion(input, deps) {
    return {
        activeZoneId: input.owner.currentZoneId,
        activeUnderworldFloor: input.currentStatsZone && input.currentStatsZone.type === 'underworld' ? input.currentStatsZone.floor : 0,
        zoneSpeedMultiplier: input.zoneSpeedMultiplier,
        zoneDamageMultiplier: input.oceanPressureDamageMul,
        underworldGravityReductionPct: Math.max(0, Math.min(75,
            typeof deps.skyReduction === 'function' ? deps.skyReduction() : 0)),
        baseDmg: input.finalBaseDmg,
        damageIncreasePct: Math.max(0, input.generalPctDmg + input.taggedTotal),
        maxHp: input.finalMaxHp,
        lifeRecoveryCap: deps.recoveryCap({ maxHp: input.finalMaxHp, uniqueOverhealCapPct: input.uniqueOverhealCapPct }, input.tick),
        aspd: input.finalAspd || 1.0,
        crit: input.finalCrit,
        rawCrit: input.finalCrit,
        moveSpeed: input.finalMove,
        sightRange: Math.max(0, input.gearBase.sight + input.gearExplicit.sight),
        sightCap: Math.max(0, input.gearExplicit.sightCap),
        chestGrade: Math.max(0, input.gearExplicit.chestGrade)
    };
}

function assembleMitigation(input) {
    return {
        chillEffectReducePct: input.finalChillEffectReducePct,
        critTakenDamageReducePct: input.sumStatAcrossBuckets('critTakenDamageReducePct'),
        igniteTakenDurationReducePct: input.sumStatAcrossBuckets('igniteTakenDurationReducePct'),
        shockTakenDurationReducePct: input.sumStatAcrossBuckets('shockTakenDurationReducePct'),
        coldTakenDurationReducePct: input.sumStatAcrossBuckets('coldTakenDurationReducePct'),
        poisonTakenDurationReducePct: input.sumStatAcrossBuckets('poisonTakenDurationReducePct'),
        bleedTakenDurationReducePct: input.sumStatAcrossBuckets('bleedTakenDurationReducePct'),
        freezeDurationReducePct: input.finalFreezeDurationReducePct,
        shockEffectReducePct: input.finalShockEffectReducePct,
        igniteDamageReducePct: input.finalIgniteDamageReducePct,
        bleedDamageReducePct: input.finalBleedDamageReducePct,
        poisonDamageReducePct: input.finalPoisonDamageReducePct,
        fireTakenDamageReducePct: Math.max(0, input.colonyWardBonus.fireTakenDamageReducePct || 0),
        coldTakenDamageReducePct: Math.max(0, input.colonyWardBonus.coldTakenDamageReducePct || 0),
        lightTakenDamageReducePct: Math.max(0, input.colonyWardBonus.lightTakenDamageReducePct || 0),
        chaosTakenDamageReducePct: Math.max(0, input.colonyWardBonus.chaosTakenDamageReducePct || 0),
        dotTakenDamageReducePct: input.finalDotTakenDamageReducePct,
        takenDamageReduceWhen2EnemiesPct: input.finalTakenDamageReduceWhen2EnemiesPct,
        takenDamageReduceWhen1EnemyPct: input.finalTakenDamageReduceWhen1EnemyPct,
        igniteDamageMultiplierPct: input.finalIgniteDamageMultiplierPct
    };
}

function assembleDamage(input) {
    return {
        dps: input.finalPlayerSkillDps || 0,
        hitDps: input.finalDpsWithProjectileShots || 0,
        packDps: (input.finalPlayerSkillDps || 0) * input.fanSpread.packMul,
        skillDotDps: input.estimatedSkillDotDps || 0,
        dpsBaseNoProjectileShots: input.finalDpsAdjusted || 0,
        critDmg: input.finalCritDmg,
        rawCritDmg: input.rawFinalCritDmg
    };
}

function assembleRecovery(input, deps) {
    return {
        regen: input.finalRegen,
        regenSuppress: input.finalRegenSuppress,
        leech: input.finalLeech,
        summonInheritedLeech: input.finalLeech * (deps.capLeech(input.rawLeech - input.wildnessLeech - input.support.leech) + input.wildnessLeech) / Math.max(0.0001, deps.capLeech(input.rawLeech - input.wildnessLeech) + input.wildnessLeech),
        spellLeech: input.finalSpellLeech,
        leechRateCap: input.finalLeechRateCap,
        leechTotalCap: input.finalLeechTotalCap,
        leechInstanceCap: input.finalLeechInstanceCap,
        leechKeepFullLife: input.finalLeechKeepFullLife,
        dr: input.finalDr,
        rawDr: input.rawDr
    };
}

function assembleGuard(input) {
    return {
        physIgnore: input.finalPhysIgnore,
        allowNegativePhysIgnore: input.allowNegativePhysIgnore,
        warriorPhysDamageMultiplier: input.warriorPhysDamageMultiplier,
        warriorTakenDamageMultiplier: input.warriorTakenDamageMultiplier,
        genericTakenDamageMultiplier: input.genericTakenDamageMultiplier,
        bossDamageDealtMultiplier: input.bossDamageDealtMultiplier,
        bossTakenDamageMultiplier: input.bossTakenDamageMultiplier,
        swiftOpeningTakenMultiplier: input.swiftOpeningTakenMultiplier,
        guardianReflectDamage: input.guardianReflectDamage,
        guardianBlockChance: input.guardianBlockChance,
        guardianDamageNullifyChance: input.guardianDamageNullifyChance,
        guardianHitCapPct: input.guardianHitCapPct,
        shieldBaseBlockChance: input.shieldBaseBlockChance,
        effectiveShieldBaseBlockChance: input.effectiveShieldBaseBlockChance,
        shieldBlockChancePct: input.shieldBlockChancePct,
        shieldBlockChanceFlat: input.shieldBlockChanceFlat,
        blockChance: input.finalBlockChance,
        blockChanceMax: input.finalBlockChanceCap,
        deflectChance: input.finalDeflectChance,
        deflectDamageReduce: input.finalDeflectDamageReduce,
        ailmentResistBonusPct: input.ailmentResistBonusPct,
        ailmentResistPenPct: input.ailmentResistPenPct,
        crusaderLightningIgnoreRes: input.crusaderLightningIgnoreRes,
        crusaderNoResPenOnLightning: input.crusaderNoResPenOnLightning
    };
}

function assembleSkill(input) {
    return {
        ds: input.finalDs,
        slamEchoChance: input.finalSlamEchoChance,
        slamEchoDamagePct: input.finalSlamEchoDamagePct,
        minDmgRoll: input.finalMinDmgRoll,
        maxDmgRoll: input.finalMaxDmgRoll,
        gemLv: input.gemSources.total,
        gemBonusSources: input.gemSources,
        glovePairAspdBonus: input.glovePairAspdBonus,
        suppCap: input.suppCap,
        expGain: input.season.expGain + input.reward.expGain + input.uniqueXpGainPct,
        sSkill: input.skill,
        resPen: input.finalResPen
    };
}

function assembleResistances(input) {
    return {
        resF: input.finalResF,
        rawResF: input.uncappedResF,
        resC: input.finalResC,
        rawResC: input.uncappedResC,
        resL: input.finalResL,
        rawResL: input.uncappedResL,
        maxResF: input.finalMaxResF,
        maxResC: input.finalMaxResC,
        maxResL: input.finalMaxResL,
        maxResChaos: input.finalMaxResChaos,
        resChaos: input.finalResChaos,
        rawResChaos: input.uncappedResChaos,
        critResist: Math.max(0, Math.min(80, input.finalCritResist)),
        ailResIgnite: input.ailResIgniteTotal,
        ailResShock: input.ailResShockTotal,
        ailResFreeze: input.ailResFreezeTotal,
        ailResPoison: input.ailResPoisonTotal,
        ailResBleed: input.ailResBleedTotal,
        ailmentResistIgniteChance: input.finalAilmentResistIgniteChance,
        ailmentResistChillChance: input.finalAilmentResistChillChance,
        ailmentResistFreezeChance: input.finalAilmentResistFreezeChance,
        ailmentResistShockChance: input.finalAilmentResistShockChance,
        ailmentResistPoisonChance: input.finalAilmentResistPoisonChance,
        ailmentResistBleedChance: input.finalAilmentResistBleedChance,
        resistPenalty: input.resistPenalty,
        dotDamageScale: input.totalDotDamageMultiplier,
        flameDecayIgniteTakenMultiplier: input.flameDecayIgniteTakenMultiplierPreview,
        dotCritBonusScale: input.dotMultiplier,
        instantDamageMultiplier: input.instantDamageMultiplier,
        finalDamageMultiplier: input.finalDamageMultiplier,
        ailmentPowerMultiplier: input.ailmentPowerMultiplier,
        ailmentDamagePct: input.finalAilmentDamagePct
    };
}

function assemblePassives(input, deps) {
    return {
        mystique: Math.max(0, input.passive.mystique),
        devotion: input.authoredPassiveRules.devotion,
        cycle: input.authoredPassiveRules.cycle,
        passiveRevelation: input.authoredPassiveRules.revelation,
        passiveRevelationLabel: input.authoredPassiveRules.revelationLabel,
        passiveRevelationCombatDamageMorePct: input.authoredPassiveRules.combatDamageMorePct,
        passiveRevelationGuardTakenLessPct: input.authoredPassiveRules.guardTakenLessPct,
        passiveRevelationLifeBonusPct: input.authoredPassiveRules.lifeBonusPct,
        passiveWisdomElement: input.passiveWisdomElement,
        mystiqueAilmentType: input.authoredPassiveRules.mystique.ailment,
        mystiqueAilmentDamagePct: input.authoredPassiveRules.mystique.damagePct,
        mystiqueAilmentPotencyPct: input.authoredPassiveRules.mystique.potencyPct,
        passiveForbiddenManifestation: !!input.forbiddenManifestation,
        passiveAshura: typeof deps.passiveNode === 'function' && !!deps.passiveNode('아슈라'),
        passiveCycleAddedFireFromPhysicalPct: input.authoredPassiveRules.cycleAddedFireFromPhysicalPct,
        passiveFanaticismStacks: input.authoredPassiveRules.fanaticismStacks,
        passiveKeystoneFlags: input.authoredPassiveRules.flags,
        passiveOmniscientTrueDamagePct: input.omniscientActive ? Math.min(25, input.totalStrength * 0.5) : 0,
        passiveAlwaysHit: !!input.barbarismKeystone,
        chillEffectBonusPct: input.finalChillEffectBonusPct,
        shockEffectBonusPct: input.finalShockEffectBonusPct,
        chaosDamageMultiplier: input.chaosDamageMultiplier,
        dotTickIntervalMultiplier: input.dotTickIntervalMultiplier,
        dotDurationMultiplier: input.dotDurationMultiplier,
        ailmentDurationPct: Object.fromEntries(['ignite', 'chill', 'freeze', 'shock', 'poison', 'bleed'].map(type => [type, input.sumStatAcrossBuckets(`${type}DurationPct`)]))
    };
}

function assembleAilments(input) {
    return {
        igniteChance: input.finalIgniteChance,
        chillChance: input.finalChillChance,
        freezeChance: input.finalFreezeChance,
        shockChance: input.finalShockChance,
        poisonChance: input.finalPoisonChance,
        bleedChance: input.finalBleedChance,
        ailmentCritChance: input.ailmentCritChance,
        damageScales: input.damageScales,
        randomElementDamagePct: input.randomElementDamagePct,
        addedDamagePctByElement: input.coreCubeAddedDamagePct,
        flatElementDamage: input.coreCubeFlatElementDamage,
        flatElementHitDamage: input.flatElementHitDamage,
        takenFlatReduce: input.coreCubeTakenFlatReduce,
        physTakenAs: input.coreCubePhysTakenAs,
        talismanBossFinalDmgBonusPct: input.talismanBossFinalDmgBonusPct
    };
}

function assembleAttributes(input) {
    return {
        armor: input.finalArmor,
        evasion: input.finalEvasion,
        energyShield: input.finalEnergyShield,
        armorReduction: input.armorReduction,
        evadeChance: input.evadeChance,
        enemyAccuracy: input.enemyAccuracy,
        accuracy: input.playerAccuracy,
        strength: input.totalStrength,
        dexterity: input.totalDexterity,
        intelligence: input.totalIntelligence,
        energyShieldRegenRate: input.finalEnergyShieldRegenRate,
        energyShieldRechargeDelay: input.finalEnergyShieldRechargeDelay,
        projectileExtraShots: Math.max(0, input.totalProjectileExtraShots),
        skillBaseTargets: input.skillBaseTargets,
        breakdowns: input.breakdowns
    };
}

function assembleUniqueHits(input) {
    return {
        uniqueClosedEyes: input.uniqueClosedEyes,
        uniqueShockInvertTaken: input.uniqueShockInvertTaken,
        uniqueAlwaysShock: input.uniqueAlwaysShock,
        uniqueProjectileDoubleStrikePct: input.uniqueProjectileDoubleStrikePct,
        uniqueChaosResDownOnHit: input.uniqueChaosResDownOnHit,
        uniqueCorpseExplode: input.uniqueCorpseExplode,
        uniqueInstantLeechPct: input.uniqueInstantLeechPct + Math.max(0, input.reward.uniqueInstantLeechPct || 0),
        uniqueDoubleDamageChancePct: input.uniqueDoubleDamageChancePct + Math.max(0, input.coreCubeDoubleDamageChance || 0),
        uniqueDoubleDamageMultiplier: 2 + Math.max(0, input.sumStatAcrossBuckets('doubleDamageMultiplierPct') || 0) / 100,
        uniqueEsRecoverOnCritPct: input.uniqueEsRecoverOnCritPct,
        uniqueEvasionDance: input.uniqueEvasionDance,
        uniqueLoneEvasionCounter: input.uniqueLoneEvasionCounter,
        uniqueCritAdvanceEsRecharge: input.uniqueCritAdvanceEsRecharge,
        uniqueEnergyShieldBreakRecharge: input.uniqueEnergyShieldBreakRecharge,
        uniqueRiderCompass: input.uniqueRiderCompass,
        uniqueMaxRollBonusHit: input.uniqueMaxRollBonusHit,
        uniqueCeilingSmashDouble: input.uniqueCeilingSmashDouble,
        uniqueUnderdogMorePct: input.uniqueUnderdogMorePct,
        uniqueInstakillNormalPct: input.uniqueInstakillNormalPct,
        uniqueProjExtraShotChance: input.uniqueProjExtraShotChance,
        uniqueConditionManual: input.uniqueConditionManual,
        uniqueWarcryResonancePct: input.uniqueWarcryResonancePct,
        cosmosGuardianAlways: input.cosmosGuardianConditionInstant,
        uniqueStackingElementalResDownOnHit: input.uniqueStackingElementalResDownOnHit,
        uniqueBleedingEnemyDamageMorePct: input.uniqueBleedingEnemyDamageMorePct,
        uniqueRiftWaveOnHit: input.uniqueRiftWaveOnHit,
        uniqueChaosDamageInstantLeechPct: input.uniqueChaosDamageInstantLeechPct,
        uniqueInvulnerableBarrierOnHit: input.uniqueInvulnerableBarrierOnHit,
        uniquePoisonDurationPct: input.uniquePoisonDurationPct,
        uniqueDeathWard: input.uniqueDeathWard,
        uniqueLeechEfficiencyOnKill: input.uniqueLeechEfficiencyOnKill,
        uniqueKillMoveStacks: input.uniqueKillMoveStacks,
        uniqueEnemyRegenCutAndMinRoll: input.uniqueEnemyRegenCutAndMinRoll,
        uniqueAllResDownOnHit: input.uniqueAllResDownOnHit,
        uniqueCursedTakenAndRefresh: input.uniqueCursedTakenAndRefresh,
        uniquePhysDrHalfTakenAsMore: input.uniquePhysDrHalfTakenAsMore,
        uniqueMeleeArmorAmp: input.uniqueMeleeArmorAmp,
        uniqueArmorAppliesToDot: input.uniqueArmorAppliesToDot,
        uniquePursuitMovePct: input.uniquePursuitMovePct,
        uniqueRepelMelee: input.uniqueRepelMelee
    };
}

function assembleUniqueRecovery(input) {
    return {
        uniqueResonanceFloor: input.uniqueResonanceFloor,
        supportResonanceOverflow: input.supportResonanceOverflow,
        inquisitorResonanceBonus: input.inquisitorResonanceBonus,
        uniqueOverkillSplash: input.uniqueOverkillSplash,
        uniqueDragonVeinGuard: input.uniqueDragonVeinGuard,
        uniqueGuardianArmor: input.uniqueGuardianArmor,
        uniqueStealEliteTrait: input.uniqueStealEliteTrait,
        uniqueQueenBeeSummon: input.uniqueQueenBeeSummon,
        uniqueSummonDeathDamageBuff: input.uniqueSummonDeathDamageBuff,
        uniqueSummonCritAspdStacks: input.uniqueSummonCritAspdStacks,
        uniqueSummonNonCritNoDamage: input.uniqueSummonNonCritNoDamage,
        uniqueBlockRecoverEnergyShieldPct: input.uniqueBlockRecoverEnergyShieldPct,
        uniqueBlockedDamageTakenPct: input.uniqueBlockedDamageTakenPct,
        uniqueDeflectStealth: input.uniqueDeflectStealth,
        uniqueChaosTakenDamageReducePct: input.uniqueChaosTakenDamageReducePct,
        uniqueLifeRecoupTakenDamage: input.uniqueLifeRecoupTakenDamage,
        uniqueOverhealCapPct: input.uniqueOverhealCapPct
    };
}

function assembleCosmos(input, deps) {
    return {
        cosmosAlwaysFirstHit: input.cosmosAlwaysFirstHit,
        cosmosEnergyShieldBypassPct: input.cosmosEnergyShieldBypassPct,
        cosmosOrbitCycle: input.cosmosOrbitCycle,
        cosmosEqualDamageSplit: input.cosmosEqualDamageSplit,
        cosmosBalanceMitigation: input.cosmosBalanceMitigation,
        cosmosJudgmentLightning: input.cosmosJudgmentLightning,
        cosmosDeathResistPct: Math.max(input.cosmosDeathResistPct, input.reward.cosmosDeathResistPct || 0),
        cosmosBossDamageMorePct: Math.max(input.cosmosBossDamageMorePct, input.reward.cosmosBossDamageMorePct || 0),
        cosmosMasteryFinalDamagePct: input.cosmosMasteryFinalDamagePct,
        cosmosMasteryTakenLessPct: input.cosmosMasteryTakenLessPct,
        cosmosCometChillNoFreeze: input.cosmosCometChillNoFreeze,
        cosmosLightningVariance: input.reward.cosmosLightningVariance || 0,
        firstHitDamageMorePct: input.reward.firstHitDamageMorePct || 0,
        cosmosAlwaysFirstHitChancePct: input.reward.cosmosAlwaysFirstHitChancePct || 0,
        uniqueBleedWeightOnBleedingHit: input.uniqueBleedWeightOnBleedingHit,
        uniqueImmuneBleed: input.uniqueImmuneBleed,
        uniqueImmuneFreeze: input.uniqueImmuneFreeze,
        uniqueMeteorFootsteps: input.uniqueMeteorFootsteps,
        uniqueShockTracer: input.uniqueShockTracer,
        uniquePoisonExtraStacks: input.uniqueVenomStride ? Math.max(0, Math.floor(input.uniqueVenomStride.poisonExtraStack || 0)) : 0,
        runeCorpseExplodeChance: input.runeCorpseExplodeChance,
        runeCorpseExplodeLifePct: input.runeCorpseExplodeLifePct,
        runeResonancePower: input.bonusResonancePower,
        supportScaleBases: Object.fromEntries(Array.from(new Set(Object.values(deps.damageTags))).map(statId => [statId, Math.max(0, input.sumNonSupportStat(statId))]))
    };
}

function assembleSummons(input, deps) {
    return {
        summonFlatDmg: Math.max(0, sumOrderedPlayerStatSources(input, 'summonFlatDmg')),
        summonPctDmg: Math.max(0, sumOrderedPlayerStatSources(input, 'summonPctDmg') + input.tick.get('summonDeathDamagePct')),
        summonSharedPctDmg: input.summonSharedGeneralPctDmg,
        supportValues: input.supportValues,
        supportAuraFlat: deps.auraFlat(input.auraValues),
        summonSharedTaggedPctDmg: Object.fromEntries(Array.from(new Set(Object.values(deps.damageTags))).map(statId => [statId, Math.max(0, input.sumStatAcrossBuckets(statId) - (input.support[statId] || 0))])),
        summonAspd: Math.max(0, sumOrderedPlayerStatSources(input, 'summonAspd') + input.sbSummonAspdBonus + input.tick.get('summonCritAspd')),
        summonHpPct: Math.max(0, sumOrderedPlayerStatSources(input, 'summonHpPct')),
        summonCrit: Math.max(0, sumOrderedPlayerStatSources(input, 'summonCrit')),
        summonCritDmg: Math.max(0, sumOrderedPlayerStatSources(input, 'summonCritDmg')),
        summonCap: deps.summonCap(input.summonCapTotal()),
        curseCap: 1 + input.sumStatAcrossBuckets('curseCap') + ((deps.keystone('wlk9')) ? 1 : 0),
        summonEfficiency: Math.max(0, sumOrderedPlayerStatSources(input, 'summonEfficiency')),
        summonResPen: Math.max(0, sumOrderedPlayerStatSources(input, 'summonResPen')),
        summonGuardRedirectPct: Math.max(0, Math.min(100, sumOrderedPlayerStatSources(input, 'summonGuardRedirectPct')))
    };
}

function assembleContent(input, deps) {
    return {
        poisonDamageMultiplierPct: Math.max(0, input.finalPoisonDamageMultiplierPct),
        shockedEnemyHitDamagePct: Math.max(0, input.sumStatAcrossBuckets('shockedEnemyHitDamagePct')),
        shockedEnemyHitDamageMorePct: Math.max(0, sumOrderedPlayerStatSources(input, 'shockedEnemyHitDamageMorePct')),
        sbPlayerAttackPower: Math.max(0, input.sbPlayerAttackPower),
        ...deps.oceanStats(input.sumStatAcrossBuckets),
        ...deps.cooldownStats(input.sumStatAcrossBuckets),
        regionAffix: deps.regionAffixes.collect(input.sumStatAcrossBuckets),
        bossDamagePct: Math.max(0, input.sumStatAcrossBuckets('bossDamagePct')),
        eliteDamagePct: Math.max(0, input.sumStatAcrossBuckets('eliteDamagePct')),
        firstStrikeDamagePct: Math.max(0, input.sumStatAcrossBuckets('firstStrikeDamagePct')),
        cullStrikePct: Math.max(0, Math.min(20, input.sumStatAcrossBuckets('cullStrikePct'))),
        echoPower: Math.max(0, input.sumStatAcrossBuckets('echoPower')),
        chaosErosion: Math.max(0, input.sumStatAcrossBuckets('chaosErosion')),
        chaosErosionCap: Math.max(0, input.sumStatAcrossBuckets('chaosErosionCap'))
    };
}

function assemblePlayerStatResult(input, deps) {
    const stats = {
        ...assembleRegion(input, deps),
        ...assembleMitigation(input),
        ...assembleDamage(input),
        ...assembleRecovery(input, deps),
        ...assembleGuard(input),
        ...assembleSkill(input),
        ...assembleResistances(input),
        ...assemblePassives(input, deps),
        ...assembleAilments(input),
        ...assembleAttributes(input),
        ...assembleUniqueHits(input),
        ...assembleUniqueRecovery(input),
        ...assembleCosmos(input, deps),
        ...assembleSummons(input, deps),
        ...assembleContent(input, deps)
    };
    stats.passiveSoleMinionLostCap = input.authoredPassiveRules.flags.soleMinion ? Math.max(0, stats.summonCap - 1) : 0;
    stats.talentSourceStats = input.talentSourceStats;
    if (typeof deps.postStats === 'function') deps.postStats(stats);
    return stats;
}

export function createPlayerStatResult(deps) {
    return Object.freeze({ build: input => assemblePlayerStatResult(input, deps) });
}
