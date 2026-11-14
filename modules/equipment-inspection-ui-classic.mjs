import { createEquipmentInspectionView } from './ui/equipment-inspection-view.mjs';
const equipmentInspectionUi = createEquipmentInspectionView({
    get document() { return document; },
    get showItemTooltip() { return showItemTooltip; },
    get equipmentInventoryGridRuntime() { return equipmentInventoryGridRuntime; },
    get game() { return window.GameModules.state.game; },
    get cachedTooltipStats() { return window.GameModules.uiRuntime.stats.snapshot(); },
    get itemTooltipComparisonScheduler() { return window.GameModules.tooltipView.comparison; },
    get equipmentWindowUi() { return equipmentWindowUi; },
    get _t() { return _t; },
    get getDualSlotDisplayLabel() { return getDualSlotDisplayLabel; },
    get levelProgressionUi() { return levelProgressionUi; },
    get Date() { return Date; }
});
safeExposeGlobals({ equipmentInspectionUi });
