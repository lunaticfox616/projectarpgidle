import { meteorEnsureMeteorSiteState, meteorRollMeteorKind, meteorGetMeteorKind } from './meteor-progress-state.mjs';
import { meteorTryUnlockMeteorContentByProgress, meteorGetSkyRiftGaugeEffectiveTier, meteorGainSkyRiftGaugeFromCombat } from './meteor-progress-gauge.mjs';
import { meteorGrantMeteorEncounterRewards } from './meteor-progress-rewards.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createMeteorProgress(deps) {
    const env = { deps };

    return Object.freeze({
        ensureMeteorSiteState: (...args) => meteorEnsureMeteorSiteState(env, ...args),
        rollMeteorKind: (...args) => meteorRollMeteorKind(env, ...args),
        getMeteorKind: (...args) => meteorGetMeteorKind(env, ...args),
        tryUnlockMeteorContentByProgress: (...args) => meteorTryUnlockMeteorContentByProgress(env, ...args),
        getSkyRiftGaugeEffectiveTier: meteorGetSkyRiftGaugeEffectiveTier,
        gainSkyRiftGaugeFromCombat: (...args) => meteorGainSkyRiftGaugeFromCombat(env, ...args),
        grantMeteorEncounterRewards: (...args) => meteorGrantMeteorEncounterRewards(env, ...args)
    });
}
