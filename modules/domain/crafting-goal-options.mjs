// Read-only candidates from the same pools used by currency/fossil crafting. No RNG or payment.
import { craftGoalGet, craftGoalTags, craftGoalCatalogue, craftGoalRehearsalReason, craftGoalRehearse, craftGoalStudy, craftGoalRehearseStudy } from './crafting-goal-options-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createCraftingGoalOptions(deps) {
    const env = { deps };

    return Object.freeze({ get: (...args) => craftGoalGet(env, ...args), tags: (...args) => craftGoalTags(env, ...args), catalogue: (...args) => craftGoalCatalogue(env, ...args), rehearsalReason: (...args) => craftGoalRehearsalReason(env, ...args), rehearse: (...args) => craftGoalRehearse(env, ...args), study: (...args) => craftGoalStudy(env, ...args), rehearseStudy: (...args) => craftGoalRehearseStudy(env, ...args) });
}
