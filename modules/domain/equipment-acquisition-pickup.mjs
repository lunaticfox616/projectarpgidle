import { acquireSalvageItemObject, acquireSalvageJewelObject } from './equipment-salvage-execution.mjs';
import { acquireIsGuaranteedEquipmentPickup, acquirePassesItemPickupFilter } from './equipment-acquisition-filters.mjs';
import { acquireRecordEquipmentAcquisition } from './equipment-acquisition-codex.mjs';

// Explicit returns from crafting stay in inventory; ordinary drops keep the auto-equip setting. The first loop's starter weapon waits in the
// bag for its equip guide (js/combat-kill-rewards.js grantLoopStarterWeaponOnFirstKill, starterWeaponTutorialPending).
export function acquireGetAcquiredItemAutoEquipSlot(env, owner, item, options) {
    if (options?.skipAutoEquip || (item && item.id === owner.starterWeaponTutorialPending)) return null;
    return typeof env.deps.tryAutoEquipEmptySlot === 'function' ? env.deps.tryAutoEquipEmptySlot(item, owner) : null;
}

/** A bought item into the bag (the NPC shops js/npc-shop.js, the black market js/black-market.js): kept whatever the pickup filter
 * and auto-salvage say, never worn on its own, then moved to place (a bag cell { column, row }, row over all pages) when given.
 * The shop checked the room first: a full bag would salvage it. */
export function* acquireStowBoughtItem(env, owner, item, place = null) {
    if (!(yield* acquireAddItemToInventory(env, owner, item, { ignoreFilter: true, ignoreAutoSalvage: true, skipAutoEquip: true }))) return false;
    env.deps.equipmentInventoryGridRuntime.ensureState(owner);
    if (place) env.deps.equipmentInventoryGridRuntime.placeInventoryItem(env.deps.equipmentInventoryGridRuntime.getItemKey(item), place.column, place.row, owner);
    return true;
}

/** Resolve capacity and auto-salvage at pickup time. */
export function* acquireStoreEquipmentPickup(env, owner, item, { guaranteedKeep, ignoreAutoSalvage }) {
    const fits = env.deps.canStoreEquipmentItems([item], owner);
    if (!fits && !guaranteedKeep) return (yield* acquireSalvageEquipmentPickup(env, owner, item, true));
    if (!ignoreAutoSalvage && owner.settings.autoSalvageEnabled && owner.settings.autoSalvageRarities?.[item.rarity])
        return (yield* acquireSalvageEquipmentPickup(env, owner, item, false));
    owner.inventory.push(item);
    return { accepted: true, kind: fits ? 'stored' : 'protected' };
}

export function* acquireSalvageEquipmentPickup(env, owner, item, overflow) {
    const rewards = (yield* acquireSalvageItemObject(env, owner, item, true, { noDivine: overflow }));
    if (overflow && owner.isBackgroundCalculation) acquireCountBackgroundOverflowSalvage(owner);
    return { accepted: false, kind: overflow ? 'overflow' : 'salvaged', rewards, log: !overflow || !owner.isBackgroundCalculation };
}

export function acquireCountBackgroundOverflowSalvage(owner) { owner.backgroundOverflowSalvageCount = Math.max(0, Math.floor(Number(owner.backgroundOverflowSalvageCount) || 0)) + 1; }

export function* acquireAddItemToInventory(env, owner, item, options) {
    env.deps.normalizeItem(item);
    const logLoot = owner.settings.showLootLog;
    const { guaranteedKeep, ignoreFilter, ignoreAutoSalvage } = pickupAdmission(env, owner, item, options);
    let autoEquipSlot = acquireGetAcquiredItemAutoEquipSlot(env, owner, item, options);
    if (autoEquipSlot) {
        (yield* acquireRecordEquipmentAcquisition(env, owner, item));
        if (logLoot) (yield { kind: 'acquisitionLog', args: [env.deps._t("🛡️ 빈 {autoEquipSlot} 슬롯에 자동 장착: <span class='loot-{rarity}'>[{name}]</span>", { autoEquipSlot, rarity: item.rarity, name: env.deps._t(item.name) }), 'loot-rare', { item }] });
        (yield { kind: 'acquisitionUnlocks', args: [] });
        return true;
    }
    if (!ignoreFilter && !acquirePassesItemPickupFilter(env, owner, item)) {
        if (logLoot) (yield { kind: 'acquisitionLog', args: [env.deps._t("🚫 아이템 필터로 미습득: <span class='loot-{rarity}'>[{name}]</span>", { rarity: item.rarity, name: env.deps._t(item.name) }), 'attack-monster'] });
        return false;
    }
    const result = (yield* acquireStoreEquipmentPickup(env, owner, item, { guaranteedKeep, ignoreAutoSalvage }));
    if (result.accepted) { (yield* acquireRecordEquipmentAcquisition(env, owner, item)); (yield { kind: 'acquisitionUnlocks', args: [] }); }
    yield* publishPickupResult(env, item, result, logLoot);
    return result.accepted;
}

function pickupAdmission(env, owner, item, options) {
    let guaranteedKeep = acquireIsGuaranteedEquipmentPickup(env, owner, item, options), alwaysPicked = env.deps.bagItems.keptOnPickup(item, owner);
    let ignoreFilter = guaranteedKeep || alwaysPicked || !!(options && options.ignoreFilter);
    let ignoreAutoSalvage = guaranteedKeep || alwaysPicked || !!(options && options.ignoreAutoSalvage);
    return { guaranteedKeep, ignoreFilter, ignoreAutoSalvage };
}

function* publishPickupResult(env, item, result, logLoot) {
    if (result.kind === 'protected') (yield { kind: 'acquisitionLog', args: [env.deps._t('🎒 인벤토리가 가득 찼지만 [{name}]{particle} 유실 방지를 위해 초과 보관됩니다.', { name: env.deps.getItemDisplayName(item), particle: env.deps.pickParticle(item.name, '은', '는') }), 'attack-monster'] });
    else if (logLoot && result.rewards && result.log) {
        const label = result.kind === 'overflow' ? '공간 부족 자동해체' : '자동해체';
        (yield { kind: 'acquisitionLog', args: [`${label}: <span class='loot-${item.rarity}'>[${env.deps._t(item.name)}]</span>, ${(yield { kind: 'acquisitionSalvageText', args: [result.rewards] })}`, 'loot-normal'] });
    }
}

/** Jewels go straight into the bag (js/bag-items.js addJewel): with the bag full a rare or unique one waits in the temporary
 * storage and the rest are salvaged into jewel shards. One whose rarity the auto-salvage takes is salvaged instead of kept
 * (bagItems.salvagedOnDrop); the receipt then reads stored: false with the bag not full. */
export function* acquireReceiveJewelDrop(env, owner, jewel) {
    if(env.deps.bagItems.salvagedOnDrop(jewel, owner))return {jewel,inventoryFull:false,stored:false,protectOverflow:false,shardGain:(yield* acquireSalvageJewelObject(env, owner, jewel,true))};
    env.deps.combatLootReceipts.item(owner,jewel,'jewel'); // 가방에 들어온 것만 지도 결과에 적는다(장비와 같다)
    const added=env.deps.bagItems.addJewel(jewel, owner);
    return {jewel,inventoryFull:added.protectOverflow||!added.stored,...added};
}
