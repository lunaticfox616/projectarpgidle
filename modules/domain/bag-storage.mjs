// Stateless storage operations. Both sockets and the bag use this owner; neither calls back into the other.
// The grid supplies existing packing/identity rules and may normalize its saved layout.
export function putBagItem(item, state, force, placement) {
    const result = placement.findAddPlacement(item, state);
    if (!result || !result.ok) {
        if (!force) return false;
        state.equipmentTemporaryStorage = [...(Array.isArray(state.equipmentTemporaryStorage) ? state.equipmentTemporaryStorage : []), item];
        return true;
    }
    const key = placement.ensureItemIdentity(item);
    state.inventory = Array.isArray(state.inventory) ? state.inventory : [];
    state.inventory.push(item);
    state.equipmentInventoryPlacements = { ...(state.equipmentInventoryPlacements || {}), [key]: result.placement };
    return true;
}
export function takeBagItem(item, state) {
    const index = (state.inventory || []).indexOf(item);
    if (index >= 0) state.inventory.splice(index, 1);
    return index >= 0;
}
