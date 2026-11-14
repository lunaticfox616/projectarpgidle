/** Finishing is deliberately per call: cloning, timed cleanse and current-target summon estimates cannot live in the core cache. */
function cleanseLastStand(owner, maxHp, now) {
    if (!((owner.playerHp / Math.max(1, maxHp)) <= 0.5)) return;
    const time = now();
    if ((owner.guardianLastStandCleanseAt || 0) + 5000 <= time) {
        owner.playerAilments = [];
        owner.guardianLastStandCleanseAt = time;
    }
}

function applyImmunities(stats, immunity) {
    if (immunity.ignite) stats.immuneIgnite = true;
    if (immunity.frostSentinel) { stats.immuneChill = true; stats.immuneFreeze = true; }
    if (immunity.freeze) stats.immuneFreeze = true;
    if (immunity.shock) stats.immuneShock = true;
    if (immunity.bleed) stats.immuneBleed = true;
    if (immunity.closedEyes) {
        stats.immuneIgnite = true;
        stats.immuneChill = true;
        stats.immuneFreeze = true;
        stats.immuneShock = true;
        stats.immuneBleed = true;
        stats.immunePoison = true;
    }
}

export function createPlayerStatFinish(deps) {
    const finish = (owner, core, includeBreakdowns) => {
        const stats = { ...core.stats };
        if (stats.sSkill) stats.sSkill = { ...stats.sSkill };
        if (stats.breakdowns) stats.breakdowns = { ...stats.breakdowns };
        if (core.lastStandMaxHp !== null) cleanseLastStand(owner, core.lastStandMaxHp, deps.now);
        const summonEstimate = deps.summonEstimate(owner, stats, includeBreakdowns, core.gemEvaluation);
        stats.summonDps = Math.max(0, summonEstimate.total || 0);
        stats.directDps = Math.max(0, stats.dps || 0);
        stats.totalDps = stats.directDps + stats.summonDps;
        deps.appendDps(stats, summonEstimate);
        applyImmunities(stats, core.immunity);
        return stats;
    };
    return Object.freeze({ finish });
}
