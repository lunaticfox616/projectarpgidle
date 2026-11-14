// Node multipliers read combat conditions through tick, preserving cache boundary tracking.
function frenzyAttackSpeed(tick, maxLife, values) {
    const steps = Math.ceil(values.maxPct / values.pctPerTenth);
    let tenths = 0;
    for (let k = 1; k <= steps; k++) {
        if (tick.when('playerHp', hp => hp / maxLife <= 1 - k / 10)) tenths = k;
    }
    return Math.min(values.maxPct, tenths * values.pctPerTenth);
}

function applyUnyielding(out, tick, maxLife, values) {
    if (tick.when('playerHp', hp => hp / maxLife <= 0.5)) {
        out.damageMul *= 1 + values.damageMorePct / 100;
        out.takenMul *= 0.85;
    }
    if (tick.get('warriorUnyielding')) {
        out.takenMul *= 1 - values.burstTakenLessPct / 100;
        out.aspdMul *= 1 + values.burstAspdMorePct / 100;
    }
}

export function computeAscendancyNodeMultipliers(owner, tick, maxLife, deps) {
    const out = { damageMul: 1, takenMul: 1, aspdMul: 1, regenMul: 1 };
    if (deps.keystone('w7', owner)) applyUnyielding(out, tick, maxLife, deps.values.w7);
    if (deps.keystone('bz2', owner)) out.aspdMul *= 1 + frenzyAttackSpeed(tick, maxLife, deps.values.bz2) / 100;
    if (deps.keystone('bd1', owner)) out.aspdMul *= 1 + tick.get('bladedancerFlowStacks') * deps.values.bd1.aspdPctPerStack / 100;
    if (deps.keystone('gw6', owner) && tick.get('grovewardenRooted')) {
        out.takenMul *= 1 - deps.values.gw6.takenLessPct / 100;
        out.regenMul *= deps.values.gw6.regenMul;
    }
    return out;
}
