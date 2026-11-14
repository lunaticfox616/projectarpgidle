

export function* workshopApplyEnchantedHoney(env, owner, item) {
    if (!item) return (yield { kind: 'workshopLog', args: [env.deps._t('먼저 아이템을 선택하세요.'), 'attack-monster'] });
    if (item.fusedRelic) return (yield { kind: 'workshopLog', args: [env.deps._t('융합 유물은 시간에 굳어, 황금률/잿불가지/축복의 꽃잎만 받아들입니다.'), 'attack-monster'] });
    if ((owner.currencies.enchantedHoney || 0) <= 0) return (yield { kind: 'workshopLog', args: [env.deps._t('마력 깃든 벌꿀이 부족합니다.'), 'attack-monster'] });
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    if (item.stats.length < 4) return (yield { kind: 'workshopLog', args: [env.deps._t('벌꿀 고정은 추가 옵션이 4개 이상일 때만 사용할 수 있습니다.'), 'attack-monster'] });
    if (item.stats.some(stat => stat && stat.lockedByHoney)) return (yield { kind: 'workshopLog', args: [env.deps._t('이 장비에는 이미 고정 옵션이 있습니다.'), 'attack-monster'] });
    let candidates = item.stats.filter(stat => stat && !stat.lockedByRift);
    if (candidates.length <= 0) return (yield { kind: 'workshopLog', args: [env.deps._t('고정 가능한 옵션이 없습니다.'), 'attack-monster'] });
    let pick = candidates[Math.floor(Math.random() * candidates.length)];
    pick.lockedByHoney = true;
    owner.currencies.enchantedHoney--;
    (yield { kind: 'workshopLog', args: [env.deps._t('🍯 [{name}] 옵션 고정 적용: {value}', { name: env.deps._t(item.name), value: env.deps._t(pick.statName || env.deps.getStatName(pick.id)) }), 'loot-unique'] });
    (yield { kind: 'workshopRefresh', args: [] });
}

export function* workshopApplyVenomStinger(env, owner, item) {
    if (!item) return (yield { kind: 'workshopLog', args: [env.deps._t('먼저 아이템을 선택하세요.'), 'attack-monster'] });
    if (item.fusedRelic) return (yield { kind: 'workshopLog', args: [env.deps._t('융합 유물은 시간에 굳어, 황금률/잿불가지/축복의 꽃잎만 받아들입니다.'), 'attack-monster'] });
    if ((owner.currencies.venomStinger || 0) <= 0) return (yield { kind: 'workshopLog', args: [env.deps._t('독벌침이 부족합니다.'), 'attack-monster'] });
    const refusal = env.deps.getVenomStingerRefusal(item);
    if (refusal) return (yield { kind: 'workshopLog', args: [refusal, 'attack-monster'] });
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    let attackMods = env.deps.getVenomStingerMods(item);
    if (attackMods.length <= 0) return (yield { kind: 'workshopLog', args: [env.deps._t('독벌침이 붙일 수 있는 공격 옵션 자리가 없습니다(접두 3, 접미 3).'), 'attack-monster'] });
    let mod = env.deps.pickWeightedMod(attackMods);
    let rolled = env.deps.rollAffixValue(mod, env.deps.getItemCraftTier(item));
    let idx = item.stats.findIndex(stat => stat && stat.venomStingerBonus);
    rolled.venomStingerBonus = true;
    if (idx >= 0) item.stats[idx] = rolled;
    else item.stats.push(rolled);
    owner.currencies.venomStinger--;
    (yield { kind: 'workshopLog', args: [env.deps._t('🦂 독벌침 적용: {value} +{value2}', { value: env.deps._t(rolled.statName || env.deps.getStatName(rolled.id)), value2: env.deps.formatValue(rolled.id, rolled.val) }), 'loot-rare'] });
    (yield { kind: 'workshopRefresh', args: [] });
}

export function* workshopApplyVoidChisel(env, owner, item) {
    if (!item) return (yield { kind: 'workshopLog', args: [env.deps._t('먼저 아이템을 선택하세요.'), 'attack-monster'] });
    let result = env.deps.equipmentSockets.chisel(item, owner);
    if (!result.ok) return (yield { kind: 'workshopLog', args: [result.reason, 'attack-monster'] });
    (yield { kind: 'workshopLog', args: [env.deps._t('🕳️ [{name}]에 공허 소켓을 뚫었습니다.', { name: env.deps._t(item.name) }), 'loot-rare'] });
    (yield { kind: 'workshopRefresh', args: [] });
}

export function* workshopApplyWoodsmanTouch(env, owner, item) {
    if (!item) return (yield { kind: 'workshopLog', args: [env.deps._t('먼저 봉인할 장비를 선택하세요.'), 'attack-monster'] });
    if ((owner.currencies.ouroboros || 0) < 1) return (yield { kind: 'workshopLog', args: [env.deps._t('우로보로스가 부족합니다.'), 'attack-monster'] });
    if (item.loopSealed) return (yield { kind: 'workshopLog', args: [env.deps._t('이미 봉인된 장비입니다.'), 'attack-monster'] });
    owner.currencies.ouroboros--;
    item.loopSealed = true;
    (yield { kind: 'workshopLog', args: [env.deps._t('🌿 [{name}]{particle} 나무꾼의 손길로 봉인했습니다. 루프가 진행되어도 사라지지 않습니다.', { name: (yield { kind: 'workshopItemName', args: [item] }), particle: env.deps.pickParticle(item.name, '을', '를') }), 'loot-unique'] });
    (yield { kind: 'workshopRefresh', args: [] });
    (yield { kind: 'workshopSave', args: [200] });
}
