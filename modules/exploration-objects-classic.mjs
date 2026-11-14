import * as part0 from './combat/exploration-prop-rules.mjs';
import * as part1 from './combat/exploration-prop-placement.mjs';
import * as part2 from './combat/exploration-prop-validation.mjs';
import { warningMs, labels } from './combat/exploration-objects-values.mjs';
// Session caches are shared by all calls; weak keys follow restored run ownership and never enter saves.
const memo={shelves:new WeakMap(),adjacencies:new WeakMap()};
// Existing consumers and late-loaded extensions keep these bindings until the application entry is migrated.
const deps={
    get EXPLORATION_EVENT_LOOPS(){return EXPLORATION_EVENT_LOOPS;},
    get hashSeed(){return hashSeed;},
    get EXPLORATION_CHEST_GRADES(){return EXPLORATION_CHEST_GRADES;},
    get actExplorationSight(){return actExplorationSight;},
    get actExplorationMap(){return actExplorationMap;},
    get STAGE_ROOMS(){return STAGE_ROOMS;}
};
const explorationObjects={
    create(run,config) {return part1.propCreate({deps,memo}, run,config);},
    validate(run) {return part2.propValidate({deps,memo}, run);},
    restoreAtlas(raw) {return part2.propRestoreAtlas({deps,memo}, raw);},
    random(seed) {return part0.propRandom(seed);},
    eventKind(loop,roll) {return part0.propEventKind({deps,memo}, loop,roll);},
    isEvent(row) {return part0.propIsEvent(row);},
    active(run) {return part0.propActive(run);},
    visible(run,row) {return part0.propVisible({deps,memo}, run,row);},
    warningMs:warningMs,
    labels:labels,
    grade(row) {return part0.propGrade({deps,memo}, row);},
    name(row) {return part0.propName({deps,memo}, row);},
    solid(row) {return part0.propSolid(row);},
    solidCells(run) {return part0.propSolidCells(run);},
    autoTarget(run) {return part0.propAutoTarget({deps,memo}, run);}
};
actExplorationState.objects=explorationObjects;
