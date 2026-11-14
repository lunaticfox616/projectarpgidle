import { createCosmosRoute } from './domain/cosmos-route.mjs';

const rules = createCosmosRoute({
    routeNow: () => Date.now(),
    get COSMOS_ROUTE_GALAXIES() { return COSMOS_ROUTE_GALAXIES; },
    get isMapPrimaryContentUnlocked() { return isMapPrimaryContentUnlocked; },
    get createSeededRng() { return createSeededRng; },
    get COSMOS_ROUTE_G1() { return COSMOS_ROUTE_G1; },
    get COSMOS_MECHANIC_DB() { return COSMOS_MECHANIC_DB; },
    get resolveCosmosMechanic() { return typeof resolveCosmosMechanic === 'undefined' ? undefined : resolveCosmosMechanic; },
    get COSMOS_EXPEDITION_DIRECTIVE_DB() { return COSMOS_EXPEDITION_DIRECTIVE_DB; },
    get actExplorationState() { return actExplorationState; },
    get COSMOS_GRAVITY_FIELD() { return COSMOS_GRAVITY_FIELD; },
    get actExplorationMap() { return actExplorationMap; },
    get actExplorationRooms() { return actExplorationRooms; },
    get hasGridCell() { return hasGridCell; },
    get getCombatTime() { return getCombatTime; },
    get gridStepToward() { return gridStepToward; },
    get getGridBlockedCells() { return getGridBlockedCells; }
});
// Keep the legacy mutable facade and method order until its consumers are native.
const cosmosRouteRuntime = {
    ...rules,
    tickGravity: () => rules.tickGravity(game),
    gravityView: () => rules.gravityView(game)
};
safeExposeGlobals({ cosmosRouteRuntime });
