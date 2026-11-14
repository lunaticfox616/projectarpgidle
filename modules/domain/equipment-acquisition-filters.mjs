import { acquireGetUniqueCodexKeyByItem } from './equipment-acquisition-codex.mjs';

/** Explicit lines at the tier threshold or above. Unique lines have no tier, so uniques skip the count (2026-10-08: they were
 * all dropped once a count was set). */
export function acquirePassesPickupTierCount(item, settings) {
    const minTierCount = Math.max(0, Math.floor(settings.itemFilterMinTierCount || 0));
    if (minTierCount <= 0 || item.rarity === 'unique') return true;
    const tierThreshold = Math.max(1, Math.floor(settings.itemFilterTierThreshold || 10));
    return (item.stats || []).filter(stat => Number.isFinite(stat.tier) && stat.tier >= tierThreshold).length >= minTierCount;
}

export function acquireIsPickupException(env, owner, item, always) {
    return !!always && Object.entries(env.PICKUP_EXCEPTIONS).some(([key, test]) => always[key] === true && test(item, owner));
}

/** 부위와 무기 종류(itemFilterSlots, itemFilterWeaponCategories). A ring's 반지1 or 반지2 counts as 반지. */
export function acquirePassesPickupSlot(env, item, settings) {
    const slot = String(item.slot || '').replace(/[123]$/, '');
    if (settings.itemFilterSlots && settings.itemFilterSlots[slot] === false) return false;
    const category = slot === '무기' ? env.deps.getWeaponCategoryId(item) : null;
    return !category || !settings.itemFilterWeaponCategories || settings.itemFilterWeaponCategories[category] !== false;
}

export function acquirePassesItemPickupFilter(env, owner, item) {
    let settings = owner.settings || {};
    if (!settings.itemFilterEnabled) return true;
    if (acquireIsPickupException(env, owner, item, settings.itemFilterAlways)) return true;
    let rarities = { normal: true, magic: true, rare: true, unique: true, ...(settings.itemFilterRarities || {}) };
    if (!rarities[item.rarity] || !acquirePassesPickupSlot(env, item, settings)) return false;
    if (!passesPickupMinimumTier(item, settings)) return false;
    if (!acquirePassesPickupTierCount(item, settings)) return false;
    return passesPickupCodex(env, owner, item, settings);
}

function passesPickupMinimumTier(item, settings) {
    let minTier = Math.max(1, Math.floor((settings.itemFilterMinTiers || {})[item.rarity] || settings.itemFilterMinHiddenTier || 1));
    return !((item.hiddenTier || item.itemTier || 1) < minTier);
}

function passesPickupCodex(env, owner, item, settings) {
    if (item.rarity === 'unique' && settings.itemFilterOnlyNewCodexUnique) {
        let key = acquireGetUniqueCodexKeyByItem(env, item);
        if (key && owner.uniqueCodex && owner.uniqueCodex[key]) return false;
    }
    return true;
}

/** guaranteedKeep: 유실되면 안 되는 반환/정산 아이템(시간의 균열 융합·제단 회수 등)과 목표·보호 장비, 주얼과 코어.
 * 습득 필터·자동해체를 우회하고, 가득 찬 인벤토리에서도 해체 대신 초과 보관한다. 항상 줍기의 액막이는 필터와 등급 해체만 건너뛰고,
 * 가방이 차면 다른 장비처럼 해체된다(2026-11-03 사용자: 임시 보관함으로 들어오지 않게). */
export function acquireIsGuaranteedEquipmentPickup(env, owner, item, options) {
    return !!(options && options.guaranteedKeep) || env.deps.uniqueHuntRuntime.isTargetItem(item, owner) || env.deps.equipmentLootPolicy.matches(item, owner)
        || env.deps.bagItems.ownShape(item);
}

/** What picking `item` up would do before space is considered: 'kept', 'filtered' (pickup filter) or 'salvaged' (auto-salvage).
 * An exploration drop that would be kept waits on the floor (js/exploration-ground-loot.js); the others resolve at once. */
export function acquirePreviewEquipmentPickup(env, owner, item, options) {
    env.deps.normalizeItem(item);
    if (acquireIsGuaranteedEquipmentPickup(env, owner, item, options) || env.deps.bagItems.keptOnPickup(item, owner)) return 'kept';
    if (!acquirePassesItemPickupFilter(env, owner, item)) return 'filtered';
    return owner.settings.autoSalvageEnabled && owner.settings.autoSalvageRarities?.[item.rarity] ? 'salvaged' : 'kept';
}
