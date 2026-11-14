import { createUniqueHuntView } from './ui/unique-hunt-view.mjs';

// Compatibility entry until the application composes this view and its callers directly.
const uniqueHuntUi = createUniqueHuntView({
    get ATLAS_ENDGAME() { return ATLAS_ENDGAME; },
    get SEASON_BOSS_ZONES() { return SEASON_BOSS_ZONES; },
    get _t() { return _t; },
    get atlasUi() { return atlasUi; },
    get document() { return document; },
    get escapeHTML() { return escapeHTML; },
    get game() { return window.GameModules.state.game; },
    get getUniqueEntryVisualAsset() { return getUniqueEntryVisualAsset; },
    get queueImportantSave() { return queueImportantSave; },
    get showGameToast() { return showGameToast; },
    get switchMapExploreSubtab() { return switchMapExploreSubtab; },
    get switchMapSubtab() { return switchMapSubtab; },
    get switchTab() { return switchTab; },
    get uniqueHuntRuntime() { return uniqueHuntRuntime; },
    get updateStaticUI() { return updateStaticUI; },
    get window() { return window; },
    get writeHtmlIfChanged() { return writeHtmlIfChanged; }
});
safeExposeGlobals({ uniqueHuntUi });

