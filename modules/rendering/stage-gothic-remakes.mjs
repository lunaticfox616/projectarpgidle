import { createStageGothicArt } from './stage-gothic-art.mjs';
import { createStageGothicBell } from './stage-gothic-bell.mjs';
import { createStageGothicChandelier } from './stage-gothic-chandelier.mjs';
import { createStageGothicGavel } from './stage-gothic-gavel.mjs';
import { createStageGothicJudgment } from './stage-gothic-judgment.mjs';
import { createStageGothicCenser } from './stage-gothic-censer.mjs';
import { createStageGothicSwords } from './stage-gothic-swords.mjs';

/** One cache owner; each action keeps its own playback state. */
export function createStageGothicRemakes(deps) {
    const shared = createStageGothicArt(deps);
    const part0 = createStageGothicBell(deps, shared);
    const part1 = createStageGothicChandelier(deps, shared);
    const part2 = createStageGothicGavel(deps, shared);
    const part3 = createStageGothicJudgment(deps, shared);
    const part4 = createStageGothicCenser(deps, shared);
    const part5 = createStageGothicSwords(deps, shared);
    return Object.freeze({
        GEMS: shared.GEMS,
        ready: shared.gothicReady.bind(shared),
        bellGround: part0.bellGround.bind(part0),
        bellSky: part0.bellSky.bind(part0),
        chandGround: part1.chandGround.bind(part1),
        chandSky: part1.chandSky.bind(part1),
        gavelGround: part2.gavelGround.bind(part2),
        gavelSky: part2.gavelSky.bind(part2),
        verdictBolt: part3.verdictBolt.bind(part3),
        judgmentBolt: part3.judgmentBolt.bind(part3),
        judgmentRing: part3.judgmentRing.bind(part3),
        judgmentCross: part3.judgmentCross.bind(part3),
        dressCenser: part4.dressCenser.bind(part4),
        incensePuff: part4.incensePuff.bind(part4),
        incenseField: part4.incenseField.bind(part4),
        swordReady: part5.swordReady.bind(part5),
        timeSword: part5.timeSword.bind(part5),
        swordStroke: part5.swordStroke.bind(part5),
        swordContact: part5.swordContact.bind(part5)
    });
}
