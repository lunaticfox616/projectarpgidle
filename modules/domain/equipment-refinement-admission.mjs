

export function refineCanPayCurrencyCosts(owner, costs) {
    return (costs || []).every(row => (owner.currencies[row.key] || 0) >= row.amount);
}

export function refinePayCurrencyCosts(owner, costs) {
    if (!refineCanPayCurrencyCosts(owner, costs)) return false;
    (costs || []).forEach(row => { owner.currencies[row.key] = Math.max(0, Math.floor(owner.currencies[row.key] || 0) - row.amount); });
    return true;
}

/** 독벌침을 쓸 수 없는 까닭. 마법, 희귀, 고유 무기에 쓰고(일반은 줄 한도가 없어 막는다, 고유는 사용자 결정 2026-11-07),
 * 새 줄은 추가 옵션 6줄 안에서만 붙는다(이미 붙은 독벌침 줄은 바꿔 끼우므로 자리를 묻지 않는다). */
export function refineGetVenomStingerRefusal(env, item) {
    if (item.slot !== '무기') return '독벌침은 무기에만 사용할 수 있습니다.';
    if (!['magic', 'rare', 'unique'].includes(item.rarity)) return '독벌침은 마법, 희귀, 고유 무기에만 사용할 수 있습니다.';
    const replaces = (Array.isArray(item.stats) ? item.stats : []).some(stat => stat && stat.venomStingerBonus);
    return !replaces && env.deps.getItemExplicitOptionCount(item) >= env.deps.EXPLICIT_AFFIX_LINE_CAP ? '추가 옵션이 6줄이라 독벌침 줄을 붙일 수 없습니다.' : '';
}

/** 독벌침이 굴릴 무기 공격 줄: 없는 능력치이면서, 이미 붙은 독벌침 줄을 뺀 접두 3, 접미 3 자리가 남는 종류. 지역 줄은 그 지역 장비만. */
export function refineGetVenomStingerMods(env, item) {
    const occupiedIds = env.deps.getItemOccupiedExplicitModIds(item);
    const room = env.deps.equipmentCrafting.affixRoom(item, item.rarity, (item.stats || []).find(stat => stat && stat.venomStingerBonus) || null);
    return env.deps.MOD_DB.filter(mod => mod.slots.includes('무기') && env.deps.VENOM_STINGER_STAT_IDS.includes(mod.statId || mod.id) && env.deps.isModForOrigin(mod, item)
        && !occupiedIds.has(mod.statId || mod.id) && env.deps.equipmentCrafting.fitsRoom(room, mod));
}

/** Why a rot harvest cannot take a line off the item, or '': corrupted gear, a fused relic (as for the pruning shears, craftCurrencyUse
 * RELIC_ACTIONS) and a hall piece. */
export function refineGetRotHarvestRefusal(item) {
    if (item.corrupted) return '타락한 아이템에는 사용할 수 없습니다.';
    if (item.fusedRelic) return '융합 유물은 황금률, 잿불가지, 축복의 꽃잎만 사용할 수 있습니다.';
    return item.hallReplica ? '전당 소장품은 원본 상태를 보존하므로 제작할 수 없습니다.' : '';
}

export function refineIsMarketUnlocked(env) {
    return env.deps.contentProgression.isUnlocked('market');
}

export function refineIsChaosInfuserUnlocked(owner) {
    return !!(owner.chaosInfuserUnlocked || owner.woodsmanSimulatorSeenLoop || (owner.woodsmanDefeatAttempts || 0) > 0 || (owner.journalEntries || []).includes('woodsman'));
}
