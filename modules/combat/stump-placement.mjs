import { stumpStumpCellKey, stumpDistance, stumpFootprintCells, stumpConnected } from './stump-occupancy.mjs';
import { woodCurrent } from './woodsman-state.mjs';
import { woodCellsIn, woodBounds } from './woodsman-geometry.mjs';

export function stumpLandingOccupied(env, enemy, except) {
        const occupied = env.deps.getGridBlockedCells(except ? env.owner.gridPlayer : null);
        const motion = env.deps.actExplorationState.current(env.owner)?.motion;
        if (!except && motion?.to) occupied.add(stumpStumpCellKey(env, motion.to));
        // A landing never enters an already announced attack, nor returns to the old footprint.
        if (except) for (const stage of woodCurrent(env, enemy)?.stages || [])
            stage.cells.forEach(c => occupied.add(stumpStumpCellKey(env, c)));
        return occupied;
    }

export function stumpPositions(env, enemy, box, except = null) {
        const floor = woodCellsIn(env, box), occupied = stumpLandingOccupied(env, enemy, except);
        const footprint = env.deps.WOODSMAN_BATTLE.stumps.footprint;
        const candidates = floor.filter(c => c.gx > box.x0 && c.gx + footprint.columns <= box.x1
            && c.gy > box.y0 && c.gy + footprint.rows <= box.y1);
        const terrain = env.deps.getGridPlacementTerrain();
        const solid = env.deps.actExplorationState.objects.solidCells(env.deps.actExplorationState.current(env.owner));
        while (candidates.length) {
            const row = { ...candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0], footprint };
            if (except && stumpDistance(row, except) < footprint.columns + 1) continue;
            if (!env.deps.canPlaceGridFootprint(occupied, row.gx, row.gy, footprint, terrain)) continue;
            const covered = stumpFootprintCells(env, row);
            if (!stumpLandingHasExit(env, enemy, row, occupied, except)) continue;
            const barriers = new Set([...solid, ...covered.map((arg0) => stumpStumpCellKey(env, arg0))]);
            if (stumpConnected(env, floor, barriers)) return [row];
        }
        return [];
    }

export function stumpLandingHasExit(env, enemy, row, occupied, except) {
        if (except) return !!stumpEscapeCell(env, enemy, row, occupied);
        return !stumpFootprintCells(env, row).some(c => stumpDistance(c, env.owner.gridPlayer) <= 1);
    }

/** Search outward through the footprint, then stop at a neighbouring free tile; never push through a wall. */
    export function stumpEscapeCell(env, enemy, landing, blocked) {
        const area = stumpFootprintCells(env, landing), inside = new Set(area.map((arg0) => stumpStumpCellKey(env, arg0)));
        const box = woodBounds(env, enemy), choices = new Map();
        for (const c of area) for (const [dx, dy] of [[0,1],[-1,0],[1,0],[0,-1]]) {
            const next = { gx: c.gx + dx, gy: c.gy + dy }, key = stumpStumpCellKey(env, next);
            if (inside.has(key) || next.gx < box.x0 || next.gx > box.x1 || next.gy < box.y0 || next.gy > box.y1) continue;
            if (env.deps.canPlaceGridFootprint(blocked, next.gx, next.gy, { columns: 1, rows: 1 })) choices.set(key, next);
        }
        return [...choices.values()].sort((a, b) => stumpDistance(a, env.owner.gridPlayer) - stumpDistance(b, env.owner.gridPlayer))[0] || null;
    }
