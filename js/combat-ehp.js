const PLAYER_EHP_ELEMENT_KEYS = ['phys', 'fire', 'cold', 'light', 'chaos'];
const PLAYER_EHP_SEARCH_LIMIT = Number.MAX_SAFE_INTEGER;

function getPlayerEhpResourcePool(stats) {
    return Math.max(1, Number(stats && stats.maxHp) || 1)
        + Math.max(0, Number(stats && stats.energyShield) || 0);
}

function getPlayerEhpResistance(stats, element) {
    let suffix = { fire: 'F', cold: 'C', light: 'L', chaos: 'Chaos' }[element];
    if (!suffix) return 0;
    let maximum = Number.isFinite(Number(stats && stats[`maxRes${suffix}`]))
        ? Number(stats[`maxRes${suffix}`]) : 75;
    return Math.max(-200, Math.min(maximum, Number(stats && stats[`res${suffix}`]) || 0));
}

function getPlayerEhpElementLessMultiplier(stats, element) {
    let key = { fire: 'fireTakenDamageReducePct', cold: 'coldTakenDamageReducePct',
        light: 'lightTakenDamageReducePct', chaos: 'chaosTakenDamageReducePct' }[element];
    let less = key ? Math.max(0, Math.min(90, Number(stats && stats[key]) || 0)) : 0;
    if (element === 'chaos') less += Math.max(0, Math.min(90 - less,
        Number(stats && stats.uniqueChaosTakenDamageReducePct) || 0));
    return Math.max(0.01, 1 - less / 100);
}

function getPlayerEhpCommonTakenMultiplier(stats) {
    let multiplier = Math.max(0.01, Number(stats && stats.warriorTakenDamageMultiplier) || 1)
        * Math.max(0.01, Number(stats && stats.genericTakenDamageMultiplier) || 1);
    if (stats && stats.uniqueGuardianArmor) {
        let less = Math.max(0, Math.min(95, Number(stats.uniqueGuardianArmor.takenLessPct) || 0));
        multiplier *= 1 - less / 100;
    }
    let masteryLess = Math.max(0, Math.min(50, Number(stats && stats.cosmosMasteryTakenLessPct) || 0));
    return Math.max(0.0001, multiplier * (1 - masteryLess / 100));
}

function getPlayerEhpRawBreakdown(stats, element, rawHit) {
    if (stats && stats.cosmosEqualDamageSplit) {
        let split = rawHit / PLAYER_EHP_ELEMENT_KEYS.length;
        return PLAYER_EHP_ELEMENT_KEYS.map(key => ({ element: key, amount: split }));
    }
    if (element !== 'phys') return [{ element, amount: rawHit }];
    let takenAs = (stats && stats.physTakenAs) || {};
    let rows = ['fire', 'cold', 'light', 'chaos'].map(key => ({ element: key,
        pct: Math.max(0, Number(takenAs[key]) || 0) }));
    let totalPct = rows.reduce((sum, row) => sum + row.pct, 0);
    let scale = totalPct > 75 ? 75 / totalPct : 1;
    let shifted = 0;
    let breakdown = rows.filter(row => row.pct > 0).map(row => {
        let amount = rawHit * row.pct * scale / 100;
        shifted += amount;
        return { element: row.element, amount };
    });
    breakdown.push({ element: 'phys', amount: Math.max(0, rawHit - shifted) });
    return breakdown;
}

function getPlayerEhpMitigationPct(stats, element, rawPortion) {
    let mitigation = element === 'phys'
        ? Math.max(-60, (Number(stats && stats.dr) || 0)
            + getArmorPhysicalReductionPct(Number(stats && stats.armor) || 0, rawPortion))
        : getPlayerEhpResistance(stats, element);
    if (!(stats && stats.cosmosBalanceMitigation)) return Math.min(99.9, mitigation);
    let total = Math.max(-60, mitigation);
    ['fire', 'cold', 'light', 'chaos'].forEach(key => { total += getPlayerEhpResistance(stats, key); });
    return Math.max(-60, Math.min(90, total / 5));
}

function calculatePlayerRawHitTaken(stats, element, rawHit) {
    let breakdown = getPlayerEhpRawBreakdown(stats, element, Math.max(0, Number(rawHit) || 0));
    let taken = breakdown.reduce((sum, row) => {
        let mitigation = getPlayerEhpMitigationPct(stats, row.element, row.amount);
        let amount = row.amount * Math.max(0, 1 - mitigation / 100);
        return sum + amount * getPlayerEhpElementLessMultiplier(stats, row.element);
    }, 0);
    if (element === 'phys' && stats && stats.uniquePhysDrHalfTakenAsMore) {
        let ratio = Math.max(0, Number(stats.uniquePhysDrHalfTakenAsMore.ratio) || 0.5);
        taken *= 1 + Math.max(0, Number(stats.dr) || 0) * ratio / 100;
    }
    return Math.max(0, taken * getPlayerEhpCommonTakenMultiplier(stats));
}

function findPlayerDirectEhp(stats, element) {
    let pool = getPlayerEhpResourcePool(stats);
    let low = 0;
    let high = Math.max(1, pool);
    while (high < PLAYER_EHP_SEARCH_LIMIT && calculatePlayerRawHitTaken(stats, element, high) < pool) {
        high = Math.min(PLAYER_EHP_SEARCH_LIMIT, high * 2);
    }
    for (let i = 0; i < 54; i++) {
        let mid = low + (high - low) / 2;
        if (calculatePlayerRawHitTaken(stats, element, mid) < pool) low = mid;
        else high = mid;
    }
    return Math.max(1, Math.floor(low));
}

function calculatePlayerEhpProfile(stats) {
    let evadeChance = Math.max(0, Math.min(90, Number(stats && stats.evadeChance) || 0));
    let hitChance = Math.max(0.1, 1 - evadeChance / 100);
    let elements = {};
    PLAYER_EHP_ELEMENT_KEYS.forEach(element => {
        let direct = findPlayerDirectEhp(stats, element);
        elements[element] = { direct, entropy: Math.floor(direct / hitChance) };
    });
    return { pool: getPlayerEhpResourcePool(stats), evadeChance, hitChance, elements };
}

safeExposeGlobals({ calculatePlayerRawHitTaken, calculatePlayerEhpProfile });
