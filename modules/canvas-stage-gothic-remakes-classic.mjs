import { createStageGothicRemakes } from './rendering/stage-gothic-remakes.mjs';

const native = createStageGothicRemakes({
    get stageSkillKit() { return stageSkillKit; },
    get stagePictures() { return stagePictures; },
    get document() { return document; },
    get Path2D() { return Path2D; },
    get stageSkillStrokes() { return stageSkillStrokes; },
    get stageSkillVfx() { return stageSkillVfx; }
});
const stageGothicRemakes = Object.freeze({
    GEMS: native.GEMS,
    ready: native.ready,
    bellGround: native.bellGround,
    bellSky: native.bellSky,
    chandGround: native.chandGround,
    chandSky: native.chandSky,
    gavelGround: native.gavelGround,
    gavelSky: native.gavelSky,
    verdictBolt: native.verdictBolt,
    judgmentBolt: native.judgmentBolt,
    judgmentRing: native.judgmentRing,
    judgmentCross: native.judgmentCross,
    dressCenser: native.dressCenser,
    incensePuff: native.incensePuff,
    incenseField: native.incenseField,
    swordReady: native.swordReady,
    timeSword: native.timeSword,
    swordStroke: native.swordStroke,
    swordContact: native.swordContact
});
safeExposeGlobals({ stageGothicRemakes });
