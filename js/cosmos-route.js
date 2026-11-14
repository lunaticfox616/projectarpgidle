// GENERATED from modules/cosmos-route*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/cosmos-route-state.mjs
  function cosmosJourneyActive(state) {
    return !!state.cosmosRoute && state.cosmosRoute.phase === "fighting";
  }
  function cosmosJourneyCurrent(state) {
    return cosmosJourneyActive(state) ? state.cosmosRoute.queue[0] || null : null;
  }
  function cosmosJourneyRetryRemaining(env, state, now = env.deps.routeNow()) {
    return Math.max(0, state.cosmosRouteBoard.retryAt - now);
  }
  function cosmosJourneyUnlocked(env, state, galaxy) {
    if (!env.deps.COSMOS_ROUTE_GALAXIES[galaxy] || !env.deps.isMapPrimaryContentUnlocked(state, "map-tab-cosmos")) return false;
    return galaxy === 1 || state.cosmosAtlas.bossClears.includes(env.deps.COSMOS_ROUTE_GALAXIES[galaxy - 1].boss);
  }
  function cosmosJourneyWaiting(state) {
    return state.currentZoneId === "cosmos_challenge" && !!state.cosmosRoute && !!state.cosmosAtlas.activeChallenge?.route && state.cosmosRoute.phase !== "fighting";
  }

  // modules/domain/cosmos-route-plan.mjs
  function cosmosJourneyItinerary(env, state, route) {
    const rng = env.deps.createSeededRng(route.seed);
    const cleared = new Set(state.cosmosAtlas.cleared);
    const used = /* @__PURE__ */ new Set([...route.history.map((row) => row.id), ...route.queue]);
    const preferred = new Set(route.goal === "dust" ? env.deps.COSMOS_ROUTE_G1.planets : env.deps.COSMOS_ROUTE_G1.asteroids);
    const pool = [...env.deps.COSMOS_ROUTE_G1.planets, ...env.deps.COSMOS_ROUTE_G1.asteroids].filter((id) => !used.has(id)).map((id) => ({ id, rank: rng() })).sort((a, b) => Number(cleared.has(a.id)) - Number(cleared.has(b.id)) || Number(preferred.has(b.id)) - Number(preferred.has(a.id)) || a.rank - b.rank).map((row) => row.id);
    return [0, 1, 2, 3, 4].map((stage) => {
      if (stage === 0) return [env.deps.COSMOS_ROUTE_G1.start];
      if (stage === 4) return [env.deps.COSMOS_ROUTE_G1.boss];
      const visited = route.history.filter((row) => row.stage === stage).map((row) => row.id);
      const pending = stage === route.stage ? route.queue : [];
      const fixed = [...visited, ...pending];
      return [...fixed, ...pool.splice(0, route.legSize - fixed.length)];
    });
  }
  function cosmosJourneyPreview(env, state, galaxy = 1) {
    const board = state.cosmosRouteBoard;
    const definition = env.deps.COSMOS_ROUTE_GALAXIES[galaxy];
    const rng = env.deps.createSeededRng(board.seed);
    const shuffled = [...definition.middle].map((id) => ({ id, rank: rng() })).sort((a, b) => a.rank - b.rank).map((row) => row.id);
    const ids = [definition.start, ...shuffled, definition.boss];
    let offset = 0;
    const plan = definition.lengths.map((size) => {
      const leg = ids.slice(offset, offset + size);
      offset += size;
      return leg;
    });
    return {
      seed: board.seed,
      goal: board.goal,
      version: 5,
      galaxy,
      stage: 0,
      legSize: 8,
      history: [],
      queue: [],
      plan,
      decisions: { ...board.decisions }
    };
  }
  function cosmosJourneyHabitat(env, state, nodeId = cosmosJourneyCurrent(state)) {
    if (!cosmosJourneyActive(state) || cosmosJourneyCurrent(state) !== nodeId) return null;
    if (state.cosmosRoute.version >= 4) return cosmosJourneyPlanetHabitat(env, nodeId);
    return state.cosmosRoute.habitats?.[state.cosmosRoute.stage] || null;
  }
  function cosmosJourneyPlanetHabitat(env, nodeId) {
    return env.deps.COSMOS_ROUTE_G1.habitatByNode[nodeId] || ["swarm", "guard", "storm"][Number(nodeId.split("-")[1]) % 3];
  }
  function cosmosJourneyUpgrade(env, state) {
    const route = state.cosmosRoute;
    route.seed = 1;
    route.decisions = { 1: "survey", 3: "survey", ...route.decisions };
    route.plan = cosmosJourneyItinerary(env, state, route);
    route.version = 2;
    if (route.phase !== "choice") return;
    route.phase = "returned";
    route.queue = [];
    state.combatHalted = true;
  }

  // modules/domain/cosmos-route-progress.mjs
  function cosmosJourneyStart(env, state, galaxy = 1) {
    if (cosmosJourneyActive(state) || cosmosJourneyRetryRemaining(env, state)) return false;
    if (!cosmosJourneyUnlocked(env, state, galaxy)) return false;
    const planned = cosmosJourneyPreview(env, state, galaxy);
    state.cosmosRoute = {
      version: 5,
      galaxy,
      loop: state.season,
      phase: "fighting",
      stage: 0,
      goal: planned.goal,
      seed: planned.seed,
      plan: planned.plan,
      legSize: planned.legSize,
      signal: "survey",
      queue: [...planned.plan[0]],
      history: [],
      dust: 0,
      decisions: planned.decisions
    };
    return true;
  }
  function cosmosJourneyNextBoard(env, state, failed) {
    const board = state.cosmosRouteBoard;
    board.seed = board.seed % 1e9 + 1;
    board.selected = 0;
    board.goal = state.cosmosRoute.goal;
    board.decisions = { ...state.cosmosRoute.decisions };
    if (state.cosmosRoute.version === 3) board.habitats = state.cosmosRoute.habitats.slice(0, 3);
    board.retryAt = failed ? env.deps.routeNow() + env.deps.COSMOS_ROUTE_G1.retryMs : 0;
  }
  function cosmosJourneyComplete(env, state, nodeId, dust) {
    const route = state.cosmosRoute;
    if (cosmosJourneyCurrent(state) !== nodeId) return false;
    route.history.push({ id: nodeId, dust, stage: route.stage });
    route.dust += dust;
    route.queue.shift();
    if (route.queue.length) return true;
    route.stage++;
    if (route.stage === route.plan.length) {
      route.phase = "complete";
      cosmosJourneyNextBoard(env, state, false);
    } else {
      route.signal = route.version >= 3 ? "survey" : route.decisions[route.stage] || route.signal;
      route.queue = [...route.plan[route.stage]];
    }
    return true;
  }
  function cosmosJourneyDirective(env, state, nodeId) {
    if (cosmosJourneyCurrent(state) !== nodeId) return null;
    return env.deps.COSMOS_EXPEDITION_DIRECTIVE_DB.find((row) => row.id === state.cosmosRoute.signal);
  }
  function cosmosJourneyStop(env, state, phase = "returned") {
    if (!cosmosJourneyActive(state)) return false;
    const route = state.cosmosRoute;
    if (phase === "failed") {
      route.failedNode = cosmosJourneyCurrent(state);
      cosmosJourneyNextBoard(env, state, true);
    }
    route.phase = phase;
    route.queue = [];
    return true;
  }
  function cosmosJourneyLeave(env, state, phase = "returned") {
    if (!cosmosJourneyStop(env, state, phase)) return false;
    state.cosmosAtlas.activeChallenge = null;
    if (state.currentZoneId === "cosmos_challenge") state.currentZoneId = state.maxZoneId;
    return true;
  }
  function cosmosJourneyReconcileDeparture(env, state) {
    if (cosmosJourneyActive(state) && state.currentZoneId !== "cosmos_challenge") cosmosJourneyStop(env, state);
  }

  // modules/domain/cosmos-route-gravity.mjs
  function cosmosJourneyGravityAnchor(env, owner) {
    const run = env.deps.actExplorationState.current(owner);
    if (!run?.rooms) return { gx: env.deps.COSMOS_GRAVITY_FIELD.gx, gy: env.deps.COSMOS_GRAVITY_FIELD.gy, roomId: null };
    const map = env.deps.actExplorationMap.forRun(run), room = env.deps.actExplorationRooms.roomAt(map, owner.gridPlayer);
    if (!room || !env.deps.actExplorationMap.walkable(map, room)) return null;
    return { gx: room.gx, gy: room.gy, roomId: room.id, map };
  }
  function cosmosJourneyGravityTarget(env, enemy, anchor) {
    if (enemy.hp <= 0 || enemy.isBoss || !env.deps.hasGridCell(enemy)) return false;
    return !anchor.map || env.deps.actExplorationRooms.roomAt(anchor.map, enemy)?.id === anchor.roomId;
  }
  function cosmosJourneyGravityMatchesRoom(field, anchor) {
    return !!field && (field.roomId || null) === anchor.roomId;
  }
  function cosmosJourneyTickGravity(env, owner) {
    const config = env.deps.COSMOS_GRAVITY_FIELD, anchor = cosmosJourneyGravityActive(env, owner) ? cosmosJourneyGravityAnchor(env, owner) : null;
    if (!anchor || !owner.enemies.some((enemy) => cosmosJourneyGravityTarget(env, enemy, anchor))) {
      owner.cosmosGravity = null;
      return;
    }
    const now = env.deps.getCombatTime();
    if (!cosmosJourneyGravityMatchesRoom(owner.cosmosGravity, anchor)) {
      owner.cosmosGravity = { nextPulseAt: now + config.warningMs, steps: 0, roomId: anchor.roomId };
    }
    const field = owner.cosmosGravity;
    if (now < field.nextPulseAt) return;
    for (const enemy of owner.enemies) {
      if (!cosmosJourneyGravityTarget(env, enemy, anchor)) continue;
      env.deps.gridStepToward(enemy, anchor.gx, anchor.gy, env.deps.getGridBlockedCells(enemy));
    }
    field.steps = (field.steps + 1) % config.steps;
    field.nextPulseAt = now + (field.steps === 0 ? config.restMs : config.intervalMs);
  }
  function cosmosJourneyGravityActive(env, owner) {
    return owner.currentZoneId === "cosmos_challenge" && owner.cosmosAtlas.activeChallenge?.nodeId === env.deps.COSMOS_GRAVITY_FIELD.nodeId && !owner.combatHalted && owner.moveTimer <= 0;
  }
  function cosmosJourneyGravityView(env, owner) {
    if (!owner.cosmosGravity || !cosmosJourneyGravityActive(env, owner)) return null;
    const anchor = cosmosJourneyGravityAnchor(env, owner);
    if (!anchor || !cosmosJourneyGravityMatchesRoom(owner.cosmosGravity, anchor)) return null;
    const until = owner.cosmosGravity.nextPulseAt - env.deps.getCombatTime();
    return {
      ...env.deps.COSMOS_GRAVITY_FIELD,
      gx: anchor.gx,
      gy: anchor.gy,
      progress: 1 - Math.max(0, Math.min(1, until / env.deps.COSMOS_GRAVITY_FIELD.warningMs))
    };
  }

  // modules/domain/cosmos-route-encounters.mjs
  function cosmosJourneyEncounter(env, zone, isBoss = false) {
    return !isBoss && zone?.type === "cosmos" ? env.deps.COSMOS_ROUTE_G1.habitats[zone.cosmosHabitat] || null : null;
  }
  function cosmosJourneyMechanic(env, zone, isBoss, seed) {
    const profile = cosmosJourneyEncounter(env, zone, isBoss);
    return env.deps.COSMOS_MECHANIC_DB.find((row) => row.id === profile?.trait) || (typeof env.deps.resolveCosmosMechanic === "function" ? env.deps.resolveCosmosMechanic(String(zone.cosmosTag || "").trim() || "stellar", seed) : null);
  }
  function cosmosJourneyModifyEncounter(env, modifiers, zone, isBoss) {
    const profile = cosmosJourneyEncounter(env, zone, isBoss);
    if (!profile) return modifiers;
    modifiers.hpMul *= profile.hp;
    modifiers.damageMul *= profile.damage;
    modifiers.attackSpeedMul *= profile.speed;
    modifiers.traitName = `${profile.name}, ${modifiers.traitName}`;
    return modifiers;
  }
  function cosmosJourneyEncounterProfile(env, zone, ordinary) {
    const profile = cosmosJourneyEncounter(env, zone);
    if (!profile) return ordinary;
    return {
      markerCount: profile.markerCount,
      minPack: profile.minPack,
      maxPack: profile.maxPack,
      eliteChance: profile.eliteChance,
      bossAdds: profile.bossAdds,
      label: profile.name
    };
  }
  function cosmosJourneyEnemyElement(env, zone, isBoss, ordinary) {
    return cosmosJourneyEncounter(env, zone, isBoss)?.element || ordinary;
  }

  // modules/domain/cosmos-route.mjs
  function createCosmosRoute(deps) {
    const env = { deps };
    return {
      active: cosmosJourneyActive,
      current: cosmosJourneyCurrent,
      start: (...args) => cosmosJourneyStart(env, ...args),
      preview: (...args) => cosmosJourneyPreview(env, ...args),
      retryRemaining: (...args) => cosmosJourneyRetryRemaining(env, ...args),
      upgrade: (...args) => cosmosJourneyUpgrade(env, ...args),
      unlocked: (...args) => cosmosJourneyUnlocked(env, ...args),
      planetHabitat: (...args) => cosmosJourneyPlanetHabitat(env, ...args),
      tickGravity: (...args) => cosmosJourneyTickGravity(env, ...args),
      gravityView: (...args) => cosmosJourneyGravityView(env, ...args),
      complete: (...args) => cosmosJourneyComplete(env, ...args),
      directive: (...args) => cosmosJourneyDirective(env, ...args),
      habitat: (...args) => cosmosJourneyHabitat(env, ...args),
      encounter: (...args) => cosmosJourneyEncounter(env, ...args),
      mechanic: (...args) => cosmosJourneyMechanic(env, ...args),
      modifyEncounter: (...args) => cosmosJourneyModifyEncounter(env, ...args),
      encounterProfile: (...args) => cosmosJourneyEncounterProfile(env, ...args),
      enemyElement: (...args) => cosmosJourneyEnemyElement(env, ...args),
      stop: (...args) => cosmosJourneyStop(env, ...args),
      leave: (...args) => cosmosJourneyLeave(env, ...args),
      reconcileDeparture: (...args) => cosmosJourneyReconcileDeparture(env, ...args),
      waiting: cosmosJourneyWaiting
    };
  }

  // modules/cosmos-route-classic.mjs
  var rules = createCosmosRoute({
    routeNow: () => Date.now(),
    get COSMOS_ROUTE_GALAXIES() {
      return COSMOS_ROUTE_GALAXIES;
    },
    get isMapPrimaryContentUnlocked() {
      return isMapPrimaryContentUnlocked;
    },
    get createSeededRng() {
      return createSeededRng;
    },
    get COSMOS_ROUTE_G1() {
      return COSMOS_ROUTE_G1;
    },
    get COSMOS_MECHANIC_DB() {
      return COSMOS_MECHANIC_DB;
    },
    get resolveCosmosMechanic() {
      return typeof resolveCosmosMechanic === "undefined" ? void 0 : resolveCosmosMechanic;
    },
    get COSMOS_EXPEDITION_DIRECTIVE_DB() {
      return COSMOS_EXPEDITION_DIRECTIVE_DB;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get COSMOS_GRAVITY_FIELD() {
      return COSMOS_GRAVITY_FIELD;
    },
    get actExplorationMap() {
      return actExplorationMap;
    },
    get actExplorationRooms() {
      return actExplorationRooms;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get gridStepToward() {
      return gridStepToward;
    },
    get getGridBlockedCells() {
      return getGridBlockedCells;
    }
  });
  var cosmosRouteRuntime = {
    ...rules,
    tickGravity: () => rules.tickGravity(game),
    gravityView: () => rules.gravityView(game)
  };
  safeExposeGlobals({ cosmosRouteRuntime });
})();
