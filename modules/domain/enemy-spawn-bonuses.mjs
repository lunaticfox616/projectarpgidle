

/** values[0] for a boss, [1] for an elite, [2] for a normal monster (rank: its isBoss and isElite). */
export function buildByEnemyRank(rank, values) { return rank.isBoss ? values[0] : (rank.isElite ? values[1] : values[2]); }

/** value from loop n on, else 0. */
export function buildFromLoopOn(env, n, value) { return (env.owner.season || 1) >= n ? value : 0; }

/** source[key] when it is set, else fallback: a trait's or modifier's bonus on a new monster. */
export function buildEnemyBonus(source, key, fallback = 0) { return source && source[key] ? source[key] : fallback; }

/** A finite reward scale of at least 1 from source (a trait's exp or drop scale), else 1. */
export function buildEnemyRewardMul(source, key) { return source && Number.isFinite(source[key]) ? Math.max(1, source[key]) : 1; }

/** The boundary's scale of key (at least 1) beyond the boundary, else 1. */
export function buildBoundaryMul(zone, key) { return zone.type === 'beyondBoundary' ? Math.max(1, Number(zone[key]) || 1) : 1; }

export function buildGetTierDropMulWithCaps(tier, zone) {
    let t = Math.max(1, Math.floor(Number(tier) || 1));
    let preSoft = Math.min(10, t - 1);
    let postSoft = Math.max(0, Math.min(20, t) - 10);
    let baseMul = 1 + preSoft * 0.02 + postSoft * 0.008;
    if (zone && zone.type === 'labyrinth') {
        let floor = Math.max(1, Math.floor(zone.floor || 1));
        let floor30SoftCapMul = 1.236;
        if (floor <= 30) return baseMul;
        if (floor <= 200) return Math.min(baseMul, floor30SoftCapMul);
        return floor30SoftCapMul;
    }
    return baseMul;
}

/** Wisps drop skill gems more often (data/bosses.js WISP_ENEMY_RULES). */
/** Wisps drop gems more often, and so does an atlas map with the 룬의 정원 omen (enemy.gemDropMul, js/atlas-maps.js applyEnemyMods). */
export function buildGetEnemyGemDropMul(env, enemy) {
    const wisp = enemy && enemy.monsterArchetype === 'wisp' ? env.deps.WISP_ENEMY_RULES.gemDropMul : 1;
    return wisp * (Number(enemy && enemy.gemDropMul) || 1);
}
