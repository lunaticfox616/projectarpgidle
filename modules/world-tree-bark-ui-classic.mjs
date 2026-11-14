import { createWorldTreeBarkView } from './ui/world-tree-bark-view.mjs';
const worldTreeBarkUi = createWorldTreeBarkView({
    get WORLD_TREE_BARK() { return WORLD_TREE_BARK; },
    get _t() { return _t; },
    get getWorldTreeBarkReach() { return getWorldTreeBarkReach; },
    get game() { return window.GameModules.state.game; },
    get worldTreeBark() { return worldTreeBark; },
    get PINNACLE_FIRST_KILL_JOURNALS() { return PINNACLE_FIRST_KILL_JOURNALS; },
    get formatRecordDuration() { return formatRecordDuration; },
    get document() { return document; },
    get updateGamePanelMarkup() { return updateGamePanelMarkup; },
    get selectionDialog() { return selectionDialog; },
    get playerStatCache() { return playerStatCache; },
    get loopSettlementUi() { return loopSettlementUi; },
    get updateStaticUI() { return updateStaticUI; },
    get queueImportantSave() { return queueImportantSave; },
    get addLog() { return addLog; },
    get escapeHTML() { return escapeHTML; },
    get getItemStatToneColor() { return getItemStatToneColor; },
    get getWorldTreeBarkLayers() { return getWorldTreeBarkLayers; },
    get isWorldTreeBarkZone() { return isWorldTreeBarkZone; },
    get window() { return window; }
});
safeExposeGlobals({ worldTreeBarkUi });
