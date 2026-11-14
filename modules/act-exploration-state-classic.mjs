import * as part0 from './combat/exploration-state-rules.mjs';
import * as part1 from './combat/exploration-state-vision.mjs';
import * as part2 from './combat/exploration-state-engagement.mjs';
import * as part3 from './combat/exploration-state-commands.mjs';
import * as part4 from './combat/exploration-state-validation.mjs';
import * as part5 from './combat/exploration-state-restore.mjs';
import { settlementMs } from './combat/exploration-state-values.mjs';
// Session caches are shared by all calls; weak keys follow restored run ownership and never enter saves.
const memo={entrances:new WeakMap(),discoveryMemos:new WeakMap(),noticeMemos:new WeakMap(),sights:new WeakMap(),deathNoises:new WeakMap(),arrivals:new WeakMap(),sightMemo:{run:null,key:'',seen:null,lit:null,reach:0},lockOns:new WeakMap(),unmarkedCommands:new WeakSet()};
// Existing consumers and late-loaded extensions keep these bindings until the application entry is migrated.
const deps={
    get EXPLORATION_ARRIVAL_GRACE_MS(){return EXPLORATION_ARRIVAL_GRACE_MS;},
    get actExplorationMap(){return actExplorationMap;},
    get ACT_EXPLORATION_VISION(){return ACT_EXPLORATION_VISION;},
    get actExplorationSight(){return actExplorationSight;},
    get hasGridCell(){return hasGridCell;},
    get getGridUnitCells(){return getGridUnitCells;},
    get actExplorationRooms(){return actExplorationRooms;},
    get OUTSIDE_CHAOS_ZONE_ID(){return OUTSIDE_CHAOS_ZONE_ID;},
    get WOODSMAN_BATTLE(){return WOODSMAN_BATTLE;},
    get getCombatTime(){return getCombatTime;},
    get ACT_EXPLORATION_ALERT(){return ACT_EXPLORATION_ALERT;},
    get objects(){return actExplorationState.objects;},
    get actExplorationDoors(){return actExplorationDoors;},
    get ACT_EXPLORATION_WAVES(){return ACT_EXPLORATION_WAVES;},
    reportWarning:(...args)=>console.warn(...args),
    get BEYOND_BOUNDARY_UNLOCK_BOSS_ID(){return BEYOND_BOUNDARY_UNLOCK_BOSS_ID;},
    get gridCellKey(){return gridCellKey;},
    get STORY_ACTS(){return STORY_ACTS;},
    get ATLAS(){return ATLAS;},
    get explorationLayouts(){return explorationLayouts;},
    get actExplorationLoot(){return actExplorationLoot;},
    get groundLoot(){return actExplorationState.groundLoot;},
    get getGridFootprintCells(){return getGridFootprintCells;},
    get actExplorationMotion(){return actExplorationMotion;}
};
const actExplorationState={
    openEntrance(run,pack,o) {return part2.stateOpenEntrance({owner:game,deps,memo}, run,pack,o);},
    settlementMs,
    current(state) {return part0.stateCurrent(state);},
    create(where,packs,now=0) {return part5.stateCreate({owner:game,deps,memo}, where,packs,now);},
    arrive(run,now) {return part0.stateArrive({owner:game,deps,memo}, run,now);},
    inArrivalGrace(run,now) {return part0.stateInArrivalGrace({owner:game,deps,memo}, run,now);},
    packRooms(map) {return part0.statePackRooms(map);},
    packPosition(map,pack) {return part0.statePackPosition(map,pack);},
    sightRadius(stats) {return part1.stateSightRadius({owner:game,deps,memo}, stats);},
    sight(run) {return part1.stateSight({owner:game,deps,memo}, run);},
    inSight(enemy) {return part1.stateInSight({owner:game,deps,memo}, enemy);},
    fogDistance(map,i,lit) {return part1.stateFogDistance({owner:game,deps,memo}, map,i,lit);},
    discover(run,cell,stats) {return part1.stateDiscover({owner:game,deps,memo}, run,cell,stats);},
    engage(state,now=getCombatTime()) {return part2.stateEngage({owner:game,deps,memo}, state,now);},
    dormantNear(state,cell,reach) {return part2.stateDormantNear(state,cell,reach);},
    wake(state,enemies) {return part2.stateWake(state,enemies);},
    alerted(state) {return part2.stateAlerted({owner:game,deps,memo}, state);},
    entrance(run) {return part2.stateEntrance({owner:game,deps,memo}, run);},
    bossRoomAt(run,cell) {return part0.stateBossRoomAt({owner:game,deps,memo}, run,cell);},
    recordDeath(state,enemy) {return part2.stateRecordDeath({owner:game,deps,memo}, state,enemy);},
    retireCombat(state) {return part2.stateRetireCombat(state);},
    remainingElites(run) {return part0.stateRemainingElites(run);},
    gateSealed(run) {return part0.stateGateSealed(run);},
    selectDestination(run,cell,options={}) {return part3.stateSelectDestination({owner:game,deps,memo}, run,cell,options);},
    markedDestination(run) {return part3.stateMarkedDestination({owner:game,deps,memo}, run);},
    lockOn(run,enemy) {return part3.stateLockOn({owner:game,deps,memo}, run,enemy);},
    lockedEnemy(run) {return part3.stateLockedEnemy({owner:game,deps,memo}, run);},
    destination(run,from,mode=run.mode) {return part3.stateDestination({owner:game,deps,memo}, run,from,mode);},
    validate(run,enemies) {return part4.stateValidate({owner:game,deps,memo}, run,enemies);},
    restore(state) {return part5.stateRestore({owner:game,deps,memo}, state);},
    joinCerberus(pack,enemies,map) {return part5.stateJoinCerberus({owner:game,deps,memo}, pack,enemies,map);},
    dropRetired(state) {return part5.stateDropRetired({owner:game,deps,memo}, state);},
    upgradeRotation(state) {return part5.stateUpgradeRotation({owner:game,deps,memo}, state);},
    validObserverSeal(map,cell) {return part4.stateValidObserverSeal({owner:game,deps,memo}, map,cell);}
};
safeExposeGlobals({actExplorationState});
