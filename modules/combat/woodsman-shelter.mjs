import { woodPoint } from './woodsman-geometry.mjs';

export function woodShelter(enemy, type, variant, all, box) {
        if (!type.startsWith('cover-')) return null;
        const cube = enemy.woodsmanStumps?.find(row => row.phase === 'idle');
        if (!cube) return null;
        const direction = type === 'cover-sweep' ? (variant % 2 ? 'west' : 'east') : type === 'cover-tide' ? 'south' : 'radial';
        const rect = { x0: cube.gx - .5, y0: cube.gy - .5, x1: cube.gx + cube.footprint.columns - .5, y1: cube.gy + cube.footprint.rows - .5 };
        const origin = { gx: (box.x0 + box.x1) / 2, gy: box.y0 - 1 };
        const cells = all.filter(c => {
            if (direction === 'south') return c.gy > rect.y1 && c.gx > rect.x0 && c.gx < rect.x1;
            if (direction === 'east') return c.gx > rect.x1 && c.gy > rect.y0 && c.gy < rect.y1;
            if (direction === 'west') return c.gx < rect.x0 && c.gy > rect.y0 && c.gy < rect.y1;
            return woodRayBlocked(origin, c, rect);
        });
        return { direction, cells, origin: woodPoint(origin, box) };
    }

export function woodRayBlocked(from, to, rect) {
        let near = 0, far = 1;
        for (const [axis, low, high] of [['gx', 'x0', 'x1'], ['gy', 'y0', 'y1']]) {
            const delta = to[axis] - from[axis];
            if (!delta) { if (from[axis] < rect[low] || from[axis] > rect[high]) return false; continue; }
            const a = (rect[low] - from[axis]) / delta, b = (rect[high] - from[axis]) / delta;
            near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
        }
        return near < far && far < 1;
    }
