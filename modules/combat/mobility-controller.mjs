import { mobilityIsGem, mobilityEquipped, mobilityBaseCooldownMs, mobilityCooldownMs,
    mobilityRequest, mobilityBusy } from './mobility-rules.mjs';
import { mobilityAdvance, mobilityCast } from './mobility-cast.mjs';

function mobilityReset(memo, keepCooldown = false) {
    memo.runtime = null;
    if (!keepCooldown) memo.cooldownUntil = 0;
    memo.lastStats = null;
    memo.requestedAt = null;
}

function mobilityRestore(memo, snapshot) {
    ({ runtime: memo.runtime, cooldownUntil: memo.cooldownUntil, lastStats: memo.lastStats }
        = snapshot || { runtime: null, cooldownUntil: 0, lastStats: null });
    memo.requestedAt = Number.isFinite(snapshot?.requestedAt) ? snapshot.requestedAt : null;
}

/** One controller per combat runtime, captured/restored by replay without spending the live key request. */
export function createMobilityController(deps) {
    const memo = { runtime: null, cooldownUntil: 0, lastStats: null, swappedMain: null, requestedAt: null };
    const env = { deps, memo };
    return Object.freeze({
        isMobilityGem: name => mobilityIsGem(env, name),
        equipped: state => mobilityEquipped(env, state),
        baseCooldownMs: name => mobilityBaseCooldownMs(env, name),
        cooldownMs: (name, stats) => mobilityCooldownMs(env, name, stats),
        advance: () => mobilityAdvance(env),
        request: now => mobilityRequest(env, now),
        cast: gate => mobilityCast(env, gate),
        moving: () => mobilityBusy(memo.runtime) || (mobilityIsGem(env, deps.owner.activeSkill) && mobilityBusy(deps.mainCasts)),
        mainGem: () => memo.swappedMain ?? deps.owner.activeSkill,
        cooldownLeft: (now = deps.getCombatTime()) => Math.max(0, memo.cooldownUntil - now),
        reset: keepCooldown => mobilityReset(memo, keepCooldown),
        castState: () => memo.runtime,
        capture: () => ({ runtime: memo.runtime, cooldownUntil: memo.cooldownUntil, lastStats: memo.lastStats, requestedAt: memo.requestedAt }),
        restore: snapshot => mobilityRestore(memo, snapshot)
    });
}
