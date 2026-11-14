export function updateHpDamageGhostState(runtime, state, actualPct, now, options) {
    actualPct = Math.max(0, Math.min(100, Number(actualPct) || 0));
    if (!state || state.ghostPct === null || state.lastPct === null) { return initialHpDamageGhost(runtime, actualPct, now, options); }
    let elapsedSec = Math.max(0, Math.min(0.5, (now - (state.lastAt || now)) / 1000));
    extendHpDamageGhostHold(runtime, state, actualPct, now, options);
    if (now >= state.holdUntil && state.ghostPct > actualPct) {
        state.ghostPct = Math.max(actualPct, state.ghostPct - runtime.state.PLAYER_HP_DAMAGE_GHOST_DECAY_PCT_PER_SEC * elapsedSec);
    }
    state.lastPct = actualPct;
    state.lastAt = now;
    return state;
}

export function updatePlayerHpDamageGhost(runtime, actualPct) {
    let state = updateHpDamageGhostState(runtime, {
        ghostPct: runtime.state.playerHpDamageGhostPct,
        lastPct: runtime.state.playerHpDamageGhostLastPct,
        lastAt: runtime.state.playerHpDamageGhostLastAt,
        holdUntil: runtime.state.playerHpDamageGhostHoldUntil
        }, actualPct, runtime.deps.Date.now());
    runtime.state.playerHpDamageGhostPct = state.ghostPct;
    runtime.state.playerHpDamageGhostLastPct = state.lastPct;
    runtime.state.playerHpDamageGhostLastAt = state.lastAt;
    runtime.state.playerHpDamageGhostHoldUntil = state.holdUntil;
    return runtime.state.playerHpDamageGhostPct;
}

export function primeEnemyHpDamageGhost(runtime, enemyId, actualPct) {
    // A settlement's monsters are never drawn: their entries stayed in the table until the next frame pruned it (2026-10-27).
    if (enemyId === null || enemyId === undefined || runtime.deps.game.isBackgroundCalculation) return;
    let key = String(enemyId);
    if (runtime.state.enemyHpDamageGhostStates.has(key)) return;
    runtime.state.enemyHpDamageGhostStates.set(key, updateHpDamageGhostState(runtime, null, actualPct === undefined ? 100 : actualPct, runtime.deps.Date.now()));
}

export function updateEnemyHpDamageGhost(runtime, enemyId, actualPct) {
    if (enemyId === null || enemyId === undefined) return Math.max(0, Math.min(100, Number(actualPct) || 0));
    let key = String(enemyId);
    let now = runtime.deps.Date.now();
    let state = updateHpDamageGhostState(runtime, runtime.state.enemyHpDamageGhostStates.get(key) || null, actualPct, now);
    if (state.ghostPct > actualPct + 0.05) {
        if (!Number.isFinite(state.snapAt) || state.snapAt <= 0) state.snapAt = now + runtime.state.ENEMY_HP_DAMAGE_GHOST_SNAP_MS;
        if (now >= state.snapAt) {
            state.ghostPct = Math.max(0, Math.min(100, Number(actualPct) || 0));
            state.holdUntil = 0;
            state.snapAt = 0;
        }
    } else {
        state.snapAt = 0;
    }
    runtime.state.enemyHpDamageGhostStates.set(key, state);
    return state.ghostPct;
}

export function pruneEnemyHpDamageGhostStates(runtime, activeEnemyIds) {
    if (!runtime.state.enemyHpDamageGhostStates || runtime.state.enemyHpDamageGhostStates.size <= 0) return;
    let activeSet = new Set((activeEnemyIds || []).map(id => String(id)));
    Array.from(runtime.state.enemyHpDamageGhostStates.keys()).forEach(key => {
        if (!activeSet.has(key)) runtime.state.enemyHpDamageGhostStates.delete(key);
    });
}

function initialHpDamageGhost(runtime, actualPct, now, options) {
    let initialPct = Math.max(actualPct, Math.min(100, Number((options && options.initialGhostPct) || actualPct) || actualPct));
    return { ghostPct: initialPct, lastPct: initialPct, lastAt: now, holdUntil: initialPct > actualPct + 0.05 ? now + runtime.state.PLAYER_HP_DAMAGE_GHOST_HOLD_MS : 0 };
}


function extendHpDamageGhostHold(runtime, state, actualPct, now, options) {
    let continuousDecay = !!(options && options.continuousDecay);
    if (actualPct < state.lastPct - 0.05) {
        let isAlreadyTrailing = state.ghostPct > actualPct + 0.05;
        state.ghostPct = Math.max(state.ghostPct, state.lastPct);
        if (!continuousDecay || !isAlreadyTrailing) {
            state.holdUntil = now + runtime.state.PLAYER_HP_DAMAGE_GHOST_HOLD_MS;
        }
    } else if (actualPct > state.ghostPct) {
        state.ghostPct = actualPct;
    }
}
