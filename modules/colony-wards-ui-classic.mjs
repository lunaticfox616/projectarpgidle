import { createColonyWardsView } from './ui/colony-wards-view.mjs';
const colonyWardsUi = createColonyWardsView({
    get getEquipmentGridVisualAsset() { return getEquipmentGridVisualAsset; },
    get escapeHTML() { return escapeHTML; },
    get _t() { return _t; },
    get game() { return window.GameModules.state.game; },
    get colonyWards() { return colonyWards; },
    get addLog() { return addLog; },
    get assertBuildEditable() { return typeof assertBuildEditable === 'undefined' ? undefined : assertBuildEditable; },
    get updateStaticUI() { return updateStaticUI; },
    get queueImportantSave() { return queueImportantSave; },
    get switchTab() { return switchTab; },
    get switchItemSubtab() { return switchItemSubtab; },
    get getStatName() { return getStatName; },
    get formatValue() { return formatValue; },
    get COLONY_WARD_RULES() { return COLONY_WARD_RULES; },
    get COLONY_WARD_POOL() { return COLONY_WARD_POOL; }
});
safeExposeGlobals({ colonyWardsUi });
