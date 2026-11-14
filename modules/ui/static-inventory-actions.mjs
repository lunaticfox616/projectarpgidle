import { refreshCraftItemPickerOverlay } from './static-picker-dialog.mjs';
import { getInventoryRarityFilterKeys, getInventoryRarityFilter, isAllInventoryRarityFilterOn, getAutoSalvageRarities, renderAutoSalvageRarityChips } from './static-inventory-filters.mjs';
import { updateSearchFilter } from './static-search-actions.mjs';

export function applyInventoryRarityFilterChange(runtime) {

    // Update the picker overlay in place (no close/reopen flash) when it is open.
    if (runtime.deps.document.getElementById('craft-item-picker-overlay') && runtime.state.craftPickerKind) {
        refreshCraftItemPickerOverlay(runtime);
    }
    if (typeof runtime.deps.updateStaticUI === 'function') (0, runtime.deps.updateStaticUI)();

}

export function toggleInventoryRarityFilter(runtime, rarity) {

    if (!getInventoryRarityFilterKeys().includes(rarity)) return;
    let f = getInventoryRarityFilter(runtime);
    f[rarity] = !f[rarity];
    applyInventoryRarityFilterChange(runtime);

}

export function toggleAllInventoryRarityFilter(runtime) {

    let f = getInventoryRarityFilter(runtime);
    let next = !isAllInventoryRarityFilterOn(runtime);
    getInventoryRarityFilterKeys().forEach(k => { f[k] = next; });
    applyInventoryRarityFilterChange(runtime);

}

export function toggleAutoSalvageRarity(runtime, rarity) {

    if (!getInventoryRarityFilterKeys().includes(rarity)) return;
    let f = getAutoSalvageRarities(runtime);
    f[rarity] = !f[rarity];
    refreshAutoSalvagePanel(runtime);
    if (typeof runtime.deps.syncSalvageControlsFromSettings === 'function') (0, runtime.deps.syncSalvageControlsFromSettings)();
    if (typeof runtime.deps.queueImportantSave === 'function') (0, runtime.deps.queueImportantSave)(400);

}

export function refreshAutoSalvagePanel(runtime) {

    let host = runtime.deps.document.getElementById('ui-equipment-auto-salvage');
    if (host) host.innerHTML = runtime.deps.equipmentLootUi.renderAutoSalvage(renderAutoSalvageRarityChips(runtime));

}

export function resetSearchFilter(runtime, key) {
    updateSearchFilter(runtime, key, '');
}
