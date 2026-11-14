import { createMemoryDungeonView } from './ui/memory-dungeon-view.mjs';

// Transitional classic API; remove when the application supplies this view directly.
const memoryDungeonUi = createMemoryDungeonView({
    get ATLAS() { return ATLAS; },
    get MEMORY_DUNGEON() { return MEMORY_DUNGEON; },
    get ORB_DB() { return ORB_DB; },
    get _t() { return _t; },
    get addLog() { return addLog; },
    get atlas() { return atlas; },
    get atlasRun() { return atlasRun; },
    get atlasUi() { return atlasUi; },
    get bossVariantsUi() { return bossVariantsUi; },
    get buildMapPowerEstimateHtml() { return buildMapPowerEstimateHtml; },
    get document() { return document; },
    get escapeHTML() { return escapeHTML; },
    get game() { return window.GameModules.state.game; },
    get getItemDisplayName() { return getItemDisplayName; },
    get getStyledOrbName() { return getStyledOrbName; },
    get memoryDungeon() { return memoryDungeon; },
    get queueImportantSave() { return queueImportantSave; },
    get switchTab() { return switchTab; },
    get window() { return window; }
});
safeExposeGlobals({ memoryDungeonUi });
