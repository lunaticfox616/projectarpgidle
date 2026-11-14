import { windowCancelAnimationFrame, windowClearTimeout, windowRequestAnimationFrame, windowSetTimeout } from './browser/window-methods.mjs';
import { CombatReplay } from './combat/replay.mjs';
import { createReplayScheduler } from './browser/replay-scheduler.mjs';

const replay = new CombatReplay(window.GameModules.state, {
    get actExplorationProgress() { return actExplorationProgress; },
    get actExplorationState() { return actExplorationState; },
    captureCombatRuntime: function replayCallCaptureCombatRuntime(...args) { return captureCombatRuntime(...args); },
    clearBackgroundBuildMemo: function replayCallClearBackgroundBuildMemo(...args) { return clearBackgroundBuildMemo(...args); },
    get combatEquipmentStats() { return combatEquipmentStats; },
    coreLoop: function replayCallCoreLoop(...args) { return coreLoop(...args); },
    finishEncounterRun: function replayCallFinishEncounterRun(...args) { return finishEncounterRun(...args); },
    getCombatTime: function replayCallGetCombatTime(...args) { return getCombatTime(...args); },
    get getExpReq() { return getExpReq; },
    getPlayerStats: function replayCallGetPlayerStats(...args) { return getPlayerStats(...args); },
    getZone: function replayCallGetZone(...args) { return getZone(...args); },
    handleEnemyDeath: function replayCallHandleEnemyDeath(...args) { return handleEnemyDeath(...args); },
    handlePlayerDefeat: function replayCallHandlePlayerDefeat(...args) { return handlePlayerDefeat(...args); },
    get isCombatDecisionPending() { return isCombatDecisionPending; },
    get performance() { return performance; },
    get playerStatCache() { return playerStatCache; },
    restoreCombatRuntime: function replayCallRestoreCombatRuntime(...args) { return restoreCombatRuntime(...args); },
    startEncounterRun: function replayCallStartEncounterRun(...args) { return startEncounterRun(...args); },
    startMoving: function replayCallStartMoving(...args) { return startMoving(...args); },
    structuredClone: function cloneReplayRuntime(value) { return structuredClone(value); },
    rules: OFFLINE_PROJECTION,
    scheduler: createReplayScheduler({ setTimeout: windowSetTimeout, clearTimeout: windowClearTimeout,
        cancelAnimationFrame: typeof cancelAnimationFrame === 'function' ? windowCancelAnimationFrame : undefined,
        requestAnimationFrame: typeof requestAnimationFrame === 'function' ? windowRequestAnimationFrame : undefined })
});
// Remove these legacy entry names when the settlement UI and diagnostic consumers import the application instance.
safeExposeGlobals({
    cloneBackgroundCombatState: (...args) => replay.rules.cloneBackgroundCombatState(...args),
    getBackgroundTotalExperience: (...args) => replay.rules.getBackgroundTotalExperience(...args),
    updateBackgroundCombatMetrics: (...args) => replay.rules.updateBackgroundCombatMetrics(...args),
    createCombatReplay: (...args) => replay.createCombatReplay(...args),
    shouldStopBackgroundReplay: (...args) => replay.rules.shouldStopBackgroundReplay(...args),
    advanceCombatReplay: (...args) => replay.advanceCombatReplay(...args),
    finishCombatReplay: (...args) => replay.rules.finishCombatReplay(...args),
    simulateBackgroundCombat: (...args) => replay.simulateBackgroundCombat(...args),
    simulateBackgroundCombatChunked: (...args) => replay.simulateBackgroundCombatChunked(...args)
});
