import { createStageRitualBrush } from './stage-ritual-brush.mjs';
import { createStageStormFlask } from './stage-storm-flask.mjs';
import { createStageCauldron } from './stage-cauldron.mjs';
import { createStageRitualBell } from './stage-ritual-bell.mjs';
import { createStageRitualChandelier } from './stage-ritual-chandelier.mjs';
import { createStageRitualGavel } from './stage-ritual-gavel.mjs';

/** One cache owner; each action keeps its own playback state. */
export function createStageRunesV313B(deps) {
    const shared = createStageRitualBrush(deps);
    const part0 = createStageStormFlask(deps, shared);
    const part1 = createStageCauldron(deps, shared);
    const part2 = createStageRitualBell(deps, shared);
    const part3 = createStageRitualChandelier(deps, shared);
    const part4 = createStageRitualGavel(deps, shared);
    return Object.freeze({
        stormFlight: part0.stormFlight.bind(part0),
        stormCharge: part0.stormCharge.bind(part0),
        stormBolt: part0.stormBolt.bind(part0),
        cauldron: part1.cauldron.bind(part1),
        cauldronSplash: part1.cauldronSplash.bind(part1),
        bell: part2.bell.bind(part2),
        chandelier: part3.chandelier.bind(part3),
        chandelierBurn: part3.chandelierBurn.bind(part3),
        gavel: part4.gavel.bind(part4),
        verdict: part4.verdict.bind(part4)
    });
}
