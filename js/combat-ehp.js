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

function getMapReadinessGrade(ratio) {
    const value = Math.max(0, Number(ratio) || 0);
    if (value < 0.85) return { id: 'low', label: '낮음' };
    if (value < 1.30) return { id: 'fit', label: '적정' };
    return { id: 'high', label: '높음' };
}

function getMapEstimateElements(estimate) {
    const source = Array.isArray(estimate && estimate.elements) ? estimate.elements : [estimate && estimate.element];
    const elements = source.filter(element => PLAYER_EHP_ELEMENT_KEYS.includes(element));
    return elements.length > 0 ? Array.from(new Set(elements)) : PLAYER_EHP_ELEMENT_KEYS.slice();
}

function getPenetratedStats(stats, element, pressure) {
    if (element === 'phys' || pressure <= 0) return stats;
    const suffix = { fire: 'F', cold: 'C', light: 'L', chaos: 'Chaos' }[element];
    const adjusted = { ...stats };
    const resistanceKey = `res${suffix}`;
    const rawResistanceKey = `rawRes${suffix}`;
    adjusted[resistanceKey] = Number(stats && stats[resistanceKey] || 0) - pressure;
    if (Number.isFinite(Number(stats && stats[rawResistanceKey]))) {
        adjusted[rawResistanceKey] = Number(stats[rawResistanceKey]) - pressure;
    }
    return adjusted;
}

function getBossTakenMultiplierRelativeToProfile(stats) {
    const bossTaken = Math.max(0.01, Number(stats && stats.bossTakenDamageMultiplier) || 1);
    const guardian = stats && stats.uniqueGuardianArmor;
    if (!guardian) return bossTaken;
    const normalLess = Math.max(0, Math.min(95, Number(guardian.takenLessPct) || 0));
    const bossLess = Math.max(0, Math.min(95, Number(guardian.bossTakenLessPct) || 0));
    return bossTaken * (1 - bossLess / 100) / Math.max(0.05, 1 - normalLess / 100);
}

function getBossEquivalentEhpTarget(stats, profile, estimate, element) {
    const row = profile.elements[element];
    const peakHit = Math.max(1, Number(estimate.peakHit) || Number(estimate.ehp) || 1);
    const threatWindow = Math.max(peakHit, Number(estimate.ehp) || peakHit);
    const pressure = Math.max(0, Number(estimate.resistancePressure) || 0);
    const adjusted = getPenetratedStats(stats, element, pressure);
    const bossTakenMul = getBossTakenMultiplierRelativeToProfile(stats);
    const basePeakTaken = Math.max(0.0001, calculatePlayerRawHitTaken(stats, element, peakHit));
    const baseWindowTaken = Math.max(0.0001, calculatePlayerRawHitTaken(stats, element, threatWindow));
    const peakPenalty = calculatePlayerRawHitTaken(adjusted, element, peakHit) * bossTakenMul / basePeakTaken;
    const windowPenalty = calculatePlayerRawHitTaken(adjusted, element, threatWindow) * bossTakenMul / baseWindowTaken;
    const entropyPerDirect = row.entropy / Math.max(1, row.direct);
    return Math.max(threatWindow * windowPenalty, peakHit * peakPenalty * entropyPerDirect);
}

function getMapEstimateDpsMultiplier(stats, estimate, alreadyInZone) {
    if (alreadyInZone) return 1;
    let multiplier = Math.max(0.1, Number(estimate && estimate.playerDpsMultiplier) || 1);
    const gravityFloor = Math.max(0, Math.floor(Number(estimate && estimate.underworldGravityFloor) || 0));
    if (gravityFloor > 0) {
        const ignoresReduction = !!(estimate && estimate.underworldGravityIgnoresReduction);
        const reduction = ignoresReduction ? 0
            : Math.max(0, Math.min(75, Number(stats && stats.underworldGravityReductionPct) || 0));
        multiplier *= getUnderworldGravityActionMultiplier(gravityFloor, reduction);
    }
    const depthTier = Math.max(0, Math.floor(Number(estimate && estimate.oceanPressureDepthTier) || 0));
    if (depthTier <= 0) return multiplier;
    const pressureResist = Math.max(0, Math.min(80, Number(stats && stats.oceanPressureResist) || 0));
    const pressureSlow = Math.min(0.65, depthTier * 0.05) * (1 - pressureResist / 100);
    return multiplier * Math.max(0.1, 1 - pressureSlow);
}

/**
 * @param {Readonly<object>} stats
 * @param {Readonly<object>} estimate
 * @returns {{dps:object,ehp:object,element:string,playerDps:number,playerEhp:number,recommendedDps:number,recommendedEhp:number}}
 */
function getMapPowerReadiness(stats, estimate) {
    const profile = calculatePlayerEhpProfile(stats || {});
    const elements = getMapEstimateElements(estimate);
    let limiting = null;
    elements.forEach(element => {
        const row = profile.elements[element];
        const recommended = getBossEquivalentEhpTarget(stats || {}, profile, estimate || {}, element);
        const ratio = row.entropy / Math.max(1, recommended);
        if (!limiting || ratio < limiting.ratio) limiting = { element, ratio, player: row.entropy, recommended };
    });
    const playerDps = Math.max(0, Number(stats && stats.totalDps)
        || (Number(stats && stats.dps) || 0) + (Number(stats && stats.summonDps) || 0));
    const activeZoneId = stats && stats.activeZoneId;
    const estimateZoneId = estimate && estimate.zoneId;
    const alreadyInZone = activeZoneId != null && estimateZoneId != null
        && String(activeZoneId) === String(estimateZoneId);
    const zoneDpsMultiplier = getMapEstimateDpsMultiplier(stats || {}, estimate || {}, alreadyInZone);
    const effectivePlayerDps = playerDps * zoneDpsMultiplier;
    const recommendedDps = Math.max(1, Number(estimate && estimate.dps) || 1);
    const dpsRatio = effectivePlayerDps / recommendedDps;
    return {
        dps: { ...getMapReadinessGrade(dpsRatio), ratio: dpsRatio },
        ehp: { ...getMapReadinessGrade(limiting.ratio), ratio: limiting.ratio },
        element: limiting.element,
        playerDps: effectivePlayerDps,
        playerEhp: limiting.player,
        recommendedDps,
        recommendedEhp: limiting.recommended
    };
}

safeExposeGlobals({ calculatePlayerRawHitTaken, calculatePlayerEhpProfile, getMapPowerReadiness });
