import { getSearchFilterState, renderSearchSection } from './inventory-search-actions.mjs';
import { getEquipmentSearchText, getSortedEquipmentInventoryRows, setEquipmentInventoryView, syncEquipmentMobilePane, setEquipmentMobilePane } from './inventory-equipment-filters.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createInventorySearchView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { getSearchFilterState, renderSearchSection, getEquipmentSearchText, getSortedEquipmentInventoryRows, setEquipmentInventoryView, syncEquipmentMobilePane, setEquipmentMobilePane };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    runtime.api = Object.freeze({ ...runtime.handlers });

    return runtime.api;
}
