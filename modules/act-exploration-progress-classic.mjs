import * as rules from './combat/exploration-progress-rules.mjs';
import * as loot from './combat/exploration-progress-loot.mjs';
import * as lifecycle from './combat/exploration-progress-lifecycle.mjs';
import * as movement from './combat/exploration-progress-movement.mjs';
// Keep this one set of session-only memos across calls; run objects are weak keys and never serialized.
const memo={commandStalls:new WeakMap(),lootWalks:new WeakMap(),walkedMs:new WeakMap(),inscriptionVisits:new WeakMap(),autoHolds:new WeakMap(),manualSteerHolds:new WeakMap()};
// Classic consumers (including the object extension) still load later. Remove this adapter with them.
const deps={
    get getCombatTime(){return getCombatTime;},
    get actExplorationState(){return actExplorationState;},
    get COMBAT_GRID_CONFIG(){return COMBAT_GRID_CONFIG;},
    get beginExplorationGridStep(){return beginExplorationGridStep;},
    get isPlayerAttackRecovering(){return isPlayerAttackRecovering;},
    get actExplorationDoors(){return actExplorationDoors;},
    get JOURNAL_DB(){return JOURNAL_DB;},
    get unlockJournalEntry(){return unlockJournalEntry;},
    get actExplorationMotion(){return actExplorationMotion;},
    get continuePlayerExplorationApproach(){return continuePlayerExplorationApproach;},
    get swapSummonOutOfHeroTile(){return swapSummonOutOfHeroTile;},
    get bossMoves(){return bossMoves;},
    get getHeroStepBlockedCells(){return getHeroStepBlockedCells;},
    get canPlaceGridFootprint(){return canPlaceGridFootprint;},
    get roomInvaders(){return roomInvaders;},
    get woodsmanBattle(){return woodsmanBattle;},
    get WOODSMAN_BATTLE(){return WOODSMAN_BATTLE;},
    get getZone(){return getZone;},
    get restartHiddenJournalBossRun(){return restartHiddenJournalBossRun;},
    get beginRoomBossRules(){return beginRoomBossRules;},
    ground:actExplorationState.groundLoot,
    get objects(){return actExplorationProgress.objects;},
    get blessingGreed(){return window.GameModules.combat.supports.blessingGreed;}
};
const effects={get queueImportantSave(){return queueImportantSave;},get addBattleFx(){return addBattleFx;},get dispatchRuntimeEvent(){return dispatchRuntimeEvent;},get collectExplorationFloorLoot(){return collectExplorationFloorLoot;}};
function present(iterator){
    let step=iterator.next();
    while(!step.done){const command=step.value;step=iterator.next(effects[command.kind](...command.args));}
    return step.value;
}
const actExplorationProgress={
    advance(stats) {return present(movement.progressAdvance({owner:game,deps,memo}, stats));},
    tick(now,stats) {return present(movement.progressTick({owner:game,deps,memo}, now,stats));},
    moving() {return movement.progressMoving({owner:game,deps,memo});},
    takeWalkedMs() {return movement.progressTakeWalkedMs({owner:game,deps,memo});},
    collectPile(cell) {return present(loot.progressCollectPile({owner:game,deps,memo}, cell));},
    canMove(run) {return loot.progressCanMove({owner:game,deps,memo}, run);},
    canFinish() {return lifecycle.progressCanFinish({owner:game,deps,memo});},
    beginCompletion(zone) {return present(lifecycle.progressBeginCompletion({owner:game,deps,memo}, zone));},
    shouldTrackStall() {return lifecycle.progressShouldTrackStall({owner:game,deps,memo});},
    holdPosition(requested) {return rules.progressHoldPosition({owner:game,deps,memo}, requested);},
    holdAutoStart(run) {return rules.progressHoldAutoStart({owner:game,deps,memo}, run);},
    holdAutoManual(run) {return rules.progressHoldAutoManual({owner:game,deps,memo}, run);},
    clearManualSteerHold(run) {return rules.progressClearManualSteerHold({owner:game,deps,memo}, run);},
    runMode(run,state=game) {return rules.progressRunMode({owner:game,deps,memo}, run,state);},
    startMode(settings) {return rules.progressStartMode(settings);},
    waiting(state) {return lifecycle.progressWaiting({owner:game,deps,memo}, state);},
    deferDeparture(state) {return lifecycle.progressDeferDeparture({owner:game,deps,memo}, state);},
    stopAfterCompletion(state) {return lifecycle.progressStopAfterCompletion({owner:game,deps,memo}, state);},
    depart(state) {return present(lifecycle.progressDepart({owner:game,deps,memo}, state));},
    reconcileDeparture(state) {return present(lifecycle.progressReconcileDeparture({owner:game,deps,memo}, state));},
    defeat(state) {return lifecycle.progressDefeat({owner:game,deps,memo}, state);}
};
safeExposeGlobals({actExplorationProgress});
