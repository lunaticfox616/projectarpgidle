import * as part0 from './combat/exploration-map-cache.mjs';
import * as part1 from './combat/exploration-map-path.mjs';
import { ROTATIONS } from './combat/act-exploration-map-values.mjs';
// Session caches are shared by all calls; weak keys follow restored run ownership and never enter saves.
const memo={cache:new Map(),generatedCache:new Map(),runMaps:new WeakMap(),roadGroups:new WeakMap()};
// Existing consumers and late-loaded extensions keep these bindings until the application entry is migrated.
const deps={
    get ACT_EXPLORATION_MAPS(){return ACT_EXPLORATION_MAPS;},
    get explorationLayouts(){return explorationLayouts;},
    get actExplorationRooms(){return actExplorationRooms;},
    get ACT_EXPLORATION_VISION(){return ACT_EXPLORATION_VISION;}
};
const actExplorationMap={
    ROTATIONS:ROTATIONS,
    layout(act,rotation) {return part0.mapLayout({deps,memo}, act,rotation);},
    generated(spec,rotation) {return part0.mapGenerated({deps,memo}, spec,rotation);},
    forRun(run) {return part0.mapForRun({deps,memo}, run);},
    index(map,cell) {return part1.mapIndex(map,cell);},
    walkable(map,cell,sealed=false) {return part1.mapWalkable(map,cell,sealed);},
    neighbors(map,cell) {return part1.mapNeighbors(map,cell);},
    route(map,from,to,blocked=new Set()) {return part1.mapRoute(map,from,to,blocked);},
    visibleCells(map,from,radius=ACT_EXPLORATION_VISION.radius) {return part1.mapVisibleCells({deps,memo}, map,from,radius);},
    roadGroup(map) {return part0.mapRoadGroup({deps,memo}, map);}
};
safeExposeGlobals({actExplorationMap});
