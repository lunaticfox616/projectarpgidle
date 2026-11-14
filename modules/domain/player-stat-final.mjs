// Final transforms preserve their positions in the player-stat pipeline: zone, class caps, then wards/block.
function isGravityRegion(zone) {
    return zone && (zone.type === 'underworld' || (zone.milestonePinnacle && zone.underworldPenaltyFloor));
}

function isPressureRegion(zone) {
    return zone && (zone.type === 'oceanDepth' || Number(zone.oceanPressureDepthTier) > 0);
}

function applyRegionGravity(state, floor, deps) {
    const reduction = typeof deps.skyReduction === 'function' ? deps.skyReduction() : 0;
    const multiplier = deps.gravityMultiplier(floor, reduction);
    state.finalAspd *= multiplier;
    state.finalMove *= multiplier;
    state.zoneSpeedMultiplier *= multiplier;
}

function applyRegionPressure(state, zone, input, deps) {
    const depth = Math.max(0, Math.floor(zone.oceanPressureDepthTier || zone.depthTier || 0));
    const resistance = Math.max(0, Math.min(80, input.sumStatAcrossBuckets('oceanPressureResist')
        + (typeof deps.oceanResistanceUpgrade === 'function' ? deps.oceanResistanceUpgrade() : 0)));
    const slow = Math.min(0.65, depth * 0.05) * (1 - resistance / 100);
    state.finalAspd *= (1 - slow);
    state.zoneSpeedMultiplier *= (1 - slow);
    state.oceanPressureDamageMul *= (1 - slow * 0.6);
    state.finalMove *= (1 - slow * 0.2);
    if (deps.oceanCurrent(zone, 'riptide')) state.finalMove *= 0.85;
    if (deps.oceanCurrent(zone, 'bioluminescence')) state.playerAccuracy *= 0.82;
    if (deps.oceanCurrent(zone, 'warm_current')) state.oceanCurrentResPenaltyF = 12;
    if (deps.oceanCurrent(zone, 'cold_current')) state.oceanCurrentResPenaltyC = 12;
}

function computeFinalRegion(input, deps) {
    const zone = deps.zoneOf(input.owner.currentZoneId) || deps.zoneOf(0);
    const state = { finalAspd: input.finalAspd, finalMove: input.finalMove, playerAccuracy: input.playerAccuracy,
        zoneSpeedMultiplier: 1, oceanPressureDamageMul: 1, oceanCurrentResPenaltyF: 0, oceanCurrentResPenaltyC: 0 };
    if (isGravityRegion(zone)) applyRegionGravity(state, Math.max(1, Math.floor(zone.underworldPenaltyFloor || zone.floor || 1)), deps);
    if (isPressureRegion(zone)) applyRegionPressure(state, zone, input, deps);
    // Bloom trials use the same gravity mitigation and retain their original position after ocean pressure.
    if (zone && zone.bloomTrial && zone.underworldPenaltyFloor) applyRegionGravity(state, Math.max(1, Math.floor(zone.underworldPenaltyFloor || 1)), deps);
    return state;
}

function computeFinalDefenseTransform(input, deps) {
    let {
        finalCritDmg, authoredPassiveRules, finalArmor, finalEvasion,
        armorReduction, referenceIncomingPhysical, evadeChance, enemyAccuracy
    } = input;
    finalCritDmg = Math.max(0, finalCritDmg);
    if (authoredPassiveRules.flags.movingWall) {
        finalArmor = Math.max(0, finalArmor + finalEvasion);
        finalEvasion = 0;
    }
    if (authoredPassiveRules.flags.fullEvasion) finalArmor = 0;
    armorReduction = deps.armorMitigation(finalArmor, referenceIncomingPhysical);
    evadeChance = deps.evasionChance(finalEvasion, enemyAccuracy);
    if (authoredPassiveRules.flags.fullEvasion) evadeChance = Math.min(90, evadeChance + 15);
    return {
        finalCritDmg, finalArmor, finalEvasion, armorReduction,
        evadeChance
    };
}

function computeFinalCriticalCap(input, deps) {
    let {
        authoredPassiveRules, finalCritDmg, finalCrit, skill
    } = input;
    if (authoredPassiveRules.flags.criticalLimit) {
        finalCritDmg += Math.max(0, finalCrit - 50) * 5;
        finalCrit = Math.min(50, finalCrit);
    } else if ((typeof deps.preciseTalent === 'function' && (deps.preciseTalent('hero4__assassin') || deps.preciseTalent('hero6__ranger')))) finalCrit = Math.min(1000, finalCrit);
    else finalCrit = Math.min(100, finalCrit);
    if (skill.cannotCrit && !(deps.keystone('ct7') && Array.isArray(skill.tags) && skill.tags.includes('attack'))) finalCrit = 0;
    return {
        finalCritDmg, finalCrit
    };
}

function computeCrowdEvasion(evasion, tick, crowd, few) {
    if (crowd) {
        const count = tick.get('aliveEnemies');
        if (count >= crowd.minEnemies) evasion = Math.floor(evasion * (1 + crowd.morePct / 100));
    }
    if (few) {
        const count = tick.get('aliveEnemies');
        if (count >= few.minEnemies && count <= few.maxEnemies) evasion = Math.floor(evasion * (1 + few.morePct / 100));
    }
    return evasion;
}

function computeFinalVariance(input) {
    let {
        uniqueEsToLightPct, skill, finalBaseDmg, finalEnergyShield,
        finalMaxDmgRoll, finalMinDmgRoll, uniqueRollGapDamage, uniqueRollGapCritDs,
        finalCritDmg, finalDs, uniqueCrowdEvasionMore, tick,
        finalEvasion, uniqueFewEnemyEvasionMore, uniqueFateTwinRollSync, finalCrit
    } = input;
    // 신성한 맹세: 번개 스킬의 기본 피해가 최대 에너지 보호막 100당 +1%
    if (uniqueEsToLightPct && skill.ele === 'light') finalBaseDmg = Math.floor(finalBaseDmg * (1 + (finalEnergyShield / 100) / 100));
    // 뒤바뀐 운명 / 최대 이윤: 최소~최대 피해 보정 차이를 피해·치명타 피해·연속 타격으로 환산
    let cosmosRollGap = Math.max(0, finalMaxDmgRoll - finalMinDmgRoll);
    if (uniqueRollGapDamage) finalBaseDmg = Math.floor(finalBaseDmg * (1 + cosmosRollGap / 100));
    if (uniqueRollGapCritDs) { finalCritDmg += cosmosRollGap; finalDs += cosmosRollGap; }
    finalDs = Math.max(0, finalDs);
    finalEvasion = computeCrowdEvasion(finalEvasion, tick, uniqueCrowdEvasionMore, uniqueFewEnemyEvasionMore);
    if (uniqueFateTwinRollSync) {
        let critForTwin = Math.max(0, finalCrit);
        let v = Math.max(finalMinDmgRoll, finalMaxDmgRoll) + (critForTwin * 0.2);
        finalMinDmgRoll = v;
        finalMaxDmgRoll = v;
    }
    return {
        finalBaseDmg, finalMaxDmgRoll, finalMinDmgRoll, finalCritDmg,
        finalDs, finalEvasion
    };
}

function computeFinalCriticalEstimate(input, deps) {
    let {
        finalCritDmg, critChance, finalCrit, critMulti,
        avgHit, finalBaseDmg, finalDps, finalAspd
    } = input;
    let rawFinalCritDmg = Math.max(0, finalCritDmg);
    finalCritDmg = deps.critSoftcap(rawFinalCritDmg);
    let critDmgSoftcapReduction = deps.critReduction(rawFinalCritDmg);
    critChance = Math.max(0, Math.min(1, finalCrit / 100));
    critMulti = finalCritDmg / 100;
    avgHit = deps.averageCriticalHit(finalBaseDmg, finalCrit, finalCritDmg, false);
    finalDps = avgHit * finalAspd;
    return {
        rawFinalCritDmg, critDmgSoftcapReduction, finalCritDmg, critChance,
        critMulti, avgHit, finalDps
    };
}

function computeFinalWardMaxima(input) {
    let {
        finalMaxResF, colonyWardBonus, finalMaxResC, finalMaxResL,
        finalMaxResChaos, fixedAllMaxRes
    } = input;
    finalMaxResF = Math.min(90, finalMaxResF + (colonyWardBonus.maxResF || 0));
    finalMaxResC = Math.min(90, finalMaxResC + (colonyWardBonus.maxResC || 0));
    finalMaxResL = Math.min(90, finalMaxResL + (colonyWardBonus.maxResL || 0));
    finalMaxResChaos = Math.min(90, finalMaxResChaos + (colonyWardBonus.maxResChaos || 0));
    if (fixedAllMaxRes !== null) {
        finalMaxResF = fixedAllMaxRes;
        finalMaxResC = fixedAllMaxRes;
        finalMaxResL = fixedAllMaxRes;
        finalMaxResChaos = fixedAllMaxRes;
    }
    return {
        finalMaxResF, finalMaxResC, finalMaxResL, finalMaxResChaos
    };
}

function computeFinalWardVitals(input, deps) {
    let {
        finalMaxHp, colonyWardBonus, finalArmor, finalEvasion,
        uniqueRiderCompass, finalMove, armorReduction, referenceIncomingPhysical,
        evadeChance, enemyAccuracy, finalEnergyShield
    } = input;
    finalMaxHp += (colonyWardBonus.flatHp || 0);
    finalArmor += (colonyWardBonus.armor || 0);
    finalEvasion += (colonyWardBonus.evasion || 0);
    let riderCompassEvasionMorePct = uniqueRiderCompass && finalMove >= 200 ? 20 : 0;
    if (riderCompassEvasionMorePct > 0) finalEvasion = Math.floor(finalEvasion * (1 + riderCompassEvasionMorePct / 100));
    armorReduction = deps.armorMitigation(finalArmor, referenceIncomingPhysical);
    evadeChance = deps.evasionChance(finalEvasion, enemyAccuracy);
    finalEnergyShield += (colonyWardBonus.energyShield || 0);
    return {
        riderCompassEvasionMorePct, finalMaxHp, finalArmor, finalEvasion,
        armorReduction, evadeChance, finalEnergyShield
    };
}

function computeFinalWardResistance(input, deps) {
    let {
        rawDr, colonyWardBonus, finalDr, finalResF,
        finalMaxResF, finalResC, finalMaxResC, finalResL,
        finalMaxResL, finalResChaos, finalMaxResChaos, finalRegen,
        finalEnergyShieldRegenRate, finalCritResist
    } = input;
    rawDr += (colonyWardBonus.dr || 0);
    finalDr = Math.min(deps.physicalCap, rawDr);
    finalResF = Math.min(finalMaxResF, finalResF + (colonyWardBonus.resAll || 0));
    finalResC = Math.min(finalMaxResC, finalResC + (colonyWardBonus.resAll || 0));
    finalResL = Math.min(finalMaxResL, finalResL + (colonyWardBonus.resAll || 0));
    finalResChaos = Math.min(finalMaxResChaos, finalResChaos + (colonyWardBonus.resChaos || 0));
    finalRegen += (colonyWardBonus.regenFlat || 0);
    finalEnergyShieldRegenRate += (colonyWardBonus.energyShieldRegen || 0);
    finalCritResist = Math.min(80, finalCritResist + (colonyWardBonus.critResist || 0));
    return {
        rawDr, finalDr, finalResF, finalResC,
        finalResL, finalResChaos, finalRegen, finalEnergyShieldRegenRate,
        finalCritResist
    };
}

function computeFinalWardAilmentDefense(input) {
    let {
        finalDotTakenDamageReducePct, colonyWardBonus, finalIgniteDamageReducePct, finalBleedDamageReducePct,
        finalPoisonDamageReducePct, finalTakenDamageReduceWhen2EnemiesPct, finalTakenDamageReduceWhen1EnemyPct
    } = input;
    finalDotTakenDamageReducePct += (colonyWardBonus.dotTakenDamageReducePct || 0);
    finalIgniteDamageReducePct += (colonyWardBonus.igniteDamageReducePct || 0);
    finalBleedDamageReducePct += (colonyWardBonus.bleedDamageReducePct || 0);
    finalPoisonDamageReducePct += (colonyWardBonus.poisonDamageReducePct || 0);
    finalTakenDamageReduceWhen2EnemiesPct += (colonyWardBonus.takenDamageReduceWhen2EnemiesPct || 0);
    finalTakenDamageReduceWhen1EnemyPct += (colonyWardBonus.takenDamageReduceWhen1EnemyPct || 0);
    return {
        finalDotTakenDamageReducePct, finalIgniteDamageReducePct, finalBleedDamageReducePct, finalPoisonDamageReducePct,
        finalTakenDamageReduceWhen2EnemiesPct, finalTakenDamageReduceWhen1EnemyPct
    };
}

function computeFinalMedicine(input, deps) {
    let {
        rawResF, colonyWardBonus, rawResC, rawResL,
        rawResChaos, warlockElementalOvercapToChaos, elementalistChaosConversionBonus
    } = input;
    let uncappedResF = rawResF + (colonyWardBonus.resAll || 0);
    let uncappedResC = rawResC + (colonyWardBonus.resAll || 0);
    let uncappedResL = rawResL + (colonyWardBonus.resAll || 0);
    let uncappedResChaos = rawResChaos + warlockElementalOvercapToChaos + elementalistChaosConversionBonus + (colonyWardBonus.resChaos || 0);
    let medicineResistanceAilmentBonus = { ignite: 0, freeze: 0, shock: 0 };
    if (deps.keystone('ct2')) {
        let highestUncappedElementalResistance = Math.max(uncappedResF, uncappedResC, uncappedResL);
        if (uncappedResF === highestUncappedElementalResistance) medicineResistanceAilmentBonus.ignite = 100;
        if (uncappedResC === highestUncappedElementalResistance) medicineResistanceAilmentBonus.freeze = 100;
        if (uncappedResL === highestUncappedElementalResistance) medicineResistanceAilmentBonus.shock = 100;
    }
    return {
        uncappedResF, uncappedResC, uncappedResL, uncappedResChaos,
        medicineResistanceAilmentBonus
    };
}

// Support bonuses are intentionally absent from this source set, as in the original calculation.
function sumFinalAilmentResistance(input, stat) {
    return (input.gearBase[stat] || 0) + (input.gearExplicit[stat] || 0) + (input.passive[stat] || 0)
        + (input.season[stat] || 0) + (input.ascend[stat] || 0) + (input.reward[stat] || 0) + (input.colonyWardBonus[stat] || 0);
}

function computeFinalAilmentResistance(input, deps) {
    let {
        medicineResistanceAilmentBonus,
        ailmentResistBonusPct
    } = input;
    let ailResIgniteTotal = sumFinalAilmentResistance(input, 'ailResIgnite') + medicineResistanceAilmentBonus.ignite;
    let ailResFreezeTotal = sumFinalAilmentResistance(input, 'ailResFreeze') + medicineResistanceAilmentBonus.freeze;
    let ailResShockTotal = sumFinalAilmentResistance(input, 'ailResShock') + medicineResistanceAilmentBonus.shock;
    let ailResPoisonTotal = sumFinalAilmentResistance(input, 'ailResPoison');
    let ailResBleedTotal = sumFinalAilmentResistance(input, 'ailResBleed');
    let finalAilmentResistIgniteChance = deps.ailmentResistance('ignite', { ailResIgnite: ailResIgniteTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistChillChance = deps.ailmentResistance('chill', { ailResFreeze: ailResFreezeTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistFreezeChance = deps.ailmentResistance('freeze', { ailResFreeze: ailResFreezeTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistShockChance = deps.ailmentResistance('shock', { ailResShock: ailResShockTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistPoisonChance = deps.ailmentResistance('poison', { ailResPoison: ailResPoisonTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistBleedChance = deps.ailmentResistance('bleed', { ailResBleed: ailResBleedTotal, ailmentResistBonusPct }) * 100;
    let catalystAilmentSourceMultiplier = deps.keystone('ct1') ? 2 : 1;
    return {
        ailResIgniteTotal, ailResFreezeTotal, ailResShockTotal, ailResPoisonTotal,
        ailResBleedTotal, finalAilmentResistIgniteChance, finalAilmentResistChillChance, finalAilmentResistFreezeChance,
        finalAilmentResistShockChance, finalAilmentResistPoisonChance, finalAilmentResistBleedChance, catalystAilmentSourceMultiplier
    };
}

function computeFinalBlock(input) {
    let {
        shieldBaseBlockChance, shieldBlockChancePct, guardianBlockChance, gearBase,
        passive, season, ascend, support,
        reward, shieldBlockChanceFlat, forbiddenManifestation, sumStatAcrossBuckets,
        authoredPassiveRules
    } = input;
    let effectiveShieldBaseBlockChance = Math.max(0, shieldBaseBlockChance * (1 + Math.max(0, shieldBlockChancePct) / 100));
    let blockChanceFromOtherPct = Math.max(0,
        guardianBlockChance + gearBase.blockChancePct + passive.blockChancePct + season.blockChancePct + ascend.blockChancePct + support.blockChancePct + reward.blockChancePct
    );
    let flatBlockChanceBonus = Math.max(0, shieldBlockChanceFlat + gearBase.blockChance + passive.blockChance + season.blockChance + ascend.blockChance + support.blockChance + reward.blockChance);
    let finalBlockChanceCap = forbiddenManifestation ? 25 : Math.max(50, Math.min(75, 50 + Math.max(0, sumStatAcrossBuckets('blockChanceMax'))));
    let finalBlockChance = Math.min(finalBlockChanceCap, Math.max(0, effectiveShieldBaseBlockChance + (shieldBaseBlockChance * blockChanceFromOtherPct / 100) + flatBlockChanceBonus));
    if (authoredPassiveRules.flags.fullEvasion || authoredPassiveRules.flags.proxyCovenant) finalBlockChance = 0;
    return {
        effectiveShieldBaseBlockChance, blockChanceFromOtherPct, flatBlockChanceBonus, finalBlockChanceCap,
        finalBlockChance
    };
}

export function createPlayerStatFinal(deps) {
    return Object.freeze({
        region: input => computeFinalRegion(input, deps),
        defenseTransform: input => computeFinalDefenseTransform(input, deps),
        criticalCap: input => computeFinalCriticalCap(input, deps),
        variance: input => computeFinalVariance(input),
        criticalEstimate: input => computeFinalCriticalEstimate(input, deps),
        wardMaxima: input => computeFinalWardMaxima(input),
        wardVitals: input => computeFinalWardVitals(input, deps),
        wardResistance: input => computeFinalWardResistance(input, deps),
        wardAilmentDefense: input => computeFinalWardAilmentDefense(input),
        medicine: input => computeFinalMedicine(input, deps),
        ailmentResistance: input => computeFinalAilmentResistance(input, deps),
        block: input => computeFinalBlock(input)
    });
}
