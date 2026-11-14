import { createLoopClimbView } from './ui/loop-climb-view.mjs';
const loopClimbUi = createLoopClimbView({
    get game() { return window.GameModules.state.game; },
    get getSeasonAbyssDepthCap() { return getSeasonAbyssDepthCap; },
    get hasCurrentLoopChaosRequirementClear() { return hasCurrentLoopChaosRequirementClear; },
    get _t() { return _t; },
    get LOOP_GATE_ALT_START_SEASON() { return LOOP_GATE_ALT_START_SEASON; },
    get hasCurrentLoopCosmosRequirementClear() { return hasCurrentLoopCosmosRequirementClear; },
    get LOOP_GATE_ALT_COSMOS_PLANET_NAME() { return LOOP_GATE_ALT_COSMOS_PLANET_NAME; },
    get loopSettlementUi() { return loopSettlementUi; },
    get EXPLORATION_REGIONS() { return EXPLORATION_REGIONS; },
    get LOOP_DEEP_STATS() { return LOOP_DEEP_STATS; },
    get contentUnlockUi() { return contentUnlockUi; },
    get getItemStatToneColor() { return getItemStatToneColor; },
    get formatLoopDeepValue() { return formatLoopDeepValue; },
    get getLoopDeepStatCost() { return getLoopDeepStatCost; },
    get document() { return document; },
    get hasCurrentLoopAbyssRequirementClear() { return hasCurrentLoopAbyssRequirementClear; },
    get hasCurrentLoopChaos20Clear() { return hasCurrentLoopChaos20Clear; },
    get updateGamePanelMarkup() { return updateGamePanelMarkup; },
    get escapeHTML() { return escapeHTML; }
});
safeExposeGlobals({ loopClimbUi });
