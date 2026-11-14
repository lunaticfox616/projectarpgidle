import { createEquipmentLoadoutState } from './domain/equipment-loadout-state.mjs';
import { createEquipmentLoadouts } from './domain/equipment-loadouts.mjs';
const itemState = createEquipmentLoadoutState(Object.keys(defaultGame.equipment), {
    translate: (...args) => _t(...args), random: () => Math.random(), now: () => Date.now(),
    get runes() { return window.GameModules.skills.loadouts; }
});
const loadouts = createEquipmentLoadouts(itemState, {
    translate: (...args) => _t(...args),
    get runes() { return window.GameModules.skills.loadouts; },
    get stats() { return combatEquipmentStats; }, get grid() { return equipmentInventoryGridRuntime; },
    get candidateSlots() { return typeof getEquipCandidateSlots === 'function' ? getEquipCandidateSlots : undefined; }
});
const ensureEquipmentLoadoutItemIdentity = itemState.ensureItemIdentity;
const getEquipmentLoadoutItemIdentity = itemState.getItemIdentity;
const getEquipmentLoadoutOwnedItems = itemState.getOwnedItems;
const ensureEquipmentLoadoutState = (state = game) => itemState.ensureState(state);
const getEquipmentLoadoutInspection = (slot, state = game) => loadouts.inspect(slot, state);
const saveEquipmentLoadoutPreset = (slot, name, state = game) => loadouts.save(slot, name, state);
const applyEquipmentLoadoutPreset = (slot, state = game) => {
    const result = loadouts.apply(slot, state);
    if (result.ok && state === game) normalizeSupportLoadout(true);
    return result;
};
const renameEquipmentLoadoutPreset = (slot, name, state = game) => loadouts.rename(slot, name, state);
const clearEquipmentLoadoutPreset = (slot, state = game) => loadouts.clear(slot, state);
const isEquipmentLoadoutItemReferenced = (item, state = game) => loadouts.isReferenced(item, state);
const equipmentLoadoutRuntime = Object.freeze({
    limit: itemState.limit, slots: itemState.slots, itemState,
    ensureState: ensureEquipmentLoadoutState, inspect: getEquipmentLoadoutInspection, save: saveEquipmentLoadoutPreset,
    apply: applyEquipmentLoadoutPreset, rename: renameEquipmentLoadoutPreset, clear: clearEquipmentLoadoutPreset,
    isReferenced: isEquipmentLoadoutItemReferenced, getItemIdentity: getEquipmentLoadoutItemIdentity,
    ensureItemIdentity: ensureEquipmentLoadoutItemIdentity
});
safeExposeGlobals({ equipmentLoadoutRuntime, ensureEquipmentLoadoutItemIdentity, getEquipmentLoadoutItemIdentity,
    getEquipmentLoadoutOwnedItems, ensureEquipmentLoadoutState, getEquipmentLoadoutInspection,
    saveEquipmentLoadoutPreset, applyEquipmentLoadoutPreset, renameEquipmentLoadoutPreset,
    clearEquipmentLoadoutPreset, isEquipmentLoadoutItemReferenced });
