import { windowCancelAnimationFrame, windowRequestAnimationFrame } from './browser/window-methods.mjs';
import { createAtlasBoardView } from './ui/atlas-board-view.mjs';
const atlasBoardUi = createAtlasBoardView({
    get cancelAnimationFrame() { return windowCancelAnimationFrame; },
    get requestAnimationFrame() { return windowRequestAnimationFrame; },
    get document() { return document; },
    get game() { return window.GameModules.state.game; },
    get atlasUi() { return atlasUi; },
    get queueImportantSave() { return queueImportantSave; },
    get atlas() { return atlas; },
    get atlasRun() { return atlasRun; },
    get addLog() { return addLog; },
    get atlasBoard() { return atlasBoard; },
    get Date() { return Date; },
    get awardCurrency() { return awardCurrency; },
    get switchTab() { return switchTab; },
    get _t() { return _t; },
    get getCurrencyInfo() { return getCurrencyInfo; },
    get escapeHTML() { return escapeHTML; },
    get ATLAS_BOARD() { return ATLAS_BOARD; }
});
safeExposeGlobals({ atlasBoardUi });
