import { clampNumber } from '../common/numbers.mjs';

export function woodBounds(env, enemy) {
        const map = env.deps.getCombatGridSize(), room = map.rooms && env.deps.actExplorationRooms.roomAt(map, enemy);
        return room ? { x0: room.x0, y0: room.y0, x1: room.x1, y1: room.y1 }
            : { x0: 0, y0: 0, x1: map.columns - 1, y1: map.rows - 1 };
    }

// Reference artwork coordinate <-> grid cell centre; camera and viewport never affect the simulation.
    export function woodPoint(cell, box) { return { x: 220 + (cell.gx - box.x0) / Math.max(1, box.x1 - box.x0) * 1232,
        y: 500 + (cell.gy - box.y0) / Math.max(1, box.y1 - box.y0) * 360 }; }

export function woodCell(p, box) { return { gx: box.x0 + (p.x - 220) / 1232 * (box.x1 - box.x0),
        gy: box.y0 + (p.y - 500) / 360 * (box.y1 - box.y0) }; }

export function woodGeometry(event, age) {
        if (event.kind === 'annulus') return { ...event, radius: 140 + clampNumber(age / event.duration, 0, 1) * (event.range || 530) };
        if (event.kind === 'front') return { ...event, y: 500 + clampNumber(age / event.duration, 0, 1) * 360 };
        if (event.kind === 'sidefront') return { ...event, x: event.fromX + (event.toX - event.fromX) * clampNumber(age / event.duration, 0, 1) };
        return event;
    }

export function woodSegmentDistance(p, e) {
        const dx = e.b.x - e.a.x, dy = (e.b.y - e.a.y) / .5;
        const t = clampNumber(((p.x - e.a.x) * dx + (p.y - e.a.y) / .5 * dy) / (dx * dx + dy * dy), 0, 1);
        return Math.hypot(p.x - e.a.x - dx * t, (p.y - e.a.y) / .5 - dy * t);
    }

export function woodContains(event, p, age) {
        const e = woodGeometry(event, age);
        if (e.kind === 'ellipse') return ((p.x - e.x) / e.rx) ** 2 + ((p.y - e.y) / e.ry) ** 2 <= 1;
        if (e.kind === 'lane') return Math.abs(p.x - e.x) <= e.width / 2 && p.y >= e.top && p.y <= e.bottom;
        if (e.kind === 'front') return Math.abs(p.y - e.y) <= 28 && Math.abs(p.x - e.gap) > e.gapWidth / 2;
        if (e.kind === 'sidefront') return Math.abs(p.x - e.x) <= 65;
        if (e.kind === 'segment') return woodSegmentDistance(p, e) <= e.halfWidth;
        return Math.abs(Math.hypot(p.x - e.x, (p.y - e.y) / .38) - e.radius) <= 42;
    }

export function woodCellsIn(env, box) {
        const terrain = env.deps.getGridPlacementTerrain(), result = [], blocked = new Set();
        for (let gy = box.y0; gy <= box.y1; gy++) for (let gx = box.x0; gx <= box.x1; gx++) {
            if (env.deps.canPlaceGridFootprint(blocked, gx, gy, { columns: 1, rows: 1 }, terrain)) result.push({ gx, gy });
        }
        return result;
    }
