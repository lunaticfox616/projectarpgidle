import { createAtlasEndgameView } from './ui/atlas-endgame-view.mjs';
const atlasEndgameUi = createAtlasEndgameView({
    get atlasUi() { return atlasUi; },
    get document() { return document; },
    get atlasEndgame() { return atlasEndgame; },
    get atlasRun() { return atlasRun; },
    get addLog() { return addLog; },
    get escapeHTML() { return escapeHTML; },
    get queueImportantSave() { return queueImportantSave; },
    get switchTab() { return switchTab; },
    get _t() { return _t; },
    get atlas() { return atlas; },
    get game() { return window.GameModules.state.game; },
    get ATLAS() { return ATLAS; },
    get contentUnlockUi() { return contentUnlockUi; },
    get ORB_DB() { return ORB_DB; },
    get buildMapPowerEstimateHtml() { return buildMapPowerEstimateHtml; },
    get atlasMaps() { return atlasMaps; },
    get ATLAS_ENDGAME() { return ATLAS_ENDGAME; },
    get window() { return window; }
});
safeExposeGlobals({ atlasEndgameUi });
