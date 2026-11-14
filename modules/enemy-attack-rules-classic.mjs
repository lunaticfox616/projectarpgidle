import * as part0 from './combat/enemy-targets.mjs';
import * as part1 from './combat/enemy-trajectories.mjs';
import * as part2 from './combat/enemy-cast-state.mjs';
import * as part3 from './ui/enemy-cast-details.mjs';
import * as part4 from './combat/enemy-aim.mjs';
import { createEnemyAimMemory } from './combat/enemy-aim.mjs';
// Removed when remaining classic combat/view callers and bootstrap consume native owners.
const deps = {
    get actExplorationState() { return actExplorationState; },
    get skillGemCasts() { return skillGemCasts; },
    get getCombatGridSize() { return getCombatGridSize; },
    get hasGridCell() { return hasGridCell; },
    get getGridUnitCells() { return getGridUnitCells; },
    get gridCellKey() { return gridCellKey; },
    get bossMoves() { return bossMoves; },
    get actExplorationMotion() { return actExplorationMotion; },
    get isGridUnitInCellSet() { return isGridUnitInCellSet; },
    get getGridPlacementTerrain() { return getGridPlacementTerrain; },
    get gridWalkMask() { return gridWalkMask; },
    get gridChebyshevDist() { return gridChebyshevDist; },
    get MONSTER_COMBAT_ROLES() { return MONSTER_COMBAT_ROLES; },
    get getCombatTime() { return getCombatTime; },
    get getCombatTravelMs() { return getCombatTravelMs; },
    get _t() { return _t; },
    get COMBAT_GRID_CONFIG() { return COMBAT_GRID_CONFIG; }
};
const env = { get owner() { return game; }, memory: createEnemyAimMemory(), deps };
const enemyAttackRules = {
    delivery(enemy, pattern) { return part0.attackDelivery(enemy, pattern); },
    cerberusAttack(enemy, pattern) { return part0.attackCerberusAttack(enemy, pattern); },
    element(enemy, pattern) { return part0.attackElement(enemy, pattern); },
    impactTargets(attack, state) { return part0.attackImpactTargets(env, attack, state); },
    trajectory(attack, enemy, duration) { return part1.attackTrajectory(env, attack, enemy, duration); },
    advanceFlight(attack, state, now) { return part1.attackAdvanceFlight(env, attack, state, now); },
    interrupt(enemy, now) { return part2.attackInterrupt(env, enemy, now); },
    cancelPending(attack, now) { return part2.attackCancelPending(env, attack, now); },
    ready(enemy, now, target) { return part2.attackReady(enemy, now, target); },
    castBar(enemy, now, pending) { return part3.attackCastBar(env, enemy, now, pending); },
    damageName(enemy, pattern) { return part3.attackDamageName(enemy, pattern); },
    meleeReach(enemy, target) { return part1.attackMeleeReach(env, enemy, target); },
    noteAim(enemy, target) { return part4.attackNoteAim(env, enemy, target); },
    aimCell(enemy) { return part4.attackAimCell(env, enemy); }
};
safeExposeGlobals({ enemyAttackRules });
