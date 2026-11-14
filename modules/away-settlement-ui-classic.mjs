import { windowCancelAnimationFrame, windowClearTimeout, windowRequestAnimationFrame, windowSetTimeout } from './browser/window-methods.mjs';
import { AwaySettlement } from './application/away-settlement.mjs';
import { AwaySettlementView } from './ui/away-settlement-view.mjs';
import { calculateBackgroundProgressMs, getBackgroundCombatSignature } from './domain/away-progress.mjs';
import { backgroundAtlasGains } from './application/away-rewards.mjs';
import { createReplayScheduler } from './browser/replay-scheduler.mjs';

// Retained script-slot API for legacy account/visibility consumers; native owners contain all behavior.
const owner=window.GameModules.state;
const paint=createReplayScheduler({setTimeout: windowSetTimeout,clearTimeout: windowClearTimeout,
    requestAnimationFrame:typeof requestAnimationFrame === 'function' ? windowRequestAnimationFrame : undefined,
    cancelAnimationFrame:typeof cancelAnimationFrame === 'function' ? windowCancelAnimationFrame : undefined});
const deps={
    get ITEM_RARITY_LABELS() { return ITEM_RARITY_LABELS; },
    get OFFLINE_PROJECTION() { return OFFLINE_PROJECTION; },
    get ORB_DB() { return ORB_DB; },
    get _t() { return _t; },
    get actExplorationProgress() { return actExplorationProgress; },
    get actExplorationState() { return actExplorationState; },
    get actExplorationUi() { return actExplorationUi; },
    get actTitleCard() { return typeof actTitleCard === 'undefined' ? undefined : actTitleCard; },
    get addLog() { return addLog; },
    get backgroundCombatRuntime() { return backgroundCombatRuntime; },
    get cloneBackgroundCombatState() { return cloneBackgroundCombatState; },
    get console() { return console; },
    get contentUnlockUi() { return contentUnlockUi; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get equipmentLootPolicy() { return equipmentLootPolicy; },
    get equipmentLootUi() { return equipmentLootUi; },
    get escapeHTML() { return escapeHTML; },
    get formatNumberKR() { return formatNumberKR; },
    get game() { return owner.game; },
    get gameplayStarted() { return typeof gameplayStarted === 'undefined' ? undefined : gameplayStarted; },
    get getBackgroundTotalExperience() { return getBackgroundTotalExperience; },
    get getCurrencyInfo() { return getCurrencyInfo; },
    get getCurrencyTone() { return getCurrencyTone; },
    get getLocalSaveStatus() { return getLocalSaveStatus; },
    get getOfflineProgressConfig() { return getOfflineProgressConfig; },
    get getRarityColor() { return getRarityColor; },
    get getSaveSlot() { return getSaveSlot; },
    get getZone() { return getZone; },
    get ghostDuelStage() { return typeof ghostDuelStage === 'undefined' ? undefined : ghostDuelStage; },
    get isLoadingOverlayOpen() { return typeof isLoadingOverlayOpen === 'undefined' ? undefined : isLoadingOverlayOpen; },
    get isLoopHeroSelectOpen() { return typeof isLoopHeroSelectOpen === 'undefined' ? undefined : isLoopHeroSelectOpen; },
    get isPauseSettingOverlayOpen() { return isPauseSettingOverlayOpen; },
    get isRewardOpen() { return typeof isRewardOpen === 'undefined' ? undefined : isRewardOpen; },
    get isStartupOverlayOpen() { return isStartupOverlayOpen; },
    get isTutorialPausingCombat() { return isTutorialPausingCombat; },
    get knitting() { return knitting; },
    get knittingUi() { return knittingUi; },
    get levelProgression() { return levelProgression; },
    get lootMoments() { return lootMoments; },
    get memoryLeaves() { return typeof memoryLeaves === 'undefined' ? undefined : memoryLeaves; },
    get mergeDefaults() { return mergeDefaults; },
    get performance() { return performance; },
    get persistLocalSave() { return persistLocalSave; },
    get renderBattlefield() { return typeof renderBattlefield === 'undefined' ? undefined : renderBattlefield; },
    get renderPixelIcon() { return renderPixelIcon; },
    get resizeCanvas() { return typeof resizeCanvas === 'undefined' ? undefined : resizeCanvas; },
    get restoreCombatRuntime() { return restoreCombatRuntime; },
    get scheduleStableResize() { return typeof scheduleStableResize === 'undefined' ? undefined : scheduleStableResize; },
    get setBattleFxSuppressed() { return setBattleFxSuppressed; },
    get sideEncounterUi() { return sideEncounterUi; },
    get simulateBackgroundCombatChunked() { return simulateBackgroundCombatChunked; },
    get storyJournalUi() { return typeof storyJournalUi === 'undefined' ? undefined : storyJournalUi; },
    get syncBattleTabLayout() { return typeof syncBattleTabLayout === 'undefined' ? undefined : syncBattleTabLayout; },
    get updateStaticUI() { return typeof updateStaticUI === 'undefined' ? undefined : updateStaticUI; },
    get weaponMastery() { return typeof weaponMastery === 'undefined' ? undefined : weaponMastery; },
    get weaponMasteryUi() { return typeof weaponMasteryUi === 'undefined' ? undefined : weaponMasteryUi; },
    get window() { return window; },
    get yieldTutorialCardToResult() { return typeof yieldTutorialCardToResult === 'undefined' ? undefined : yieldTutorialCardToResult; },
    waitFrame:()=>paint.waitFrame(),disposePaint:()=>paint.dispose()
};
const view=new AwaySettlementView(deps);
const settlement=new AwaySettlement(owner,deps,view);
window.GameModules.awaySettlement=settlement;
safeExposeGlobals({calculateBackgroundProgressMs,getBackgroundCombatSignature,
    isForegroundGameplayPausedForBackground:()=>settlement.pause.paused(),
    recordBackgroundCombatEntry:settlement.record.bind(settlement),
    getBackgroundAtlasGains:(before,after)=>backgroundAtlasGains(deps.memoryLeaves,before,after),
    requestFasterBackgroundCombat:settlement.faster.bind(settlement),
    shouldApplyBackgroundCombatResult:settlement.mayApply.bind(settlement),
    commitBackgroundCombat:settlement.commit.bind(settlement),
    startBackgroundCombatReturn:settlement.start.bind(settlement),
    startOfflineCombatReturn:settlement.startOffline.bind(settlement),
    handleBackgroundVisibilityChange:settlement.visibility.bind(settlement)
});
