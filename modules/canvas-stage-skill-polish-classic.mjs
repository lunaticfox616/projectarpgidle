import { createStageSkillPolish } from './rendering/stage-skill-polish.mjs';

const native = createStageSkillPolish({
    get stageSkillKit() { return stageSkillKit; },
    get STAGE_SKILL_VFX() { return STAGE_SKILL_VFX; },
    get stageSkillVfx() { return stageSkillVfx; },
    get gemCoreForge() { return gemCoreForge; },
    get GEM_CORE_FORGE() { return GEM_CORE_FORGE; },
    get STAGE_VIEW() { return STAGE_VIEW; }
});
const stageSkillPolish = Object.freeze({
    cast: (gem, o) => native.cast(game, gem, o),
    refs: native.refs,
    handSigil: native.handSigil,
    recast: native.recast,
    forgeAura: () => native.forgeAura(game)
});
safeExposeGlobals({ stageSkillPolish });
