

export function cosmosJourneyActive(state) {
    return !!state.cosmosRoute && state.cosmosRoute.phase === 'fighting';
}

export function cosmosJourneyCurrent(state) {
    return cosmosJourneyActive(state) ? state.cosmosRoute.queue[0] || null : null;
}

export function cosmosJourneyRetryRemaining(env, state, now = env.deps.routeNow()) {
    return Math.max(0, state.cosmosRouteBoard.retryAt - now);
}

export function cosmosJourneyUnlocked(env, state, galaxy) {
    if (!env.deps.COSMOS_ROUTE_GALAXIES[galaxy] || !env.deps.isMapPrimaryContentUnlocked(state,'map-tab-cosmos')) return false;
    return galaxy === 1 || state.cosmosAtlas.bossClears.includes(env.deps.COSMOS_ROUTE_GALAXIES[galaxy-1].boss);
}

export function cosmosJourneyWaiting(state) {
    return state.currentZoneId === 'cosmos_challenge' && !!state.cosmosRoute
        && !!state.cosmosAtlas.activeChallenge?.route && state.cosmosRoute.phase !== 'fighting';
}
