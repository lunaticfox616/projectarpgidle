

export function* workshopApplyCorruptSpore(env, owner, item) {
    if (!item) return (yield { kind: 'workshopLog', args: [env.deps._t('먼저 아이템을 선택하세요.'), 'attack-monster'] });
    if (!env.deps.isSporeCraftEquipment(item)) return (yield { kind: 'workshopLog', args: [env.deps._t('수확 제작은 장비에만 사용할 수 있습니다.'), 'attack-monster'] });
    const refusal = env.deps.getRotHarvestRefusal(item);
    if (refusal) return (yield { kind: 'workshopLog', args: [env.deps._t(refusal), 'attack-monster'] });
    if (!workshopRotHarvestKeys(env).every(key => workshopHoldsHarvest(env, owner, key))) return (yield { kind: 'workshopLog', args: [env.deps._t('부패 수확에는 화염, 냉기, 번개 식물이 하나씩 필요합니다.'), 'attack-monster'] });
    let ids = new Set(env.deps.ROT_SPORE_STAT_IDS);
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    let candidates = item.stats.map((stat, idx) => ({ stat, idx })).filter(row => row.stat && !row.stat.lockedByHoney && !row.stat.lockedByRift && ids.has(row.stat.id));
    if (candidates.length <= 0) return (yield { kind: 'workshopLog', args: [env.deps._t('제거할 원소 계열 옵션이 없습니다.'), 'attack-monster'] });
    workshopRotHarvestKeys(env).forEach(key => env.deps.stumpBox.payHarvestPrice(owner, key));
    let pick = env.deps.rndChoice(candidates);
    let removed = item.stats.splice(pick.idx, 1)[0];
    env.deps.updateItemName(item);
    (yield { kind: 'workshopLog', args: [env.deps._t('🌿 부패 수확 적용: {value} 옵션 제거', { value: env.deps._t(removed.statName || env.deps.getStatName(removed.id)) }), 'loot-rare'] });
    (yield { kind: 'workshopRefresh', args: [] });
}

export function* workshopApplyRiftSpore(env, owner, item) {
    if (!item) return (yield { kind: 'workshopLog', args: [env.deps._t('먼저 아이템을 선택하세요.'), 'attack-monster'] });
    if (!env.deps.isSporeCraftEquipment(item)) return (yield { kind: 'workshopLog', args: [env.deps._t('수확 제작은 장비에만 사용할 수 있습니다.'), 'attack-monster'] });
    const craftBlock = env.deps.equipmentCrafting.getRiftHarvestBlockReason(item);
    if (craftBlock) return (yield { kind: 'workshopLog', args: [craftBlock, 'attack-monster'] });
    if ((owner.currencies.fossil || 0) < 1 || !workshopHoldsHarvest(env, owner, workshopRiftHarvestKey(env))) return (yield { kind: 'workshopLog', args: [env.deps._t('균열 수확에는 미궁 화석 1개와 뿌리 1개가 필요합니다.'), 'attack-monster'] });
    return yield* applyRiftHarvest(env, owner, item);
}

function* applyRiftHarvest(env, owner, item) {
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    let pool = typeof env.deps.getFossilExclusivePool === 'function' ? env.deps.getFossilExclusivePool(item) : env.deps.FOSSIL_EXCLUSIVE_MODS.filter(mod => mod.slots.includes(item.slot));
    if (!pool || pool.length <= 0) return (yield { kind: 'workshopLog', args: [env.deps._t('이 장비 슬롯에 붙일 수 있는 화석 전용 옵션이 없습니다.'), 'attack-monster'] });
    owner.currencies.fossil--;
    env.deps.stumpBox.payHarvestPrice(owner, workshopRiftHarvestKey(env));
    let roll = env.deps.rollAffixValue(env.deps.pickWeightedMod(pool), env.deps.getItemCraftTier(item));
    roll.fossilExclusiveSpore = true;
    roll.craftSource = 'fossil';
    item.stats.push(roll);
    item.rarity = item.rarity === 'normal' ? 'magic' : item.rarity;
    env.deps.updateItemName(item);
    (yield { kind: 'workshopLog', args: [env.deps._t('🌿 균열 수확 적용: {value} +{value2}', { value: env.deps._t(roll.statName || env.deps.getStatName(roll.id)), value2: env.deps.formatValue(roll.id, roll.val) }), 'loot-unique'] });
    (yield { kind: 'workshopRefresh', args: [] });
}

export function workshopRotHarvestKeys(env) { return env.deps.STUMP_BOX_HARVEST_CRAFT.rot.map(color => env.deps.stumpBox.harvestPriceKey('any', color)); }

export function workshopRiftHarvestKey(env) { return env.deps.stumpBox.harvestPriceKey(env.deps.STUMP_BOX_HARVEST_CRAFT.riftKind); }

export function workshopHoldsHarvest(env, owner, key) { return env.deps.stumpBox.harvestPriceHeld(owner, key) >= 1; }
