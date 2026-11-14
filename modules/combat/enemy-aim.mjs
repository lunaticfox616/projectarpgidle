

export function attackAimRun(env) { return env.owner.currentZoneId === 'colony_run' && env.owner.colony?.inRun
        ? env.deps.actExplorationState.current(env.owner) : null; }

/** Called by combat only when a real defense core exists; null clears an obsolete aim. */
    export function attackNoteAim(env, enemy, target) {
        const run = target && attackAimRun(env);
        if (!run) { env.memory.aims.delete(enemy); return; }
        const cell = enemy.attackCast?.targetCell || target;
        // Assassination reads cardinal facing in combat too; recompute when the enemy moved even if its aim stayed put.
        enemy.facingDirection = env.deps.skillGemCasts.facing(enemy, cell);
        const previous = env.memory.aims.get(enemy);
        if (previous?.run === run && previous.cell.gx === cell.gx && previous.cell.gy === cell.gy) return;
        env.memory.aims.set(enemy, { run, cell: { gx: cell.gx, gy: cell.gy } });
    }

/** Read-only cell snapshot. A finished defense, replaced run or restored enemy cannot inherit an old aim. */
    export function attackAimCell(env, enemy) {
        const run = attackAimRun(env), aim = run && env.memory.aims.get(enemy);
        return aim?.run === run ? aim.cell : null;
    }
// One session owner, keyed by the live enemy and exploration run.
export function createEnemyAimMemory() { return { aims: new WeakMap() }; }
