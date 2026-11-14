import { bloomPreciseIsTalentElementalSkill, bloomPreciseGetPreciseTalentRatio, bloomPreciseGetPreciseTalentLevel } from './talent-precise-levels.mjs';

export function bloomPreciseGetTalentPreciseDerivedBonuses(env, owner, source) {
    let out = { skillIncreasePct: 0 };
    if (!bloomPreciseIsTalentElementalSkill(source.skill)) return out;
    out.skillIncreasePct += source.summonPct * 0.20 * bloomPreciseGetPreciseTalentRatio(env, owner, 'hero9__soulbinder');
    let elementValues = { fire: source.firePct, cold: source.coldPct, light: source.lightPct };
    let lowest = Math.min(elementValues.fire, elementValues.cold, elementValues.light);
    let randomElement = source.skill && Array.isArray(source.skill.randomElementPool)
        && source.skill.randomElementPool.length > 0;
    if (!randomElement && source.skill && elementValues[source.skill.ele] === lowest) {
        out.skillIncreasePct += 10 * bloomPreciseGetPreciseTalentRatio(env, owner, 'hero9__elementalist');
    }
    return out;
}

export function bloomPreciseGetTalentAttackSpeedSoftcapKnee(env, owner, baseKnee) {
    return bloomPreciseGetPreciseTalentLevel(env, owner, 'hero4__gladiator') ? Math.max(baseKnee, 6) : baseKnee;
}

export function bloomPreciseApplyTalentDerivedDefenseStats(env, owner, pStats) {
    applyTalentCritStats(env, owner, pStats);
    pStats.energyShield = Math.floor(pStats.energyShield);
    pStats.blockChance = Math.min(pStats.blockChanceMax || 50, Math.max(0, pStats.blockChance));
    if (typeof env.deps.getEvasionChancePct === 'function') {
        pStats.evadeChance = env.deps.getEvasionChancePct(pStats.evasion, Math.max(1, Number(pStats.enemyAccuracy) || 1));
    }
    if (bloomPreciseGetPreciseTalentLevel(env, owner, 'hero9__crusader')) {
        pStats.maxHp = 1;
        pStats.lifeRecoveryCap = 1;
    }
}

function applyTalentCritStats(env, owner, pStats) {
    let rawCrit = Math.max(0, Number(pStats.rawCrit !== undefined ? pStats.rawCrit : pStats.crit) || 0);
    let rawCritDmg = Math.max(0, Number(pStats.rawCritDmg !== undefined ? pStats.rawCritDmg : pStats.critDmg) || 0);
    rawCritDmg += Math.max(0, rawCrit - 100) * 0.50 * bloomPreciseGetPreciseTalentRatio(env, owner, 'hero6__ranger');
    if (rawCrit >= 100) rawCritDmg += 25 * bloomPreciseGetPreciseTalentRatio(env, owner, 'hero4__assassin');
    let allowOvercapCrit = bloomPreciseGetPreciseTalentLevel(env, owner, 'hero4__assassin') || bloomPreciseGetPreciseTalentLevel(env, owner, 'hero6__ranger');
    pStats.crit = Math.min(allowOvercapCrit ? 1000 : 100, rawCrit);
    pStats.critDmg = typeof env.deps.applyCritDamageSoftcap === 'function' ? env.deps.applyCritDamageSoftcap(rawCritDmg) : rawCritDmg;
}

export function bloomPreciseApplyTalentPrecisePostStats(env, owner, pStats) {
    if (!pStats || !pStats.talentSourceStats) return pStats;
    let source = pStats.talentSourceStats;
    let before = bloomPreciseGetTalentDpsFactors(env, owner, pStats, false);
    bloomPreciseApplyTalentDerivedDefenseStats(env, owner, pStats);
    pStats.summonPctDmg += source.elementalPct * 0.10 * bloomPreciseGetPreciseTalentRatio(env, owner, 'hero9__soulbinder');
    let resonanceRatio = bloomPreciseGetPreciseTalentRatio(env, owner, 'hero5__inquisitor');
    if (resonanceRatio) pStats.baseDmg *= 1 + bloomPreciseGetTalentRemainingResonance(env, owner, pStats) * 0.25 * resonanceRatio / 100;
    let randomElements = Array.isArray(pStats.sSkill && pStats.sSkill.randomElementPool)
        && pStats.sSkill.randomElementPool.length > 0;
    if (randomElements) bloomPreciseApplyTalentRandomElementBonuses(env, owner, pStats, source);
    pStats.lifeRecoveryCap = Math.max(1, pStats.maxHp * (1 + (pStats.uniqueOverhealCapPct || 0) / 100));
    let after = bloomPreciseGetTalentDpsFactors(env, owner, pStats, true);
    if (Number.isFinite(pStats.dps) && before.total > 0) pStats.dps *= after.total / before.total;
    return pStats;
}

export function bloomPreciseGetTalentDpsFactors(env, owner, pStats, includeTalentLuck) {
    let critChance = Math.max(0, Math.min(1, (Number(pStats.crit) || 0) / 100));
    if (includeTalentLuck && (bloomPreciseGetPreciseTalentLevel(env, owner, 'hero4__assassin') || bloomPreciseGetPreciseTalentLevel(env, owner, 'hero6__ranger'))) {
        critChance = 1 - Math.pow(1 - critChance, 2);
    }
    let critMul = Math.max(1, (Number(pStats.critDmg) || 100) / 100);
    let critFactor = 1 + critChance * (critMul - 1);
    let strikeFactor = 1 + Math.max(0, Number(pStats.ds) || 0) / 100;
    let total = Math.max(0, Number(pStats.baseDmg) || 0) * Math.max(0, Number(pStats.aspd) || 0) * critFactor * strikeFactor;
    return { total };
}

export function bloomPreciseApplyTalentRandomElementBonuses(env, owner, pStats, source) {
    let bonuses = pStats.randomElementDamagePct || (pStats.randomElementDamagePct = { fire: 0, cold: 0, light: 0 });
    let artistRatio = bloomPreciseGetPreciseTalentRatio(env, owner, 'hero9__elementalist');
    let lowest = Math.min(source.firePct, source.coldPct, source.lightPct);
    ['fire', 'cold', 'light'].forEach(ele => {
        if (artistRatio && source[`${ele}Pct`] === lowest) bonuses[ele] = (bonuses[ele] || 0) + 10 * artistRatio;
    });
}

export function bloomPreciseGetTalentRemainingResonance(env, owner, pStats) {
    let cap = Math.max(0, Math.floor(Number(owner.resonancePower) || 0) + env.deps.gemDropRewards.sealResonance(owner)
        + Math.floor(Number(pStats && pStats.runeResonancePower) || 0)
        + Math.floor(Number(pStats && pStats.inquisitorResonanceBonus) || 0));
    let used = (owner.equippedSupports || []).reduce((sum, name) => {
        if (typeof env.deps.getSupportTierResonanceCost === 'function') return sum + env.deps.getSupportTierResonanceCost(name);
        let def = typeof env.deps.SUPPORT_GEM_DB !== 'undefined' ? env.deps.SUPPORT_GEM_DB[name] : null;
        return sum + Math.max(0, Number(def && def.resonanceCost) || 0);
    }, 0);
    return Math.max(0, cap - used);
}
