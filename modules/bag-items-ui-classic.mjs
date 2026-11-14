import { createBagItemsView } from './ui/bag-items-view.mjs';
const bagItemsUi = createBagItemsView({
    get game() { return window.GameModules.state.game; },
    get bagItems() { return bagItems; },
    get getRarityColor() { return getRarityColor; },
    get _t() { return _t; },
    get escapeHTML() { return escapeHTML; },
    get coreItems() { return coreItems; },
    get presentItemTooltip() { return presentItemTooltip; },
    get addLog() { return addLog; },
    get playUiFeedbackSound() { return playUiFeedbackSound; },
    get pickParticle() { return pickParticle; },
    get hideItemTooltip() { return hideItemTooltip; },
    get updateStaticUI() { return updateStaticUI; },
    get colonyWardsUi() { return colonyWardsUi; },
    get window() { return window; }
});
safeExposeGlobals({ bagItemsUi });
