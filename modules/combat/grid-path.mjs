import { cellGetGridUnitFootprint, cellHasGridCell } from './grid-units.mjs';
import { cellGetGridPlacementTerrain, cellGridWalkMask } from './grid-terrain.mjs';
import { GRID_EIGHT_STEPS, GRID_CARDINAL_STEPS } from './combat-grid-values.mjs';

export function cellGridBlockedIndexSet(blocked, width, height) {
    const out = new Set();
    for (const key of blocked) {
        const comma = key.indexOf(','), gx = Number(key.slice(0, comma)), gy = Number(key.slice(comma + 1));
        if (gx >= 0 && gy >= 0 && gx < width && gy < height) out.add(gy * width + gx);
    }
    return out;
}

export function cellCreateGridStepSearch(env, unit, tx, ty, blocked) {
    const footprint = cellGetGridUnitFootprint(env, unit), cols = footprint.columns, rows = footprint.rows;
    const scoring = cellGetGridUnitFootprint(env, { isBoss: cols > 1 || rows > 1 });
    const terrain = cellGetGridPlacementTerrain(env), map = terrain.map, width = map.columns, height = map.rows;
    const blockedAt = cellGridBlockedIndexSet(blocked, width, height), visited = new Uint8Array(width * height);
    if (terrain.holes) for (const at of cellGridBlockedIndexSet(terrain.holes, width, height)) blockedAt.add(at);
    if (terrain.permanent) for (const at of cellGridBlockedIndexSet(terrain.permanent, width, height)) blockedAt.add(at);
    const walk = map.tiles ? cellGridWalkMask(env, map, terrain.sealed) : null;
    visited[unit.gy * width + unit.gx] = 1;
    const inside = (gx, gy) => gx >= 0 && gy >= 0 && gx + cols <= width && gy + rows <= height;
    /** No cell of the footprint at (gx, gy) is blocked or unwalkable (the sealed gate counts as a wall). All of them are inside the map. */
    const free = (gx, gy) => {
        for (let dx = 0; dx < cols; dx++) for (let dy = 0; dy < rows; dy++) {
            const at = (gy + dy) * width + gx + dx;
            if (blockedAt.has(at) || (walk && !walk[at])) return false;
        }
        return true;
    };
    return {
        cheb: (gx, gy) => Math.max(0, gx - tx, tx - (gx + scoring.columns - 1), gy - ty, ty - (gy + scoring.rows - 1)),
        man: (gx, gy) => Math.abs(gx + (cols - 1) / 2 - tx) + Math.abs(gy + (rows - 1) / 2 - ty),
        /** True the first time the footprint can stand with its top-left on (gx, gy): every cell inside the map and free. Marks the cell. */
        enter(gx, gy) {
            if (!inside(gx, gy)) return false;
            const at = gy * width + gx;
            if (visited[at] || !free(gx, gy)) return false;
            visited[at] = 1;
            return true;
        },
        /** enter for one step d from (gx, gy). A diagonal step also needs both cells beside it free: it never cuts a wall's corner or
         * squeezes between two units. */
        move(gx, gy, d) {
            const side = (x, y) => inside(x, y) && free(x, y);
            return (!(d.dx && d.dy) || (side(gx + d.dx, gy) && side(gx, gy + d.dy))) && this.enter(gx + d.dx, gy + d.dy);
        }
    };
}

export function cellSortedGridSteps(unit, search, diagonal) {
    return [...(diagonal ? GRID_EIGHT_STEPS : GRID_CARDINAL_STEPS)].sort((a, b) =>
        search.cheb(unit.gx + a.dx, unit.gy + a.dy) - search.cheb(unit.gx + b.dx, unit.gy + b.dy) ||
        search.man(unit.gx + a.dx, unit.gy + a.dy) - search.man(unit.gx + b.dx, unit.gy + b.dy));
}

export function cellGridStepToward(env, unit, {tx, ty, blocked, diagonal}) {
    if (!cellHasGridCell(env, unit)) return false;
    const search = cellCreateGridStepSearch(env, unit, tx, ty, blocked);
    const directions = cellSortedGridSteps(unit, search, diagonal);
    const qx = [unit.gx], qy = [unit.gy], qf = [-1]; // 큐: 칸과, 그 칸에 이르는 첫걸음의 큐 번호(시작 칸은 -1)
    let best = 0, bestCheb = search.cheb(unit.gx, unit.gy), bestMan = search.man(unit.gx, unit.gy);
    for (let head = 0; head < qx.length; head++) {
        for (const direction of directions) {
            const gx = qx[head] + direction.dx, gy = qy[head] + direction.dy;
            if (!search.move(qx[head], qy[head], direction)) continue;
            const cheb = search.cheb(gx, gy), index = qx.length;
            qx.push(gx); qy.push(gy); qf.push(qf[head] < 0 ? index : qf[head]);
            if (cheb > bestCheb) continue;
            const man = search.man(gx, gy);
            if (cheb < bestCheb || man < bestMan) { best = index; bestCheb = cheb; bestMan = man; }
        }
    }
    if (qf[best] < 0) return false;
    unit.gx = qx[qf[best]];
    unit.gy = qy[qf[best]];
    return true;
}
