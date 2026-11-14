import { gemCells, gemSame, gemMoveRadius, gemMoveTargets, gemCell, gemDistance, gemArea, gemFree, gemFacing, gemBehind, gemBlindSpots, gemCross } from './gem-cast-geometry.mjs';
import { gemGrow, gemMs, gemLetGo, gemSupportShots, gemBetween } from './gem-cast-math.mjs';
import { SMOKE_RADIUS, FLASK_RELEASE } from './gem-cast-values.mjs';
import { gemPetrifyRadius, gemBounce, gemLaunchFlask, gemStepBounce, gemStepExplosion, gemStepCold, gemStepEmpty, gemStepPetrify } from './gem-cast-flasks.mjs';
import { gemLaunchLance, gemLaunchClock, gemLaunchMist, gemLaunchJudgment, gemStepLance, gemStepClock, gemStepMist, gemStepJudgment } from './gem-cast-prayer.mjs';
import { gemLaunchAssassin, gemLaunchFlicker, gemStepAssassin, gemStepFlicker } from './gem-cast-blinks.mjs';
import { gemLaunchRift, gemLaunchSmoke, gemLaunchHarpoon, gemLaunchRockFlask, gemStepRift, gemStepSmoke, gemStepHarpoon, gemStepRockFlask } from './gem-cast-moves.mjs';
import { gemLaunchHoming, gemStepHoming } from './gem-cast-homing.mjs';
import { gemLaunchTimeSlash, gemStepTimeSlash } from './gem-cast-time-slash.mjs';
import { gemVisual, gemContact, gemFlight } from './gem-cast-common.mjs';
import { gemCreateState, gemStart, gemUpdate, gemDefine } from './gem-cast-schedule.mjs';
import { gemTargets } from './gem-cast-targets.mjs';

// Definitions and cosmetic counters live once per controller, across createState and replay state swaps.
function createGemCastPhases() {
    return {44:'flaskPhase',45:'lancePhase',46:'timePhase',47:'mixturePhase',48:'supercooledPhase',
        49:'emptyFlaskPhase',50:'holyMistPhase',51:'judgmentPhase',52:'assassinationPhase',
        54:'riftPhase',55:'smokePhase',56:'harpoonPhase',70:'flickerPhase',77:'rockFlaskPhase',78:'homingPhase',79:'petrifyPhase',80:'timeSlashPhase'};
}

function createGemContactAreas(env) {
    return {45:c=>c.points,46:c=>gemCells(env, c.source,'circle',3),47:c=>gemCells(env, c.aim,'square',1+gemGrow(c.stats)),
        48:c=>gemCells(env, c.aim,'ring',c.index+1).concat(c.index?[]:gemCells(env, c.aim,'square',.5)),
        50:c=>gemCells(env, c.source,'square',1+gemGrow(c.stats)).filter(p=>!gemSame(p,c.source)),51:c=>gemCells(env, c.aim,'cross',c.geometry.crossRadius),
        54:c=>gemCells(env, c.move.to,'square',gemMoveRadius(c)),55:c=>gemCells(env, c.move.to,'square',SMOKE_RADIUS),77:c=>gemCells(env, c.move.foe,'square',gemMoveRadius(c)),79:c=>gemCells(env, c.aim,'circle',gemPetrifyRadius(c))};
}

function createGemLaunchTable(env) {
    return {44:(state, c, enemies) => gemBounce(env, state, c, enemies),45:(state, c, enemies) => gemLaunchLance(env, state, c, enemies),46:(state, c) => gemLaunchClock(env, state, c),47:(state, c) => gemLaunchFlask(env, state, c),48:(state, c) => gemLaunchFlask(env, state, c),49:(state, c) => gemLaunchFlask(env, state, c),
        50:(state, c) => gemLaunchMist(env, state, c),51:(state, c, enemies) => gemLaunchJudgment(env, state, c, enemies),52:(state, c) => gemLaunchAssassin(env, state, c),54:(state, c, enemies) => gemLaunchRift(env, state, c, enemies),55:(state, c, enemies) => gemLaunchSmoke(env, state, c, enemies),56:(state, c, enemies) => gemLaunchHarpoon(env, state, c, enemies),70:gemLaunchFlicker,77:(state, c, enemies) => gemLaunchRockFlask(env, state, c, enemies),78:(state, c, enemies) => gemLaunchHoming(env, state, c, enemies),79:(state, c) => gemLaunchFlask(env, state, c),80:(state, c) => gemLaunchTimeSlash(env, state, c)};
}

function createGemStepTable(env) {
    return {44:(state, c, input) => gemStepBounce(env, state, c, input),45:(state, c, input) => gemStepLance(env, state, c, input),46:(state, c, input) => gemStepClock(env, state, c, input),47:(state, c, input) => gemStepExplosion(env, state, c, input),48:(state, c, input) => gemStepCold(env, state, c, input),49:(state, c, input) => gemStepEmpty(env, state, c, input),
        50:(state, c, input) => gemStepMist(env, state, c, input),51:(state, c, input) => gemStepJudgment(env, state, c, input),52:(state, c, input) => gemStepAssassin(env, state, c, input),54:(state, c, input) => gemStepRift(env, state, c, input),55:(state, c, input) => gemStepSmoke(env, state, c, input),56:(state, c, input) => gemStepHarpoon(env, state, c, input),70:(state, c, input) => gemStepFlicker(env, state, c, input),77:(state, c, input) => gemStepRockFlask(env, state, c, input),78:(state, c, input) => gemStepHoming(env, state, c, input),79:(state, c, input) => gemStepPetrify(env, state, c, input),80:(state, c, input) => gemStepTimeSlash(env, state, c, input)};
}

function createGemCastRegistry(env) {
    return {
        SINGLE_CAST: new Set([46,52,54,55,56,70,77]),
        PHASE_KEYS: createGemCastPhases(),
        contactAreas: createGemContactAreas(env),
        THROWN_FLASKS: new Set([44,47,48,49,79]),
        TARGETS: {54:(id, source, live, extra) => gemMoveTargets(env, id, source, live, extra),55:(id, source, live, extra) => gemMoveTargets(env, id, source, live, extra),56:(id, source, live, extra) => gemMoveTargets(env, id, source, live, extra),77:(id, source, live, extra) => gemMoveTargets(env, id, source, live, extra)},
        launch: createGemLaunchTable(env),
        steps: createGemStepTable(env)
    };
}
function createGemCastKit(env) {
    return Object.freeze({cell: gemCell,same: gemSame,distance: gemDistance,area: (enemies, center, shape, radius) => gemArea(env, enemies, center, shape, radius),cells: (center, shape, radius) => gemCells(env, center, shape, radius),visual: (...args) => gemVisual(env, ...args),contact: (cast, targets, at, extra={}) => gemContact(env, cast, targets, at, extra),ms: gemMs,letGo: gemLetGo,grow: gemGrow,supportShots: (c) => gemSupportShots(env, c),between: (...args) => gemBetween(env, ...args),free: (destination, enemies) => gemFree(env, destination, enemies),flight: gemFlight,launchFlask: (state, c) => gemLaunchFlask(env, state, c),FLASK_RELEASE});
}
export function createGemCastScheduler(deps) {
    const env = { get owner() { return deps.owner; }, deps, memo: { homingBend: 1, timeSlashCasts: 0 }, registry: null };
    env.registry = createGemCastRegistry(env);
    const kit = createGemCastKit(env);
    return {createState: gemCreateState,start: (state, input) => gemStart(env, state, input),update: (state, input) => gemUpdate(env, state, input),targets: (id, source, enemies, extra=0) => gemTargets(env, id, source, enemies, extra),facing: (enemy, source) => gemFacing(env, enemy, source),free: (destination, enemies) => gemFree(env, destination, enemies),behind: (enemy, source) => gemBehind(env, enemy, source),blindSpots: (enemy, source) => gemBlindSpots(env, enemy, source),cross: (source, target, radius=1) => gemCross(env, source, target, radius),singleCast:env.registry.SINGLE_CAST,define: (id, def) => gemDefine(env, id, def),kit};
}
