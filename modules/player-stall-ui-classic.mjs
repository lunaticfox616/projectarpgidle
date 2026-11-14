import { createPlayerStallView } from './ui/player-stall-view.mjs';
const playerStallUi = createPlayerStallView({
    get shopView() { return shopView; },
    get game() { return window.GameModules.state.game; },
    get playerStall() { return playerStall; },
    get document() { return document; },
    get uiDisplay() { return uiDisplay; },
    get _t() { return _t; },
    get PLAYER_STALL_RULES() { return PLAYER_STALL_RULES; },
    get itemAppraisal() { return itemAppraisal; },
    get Date() { return Date; },
    get ensureCraftSelectionValid() { return ensureCraftSelectionValid; },
    get saveGame() { return saveGame; },
    get updateStaticUI() { return updateStaticUI; },
    get formatCurrencyCosts() { return formatCurrencyCosts; },
    get escapeHTML() { return escapeHTML; },
    get addLog() { return addLog; },
    get ORB_DB() { return ORB_DB; },
    get getEquipmentInventoryFootprint() { return getEquipmentInventoryFootprint; },
    get getEquipmentGridVisualAsset() { return getEquipmentGridVisualAsset; },
    get PLAYER_STALL_CUSTOMERS() { return PLAYER_STALL_CUSTOMERS; },
    get i18n() { return i18n; },
    get backgroundCombatRuntime() { return backgroundCombatRuntime; },
    get marketUi() { return marketUi; },
    get formatRecordDuration() { return formatRecordDuration; },
    get selectionDialog() { return selectionDialog; },
    get equipmentInventoryGridRuntime() { return equipmentInventoryGridRuntime; }
});
safeExposeGlobals({ playerStallUi,
    stallOutcomeOf: playerStallUi.stallOutcomeOf
});
