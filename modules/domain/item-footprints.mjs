

export function itemFlowGetCodexSlotOrder() {
    return ['무기', '방패', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠'];
}

export function itemFlowGetEquipmentInventoryFootprint(env, item) {
    let slot = String((item && item.slot) || '').replace(/[123]$/, '');
    if (slot === '반지' || slot === '목걸이') return { columns: 1, rows: 1 };
    if (slot === '허리띠') return { columns: 2, rows: 1 };
    if (['투구', '장갑', '신발', '방패', '갑옷'].includes(slot)) return { columns: 2, rows: 2 };
    return slot === '무기' ? itemFlowGetWeaponInventoryFootprint(env, item) : { columns: 1, rows: 1 };
}

export function itemFlowGetWeaponInventoryFootprint(env, item) {
    const category = env.deps.getWeaponCategoryId(item);
    if (category === 'scimitar') return { columns: 1, rows: 3 };
    if (category === 'greatsword') return { columns: env.deps.SLENDER_GREATSWORD_BASES.includes(env.deps.getWeaponBaseId(item)) ? 1 : 2, rows: 4 };
    return category === 'shortbow' ? { columns: 2, rows: 3 } : { columns: 2, rows: 2 };
}

export function itemFlowGetAverageExplicitAffixTier(items) {
    let tiers = (Array.isArray(items) ? items : []).flatMap(item => {
        if (!item || item.rarity === 'unique') return [];
        return (Array.isArray(item.stats) ? item.stats : [])
            .filter(stat => stat && !stat.encroachedFinal && !stat.encroachedCandidate && !stat.sourceOptionId && Number.isFinite(Number(stat.tier)) && Number(stat.tier) > 0)
            .map(stat => Number(stat.tier));
    });
    return tiers.length ? tiers.reduce((sum, tier) => sum + tier, 0) / tiers.length : 0;
}
