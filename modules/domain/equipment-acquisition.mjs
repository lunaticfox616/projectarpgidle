import { acquireResolveCurrencyAward, acquireAwardCurrency, acquireCommitCurrencyGain, acquireNotifyCurrencyAcquisition } from './equipment-acquisition-currency.mjs';
import { acquireGetUniqueCodexKeyByItem, acquireRegisterUniqueToCodexOnAcquire, acquireRecordEquipmentAcquisition } from './equipment-acquisition-codex.mjs';
import { acquirePassesItemPickupFilter, acquireIsGuaranteedEquipmentPickup, acquirePreviewEquipmentPickup } from './equipment-acquisition-filters.mjs';
import { acquireGetAcquiredItemAutoEquipSlot, acquireStowBoughtItem, acquireStoreEquipmentPickup, acquireAddItemToInventory, acquireReceiveJewelDrop } from './equipment-acquisition-pickup.mjs';
import { acquireIsChaseUniqueItem, acquireGetItemSalvageRewardProfile, acquireMergeSalvageRewards, acquireRollItemSalvageRewards, acquireGetJewelSalvageShardGain } from './equipment-salvage-rewards.mjs';
import { acquireSalvageJewelObject, acquireSalvageItemObject, acquireIsBulkSalvageProtectedItem, acquireSalvageBagItems, acquireConfirmedSalvageTargets } from './equipment-salvage-execution.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createEquipmentAcquisition(deps) {
    const env = { deps };
    env.PICKUP_EXCEPTIONS = Object.freeze({
        exceptional: item => !!item.exceptionalBase,
        fineRare: item => item.rarity === 'rare' && env.deps.lootMoments.fineLines(item) >= env.deps.LOOT_OMENS.fineRare.good,
        socket: item => !!item.voidSocket || (Array.isArray(item.sockets) && item.sockets.length > 0),
        corrupted: item => !!item.corrupted,
        newUnique: (item, owner) => env.deps.lootMoments.isNewUnique(item, owner),
        influenced: item => env.deps.itemInfluences.influenceKeys(item).some(key => key !== 'swapped'),
        ward: item => env.deps.colonyWards.isWard(item)
    });
    return Object.freeze({
        resolveCurrencyAward: (...args) => acquireResolveCurrencyAward(env, ...args),
        awardCurrency: (...args) => acquireAwardCurrency(env, ...args),
        commitCurrencyGain: (...args) => acquireCommitCurrencyGain(env, ...args),
        notifyCurrencyAcquisition: acquireNotifyCurrencyAcquisition,
        getUniqueCodexKeyByItem: (...args) => acquireGetUniqueCodexKeyByItem(env, ...args),
        registerUniqueToCodexOnAcquire: (...args) => acquireRegisterUniqueToCodexOnAcquire(env, ...args),
        recordEquipmentAcquisition: (...args) => acquireRecordEquipmentAcquisition(env, ...args),
        passesItemPickupFilter: (...args) => acquirePassesItemPickupFilter(env, ...args),
        isGuaranteedEquipmentPickup: (...args) => acquireIsGuaranteedEquipmentPickup(env, ...args),
        previewEquipmentPickup: (...args) => acquirePreviewEquipmentPickup(env, ...args),
        getAcquiredItemAutoEquipSlot: (...args) => acquireGetAcquiredItemAutoEquipSlot(env, ...args),
        stowBoughtItem: (...args) => acquireStowBoughtItem(env, ...args),
        storeEquipmentPickup: (...args) => acquireStoreEquipmentPickup(env, ...args),
        addItemToInventory: (...args) => acquireAddItemToInventory(env, ...args),
        receiveJewelDrop: (...args) => acquireReceiveJewelDrop(env, ...args),
        isChaseUniqueItem: (...args) => acquireIsChaseUniqueItem(env, ...args),
        getItemSalvageRewardProfile: (...args) => acquireGetItemSalvageRewardProfile(env, ...args),
        mergeSalvageRewards: (...args) => acquireMergeSalvageRewards(env, ...args),
        rollItemSalvageRewards: (...args) => acquireRollItemSalvageRewards(env, ...args),
        getJewelSalvageShardGain: acquireGetJewelSalvageShardGain,
        salvageJewelObject: (...args) => acquireSalvageJewelObject(env, ...args),
        salvageItemObject: (...args) => acquireSalvageItemObject(env, ...args),
        isBulkSalvageProtectedItem: (...args) => acquireIsBulkSalvageProtectedItem(env, ...args),
        salvageBagItems: (...args) => acquireSalvageBagItems(env, ...args),
        confirmedSalvageTargets: (...args) => acquireConfirmedSalvageTargets(env, ...args)
    });
}
