import { windowCancelAnimationFrame, windowRequestAnimationFrame } from './browser/window-methods.mjs';
import { createAtlasSheetView } from './ui/atlas-sheet-view.mjs';
const atlasSheetUi = createAtlasSheetView({
    get WORLD_MAP() { return WORLD_MAP; },
    get atlas() { return atlas; },
    get game() { return window.GameModules.state.game; },
    get Date() { return Date; },
    get playUiFeedbackSound() { return playUiFeedbackSound; },
    get document() { return document; },
    get cancelAnimationFrame() { return windowCancelAnimationFrame; },
    get requestAnimationFrame() { return windowRequestAnimationFrame; },
    get atlasUi() { return atlasUi; },
    get worldMapUi() { return worldMapUi; },
    get escapeHTML() { return escapeHTML; },
    get _t() { return _t; },
    get ATLAS() { return ATLAS; },
    get atlasEndgame() { return atlasEndgame; },
    get atlasPassives() { return atlasPassives; },
    get lootOmens() { return lootOmens; },
    get ACT_EXPLORATION_MAPS() { return ACT_EXPLORATION_MAPS; }
});
safeExposeGlobals({ atlasSheetUi });
