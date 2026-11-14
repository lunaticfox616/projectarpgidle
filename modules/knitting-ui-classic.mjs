import { createKnittingView } from './ui/knitting-view.mjs';

// Transitional classic API; remove when the application supplies this view directly.
const knittingUi = createKnittingView({
    get ORB_DB() { return ORB_DB; },
    get STUMP_BOX_COLORS() { return STUMP_BOX_COLORS; },
    get _t() { return _t; },
    get addLog() { return addLog; },
    get console() { return console; },
    get contentProgression() { return contentProgression; },
    get document() { return document; },
    get escapeHTML() { return escapeHTML; },
    get game() { return window.GameModules.state.game; },
    get knitting() { return knitting; },
    get knittingRewards() { return window.GameModules.knittingRewardRules; },
    get notifyCurrencyAcquisition() { return notifyCurrencyAcquisition; },
    get queueImportantSave() { return queueImportantSave; },
    get recordEquipmentAcquisition() { return recordEquipmentAcquisition; },
    get showGameToast() { return showGameToast; },
    get updateStaticUI() { return updateStaticUI; },
    get window() { return window; }
});
safeExposeGlobals({ knittingUi });
