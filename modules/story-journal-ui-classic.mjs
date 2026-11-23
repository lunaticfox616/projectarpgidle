import { createStoryScenes } from './domain/story-scenes.mjs';
import { createStoryJournalView } from './ui/story-journal-view.mjs';

// Legacy consumers retain one object until final application composition replaces these dependency ports.
const storyJournalUi = createStoryJournalView({
    rules: createStoryScenes({
        get acts() { return STORY_ACTS; },
        get scenes() { return STORY_JOURNAL_SCENES; },
        get bridges() { return typeof STORY_BRIDGE_SCENES === 'undefined' ? undefined : STORY_BRIDGE_SCENES; }
    }),
    get game() { return window.GameModules.state.game; },
    get document() { return document; },
    get _t() { return _t; },
    get escapeHTML() { return escapeHTML; },
    get queueImportantSave() { return queueImportantSave; },
    get queueTutorialNotice() { return queueTutorialNotice; },
    get tutorialQueue() { return tutorialQueue; },
    get JOURNAL_DB() { return JOURNAL_DB; },
    get STORY_JOURNAL_SCENES() { return STORY_JOURNAL_SCENES; },
    get STORY_SCENE_QUOTES() { return typeof STORY_SCENE_QUOTES === 'undefined' ? undefined : STORY_SCENE_QUOTES; },
    get hasCurrentLoopChaosAccess() { return typeof hasCurrentLoopChaosAccess === 'undefined' ? undefined : hasCurrentLoopChaosAccess; },
    get getCosmosCapstoneProgress() { return window.getCosmosCapstoneProgress; },
    get ABYSS_START_ZONE_ID() { return ABYSS_START_ZONE_ID; },
    get contentProgression() { return contentProgression; },
    get CONTENT_UNLOCK_CATALOG() { return CONTENT_UNLOCK_CATALOG; },
    get switchTab() { return switchTab; },
    get switchMapSubtab() { return switchMapSubtab; },
    get switchMapExploreSubtab() { return switchMapExploreSubtab; }
});
window.GameModules.storyJournalView = storyJournalUi;
safeExposeGlobals({ storyJournalUi });
