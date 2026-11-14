import { createChaosInfusionView } from './ui/chaos-infusion-view.mjs';
const chaosInfusionUi = createChaosInfusionView({
    get isChaosInfuserUnlocked() { return isChaosInfuserUnlocked; },
    get _t() { return _t; },
    get selectForCrafting() { return selectForCrafting; },
    get selectionDialog() { return selectionDialog; },
    get getStatName() { return getStatName; },
    get formatValue() { return formatValue; },
    get game() { return window.GameModules.state.game; },
    get getChaosInfusionCost() { return getChaosInfusionCost; },
    get canPayCurrencyCosts() { return canPayCurrencyCosts; },
    get formatCurrencyCosts() { return formatCurrencyCosts; },
    get isChaosInfusionEligibleItem() { return isChaosInfusionEligibleItem; },
    get getChaosInfuserOptionsForItem() { return getChaosInfuserOptionsForItem; },
    get getSelectedCraftItem() { return getSelectedCraftItem; },
    get escapeHTML() { return escapeHTML; },
    get getItemSlotDisplayLabel() { return getItemSlotDisplayLabel; },
    get getItemDisplayName() { return getItemDisplayName; },
    get getItemExplicitOptionCount() { return getItemExplicitOptionCount; },
    get requestGameConfirmation() { return requestGameConfirmation; },
    get applyChaosInfusionToSelectedItem() { return applyChaosInfusionToSelectedItem; },
    get addLog() { return addLog; },
    get removeChaosInfusionFromSelectedItem() { return removeChaosInfusionFromSelectedItem; }
});
safeExposeGlobals({ chaosInfusionUi });
