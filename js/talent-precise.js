// 재능 개화 표면 효과의 정밀 전투 규칙.
// 정적 정의는 data/talent-cards.js가 소유하고, 이 파일은 상태/계산만 담당한다.

function getPreciseTalentLevel(cardId) {
    return typeof isTalentCardActive === 'function' ? Math.max(0, Number(isTalentCardActive(cardId)) || 0) : 0;
}

function getPreciseTalentRatio(cardId) {
    return Math.min(1, getPreciseTalentLevel(cardId) / TALENT_CARD_MAX_LEVEL);
}

function isTalentTargetCursed(enemy) {
    let rows = enemy && game.enemyConditionDebuffs && game.enemyConditionDebuffs[enemy.id];
    if (Array.isArray(rows) && rows.some(row => row && (row.expiresAt || 0) > Date.now())) return true;
    return !!(enemy && Array.isArray(enemy.ailments) && enemy.ailments.some(row => {
        let type = String(row && row.type || '').toLowerCase();
        return type.includes('curse') && (row.time || 0) > 0;
    }));
}

function hasTalentEnemyAilment(enemy, types) {
    let wanted = Array.isArray(types) ? types : [types];
    return !!(enemy && Array.isArray(enemy.ailments)
        && enemy.ailments.some(row => row && wanted.includes(row.type) && (row.time || 0) > 0));
}

function getActiveTalentForm() {
    let loadout = Array.isArray(game.talentCardLoadout) ? game.talentCardLoadout : [];
    for (let cardId of loadout) {
        if (cardId === 'hero3__warrior' && getPreciseTalentLevel(cardId)) return 'buffalo';
        if (cardId === 'hero3__hunter' && getPreciseTalentLevel(cardId)) return 'bear';
    }
    return null;
}

function isTalentElementalSkill(skill) {
    if (!skill) return false;
    return ['fire', 'cold', 'light'].includes(skill.ele)
        || (Array.isArray(skill.randomElementPool) && skill.randomElementPool.length > 0);
}

function getTalentPreciseDerivedBonuses(source) {
    let out = { skillIncreasePct: 0, aspdIncreasePct: 0 };
    let tags = new Set((source.skill && source.skill.tags) || []);
    let elemental = isTalentElementalSkill(source.skill);
    if (tags.has('projectile')) out.skillIncreasePct += source.armorPct * 0.20 * getPreciseTalentRatio('hero6__guardian');
    if (tags.has('melee')) out.skillIncreasePct += source.armorPct * 0.25 * getPreciseTalentRatio('hero8__warrior');
    if (source.skill && source.skill.ele === 'phys') out.skillIncreasePct += source.armorPct * 0.25 * getPreciseTalentRatio('hero10__warrior');
    if (elemental) {
        out.skillIncreasePct += source.aspdPct * 0.25 * getPreciseTalentRatio('hero9__gladiator');
        out.skillIncreasePct += source.hpPct * getPreciseTalentRatio('hero9__guardian');
        out.skillIncreasePct += source.summonPct * 0.20 * getPreciseTalentRatio('hero9__soulbinder');
        let elementValues = { fire: source.firePct, cold: source.coldPct, light: source.lightPct };
        let lowest = Math.min(elementValues.fire, elementValues.cold, elementValues.light);
        let randomElement = source.skill && Array.isArray(source.skill.randomElementPool)
            && source.skill.randomElementPool.length > 0;
        if (!randomElement && source.skill && elementValues[source.skill.ele] === lowest) {
            out.skillIncreasePct += 10 * getPreciseTalentRatio('hero9__elementalist');
        }
    }
    out.aspdIncreasePct += source.elementalPct * 0.15 * getPreciseTalentRatio('hero9__gladiator');
    out.aspdIncreasePct += source.summonAspd * 0.15 * getPreciseTalentRatio('hero7__ranger');
    return out;
}

function getTalentAttackSpeedSoftcapKnee(baseKnee) {
    return getPreciseTalentLevel('hero4__gladiator') ? Math.max(baseKnee, 6) : baseKnee;
}

function applyTalentDerivedDefenseStats(pStats, source) {
    let smoker = source.dotPct * 0.20 * getPreciseTalentRatio('hero10__ranger');
    if (smoker) pStats.evasion = Math.floor(pStats.evasion * (1 + smoker / 100));
    if (getPreciseTalentLevel('hero8__warrior')) pStats.evasion = 0;
    let gateCrit = (pStats.blockChance + pStats.deflectChance) * 0.25 * getPreciseTalentRatio('hero8__assassin');
    let rawCrit = Math.max(0, Number(pStats.rawCrit !== undefined ? pStats.rawCrit : pStats.crit) || 0) + gateCrit;
    let rawCritDmg = Math.max(0, Number(pStats.rawCritDmg !== undefined ? pStats.rawCritDmg : pStats.critDmg) || 0);
    rawCritDmg += Math.max(0, rawCrit - 100) * 0.50 * getPreciseTalentRatio('hero6__ranger');
    if (rawCrit >= 100) rawCritDmg += 25 * getPreciseTalentRatio('hero4__assassin');
    let allowOvercapCrit = getPreciseTalentLevel('hero4__assassin') || getPreciseTalentLevel('hero6__ranger');
    pStats.crit = Math.min(allowOvercapCrit ? 1000 : 100, rawCrit);
    pStats.critDmg = typeof applyCritDamageSoftcap === 'function' ? applyCritDamageSoftcap(rawCritDmg) : rawCritDmg;
    let holyEs = Math.max(0, pStats.rawResL || 0) * 3 * getPreciseTalentRatio('hero8__crusader');
    pStats.energyShield = Math.floor(pStats.energyShield + holyEs);
    let alive = (game.enemies || []).filter(row => row && row.hp > 0).length;
    if (alive === 1) pStats.blockChance += 5 * getPreciseTalentRatio('hero8__gladiator');
    pStats.blockChance = Math.min(pStats.blockChanceMax || 50, Math.max(0, pStats.blockChance));
    if (typeof getEvasionChancePct === 'function') {
        pStats.evadeChance = getEvasionChancePct(pStats.evasion, Math.max(1, Number(pStats.enemyAccuracy) || 1));
    }
    if (getPreciseTalentLevel('hero9__crusader')) {
        pStats.maxHp = 1;
        pStats.lifeRecoveryCap = 1;
    }
}

function applyTalentDerivedRecoveryStats(pStats) {
    let oathRatio = getPreciseTalentRatio('hero4__crusader');
    if (oathRatio) {
        pStats.energyShieldRegenRate *= 1 + 0.20 * oathRatio;
        pStats.energyShieldRechargeDelay = Math.max(0, pStats.energyShieldRechargeDelay - 0.25 * oathRatio);
        pStats.regen *= 1 - 0.20 * oathRatio;
    }
    let anchorRatio = getPreciseTalentRatio('hero8__soulbinder');
    if (anchorRatio) pStats.regen *= 1 - 0.15 * anchorRatio;
    let holyRatio = getPreciseTalentRatio('hero8__crusader');
    if (holyRatio) {
        pStats.regen *= 1 + 0.10 * holyRatio;
        pStats.energyShieldRegenRate *= 1 + 0.10 * holyRatio;
    }
    if ((game.enemies || []).filter(row => row && row.hp > 0).length >= 3) {
        pStats.regen += 5 * getPreciseTalentRatio('hero8__hunter');
    }
    let grailRatio = getPreciseTalentRatio('hero10__crusader');
    if (grailRatio) {
        pStats.energyShieldRegenRate *= 1 + 0.20 * grailRatio;
        pStats.energyShieldRechargeDelay = Math.max(0, pStats.energyShieldRechargeDelay - 0.20 * grailRatio);
    }
}

function applyTalentDerivedSummonStats(pStats, source) {
    pStats.summonHpPct += source.hpPct * 0.10 * getPreciseTalentRatio('hero5__soulbinder');
    pStats.summonAspd += source.aspdPct * 0.10 * getPreciseTalentRatio('hero5__soulbinder');
    pStats.summonAspd += source.movePct * 0.30 * getPreciseTalentRatio('hero7__ranger');
    pStats.summonPctDmg += source.generalPct * 0.20 * getPreciseTalentRatio('hero7__warrior');
    pStats.summonPctDmg += source.elementalPct * 0.10 * getPreciseTalentRatio('hero9__soulbinder');
    let noSummons = !(game.equippedSummonSkills || []).some(Boolean);
    if (noSummons) pStats.baseDmg *= 1 + (source.generalPct * 0.10 * getPreciseTalentRatio('hero7__warrior')) / 100;
    let citadelRatio = getPreciseTalentRatio('hero7__guardian');
    if (citadelRatio) pStats.energyShield *= 1 + (source.summonHp * 0.20 * citadelRatio) / 100;
    pStats.talentSummonGemLevelBonus = getPreciseTalentLevel('hero7__soulbinder') ? 2 : 0;
    pStats.talentSummonAlwaysHit = !!getPreciseTalentLevel('hero7__hunter');
    pStats.talentSummonRegenPct = 2 * getPreciseTalentRatio('hero8__soulbinder')
        + source.regen * 0.25 * getPreciseTalentRatio('hero10__soulbinder');
}

function applyTalentDerivedAilmentStats(pStats, source) {
    let azoth = (source.elementalPct + Math.max(source.firePct, source.coldPct, source.lightPct))
        * 0.20 * getPreciseTalentRatio('hero10__elementalist');
    if (azoth) {
        pStats.igniteChance += azoth;
        pStats.chillChance += azoth;
        pStats.freezeChance += azoth;
        pStats.shockChance += azoth;
    }
    let tags = new Set((pStats.sSkill && pStats.sSkill.tags) || []);
    if (tags.has('projectile') && isTalentElementalSkill(pStats.sSkill)) {
        let aurora = 20 * getPreciseTalentRatio('hero6__elementalist');
        pStats.igniteChance += aurora;
        pStats.chillChance += aurora;
        pStats.freezeChance += aurora;
        pStats.shockChance += aurora;
    }
    let fixedRatio = getPreciseTalentRatio('hero4__catalyst');
    if (fixedRatio) {
        let durationDelta = Math.abs((pStats.dotDurationMultiplier || 1) - 1);
        pStats.dotDamageScale *= 1 + durationDelta * fixedRatio;
        pStats.dotDurationMultiplier = 1;
    }
    if (getPreciseTalentLevel('hero10__assassin')) pStats.uniquePoisonExtraStacks += 1;
}

function applyTalentPrecisePostStats(pStats) {
    if (!pStats || !pStats.talentSourceStats) return pStats;
    let source = pStats.talentSourceStats;
    let before = getTalentDpsFactors(pStats, false);
    let form = getActiveTalentForm();
    if (form === 'bear') {
        let ratio = getPreciseTalentRatio('hero3__hunter');
        pStats.maxHp = Math.floor(pStats.maxHp * (1 + 0.08 * ratio));
        pStats.baseDmg = Math.floor(pStats.baseDmg * (1 + 0.08 * ratio));
    } else if (form === 'buffalo' && isTalentElementalSkill(pStats.sSkill)) {
        pStats.baseDmg *= 1 + (pStats.armor * 0.03 * getPreciseTalentRatio('hero3__warrior')) / 100;
    }
    pStats.ds += pStats.moveSpeed * 0.08 * getPreciseTalentRatio('hero4__ranger');
    applyTalentDerivedDefenseStats(pStats, source);
    applyTalentDerivedRecoveryStats(pStats);
    applyTalentDerivedSummonStats(pStats, source);
    applyTalentDerivedAilmentStats(pStats, source);
    let resonanceRatio = getPreciseTalentRatio('hero5__inquisitor');
    if (resonanceRatio) pStats.baseDmg *= 1 + getTalentRemainingResonance(pStats) * 0.25 * resonanceRatio / 100;
    let randomElements = Array.isArray(pStats.sSkill && pStats.sSkill.randomElementPool)
        && pStats.sSkill.randomElementPool.length > 0;
    if (randomElements) applyTalentRandomElementBonuses(pStats, source);
    else if (isTalentElementalSkill(pStats.sSkill) && getPreciseTalentLevel('hero9__hunter')) {
        let rawRes = pStats.sSkill.ele === 'fire' ? pStats.rawResF : (pStats.sSkill.ele === 'cold' ? pStats.rawResC : pStats.rawResL);
        let bonus = Math.floor(Math.max(0, Number(rawRes) || 0) / 10) * 2 * getPreciseTalentRatio('hero9__hunter');
        pStats.baseDmg *= 1 + bonus / 100;
    }
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
        let rawRes = ele === 'fire' ? pStats.rawResF : (ele === 'cold' ? pStats.rawResC : pStats.rawResL);
        bonuses[ele] = (bonuses[ele] || 0) + Math.floor(Math.max(0, Number(rawRes) || 0) / 10)
            * 2 * getPreciseTalentRatio('hero9__hunter');
    });
}

function rollTalentPlayerCrit(chancePct) {
    let chance = Math.max(0, Number(chancePct) || 0) / 100;
    let lucky = getPreciseTalentLevel('hero4__assassin') || getPreciseTalentLevel('hero6__ranger');
    if (!lucky) return Math.random() < chance;
    return Math.random() < chance || Math.random() < chance;
}

function getTalentBrittleCritRetryChance(chancePct) {
    let bonus = 0.15 * getPreciseTalentRatio('hero1__elementalist');
    if (!bonus) return 0;
    let chance = Math.max(0, Math.min(1, (Number(chancePct) || 0) / 100));
    let lucky = getPreciseTalentLevel('hero4__assassin') || getPreciseTalentLevel('hero6__ranger');
    let effectiveChance = lucky ? 1 - Math.pow(1 - chance, 2) : chance;
    if (effectiveChance >= 1) return 0;
    return Math.min(1, bonus / (1 - effectiveChance));
}

function getTalentCritDamageMultiplier(enemy, isCrit, pStats) {
    if (!isCrit) return 1;
    let multiplier = 1;
    let alive = (game.enemies || []).filter(row => row && row.hp > 0).length;
    if (alive === 1) multiplier *= 1 + 0.12 * getPreciseTalentRatio('hero1__hunter');
    if (hasTalentEnemyAilment(enemy, 'brittle')) multiplier *= 1 + 0.15 * getPreciseTalentRatio('hero1__elementalist');
    if ((enemy && (enemy.isBoss || enemy.isElite || enemy.elite))
        && hasTalentEnemyAilment(enemy, ['ignite', 'poison', 'bleed', 'chill', 'freeze', 'shock', 'scorch', 'brittle', 'sap'])) {
        let bonus = 25 * getPreciseTalentRatio('hero10__hunter');
        multiplier *= (Math.max(100, pStats.critDmg) + bonus) / Math.max(100, pStats.critDmg);
    }
    if (getPreciseTalentLevel('hero4__guardian') && game.talentCardRuntime && game.talentCardRuntime.sheathedCritReady) {
        multiplier *= 1 + 0.12 * getPreciseTalentRatio('hero4__guardian');
        game.talentCardRuntime.sheathedCritReady = false;
    }
    return multiplier;
}

function getTalentTargetPenetrationBonus(enemy) {
    let bonus = 0;
    if (isTalentTargetCursed(enemy)) bonus += 6 * getPreciseTalentRatio('hero6__warlock');
    if (enemy && (enemy.isBoss || enemy.isElite || enemy.elite)) {
        let supportCount = Array.isArray(game.equippedSupports) ? game.equippedSupports.length : 0;
        bonus += (5 + supportCount) * getPreciseTalentRatio('hero6__inquisitor');
    }
    return bonus;
}

function getTalentConditionalIncreaseMultiplier(pStats, increasePct) {
    let baseIncrease = Math.max(0, Number(pStats && pStats.damageIncreasePct) || 0);
    let conditional = Math.max(0, Number(increasePct) || 0);
    return (100 + baseIncrease + conditional) / (100 + baseIncrease);
}

function getTalentPrecisePlayerHitMultiplier(enemy, ele, pStats) {
    let multiplier = 1;
    let conditionalIncrease = 0;
    multiplier *= 1 + Math.max(0, Math.min(100, Number(game.runProgress) || 0)) * 0.0012 * getPreciseTalentRatio('hero3__ranger');
    if (['fire', 'cold', 'light'].includes(ele) && (game.playerEnergyShield || 0) > 0) multiplier *= 1 + 0.20 * getPreciseTalentRatio('hero5__elementalist');
    multiplier *= 1 + 0.07 * getPreciseTalentRatio('hero5__hunter');
    if (isTalentTargetCursed(enemy)) conditionalIncrease += 18 * getPreciseTalentRatio('hero6__warlock');
    if (enemy && (enemy.isBoss || enemy.isElite || enemy.elite)) conditionalIncrease += 12 * getPreciseTalentRatio('hero10__hunter');
    if (enemy && (enemy.isBoss || enemy.isElite || enemy.elite) && (enemy.hp || 0) / Math.max(1, enemy.maxHp || 1) <= 0.25) {
        multiplier *= 1 + 0.04 * getPreciseTalentRatio('hero6__hunter');
    }
    if (getPreciseTalentLevel('hero7__guardian') && (game.playerEnergyShield || 0) > 0) {
        conditionalIncrease += 12 * getPreciseTalentRatio('hero7__guardian');
    }
    let alive = (game.enemies || []).filter(row => row && row.hp > 0).length;
    let tags = new Set((pStats && pStats.sSkill && pStats.sSkill.tags) || []);
    if (tags.has('projectile') && hasTalentEnemyAilment(enemy, ['ignite', 'poison', 'bleed', 'chill', 'freeze', 'shock', 'scorch', 'brittle', 'sap'])) {
        multiplier *= 1 + 0.10 * getPreciseTalentRatio('hero6__elementalist');
    }
    if (alive >= 2 && tags.has('aoe')) conditionalIncrease += 18 * getPreciseTalentRatio('hero8__gladiator');
    if (alive === 1 && ele === 'phys') conditionalIncrease += 14 * getPreciseTalentRatio('hero8__gladiator');
    if (isTalentTargetCursed(enemy) && ele === 'chaos') conditionalIncrease += 18 * getPreciseTalentRatio('hero7__warlock');
    if (ele === 'chaos') multiplier *= 1 + 0.10 * getPreciseTalentRatio('hero9__warlock');
    let summonTargets = Object.values(game.talentSummonTargetIds || {});
    if (enemy && summonTargets.includes(enemy.id)) conditionalIncrease += 16 * getPreciseTalentRatio('hero6__soulbinder');
    if (alive >= 3) multiplier *= 1 + 0.16 * getPreciseTalentRatio('hero8__hunter');
    if (hasTalentEnemyAilment(enemy, 'shock')) conditionalIncrease += 12 * getPreciseTalentRatio('hero9__inquisitor');
    if (getPreciseTalentLevel('hero7__soulbinder')) multiplier *= 1 - 0.22 * getPreciseTalentRatio('hero7__soulbinder');
    if (getPreciseTalentLevel('hero10__crusader')) multiplier *= 1 - 0.06 * getPreciseTalentRatio('hero10__crusader');
    return multiplier * getTalentConditionalIncreaseMultiplier(pStats, conditionalIncrease);
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

function getTalentDotDamageMultiplier(enemy) {
    let multiplier = 1 + 0.10 * getPreciseTalentRatio('hero9__warlock');
    if (isTalentTargetCursed(enemy)) multiplier *= 1 + 0.25 * getPreciseTalentRatio('hero7__warlock');
    return multiplier;
}

function getTalentButcherBossMultiplier(enemy) {
    if (!enemy || !enemy.isBoss || !getPreciseTalentLevel('hero2__assassin')) return 1;
    let row = game.talentButcherMarks && game.talentButcherMarks[enemy.id];
    let lifeRatio = Math.max(0, enemy.hp || 0) / Math.max(1, enemy.maxHp || 1);
    if (!row || row.hits < 4 || lifeRatio > 0.30) return 1;
    let missing = Math.min(0.50, Math.max(0, 1 - lifeRatio));
    return 1 + 0.12 * (missing / 0.50) * getPreciseTalentRatio('hero2__assassin');
}

function getTalentDamageConversion(hitElement, pStats) {
    let result = { element: hitElement, mainPct: 1, added: {} };
    let tags = new Set((pStats && pStats.sSkill && pStats.sSkill.tags) || []);
    if (hitElement === 'light' && getPreciseTalentLevel('hero5__assassin')) result.element = 'chaos';
    if (hitElement === 'phys' && getPreciseTalentLevel('hero5__ranger')) {
        result.mainPct = 0.5;
        result.added.light = 50 * getPreciseTalentRatio('hero5__ranger');
    }
    if (hitElement === 'phys' && tags.has('attack') && getPreciseTalentLevel('hero2__elementalist')) {
        ['fire', 'cold', 'light'].forEach(ele => { result.added[ele] = (result.added[ele] || 0) + 33 * getPreciseTalentRatio('hero2__elementalist'); });
    }
    if (tags.has('attack') && getPreciseTalentLevel('hero9__warrior')) {
        ['fire', 'cold', 'light'].forEach(ele => { result.added[ele] = (result.added[ele] || 0) + 15 * getPreciseTalentRatio('hero9__warrior'); });
        if (!['fire', 'cold', 'light'].includes(result.element)) result.mainPct = 0;
    }
    return result;
}

function getTalentAilmentReplacement(type) {
    if (getPreciseTalentLevel('hero9__warlock') && ['ignite', 'chill', 'freeze', 'shock'].includes(type)) return 'poison';
    if (!getPreciseTalentLevel('hero1__elementalist')) return type;
    if (type === 'ignite') return 'scorch';
    if (type === 'chill' || type === 'freeze') return 'brittle';
    if (type === 'shock') return 'sap';
    return type;
}

function shouldTalentSkipColdFreeze() {
    return !!(getPreciseTalentLevel('hero1__elementalist') || getPreciseTalentLevel('hero9__warlock'));
}

function enhanceTalentAilmentReapplication(enemy, row, type, pStats) {
    if (!row) return false;
    if (type === 'ignite' && row.talentNitroAmplified && getPreciseTalentLevel('hero6__catalyst')) {
        let remaining = getEnemyDamageAilmentDps(row, pStats, enemy) * Math.max(0, row.time || 0) * 0.15;
        if (remaining > 0) applyDamageToEnemyResource(enemy, Math.floor(remaining));
    }
    if (getPreciseTalentLevel('hero4__elementalist') && ['ignite', 'chill', 'freeze', 'shock', 'scorch', 'brittle', 'sap'].includes(type)) {
        let bonus = 20 * getPreciseTalentRatio('hero4__elementalist');
        row.power = Math.max(0, Number(row.power) || 0) * (1 + bonus / 100);
        row.talentDamageMorePct = (Number(row.talentDamageMorePct) || 0) + bonus;
        row.talentEffectMultiplier = (Number(row.talentEffectMultiplier) || 1) * (1 + bonus / 100);
        return true;
    }
    return false;
}

function decorateTalentAilmentPayload(type, payload, pStats) {
    if (type !== 'ignite' || !getPreciseTalentLevel('hero6__catalyst')) return payload;
    let chance = getPlayerAilmentChance(pStats, 'ignite') * 0.40 * getPreciseTalentRatio('hero6__catalyst');
    if (Math.random() >= chance) return payload;
    payload.talentNitroAmplified = true;
    payload.talentDamageMorePct = (payload.talentDamageMorePct || 0) + 30 * getPreciseTalentRatio('hero6__catalyst');
    return payload;
}

function afterTalentAilmentApplied(enemy, type, pStats) {
    if (getPreciseTalentLevel('hero3__elementalist')) {
        let seedTypes = { ignite: 'warmSeed', freeze: 'frostSeed', shock: 'stormSeed' };
        let seed = seedTypes[type];
        if (seed && !hasTalentEnemyAilment(enemy, seed)) enemy.ailments.push({ type: seed, time: 999999, power: 1 });
    }
    if (getPreciseTalentLevel('hero5__catalyst')) {
        game.playerAilments = (game.playerAilments || []).filter(row => !row || row.type !== type);
    }
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
        return sum + getEnemyDamageAilmentDps(row, pStats, enemy) * Math.max(0, row.time || 0) * Math.max(1, row.stacks || 1);
    }, 0);
}

function getTalentEnemyRegenMultiplier(enemy) {
    let multiplier = 1;
    if (getPreciseTalentLevel('hero5__assassin') && enemy && enemy.talentHitByChaos) multiplier *= 0.5;
    if (getPreciseTalentLevel('hero10__inquisitor') && enemy && (enemy.isBoss || enemy.isElite || enemy.elite)
        && hasTalentEnemyAilment(enemy, ['ignite', 'poison', 'bleed', 'chill', 'freeze', 'shock', 'scorch', 'brittle', 'sap'])) multiplier *= 0.5;
    return multiplier;
}

function getTalentIncomingDamageMultiplier(enemy, pStats) {
    let multiplier = 1;
    let alive = (game.enemies || []).filter(row => row && row.hp > 0).length;
    if (alive >= 2) multiplier *= 1 - 0.10 * getPreciseTalentRatio('hero8__gladiator');
    if (enemy && (enemy.isBoss || enemy.isElite || enemy.elite)) multiplier *= 1 - 0.05 * getPreciseTalentRatio('hero8__inquisitor');
    if (getPreciseTalentLevel('hero10__guardian') && (game.playerEnergyShield || 0) <= 0) multiplier *= 1 + 0.10 * getPreciseTalentRatio('hero10__guardian');
    if (hasTalentEnemyAilment(enemy, 'sap')) multiplier *= 1 - 0.15 * getPreciseTalentRatio('hero1__elementalist');
    let runtime = getTalentCardRuntimeState();
    let previousAlive = (game.enemies || []).some(row => row && row.hp > 0 && row.id === runtime.lastAttackerId);
    if (getPreciseTalentLevel('hero8__hunter') && previousAlive && runtime.lastAttackerId !== enemy.id) {
        multiplier *= 1 - 0.16 * getPreciseTalentRatio('hero8__hunter');
    }
    if (enemy) runtime.lastAttackerId = enemy.id;
    return multiplier;
}

function getTalentElementalArmorReductionPct(pStats, incomingDamage) {
    if (!getPreciseTalentLevel('hero8__catalyst')) return 0;
    return getArmorPhysicalReductionPct(pStats.armor, incomingDamage) * 0.20 * getPreciseTalentRatio('hero8__catalyst');
}

function isTalentMonsterAlwaysHit() {
    return !!getPreciseTalentLevel('hero3__gladiator');
}

function isTalentPlayerAttackDisabled() {
    return !!getPreciseTalentLevel('hero3__soulbinder');
}

function recordTalentBlock() {
    if (!getPreciseTalentLevel('hero4__guardian')) return;
    getTalentCardRuntimeState().sheathedCritReady = true;
}

function getTalentLuckyDamageRoll(firstRoll, minRoll, maxRoll, element) {
    if (element !== 'light' || !getPreciseTalentLevel('hero1__crusader')) return firstRoll;
    let second = minRoll + Math.random() * (maxRoll - minRoll);
    return Math.max(firstRoll, second);
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
    getTalentBrittleCritRetryChance,
    getTalentCritDamageMultiplier,
    getTalentTargetPenetrationBonus,
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
    getTalentIncomingDamageMultiplier,
    getTalentElementalArmorReductionPct,
    isTalentMonsterAlwaysHit,
    isTalentPlayerAttackDisabled,
    recordTalentBlock,
    getTalentLuckyDamageRoll,
    enforceTalentCombatState
});
