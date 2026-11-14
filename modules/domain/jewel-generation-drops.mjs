import { gearGetJewelDropTierRange, gearMakeFixedJewelStat, gearRollJewelPetiteStat } from './jewel-generation-values.mjs';
import { gearRollJewelCraftStats } from './jewel-generation-options.mjs';

/**
 * @param {number|{type?: string, storyOrder?: number, id?: number, depth?: number, equivalentChaosDepth?: number, tier?: number}} zoneOrTier
 * @returns {{id: number, name: string, rarity: string, hiddenTier: number, stats: Array<{id: string, val: number, valMin: number, valMax: number, tier: number}>}}
 */
/** odds: {rare, unique} chances in place of the ordinary ones (보석 광맥 omen, js/loot-omens.js jewelOdds). */
export function gearGenerateJewelDrop(env, zoneOrTier, odds = null) {
    let tier = zoneOrTier && typeof zoneOrTier === 'object'
        ? env.deps.getRealmEquipmentHiddenTierCap(zoneOrTier)
        : Math.max(1, Number(zoneOrTier) || 1);
    let dropTierRange = gearGetJewelDropTierRange(env, tier);
    let uniqueChance = odds ? odds.unique : Math.max(0.003, Math.min(0.03, 0.002 + (tier / 2000)));
    if (Math.random() < uniqueChance) return generateUniqueJewel(env);
    return generateOrdinaryJewel(env, dropTierRange, odds);
}

function generateUniqueJewel(env) {
    let pool = env.deps.UNIQUE_JEWEL_DB.filter(v => !v.ultra);
    let ultraPool = env.deps.UNIQUE_JEWEL_DB.filter(v => v.ultra);
    let canRollUltra = ultraPool.length > 0;
    let baseRow = pool.length > 0 ? env.deps.rndChoice(pool) : env.deps.rndChoice(env.deps.UNIQUE_JEWEL_DB);
    let row = (canRollUltra && Math.random() < 0.08) ? env.deps.rndChoice(ultraPool) : baseRow;
    // 고유 주얼: 구성은 그대로 두고 파워만 약간(+10%) 상승
    let uniquePower = 1.1;
    let stats = (row.stats || []).map(st => {
        let boosted = env.deps.isTenthStat(st.id) ? Math.round(st.val * uniquePower * 10) / 10 : Math.round(st.val * uniquePower);
        return gearMakeFixedJewelStat(env, st.id, boosted);
    });
    let petite = gearRollJewelPetiteStat(env, 'rare', stats.map(st => st.id));
    if (petite) stats.push(petite);
    return { id: env.deps.allocateItemId(), uniqueId: row.id, name: row.name, rarity: 'unique', uniqueEffect: row.uniqueEffect || '', hiddenTier: Math.max(1, ...stats.map(st => st.tier || 1)), stats: stats };
}

function generateOrdinaryJewel(env, dropTierRange, odds) {
    // 주얼 제작이 없어졌으므로(2026-09-30) 옵션 없는 일반 주얼은 떨어지지 않는다: 마법 1~2줄 85%, 희귀 2~4줄 15%.
    let rarity = Math.random() > (odds ? 1 - odds.rare : 0.85) ? 'rare' : 'magic';
    let lineCount = rarity === 'rare' ? (2 + Math.floor(Math.random() * 3)) : (1 + Math.floor(Math.random() * 2));
    let stats = gearRollJewelCraftStats(env, lineCount, null, dropTierRange);
    let hiddenTier = stats.length ? Math.max(1, ...stats.map(st => st.tier || 1)) : 1;
    let name = stats.length ? env.deps._t('{id} 주얼', { id: env.deps.getStatName(stats[0].id) }) : '미가공 주얼';
    return { id: env.deps.allocateItemId(), name: name, tier: 1, hiddenTier: hiddenTier, rarity: rarity, stats: stats };
}
