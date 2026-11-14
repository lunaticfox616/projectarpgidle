import { createGardenOilsView } from './ui/garden-oils-view.mjs';

// Transitional classic API; remove when the application supplies this view directly.
const gardenOilsUi = createGardenOilsView({
    get GARDEN_OILS() { return GARDEN_OILS; },
    get _t() { return _t; },
    get addLog() { return addLog; },
    get escapeHTML() { return escapeHTML; },
    get formatValue() { return formatValue; },
    get game() { return window.GameModules.state.game; },
    get gardenOils() { return gardenOils; },
    get getItemDisplayName() { return getItemDisplayName; },
    get getSelectedCraftItem() { return getSelectedCraftItem; },
    get getStatName() { return getStatName; },
    get pickParticle() { return pickParticle; },
    get queueImportantSave() { return queueImportantSave; },
    get requestGameConfirmation() { return requestGameConfirmation; },
    get selectForCrafting() { return selectForCrafting; },
    get selectionDialog() { return selectionDialog; },
    get updateStaticUI() { return updateStaticUI; },
    get withObjectParticle() { return withObjectParticle; },
    get withSubjectParticle() { return withSubjectParticle; }
});
safeExposeGlobals({ gardenOilsUi });
