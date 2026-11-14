import { flowReleaseExplorationWave, flowStrikeRescueTarget, flowBeginRoomBossRules, flowTuneBeehiveWaveEnemy, flowGetBeehiveRoomRun, flowCountBeehiveWaveAlive } from './combat/encounter-rooms.mjs';
import { flowStartEncounterRun, flowBeginOceanRunRules, flowPrepareActExplorationArrival, flowEnsureEncounterRun, flowIsRegularAutoProgressZone, flowReconcileMapProgressRuntimeState } from './combat/encounter-session.mjs';
import { flowStartMoving, flowAdvanceActExplorationDeparture, flowFinishTownReturnAction, flowReturnToTown, flowRunReturnRules } from './combat/encounter-travel.mjs';
import { flowSpawnEncounterMarker, flowAdvanceMapProgress } from './combat/encounter-progress.mjs';
import { flowEnsureWoodsmanEchoRunState, flowFinishWoodsmanEchoRun } from './combat/encounter-echo.mjs';
import { flowGetGrandBreachArena, flowSpawnVoidBreachReinforcement, flowTickGrandBreachRun } from './combat/encounter-breach.mjs';
import { packCountEncounterMarkers, packChainRoomsOf } from './domain/exploration-pack-rules.mjs';
import { packFillRoomPack, packPlaceBeehiveRoomWave } from './domain/exploration-pack-placement.mjs';
import { packCreateActExplorationPack } from './domain/exploration-pack-create.mjs';
import { packGetZoneExplorationPlan, packCreateActExplorationEncounter, packCreateExplorationPacks } from './domain/exploration-packs.mjs';
import { createExplorationPackFormation } from './domain/exploration-pack-formation.mjs';
import { createStageRoomArranger } from './domain/exploration-pack-layout.mjs';
// Same public call names and current owner; native encounter modules own the transitions.
// Remove this entry bridge when the remaining classic consumers and bootstrap import their owners.
const deps = {
    get getElementColor() { return getElementColor; },
    get startWoodsmanCurse() { return startWoodsmanCurse; },
    get giveEnemyEnergyShield() { return giveEnemyEnergyShield; },
    get resetCombatTacticsRuntime() { return resetCombatTacticsRuntime; },
    get resetCombatChannelRuntime() { return resetCombatChannelRuntime; },
    get clearTalentCardRuntimeState() { return typeof clearTalentCardRuntimeState === 'undefined' ? undefined : clearTalentCardRuntimeState; },
    get getEncounterTelemetryContext() { return getEncounterTelemetryContext; },
    get resetPlayerGridPosition() { return resetPlayerGridPosition; },
    get copyCombatGridCell() { return copyCombatGridCell; },
    get restoreAndRecallSummons() { return restoreAndRecallSummons; },
    get getPlayerStats() { return getPlayerStats; },
    get primeTrialHazardTimer() { return primeTrialHazardTimer; },
    get resetWoodsmanCurse() { return resetWoodsmanCurse; },
    get OCEAN_GUARDIAN_BOARD_START_PROGRESS() { return OCEAN_GUARDIAN_BOARD_START_PROGRESS; },
    get hasGridCell() { return hasGridCell; },
    get getGridUnitDistance() { return getGridUnitDistance; },
    get COMBAT_GRID_CONFIG() { return COMBAT_GRID_CONFIG; },
    get isSkyTowerAtRewardLimit() { return isSkyTowerAtRewardLimit; },
    get isBeehiveRunLockedForMapTravel() { return isBeehiveRunLockedForMapTravel; },
    get reconcileBeehiveRunState() { return typeof reconcileBeehiveRunState === 'undefined' ? undefined : reconcileBeehiveRunState; },
    get isCombatProgressStopped() { return isCombatProgressStopped; },
    get cosmosRouteRuntime() { return cosmosRouteRuntime; },
    get holdZoneBoundRuns() { return settleDepartedRuns; },
    get hasKeystone() { return hasKeystone; },
    get prepareMeteorEncounterEntry() { return prepareMeteorEncounterEntry; },
    get METEOR_FALL_ZONE_ID() { return METEOR_FALL_ZONE_ID; },
    get autoEnterGrandBreachIfReady() { return typeof autoEnterGrandBreachIfReady === 'undefined' ? undefined : autoEnterGrandBreachIfReady; },
    get ensureOceanState() { return ensureOceanState; },
    get isOceanAutoRediveHalted() { return isOceanAutoRediveHalted; },
    get enterOceanDive() { return enterOceanDive; },
    get OCEAN_ZONE_ID() { return OCEAN_ZONE_ID; },
    get getZoneTravelBlockReason() { return getZoneTravelBlockReason; },
    get getContentStartBlockReason() { return getContentStartBlockReason; },
    get getAutoProgressZoneId() { return getAutoProgressZoneId; },
    get atlasRun() { return atlasRun; },
    get getPlayerHpCap() { return getPlayerHpCap; },
    get CONDITION_PATTERN_ACTION_DB() { return CONDITION_PATTERN_ACTION_DB; },
    get evaluateConditionPatternRule() { return evaluateConditionPatternRule; },
    get assignEnemyGridSpawn() { return assignEnemyGridSpawn; },
    get getBattleSpawnStamp() { return getBattleSpawnStamp; },
    get isCrowdProgressPaused() { return isCrowdProgressPaused; },
    get getAbyssMonsterScales() { return getAbyssMonsterScales; },
    get EMPTY_TRAVEL_PROGRESS_MULTIPLIER() { return EMPTY_TRAVEL_PROGRESS_MULTIPLIER; },
    get WOODSMAN_ECHO_ZONE_ID() { return WOODSMAN_ECHO_ZONE_ID; },
    get recordWoodsmanEchoRun() { return recordWoodsmanEchoRun; },
    get dropEnemyAttack() { return dropEnemyAttack; },
    get applyVoidRiftMobTuning() { return applyVoidRiftMobTuning; },
    get ensureCombatGridRuntime() { return ensureCombatGridRuntime; },
    get getGrandBreachProgress() { return getGrandBreachProgress; },
    get defeatInGrandBreach() { return abandonTimedBreach; },
    get expireConditionEffects() { return expireConditionEffects; },
    get ACT_EXPLORATION_ALERT() { return ACT_EXPLORATION_ALERT; },
    get ACT_EXPLORATION_AMBUSH() { return ACT_EXPLORATION_AMBUSH; },
    get ACT_EXPLORATION_WAVES() { return ACT_EXPLORATION_WAVES; },
    get ATLAS() { return ATLAS; },
    get GRAND_BREACH_ENCOUNTER() { return GRAND_BREACH_ENCOUNTER; },
    get OUTSIDE_CHAOS_ZONE_ID() { return OUTSIDE_CHAOS_ZONE_ID; },
    get STAGE_ROOMS() { return STAGE_ROOMS; },
    get STORY_ACTS() { return STORY_ACTS; },
    get WISP_ENEMY_RULES() { return WISP_ENEMY_RULES; },
    get _t() { return _t; },
    get actExplorationDoors() { return actExplorationDoors; },
    get actExplorationMap() { return actExplorationMap; },
    get actExplorationProgress() { return actExplorationProgress; },
    get actExplorationRooms() { return actExplorationRooms; },
    get actExplorationState() { return actExplorationState; },
    get assignEnemyGridCombatProfile() { return assignEnemyGridCombatProfile; },
    get atlasEncounters() { return atlasEncounters; },
    get atlasEndgame() { return atlasEndgame; },
    get atlasFinds() { return atlasFinds; },
    get bossVariants() { return typeof bossVariants === 'undefined' ? undefined : bossVariants; },
    get combatIncidents() { return combatIncidents; },
    get createEnemy() { return createEnemy; },
    get dressWoodsmanEchoDummy() { return dressWoodsmanEchoDummy; },
    get findFreeGridCell() { return findFreeGridCell; },
    get fitBossFootprint() { return fitBossFootprint; },
    get generateEncounterPlan() { return generateEncounterPlan; },
    get getActMonsterPool() { return getActMonsterPool; },
    get getCombatTime() { return getCombatTime; },
    get getEnemySeeds() { return getEnemySeeds; },
    get getGridBlockedCells() { return getGridBlockedCells; },
    get getGridUnitFootprint() { return getGridUnitFootprint; },
    get getMonsterVisualAttackKind() { return getMonsterVisualAttackKind; },
    get getRealmMonsterVisualSet() { return getRealmMonsterVisualSet; },
    get getRootMonsterVisualDefinition() { return getRootMonsterVisualDefinition; },
    get getZone() { return getZone; },
    get getZoneEncounterProfile() { return getZoneEncounterProfile; },
    get gridCellKey() { return gridCellKey; },
    get hashSeed() { return hashSeed; },
    get memoryDungeon() { return memoryDungeon; },
    get rollExplorationFacing() { return rollExplorationFacing; },
    random: () => Math.random(),
};
const formation = createExplorationPackFormation(deps);
Object.defineProperties(deps, {formation:{value:formation},arranger:{value:createStageRoomArranger(deps)}});
export function countEncounterMarkers(zone) { return packCountEncounterMarkers({owner: game, deps}, zone); }
export function chainRoomsOf(map) { return packChainRoomsOf(map); }
export function fillRoomPack(map, room, pack, enemies, places) { return packFillRoomPack({owner: game, deps}, map, room, pack, { enemies, places }); }
export function placeBeehiveRoomWave(run, enemies, step, isBoss) { return packPlaceBeehiveRoomWave({owner: game, deps}, run, enemies, step, isBoss); }
export function createActExplorationPack(zone, room, stage, encounter = null, formation = null) { return packCreateActExplorationPack({owner: game, deps}, zone, room, stage, { encounter, formation }); }
export function getZoneExplorationPlan(zone) { return packGetZoneExplorationPlan({owner: game, deps}, zone); }
export function createActExplorationEncounter(zone, exploration) { return packCreateActExplorationEncounter({owner: game, deps}, zone, exploration); }
export function createExplorationPacks(zone, map, bossStages) { return packCreateExplorationPacks({owner: game, deps}, zone, map, bossStages); }
safeExposeGlobals({ explorationPackFormation: formation });

// The remaining classic UI/save services run synchronously between state transitions, preserving their original order.
const presentation = {
    get addLog() {return addLog;},
    get addBattleFx() {return addBattleFx;},
    get announceEnemyAttackRelease() {return announceEnemyAttackRelease;},
    get dispatchRuntimeEvent() {return dispatchRuntimeEvent;},
    get resetBattleRuntimeVisuals() {return resetBattleRuntimeVisuals;},
    get updateStaticUI() {return updateStaticUI;},
    get queueImportantSave() {return queueImportantSave;}
};
function settleDepartedRuns() {return holdZoneBoundRuns(addLog);}
function abandonTimedBreach(zone, message, options) {return defeatInGrandBreach(zone, message, options, {say:addLog});}
function runEncounterPresentation(iterator) {
    let step=iterator.next();
    while(!step.done) {
        const command=step.value;
        const result=command.kind==='waveLog'?command.logger(...command.args):presentation[command.kind](...command.args);
        step=iterator.next(result);
    }
    return step.value;
}
// Existing session-only rule cooldown; save keys and offline snapshot shape are unchanged.
let returnRuleReadyAt=0;
const runtime={
    get pTimer(){return window.GameModules.state.session.pTimer;}, set pTimer(value){window.GameModules.state.session.pTimer=value;},
    get progressStallTicks(){return window.GameModules.state.session.progressStallTicks;}, set progressStallTicks(value){window.GameModules.state.session.progressStallTicks=value;},
    get returnRuleReadyAt(){return returnRuleReadyAt;}, set returnRuleReadyAt(value){returnRuleReadyAt=value;},
    get pendingHeavyUiRefresh(){return pendingHeavyUiRefresh;}, set pendingHeavyUiRefresh(value){pendingHeavyUiRefresh=value;},
    get pendingEnemyCombatAttacks(){return window.GameModules.state.combat.pendingEnemyCombatAttacks;}
};
export function releaseExplorationWave(log) { return runEncounterPresentation(flowReleaseExplorationWave({owner: game,deps,runtime}, log)); }
export function strikeRescueTarget(enemy) { return runEncounterPresentation(flowStrikeRescueTarget(enemy)); }
export function beginRoomBossRules(zone) { return flowBeginRoomBossRules({owner: game,deps,runtime}, zone); }
export function tuneBeehiveWaveEnemy(enemy, zone, isBoss, empower) { return flowTuneBeehiveWaveEnemy({owner: game,deps,runtime}, enemy, zone, isBoss, empower); }
export function getGrandBreachArena(zone) { return runEncounterPresentation(flowGetGrandBreachArena({owner: game,deps,runtime}, zone)); }
export function getBeehiveRoomRun() { return flowGetBeehiveRoomRun({owner: game,deps,runtime}); }
export function countBeehiveWaveAlive() { return flowCountBeehiveWaveAlive({owner: game,deps,runtime}); }
export function startEncounterRun(exploration) { return runEncounterPresentation(flowStartEncounterRun({owner: game,deps,runtime}, exploration)); }
export function beginOceanRunRules(zone, explorationRun) { return flowBeginOceanRunRules({owner: game,deps,runtime}, zone, explorationRun); }
export function startMoving(isTown) { return runEncounterPresentation(flowStartMoving({owner: game,deps,runtime}, isTown)); }
export function prepareActExplorationArrival() { return flowPrepareActExplorationArrival({owner: game,deps,runtime}); }
export function advanceActExplorationDeparture() { return runEncounterPresentation(flowAdvanceActExplorationDeparture({owner: game,deps,runtime})); }
export function finishTownReturnAction() { return runEncounterPresentation(flowFinishTownReturnAction({owner: game,deps,runtime})); }
export function returnToTown() { return runEncounterPresentation(flowReturnToTown({owner: game,deps,runtime})); }
export function runReturnRules(pStats, now = getCombatTime()) { return runEncounterPresentation(flowRunReturnRules({owner: game,deps,runtime}, pStats, now)); }
export function ensureEncounterRun() { return runEncounterPresentation(flowEnsureEncounterRun({owner: game,deps,runtime})); }
export function isRegularAutoProgressZone(zone) { return flowIsRegularAutoProgressZone(zone); }
export function reconcileMapProgressRuntimeState() { return runEncounterPresentation(flowReconcileMapProgressRuntimeState({owner: game,deps,runtime})); }
export function spawnEncounterMarker(marker) { return runEncounterPresentation(flowSpawnEncounterMarker({owner: game,deps,runtime}, marker)); }
export function advanceMapProgress(pStats) { return runEncounterPresentation(flowAdvanceMapProgress({owner: game,deps,runtime}, pStats)); }
export function ensureWoodsmanEchoRunState() { return flowEnsureWoodsmanEchoRunState({owner: game,deps,runtime}); }
export function finishWoodsmanEchoRun() { return runEncounterPresentation(flowFinishWoodsmanEchoRun({owner: game,deps,runtime})); }
export function spawnVoidBreachReinforcement(zone, rift) { return flowSpawnVoidBreachReinforcement({owner: game,deps,runtime}, zone, rift); }
export function tickGrandBreachRun(zone) { return runEncounterPresentation(flowTickGrandBreachRun({owner: game,deps,runtime}, zone)); }

function rollExplorationFacing() { return Math.floor(Math.random() * actExplorationMap.ROTATIONS); }
safeExposeGlobals({ chainRoomsOf, createActExplorationPack, releaseExplorationWave, getZoneExplorationPlan, createActExplorationEncounter, createExplorationPacks, strikeRescueTarget, countEncounterMarkers, fillRoomPack, beginRoomBossRules, tuneBeehiveWaveEnemy, getGrandBreachArena, getBeehiveRoomRun, placeBeehiveRoomWave, countBeehiveWaveAlive, startEncounterRun, beginOceanRunRules, startMoving, prepareActExplorationArrival, advanceActExplorationDeparture, finishTownReturnAction, returnToTown, runReturnRules, ensureEncounterRun, isRegularAutoProgressZone, reconcileMapProgressRuntimeState, spawnEncounterMarker, advanceMapProgress, ensureWoodsmanEchoRunState, finishWoodsmanEchoRun, spawnVoidBreachReinforcement, tickGrandBreachRun, rollExplorationFacing });
