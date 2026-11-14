import { windowClearTimeout, windowMatchMedia, windowSetTimeout } from './browser/window-methods.mjs';
import { createWorldMapView } from './ui/world-map-view.mjs';
const worldMapUi = createWorldMapView({
    get WORLD_MAP() { return WORLD_MAP; },
    get document() { return document; },
    get game() { return window.GameModules.state.game; },
    get STORY_ACTS() { return STORY_ACTS; },
    get _t() { return _t; },
    get formatStoryActLabel() { return formatStoryActLabel; },
    get EXPLORATION_REGIONS() { return EXPLORATION_REGIONS; },
    get escapeHTML() { return escapeHTML; },
    get playUiFeedbackSound() { return playUiFeedbackSound; },
    get matchMedia() { return typeof matchMedia === 'undefined' ? undefined : windowMatchMedia; },
    get clearTimeout() { return windowClearTimeout; },
    get setTimeout() { return windowSetTimeout; },
    get worldMapBrief() { return worldMapBrief; },
    get atlasSheetUi() { return atlasSheetUi; },
    get atlas() { return atlas; },
    get atlasUi() { return atlasUi; },
    get ATLAS() { return ATLAS; },
    get explorationAtlasUi() { return explorationAtlasUi; }
});
safeExposeGlobals({ worldMapUi });
