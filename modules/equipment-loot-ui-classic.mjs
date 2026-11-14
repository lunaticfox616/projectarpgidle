import { createEquipmentLootView } from './ui/equipment-loot-view.mjs';

// Compatibility entry until the application composes this view and its callers directly.
const equipmentLootUi = createEquipmentLootView({
    get EQUIPMENT_DROP_SLOTS() { return EQUIPMENT_DROP_SLOTS; },
    get ITEM_PICKUP_PRESETS() { return ITEM_PICKUP_PRESETS; },
    get ITEM_RARITY_LABELS() { return ITEM_RARITY_LABELS; },
    get WEAPON_CATEGORIES() { return WEAPON_CATEGORIES; },
    get _t() { return _t; },
    get document() { return document; },
    get equipmentLootPolicy() { return window.GameModules.equipmentLootPolicy; },
    get escapeHTML() { return escapeHTML; },
    get game() { return window.GameModules.state.game; },
    get getItemDisplayName() { return getItemDisplayName; },
    get getItemSlotDisplayLabel() { return getItemSlotDisplayLabel; },
    get getRarityColor() { return getRarityColor; },
    get getZone() { return getZone; },
    get queueImportantSave() { return queueImportantSave; },
    get registerCombatLogItemSnapshot() { return registerCombatLogItemSnapshot; },
    get showCombatLogItemTooltip() { return showCombatLogItemTooltip; }
});
safeExposeGlobals({ equipmentLootUi });
