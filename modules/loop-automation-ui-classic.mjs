import { windowClearInterval, windowSetInterval } from './browser/window-methods.mjs';
import { createLoopAutomationView } from './ui/loop-automation-view.mjs';
const loopAutomationUi = createLoopAutomationView({
    get clearInterval() { return windowClearInterval; },
    get game() { return window.GameModules.state.game; },
    get PLAYER_CLASS_DEFS() { return PLAYER_CLASS_DEFS; },
    get requestLoopHeroSelection() { return requestLoopHeroSelection; },
    get chooseLoopHero() { return chooseLoopHero; },
    get applyHeroSelection() { return applyHeroSelection; },
    get basicSkills() { return basicSkills; },
    get applyLoopHeroSelection() { return applyLoopHeroSelection; },
    get confirmLoopReady() { return confirmLoopReady; },
    get getAvailableLoopAdvancePaths() { return getAvailableLoopAdvancePaths; },
    get chooseLoopAdvance() { return chooseLoopAdvance; },
    get chooseLoopAdvancePath() { return chooseLoopAdvancePath; },
    get Date() { return Date; },
    get _t() { return _t; },
    get document() { return document; },
    get queueImportantSave() { return queueImportantSave; },
    get loopSettlementUi() { return loopSettlementUi; },
    get gameplayStarted() { return gameplayStarted; },
    get isStartupOverlayOpen() { return isStartupOverlayOpen; },
    get isLoadingOverlayOpen() { return isLoadingOverlayOpen; },
    get isRewardOpen() { return isRewardOpen; },
    get worldTreeBarkUi() { return worldTreeBarkUi; },
    get getHeldGearLoopBlockReason() { return getHeldGearLoopBlockReason; },
    get setInterval() { return typeof setInterval === 'undefined' ? undefined : windowSetInterval; }
});
safeExposeGlobals({ loopAutomationUi });
