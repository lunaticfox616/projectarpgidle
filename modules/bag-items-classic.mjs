import { createBagItems } from './domain/bag-items.mjs';
const bag = createBagItems({
    translate: (...args) => _t(...args), nextId: () => ++window.GameModules.state.session.itemIdCounter,
    get visuals() { return ITEM_VISUAL_ASSET_DB; }, get cores() { return coreItems; }, get sockets() { return equipmentSockets; },
    get wards() { return typeof colonyWards === 'object' ? colonyWards : null; }, get policy() { return equipmentLootPolicy; },
    isUnlocked: (id, state) => contentProgression.isUnlocked(id, state),
    jewelStats: item => getJewelStats(item), salvageJewel: (...args) => salvageJewelObject(...args), jewelShardGain: item => getJewelSalvageShardGain(item),
    placement: {
        findAddPlacement: (item, state) => equipmentInventoryGridRuntime.findAddPlacement(item, state),
        ensureItemIdentity: item => equipmentLoadoutRuntime.ensureItemIdentity(item)
    }
});
const bagItems = Object.freeze({ ...bag,
    keptOnPickup: (item, owner = game) => bag.keptOnPickup(item, owner),
    jewels: (state = game) => bag.jewels(state), cores: (state = game) => bag.cores(state),
    salvagedOnDrop: (jewel, state = game) => bag.salvagedOnDrop(jewel, state),
    put: (item, state = game, force = false) => bag.put(item, state, force), take: (item, state = game) => bag.take(item, state),
    addJewel: (jewel, state = game) => bag.addJewel(jewel, state), addCore: (core, state = game) => bag.addCore(core, state),
    jewelSlots: (state = game) => bag.jewelSlots(state), candidateSlots: (item, state = game) => bag.candidateSlots(item, state),
    socketFromBag: (jewel, slot, state = game) => bag.socketFromBag(jewel, slot, state)
});
safeExposeGlobals({ bagItems });
