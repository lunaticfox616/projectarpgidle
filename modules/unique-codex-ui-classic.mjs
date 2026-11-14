import { createUniqueCodexView } from './ui/unique-codex-view.mjs';

// Compatibility entry until the application composes this view and its callers directly.
const uniqueCodexUi = createUniqueCodexView({
    get window() { return window; },
    get UNIQUE_DB() { return UNIQUE_DB; },
    get _t() { return _t; },
    get document() { return document; },
    get escapeHTML() { return escapeHTML; },
    get formatSignedValue() { return formatSignedValue; },
    get formatValue() { return formatValue; },
    get game() { return window.GameModules.state.game; },
    get getCodexBonusPctFromCount() { return getCodexBonusPctFromCount; },
    get getCodexSlotOrder() { return getCodexSlotOrder; },
    get getEquipmentGridVisualAsset() { return getEquipmentGridVisualAsset; },
    get getItemSlotDisplayLabel() { return getItemSlotDisplayLabel; },
    get getStatName() { return getStatName; },
    get getTierBadgeHtml() { return getTierBadgeHtml; },
    get getUniqueEntryVisualAsset() { return getUniqueEntryVisualAsset; },
    get getUniqueStatRollRange() { return getUniqueStatRollRange; },
    get memoryLeavesUi() { return memoryLeavesUi; },
    get selectionDialog() { return selectionDialog; },
    get statToneText() { return statToneText; },
    get uniqueHuntRuntime() { return uniqueHuntRuntime; },
    get uniqueHuntUi() { return uniqueHuntUi; }
});
safeExposeGlobals({ uniqueCodexUi });

