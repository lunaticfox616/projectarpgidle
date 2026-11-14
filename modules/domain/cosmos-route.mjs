// Domain-only route planning. Atlas owns battle entry and payment; the UI reads these results.
import { cosmosJourneyActive, cosmosJourneyCurrent, cosmosJourneyRetryRemaining, cosmosJourneyUnlocked, cosmosJourneyWaiting } from './cosmos-route-state.mjs';
import { cosmosJourneyStart, cosmosJourneyComplete, cosmosJourneyDirective, cosmosJourneyStop, cosmosJourneyLeave, cosmosJourneyReconcileDeparture } from './cosmos-route-progress.mjs';
import { cosmosJourneyPreview, cosmosJourneyUpgrade, cosmosJourneyPlanetHabitat, cosmosJourneyHabitat } from './cosmos-route-plan.mjs';
import { cosmosJourneyTickGravity, cosmosJourneyGravityView } from './cosmos-route-gravity.mjs';
import { cosmosJourneyEncounter, cosmosJourneyMechanic, cosmosJourneyModifyEncounter, cosmosJourneyEncounterProfile, cosmosJourneyEnemyElement } from './cosmos-route-encounters.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createCosmosRoute(deps) {
    const env = { deps };

    return { active: cosmosJourneyActive, current: cosmosJourneyCurrent, start: (...args) => cosmosJourneyStart(env, ...args), preview: (...args) => cosmosJourneyPreview(env, ...args), retryRemaining: (...args) => cosmosJourneyRetryRemaining(env, ...args), upgrade: (...args) => cosmosJourneyUpgrade(env, ...args), unlocked: (...args) => cosmosJourneyUnlocked(env, ...args), planetHabitat: (...args) => cosmosJourneyPlanetHabitat(env, ...args), tickGravity: (...args) => cosmosJourneyTickGravity(env, ...args), gravityView: (...args) => cosmosJourneyGravityView(env, ...args),
    complete: (...args) => cosmosJourneyComplete(env, ...args), directive: (...args) => cosmosJourneyDirective(env, ...args), habitat: (...args) => cosmosJourneyHabitat(env, ...args), encounter: (...args) => cosmosJourneyEncounter(env, ...args), mechanic: (...args) => cosmosJourneyMechanic(env, ...args), modifyEncounter: (...args) => cosmosJourneyModifyEncounter(env, ...args), encounterProfile: (...args) => cosmosJourneyEncounterProfile(env, ...args), enemyElement: (...args) => cosmosJourneyEnemyElement(env, ...args), stop: (...args) => cosmosJourneyStop(env, ...args), leave: (...args) => cosmosJourneyLeave(env, ...args), reconcileDeparture: (...args) => cosmosJourneyReconcileDeparture(env, ...args), waiting: cosmosJourneyWaiting };
}
