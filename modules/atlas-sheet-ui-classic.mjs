import { createAtlasSheetView } from './ui/atlas-sheet-view.mjs';
const atlasSheetUi = createAtlasSheetView({
    get atlas() { return atlas; },
    get game() { return window.GameModules.state.game; },
    get Date() { return Date; },
    get playUiFeedbackSound() { return playUiFeedbackSound; },
    get document() { return document; },
    get atlasUi() { return atlasUi; },
    get worldMapUi() { return worldMapUi; },
    get escapeHTML() { return escapeHTML; },
    get _t() { return _t; },
    get ATLAS() { return ATLAS; },
    get renderPixelIcon() { return renderPixelIcon; }
});
safeExposeGlobals({ atlasSheetUi });
