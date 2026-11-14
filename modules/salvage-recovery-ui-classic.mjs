import { createSalvageRecoveryView } from './ui/salvage-recovery-view.mjs';

// Compatibility entry until the application composes this view and its callers directly.
const salvageRecoveryUi = createSalvageRecoveryView({
    get game() { return window.GameModules.state.game; },
    get ITEM_RARITY_LABELS() { return ITEM_RARITY_LABELS; },
    get _t() { return _t; },
    get addLog() { return addLog; },
    get document() { return document; },
    get escapeHTML() { return escapeHTML; },
    get getCurrencyInfo() { return getCurrencyInfo; },
    get getEquipmentGridVisualAsset() { return getEquipmentGridVisualAsset; },
    get getEquipmentInventoryFootprint() { return getEquipmentInventoryFootprint; },
    get getItemDisplayName() { return getItemDisplayName; },
    get getItemSlotDisplayLabel() { return getItemSlotDisplayLabel; },
    get getStyledOrbName() { return getStyledOrbName; },
    get hideItemTooltip() { return hideItemTooltip; },
    get queueImportantSave() { return queueImportantSave; },
    get salvageRecoveryRuntime() { return salvageRecoveryRuntime; },
    get showItemTooltip() { return showItemTooltip; },
    get updateStaticUI() { return updateStaticUI; },
    get window() { return window; }
});
safeExposeGlobals({ salvageRecoveryUi });
