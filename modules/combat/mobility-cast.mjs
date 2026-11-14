import { mobilityEquipped, mobilityCooldownMs, mobilityRequested, mobilityReady,
    mobilityReachable, mobilityEvadeRoute } from './mobility-rules.mjs';

const RETRY_MS = 400;

/** Synchronous legacy-slot bridge. Main casts remain intact even when a cast throws.
 * The final shared runtime entry will replace the injected mainCasts/owner ports. */
export function mobilityWithGem(env, name, fn) {
    const main = env.deps.owner.activeSkill, mainRuntime = env.deps.mainCasts;
    env.memo.swappedMain = main;
    env.deps.owner.activeSkill = name;
    env.deps.mainCasts = env.memo.runtime;
    try { return fn(); }
    finally {
        env.memo.runtime = env.deps.mainCasts;
        env.deps.mainCasts = mainRuntime;
        env.deps.owner.activeSkill = main;
        env.memo.swappedMain = null;
    }
}

export function mobilityAdvance(env) {
    const name = mobilityEquipped(env);
    if (!name) { env.memo.runtime = null; return; }
    if (env.memo.runtime) mobilityWithGem(env, name, () => env.deps.updateSkillGemCombat(env.memo.lastStats));
}

export function* mobilityEvade(env, name, now, stats) {
    const route = mobilityEvadeRoute(env);
    if (!route) return false;
    const from = { gx: env.deps.owner.gridPlayer.gx, gy: env.deps.owner.gridPlayer.gy };
    env.deps.actExplorationMotion.cancel(env.deps.owner.actExploration);
    Object.assign(env.deps.owner.gridPlayer, route.destination, { gridMoveTimer: 0 });
    env.deps.combatTacticsRuntime.attackDelayUntil = Math.max(env.deps.combatTacticsRuntime.attackDelayUntil, now + 180);
    env.deps.combatTacticsRuntime.recoverUntil = 0;
    yield { kind: 'addBattleFx', args: ['playerMobility', { fromCell: from, toCell: route.destination, duration: 180 }] };
    env.memo.cooldownUntil = now + mobilityCooldownMs(env, name, stats);
    env.memo.requestedAt = null;
    return true;
}

/** gate: main-cast blocked/inRange/auto/stats. A manual escape precedes the ordinary cast gate. */
export function* mobilityCast(env, gate) {
    const name = mobilityEquipped(env), now = env.deps.getCombatTime();
    if (!name || now < env.memo.cooldownUntil || env.deps.owner.playerHp <= 0 || env.deps.owner.combatHalted) return false;
    if (mobilityRequested(env, now) && (yield* mobilityEvade(env, name, now, gate.stats))) return true;
    if (!mobilityReady(env, name, gate, now) || !mobilityReachable(env, name)) return false;
    return mobilityWithGem(env, name, () => {
        const stats = env.deps.getPlayerStats(false);
        if (!env.deps.getSkillTargets(stats).length) { env.memo.cooldownUntil = now + RETRY_MS; return false; }
        env.memo.lastStats = stats;
        env.memo.cooldownUntil = now + mobilityCooldownMs(env, name, stats);
        env.memo.requestedAt = null;
        env.deps.actExplorationMotion.cancel(env.deps.owner.actExploration);
        env.deps.combatTacticsRuntime.recoverUntil = 0;
        env.deps.performPlayerAttack(stats, { skillName: name });
        return true;
    });
}
