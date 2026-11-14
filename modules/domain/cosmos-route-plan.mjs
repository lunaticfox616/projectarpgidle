import { cosmosJourneyCurrent, cosmosJourneyActive } from './cosmos-route-state.mjs';

export function cosmosJourneyItinerary(env, state, route) {
    const rng = env.deps.createSeededRng(route.seed);
    const cleared = new Set(state.cosmosAtlas.cleared);
    const used = new Set([...route.history.map(row => row.id), ...route.queue]);
    const preferred = new Set(route.goal === 'dust' ? env.deps.COSMOS_ROUTE_G1.planets : env.deps.COSMOS_ROUTE_G1.asteroids);
    const pool = [...env.deps.COSMOS_ROUTE_G1.planets, ...env.deps.COSMOS_ROUTE_G1.asteroids]
        .filter(id => !used.has(id)).map(id => ({ id, rank: rng() }))
        .sort((a, b) => Number(cleared.has(a.id)) - Number(cleared.has(b.id))
            || Number(preferred.has(b.id)) - Number(preferred.has(a.id)) || a.rank - b.rank)
        .map(row => row.id);
    return [0, 1, 2, 3, 4].map(stage => {
        if (stage === 0) return [env.deps.COSMOS_ROUTE_G1.start];
        if (stage === 4) return [env.deps.COSMOS_ROUTE_G1.boss];
        const visited = route.history.filter(row => row.stage === stage).map(row => row.id);
        const pending = stage === route.stage ? route.queue : [];
        const fixed = [...visited, ...pending];
        return [...fixed, ...pool.splice(0, route.legSize - fixed.length)];
    });
}

export function cosmosJourneyPreview(env, state, galaxy = 1) {
    const board = state.cosmosRouteBoard;
    const definition = env.deps.COSMOS_ROUTE_GALAXIES[galaxy];
    const rng = env.deps.createSeededRng(board.seed);
    const shuffled = [...definition.middle]
        .map(id => ({id, rank:rng()})).sort((a,b) => a.rank - b.rank).map(row => row.id);
    const ids = [definition.start, ...shuffled, definition.boss];
    let offset = 0;
    const plan = definition.lengths.map(size => { const leg = ids.slice(offset, offset + size); offset += size; return leg; });
    return { seed:board.seed, goal:board.goal, version:5, galaxy, stage:0, legSize:8, history:[], queue:[], plan,
        decisions:{...board.decisions} };
}

/** Canonical encounter style for a new route; old saved expeditions keep their original combat. */
export function cosmosJourneyHabitat(env, state, nodeId = cosmosJourneyCurrent(state)) {
    if (!cosmosJourneyActive(state) || cosmosJourneyCurrent(state) !== nodeId) return null;
    if (state.cosmosRoute.version >= 4) return cosmosJourneyPlanetHabitat(env, nodeId);
    return state.cosmosRoute.habitats?.[state.cosmosRoute.stage] || null;
}

export function cosmosJourneyPlanetHabitat(env, nodeId) {
    return env.deps.COSMOS_ROUTE_G1.habitatByNode[nodeId] || ['swarm','guard','storm'][Number(nodeId.split('-')[1])%3];
}

/** Version 1 saves retain the current encounter and choices; unchosen branches use safe observation. */
export function cosmosJourneyUpgrade(env, state) {
    const route = state.cosmosRoute;
    route.seed = 1;
    route.decisions = { 1: 'survey', 3: 'survey', ...route.decisions };
    route.plan = cosmosJourneyItinerary(env, state, route);
    route.version = 2;
    if (route.phase !== 'choice') return;
    // A legacy junction stays paused until the player confirms its remaining plan in the new UI.
    route.phase = 'returned';
    route.queue = [];
    state.combatHalted = true;
}
