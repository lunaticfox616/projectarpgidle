import { createAtlasPassiveView } from './ui/atlas-passives-view.mjs';
const atlasPassivesUi = createAtlasPassiveView({
    get game() { return window.GameModules.state.game; },
    get document() { return document; },
    get atlasPassives() { return atlasPassives; },
    get atlasUi() { return atlasUi; },
    get queueImportantSave() { return queueImportantSave; },
    get escapeHTML() { return escapeHTML; },
    get _t() { return _t; }
});
safeExposeGlobals({ atlasPassivesUi });
