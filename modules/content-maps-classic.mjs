import * as routes from './combat/content-route-rules.mjs';
import { createBoardRoutes } from './combat/content-route-board.mjs';
// The current ocean run and rendering mode still belong to classic consumers; remove these ports with the final application entry.
const board=createBoardRoutes({
    get rules(){return STAGE_BOARD_ROOMS;},
    enabled:()=>typeof actExplorationDoors==='object'&&actExplorationDoors.session(),
    get countEncounterMarkers(){return countEncounterMarkers;},
    oceanBoundary:()=>getOceanPendingBossBoundary(ensureOceanState())
});
const contentMaps=Object.freeze({
    labyrinth(floor,state = game) {return routes.contentLabyrinth(floor,state);},
    chaos(depth,state = game) {return routes.contentChaos(depth,state);},
    chaosRealm(floor,state = game) {return routes.contentChaosRealm(floor,state);},
    skyTower(floor,state = game) {return routes.contentSkyTower(floor,state);},
    underworld(floor,state = game) {return routes.contentUnderworld(floor,state);},
    timeRift(phase,pressure,state = game) {return routes.contentTimeRift(phase,pressure,state);},
    arena(id,biome = 'sanctum') {return routes.contentArena(id,biome);},
    withArena(zone,biome) {return routes.contentWithArena(zone,biome);},
    trialCorridor(zone) {return routes.contentTrialCorridor(zone);},
    bossBiome(zone) {return routes.contentBossBiome(zone);},
    actForBiome(biome) {return routes.contentActForBiome(biome);},
    hive(state = game) {return routes.contentHive(state);},
    withRooms:board.withRooms
});
safeExposeGlobals({contentMaps});
