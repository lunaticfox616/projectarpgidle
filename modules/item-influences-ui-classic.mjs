import { createItemInfluencesView } from './ui/item-influences-view.mjs';
const itemInfluencesUi = createItemInfluencesView({
    get itemInfluences() { return itemInfluences; },
    get escapeHTML() { return escapeHTML; },
    get _t() { return _t; },
    get ITEM_INFLUENCES() { return ITEM_INFLUENCES; },
    get game() { return window.GameModules.state.game; },
    get getSelectedCraftItem() { return getSelectedCraftItem; },
    get addLog() { return addLog; },
    get getItemDisplayName() { return getItemDisplayName; },
    get formatValue() { return formatValue; },
    get showGameToast() { return typeof showGameToast === 'undefined' ? undefined : showGameToast; },
    get SWAPPED_UNIQUE_META() { return SWAPPED_UNIQUE_META; },
    get getStatName() { return getStatName; }
});
safeExposeGlobals({ itemInfluencesUi });
