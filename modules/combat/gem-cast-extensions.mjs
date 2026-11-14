import { runeReachOf } from './gem-extension-common.mjs';
import { ORB, STORM, CAULDRON, BELL, CHANDELIER, ORBIT, RIFT, ISSEN, VOID, GAVEL } from './gem-extension-values.mjs';
import { runeLaunchFrozenOrb, runeStepFrozenOrb, runeOrbitReach, runeLaunchOrbit, runeStepOrbit } from './gem-extension-orbs.mjs';
import { runeRiftTargets, runeLaunchRift, runeStepRift, runeIssenTargets, runeLaunchIssen, runeStepIssen } from './gem-extension-rifts.mjs';
import { runeVoidTargets, runeLaunchVoid, runeStepVoid } from './gem-extension-void.mjs';
import { runeLaunchStorm, runeStepStorm, runeStormRadius, runeLaunchCauldron, runeStepCauldron, runeCauldronRadius } from './gem-extension-flasks.mjs';
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
// Install once at the original script slot. The shared scheduler retains its public define/kit contract.
export function installGemCastExtensions(controller, deps) {
    const env = { kit: controller.kit, deps };
    registerGemOrbExtensions(controller, env);
    registerGemMovementExtensions(controller, env);
    registerGemRelicExtensions(controller, env);
    return Object.freeze({ ORB, ORBIT, RIFT, ISSEN, VOID, STORM, CAULDRON, BELL, CHANDELIER, GAVEL });
}
