// 재능 개화 표면 효과의 정밀 전투 규칙.
// 정적 정의는 data/talent-cards.js가 소유하고, 이 파일은 상태/계산만 담당한다.

function getPreciseTalentLevel(cardId) {
    return typeof isTalentCardActive === 'function' ? Math.max(0, Number(isTalentCardActive(cardId)) || 0) : 0;
}

function getPreciseTalentRatio(cardId) {
    return Math.min(1, getPreciseTalentLevel(cardId) / TALENT_CARD_MAX_LEVEL);
}

function isTalentElementalSkill(skill) {
    if (!skill) return false;
    return ['fire', 'cold', 'light'].includes(skill.ele)
        || (Array.isArray(skill.randomElementPool) && skill.randomElementPool.length > 0);
}

function getTalentPreciseDerivedBonuses(source) {
    let out = { skillIncreasePct: 0 };
    if (!isTalentElementalSkill(source.skill)) return out;
    out.skillIncreasePct += source.summonPct * 0.20 * getPreciseTalentRatio('hero9__soulbinder');
    let elementValues = { fire: source.firePct, cold: source.coldPct, light: source.lightPct };
    let lowest = Math.min(elementValues.fire, elementValues.cold, elementValues.light);
    let randomElement = source.skill && Array.isArray(source.skill.randomElementPool)
        && source.skill.randomElementPool.length > 0;
    if (!randomElement && source.skill && elementValues[source.skill.ele] === lowest) {
        out.skillIncreasePct += 10 * getPreciseTalentRatio('hero9__elementalist');
    }
    return out;
}

function getTalentAttackSpeedSoftcapKnee(baseKnee) {
    return getPreciseTalentLevel('hero4__gladiator') ? Math.max(baseKnee, 6) : baseKnee;
}

function applyTalentDerivedDefenseStats(pStats) {
    let rawCrit = Math.max(0, Number(pStats.rawCrit !== undefined ? pStats.rawCrit : pStats.crit) || 0);
    let rawCritDmg = Math.max(0, Number(pStats.rawCritDmg !== undefined ? pStats.rawCritDmg : pStats.critDmg) || 0);
    rawCritDmg += Math.max(0, rawCrit - 100) * 0.50 * getPreciseTalentRatio('hero6__ranger');
    if (rawCrit >= 100) rawCritDmg += 25 * getPreciseTalentRatio('hero4__assassin');
    let allowOvercapCrit = getPreciseTalentLevel('hero4__assassin') || getPreciseTalentLevel('hero6__ranger');
    pStats.crit = Math.min(allowOvercapCrit ? 1000 : 100, rawCrit);
    pStats.critDmg = typeof applyCritDamageSoftcap === 'function' ? applyCritDamageSoftcap(rawCritDmg) : rawCritDmg;
    pStats.energyShield = Math.floor(pStats.energyShield);
    pStats.blockChance = Math.min(pStats.blockChanceMax || 50, Math.max(0, pStats.blockChance));
    if (typeof getEvasionChancePct === 'function') {
        pStats.evadeChance = getEvasionChancePct(pStats.evasion, Math.max(1, Number(pStats.enemyAccuracy) || 1));
    }
    if (getPreciseTalentLevel('hero9__crusader')) {
        pStats.maxHp = 1;
        pStats.lifeRecoveryCap = 1;
    }
}

function applyTalentPrecisePostStats(pStats) {
    if (!pStats || !pStats.talentSourceStats) return pStats;
    let source = pStats.talentSourceStats;
    let before = getTalentDpsFactors(pStats, false);
    applyTalentDerivedDefenseStats(pStats);
    pStats.summonPctDmg += source.elementalPct * 0.10 * getPreciseTalentRatio('hero9__soulbinder');
    let resonanceRatio = getPreciseTalentRatio('hero5__inquisitor');
    if (resonanceRatio) pStats.baseDmg *= 1 + getTalentRemainingResonance(pStats) * 0.25 * resonanceRatio / 100;
    let randomElements = Array.isArray(pStats.sSkill && pStats.sSkill.randomElementPool)
        && pStats.sSkill.randomElementPool.length > 0;
    if (randomElements) applyTalentRandomElementBonuses(pStats, source);
    pStats.lifeRecoveryCap = Math.max(1, pStats.maxHp * (1 + (pStats.uniqueOverhealCapPct || 0) / 100));
    let after = getTalentDpsFactors(pStats, true);
    if (Number.isFinite(pStats.dps) && before.total > 0) pStats.dps *= after.total / before.total;
    return pStats;
}

function getTalentDpsFactors(pStats, includeTalentLuck) {
    let critChance = Math.max(0, Math.min(1, (Number(pStats.crit) || 0) / 100));
    if (includeTalentLuck && (getPreciseTalentLevel('hero4__assassin') || getPreciseTalentLevel('hero6__ranger'))) {
        critChance = 1 - Math.pow(1 - critChance, 2);
    }
    let critMul = Math.max(1, (Number(pStats.critDmg) || 100) / 100);
    let critFactor = 1 + critChance * (critMul - 1);
    let strikeFactor = 1 + Math.max(0, Number(pStats.ds) || 0) / 100;
    let total = Math.max(0, Number(pStats.baseDmg) || 0) * Math.max(0, Number(pStats.aspd) || 0) * critFactor * strikeFactor;
    return { total };
}

function applyTalentRandomElementBonuses(pStats, source) {
    let bonuses = pStats.randomElementDamagePct || (pStats.randomElementDamagePct = { fire: 0, cold: 0, light: 0 });
    let artistRatio = getPreciseTalentRatio('hero9__elementalist');
    let lowest = Math.min(source.firePct, source.coldPct, source.lightPct);
    ['fire', 'cold', 'light'].forEach(ele => {
        if (artistRatio && source[`${ele}Pct`] === lowest) bonuses[ele] = (bonuses[ele] || 0) + 10 * artistRatio;
    });
}

function rollTalentPlayerCrit(chancePct) {
    let chance = Math.max(0, Number(chancePct) || 0) / 100;
    let lucky = getPreciseTalentLevel('hero4__assassin') || getPreciseTalentLevel('hero6__ranger');
    if (!lucky) return Math.random() < chance;
    return Math.random() < chance || Math.random() < chance;
}

function getTalentCritDamageMultiplier(isCrit) {
    if (!isCrit) return 1;
    let alive = (game.enemies || []).filter(row => row && row.hp > 0).length;
    return alive === 1 ? 1 + 0.12 * getPreciseTalentRatio('hero1__hunter') : 1;
}

function getTalentPrecisePlayerHitMultiplier(ele) {
    return ele === 'chaos' ? 1 + 0.10 * getPreciseTalentRatio('hero9__warlock') : 1;
}

function getTalentRemainingResonance(pStats) {
    let cap = Math.max(0, Math.floor(Number(game.resonancePower) || 0)
        + Math.floor(Number(pStats && pStats.runeResonancePower) || 0)
        + Math.floor(Number(pStats && pStats.inquisitorResonanceBonus) || 0));
    let used = (game.equippedSupports || []).reduce((sum, name) => {
        if (typeof getSupportTierResonanceCost === 'function') return sum + getSupportTierResonanceCost(name);
        let def = typeof SUPPORT_GEM_DB !== 'undefined' ? SUPPORT_GEM_DB[name] : null;
        return sum + Math.max(0, Number(def && def.resonanceCost) || 0);
    }, 0);
    return Math.max(0, cap - used);
}

function getTalentDotDamageMultiplier() {
    return 1 + 0.10 * getPreciseTalentRatio('hero9__warlock');
}

function getTalentButcherBossMultiplier(enemy) {
    if (!enemy || !enemy.isBoss || !getPreciseTalentLevel('hero2__assassin')) return 1;
    let row = game.talentButcherMarks && game.talentButcherMarks[enemy.id];
    let lifeRatio = Math.max(0, enemy.hp || 0) / Math.max(1, enemy.maxHp || 1);
    if (!row || row.hits < 4 || lifeRatio > 0.30) return 1;
    let missing = Math.min(0.50, Math.max(0, 1 - lifeRatio));
    return 1 + 0.12 * (missing / 0.50) * getPreciseTalentRatio('hero2__assassin');
}

function getTalentDamageConversion(hitElement) {
    let result = { element: hitElement, mainPct: 1, added: {} };
    if (hitElement === 'light' && getPreciseTalentLevel('hero5__assassin')) result.element = 'chaos';
    if (hitElement === 'phys' && getPreciseTalentLevel('hero5__ranger')) {
        result.mainPct = 0.5;
        result.added.light = 50 * getPreciseTalentRatio('hero5__ranger');
    }
    return result;
}

function getTalentAilmentReplacement(type) {
    if (getPreciseTalentLevel('hero9__warlock') && ['ignite', 'chill', 'freeze', 'shock'].includes(type)) return 'poison';
    return type;
}

function shouldTalentSkipColdFreeze() {
    return !!getPreciseTalentLevel('hero9__warlock');
}

/** 니트로 사이트: 증폭된 점화를 다시 걸면 남은 점화 피해의 15%를 바로 준다. */
function enhanceTalentAilmentReapplication(enemy, row, type, pStats) {
    if (!row || type !== 'ignite' || !row.talentNitroAmplified || !getPreciseTalentLevel('hero6__catalyst')) return;
    let remaining = getEnemyDamageAilmentDps(row, pStats) * Math.max(0, row.time || 0) * 0.15;
    if (remaining > 0) applyDamageToEnemyResource(enemy, Math.floor(remaining));
}

function decorateTalentAilmentPayload(type, payload, pStats) {
    if (type !== 'ignite' || !getPreciseTalentLevel('hero6__catalyst')) return payload;
    let chance = getPlayerAilmentChance(pStats, 'ignite') * 0.40 * getPreciseTalentRatio('hero6__catalyst');
    if (Math.random() >= chance) return payload;
    payload.talentNitroAmplified = true;
    payload.talentDamageMorePct = (payload.talentDamageMorePct || 0) + 30 * getPreciseTalentRatio('hero6__catalyst');
    return payload;
}

function afterTalentAilmentApplied(enemy, type) {
    let stored = enemy && enemy.talentAilmentSeed;
    if (stored && stored.type !== type && getPreciseTalentLevel('hero3__catalyst')) {
        applyDamageToEnemyResource(enemy, Math.max(0, Math.floor(stored.damage || 0)));
        delete enemy.talentAilmentSeed;
    }
}

function storeExpiredTalentAilmentSeed(enemy, ailment, remainingDamage) {
    if (!getPreciseTalentLevel('hero3__catalyst') || !isDamageAilmentType(ailment && ailment.type)) return;
    enemy.talentAilmentSeed = { type: ailment.type, damage: Math.max(0, Number(remainingDamage) || 0) };
}

function getTalentDotOccupancyDamage(enemy, pStats) {
    if (!enemy || !getPreciseTalentLevel('hero1__catalyst')) return 0;
    return (enemy.ailments || []).reduce((sum, row) => {
        if (!row || !isDamageAilmentType(row.type) || (row.time || 0) <= 0) return sum;
        return sum + getEnemyDamageAilmentDps(row, pStats) * Math.max(0, row.time || 0) * Math.max(1, row.stacks || 1);
    }, 0);
}

function getTalentEnemyRegenMultiplier(enemy) {
    return getPreciseTalentLevel('hero5__assassin') && enemy && enemy.talentHitByChaos ? 0.5 : 1;
}

function isTalentMonsterAlwaysHit() {
    return !!getPreciseTalentLevel('hero3__gladiator');
}

function isTalentPlayerAttackDisabled() {
    return !!getPreciseTalentLevel('hero3__soulbinder');
}

function enforceTalentCombatState(pStats) {
    if (!pStats || !getPreciseTalentLevel('hero9__crusader')) return;
    game.playerHp = Math.min(1, Math.max(0, Number(game.playerHp) || 0));
}

safeExposeGlobals({
    getPreciseTalentLevel,
    getPreciseTalentRatio,
    getTalentPreciseDerivedBonuses,
    getTalentAttackSpeedSoftcapKnee,
    applyTalentPrecisePostStats,
    rollTalentPlayerCrit,
    getTalentCritDamageMultiplier,
    getTalentPrecisePlayerHitMultiplier,
    getTalentRemainingResonance,
    getTalentDotDamageMultiplier,
    getTalentButcherBossMultiplier,
    getTalentDamageConversion,
    getTalentAilmentReplacement,
    shouldTalentSkipColdFreeze,
    enhanceTalentAilmentReapplication,
    decorateTalentAilmentPayload,
    afterTalentAilmentApplied,
    storeExpiredTalentAilmentSeed,
    getTalentDotOccupancyDamage,
    getTalentEnemyRegenMultiplier,
    isTalentMonsterAlwaysHit,
    isTalentPlayerAttackDisabled,
    enforceTalentCombatState
});
