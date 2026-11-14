import { createStumpHarvestView } from './ui/stump-harvest-view.mjs';
const stumpHarvestUi = createStumpHarvestView({
    get escapeHTML() { return escapeHTML; },
    get STUMP_BOX_COLORS() { return STUMP_BOX_COLORS; },
    get _t() { return _t; },
    get JOURNAL_DB() { return JOURNAL_DB; },
    get stumpBox() { return stumpBox; },
    get game() { return window.GameModules.state.game; },
    get STUMP_BOX_UNLOCKS() { return STUMP_BOX_UNLOCKS; },
    get STUMP_BOX_HARVEST() { return STUMP_BOX_HARVEST; },
    get selectionDialog() { return selectionDialog; },
    get queueImportantSave() { return queueImportantSave; },
    get stumpBoxUi() { return stumpBoxUi; },
    get queueTutorialNotice() { return queueTutorialNotice; },
    get stumpCube() { return stumpCube; },
    get addLog() { return addLog; },
    get showGameToast() { return showGameToast; },
    get stumpRipeningUi() { return stumpRipeningUi; },
    get STUMP_BOX_STAGES() { return STUMP_BOX_STAGES; },
    get STUMP_BOX_GRAFT() { return STUMP_BOX_GRAFT; },
    get window() { return typeof window === 'undefined' ? undefined : window; }
});
safeExposeGlobals({ stumpHarvestUi });
