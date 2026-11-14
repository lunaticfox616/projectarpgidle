

/** Only the current room run can own missing floor. The walk mask stays immutable. */
        export function observerFloor(env, run, now = env.deps.getCombatTime()) {
            const active = run && env.memory.floors.get(run);
            if (!active || env.owner.currentZoneId !== env.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID || active.enemy.hp <= 0
                || !env.owner.enemies.includes(active.enemy)) return null;
            if (active.nextExpiry <= now) {
                active.patches = active.patches.filter(patch => now < patch.until);
                observerCacheFloor(env, active);
            }
            return active.cached;
        }

export function observerCacheFloor(env, active) {
            const cells = [...new Map(active.patches.flatMap(patch => patch.cells.map(cell => [env.deps.gridCellKey(cell.gx, cell.gy), cell]))).values()];
            active.nextExpiry = Math.min(...active.patches.map(patch => patch.until));
            active.cached = cells.length ? { cells, keys: new Set(cells.map(cell => env.deps.gridCellKey(cell.gx, cell.gy))),
                at: active.patches[0].at, until: Math.max(...active.patches.map(patch => patch.until)) } : null;
        }

export function observerSealedFloor(env, run) {
            if (!run?.observerSeals?.length) return null;
            if (!env.memory.seals.has(run)) env.memory.seals.set(run, observerGroupFloor(env, run.observerSeals));
            return env.memory.seals.get(run);
        }

export function observerMergedFloor(env, run, now) {
            const temporary = observerFloor(env, run, now), permanent = observerSealedFloor(env, run);
            if (!temporary) return permanent;
            const cached = env.memory.merged.get(run);
            if (cached?.temporary === temporary && cached.permanent === permanent) return cached.floor;
            const cells = (permanent?.cells || []).concat(temporary.cells.filter(cell => !permanent?.keys.has(env.deps.gridCellKey(cell.gx, cell.gy))));
            const union = observerGroupFloor(env, cells);
            env.memory.merged.set(run, { temporary, permanent, floor: { ...union, at: temporary.at, until: temporary.until } });
            return env.memory.merged.get(run).floor;
        }

export function observerGroupFloor(env, cells) {
            const pending = new Map(cells.map(cell => [env.deps.gridCellKey(cell.gx, cell.gy), cell]));
            const keys = new Set(pending.keys()), patches = [];
            for (const [key, first] of pending) {
                const patch = [first];
                pending.delete(key);
                for (const cell of patch) observerAppendSealNeighbours(env, cell, patch, pending);
                patches.push(patch);
            }
            return { cells, keys, patches };
        }

export function observerAppendSealNeighbours(env, cell, patch, pending) {
            for (const [dx, dy] of [[1,0], [-1,0], [0,1], [0,-1]]) {
                const key = env.deps.gridCellKey(cell.gx + dx, cell.gy + dy);
                const next = pending.get(key);
                if (next) { pending.delete(key); patch.push(next); }
            }
        }

export function observerRememberSeal(env, run, cells) {
            const board = observerSealedFloor(env, run), added = new Set();
            const map = env.deps.getCombatGridSize();
            const fresh = cells.filter(cell => env.deps.actExplorationState.validObserverSeal(map, cell) && !board?.keys.has(env.deps.gridCellKey(cell.gx, cell.gy)));
            if (fresh.length) {
                fresh.forEach(cell => added.add(env.deps.gridCellKey(cell.gx, cell.gy)));
                run.observerSeals = (board?.cells || []).concat(fresh);
                env.memory.seals.set(run, observerGroupFloor(env, run.observerSeals));
            }
            return added;
        }
