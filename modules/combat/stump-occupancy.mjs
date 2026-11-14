

export function stumpStumpCellKey(env, c) { return env.deps.gridCellKey(c.gx, c.gy); }

export function stumpOwner(env) { return env.owner.currentZoneId === env.deps.OUTSIDE_CHAOS_ZONE_ID && env.owner.playerHp > 0
        ? env.owner.enemies.find(e => e.hp > 0 && e.isWoodsman && !e.noAttack) : null; }

export function stumpRows(env) { return stumpOwner(env)?.woodsmanStumps || []; }

export function stumpFootprintCells(env, row) { return env.deps.getGridFootprintCells(row.gx, row.gy, row.footprint); }

export function stumpCells(env, except) { return stumpRows(env).filter(row => row !== except && ['idle', 'rising'].includes(row.phase)).flatMap((arg0) => stumpFootprintCells(env, arg0)); }

export function stumpPatternCells(env) { return stumpRows(env).flatMap(row => stumpFootprintCells(env, row)
        .concat(row.target ? stumpFootprintCells(env, { ...row.target, footprint: row.footprint }) : [])); }

export function stumpLivingAdds(env, enemy) { return env.owner.enemies.filter(e => e.hp > 0 && e.woodsmanAdd === enemy.id); }

export function stumpDistance(a, b) { return Math.max(Math.abs(a.gx - b.gx), Math.abs(a.gy - b.gy)); }

export function stumpConnected(env, cells, blocked) {
        const remaining = new Set(cells.map((arg0) => stumpStumpCellKey(env, arg0)).filter(k => !blocked.has(k)));
        if (!remaining.size) return false;
        const queue = [remaining.values().next().value]; remaining.delete(queue[0]);
        for (let i = 0; i < queue.length; i++) {
            const [x, y] = queue[i].split(',').map(Number);
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                const next = env.deps.gridCellKey(x + dx, y + dy);
                if (remaining.delete(next)) queue.push(next);
            }
        }
        return !remaining.size;
    }
