import { createSapCatalystsView } from './ui/sap-catalysts-view.mjs';
const sapCatalystsUi = createSapCatalystsView({
    get game() { return window.GameModules.state.game; },
    get _t() { return _t; },
    get sapCatalysts() { return sapCatalysts; },
    get getSelectedCraftItem() { return getSelectedCraftItem; },
    get addLog() { return addLog; },
    get craftingResultLedger() { return craftingResultLedger; },
    get getItemQualityAttributeLabel() { return getItemQualityAttributeLabel; },
    get ORB_DB() { return ORB_DB; },
    get escapeHTML() { return escapeHTML; },
    get getItemDisplayName() { return getItemDisplayName; },
    get updateStaticUI() { return updateStaticUI; },
    get queueImportantSave() { return queueImportantSave; },
    get getItemQualityAttributeMode() { return getItemQualityAttributeMode; }
});
safeExposeGlobals({ sapCatalystsUi });
