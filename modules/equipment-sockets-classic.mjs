import { createEquipmentSockets } from './domain/equipment-sockets.mjs';
const sockets = createEquipmentSockets({
    get harvestUniques() { return HARVEST_SOCKET_UNIQUES; }, get dropChance() { return SOCKETED_ACCESSORY_DROP_CHANCE; },
    get stages() { return STUMP_BOX_STAGES; }
}, {
    translate: (...args) => _t(...args), particle: (...args) => pickParticle(...args), random: () => Math.random(),
    jewelsUnlocked: owner => typeof contentProgression === 'object' && contentProgression.isUnlocked('jewel', owner),
    get stumpBox() { return stumpBox; },
    placement: {
        findAddPlacement: (item, state) => equipmentInventoryGridRuntime.findAddPlacement(item, state),
        ensureItemIdentity: item => equipmentLoadoutRuntime.ensureItemIdentity(item)
    }
});
const equipmentSockets = Object.freeze({ ...sockets,
    rollDropSocket: (item, owner = game) => sockets.rollDropSocket(item, owner),
    returnJewels: (item, state = game) => sockets.returnJewels(item, state),
    chisel: (item, state = game) => sockets.chisel(item, state),
    insert: (item, id, state = game, at = null) => sockets.insert(item, id, state, at),
    insertHarvest: (item, id, state = game, at = null) => sockets.insertHarvest(item, id, state, at),
    remove: (item, kind, index, state = game) => sockets.remove(item, kind, index, state)
});
safeExposeGlobals({ equipmentSockets });
