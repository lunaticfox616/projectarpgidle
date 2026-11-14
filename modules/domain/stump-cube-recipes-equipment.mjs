

export function cubeRecipeItems(group) {
    return group.map(entry => entry.item);
}

export function cubeRecipeBaseSlot(item) {
    return String((item && item.slot) || '').replace(/[123]$/, '');
}

export function cubeRecipeTopTier(list) {
    return Math.max(1, ...list.map(item => Math.floor(Number(item.hiddenTier || item.itemTier) || 1)));
}

/** A fresh drop-quality item of this base (or a base of this slot) and tier (no realm base). */
export function cubeRecipeMakeEquipment(env, slot, tier, rarity, baseId) {
    const base = env.deps.BASE_ITEM_DB.find(row => row.id === baseId) || env.deps.chooseItemBase(slot, tier, {});
    if (!base) return null;
    const level = env.deps.levelProgression.tierLevel(tier);
    const item = env.deps.createItemFromBase(base, rarity, tier, { affixTierCap: env.deps.levelProgression.affixCap(level), affixTierFloor: 1,
        tierWeightFalloff: env.deps.DROPPED_AFFIX_TIER_WEIGHT_FALLOFF });
    return env.deps.levelProgression.stampItem(item, level);
}

export function cubeRecipeEquipmentResult(env, groups, item) {
    return item ? { ok: true, consumed: groups.flat(), outputs: [{ kind: 'equipment', item }] } : { ok: false, reason: env.deps._t('이 부위의 장비를 만들 수 없습니다.') };
}

/** 마법 장비 + 다 자란 씨앗: the same base and tier as a rare item with fresh affixes. */
export function cubeRecipeMagicUpgrade(env, groups) {
    const gear = groups[0][0].item;
    return cubeRecipeEquipmentResult(env, groups, cubeRecipeMakeEquipment(env, cubeRecipeBaseSlot(gear), cubeRecipeTopTier([gear]), 'rare', gear.baseId));
}

// Capped by what the player's level can already drop, so repeated tempering cannot outrun progress.
export function cubeRecipeRareTierTarget(env, gear, state) {
    const top = cubeRecipeTopTier([gear]);
    const level = Math.max(Math.floor(Number(state.level) || 1), Math.floor(Number(gear.itemLevel) || 1));
    return Math.max(top, Math.min(top + 1, env.deps.levelProgression.maxDropTier(level)));
}

export function cubeRecipeRareTier(env, groups, state) {
    const gear = groups[0][0].item;
    return cubeRecipeEquipmentResult(env, groups, cubeRecipeMakeEquipment(env, cubeRecipeBaseSlot(gear), cubeRecipeRareTierTarget(env, gear, state), 'rare'));
}

/** 히든 조합: 세 수확물 고유 → 풍작의 갑주(data/items.js). 세 고유의 소켓에 든 것은 소모할 때 돌아간다(stump-cube.js REMOVERS). */
export function cubeRecipeHarvestArmour(env, groups) {
    const tier = cubeRecipeTopTier(groups.flat().map(entry => entry.item)), item = env.deps.generateUniqueItem(tier, '갑옷', '풍작의 갑주', {});
    return cubeRecipeEquipmentResult(env, groups, item ? env.deps.levelProgression.stampItem(item, env.deps.levelProgression.tierLevel(tier)) : null);
}

/** Another unique of the same slot and tier (a few tries to avoid handing back the same one). */
export function cubeRecipeUniqueReroll(env, groups) {
    const gear = groups[0][0].item, tier = cubeRecipeTopTier([gear]);
    let item = null;
    for (let tries = 0; tries < 6 && (!item || item.name === gear.name); tries++) item = env.deps.generateUniqueItem(tier, cubeRecipeBaseSlot(gear), null, {});
    return cubeRecipeEquipmentResult(env, groups, item ? env.deps.levelProgression.stampItem(item, env.deps.levelProgression.tierLevel(tier)) : null);
}

/** Now and then one base line of the new item turns exceptional (최고 굴림의 120%), unless it already has one. */
export function cubeRecipeMaybeExceptional(env, item, chance, random) {
    const base = item && !item.exceptionalBase && Array.isArray(item.baseStats) ? item.baseStats.filter(Boolean) : [];
    if (base.length && random() < chance) env.deps.boostExceptionalBaseLine(item, base[Math.floor(random() * base.length)]);
}

/** 같은 고유 2: a fresh copy of that unique at the better tier, its lines rolled again, sometimes on an exceptional base line. */
export function cubeRecipeUniqueRemake(env, [group], state, random) {
    const gear = group[0].item, tier = cubeRecipeTopTier(cubeRecipeItems(group)), item = env.deps.generateUniqueItem(tier, cubeRecipeBaseSlot(gear), gear.name, {});
    cubeRecipeMaybeExceptional(env, item, env.deps.STUMP_CUBE_UNIQUE_EXCEPTIONAL_CHANCE, random);
    return cubeRecipeEquipmentResult(env, [group], item ? env.deps.levelProgression.stampItem(item, env.deps.levelProgression.tierLevel(tier)) : null);
}

/** 같은 베이스 희귀 3: that base as a fresh rare at their best tier, sometimes on an exceptional base line. */
export function cubeRecipeRareExceptional(env, [group], state, random) {
    const gear = group[0].item, item = cubeRecipeMakeEquipment(env, cubeRecipeBaseSlot(gear), cubeRecipeTopTier(cubeRecipeItems(group)), 'rare', gear.baseId);
    cubeRecipeMaybeExceptional(env, item, env.deps.STUMP_CUBE_RARE_EXCEPTIONAL_CHANCE, random);
    return cubeRecipeEquipmentResult(env, [group], item);
}

/** 장신구 주얼 융합(2026-10-30 사용자): one of the three jewels, at random, is fused into a new void socket; the other two are used up.
 * A fused jewel never comes out (js/equipment-sockets.js fuse). */
export function cubeRecipeSocketJewel(env, [[equipment], jewels], state, random) {
    if (!env.deps.equipmentSockets.openVoidSocket(equipment.item)) return { ok: false, reason: env.deps._t('이 장비에는 소켓을 더 뚫을 수 없습니다.') };
    const kept = jewels[Math.floor(random() * jewels.length)];
    const result = env.deps.equipmentSockets.insert(equipment.item, kept.item.id, state);
    if (!result.ok) {
        delete equipment.item.voidSocket;
        return result;
    }
    env.deps.equipmentSockets.fuse(equipment.item);
    return { ok: true, consumed: jewels.filter(entry => entry !== kept), outputs: [{ kind: 'equipment', existing: equipment.item }] };
}
