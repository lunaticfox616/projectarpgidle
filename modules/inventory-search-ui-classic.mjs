import { createInventorySearchView } from './ui/inventory-search-view.mjs';
import { getSearchTokens, matchSearchQuery } from './common/text.mjs';
const inventorySearchView = createInventorySearchView({
    get document() { return document; },
    get escapeHTML() { return escapeHTML; },
    get _t() { return _t; },
    get i18n() { return i18n; },
    get getStatName() { return getStatName; },
    get getItemSlotDisplayLabel() { return getItemSlotDisplayLabel; },
    get getWeaponCategoryName() { return getWeaponCategoryName; },
    get ITEM_RARITY_LABELS() { return ITEM_RARITY_LABELS; },
    get equipmentTriage() { return window.equipmentTriage; },
    get updateStaticUI() { return updateStaticUI; },
    get saveGame() { return typeof saveGame === 'undefined' ? undefined : saveGame; },
    get game() { return window.GameModules.state.game; }
});
safeExposeGlobals({
    getSearchTokens, matchSearchQuery,
    getEquipmentSearchText: inventorySearchView.getEquipmentSearchText,
    getSortedEquipmentInventoryRows: inventorySearchView.getSortedEquipmentInventoryRows,
    setEquipmentInventoryView: inventorySearchView.setEquipmentInventoryView,
    syncEquipmentMobilePane: inventorySearchView.syncEquipmentMobilePane,
    setEquipmentMobilePane: inventorySearchView.setEquipmentMobilePane,
    getSearchFilterState: inventorySearchView.getSearchFilterState,
    renderSearchSection: (...args) => inventorySearchView.renderSearchSection({
        containerId: args[0], key: args[1], placeholder: args[2],
        rowsHtml: args[3], emptyHtml: args[4], actionButtonsHtml: args[5]
    })
});
