

export function refineIsRemovableExplicitStat(stat) {
    return !!(stat && !stat.lockedByHoney && !stat.lockedByRift && !stat.encroachedFinal && !stat.unremovable);
}

export function refineGetAnnulmentRemovableStats(item) {
    return (item && Array.isArray(item.stats) ? item.stats : [])
        .map((stat, index) => ({ stat, index }))
        .filter(row => refineIsRemovableExplicitStat(row.stat));
}

// 잿불가지(타락) 제작 결과(2026-10-05 사용자 요청, data/items.js TAINTED_CRAFT_OUTCOMES): 이 장비에 쓸 수 없는 결과는 빼고 남은 비중으로 한 번 고른다.
export function refineGetTaintedRerollLines(item) {
    return (item.stats || []).map((stat, index) => ({ stat, index }))
        .filter(({ stat }) => stat && !stat.lockedByHoney && !stat.lockedByRift);
}

export function refineCanApplyTaintedOutcome(env, owner, item, kind) {
    if (kind === 'addMod') return env.deps.getAvailableMods(item).length > 0;
    if (kind === 'quality') return Math.floor(Number(item.quality) || 0) < env.deps.TAINTED_CRAFT_OUTCOMES.quality.cap;
    if (kind === 'rerollMod') return refineGetTaintedRerollLines(item).length > 0 && env.deps.getAvailableMods(item).length > 0;
    if (kind === 'socket') return env.deps.contentProgression.isUnlocked('jewel', owner) && env.deps.equipmentSockets.canAddCorruptionSocket(item);
    return kind === 'nothing';
}

export function refinePickTaintedOutcome(env, owner, item) {
    const rows = env.deps.TAINTED_CRAFT_OUTCOMES.weights.filter(([kind]) => refineCanApplyTaintedOutcome(env, owner, item, kind));
    let roll = Math.random() * rows.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [kind, weight] of rows) {
        if (roll < weight) return kind;
        roll -= weight;
    }
    return 'nothing';
}

/** One random explicit line (not honey/rift locked) becomes a different random mod rolled at the item's craft tier. */
export function refineRerollTaintedLine(env, item) {
    const { stat, index } = env.deps.rndChoice(refineGetTaintedRerollLines(item));
    const name = stat.statName || env.deps.getStatName(stat.id);
    item.stats.splice(index, 1);
    // 새 줄은 빠진 줄을 뺀 접두 3, 접미 3 자리가 남는 종류에서(옵션 추가만 한도를 넘는다). 고를 줄이 없으면 원래 줄이 남는다.
    const open = env.deps.getOpenAffixMods(item);
    const mod = env.deps.pickWeightedMod(open.filter(row => (row.statId || row.id) !== stat.id)) || env.deps.pickWeightedMod(open);
    item.stats.splice(index, 0, mod ? env.deps.rollAffixValue(mod, env.deps.getItemCraftTier(item)) : stat);
    env.deps.updateItemName(item);
    return env.deps._t('{name} 옵션이 {statName} 옵션으로 바뀌었습니다.', { name, statName: item.stats[index].statName || env.deps.getStatName(item.stats[index].id) });
}

/**
 * Corrupts the item and applies one outcome. Quality may pass the usual 20% up to the outcome cap (corrupted items resolve
 * quality up to 30%, js/equipment-stat-resolution.js). The socket outcome opens the corruption socket (js/equipment-sockets.js):
 * a second socket beside an accessory's void socket, or the item's only socket.
 * @returns {{kind: 'addMod'|'quality'|'rerollMod'|'socket'|'nothing', text: string}}
 */
export function refineCorruptCraftedItem(env, owner, item) {
    const kind = refinePickTaintedOutcome(env, owner, item);
    item.corrupted = true;
    if (kind === 'addMod') {
        item.stats.push(env.deps.rollAffixValue(env.deps.pickWeightedMod(env.deps.getAvailableMods(item)), env.deps.getItemCraftTier(item)));
        if (item.rarity === 'normal') item.rarity = 'magic'; // 줄이 붙은 일반 장비는 마법이 된다(균열 수확과 같다)
        env.deps.updateItemName(item);
        return { kind, text: env.deps._t('추가 옵션이 부여되었습니다.') };
    }
    if (kind === 'quality') {
        const { min, max, cap } = env.deps.TAINTED_CRAFT_OUTCOMES.quality, before = Math.floor(Number(item.quality) || 0);
        item.quality = Math.min(cap, before + min + Math.floor(Math.random() * (max - min + 1)));
        return { kind, text: env.deps._t('품질이 {before}% → {quality}%로 올랐습니다.', { before, quality: item.quality }) };
    }
    if (kind === 'rerollMod') return { kind, text: refineRerollTaintedLine(env, item) };
    if (kind === 'socket') {
        env.deps.equipmentSockets.addCorruptionSocket(item);
        return { kind, text: env.deps.equipmentSockets.count(item) > 1 ? '두 번째 소켓, 타락 소켓이 열렸습니다!' : '타락 소켓이 하나 생겼습니다.' };
    }
    return { kind, text: env.deps._t('아이템에 변화가 없습니다.') };
}
