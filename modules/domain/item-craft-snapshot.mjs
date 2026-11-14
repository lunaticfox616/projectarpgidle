

export function itemFlowCopyCraftResultStat(stat) {
    if (!stat) return null;
    return {
        id: stat.id || '',
        statName: stat.statName || '',
        val: stat.val,
        tier: stat.tier,
        lockedByHoney: !!stat.lockedByHoney,
        lockedByRift: !!stat.lockedByRift,
        unremovable: !!stat.unremovable,
        venomStingerBonus: !!stat.venomStingerBonus
    };
}

export function itemFlowCraftResultWardSlots(env, item) {
    return typeof env.deps.colonyWards === 'object' ? env.deps.colonyWards.beltRoll(item) : undefined;
}

export function itemFlowSnapshotCraftResultItem(env, item) {
    if (!item) return null;
    return {
        name: item.name || '',
        baseName: item.baseName || '',
        rarity: item.rarity || 'normal',
        quality: Math.max(0, Math.floor(Number(item.quality) || 0)),
        corrupted: !!item.corrupted,
        sockets: env.deps.equipmentSockets.count(item),
        uniqueEffect: item.uniqueEffect || '',
        wardSlots: itemFlowCraftResultWardSlots(env, item),
        baseStats: (item.baseStats || []).map(itemFlowCopyCraftResultStat).filter(Boolean),
        stats: (item.stats || []).map(itemFlowCopyCraftResultStat).filter(Boolean),
        chaosInfusion: itemFlowCopyCraftResultStat(item.chaosInfusion),
        encroachedStat: itemFlowCopyCraftResultStat(item.encroached && item.encroached.chosen)
    };
}
