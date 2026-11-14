import { createStageSkillSigil } from './rendering/stage-skill-sigil.mjs';

const native = createStageSkillSigil({
    get parseInt() { return parseInt; },
    get STAGE_SKILL_VFX() { return STAGE_SKILL_VFX; },
    get stageSkillVfx() { return stageSkillVfx; },
    get STAGE_VIEW() { return STAGE_VIEW; }
});
const stageSkillSigil = Object.freeze({
    cast: native.cast,
    draw: native.draw,
    aura: native.aura,
    clear: native.clear
});
safeExposeGlobals({ stageSkillSigil });
