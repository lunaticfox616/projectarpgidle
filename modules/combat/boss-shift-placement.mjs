

export function moveShiftContext(env, enemy) {
        const terrain = env.deps.getGridPlacementTerrain();
        return { terrain, room: env.deps.actExplorationRooms.roomAt(terrain.map, enemy), footprint: env.deps.getGridUnitFootprint(enemy), blocked: env.deps.getGridBlockedCells(enemy) };
    }

export function moveLegalLanding(env, cell, context) {
        const { terrain, room, footprint, blocked } = context;
        if (!room || !env.deps.canPlaceGridFootprint(blocked, cell.gx, cell.gy, footprint, terrain)) return false;
        return env.deps.getGridFootprintCells(cell.gx, cell.gy, footprint, terrain.map)
            .every(at => env.deps.actExplorationRooms.roomAt(terrain.map, at)?.id === room.id);
    }

/** At most 169 nearby anchors, only when starting the cast. Never search the whole map each tick. */
    export function moveShiftLanding(env, enemy, target, kind, context) {
        const candidates = [], desired = kind === 'blink' ? 4 : 1, from = env.deps.getGridUnitCenter(enemy);
        for (let dx = -6; dx <= 6; dx++) for (let dy = -6; dy <= 6; dy++) {
            const cell = { gx: target.gx + dx, gy: target.gy + dy };
            if (!moveLegalLanding(env, cell, context) || env.deps.gridChebyshevDist(cell.gx, cell.gy, enemy.gx, enemy.gy) < 2) continue;
            const body = { ...cell, isBoss: true, footprint: context.footprint }, distance = env.deps.getGridUnitDistance(body, target);
            if (Math.abs(distance - desired) > 1 || distance < 1) continue;
            candidates.push({ cell, score: moveShiftScore(env, body, target, from, desired) });
        }
        candidates.sort((a, b) => a.score - b.score);
        return candidates[0]?.cell || null;
    }

export function moveShiftScore(env, body, target, from, desired) {
        const side = (env.deps.getGridUnitCenter(body).gx - target.gx) * (from.gx - target.gx);
        return Math.abs(env.deps.getGridUnitDistance(body, target) - desired) * 10 + (side < 0 ? 0 : 3) + Math.abs(body.gy - target.gy) * .3;
    }
