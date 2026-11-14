/** Restore the additive route ledger; invalid routes never grant rewards or change exploration records. */
export function restoreCosmosRouteSave(deps, state) {
    restoreCosmosRouteBoard(deps, state);
    const route = state.cosmosRoute;
    if (!route) { state.cosmosRoute = null; return; }
    if (!isValidCosmosRouteSave(deps, route)) {
        deps.console.warn('Invalid cosmos route save discarded; earned rewards and atlas records retained.');
        state.cosmosRoute = null;
        return;
    }
    state.cosmosRoute = JSON.parse(JSON.stringify(route));
    if (route.version === 1) deps.cosmosRouteRuntime.upgrade(state);
    const active = ['fighting', 'choice'].includes(route.phase);
    if (!active) return;
    if (route.loop !== state.season || state.currentZoneId !== 'cosmos_challenge') {
        state.cosmosRoute.phase = 'returned';
        state.cosmosRoute.queue = [];
        return;
    }
    if (route.phase === 'choice') state.combatHalted = true;
    else if (state.cosmosAtlas.activeChallenge?.nodeId !== route.queue[0]) {
        state.cosmosRoute.phase = 'returned';
        state.cosmosRoute.queue = [];
    }
}

export function isValidCosmosRouteSave(deps, route) {
    if ([3,4,5].includes(route.version)) return isValidCosmosExpeditionSave(deps, route);
    return isValidLegacyCosmosRouteSave(deps, route);
}

export function isValidLegacyCosmosRouteSave(deps, route) {
    if (![1, 2].includes(route.version) || !['dust', 'boss'].includes(route.goal)) return false;
    if (!['fighting', 'choice', 'complete', 'failed', 'returned'].includes(route.phase)) return false;
    if (![0, 1, 2, 3, 4, 5].includes(route.stage)) return false;
    if (![1, 2, 3, 4, 5].includes(route.legSize)) return false;
    if (!Number.isFinite(route.loop) || !Number.isFinite(route.dust) || route.dust < 0) return false;
    return isValidCosmosRouteLedger(deps, route) && isValidCosmosRouteVersion(deps, route);
}

export function isValidCosmosRouteVersion(deps, route) {
    return route.version === 1 || isValidCosmosRoutePlan(deps, route);
}

export function restoreCosmosRouteBoard(deps, state) {
    const saved = state.cosmosRouteBoard;
    const defaults = deps.defaultGame.cosmosRouteBoard;
    const board = saved && typeof saved === 'object' ? saved : defaults;
    state.cosmosRouteBoard = {
        seed: Number.isSafeInteger(board.seed) ? Math.max(1, Math.min(1000000000, board.seed)) : 1,
        selected: [0, 1, 2].includes(board.selected) ? board.selected : 0,
        goal: ['dust', 'boss'].includes(board.goal) ? board.goal : 'dust',
        retryAt: Number.isFinite(board.retryAt) ? Math.max(0, Math.min(board.retryAt, Date.now() + deps.COSMOS_ROUTE_G1.retryMs)) : 0,
        decisions: { ...defaults.decisions },
        habitats: defaults.habitats.map((id, index) => Object.hasOwn(deps.COSMOS_ROUTE_G1.habitats, board.habitats?.[index]) ? board.habitats[index] : id)
    };
    for (const stage of [1, 3]) {
        const signal = board.decisions?.[stage];
        if (deps.COSMOS_ROUTE_G1.choices[stage].includes(signal)) state.cosmosRouteBoard.decisions[stage] = signal;
    }
}

export function isValidCosmosExpeditionSave(deps, route) {
    if (!['fighting','complete','failed','returned'].includes(route.phase)) return false;
    if (!Number.isSafeInteger(route.seed) || !Number.isFinite(route.loop) || !['dust','boss'].includes(route.goal)) return false;
    const definition = deps.COSMOS_ROUTE_GALAXIES[route.version === 5 ? route.galaxy : 1];
    return !!definition && isValidCosmosExpeditionPlan(deps, route, definition) && isValidCosmosExpeditionLedger(route) && isValidCosmosExpeditionPhase(route);
}

export function isValidCosmosExpeditionPlan(deps, route, definition) {
    if (!Array.isArray(route.plan) || route.plan.length !== 4) return false;
    if (!route.plan.every((ids,i) => Array.isArray(ids) && ids.length === definition.lengths[i])) return false;
    if (route.version === 3 && !isValidLegacyCosmosHabitats(deps, route.habitats)) return false;
    const ids = route.plan.flat(), expected = new Set([definition.start,definition.boss,...definition.middle]);
    if (ids[0] !== definition.start || ids.at(-1) !== definition.boss) return false;
    return new Set(ids.filter(id => expected.has(id))).size === definition.total;
}

export function isValidCosmosExpeditionLedger(route) {
    if (!Array.isArray(route.history) || !Array.isArray(route.queue) || route.history.length > route.plan.flat().length) return false;
    if (!Number.isFinite(route.dust) || route.dust < 0) return false;
    const ledger = route.plan.flatMap((leg,stage) => leg.map(id => ({id,stage})));
    if (!route.history.every((row,i) => row?.id === ledger[i].id && row.stage === ledger[i].stage && Number.isFinite(row.dust) && row.dust >= 0)) return false;
    return route.history.reduce((sum,row) => sum + row.dust,0) === route.dust;
}

export function isValidLegacyCosmosHabitats(deps, habitats) {
    return Array.isArray(habitats) && habitats.length === 4 && habitats[3] === 'guard'
        && habitats.every(id => Object.hasOwn(deps.COSMOS_ROUTE_G1.habitats,id));
}

export function isValidCosmosExpeditionPhase(route) {
    if (route.phase === 'complete') return route.stage === 4 && route.history.length === route.plan.flat().length && route.queue.length === 0;
    if (![0,1,2,3].includes(route.stage)) return false;
    if (route.phase !== 'fighting') return route.queue.length === 0;
    const ledger = route.plan.flatMap((leg,stage) => leg.map(id => ({id,stage})));
    return ledger[route.history.length]?.stage === route.stage && isValidCosmosRoutePlanProgress(route);
}

export function isValidCosmosRoutePlan(deps, route) {
    if (!Number.isInteger(route.seed) || !Array.isArray(route.plan) || route.plan.length !== 5) return false;
    if (![1, 3].every(stage => deps.COSMOS_ROUTE_G1.choices[stage].includes(route.decisions[stage]))) return false;
    if (!route.plan.every((leg, stage) => Array.isArray(leg) && leg.length === (stage % 4 === 0 ? 1 : route.legSize))) return false;
    if (route.plan[0][0] !== deps.COSMOS_ROUTE_G1.start || route.plan[4][0] !== deps.COSMOS_ROUTE_G1.boss) return false;
    const middle = route.plan.slice(1, 4).flat();
    const pool = new Set([...deps.COSMOS_ROUTE_G1.planets, ...deps.COSMOS_ROUTE_G1.asteroids]);
    if (new Set(middle).size !== middle.length || !middle.every(id => pool.has(id))) return false;
    return isValidCosmosRoutePlanProgress(route);
}

export function isValidCosmosRoutePlanProgress(route) {
    if (!Array.isArray(route.history)) return false;
    if (!route.history.every(row => route.plan[row.stage]?.includes(row.id))) return false;
    if (route.phase !== 'fighting') return true;
    const remaining = route.plan[route.stage].filter(id => !route.history.some(row => row.id === id));
    return JSON.stringify(route.queue) === JSON.stringify(remaining);
}

export function isValidCosmosRouteLedger(deps, route) {
    const ids = new Set([deps.COSMOS_ROUTE_G1.start, deps.COSMOS_ROUTE_G1.boss,
        ...deps.COSMOS_ROUTE_G1.planets, ...deps.COSMOS_ROUTE_G1.asteroids]);
    if (!Array.isArray(route.queue) || !Array.isArray(route.history) || route.history.length > 17) return false;
    if (!isValidCosmosRoutePhase(route)) return false;
    if (!route.queue.every(id => ids.has(id)) || route.queue.length > 5) return false;
    if (!route.history.every(row => row && ids.has(row.id) && Number.isFinite(row.dust) && row.dust >= 0)) return false;
    const combined = [...route.queue, ...route.history.map(row => row.id)];
    if (new Set(combined).size !== combined.length) return false;
    return true;
}

export function isValidCosmosRoutePhase(route) {
    if (!route.decisions || typeof route.decisions !== 'object') return false;
    if (!['survey', 'salvage', 'rift'].includes(route.signal)) return false;
    if (route.phase === 'complete') return route.stage === 5;
    if (route.phase === 'choice') return [1, 3].includes(route.stage) && route.queue.length === 0;
    if (route.phase === 'fighting') return route.stage < 5 && route.queue.length > 0;
    return route.queue.length === 0;
}
