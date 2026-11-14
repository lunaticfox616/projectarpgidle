// GENERATED from modules/content-maps*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/content-route-rules.mjs
  function contentRunSeed(state, tag, step) {
    return `${tag}:${state.season || 1}:${step}:${state.nextEnemyId || 0}`;
  }
  var contentSpec = (act, seed, arena = false) => arena ? { style: "act", act, seed, arena: true } : { style: "act", act, seed };
  var contentCycle = (acts, step) => acts[(Math.max(1, Math.floor(Number(step) || 1)) - 1) % acts.length];
  var ACT_BY_BIOME = Object.freeze({ root: 1, courtyard: 2, aerial: 3, maze: 4, sanctum: 5, ruins: 6, trunk: 7, veil: 8, canopy: 9, crown: 10 });
  var contentActForBiome = (biome) => ACT_BY_BIOME[biome] || ACT_BY_BIOME.sanctum;
  var CHAOS_ACTS = Object.freeze([1, 7, 3, 5, 8, 6, 4, 2, 9, 10]);
  var REALM_ACTS = Object.freeze([6, 10, 8]);
  var SKY_ACTS = Object.freeze([3, 8, 10]);
  var UNDER_ACTS = Object.freeze([7, 1, 5]);
  var LABYRINTH_ACTS = Object.freeze([4, 7]);
  function contentLabyrinth(floor, state) {
    return contentSpec(contentCycle(LABYRINTH_ACTS, floor), contentRunSeed(state, "lab", floor));
  }
  function contentChaos(depth, state) {
    return { exploration: contentSpec(contentCycle(CHAOS_ACTS, depth), contentRunSeed(state, "chaos", depth)), packExtra: depth > 20 ? 4 : 3 };
  }
  function contentChaosRealm(floor, state) {
    return { exploration: contentSpec(contentCycle(REALM_ACTS, floor), contentRunSeed(state, "realm", floor)), packExtra: 2 };
  }
  function contentSkyTower(floor, state) {
    return { exploration: contentSpec(contentCycle(SKY_ACTS, floor), contentRunSeed(state, "sky", floor)), packExtra: 1 };
  }
  function contentUnderworld(floor, state) {
    return { exploration: contentSpec(contentCycle(UNDER_ACTS, floor), contentRunSeed(state, "under", floor)), packExtra: 2 };
  }
  function contentTimeRift(phase, pressure, state) {
    return { exploration: contentSpec(phase === "past" ? 2 : 6, `rift:${state.season || 1}:${pressure}`), packExtra: 2 };
  }
  function contentArena(id, biome = "sanctum") {
    return contentSpec(contentActForBiome(biome), `arena:${id}`, true);
  }
  var HIVE_ACT = 10;
  function contentHive(state) {
    return { style: "act", act: HIVE_ACT, seed: `hive:${state.season || 1}`, chain: true };
  }
  var TRACK_BIOMES = Object.freeze({ underworld: "root", sky: "aerial", ocean: "courtyard", convergence: "sanctum" });
  function contentBossBiome(zone) {
    if (zone.pinnacleTrack) return TRACK_BIOMES[zone.pinnacleTrack] || "sanctum";
    return zone.rivalBlade ? "ruins" : zone.cosmosCapstone ? "sanctum" : "trunk";
  }
  var contentWithArena = (zone, biome) => zone ? { ...zone, exploration: zone.bossStages ? { ...contentArena(zone.id, biome), bossStages: zone.bossStages } : contentArena(zone.id, biome) } : zone;
  var TRIAL_MAPS = Object.freeze({ trial_1: "trial-blades", trial_2: "trial-triad", trial_3: "trial-miasma", trial_4: "trial-crossing", trial_5: "trial-winter" });
  var contentTrialCorridor = (zone) => zone ? { ...zone, exploration: { style: "map", id: TRIAL_MAPS[zone.id] || "trial-blades", seed: `trial:${zone.id}` } } : zone;

  // modules/combat/content-route-board.mjs
  var arenaForBoard = (rules, zone) => ({ style: "act", act: rules.acts[zone.type], seed: `arena:${zone.type}`, arena: true });
  function chainForBoard(rules, zone, rooms) {
    const chain = Math.max(1, Math.min(rules.chainMax, Math.floor(rooms)));
    return { style: "act", act: rules.acts[zone.type], seed: `${zone.type}:${chain}`, chain };
  }
  function createBoardRoutes(deps) {
    const arena = (zone) => arenaForBoard(deps.rules, zone);
    const markers = (zone) => chainForBoard(deps.rules, zone, deps.countEncounterMarkers(zone) - 1);
    const builders = Object.freeze({
      outsideChaos: arena,
      woodsmanEcho: arena,
      cosmos: markers,
      beyondBoundary: markers,
      oceanDepth: (zone) => deps.oceanBoundary() > 0 ? arena(zone) : markers(zone),
      colony: arena,
      grandBreach: arena
    });
    return Object.freeze({
      withRooms(zone) {
        const rooms = !!zone && !!builders[zone.type] && deps.enabled();
        return rooms ? { ...zone, exploration: builders[zone.type](zone) } : zone;
      }
    });
  }

  // modules/content-maps-classic.mjs
  var board = createBoardRoutes({
    get rules() {
      return STAGE_BOARD_ROOMS;
    },
    enabled: () => typeof actExplorationDoors === "object" && actExplorationDoors.session(),
    get countEncounterMarkers() {
      return countEncounterMarkers;
    },
    oceanBoundary: () => getOceanPendingBossBoundary(ensureOceanState())
  });
  var contentMaps = Object.freeze({
    labyrinth(floor, state = game) {
      return contentLabyrinth(floor, state);
    },
    chaos(depth, state = game) {
      return contentChaos(depth, state);
    },
    chaosRealm(floor, state = game) {
      return contentChaosRealm(floor, state);
    },
    skyTower(floor, state = game) {
      return contentSkyTower(floor, state);
    },
    underworld(floor, state = game) {
      return contentUnderworld(floor, state);
    },
    timeRift(phase, pressure, state = game) {
      return contentTimeRift(phase, pressure, state);
    },
    arena(id, biome = "sanctum") {
      return contentArena(id, biome);
    },
    withArena(zone, biome) {
      return contentWithArena(zone, biome);
    },
    trialCorridor(zone) {
      return contentTrialCorridor(zone);
    },
    bossBiome(zone) {
      return contentBossBiome(zone);
    },
    actForBiome(biome) {
      return contentActForBiome(biome);
    },
    hive(state = game) {
      return contentHive(state);
    },
    withRooms: board.withRooms
  });
  safeExposeGlobals({ contentMaps });
})();
