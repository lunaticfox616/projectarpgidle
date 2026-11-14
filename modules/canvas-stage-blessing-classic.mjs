import { createStageBlessing } from './rendering/stage-blessing.mjs';

const native = createStageBlessing({
    get STAGE_SKILL_VFX() { return STAGE_SKILL_VFX; },
    get stageSkillKit() { return stageSkillKit; },
    get stageSkillVfx() { return stageSkillVfx; },
    get supports() { return window.GameModules && window.GameModules.combat && window.GameModules.combat.supports; },
    get STAGE_VIEW() { return STAGE_VIEW; }
});
const stageBlessing = Object.freeze({
    frame: (now) => native.frame(game, now),
    draw: native.draw,
    aura: native.aura,
    clipsOf: native.clipsOf
});
safeExposeGlobals({ stageBlessing });
