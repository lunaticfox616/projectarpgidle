// Ordered, per-evaluation stages; c is private scratch state, never saved or shared between calls.

export function prepareResistanceCaps(c, deps) {
    c.resistPenalty = deps.campaignPenalty(c.owner.maxZoneId);
    c.resistanceBlendBonus = 0;
    c.resistanceBlendMaxBonus = 0;
    c.crusaderLightningMaxResBonus = 0;
    c.elementalistResistanceShift = { resF: 0, resC: 0, resL: 0, resChaos: 0 };
    c.elementalistChaosConversionBonus = 0;
    c.sharedElementalMaxRes = c.gearBase.maxResAll + c.gearExplicit.maxResAll + c.passive.maxResAll + c.season.maxResAll + c.ascend.maxResAll + c.support.maxResAll + c.reward.maxResAll;
    c.finalMaxResF = Math.min(90, 75 + c.sharedElementalMaxRes + c.gearBase.maxResF + c.gearExplicit.maxResF + c.passive.maxResF + c.season.maxResF + c.ascend.maxResF + c.support.maxResF + c.reward.maxResF);
    c.finalMaxResC = Math.min(90, 75 + c.sharedElementalMaxRes + c.gearBase.maxResC + c.gearExplicit.maxResC + c.passive.maxResC + c.season.maxResC + c.ascend.maxResC + c.support.maxResC + c.reward.maxResC);
    c.finalMaxResL = Math.min(90, 75 + c.sharedElementalMaxRes + c.gearBase.maxResL + c.gearExplicit.maxResL + c.passive.maxResL + c.season.maxResL + c.ascend.maxResL + c.support.maxResL + c.reward.maxResL);
    c.finalMaxResChaos = Math.min(90, 75 + c.gearBase.maxResChaos + c.gearExplicit.maxResChaos + c.passive.maxResChaos + c.season.maxResChaos + c.ascend.maxResChaos + c.support.maxResChaos + c.reward.maxResChaos);
    c.hasElementalistPrismaticShell = deps.keystone('e2');
    if (c.hasElementalistPrismaticShell) {
        c.elementalistResistanceShift = { resF: 15, resC: 15, resL: 15, resChaos: -10 };
        c.finalMaxResF = Math.min(90, c.finalMaxResF + 3);
        c.finalMaxResC = Math.min(90, c.finalMaxResC + 3);
        c.finalMaxResL = Math.min(90, c.finalMaxResL + 3);
    }
}

export function prepareRawResistance(c, deps) {
    c.rawResF = c.gearBase.resF + c.gearExplicit.resF + c.passive.resF + c.season.resF + c.ascend.resF + c.support.resF + c.reward.resF + c.elementalistResistanceShift.resF - c.resistPenalty - c.oceanCurrentResPenaltyF;
    c.rawResC = c.gearBase.resC + c.gearExplicit.resC + c.passive.resC + c.season.resC + c.ascend.resC + c.support.resC + c.reward.resC + c.elementalistResistanceShift.resC - c.resistPenalty - c.oceanCurrentResPenaltyC;
    c.rawResL = c.gearBase.resL + c.gearExplicit.resL + c.passive.resL + c.season.resL + c.ascend.resL + c.support.resL + c.reward.resL + c.elementalistResistanceShift.resL - c.resistPenalty;
    c.rawResChaos = c.gearBase.resChaos + c.gearExplicit.resChaos + c.passive.resChaos + c.season.resChaos + c.ascend.resChaos + c.support.resChaos + c.reward.resChaos + c.elementalistResistanceShift.resChaos - c.resistPenalty;
    if (c.uniqueRegenRateAndRegen) { c.finalRegen += Number(c.uniqueRegenRateAndRegen.regen || 0); c.finalRegen *= (1 + Math.max(0, Number(c.uniqueRegenRateAndRegen.regenRatePct || 0)) / 100); }
    if (c.uniqueAllMaxRes) { c.finalMaxResF += c.uniqueAllMaxRes; c.finalMaxResC += c.uniqueAllMaxRes; c.finalMaxResL += c.uniqueAllMaxRes; }
    if (c.uniqueEnemyRegenCutAndMinRoll) c.finalMinDmgRoll += Number(c.uniqueEnemyRegenCutAndMinRoll.minRoll || 0);
    if (deps.keystone('ct2')) {
        c.resistanceBlendBonus = Math.max(0, c.dotPctDmg) * deps.keystoneValues.ct2.resPctOfDot / 100;
        c.resistanceBlendMaxBonus = Math.floor(Math.max(0, c.dotPctDmg) * deps.keystoneValues.ct2.maxResPctOfDot / 100);
        c.rawResF += c.resistanceBlendBonus; c.rawResC += c.resistanceBlendBonus; c.rawResL += c.resistanceBlendBonus; c.rawResChaos += c.resistanceBlendBonus;
        c.finalMaxResF = Math.min(90, c.finalMaxResF + c.resistanceBlendMaxBonus);
        c.finalMaxResC = Math.min(90, c.finalMaxResC + c.resistanceBlendMaxBonus);
        c.finalMaxResL = Math.min(90, c.finalMaxResL + c.resistanceBlendMaxBonus);
        c.finalMaxResChaos = Math.min(90, c.finalMaxResChaos + c.resistanceBlendMaxBonus);
    }
    if (c.fixedAllMaxRes !== null) {
        c.finalMaxResF = c.fixedAllMaxRes;
        c.finalMaxResC = c.fixedAllMaxRes;
        c.finalMaxResL = c.fixedAllMaxRes;
        c.finalMaxResChaos = c.fixedAllMaxRes;
    }
    c.finalResF = Math.min(c.finalMaxResF, c.rawResF);
    c.finalResC = Math.min(c.finalMaxResC, c.rawResC);
    c.finalResL = Math.min(c.finalMaxResL, c.rawResL);
    c.warlockElementalOvercapToChaos = (deps.keystone('wlk4'))
        ? (Math.max(0, c.rawResF - c.finalMaxResF) + Math.max(0, c.rawResC - c.finalMaxResC) + Math.max(0, c.rawResL - c.finalMaxResL)) * 0.25
        : 0;
    c.finalResChaos = Math.min(c.finalMaxResChaos, c.rawResChaos + c.warlockElementalOvercapToChaos);
}

export function prepareWardOvercap(c, deps) {
    c.cw = typeof deps.wards === 'object' ? deps.wards.equippedLines(c.owner) : [];
    c.cw.forEach(w => { if (w && w.stat) c.colonyWardBonus[w.stat] = (c.colonyWardBonus[w.stat] || 0) + Number(w.val || 0); });
    c.fireResForOvercap = c.rawResF + (c.colonyWardBonus.resAll || 0);
    c.maxResFForOvercap = Math.min(90, c.finalMaxResF + (c.colonyWardBonus.maxResF || 0));
    if (c.activeUniqueIds.has('uj_burning_will')) {
        let overcapFire = Math.max(0, c.fireResForOvercap - c.maxResFForOvercap);
        c.finalBaseDmg = Math.floor(c.finalBaseDmg * (1 + Math.min(0.35, overcapFire * 0.005)));
    }
}

export function prepareDamageScaling(c) {
    c.regenDmgScale = Math.max(0, Number(c.skill.regenDmgScale) || 0);
    c.regenScaledBonus = c.regenDmgScale > 0 ? 1 + Math.max(0, c.finalRegen * c.regenDmgScale / 100) : 1;
    c.fireResOvercap = Math.max(0, c.fireResForOvercap - c.maxResFForOvercap);
    c.fireResOvercapCap = Number.isFinite(Number(c.skill.fireResOvercapCap)) ? Math.max(0, Number(c.skill.fireResOvercapCap)) : Infinity;
    c.effectiveFireResOvercap = Math.min(c.fireResOvercap, c.fireResOvercapCap);
    c.fireResOvercapAdditiveMultiplier = Math.max(0, c.skill.fireResOvercapMulPerPct || 0);
    c.fireResDmgScale = Math.max(0, Number(c.skill.fireResDmgScale) || 0);
    c.fireResScaledBonus = c.fireResOvercapAdditiveMultiplier > 0
        ? 1 + (c.effectiveFireResOvercap * c.fireResOvercapAdditiveMultiplier)
        : (c.fireResDmgScale > 0 ? 1 + Math.max(0, c.finalResF * c.fireResDmgScale) : 1);
    c.dotMultiplier = c.skill.dotMultiplier || 1;
    c.dotStatMultiplier = 1 + Math.max(0, c.dotPctDmg) / 100;
    c.totalDotDamageMultiplier = c.dotMultiplier * c.dotStatMultiplier;
    c.instantDamageMultiplier = 1;
    c.ailmentPowerMultiplier = 1 + Math.max(0, c.sumStatAcrossBuckets('ailmentPotencyPct')) / 100;
    c.finalAilmentDamagePct = Math.max(0, c.sumStatAcrossBuckets('ailmentDamagePct'));
    c.talismanBossFinalDmgBonusPct = 0;
    c.chaosDamageMultiplier = 1;
    c.dotTickIntervalMultiplier = 1;
    c.dotDurationMultiplier = 1;
}

export function applyUniqueDamageScaling(c) {
    if (c.uniqueCurseCrownPerCursePct>0){ let n=c.tick.get('targetCurseCount'); if(n>0) c.finalDamageMultiplier*=(1+(n*c.uniqueCurseCrownPerCursePct)/100);}
    if (c.cosmosVerdictSupportDamagePct > 0) c.finalDamageMultiplier *= (1 + (c.safeEquippedSupports.length * c.cosmosVerdictSupportDamagePct) / 100);
    c.finalBaseDmg = Math.floor(c.finalBaseDmg * c.regenScaledBonus * c.fireResScaledBonus);
    applyArmorDamageScaling(c);
    if (c.uniqueFlatDmgPerLevel > 0) c.finalBaseDmg += Math.floor(Math.max(1, c.owner.level || 1) * c.uniqueFlatDmgPerLevel);
    c.talismanBossFinalDmgBonusPct = Math.max(c.talismanBossFinalDmgBonusPct, Number(c.talismanSummary.bossFinalDmgBonusPct) || 0);
    c.damageScales = {
        hpFlatBonus: c.hpFlatBonus,
        hpScaleRatio: c.hpScaleRatio,
        regen: c.regenScaledBonus,
        fireRes: c.fireResScaledBonus,
        fireResOvercap: c.fireResOvercap,
        effectiveFireResOvercap: c.effectiveFireResOvercap,
        fireResOvercapCap: c.fireResOvercapCap,
        rawResF: c.fireResForOvercap,
        fireResOvercapAdditiveMultiplier: c.fireResOvercapAdditiveMultiplier,
        dot: c.dotMultiplier,
        dotStat: c.dotStatMultiplier,
        randomElementDamagePct: c.randomElementDamagePct,
        crusaderThunderDoctrinePct: c.crusaderThunderDoctrinePct,
        talismanBossFinalDmgBonusPct: c.talismanBossFinalDmgBonusPct
    };
    c.critChance = c.finalCrit / 100;
    c.critMulti = c.finalCritDmg / 100;
    c.avgHit = c.finalBaseDmg * (1 - c.critChance) + c.finalBaseDmg * c.critChance * c.critMulti;
    c.finalDps = c.avgHit * c.finalAspd;
}

function applyArmorDamageScaling(c) {
    if (c.uniqueArmorToPhysicalDamagePctPer1000 > 0 && c.skill && c.skill.ele === 'phys') {
        const armorSteps = Math.max(0, Math.floor(c.finalArmor / 1000));
        if (armorSteps > 0) c.finalBaseDmg = Math.floor(c.finalBaseDmg * (1 + (armorSteps * c.uniqueArmorToPhysicalDamagePctPer1000) / 100));
    }
}
