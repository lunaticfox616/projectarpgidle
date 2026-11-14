

/** [main, added] damage elements of a chaos depth's boss; null for any other zone. */
export function effectGetChaosBossElements(env, zone) {
    if (!zone || zone.type !== 'abyss') return null;
    const depth = Math.max(1, Math.floor(zone.depth || env.deps.getAbyssDepthFromZoneId(zone.id) || 1));
    return [env.deps.CHAOS_BOSS_ELEMENTS[depth % 4], env.deps.CHAOS_BOSS_ELEMENTS[(depth + 1) % 4]];
}

/** Current rules, authored boss body, chaos depth, then the ordinary random element pool. */
export function effectPickEnemyElement(env, zone, pool, isBoss) {
    if (env.deps.hasOceanCurrent(zone, 'cold_current')) return 'cold';
    if (env.deps.hasOceanCurrent(zone, 'warm_current')) return 'fire';
    const own = isBoss && env.deps.BOSS_BODY_ELEMENTS[zone.bossVisualId];
    if (own) return own;
    const chaosBoss = isBoss ? effectGetChaosBossElements(env, zone) : null;
    return chaosBoss ? chaosBoss[0] : env.deps.rndChoice(pool);
}
