import { createStageRunesV313B } from './rendering/stage-runes-v313-b.mjs';

const native = createStageRunesV313B({
    get stageSkillKit() { return stageSkillKit; },
    get stageSkillStrokes() { return stageSkillStrokes; },
    get STAGE_SKILL_VFX() { return STAGE_SKILL_VFX; },
    get stageSkillVfx() { return stageSkillVfx; },
    get document() { return document; },
    get stageSkillDraws() { return stageSkillDraws; },
    get stageGothicRemakes() { return stageGothicRemakes; }
});
const stageRunesV313B = Object.freeze({
    stormFlight: native.stormFlight,
    stormCharge: native.stormCharge,
    stormBolt: native.stormBolt,
    cauldron: native.cauldron,
    cauldronSplash: native.cauldronSplash,
    bell: native.bell,
    chandelier: native.chandelier,
    chandelierBurn: native.chandelierBurn,
    gavel: native.gavel,
    verdict: native.verdict
});
safeExposeGlobals({ stageRunesV313B });
