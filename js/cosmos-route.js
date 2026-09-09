// Domain-only route planning. Atlas owns battle entry and payment; the UI reads these results.
const cosmosRouteRuntime = (() => {
    function active(state) {
        return !!state.cosmosRoute && state.cosmosRoute.phase === 'fighting';
    }

    function current(state) {
        return active(state) ? state.cosmosRoute.queue[0] || null : null;
    }

    function retryRemaining(state, now = Date.now()) {
        return Math.max(0, state.cosmosRouteBoard.retryAt - now);
    }

    function itinerary(state, route) {
        const rng = createSeededRng(route.seed);
        const cleared = new Set(state.cosmosAtlas.cleared);
        const used = new Set([...route.history.map(row => row.id), ...route.queue]);
        const preferred = new Set(route.goal === 'dust' ? COSMOS_ROUTE_G1.planets : COSMOS_ROUTE_G1.asteroids);
        const pool = [...COSMOS_ROUTE_G1.planets, ...COSMOS_ROUTE_G1.asteroids]
            .filter(id => !used.has(id)).map(id => ({ id, rank: rng() }))
            .sort((a, b) => Number(cleared.has(a.id)) - Number(cleared.has(b.id))
                || Number(preferred.has(b.id)) - Number(preferred.has(a.id)) || a.rank - b.rank)
            .map(row => row.id);
        return [0, 1, 2, 3, 4].map(stage => {
            if (stage === 0) return [COSMOS_ROUTE_G1.start];
            if (stage === 4) return [COSMOS_ROUTE_G1.boss];
            const visited = route.history.filter(row => row.stage === stage).map(row => row.id);
            const pending = stage === route.stage ? route.queue : [];
            const fixed = [...visited, ...pending];
            return [...fixed, ...pool.splice(0, route.legSize - fixed.length)];
        });
    }

    function preview(state, galaxy = 1) {
        const board = state.cosmosRouteBoard;
        const definition = COSMOS_ROUTE_GALAXIES[galaxy];
        const rng = createSeededRng(board.seed);
        const shuffled = [...definition.middle]
            .map(id => ({id, rank:rng()})).sort((a,b) => a.rank - b.rank).map(row => row.id);
        const ids = [definition.start, ...shuffled, definition.boss];
        let offset = 0;
        const plan = definition.lengths.map(size => { const leg = ids.slice(offset, offset + size); offset += size; return leg; });
        return { seed:board.seed, goal:board.goal, version:5, galaxy, stage:0, legSize:8, history:[], queue:[], plan,
            decisions:{...board.decisions} };
    }

    /** Canonical encounter style for a new route; old saved expeditions keep their original combat. */
    function habitat(state, nodeId = current(state)) {
        if (!active(state) || current(state) !== nodeId) return null;
        if (state.cosmosRoute.version >= 4) return planetHabitat(nodeId);
        return state.cosmosRoute.habitats?.[state.cosmosRoute.stage] || null;
    }

    function encounter(zone, isBoss = false) {
        return !isBoss && zone?.type === 'cosmos' ? COSMOS_ROUTE_G1.habitats[zone.cosmosHabitat] || null : null;
    }

    function planetHabitat(nodeId) {
        return COSMOS_ROUTE_G1.habitatByNode[nodeId] || ['swarm','guard','storm'][Number(nodeId.split('-')[1])%3];
    }

    function unlocked(state, galaxy) {
        if (!COSMOS_ROUTE_GALAXIES[galaxy] || !isMapPrimaryContentUnlocked(state,'map-tab-cosmos')) return false;
        return galaxy === 1 || state.cosmosAtlas.bossClears.includes(COSMOS_ROUTE_GALAXIES[galaxy-1].boss);
    }

    function start(state, galaxy = 1) {
        if (active(state) || retryRemaining(state)) return false;
        if (!unlocked(state, galaxy)) return false;
        const planned = preview(state, galaxy);
        state.cosmosRoute = {
            version: 5, galaxy, loop: state.season, phase: 'fighting', stage: 0, goal: planned.goal,
            seed: planned.seed, plan: planned.plan, legSize: planned.legSize, signal: 'survey',
            queue: [...planned.plan[0]], history: [], dust: 0, decisions: planned.decisions
        };
        return true;
    }

    function mechanic(zone, isBoss, seed) {
        const profile = encounter(zone, isBoss);
        return COSMOS_MECHANIC_DB.find(row => row.id === profile?.trait)
            || (typeof resolveCosmosMechanic === 'function' ? resolveCosmosMechanic(String(zone.cosmosTag || '').trim() || 'stellar', seed) : null);
    }

    function modifyEncounter(modifiers, zone, isBoss) {
        const profile = encounter(zone, isBoss);
        if (!profile) return modifiers;
        modifiers.hpMul *= profile.hp;
        modifiers.damageMul *= profile.damage;
        modifiers.attackSpeedMul *= profile.speed;
        modifiers.traitName = `${profile.name} · ${modifiers.traitName}`;
        return modifiers;
    }

    function encounterProfile(zone, ordinary) {
        const profile = encounter(zone);
        if (!profile) return ordinary;
        return {markerCount:profile.markerCount,minPack:profile.minPack,maxPack:profile.maxPack,
            eliteChance:profile.eliteChance,bossAdds:profile.bossAdds,label:profile.name};
    }

    function enemyElement(zone, isBoss, ordinary) {
        return encounter(zone, isBoss)?.element || ordinary;
    }

    function nextBoard(state, failed) {
        const board = state.cosmosRouteBoard;
        board.seed = board.seed % 1000000000 + 1;
        board.selected = 0;
        board.goal = state.cosmosRoute.goal;
        board.decisions = { ...state.cosmosRoute.decisions };
        if (state.cosmosRoute.version === 3) board.habitats = state.cosmosRoute.habitats.slice(0,3);
        board.retryAt = failed ? Date.now() + COSMOS_ROUTE_G1.retryMs : 0;
    }

    /** Records already-paid dust once. Preselected branches never pause the combat scheduler. */
    function complete(state, nodeId, dust) {
        const route = state.cosmosRoute;
        if (current(state) !== nodeId) return false;
        route.history.push({ id: nodeId, dust, stage: route.stage });
        route.dust += dust;
        route.queue.shift();
        if (route.queue.length) return true;
        route.stage++;
        if (route.stage === route.plan.length) {
            route.phase = 'complete';
            nextBoard(state, false);
        } else {
            route.signal = route.version >= 3 ? 'survey' : route.decisions[route.stage] || route.signal;
            route.queue = [...route.plan[route.stage]];
        }
        return true;
    }

    function directive(state, nodeId) {
        if (current(state) !== nodeId) return null;
        return COSMOS_EXPEDITION_DIRECTIVE_DB.find(row => row.id === state.cosmosRoute.signal);
    }

    function stop(state, phase = 'returned') {
        if (!active(state)) return false;
        const route = state.cosmosRoute;
        if (phase === 'failed') {
            route.failedNode = current(state);
            nextBoard(state, true);
        }
        route.phase = phase;
        route.queue = [];
        return true;
    }

    function leave(state, phase = 'returned') {
        if (!stop(state, phase)) return false;
        state.cosmosAtlas.activeChallenge = null;
        if (state.currentZoneId === 'cosmos_challenge') state.currentZoneId = state.maxZoneId;
        return true;
    }

    function reconcileDeparture(state) {
        if (active(state) && state.currentZoneId !== 'cosmos_challenge') stop(state);
    }

    function waiting(state) {
        return state.currentZoneId === 'cosmos_challenge' && !!state.cosmosRoute
            && !!state.cosmosAtlas.activeChallenge?.route && state.cosmosRoute.phase !== 'fighting';
    }

    /** Version 1 saves retain the current encounter and choices; unchosen branches use safe observation. */
    function upgrade(state) {
        const route = state.cosmosRoute;
        route.seed = 1;
        route.decisions = { 1: 'survey', 3: 'survey', ...route.decisions };
        route.plan = itinerary(state, route);
        route.version = 2;
        if (route.phase !== 'choice') return;
        // A legacy junction stays paused until the player confirms its remaining plan in the new UI.
        route.phase = 'returned';
        route.queue = [];
        state.combatHalted = true;
    }

    /** Combat-time scheduling, shared by live combat and isolated background replay. */
    function tickGravity() {
        const config = COSMOS_GRAVITY_FIELD;
        if (!gravityActive() || !game.enemies.some(enemy=>enemy.hp>0 && !enemy.isBoss)) {
            game.cosmosGravity = null;
            return;
        }
        const now = getCombatTime();
        if (!game.cosmosGravity) game.cosmosGravity = {nextPulseAt:now+config.warningMs,steps:0};
        const field = game.cosmosGravity;
        if (now < field.nextPulseAt) return;
        for (const enemy of game.enemies) {
            if (enemy.hp<=0 || enemy.isBoss || !hasGridCell(enemy)) continue;
            gridStepToward(enemy,config.gx,config.gy,getGridBlockedCells(enemy));
        }
        field.steps = (field.steps+1)%config.steps;
        field.nextPulseAt = now + (field.steps === 0 ? config.restMs : config.intervalMs);
    }

    function gravityActive() {
        return game.currentZoneId === 'cosmos_challenge'
            && game.cosmosAtlas.activeChallenge?.nodeId === COSMOS_GRAVITY_FIELD.nodeId
            && !game.combatHalted && game.moveTimer <= 0;
    }

    function gravityView() {
        if (!game.cosmosGravity || !gravityActive()) return null;
        const until = game.cosmosGravity.nextPulseAt-getCombatTime();
        return { ...COSMOS_GRAVITY_FIELD, progress:1-Math.max(0,Math.min(1,until/COSMOS_GRAVITY_FIELD.warningMs)) };
    }

    return { active, current, start, preview, retryRemaining, upgrade, unlocked, planetHabitat, tickGravity, gravityView,
        complete, directive, habitat, encounter, mechanic, modifyEncounter, encounterProfile, enemyElement, stop, leave, reconcileDeparture, waiting };
})();
safeExposeGlobals({ cosmosRouteRuntime });
