/** Ward deadlines and clock values are milliseconds. Notifications retain their original mutation order. */
function maximumWardAmount(stats, config) {
    return Math.max(1, Math.floor(Math.max(1, Number(stats.maxHp) || 1) * Math.max(0, Number(config.hpPct || 12)) / 100));
}

function wardCooldownMs(config) {
    return Math.max(1000, Math.floor(Math.max(1, Number(config.cooldown || 20)) * 1000));
}

function* refreshDeathWard(owner, pStats, clock) {
    let cfg = pStats && pStats.uniqueDeathWard;
    if (!cfg) {
        owner.realmDeathWard = null;
        return null;
    }
    let state = owner.realmDeathWard && typeof owner.realmDeathWard === 'object'
        ? owner.realmDeathWard
        : { amount: 0, maxAmount: 0, readyAt: 0 };
    let maxAmount = maximumWardAmount(pStats, cfg);
    state.maxAmount = maxAmount;
    if ((state.amount || 0) <= 0 && clock() >= (state.readyAt || 0)) {
        state.amount = maxAmount;
        state.readyAt = 0;
        yield maxAmount;
    } else {
        state.amount = Math.min(maxAmount, Math.max(0, Math.floor(state.amount || 0)));
    }
    owner.realmDeathWard = state;
    return state;
}

/** The caller has refreshed the ward and supplies positive, floored damage. */
function absorbDeathWard(state, remaining, pStats, clock) {
    let absorbed = Math.min(remaining, Math.max(0, Math.floor(state.amount || 0)));
    state.amount = Math.max(0, Math.floor((state.amount || 0) - absorbed));
    remaining -= absorbed;
    if (state.amount <= 0) {
        let cooldownMs = wardCooldownMs(pStats.uniqueDeathWard);
        state.readyAt = clock() + cooldownMs;
    }
    return { remaining, absorbed };
}

function absorbStoneShield(owner, amount, clock) {
    let remaining = Math.max(0, Math.floor(Number(amount) || 0));
    let runtime = owner.talentCardRuntime;
    if (remaining <= 0 || !runtime || typeof runtime !== 'object') return { remaining, absorbed: 0 };
    if ((runtime.stoneShieldExpiresAt || 0) <= clock()) {
        delete runtime.stoneShieldAmount;
        delete runtime.stoneShieldMax;
        delete runtime.stoneShieldExpiresAt;
        return { remaining, absorbed: 0 };
    }
    let absorbed = Math.min(remaining, Math.max(0, Math.floor(Number(runtime.stoneShieldAmount) || 0)));
    runtime.stoneShieldAmount = Math.max(0, Math.floor((runtime.stoneShieldAmount || 0) - absorbed));
    return { remaining: remaining - absorbed, absorbed };
}

export function createPlayerWards(clock) {
    return Object.freeze({
        // Consume synchronously: the restored amount is notified before the owner assignment resumes.
        refresh: (owner, stats) => refreshDeathWard(owner, stats, clock),
        absorb: (ward, remaining, stats) => absorbDeathWard(ward, remaining, stats, clock),
        stone: (owner, amount) => absorbStoneShield(owner, amount, clock)
    });
}
