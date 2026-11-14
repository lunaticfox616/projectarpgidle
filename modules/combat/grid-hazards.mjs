import { cellHasGridCell, cellGetGridUnitFootprint, cellGridCellKey } from './grid-units.mjs';
import { cellGetGridBlockedCells, cellGetGridPlacementTerrain, cellCanPlaceGridFootprint } from './grid-terrain.mjs';
import { cellBeginExplorationGridStep, cellMarkGridStep } from './grid-movement.mjs';
import { GRID_CARDINAL_STEPS } from './combat-grid-values.mjs';

export function cellFindNearestSafeGridRoute(env, unit, hazardCells) {
    if (!cellHasGridCell(env, unit)) return null;
    const footprint = cellGetGridUnitFootprint(env, unit);
    let danger = new Set((hazardCells || [])
        .filter(cell => cellHasGridCell(env, cell))
        .map(cell => cellGridCellKey(cell.gx, cell.gy)));
    let blocked = cellGetGridBlockedCells(env, unit);
    let start = { gx: unit.gx, gy: unit.gy, first: null, distance: 0 };
    let queue = [start], terrain = cellGetGridPlacementTerrain(env);
    const placement={env,footprint,terrain};
    let visited = new Set([cellGridCellKey(start.gx, start.gy)]);
    while (queue.length > 0) {
        let current = queue.shift();
        let currentKey = cellGridCellKey(current.gx, current.gy);
        if (!danger.has(currentKey)) {
            return { next: current.first, destination: { gx: current.gx, gy: current.gy }, distance: current.distance };
        }
        GRID_CARDINAL_STEPS.forEach(direction => {
            let gx = current.gx + direction.dx, gy = current.gy + direction.dy;
            let key = cellGridCellKey(gx, gy);
            if (visited.has(key) || !cellCanPlaceGridFootprint(blocked, gx, gy, placement)) return;
            let first = current.first || { gx, gy };
            visited.add(key);
            queue.push({ gx, gy, first, distance: current.distance + 1 });
        });
    }
    return null;
}

export function cellAdvanceGridHazardEscape(env, unit, hazardCells, dtSec, intervalSec) {
    let route = cellFindNearestSafeGridRoute(env, unit, hazardCells);
    if (!route) return { moved: false, safe: false, blocked: true };
    if (route.distance === 0) return { moved: false, safe: true, blocked: false, distance: 0 };
    let interval = Number.isFinite(intervalSec) && intervalSec > 0 ? intervalSec : env.deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec;
    if (env.deps.actExplorationState.current(env.owner) && unit===env.owner.gridPlayer) {
        return {moved:cellBeginExplorationGridStep(env, route.next,interval),safe:false,blocked:false,distance:route.distance};
    }
    unit.gridMoveTimer = (Number(unit.gridMoveTimer) || 0) + Math.max(0, Number(dtSec) || 0);
    if (unit.gridMoveTimer < interval) return { moved: false, safe: false, blocked: false, distance: route.distance };
    let from = { gx: unit.gx, gy: unit.gy };
    unit.gx = route.next.gx;
    unit.gy = route.next.gy;
    unit.gridMoveTimer = 0;
    cellMarkGridStep(env, unit, from, true);
    return {
        moved: true,
        safe: route.distance === 1,
        blocked: false,
        distance: Math.max(0, route.distance - 1),
        from,
        to: { gx: unit.gx, gy: unit.gy }
    };
}
