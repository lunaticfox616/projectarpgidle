import { createChronicleView } from './ui/chronicle-view.mjs';

// Transitional classic API; remove when the application supplies this view directly.
const chronicleUi = createChronicleView({
    get CHRONICLE() { return CHRONICLE; },
    get _t() { return _t; },
    get addLog() { return addLog; },
    get atlasUi() { return atlasUi; },
    get bossVariants() { return bossVariants; },
    get chronicle() { return chronicle; },
    get contentProgression() { return contentProgression; },
    get contentUnlockUi() { return contentUnlockUi; },
    get document() { return document; },
    get escapeHTML() { return escapeHTML; },
    get game() { return window.GameModules.state.game; },
    get memoryDungeon() { return memoryDungeon; },
    get memoryDungeonUi() { return memoryDungeonUi; },
    get stumpBoxUi() { return stumpBoxUi; },
    get switchTab() { return switchTab; },
    get uniqueCodexUi() { return uniqueCodexUi; },
    get window() { return window; }
});
safeExposeGlobals({ chronicleUi });
