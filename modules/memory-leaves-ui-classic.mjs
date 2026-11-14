import { createMemoryLeavesView } from './ui/memory-leaves-view.mjs';

// Transitional classic API; remove when the application supplies this view directly.
const memoryLeavesUi = createMemoryLeavesView({
    get ATLAS() { return ATLAS; },
    get _t() { return _t; },
    get document() { return document; },
    get escapeHTML() { return escapeHTML; },
    get game() { return window.GameModules.state.game; },
    get memoryLeaves() { return memoryLeaves; },
    get queueImportantSave() { return queueImportantSave; },
    get renderPixelIcon() { return renderPixelIcon; },
    get showGameToast() { return showGameToast; },
    get storyJournalUi() { return storyJournalUi; },
    get window() { return window; }
});
safeExposeGlobals({ memoryLeavesUi });
