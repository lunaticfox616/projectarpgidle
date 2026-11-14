import { createUnlockTreeView } from './ui/unlock-tree-view.mjs';
const unlockTabUi = createUnlockTreeView({
    get contentProgression() { return contentProgression; },
    get CONTENT_UNLOCK_SERIES() { return CONTENT_UNLOCK_SERIES; },
    get _t() { return _t; },
    get OFFLINE_PROGRESS_RECOGNITION_HOURS() { return OFFLINE_PROGRESS_RECOGNITION_HOURS; },
    get OFFLINE_PROGRESS_EFFICIENCY_RATES() { return OFFLINE_PROGRESS_EFFICIENCY_RATES; },
    get STUMP_BOX_NURSERY() { return STUMP_BOX_NURSERY; },
    get escapeHTML() { return escapeHTML; },
    get game() { return window.GameModules.state.game; },
    get contentUnlockUi() { return contentUnlockUi; },
    get CONTENT_UNLOCK_CATALOG() { return CONTENT_UNLOCK_CATALOG; },
    get CONTENT_UNLOCK_POINT_AWARDS() { return CONTENT_UNLOCK_POINT_AWARDS; },
    get STORY_LOOP_MILESTONES() { return STORY_LOOP_MILESTONES; },
    get speakerShortName() { return speakerShortName; },
    get EXPLORATION_REGIONS() { return EXPLORATION_REGIONS; },
    get window() { return window; },
    get document() { return document; },
    get i18n() { return i18n; },
    get captureUiDisclosureState() { return captureUiDisclosureState; },
    get restoreUiDisclosureState() { return restoreUiDisclosureState; },
    get saveGame() { return saveGame; },
    get uiDisplay() { return uiDisplay; },
    get ResizeObserver() { return ResizeObserver; },
    get CONTENT_UNLOCK_RAILS() { return CONTENT_UNLOCK_RAILS; }
});
const unlockBoard = unlockTabUi.unlockBoard;
safeExposeGlobals({ unlockTabUi, unlockBoard });
