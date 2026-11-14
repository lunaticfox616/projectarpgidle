import { getCraftOrbUseState, getMobileCraftCurrencyUseState } from './static-craft-admission.mjs';
import { updateSearchFilter, bulkSalvageEquipBySearch, getGemSearchText, isGemLibraryMatchVisible } from './static-search-actions.mjs';
import { resetSearchFilter, toggleInventoryRarityFilter, toggleAllInventoryRarityFilter, refreshAutoSalvagePanel, toggleAutoSalvageRarity } from './static-inventory-actions.mjs';
import { renderRarityFilterChips, isItemRarityVisible } from './static-inventory-filters.mjs';
import { openCraftItemPickerOverlay, closeCraftItemPickerOverlay, selectCraftPickerEquipment, selectCraftPickerInventoryItem } from './static-picker-dialog.mjs';
import { createJewelRangeTooltipHtml } from './static-jewel-details.mjs';
import { highlightSearchText } from './static-search-highlight.mjs';
import { showCurrencyCardTooltip } from './static-currency-tooltip.mjs';
import { performUpdateStaticUI } from './static-frame-render.mjs';
import { getCraftTargetControlsHtml, getCraftEmptyStateHtml } from './static-craft-panel.mjs';
import { refuseCraftPickerItem } from './static-picker-frame.mjs';

/** Static screen assembly owns only presentation lifetime; saved state stays with the game domains. */
export function createStaticUiView(deps) {
    const runtime = { deps, state: { lastReachableSignature: '', craftPickerKind: null, pickerDialog: null }, owner: deps.game, active: true, handlers: {} };
    const handlers = { getCraftOrbUseState, updateSearchFilter, resetSearchFilter, toggleInventoryRarityFilter, toggleAllInventoryRarityFilter, renderRarityFilterChips, refreshAutoSalvagePanel, toggleAutoSalvageRarity, bulkSalvageEquipBySearch, openCraftItemPickerOverlay, closeCraftItemPickerOverlay, selectCraftPickerEquipment, selectCraftPickerInventoryItem, createJewelRangeTooltipHtml, isItemRarityVisible, getGemSearchText, isGemLibraryMatchVisible, highlightSearchText, showCurrencyCardTooltip, performUpdateStaticUI, getMobileCraftCurrencyUseState, getCraftTargetControlsHtml, getCraftEmptyStateHtml, refuseCraftPickerItem };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    const api = {};
    for (const name of ["getCraftOrbUseState","updateSearchFilter","resetSearchFilter","toggleInventoryRarityFilter","toggleAllInventoryRarityFilter","renderRarityFilterChips","refreshAutoSalvagePanel","toggleAutoSalvageRarity","bulkSalvageEquipBySearch","openCraftItemPickerOverlay","closeCraftItemPickerOverlay","selectCraftPickerEquipment","selectCraftPickerInventoryItem","createJewelRangeTooltipHtml","isItemRarityVisible","getGemSearchText","isGemLibraryMatchVisible","highlightSearchText","showCurrencyCardTooltip","performUpdateStaticUI"]) {
        api[name] = (...args) => { if (syncOwner(runtime)) return runtime.handlers[name](...args); };
    }
    api.dispose = () => {
        if (!runtime.active) return;
        runtime.active = false;
        runtime.handlers.closeCraftItemPickerOverlay();
    };
    return Object.freeze(api);
}

function syncOwner(runtime) {
    if (!runtime.active) return false;
    if (runtime.owner !== runtime.deps.game) {
        runtime.owner = runtime.deps.game;
        runtime.state.lastReachableSignature = '';
        runtime.handlers.closeCraftItemPickerOverlay();
    }
    return true;
}
