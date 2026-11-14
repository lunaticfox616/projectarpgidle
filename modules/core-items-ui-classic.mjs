import { createCoreItemsView } from './ui/core-items-view.mjs';
const coreItemsUi = createCoreItemsView({
    get _t() { return _t; },
    get coreItems() { return coreItems; },
    get game() { return window.GameModules.state.game; },
    get contentProgression() { return contentProgression; },
    get escapeHTML() { return escapeHTML; }
});
safeExposeGlobals({ coreItemsUi });
