import { createLoopReset } from './domain/loop-reset.mjs';
import { consumeDomainCommands } from './common/consume-commands.mjs';

const rules = createLoopReset({
    get startMoving() { return startMoving; },
    get OUTSIDE_CHAOS_ZONE_ID() { return OUTSIDE_CHAOS_ZONE_ID; },
    get getZone() { return getZone; },
    get _t() { return _t; },
    get getZoneExplorationPlan() { return getZoneExplorationPlan; },
    get startEncounterRun() { return startEncounterRun; },
    get startWoodsmanCurse() { return startWoodsmanCurse; },
    get createEnemy() { return createEnemy; },
    get getContentStartBlockReason() { return getContentStartBlockReason; },
    get hasCurrentLoopAbyssRequirementClear() { return typeof hasCurrentLoopAbyssRequirementClear === 'undefined' ? undefined : hasCurrentLoopAbyssRequirementClear; },
    get getSeasonAbyssDepthCap() { return getSeasonAbyssDepthCap; },
    get hasCurrentLoopChaos20Clear() { return typeof hasCurrentLoopChaos20Clear === 'undefined' ? undefined : hasCurrentLoopChaos20Clear; },
    get getLoopAbyssRequirementPrompt() { return getLoopAbyssRequirementPrompt; },
    get actExplorationProgress() { return actExplorationProgress; },
    get snapshotWoodsmanBuildState() { return snapshotWoodsmanBuildState; },
    get resetWoodsmanCurse() { return resetWoodsmanCurse; },
    get prepareActExplorationArrival() { return prepareActExplorationArrival; },
    get ensureChaosRealmState() { return ensureChaosRealmState; },
    get ensureWoodsmanEchoRunState() { return ensureWoodsmanEchoRunState; },
    get getCombatTime() { return getCombatTime; },
    get WOODSMAN_ECHO_ZONE_ID() { return WOODSMAN_ECHO_ZONE_ID; },
    get getContentReturnZoneId() { return getContentReturnZoneId; },
    get clearWoodsmanBuildLock() { return clearWoodsmanBuildLock; },
    get getAvailableLoopAdvancePaths() { return typeof getAvailableLoopAdvancePaths === 'undefined' ? undefined : getAvailableLoopAdvancePaths; },
    get playerStall() { return typeof playerStall === 'undefined' ? undefined : playerStall; },
    get hallState() { return window.GameModules.equipmentHall?.state; },
    get hallUserId() { return window.GameModules.cloudAccountState.current.user?.id; },
    get ensureMeteorSiteState() { return ensureMeteorSiteState; },
    get ensureTimeRiftState() { return ensureTimeRiftState; },
    get ensureSkyTowerState() { return ensureSkyTowerState; },
    get ensureOceanState() { return ensureOceanState; },
    get atlasEndgame() { return atlasEndgame; },
    get getClaimedJournalPassivePointTotal() { return typeof getClaimedJournalPassivePointTotal === 'undefined' ? undefined : getClaimedJournalPassivePointTotal; },
    get rememberLoopAscendancyPlan() { return rememberLoopAscendancyPlan; },
    get clearAscendKeystoneRuntimeState() { return clearAscendKeystoneRuntimeState; },
    get defaultGame() { return defaultGame; },
    get craftingWorkspaceState() { return craftingWorkspaceState; },
    get currencyExchange() { return currencyExchange; },
    get clearBeehiveRuntimeState() { return clearBeehiveRuntimeState; },
    get abandonBeyondBoundaryRun() { return abandonBeyondBoundaryRun; },
    get syncPermanentTalentTabUnlock() { return typeof syncPermanentTalentTabUnlock === 'undefined' ? undefined : syncPermanentTalentTabUnlock; },
    get coreItems() { return coreItems; },
    get stumpCube() { return stumpCube; },
    get stumpBox() { return typeof stumpBox === 'undefined' ? undefined : stumpBox; },
    get atlas() { return atlas; },
    get knitting() { return knitting; },
    get forgetOceanAutoDive() { return forgetOceanAutoDive; },
    get loopMutation() { return loopMutation; },
    get EXPLORATION_EVENT_NOTICES() { return EXPLORATION_EVENT_NOTICES; },
    get queueTutorialNotice() { return typeof queueTutorialNotice === 'undefined' ? undefined : queueTutorialNotice; },
    get closeLoopRecord() { return typeof closeLoopRecord === 'undefined' ? undefined : closeLoopRecord; },
    grantCodexStarter: owner => window.GameModules.lootRules.grantCodexStarter(owner),
    get clearCraftSelection() { return clearCraftSelection; },
    get applySeasonContentProgression() { return applySeasonContentProgression; },
    get runPassiveTreeAutoInvest() { return typeof runPassiveTreeAutoInvest === 'undefined' ? undefined : runPassiveTreeAutoInvest; },
    get getPlayerHpCap() { return getPlayerHpCap; },
    get getPlayerStats() { return getPlayerStats; },
    get ensureActJournalCompletionForLoop() { return ensureActJournalCompletionForLoop; },
    get clearDefeatedEncounter() { return clearDefeatedEncounter; },
    get enterNextEndlessChaosDepth() { return enterNextEndlessChaosDepth; }
});

const effects = {
    get loopCodexRewardNotice() { return loopSettlementUi.announceCodexStarter; },
    get loopLog() { return addLog.bind(undefined); },
    get loopRefresh() { return updateStaticUI.bind(undefined); },
    get loopSave() { return saveGame.bind(undefined); },
    get loopCloudSave() { return typeof requestImmediateCloudSave === 'function' ? requestImmediateCloudSave.bind(undefined) : () => undefined; },
    get loopEvent() { return dispatchRuntimeEvent.bind(undefined); },
    get loopCheckUnlocks() { return checkUnlocks.bind(undefined); },
    get loopPassiveReachable() { return calculateReachableNodes.bind(undefined); },
    get loopPassiveVisibility() { return refreshPassiveVisibility.bind(undefined); },
    get loopCloseReward() { return window.GameModules.playFeedback.reward.dismissForLoop.bind(window.GameModules.playFeedback.reward); },
    loopResetStall: () => { window.GameModules.state.session.progressStallTicks = 0; },
    loopBarkNotice: () => worldTreeBark.noticeFirstBark(),
    loopHeroRequest: (previousClassId, options) => dispatchRuntimeEvent('loop-hero-selection-requested', {
        handled: false,
        options,
        select: classId => applyLoopHeroSelection(classId, previousClassId)
    })
};
const applyLoopHeroSelection = (...args) => consumeDomainCommands(rules.applyLoopHeroSelection(game, ...args), effects);
const requestLoopHeroSelection = (...args) => consumeDomainCommands(rules.requestLoopHeroSelection(game, ...args), effects);
const markLoopSpecialBossKill = (...args) => rules.markLoopSpecialBossKill(game, ...args);
const addWoodsmanPendingScore = (...args) => rules.addWoodsmanPendingScore(game, ...args);
const finishWoodsmanEntrance = (...args) => consumeDomainCommands(rules.finishWoodsmanEntrance(game, ...args), effects);
const enterOutsideChaos = (...args) => consumeDomainCommands(rules.enterOutsideChaos(game, ...args), effects);
const dressWoodsmanEchoDummy = rules.dressWoodsmanEchoDummy;
const enterWoodsmanEchoChallenge = (...args) => consumeDomainCommands(rules.enterWoodsmanEchoChallenge(game, ...args), effects);
const getHeldGearLoopBlockReason = (...args) => rules.getHeldGearLoopBlockReason(game, ...args);
const clearLoopItemStorage = rules.clearLoopItemStorage;
const triggerSeasonReset = (...args) => consumeDomainCommands(rules.triggerSeasonReset(game, ...args), effects);
const handleSeasonLoopConditionMet = (...args) => consumeDomainCommands(rules.handleSeasonLoopConditionMet(game, ...args), effects);
const confirmLoopReady = (...args) => consumeDomainCommands(rules.confirmLoopReady(game, ...args), effects);
const chooseLoopAdvancePath = (...args) => consumeDomainCommands(rules.chooseLoopAdvancePath(game, ...args), effects);
const chooseLoopAdvance = (...args) => consumeDomainCommands(rules.chooseLoopAdvance(game, ...args), effects);

safeExposeGlobals({ applyLoopHeroSelection, requestLoopHeroSelection, markLoopSpecialBossKill, addWoodsmanPendingScore, finishWoodsmanEntrance, enterOutsideChaos, dressWoodsmanEchoDummy, enterWoodsmanEchoChallenge, getHeldGearLoopBlockReason, clearLoopItemStorage, triggerSeasonReset, handleSeasonLoopConditionMet, confirmLoopReady, chooseLoopAdvancePath, chooseLoopAdvance });
