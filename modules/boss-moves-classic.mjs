import * as part0 from './combat/observer-scene.mjs';
import * as part1 from './combat/observer-state.mjs';
import * as part2 from './combat/boss-move-geometry.mjs';
import * as part3 from './combat/observer-targeting.mjs';
import * as part4 from './combat/observer-floor-cache.mjs';
import * as part5 from './combat/observer-floor-impact.mjs';
import * as part6 from './combat/boss-move-style.mjs';
import * as part7 from './combat/boss-move-plan.mjs';
import * as part8 from './combat/boss-move-runtime.mjs';
import * as part9 from './combat/boss-shift-state.mjs';
import { createBossMoveMemory } from './combat/boss-move-memory.mjs';
import { BOSS_MOVE_RULES, BOSS_MOVE_INTRO, BOSS_MOVE_STYLE_BY_VISUAL, BOSS_MOVE_NAMES, OPEN_MS, divisionCue } from './combat/boss-move-values.mjs';
// Remove this late-bound bridge when the remaining combat/view callers and bootstrap use native owners.
const deps = {
    get BEYOND_BOUNDARY_UNLOCK_BOSS_ID() { return BEYOND_BOUNDARY_UNLOCK_BOSS_ID; },
    get actExplorationRooms() { return actExplorationRooms; },
    get getCombatGridSize() { return getCombatGridSize; },
    get _t() { return _t; },
    get getCombatTime() { return getCombatTime; },
    get getGridPlacementTerrain() { return getGridPlacementTerrain; },
    get getClosestGridUnitCell() { return getClosestGridUnitCell; },
    get actExplorationState() { return actExplorationState; },
    get actExplorationMap() { return actExplorationMap; },
    get gridCellKey() { return gridCellKey; },
    get hasGridCell() { return hasGridCell; },
    get getGridBlockedCells() { return getGridBlockedCells; },
    get getGridUnitFootprint() { return getGridUnitFootprint; },
    get canPlaceGridFootprint() { return canPlaceGridFootprint; },
    get actExplorationMotion() { return actExplorationMotion; },
    get enemyAttackRules() { return enemyAttackRules; },
    get isGridUnitInCellSet() { return isGridUnitInCellSet; },
    get getGridFootprintCells() { return getGridFootprintCells; },
    get getGridUnitCenter() { return getGridUnitCenter; },
    get gridChebyshevDist() { return gridChebyshevDist; },
    get getGridUnitDistance() { return getGridUnitDistance; },
    get OUTSIDE_CHAOS_ZONE_ID() { return OUTSIDE_CHAOS_ZONE_ID; },
    get canEnemyAttackFromHere() { return canEnemyAttackFromHere; },
    get getSkillStageFootprint() { return getSkillStageFootprint; },
    get COMBAT_GRID_CONFIG() { return COMBAT_GRID_CONFIG; },
    get woodsmanAttackFxElement() { return woodsmanAttackFxElement; },
    get skillGemCasts() { return skillGemCasts; },
    get BOSS_FX() { return typeof BOSS_FX === 'undefined' ? undefined : BOSS_FX; },
    get MONSTER_STAGE_ROSTER() { return typeof MONSTER_STAGE_ROSTER === 'undefined' ? undefined : MONSTER_STAGE_ROSTER; },
    get gridLineCells() { return gridLineCells; },
    get woodsmanBattle() { return woodsmanBattle; }
};
const env = { get owner() { return game; }, memory: createBossMoveMemory(), deps };
function runCommands(commands) {
    let step = commands.next();
    while (!step.done) {
        const command = step.value;
        step = commands.next(addBattleFx(...command.args));
    }
    return step.value;
}
const observer = Object.freeze({
    wait(enemy, now) { return runCommands(part0.observerWait(env, enemy, now)); },
    openingAt(enemy) { return part1.observerOpeningAt(env, enemy); },
    openMs: OPEN_MS,
    impactMs(area) { return part2.observerImpactMs(area); },
    pattern(enemy, attackNumber) { return part1.observerPattern(env, enemy, attackNumber); },
    area(enemy, state, target) { return part3.observerArea(env, enemy, state, target); },
    impacts(area) { return part2.observerImpacts(area); },
    floor(run, now) { return part4.observerFloor(env, run, now); },
    collapse(attack, now) { return runCommands(part5.observerCollapse(env, attack, now)); },
    boundary(enemy) { return part1.observerBoundary(env, enemy); },
    playerBoundary(run) { return part1.observerPlayerBoundary(env, run); },
    divisionCue: divisionCue,
    advanceScene(now, paused) { return runCommands(part0.observerAdvanceScene(env, now, paused)); },
    sceneActive() { return part1.observerSceneActive(env); },
    boundaryX(room, gy) { return part2.observerBoundaryX(room, gy); },
    sideOf(room, cell) { return part2.observerSideOf(room, cell); },
    colorHits(input0, input1) { return part2.observerColorHits(input0, input1); },
    sealedFloor(run) { return part4.observerSealedFloor(env, run); },
    mergedFloor(run, now) { return part4.observerMergedFloor(env, run, now); },
    followSeal(enemy, state, now) { return part3.observerFollowSeal(env, enemy, state, now); },
    seal(attack) { return runCommands(part5.observerSeal(env, attack)); }
});
const bossMoves = Object.freeze({
    rules: BOSS_MOVE_RULES,
    fxOf(enemy) { return part6.moveBossFxOf(env, enemy); },
    styleOf(enemy) { return part6.moveStyleOf(env, enemy); },
    intro(enemy, n) { return part6.moveIntroSpecial(env, enemy, n); },
    introCount(enemy) { return part6.moveIntroCount(env, enemy); },
    plan(state, enemy) { return part7.movePlanBossMove(env, state, enemy); },
    begin(attack, now) { return part8.moveBeginBossMove(env, attack, now); },
    takeStage(attack, queue, now) { return runCommands(part8.moveTakeBossMoveStage(env, attack, queue, now)); },
    live(now) { return part8.moveLiveBossMoves(env, now); },
    cut(move, now) { return part8.moveCutBossMove(env, move, now); },
    firstImpactMs(state, enemy) { return part6.moveFirstImpactMs(env, state, enemy); },
    familyShapes(enemy, family) { return part6.moveFamilyShapes(env, enemy, family); },
    shapeLook(enemy, shape) { return part6.moveShapeLook(env, enemy, shape); },
    shiftPattern(enemy, attackNumber) { return part9.moveShiftPattern(env, enemy, attackNumber); },
    canPrepare(enemy, target) { return part9.moveCanPrepare(env, enemy, target); },
    prepareShift(enemy, state, target, now) { return part9.movePrepareShift(env, enemy, state, target, now); },
    updateShift(enemy, now) { return part9.moveUpdateShift(env, enemy, now); },
    shiftOf(enemy) { return part9.moveShiftOf(env, enemy); },
    cancelShift(enemy) { return part9.moveCancelShift(env, enemy); },
    needsWarning(enemy, state, key) { return part9.moveNeedsWarning(env, enemy, state, key); },
    observer
});
safeExposeGlobals({ BOSS_MOVE_RULES, BOSS_MOVE_INTRO, BOSS_MOVE_STYLE_BY_VISUAL, BOSS_MOVE_NAMES, bossMoves });
