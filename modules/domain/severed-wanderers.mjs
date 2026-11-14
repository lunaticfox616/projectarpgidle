import { wandererCanRollSeveredWanderer, wandererBuildSeveredWandererLoadout, wandererApplySeveredWandererLoadout, wandererMaybeApplySeveredWanderer } from './severed-wanderers-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createSeveredWanderers(deps) {
    const env = { deps };

    return Object.freeze({
        canRollSeveredWanderer: (...args) => wandererCanRollSeveredWanderer(env, ...args),
        buildSeveredWandererLoadout: (...args) => wandererBuildSeveredWandererLoadout(env, ...args),
        applySeveredWandererLoadout: (...args) => wandererApplySeveredWandererLoadout(env, ...args),
        maybeApplySeveredWanderer: (...args) => wandererMaybeApplySeveredWanderer(env, ...args)
    });
}
