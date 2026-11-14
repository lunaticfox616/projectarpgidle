import { createEmberCorruptionView } from './ui/ember-corruption-view.mjs';
const emberCorruptionUi = createEmberCorruptionView({
    get game() { return window.GameModules.state.game; },
    get _t() { return _t; },
    get emberCorruption() { return emberCorruption; },
    get getSelectedCraftItem() { return getSelectedCraftItem; },
    get addLog() { return addLog; },
    get requestGameConfirmation() { return requestGameConfirmation; },
    get craftingResultLedger() { return craftingResultLedger; },
    get updateStaticUI() { return updateStaticUI; },
    get queueImportantSave() { return queueImportantSave; },
    get destroySelectedCraftItem() { return destroySelectedCraftItem; },
    get stumpBox() { return typeof stumpBox === 'undefined' ? undefined : stumpBox; },
    get EMBER_CORRUPTION_TONE() { return EMBER_CORRUPTION_TONE; },
    get escapeHTML() { return escapeHTML; },
    get getStatName() { return getStatName; },
    get formatValue() { return formatValue; }
});
safeExposeGlobals({ emberCorruptionUi });
