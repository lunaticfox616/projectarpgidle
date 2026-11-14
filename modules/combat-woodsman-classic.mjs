import * as part0 from './combat/woodsman-state.mjs';
import * as part1 from './combat/woodsman-preparation.mjs';
import * as part2 from './combat/woodsman-casts.mjs';
import * as part3 from './combat/woodsman-geometry.mjs';
// Replace with direct owners when the remaining combat/view consumers and bootstrap are migrated.

const deps = {
    get OUTSIDE_CHAOS_ZONE_ID() { return OUTSIDE_CHAOS_ZONE_ID; },
    get getWoodsmanPhaseProgress() { return getWoodsmanPhaseProgress; },
    get WOODSMAN_BATTLE() { return WOODSMAN_BATTLE; },
    get actExplorationState() { return actExplorationState; },
    get getCombatGridSize() { return getCombatGridSize; },
    get actExplorationRooms() { return actExplorationRooms; },
    get _t() { return _t; },
    get getGridPlacementTerrain() { return getGridPlacementTerrain; },
    get canPlaceGridFootprint() { return canPlaceGridFootprint; },
    get gridCellKey() { return gridCellKey; },
    get getGridUnitCells() { return getGridUnitCells; },
    get bossMoves() { return bossMoves; },
    get getCombatTime() { return getCombatTime; },
    get getGridFootprintCells() { return getGridFootprintCells; },
    get getGridBlockedCells() { return getGridBlockedCells; },
    get dropEnemyAttack() { return dropEnemyAttack; },
    get actExplorationMotion() { return actExplorationMotion; },
    get markGridStep() { return markGridStep; },
    get cancelCombatChannel() { return cancelCombatChannel; },
    get getPlayerStats() { return getPlayerStats; },
    get getZone() { return getZone; },
    get calculateTrialTrapDamage() { return calculateTrialTrapDamage; },
    get getPlayerHpCap() { return getPlayerHpCap; },
    get dealTrialTrapDamage() { return dealTrialTrapDamage; },
    get createEnemy() { return createEnemy; },
    get retireDeadEnemyAttacks() { return retireDeadEnemyAttacks; },
    get combatSupports() { return window.GameModules.combat.supports; }
};
const runtime = { get pendingEnemyCombatAttacks() { return window.GameModules.state.combat.pendingEnemyCombatAttacks; } };
const env = { get owner() { return game; }, deps, runtime };
const presentation = {
    get addBattleFx() { return addBattleFx; },
    get dispatchRuntimeEvent() { return dispatchRuntimeEvent; },
    get clearDotFxThrottleForEnemy() { return clearDotFxThrottleForEnemy; }
};
function runCommands(commands) {
    let step = commands.next();
    while (!step.done) {
        const command = step.value;
        step = commands.next(presentation[command.kind](...command.args));
    }
    return step.value;
}
const woodsmanBattle = Object.freeze({
    owns(enemy) { return part0.woodOwns(env, enemy); },
    introduction() { return part0.woodIntroduction(env); },
    prepare(enemy) { return runCommands(part1.woodPrepare(env, enemy)); },
    preview(enemy) { return part0.woodPreview(env, enemy); },
    warning(enemy, state, target, now) { return part2.woodWarning(env, enemy, state, target, now); },
    plan(state) { return part2.woodPlan(state); },
    takeTargets(attack, targets) { return part2.woodTakeTargets(env, attack, targets); },
    current(enemy) { return part0.woodCurrent(env, enemy); },
    bounds(enemy) { return part3.woodBounds(env, enemy); },
    point(cell, box) { return part3.woodPoint(cell, box); },
    cell(p, box) { return part3.woodCell(p, box); },
    geometry(event, age) { return part3.woodGeometry(event, age); },
    contains(event, p, age) { return part3.woodContains(event, p, age); },
    warningCells(cast, now, release) { return part2.woodWarningCells(cast, now, release); },
    cellsIn(box) { return part3.woodCellsIn(env, box); }
});
safeExposeGlobals({ woodsmanBattle });
