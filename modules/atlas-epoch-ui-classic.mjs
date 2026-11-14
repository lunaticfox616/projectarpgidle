import { createAtlasEpochView } from './ui/atlas-epoch-view.mjs';
const atlasEpochUi = createAtlasEpochView({
    get _t() { return _t; },
    get ORB_DB() { return ORB_DB; },
    get game() { return window.GameModules.state.game; },
    get atlasEpoch() { return atlasEpoch; },
    get addLog() { return addLog; },
    get requestGameConfirmation() { return requestGameConfirmation; },
    get atlas() { return atlas; },
    get queueImportantSave() { return queueImportantSave; },
    get atlasUi() { return atlasUi; },
    get document() { return document; },
    get escapeHTML() { return escapeHTML; },
    get ATLAS() { return ATLAS; },
    get hasCurrentLoopChaos20Clear() { return hasCurrentLoopChaos20Clear; },
    get atlasEndgame() { return atlasEndgame; },
    get ATLAS_PASSIVES() { return ATLAS_PASSIVES; }
});
safeExposeGlobals({ atlasEpochUi });
