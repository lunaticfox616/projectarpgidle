// Ordered numeric stages of one player-stat evaluation. Buckets and skill belong to that evaluation.
// Each stage retains its original source set, rounding points and caps; only declared outputs escape.
function computePlayerCoreModifiers(input) {
    let { sumStatAcrossBuckets } = input;
    let coreCubeAddedDamagePct = {
        phys: sumStatAcrossBuckets('addedPhysDamagePct'),
        fire: sumStatAcrossBuckets('addedFireDamagePct'),
        cold: sumStatAcrossBuckets('addedColdDamagePct'),
        light: sumStatAcrossBuckets('addedLightDamagePct'),
        chaos: sumStatAcrossBuckets('addedChaosDamagePct')
    };
    let coreCubeFlatElementDamage = {
        fire: sumStatAcrossBuckets('fireFlatDmg'),
        cold: sumStatAcrossBuckets('coldFlatDmg'),
        light: sumStatAcrossBuckets('lightFlatDmg'),
        chaos: sumStatAcrossBuckets('chaosFlatDmg')
    };
    let coreCubeTakenFlatReduce = {
        phys: sumStatAcrossBuckets('physFlatTakenReduce'),
        fire: sumStatAcrossBuckets('fireFlatTakenReduce'),
        cold: sumStatAcrossBuckets('coldFlatTakenReduce'),
        light: sumStatAcrossBuckets('lightFlatTakenReduce'),
        chaos: sumStatAcrossBuckets('chaosFlatTakenReduce'),
        all: sumStatAcrossBuckets('allFlatTakenReduce')
    };
    let coreCubePhysTakenAs = {
        fire: sumStatAcrossBuckets('physTakenAsFire'),
        cold: sumStatAcrossBuckets('physTakenAsCold'),
        light: sumStatAcrossBuckets('physTakenAsLight'),
        chaos: sumStatAcrossBuckets('physTakenAsChaos')
    };
    let coreCubeDoubleDamageChance = sumStatAcrossBuckets('doubleDamageChance');
    let coreCubeSlamEchoDamagePct = sumStatAcrossBuckets('slamEchoDamagePct');
    return { coreCubeAddedDamagePct, coreCubeFlatElementDamage, coreCubeTakenFlatReduce, coreCubePhysTakenAs, coreCubeDoubleDamageChance, coreCubeSlamEchoDamagePct };
}

function computePlayerWeaponDamage(input) {
    let { gearBase, gearExplicit, passive, season, ascend, reward, support, starBlessing } = input;
    let weaponBaseDmgPct = Math.max(0, gearBase.weaponFlatDmgPct + gearExplicit.weaponFlatDmgPct
        + passive.weaponFlatDmgPct + season.weaponFlatDmgPct + ascend.weaponFlatDmgPct + reward.weaponFlatDmgPct);
    let gearFlatDmg = (gearBase.flatDmg * (1 + weaponBaseDmgPct / 100)) + gearExplicit.flatDmg;
    let passiveFlatDmg = passive.flatDmg + season.flatDmg + ascend.flatDmg + reward.flatDmg;
    let generalPctDmg = gearBase.pctDmg + gearExplicit.pctDmg + passive.pctDmg + season.pctDmg + ascend.pctDmg + support.pctDmg + reward.pctDmg + starBlessing.pctDmg;
    let summonSharedGeneralPctDmg = Math.max(0, generalPctDmg);
    let dotPctDmg = gearBase.dotPctDmg + gearExplicit.dotPctDmg + passive.dotPctDmg + season.dotPctDmg + ascend.dotPctDmg + support.dotPctDmg + reward.dotPctDmg;
    return { gearFlatDmg, passiveFlatDmg, generalPctDmg, summonSharedGeneralPctDmg, dotPctDmg };
}

function computePlayerSpellDamage(input, deps) {
    let { isSpellSkill, skill, gearBase, gearExplicit, passive, season, ascend, reward, support, uniqueGrandBreachCrown, localDefenseTotals, baseDmg, gearFlatDmg, passiveFlatDmg } = input;
    const { spellBase, keystoneActive, codexPct } = deps;
    let spellFlatDmg = 0;
    if (isSpellSkill) {
        let skillLevel = Number.isFinite(skill.finalLevel) ? skill.finalLevel : 1;
        let spellFlatBonus = gearBase.spellFlatDmg + gearExplicit.spellFlatDmg + passive.spellFlatDmg + season.spellFlatDmg + ascend.spellFlatDmg + reward.spellFlatDmg + support.spellFlatDmg;
        if (uniqueGrandBreachCrown) spellFlatBonus += Math.floor(Math.max(0, localDefenseTotals.energyShield) * (Math.max(0, uniqueGrandBreachCrown.spellFromEsPct || 10) / 100));
        let spellFlatPct = gearBase.spellFlatPct + gearExplicit.spellFlatPct + passive.spellFlatPct + season.spellFlatPct + ascend.spellFlatPct + reward.spellFlatPct + support.spellFlatPct;
        spellFlatDmg = Math.max(1, (spellBase(skill, skillLevel) + spellFlatBonus) * (1 + spellFlatPct / 100));
        spellFlatDmg *= (1 + Math.max(0, Number(skill.spellFlatMulBonus) || 0) / 100);
        // 부패 증식(워록 wlk2): 지속 피해 배율 20% 증폭과 동일하게 주문 내장 피해도 20% 증가시킨다.
        if (keystoneActive('wlk2')) spellFlatDmg *= 1.20;
    }
    // 속성별 기본 피해(flat)는 일반 피해 풀에 섞지 않고, 아래에서 속성 타입을 유지한 별도 타격으로 적용한다.
    let totalFlatDmg = (isSpellSkill ? spellFlatDmg : (baseDmg + gearFlatDmg + passiveFlatDmg));
    let codexBonusRatio = 1 + (codexPct() / 100);
    return { spellFlatDmg, totalFlatDmg, codexBonusRatio };
}

function computePlayerElementHits(input) {
    let { sumStatAcrossBuckets, strongestElement, skill, codexBonusRatio, generalPctDmg } = input;
    let flatElementSources = {
        phys: sumStatAcrossBuckets('physFlatDmg'),
        fire: sumStatAcrossBuckets('fireFlatDmg'),
        cold: sumStatAcrossBuckets('coldFlatDmg'),
        light: sumStatAcrossBuckets('lightFlatDmg'),
        chaos: sumStatAcrossBuckets('chaosFlatDmg')
    };
    let flatElementElementalPct = sumStatAcrossBuckets('elementalPctDmg');
    let flatElementPctByEle = {
        phys: sumStatAcrossBuckets('physPctDmg'),
        fire: (strongestElement?.bonus ?? sumStatAcrossBuckets('firePctDmg')) + flatElementElementalPct,
        cold: (strongestElement?.bonus ?? sumStatAcrossBuckets('coldPctDmg')) + flatElementElementalPct,
        light: (strongestElement?.bonus ?? sumStatAcrossBuckets('lightPctDmg')) + flatElementElementalPct,
        chaos: sumStatAcrossBuckets('chaosPctDmg')
    };
    let flatElementSkillMul = (skill.dmg || skill.baseDmg || 1) * codexBonusRatio;
    let flatElementHitDamage = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0 };
    ['phys', 'fire', 'cold', 'light', 'chaos'].forEach(ele => {
        let amt = Math.max(0, Number(flatElementSources[ele]) || 0);
        if (amt <= 0) return;
        let inc = 1 + (generalPctDmg + Math.max(0, flatElementPctByEle[ele])) / 100;
        flatElementHitDamage[ele] = amt * inc * flatElementSkillMul;
    });
    return { flatElementHitDamage };
}

function computePlayerLifeDamage(input) {
    let { gearBase, gearExplicit, passive, season, ascend, reward, baseHp, starBlessing, support, codexBonusRatio, skill, totalFlatDmg, shieldArmorForDamage } = input;
    let gearFlatHp = gearBase.flatHp + gearExplicit.flatHp;
    let passiveFlatHp = passive.flatHp + season.flatHp + ascend.flatHp + reward.flatHp;
    let totalFlatHp = baseHp + gearFlatHp + passiveFlatHp + starBlessing.flatHp;
    let totalPctHp = gearBase.pctHp + gearExplicit.pctHp + passive.pctHp + season.pctHp + ascend.pctHp + support.pctHp + reward.pctHp;
    let finalMaxHp = Math.floor(totalFlatHp * (1 + totalPctHp / 100) * codexBonusRatio);

    let hpScaleRatio = Math.max(0, finalMaxHp * (skill.hpDmgScale || 0));
    let hpFlatBonus = Math.floor(totalFlatDmg * hpScaleRatio);
    let scaledFlatDmg = totalFlatDmg + hpFlatBonus;
    if (skill.shieldArmorDamageRatio) {
        scaledFlatDmg = Math.max(1, shieldArmorForDamage * Math.max(0, Number(skill.shieldArmorDamageRatio) || 0));
    }
    return { gearFlatHp, passiveFlatHp, totalPctHp, finalMaxHp, hpScaleRatio, hpFlatBonus, scaledFlatDmg };
}

function computePlayerShieldSkillDamage(damage, skill, equippedShield) {
    if (!skill.shieldDamageBonusPct || !equippedShield || equippedShield.slot !== '방패') return damage;
    return Math.floor(damage * (1 + Math.max(0, Number(skill.shieldDamageBonusPct) || 0) / 100));
}

function computePlayerTalentDamage(input, deps) {
    let { sumStatAcrossBuckets, skill, taggedTotal, generalPctDmg, codexBonusRatio, scaledFlatDmg, owner } = input;
    const { talentDerived } = deps;
    let talentSourceStats = {
        elementalPct: sumStatAcrossBuckets('elementalPctDmg'),
        firePct: sumStatAcrossBuckets('firePctDmg'),
        coldPct: sumStatAcrossBuckets('coldPctDmg'),
        lightPct: sumStatAcrossBuckets('lightPctDmg'),
        summonPct: sumStatAcrossBuckets('summonPctDmg')
    };
    let preciseTalentDerived = typeof talentDerived === 'function'
        ? talentDerived({ ...talentSourceStats, skill })
        : { skillIncreasePct: 0 };
    taggedTotal += Math.max(0, Number(preciseTalentDerived.skillIncreasePct) || 0);
    let baseDamageIncreaseMultiplier = (1 + (generalPctDmg + taggedTotal + (Number(skill.forgeDmgPct) || 0)) / 100) * (skill.dmg || skill.baseDmg || 1) * codexBonusRatio; // + 룬 강화의 피해 증가
    baseDamageIncreaseMultiplier *= (1 + Math.max(0, Number(skill.flatSkillDmgPct) || 0) / 100);
    let finalBaseDmg = Math.floor(scaledFlatDmg * baseDamageIncreaseMultiplier);
    let equippedShield = owner.equipment && owner.equipment['방패'];
    finalBaseDmg = computePlayerShieldSkillDamage(finalBaseDmg, skill, equippedShield);
    return { talentSourceStats, baseDamageIncreaseMultiplier, finalBaseDmg, taggedTotal };
}

function computePlayerAttackSpeed(input, deps) {
    let { gearBase, gearExplicit, passive, season, ascend, reward, support, skill, glovePairAspdBonus, sumStatAcrossBuckets, authoredPassiveRules, tick } = input;
    const { keystoneActive, talentKnee, SKILL_DELAY_REDUCE_CAP, keystoneSpeed } = deps;
    let gearAspd = gearBase.aspd + gearExplicit.aspd;
    let passiveAspd = passive.aspd + season.aspd + ascend.aspd + reward.aspd;
    let totalAspdPct = gearAspd + passiveAspd + support.aspd + (Number(skill.forgeAspdPct) || 0);   // 룬 강화의 속도 증가도 합한다
    let rawAspd = (1.0 + glovePairAspdBonus) * (1 + totalAspdPct / 100) * (skill.spd || skill.baseSpd || 1) * 0.88;
    // 극한의 속사(레인저 r9): 공격 속도 소프트캡 기준치 +2
    let aspdSoftCapKnee = (keystoneActive('r9')) ? 7 : 5;
    if (typeof talentKnee === 'function') aspdSoftCapKnee = talentKnee(aspdSoftCapKnee);
    let finalAspd = rawAspd <= aspdSoftCapKnee ? rawAspd : (aspdSoftCapKnee + Math.pow(Math.max(0, rawAspd - aspdSoftCapKnee), 0.72));
    const skillDelayPct = Math.min(SKILL_DELAY_REDUCE_CAP, sumStatAcrossBuckets('skillDelayReduce'));
    finalAspd = Math.min(12, finalAspd / (1 - skillDelayPct / 100));
    finalAspd = keystoneSpeed(finalAspd, authoredPassiveRules.flags);
    if (authoredPassiveRules.flags.bloodAcceleration && tick.get('leechActive')) {
        finalAspd = Math.min(12, finalAspd * 1.15);
    }
    return { gearAspd, passiveAspd, totalAspdPct, rawAspd, finalAspd, skillDelayPct };
}

function computePlayerDefenseBase(input) {
    let { passive, season, ascend, reward, localDefenseTotals, globalDefensePct, activeShadowStealth, uniqueDeflectStealth, activeEvasionDanceStacks, uniqueEvasionDance } = input;
    let extraFlatArmor = passive.armor + season.armor + ascend.armor + reward.armor;
    let extraFlatEvasion = passive.evasion + season.evasion + ascend.evasion + reward.evasion;
    let extraFlatEnergyShield = passive.energyShield + season.energyShield + ascend.energyShield + reward.energyShield;
    let gearArmor = localDefenseTotals.armor + extraFlatArmor;
    let gearEvasion = localDefenseTotals.evasion + extraFlatEvasion;
    let gearEnergyShield = localDefenseTotals.energyShield + extraFlatEnergyShield;
    let totalArmorPct = passive.armorPct + season.armorPct + ascend.armorPct + reward.armorPct + globalDefensePct.armor;
    let totalEvasionPct = passive.evasionPct + season.evasionPct + ascend.evasionPct + reward.evasionPct + globalDefensePct.evasion + (activeShadowStealth ? Math.max(0, Number(uniqueDeflectStealth.evasionPct || 20)) : 0);
    totalEvasionPct += activeEvasionDanceStacks * Math.max(0, uniqueEvasionDance ? uniqueEvasionDance.evasionPctPerStack : 0);
    let totalEnergyShieldPct = passive.energyShieldPct + season.energyShieldPct + ascend.energyShieldPct + reward.energyShieldPct + globalDefensePct.energyShield;
    let finalArmor = Math.max(0, Math.floor(gearArmor * (1 + totalArmorPct / 100)));
    let finalEvasion = Math.max(0, Math.floor(gearEvasion * (1 + totalEvasionPct / 100)));
    let finalEnergyShield = Math.max(0, Math.floor(gearEnergyShield * (1 + totalEnergyShieldPct / 100)));
    return { totalArmorPct, totalEvasionPct, totalEnergyShieldPct, finalArmor, finalEvasion, finalEnergyShield };
}

function computePlayerShieldBonuses(input, deps) {
    let { totalStrength, totalDexterity, totalIntelligence, passive, finalEnergyShield, uniqueGrandBreachCrown, uniqueEsAmpPct } = input;
    const { passiveNode } = deps;
    let omniscientKeystone = typeof passiveNode === 'function' && passiveNode('사중합일');
    let omniscientActive = !!omniscientKeystone && totalStrength >= 14 && totalStrength === totalDexterity
        && totalDexterity === totalIntelligence && totalIntelligence === Math.max(0, passive.mystique);
    if (omniscientActive) finalEnergyShield += Math.floor((totalStrength + totalDexterity + totalIntelligence + passive.mystique) * 2);
    if (uniqueGrandBreachCrown) finalEnergyShield = Math.max(0, Math.floor(finalEnergyShield * (1 + Math.max(0, uniqueGrandBreachCrown.esPct || 30) / 100)));
    if (uniqueEsAmpPct > 0) finalEnergyShield = Math.floor(finalEnergyShield * (1 + uniqueEsAmpPct / 100));
    return { omniscientActive, finalEnergyShield };
}

function computePlayerDefenseRates(input, deps) {
    let { gearBase, gearExplicit, passive, season, ascend, support, reward, owner, finalArmor, finalEvasion } = input;
    const { zoneOf, armorMitigation, zoneAccuracy, evasionChance } = deps;
    let finalEnergyShieldRegenRate = Math.max(0, 12.5 + gearBase.energyShieldRegen + gearExplicit.energyShieldRegen + passive.energyShieldRegen + season.energyShieldRegen + ascend.energyShieldRegen + support.energyShieldRegen + reward.energyShieldRegen);
    let finalEnergyShieldRechargeDelay = Math.max(0.25, 1 - (gearBase.energyShieldRechargeFaster + gearExplicit.energyShieldRechargeFaster + passive.energyShieldRechargeFaster + season.energyShieldRechargeFaster + ascend.energyShieldRechargeFaster + support.energyShieldRechargeFaster + reward.energyShieldRechargeFaster));
    let referenceIncomingPhysical = Math.max(1, Math.floor((2 + ((zoneOf(owner.currentZoneId) || { tier: 1 }).tier || 1) * 3.1)));
    let armorReduction = armorMitigation(finalArmor, referenceIncomingPhysical);
    let enemyAccuracy = zoneAccuracy(zoneOf(owner.currentZoneId) || zoneOf(0));
    let evadeChance = evasionChance(finalEvasion, enemyAccuracy);
    let finalDeflectChance = Math.max(0, gearBase.deflectChance + gearExplicit.deflectChance + passive.deflectChance + season.deflectChance + ascend.deflectChance + support.deflectChance + reward.deflectChance);
    let finalDeflectDamageReduce = Math.max(0, gearBase.deflectDamageReduce + gearExplicit.deflectDamageReduce + passive.deflectDamageReduce + season.deflectDamageReduce + ascend.deflectDamageReduce + support.deflectDamageReduce + reward.deflectDamageReduce);
    return { finalEnergyShieldRegenRate, finalEnergyShieldRechargeDelay, referenceIncomingPhysical, armorReduction, enemyAccuracy, evadeChance, finalDeflectChance, finalDeflectDamageReduce };
}

function computePlayerCriticalDamage(input, baseMultiplier) {
    const { gearBase, gearExplicit, passive, season, ascend, support, reward, skill, activeShadowStealth, uniqueDeflectStealth } = input;
    return baseMultiplier + gearBase.critDmg + gearExplicit.critDmg + passive.critDmg + season.critDmg + ascend.critDmg + support.critDmg + reward.critDmg + (skill.critDmgBonus || 0) + (activeShadowStealth ? Math.max(0, Number(uniqueDeflectStealth.critDmg || 20)) : 0);
}

function computePlayerLeech(input, deps) {
    let { gearBase, gearExplicit, passive, season, ascend, support, reward, skill, sumStatAcrossBuckets, isSpellSkill, uniqueLeechEfficiencyOnKill, tick } = input;
    const { CRIT_DAMAGE_BASE_MULTIPLIER, keystoneActive, capLeech } = deps;
    let finalCritDmg = computePlayerCriticalDamage(input, CRIT_DAMAGE_BASE_MULTIPLIER);
    let rawLeech = (skill.leech || 0) + gearBase.leech + gearExplicit.leech + passive.leech + season.leech + ascend.leech + support.leech + reward.leech;
    let wildnessLeech = keystoneActive('sb3') ? 3.5 : 0;
    rawLeech += wildnessLeech;
    let finalLeech = capLeech(rawLeech - wildnessLeech) + wildnessLeech;
    let finalSpellLeech = capLeech(sumStatAcrossBuckets('spellLeech') + (skill.spellLeech || 0));
    if (isSpellSkill) finalCritDmg += sumStatAcrossBuckets('spellCritDmg');
    if (uniqueLeechEfficiencyOnKill && tick.get('leechEfficiency')) {
        finalLeech *= (1 + Math.max(0, uniqueLeechEfficiencyOnKill.efficiencyPct || 0) / 100);
        finalSpellLeech *= (1 + Math.max(0, uniqueLeechEfficiencyOnKill.efficiencyPct || 0) / 100);
    }
    return { finalCritDmg, rawLeech, wildnessLeech, finalLeech, finalSpellLeech };
}

function computePlayerLeechCaps(input, deps) {
    let { gearBase, gearExplicit, passive, season, ascend, support, reward, cosmosDeepSeaLeechCaps, finalLeech, finalSpellLeech } = input;
    const { LEECH_BASE_RATE_CAP_PCT, LEECH_BASE_TOTAL_CAP_PCT, LEECH_BASE_INSTANCE_CAP_PCT } = deps;
    let finalLeechRateCap = gearBase.leechRateCap + gearExplicit.leechRateCap + passive.leechRateCap + season.leechRateCap + ascend.leechRateCap + support.leechRateCap + reward.leechRateCap;
    let finalLeechTotalCap = gearBase.leechTotalCap + gearExplicit.leechTotalCap + passive.leechTotalCap + season.leechTotalCap + ascend.leechTotalCap + support.leechTotalCap + reward.leechTotalCap;
    let finalLeechInstanceCap = gearBase.leechInstanceCap + gearExplicit.leechInstanceCap + passive.leechInstanceCap + season.leechInstanceCap + ascend.leechInstanceCap + support.leechInstanceCap + reward.leechInstanceCap;
    let finalLeechKeepFullLife = gearBase.leechKeepFullLife + gearExplicit.leechKeepFullLife + passive.leechKeepFullLife + season.leechKeepFullLife + ascend.leechKeepFullLife + support.leechKeepFullLife + reward.leechKeepFullLife;
    if (cosmosDeepSeaLeechCaps) {
        finalLeech *= Math.max(0, 1 - Math.max(0, cosmosDeepSeaLeechCaps.rateLessPct || 20) / 100);
        finalSpellLeech *= Math.max(0, 1 - Math.max(0, cosmosDeepSeaLeechCaps.rateLessPct || 20) / 100);
        finalLeechRateCap += LEECH_BASE_RATE_CAP_PCT * Math.max(0, (cosmosDeepSeaLeechCaps.capMul || 2) - 1);
        finalLeechTotalCap += LEECH_BASE_TOTAL_CAP_PCT * Math.max(0, (cosmosDeepSeaLeechCaps.capMul || 2) - 1);
        finalLeechInstanceCap += LEECH_BASE_INSTANCE_CAP_PCT * Math.max(0, (cosmosDeepSeaLeechCaps.capMul || 2) - 1);
    }
    return { finalLeechRateCap, finalLeechTotalCap, finalLeechInstanceCap, finalLeechKeepFullLife, finalLeech, finalSpellLeech };
}

function computePlayerPhysicalMitigation(input, deps) {
    let { gearBase, gearExplicit, passive, season, ascend, support, reward, skill } = input;
    const { PLAYER_PHYSICAL_REDUCTION_CAP_PCT } = deps;
    let rawDr = gearBase.dr + gearExplicit.dr + passive.dr + season.dr + ascend.dr + support.dr + reward.dr;
    let finalDr = Math.min(PLAYER_PHYSICAL_REDUCTION_CAP_PCT, rawDr);
    let finalPhysIgnore = gearBase.physIgnore + gearExplicit.physIgnore + passive.physIgnore + season.physIgnore + ascend.physIgnore + support.physIgnore + reward.physIgnore + (skill.physIgnoreBonus || 0);
    return { rawDr, finalDr, finalPhysIgnore };
}

export function createPlayerStatMath(deps) {
    return Object.freeze({
        coreModifiers: input => computePlayerCoreModifiers(input),
        weaponDamage: input => computePlayerWeaponDamage(input),
        spellDamage: input => computePlayerSpellDamage(input, deps),
        elementHits: input => computePlayerElementHits(input),
        lifeDamage: input => computePlayerLifeDamage(input),
        talentDamage: input => computePlayerTalentDamage(input, deps),
        attackSpeed: input => computePlayerAttackSpeed(input, deps),
        defenseBase: input => computePlayerDefenseBase(input),
        shieldBonuses: input => computePlayerShieldBonuses(input, deps),
        defenseRates: input => computePlayerDefenseRates(input, deps),
        leech: input => computePlayerLeech(input, deps),
        leechCaps: input => computePlayerLeechCaps(input, deps),
        physicalMitigation: input => computePlayerPhysicalMitigation(input, deps)
    });
}
