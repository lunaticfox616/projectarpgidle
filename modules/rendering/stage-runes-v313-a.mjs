import { createStageRuneSpace } from './stage-rune-space.mjs';
import { createStageFrostOrb } from './stage-frost-orb.mjs';
import { createStageLightningOrbit } from './stage-lightning-orbit.mjs';
import { createStageSingularity } from './stage-singularity.mjs';
import { createStageIssen } from './stage-issen.mjs';
import { createStageVoidPossession } from './stage-void-possession.mjs';

/** One cache owner; each action keeps its own playback state. */
export function createStageRunesV313A(deps) {
    const shared = createStageRuneSpace(deps);
    const part0 = createStageFrostOrb(deps, shared);
    const part1 = createStageLightningOrbit(deps, shared);
    const part2 = createStageSingularity(deps, shared);
    const part3 = createStageIssen(deps, shared);
    const part4 = createStageVoidPossession(deps, shared);
    return Object.freeze({
        frozenOrb: part0.frozenOrb.bind(part0),
        orbit: part1.orbit.bind(part1),
        zap: part1.zap.bind(part1),
        rift: part2.rift.bind(part2),
        collapse: part2.collapse.bind(part2),
        issenLine: part3.issenLine.bind(part3),
        issenCut: part3.issenCut.bind(part3),
        voidPull: part4.voidPull.bind(part4),
        voidSpirit: part4.voidSpirit.bind(part4),
        voidWeak: part4.voidWeak.bind(part4)
    });
}
