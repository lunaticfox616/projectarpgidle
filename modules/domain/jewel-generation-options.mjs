import { gearRollJewelStat } from './jewel-generation-values.mjs';
import { gearCloneJewelStat } from './jewel-stat-record.mjs';

/** A unique jewel's effect text from UNIQUE_JEWEL_DB by its uniqueId (each jewel keeps the text it dropped with, which can be older),
 * else the stored text. */
export function gearGetJewelUniqueEffectText(env, jewel) {
    const row = jewel && jewel.uniqueId ? env.deps.UNIQUE_JEWEL_DB.find(entry => entry.id === jewel.uniqueId) : null;
    return (row && row.uniqueEffect) || (jewel && jewel.uniqueEffect) || '';
}

export function gearGetJewelRollOptionPool(env, excludeIds) {
    let excluded = new Set(Array.isArray(excludeIds) ? excludeIds : []);
    let hasSummon = env.deps.JEWEL_OPTION_POOL.some(option => env.deps.JEWEL_SUMMON_OPTION_IDS.has(option.id) && !excluded.has(option.id));
    let pool = env.deps.JEWEL_OPTION_POOL.filter(option => !env.deps.JEWEL_SUMMON_OPTION_IDS.has(option.id) && !excluded.has(option.id));
    if (hasSummon) pool.push(env.deps.JEWEL_SUMMON_OPTION_GROUP);
    return pool.length > 0 ? pool : env.deps.JEWEL_OPTION_POOL;
}

export function gearResolveJewelRollOption(env, option, excludeIds) {
    if (!option || option.id !== env.deps.JEWEL_SUMMON_OPTION_GROUP.id) return option || null;
    let excluded = new Set(Array.isArray(excludeIds) ? excludeIds : []);
    let pool = env.deps.JEWEL_OPTION_POOL.filter(row => env.deps.JEWEL_SUMMON_OPTION_IDS.has(row.id) && !excluded.has(row.id));
    return env.deps.rndChoice(pool.length > 0 ? pool : env.deps.JEWEL_OPTION_POOL.filter(row => env.deps.JEWEL_SUMMON_OPTION_IDS.has(row.id)));
}

export function gearRollRandomJewelStat(env, excludeIds, tierRange) {
    let pool = gearGetJewelRollOptionPool(env, excludeIds);
    return gearRollJewelStat(env, gearResolveJewelRollOption(env, env.deps.rndChoice(pool), excludeIds), tierRange);
}

export function gearRollJewelCraftStats(env, count, keepStats, tierRange) {
    let stats = (keepStats || []).map((...args) => gearCloneJewelStat(env, ...args)).filter(Boolean);
    let usedIds = stats.map(stat => stat.id);
    while (stats.length < count) {
        let stat = gearRollRandomJewelStat(env, usedIds, tierRange);
        if (!stat) break;
        stats.push(stat);
        usedIds.push(stat.id);
    }
    return stats;
}
