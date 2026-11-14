import { cellGetCombatGridSize, cellGetGridUnitCells, cellGridChebyshevDist } from './grid-units.mjs';
import { cellGridLineCells } from './grid-lines.mjs';

export function skillIsGridAreaOffset(shape, dx, dy, radius) {
    let ax = Math.abs(dx), ay = Math.abs(dy);
    // Cell centers inside the radius + half-cell edge belong to a filled circular area.
    if (shape === 'circle') return dx * dx + dy * dy <= (radius + 0.5) ** 2;
    if (shape === 'square') return Math.max(ax, ay) <= radius;
    if (shape === 'cross') return (dx === 0 || dy === 0) && Math.max(ax, ay) <= radius;
    if (shape === 'diagonal') return ax === ay && ax <= radius;
    if (shape === 'ring') return Math.max(ax, ay) === 0 || ax + ay === radius;
    return ax + ay <= radius;
}

/** Filled breath triangle in grid coordinates; range is the centerline's Chebyshev reach.
 * @returns {{x:number,y:number,dx:number,dy:number,length:number,halfWidth:number,vertices:Array<{gx:number,gy:number}>}}
 */
export function skillGetGridConeGeometry(profile, attacker, target) {
    let dx = target.gx - attacker.gx, dy = target.gy - attacker.gy;
    let distance = Math.hypot(dx, dy);
    if (distance === 0) { dx = 1; distance = 1; }
    dx /= distance; dy /= distance;
    let length = (profile.range + 0.5) / Math.max(Math.abs(dx), Math.abs(dy));
    let halfWidth = length * 0.6;
    let endX = attacker.gx + dx * length, endY = attacker.gy + dy * length;
    return { x: attacker.gx, y: attacker.gy, dx, dy, length, halfWidth, vertices: [
        { gx: attacker.gx, gy: attacker.gy },
        { gx: endX - dy * halfWidth, gy: endY + dx * halfWidth },
        { gx: endX + dy * halfWidth, gy: endY - dx * halfWidth }
    ] };
}

/** Select cell centers within the same triangle used by the renderer, including gaps between rays. */
export function skillGetGridConeAreaCells(env, profile, attacker, target) {
    let cone = skillGetGridConeGeometry(profile, attacker, target);
    let cells = [];
    for (let gx = 0; gx < cellGetCombatGridSize(env).columns; gx++) {
        for (let gy = 0; gy < cellGetCombatGridSize(env).rows; gy++) {
            let dx = gx - cone.x, dy = gy - cone.y;
            let forward = dx * cone.dx + dy * cone.dy;
            let side = Math.abs(dx * cone.dy - dy * cone.dx);
            if (forward > 0 && forward <= cone.length && side <= forward * 0.6) cells.push({ gx, gy });
        }
    }
    return cells;
}

export function skillGetGridFanDirections(attacker, target, rayCount) {
    let ring = [{ gx: 1, gy: 0 }, { gx: 1, gy: 1 }, { gx: 0, gy: 1 }, { gx: -1, gy: 1 },
        { gx: -1, gy: 0 }, { gx: -1, gy: -1 }, { gx: 0, gy: -1 }, { gx: 1, gy: -1 }];
    let aimX = Math.sign(target.gx - attacker.gx), aimY = Math.sign(target.gy - attacker.gy);
    let center = ring.findIndex(direction => direction.gx === aimX && direction.gy === aimY);
    if (center < 0) center = 0;
    let offsets = [0, -1, 1, -2, 2, -3, 3, 4];
    return offsets.slice(0, Math.max(1, Math.min(8, rayCount))).map(offset => ring[(center + offset + 8) % 8]);
}

/** The far cell of each fan ray. A fan with spreadDeg (연발 사격, 삼갈래 분산, 2026-10-07) aims its middle ray straight at the target
 * and opens the others spreadDeg apart on both sides; without it the rays follow the eight grid directions (boss fans).
 * Ends lie `range` cells out in the larger axis, like the grid-direction rays. */
export function skillGetGridFanRayEnds(attacker, target, profile) {
    const rays = Math.max(1, Math.min(8, profile.rays || 3)), range = Math.max(1, profile.range || 1);
    const step = Number(profile.spreadDeg) * Math.PI / 180;
    if (!(step > 0)) return skillGetGridFanDirections(attacker, target, rays)
        .map(direction => ({ gx: attacker.gx + direction.gx * range, gy: attacker.gy + direction.gy * range }));
    const aim = Math.atan2(target.gy - attacker.gy, target.gx - attacker.gx);
    return [0, -1, 1, -2, 2, -3, 3, 4].slice(0, rays).map(k => {
        const dx = Math.cos(aim + k * step), dy = Math.sin(aim + k * step), reach = range / Math.max(Math.abs(dx), Math.abs(dy));
        return { gx: attacker.gx + Math.round(dx * reach), gy: attacker.gy + Math.round(dy * reach) };
    });
}

/** The last cell on the board of each fan ray, where its arrow is drawn to. */
export function skillGetGridFanRayTips(env, attacker, target, profile) {
    return skillGetGridFanRayEnds(attacker, target, profile)
        .map(end => cellGridLineCells(env, {ax:attacker.gx, ay:attacker.gy, tx:end.gx, ty:end.gy, maxLen:profile.range}).pop())
        .filter(Boolean);
}

export function skillGetGridDiagonalAttackDirection(env, attacker, target) {
    let diagonalCell = cellGetGridUnitCells(env, target).filter(cell => {
        let dx = cell.gx - attacker.gx, dy = cell.gy - attacker.gy;
        return dx !== 0 && dy !== 0 && Math.abs(dx) === Math.abs(dy);
    }).sort((a, b) => cellGridChebyshevDist(attacker.gx, attacker.gy, a.gx, a.gy)
        - cellGridChebyshevDist(attacker.gx, attacker.gy, b.gx, b.gy))[0];
    if (!diagonalCell) return null;
    return { gx: Math.sign(diagonalCell.gx - attacker.gx), gy: Math.sign(diagonalCell.gy - attacker.gy) };
}

export function skillIsGridUnitOnDiagonalRay(env, attacker, unit, direction) {
    return cellGetGridUnitCells(env, unit).some(cell => {
        let dx = cell.gx - attacker.gx, dy = cell.gy - attacker.gy;
        return dx !== 0 && Math.abs(dx) === Math.abs(dy)
            && Math.sign(dx) === direction.gx && Math.sign(dy) === direction.gy;
    });
}
