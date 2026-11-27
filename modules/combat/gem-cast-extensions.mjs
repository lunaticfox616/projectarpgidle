import { runeReachOf } from './gem-extension-common.mjs';
import { ORB, STORM, CAULDRON, BELL, CHANDELIER, ORBIT, RIFT, ISSEN, VOID, GAVEL, PACT, SOUL, FLURRY, PENDULUM, VIPER, DESCENT } from './gem-extension-values.mjs';
import { runeLaunchFrozenOrb, runeStepFrozenOrb, runeOrbitReach, runeLaunchOrbit, runeStepOrbit } from './gem-extension-orbs.mjs';
import { runeRiftTargets, runeLaunchRift, runeStepRift, runeIssenTargets, runeLaunchIssen, runeStepIssen } from './gem-extension-rifts.mjs';
import { runeVoidTargets, runeLaunchVoid, runeStepVoid } from './gem-extension-void.mjs';
import { runeLaunchStorm, runeStepStorm, runeStormRadius, runeLaunchCauldron, runeStepCauldron, runeCauldronRadius } from './gem-extension-flasks.mjs';
import { runePactRadius, runeLaunchPact, runeStepPact, runeSoulTargets, runeLaunchSoul, runeStepSoul, runeSoulReach, runeFlurryTargets, runeLaunchFlurry, runeStepFlurry, runeFlurryCells } from './gem-extension-v325.mjs';
import { runeBaptismTargets, runeLaunchBaptism, runeStepBaptism, runeBaptismCells, runeViperTargets, runeLaunchViper, runeStepViper, runeViperRadius,
    runeDescentTargets, runeLaunchDescent, runeStepDescent } from './gem-extension-v324.mjs';
import { runeLaunchBell, runeStepBell, runeBellRadius, runeLaunchChandelier, runeStepChandelier, runeChandRadius, runeGavelTargets, runeLaunchGavel, runeStepGavel } from './gem-extension-relics.mjs';

function registerGemOrbExtensions(controller, env) {
    controller.define(82, { targets: runeReachOf(env, ORB.range), launch: (state, c, enemies) => runeLaunchFrozenOrb(env, state, c, enemies), step: (state, c, input) => runeStepFrozenOrb(env, state, c, input), phase: 'frozenOrbPhase' });
    controller.define(83, { targets: (id, source, foes) => runeOrbitReach(env, id, source, foes), launch: (state, c) => runeLaunchOrbit(env, state, c), step: (state, c, input) => runeStepOrbit(env, state, c, input), phase: 'orbitPhase' });
}

function registerGemMovementExtensions(controller, env) {
    controller.define(84, { targets: (id, source, foes, extra) => runeRiftTargets(env, id, source, foes, extra), launch: (state, c, enemies) => runeLaunchRift(env, state, c, enemies), step: (state, c, input) => runeStepRift(env, state, c, input), phase: 'singularityPhase' });
    controller.define(85, { targets: (id, source, foes, extra) => runeIssenTargets(env, id, source, foes, extra), launch: (state, c, enemies) => runeLaunchIssen(env, state, c, enemies), step: (state, c, input) => runeStepIssen(env, state, c, input), phase: 'issenPhase' });
    controller.define(86, { targets: (id, source, foes, extra) => runeVoidTargets(env, id, source, foes, extra), launch: (state, c) => runeLaunchVoid(env, state, c), step: (state, c, input) => runeStepVoid(env, state, c, input), phase: 'voidPhase' });
}

function registerGemRelicExtensions(controller, env) {
    controller.define(87, { targets: runeReachOf(env, STORM.range), launch: (state, c) => runeLaunchStorm(env, state, c), step: (state, c, input) => runeStepStorm(env, state, c, input), phase: 'stormFlaskPhase', thrown: true,
        area: c => env.kit.cells(c.aim, 'circle', runeStormRadius(env, c)) });
    controller.define(88, { targets: runeReachOf(env, CAULDRON.range), launch: (state, c) => runeLaunchCauldron(env, state, c), step: (state, c, input) => runeStepCauldron(env, state, c, input), phase: 'cauldronPhase',
        area: c => env.kit.cells(c.aim, 'circle', runeCauldronRadius(env, c)) });
    controller.define(89, { targets: runeReachOf(env, BELL.range), launch: (state, c) => runeLaunchBell(env, state, c), step: (state, c, input) => runeStepBell(env, state, c, input), phase: 'bellPhase', area: c => env.kit.cells(c.aim, 'circle', runeBellRadius(env, c)) });
    controller.define(90, { targets: runeReachOf(env, CHANDELIER.range), launch: (state, c, enemies) => runeLaunchChandelier(env, state, c, enemies), step: (state, c, input) => runeStepChandelier(env, state, c, input), phase: 'chandelierPhase',
        area: c => env.kit.cells(c.aim, 'circle', runeChandRadius(env, c)) });
    controller.define(91, { targets: (id, source, foes, extra) => runeGavelTargets(env, id, source, foes, extra), launch: (state, c, enemies) => runeLaunchGavel(env, state, c, enemies), step: (state, c, input) => runeStepGavel(env, state, c, input), phase: 'gavelPhase' });
}
/** 2026-11-26 전달본 V3.24 후속(96)과 V3.25(97, 99). 98 기공파는 곧은 투사체라 따로 시전하지 않는다. */
function registerGemV325Extensions(controller, env) {
    controller.define(96, { targets: runeReachOf(env, PACT.range), launch: (state, c) => runeLaunchPact(env, state, c), step: (state, c, input) => runeStepPact(env, state, c, input), phase: 'pactPhase',
        area: c => env.kit.cells(c.aim, 'circle', runePactRadius(env, c)) });
    controller.define(97, { targets: (id, source, foes, extra) => runeSoulTargets(env, id, source, foes, extra), launch: (state, c, enemies) => runeLaunchSoul(env, state, c, enemies),
        step: (state, c, input) => runeStepSoul(env, state, c, input), phase: 'soulPhase', area: c => env.kit.cells(c.source, 'square', runeSoulReach(env, c)) });
    controller.define(99, { targets: (id, source, foes, extra) => runeFlurryTargets(env, id, source, foes, extra), launch: (state, c, enemies) => runeLaunchFlurry(env, state, c, enemies),
        step: (state, c, input) => runeStepFlurry(env, state, c, input), phase: 'flurryPhase', area: c => runeFlurryCells(env, c), single: true });
}
/** 2026-11-27 V3.24 시뮬레이터의 93 불의 세례, 94 독사의 춤, 95 강림(이동기). */
function registerGemV324Extensions(controller, env) {
    controller.define(93, { targets: (id, source, foes, extra) => runeBaptismTargets(env, id, source, foes, extra), launch: (state, c, enemies) => runeLaunchBaptism(env, state, c, enemies),
        step: (state, c, input) => runeStepBaptism(env, state, c, input), phase: 'pendulumPhase', area: c => runeBaptismCells(c) });
    controller.define(94, { targets: (id, source, foes, extra) => runeViperTargets(env, id, source, foes, extra), launch: (state, c, enemies) => runeLaunchViper(env, state, c, enemies),
        step: (state, c, input) => runeStepViper(env, state, c, input), phase: 'viperPhase', area: c => env.kit.cells(c.source, 'circle', runeViperRadius(env, c)) });
    controller.define(95, { targets: (id, source, foes) => runeDescentTargets(env, id, source, foes), launch: (state, c, enemies) => runeLaunchDescent(env, state, c, enemies),
        step: (state, c, input) => runeStepDescent(env, state, c, input), phase: 'descentPhase', single: true, area: c => (c.center ? env.kit.cells(c.center, 'circle', c.areaRadius || 0) : []) });
}
// Install once at the original script slot. The shared scheduler retains its public define/kit contract.
export function installGemCastExtensions(controller, deps) {
    const env = { kit: controller.kit, deps };
    registerGemOrbExtensions(controller, env);
    registerGemMovementExtensions(controller, env);
    registerGemRelicExtensions(controller, env);
    registerGemV325Extensions(controller, env);
    registerGemV324Extensions(controller, env);
    return Object.freeze({ ORB, ORBIT, RIFT, ISSEN, VOID, STORM, CAULDRON, BELL, CHANDELIER, GAVEL, PACT, SOUL, FLURRY, PENDULUM, VIPER, DESCENT });
}
