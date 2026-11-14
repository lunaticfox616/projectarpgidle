import * as part0 from './combat/stump-occupancy.mjs';
import * as part1 from './combat/stump-installation.mjs';
import * as part2 from './combat/stump-cycle.mjs';
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
const woodsmanStumps = Object.freeze({
    rows() { return part0.stumpRows(env); },
    cells(except) { return part0.stumpCells(env, except); },
    patternCells() { return part0.stumpPatternCells(env); },
    warning(enemy, state, now, box) { return part1.stumpWarning(env, enemy, state, now, box); },
    resolve(attack, now) { return part1.stumpResolveStumps(env, attack, now); },
    tick(enemy) { return runCommands(part2.stumpTick(env, enemy)); },
    clear(enemy) { return part2.stumpClear(env, enemy); },
    retireAdd(enemy) { return runCommands(part2.stumpRetireAdd(env, enemy)); },
    connected(cells, blocked) { return part0.stumpConnected(env, cells, blocked); }
});
safeExposeGlobals({ woodsmanStumps });
