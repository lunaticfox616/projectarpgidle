import * as part0 from './combat/exploration-door-map.mjs';
import * as part1 from './combat/exploration-door-locks.mjs';
import * as part2 from './combat/exploration-door-crossing.mjs';
import * as part3 from './combat/exploration-door-guides.mjs';
// Session caches are shared by all calls; weak keys follow restored run ownership and never enter saves.
const memo={guideKeys:new WeakMap()};
// Existing consumers and late-loaded extensions keep these bindings until the application entry is migrated.
const deps={
    roomStageEnabled:()=>typeof stageView==='object' && stageView.rooms(),
    get STAGE_ROOMS(){return STAGE_ROOMS;},
    get actExplorationRooms(){return actExplorationRooms;},
    get actExplorationRoomPlans(){return actExplorationRoomPlans;},
    get actExplorationMap(){return actExplorationMap;},
    get actExplorationState(){return actExplorationState;},
    get getCombatTime(){return getCombatTime;},
    get getGridBlockedCells(){return getGridBlockedCells;},
    get hasGridCell(){return hasGridCell;},
    get findFreeGridCell(){return findFreeGridCell;},
    get gridCellKey(){return gridCellKey;},
    get roomInvaders(){return roomInvaders;},
    get ACT_EXPLORATION_AMBUSH(){return ACT_EXPLORATION_AMBUSH;},
    get getGridUnitFootprint(){return getGridUnitFootprint;},
    get canPlaceGridFootprint(){return canPlaceGridFootprint;},
    get getGridUnitCells(){return getGridUnitCells;},
    get getStoryActByZoneId(){return getStoryActByZoneId;},
    get STORY_ACT_ENCOUNTERS(){return STORY_ACT_ENCOUNTERS;},
    get STORY_TRIAL_ENCOUNTERS(){return STORY_TRIAL_ENCOUNTERS;}
};
const actExplorationDoors=Object.freeze({
    session() {return part0.doorSession({owner:game,deps,memo});},
    planKey(zone,where) {return part0.doorPlanKey({owner:game,deps,memo}, zone,where);},
    stageMap(run) {return part0.doorStageMap({owner:game,deps,memo}, run);},
    cross(run) {return part2.doorCross({owner:game,deps,memo}, run);},
    startAtGate(run) {return part2.doorStartAtGate({owner:game,deps,memo}, run);},
    toward(run,target) {return part0.doorToward({owner:game,deps,memo}, run,target);},
    room(run) {return part0.doorRoom({owner:game,deps,memo}, run);},
    doorsHere(run) {return part1.doorDoorsHere({owner:game,deps,memo}, run);},
    pace(run) {return part0.doorPace({owner:game,deps,memo}, run);},
    fightingHere(run) {return part1.doorFightingHere({owner:game,deps,memo}, run);},
    waveDue(run,room) {return part1.doorWaveDue(run,room);},
    sendStraysBack(run) {return part1.doorSendStraysBack({owner:game,deps,memo}, run);},
    storyGuide(zoneId) {return part3.doorStoryGuide({owner:game,deps,memo}, zoneId);},
    guideRoom(run,map) {return part3.doorGuideRoom(run,map);},
    guideCells(run) {return part3.doorGuideCells({owner:game,deps,memo}, run);}
});
safeExposeGlobals({actExplorationDoors});
