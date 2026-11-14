import { createStageProjectileImpact } from './rendering/stage-projectile-impact.mjs';

const native = createStageProjectileImpact({
    get stageSkillKit() { return stageSkillKit; },
    get STAGE_SKILL_VFX() { return STAGE_SKILL_VFX; },
    get SKILL_DB() { return SKILL_DB; },
    get stageSkillVfx() { return stageSkillVfx; },
    get STAGE_VIEW() { return STAGE_VIEW; }
});
const stageProjectileImpact = Object.freeze({
    note: native.note,
    refs: native.refs,
    shake: native.shake
});
safeExposeGlobals({ stageProjectileImpact });
