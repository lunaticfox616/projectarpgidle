import { cosmosJourneyActive, cosmosJourneyRetryRemaining, cosmosJourneyUnlocked, cosmosJourneyCurrent } from './cosmos-route-state.mjs';
import { cosmosJourneyPreview } from './cosmos-route-plan.mjs';

export function cosmosJourneyStart(env, state, galaxy = 1) {
    if (cosmosJourneyActive(state) || cosmosJourneyRetryRemaining(env, state)) return false;
    if (!cosmosJourneyUnlocked(env, state, galaxy)) return false;
    const planned = cosmosJourneyPreview(env, state, galaxy);
    state.cosmosRoute = {
        version: 5, galaxy, loop: state.season, phase: 'fighting', stage: 0, goal: planned.goal,
        seed: planned.seed, plan: planned.plan, legSize: planned.legSize, signal: 'survey',
        queue: [...planned.plan[0]], history: [], dust: 0, decisions: planned.decisions
    };
    return true;
}

export function cosmosJourneyNextBoard(env, state, failed) {
    const board = state.cosmosRouteBoard;
    board.seed = board.seed % 1000000000 + 1;
    board.selected = 0;
    board.goal = state.cosmosRoute.goal;
    board.decisions = { ...state.cosmosRoute.decisions };
    if (state.cosmosRoute.version === 3) board.habitats = state.cosmosRoute.habitats.slice(0,3);
    board.retryAt = failed ? env.deps.routeNow() + env.deps.COSMOS_ROUTE_G1.retryMs : 0;
}

/** Records already-paid dust once. Preselected branches never pause the combat scheduler. */
export function cosmosJourneyComplete(env, state, nodeId, dust) {
    const route = state.cosmosRoute;
    if (cosmosJourneyCurrent(state) !== nodeId) return false;
    route.history.push({ id: nodeId, dust, stage: route.stage });
    route.dust += dust;
    route.queue.shift();
    if (route.queue.length) return true;
    route.stage++;
    if (route.stage === route.plan.length) {
        route.phase = 'complete';
        cosmosJourneyNextBoard(env, state, false);
    } else {
        route.signal = route.version >= 3 ? 'survey' : route.decisions[route.stage] || route.signal;
        route.queue = [...route.plan[route.stage]];
    }
    return true;
}

export function cosmosJourneyDirective(env, state, nodeId) {
    if (cosmosJourneyCurrent(state) !== nodeId) return null;
    return env.deps.COSMOS_EXPEDITION_DIRECTIVE_DB.find(row => row.id === state.cosmosRoute.signal);
}

export function cosmosJourneyStop(env, state, phase = 'returned') {
    if (!cosmosJourneyActive(state)) return false;
    const route = state.cosmosRoute;
    if (phase === 'failed') {
        route.failedNode = cosmosJourneyCurrent(state);
        cosmosJourneyNextBoard(env, state, true);
    }
    route.phase = phase;
    route.queue = [];
    return true;
}

export function cosmosJourneyLeave(env, state, phase = 'returned') {
    if (!cosmosJourneyStop(env, state, phase)) return false;
    state.cosmosAtlas.activeChallenge = null;
    if (state.currentZoneId === 'cosmos_challenge') state.currentZoneId = state.maxZoneId;
    return true;
}

export function cosmosJourneyReconcileDeparture(env, state) {
    if (cosmosJourneyActive(state) && state.currentZoneId !== 'cosmos_challenge') cosmosJourneyStop(env, state);
}
