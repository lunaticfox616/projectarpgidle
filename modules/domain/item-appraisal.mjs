/** Deterministic NPC resale appraisal; never reads the current build, asking price or random state.
 * breakdown and affixes[].value are private quality scores, rounded to 0.01 (not currency quantities).
 * marketValue is continuous dew value; fair/ceiling are integer counts of the requested currency.
 * Affix quality is a 0..100 percentile. No scoring or demand internals belong in the player-facing UI.
 * Fixed-value options are fully rolled (100%); unknown legacy ranges use a neutral 50%.
 */
import { appraisalQuote, appraisalAffinity, appraisalUnitValue } from './item-appraisal-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createItemAppraisal(deps) {
    const env = { deps };
    env.tuning = env.deps.PLAYER_STALL_APPRAISAL;
    env.weights = new Map(env.tuning.statGroups.flatMap(group => group.ids.map(id => [id, group.weight])));
    env.references = new Map();
    return Object.freeze({ quote: (...args) => appraisalQuote(env, ...args), affinity: appraisalAffinity, unitValue: (...args) => appraisalUnitValue(env, ...args) });
}
