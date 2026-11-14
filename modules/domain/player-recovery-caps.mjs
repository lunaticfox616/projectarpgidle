/** Pure recovery limits. Constants remain owned by the classic combat table until its data consumers migrate. */
export function createPlayerRecoveryCaps(constants) {
    function applyLeechSoftcap(rawLeech) {
        let raw = Math.max(0, Number(rawLeech) || 0);
        if (raw <= constants.LEECH_SOFTCAP_START) return raw;
        let midSpan = Math.max(0, Math.min(raw, constants.LEECH_SOFTCAP_MID) - constants.LEECH_SOFTCAP_START);
        let highSpan = Math.max(0, raw - constants.LEECH_SOFTCAP_MID);
        return constants.LEECH_SOFTCAP_START + midSpan * constants.LEECH_SOFTCAP_MID_EFF + highSpan * constants.LEECH_SOFTCAP_HIGH_EFF;
    }

    function getLeechCaps(pStats, target) {
        let maxHp = Math.max(1, Number(pStats && pStats.maxHp) || 1);
        let maxEnergyShield = Math.max(0, Number(pStats && pStats.energyShield) || 0);
        let leechPool = target === 'energyShield' ? Math.max(1, maxEnergyShield) : maxHp;
        let instancePct = leechPercent(constants.LEECH_BASE_INSTANCE_CAP_PCT, pStats, 'leechInstanceCap');
        let totalPct = leechPercent(constants.LEECH_BASE_TOTAL_CAP_PCT, pStats, 'leechTotalCap');
        let ratePct = leechPercent(constants.LEECH_BASE_RATE_CAP_PCT, pStats, 'leechRateCap');
        return {
            instanceCap: leechPool * instancePct / 100,
            totalCap: leechPool * totalPct / 100,
            rateCap: leechPool * ratePct / 100,
            instancePct: instancePct,
            totalPct: totalPct,
            ratePct: ratePct
        };
    }

    function leechPercent(base, stats, field) {
        return Math.max(0, base + (Number(stats && stats[field]) || 0));
    }

    function getPlayerEnergyShieldRecoveryCap(pStats) {
        let baseCap = Math.max(0, Number(pStats && pStats.energyShield) || 0);
        let overhealPct = Math.max(0, Number(pStats && pStats.uniqueOverhealCapPct) || 0);
        return baseCap * (100 + overhealPct) / 100;
    }

    function floorIncomingDamage(amount) {
        return Math.max(0, Math.floor(Math.max(0, Number(amount) || 0)));
    }

    function hp(stats, halfLife) {
        const maxHp = Math.max(0, stats.maxHp || 0);
        return halfLife ? maxHp * 0.5 : maxHp;
    }

    function recovery(baseCap, stats, occupied) {
        const overhealPct = Math.max(0, Number(stats && stats.uniqueOverhealCapPct) || 0);
        return Math.max(1, baseCap * (100 + overhealPct) / 100 - occupied);
    }
    return Object.freeze({ softcap: applyLeechSoftcap, leech: getLeechCaps, shield: getPlayerEnergyShieldRecoveryCap, floorDamage: floorIncomingDamage, hp, recovery });
}
