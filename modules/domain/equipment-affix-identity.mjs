

export function equipmentAffixGetImmutableItemSpecialStats(env, item) {
    if (!item) return [];
    // 타오른 잿불가지의 타락 전용 줄(12번 루프 30, js/ember-corruption.js)과 목걸이에 바른 기름의 노드(루프 36, js/garden-oils.js)도
    // 제작으로 바뀌지 않는 줄이다: 스탯 합, 소환수 한도, 감정에 든다.
    const ember = [...(Array.isArray(item.emberLines) ? item.emberLines : []), ...(typeof env.deps.gardenOils === 'object' ? env.deps.gardenOils.lines(item) : [])];
    if (!item.encroached || !item.encroached.liberated || !item.encroached.chosen) return ember;
    let stat = item.encroached.chosen;
    return [{ ...stat, statName: env.deps._t('[잠식] {statName}', { statName: stat.statName || env.deps.getStatName(stat.id) }), encroachedFinal: true }, ...ember];
}

export function equipmentAffixGetItemOccupiedExplicitModIds(env, item) {
    let ids = new Set();
    (item && Array.isArray(item.stats) ? item.stats : []).forEach(stat => {
        if (!stat) return;
        if (stat.id) ids.add(stat.id);
        if (Array.isArray(stat.extraStats)) stat.extraStats.forEach(extra => { if (extra && extra.id) ids.add(extra.id); });
    });
    if (item && item.chaosInfusion && item.chaosInfusion.id) ids.add(item.chaosInfusion.id);
    equipmentAffixGetImmutableItemSpecialStats(env, item).forEach(stat => {
        if (stat && stat.id) ids.add(stat.id);
    });
    return ids;
}

export function equipmentAffixGetItemExplicitOptionCount(item) {
    if (!item) return 0;
    return (Array.isArray(item.stats) ? item.stats.length : 0) + (item.chaosInfusion ? 1 : 0);
}

/** A known atlas region id (data/atlas.js ATLAS.regions), otherwise null: what an item may remember as its drop region. */
/** Save boundary for where an item came from and what burned it: its atlas region (loop 27) and the burning branch's mark and
 * lines (loop 30, js/ember-corruption.js). */
export function equipmentAffixNormalizeItemOrigin(env, item) {
    item.dropRegion = equipmentAffixNormalizeDropRegion(env, item.dropRegion);
    if (typeof env.deps.emberCorruption === 'object') env.deps.emberCorruption.normalize(item);
    if (typeof env.deps.gardenOils === 'object') env.deps.gardenOils.normalize(item);
    env.deps.itemInfluences.normalizeInfluences(item);
}

export function equipmentAffixNormalizeDropRegion(env, value) {
    const regions = typeof env.deps.ATLAS === 'object' && env.deps.ATLAS && Array.isArray(env.deps.ATLAS.regions) ? env.deps.ATLAS.regions : [];
    return typeof value === 'string' && regions.some(row => row.id === value) ? value : null;
}

export function equipmentAffixUpdateItemName(item) {
    if (!item) return;
    if (item.rarity === 'normal') item.name = item.baseName;
    else if (item.rarity === 'magic') item.name = `마법의 ${item.baseName}`;
    else if (item.rarity === 'rare') item.name = `희귀한 ${item.baseName}`;
}

export function equipmentAffixGetExplicitModStatIds(mod) {
    return [mod.statId || mod.id, ...(mod.compound || []).map(sub => sub.statId || sub.id)];
}
