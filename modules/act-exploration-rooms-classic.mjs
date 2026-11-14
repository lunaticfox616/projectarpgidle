import * as part0 from './combat/exploration-room-rules.mjs';
import * as part1 from './combat/exploration-room-cache.mjs';
import * as part2 from './combat/exploration-room-route.mjs';
import * as part3 from './combat/exploration-room-save.mjs';
// Session caches are shared by all calls; weak keys follow restored run ownership and never enter saves.
const memo={cache:new Map(),tours:new WeakMap()};
// Existing consumers and late-loaded extensions keep these bindings until the application entry is migrated.
const deps={
    get STAGE_ROOMS(){return STAGE_ROOMS;},
    get actExplorationRoomPlans(){return actExplorationRoomPlans;},
    get createSeededRng(){return createSeededRng;},
    get stageRegionFit(){return typeof stageRegionFit==='object'?stageRegionFit:undefined;},
    get explorationLayouts(){return explorationLayouts;},
    get ACT_EXPLORATION_MAPS(){return ACT_EXPLORATION_MAPS;},
    get STAGE_ROOM_PLANS(){return STAGE_ROOM_PLANS;}
};
const actExplorationRooms=Object.freeze({
    forRun(run) {return part1.roomStageLayout({deps,memo}, run);},
    key(spec) {return part0.roomRoomPlanKey({deps,memo}, spec);},
    supports(key) {return part0.roomSupports({deps,memo}, key);},
    roomAt(map,cell) {return part2.roomRoomAt(map,cell);},
    doorAt(map,cell) {return part2.roomDoorAt(map,cell);},
    waypoint(map,from,target) {return part2.roomWaypoint(map,from,target);},
    steps(map,from,target) {return part2.roomSteps(map,from,target);},
    tourNext(map,here,must,end) {return part2.roomTourNext({deps,memo}, map,here,must,end);},
    npcPost(room) {return part2.roomNpcPost(room);},
    seal(run) {return part3.roomRoomSeal(run);},
    unseal(run) {return part3.roomRoomUnseal(run);}
});
safeExposeGlobals({actExplorationRooms});
