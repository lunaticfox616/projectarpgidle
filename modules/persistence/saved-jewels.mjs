export function normalizeJewelRecord(deps, jewel) {
    if (!jewel || typeof jewel !== 'object') return null;
    let stats = readSavedJewelStats(deps, jewel);
    if (stats.length === 0) return null;
    let hiddenTier = Math.max(1, Math.floor(Math.max(...stats.map(stat => Math.floor(stat.tier || 1)))));
    let hasWaxBonus = stats.some(stat => stat && stat.waxBonus);
    let statLimit = jewel.waxedByBeeswax || hasWaxBonus ? 5 : 4;
    return { ...jewel, rarity: ['normal', 'magic', 'rare', 'unique'].includes(jewel.rarity) ? jewel.rarity : 'normal', waxedByBeeswax: !!jewel.waxedByBeeswax || hasWaxBonus, hiddenTier: hiddenTier, stats: stats.slice(0, statLimit), locked: !!jewel.locked };
}

function readSavedJewelStats(deps, jewel) {
    let stats = typeof deps.getJewelStats === 'function' ? (0, deps.getJewelStats)(jewel) : (Array.isArray(jewel.stats) ? jewel.stats.filter(stat => stat && stat.id) : []);
    if (stats.length === 0 && jewel.stat && jewel.stat.id) stats = typeof deps.normalizeJewelStat === 'function' ? [(0, deps.normalizeJewelStat)(jewel.stat)].filter(Boolean) : [jewel.stat];
    return stats;
}
