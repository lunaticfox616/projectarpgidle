import { createAtlasPassiveView } from './ui/atlas-passives-view.mjs';
const atlasPassivesUi = createAtlasPassiveView({
    get document() { return document; },
    get ATLAS_PASSIVES() { return ATLAS_PASSIVES; },
    get atlasChartArt() { return atlasChartArt; },
    get hideInfoTooltip() { return hideInfoTooltip; },
    get game() { return window.GameModules.state.game; },
    get atlasPassives() { return atlasPassives; },
    get addLog() { return addLog; },
    get atlasUi() { return atlasUi; },
    get atlas() { return atlas; },
    get queueImportantSave() { return queueImportantSave; },
    get escapeHTML() { return escapeHTML; },
    get _t() { return _t; },
    get atlasSheetUi() { return atlasSheetUi; }
});
safeExposeGlobals({ atlasPassivesUi });
