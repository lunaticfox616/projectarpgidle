import * as part0 from './combat/exploration-sight-mode.mjs';
import * as part1 from './combat/exploration-sight-discovery.mjs';
// Session caches are shared by all calls; weak keys follow restored run ownership and never enter saves.
const memo={seenMemo:new WeakMap()};
// Existing consumers and late-loaded extensions keep these bindings until the application entry is migrated.
const deps={
    settings:()=>typeof game==='object'?game.settings:undefined,
    get actExplorationMap(){return actExplorationMap;},
    get STAGE_ROOM_PLANS(){return STAGE_ROOM_PLANS;},
    get actExplorationRooms(){return actExplorationRooms;},
    get Boolean(){return Boolean;}
};
const actExplorationSight=Object.freeze({
    sightMode(run) {return part0.sightSightMode({deps,memo}, run);},
    wholeRoom(run) {return part0.sightWholeRoom({deps,memo}, run);},
    sameRoom(map,one,other) {return part0.sightSameRoom({deps,memo}, map,one,other);},
    inRoomOf(map,cell) {return part0.sightInRoomOf({deps,memo}, map,cell);},
    seenCells(run) {return part1.sightSeenCells({deps,memo}, run);},
    knownCell(run,cell) {return part1.sightKnownCell({deps,memo}, run,cell);},
    exploredShare(run) {return part1.sightExploredShare({deps,memo}, run);},
    dropCellList(run) {return part1.sightDropCellList({deps,memo}, run);}
});
safeExposeGlobals({actExplorationSight});
