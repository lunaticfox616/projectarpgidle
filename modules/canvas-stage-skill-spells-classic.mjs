import { createStageSkillSpells } from './rendering/stage-skill-spells.mjs';

const native = createStageSkillSpells({
    get stageSkillStrokes() { return stageSkillStrokes; },
    get STAGE_SKILL_VFX() { return STAGE_SKILL_VFX; },
    get stageSkillVfx() { return stageSkillVfx; },
    get document() { return document; },
    get stageSkillDraws() { return stageSkillDraws; }
});
const stageSkillSpells = Object.freeze({
    iceRing: native.iceRing,
    frostQuake: native.frostQuake,
    frostErupt: native.frostErupt,
    emberShout: native.emberShout,
    frostCone: native.frostCone,
    discharge: native.discharge,
    guillotine: native.guillotine,
    fallSpear: native.fallSpear,
    volleyUp: native.volleyUp,
    arrowRain: native.arrowRain,
    cosmos: native.cosmos,
    glassBreak: native.glassBreak,
    glassShard: native.glassShard,
    glassStab: native.glassStab,
    charge: native.charge,
    flipTrail: native.flipTrail,
    fireZone: native.fireZone
});
safeExposeGlobals({ stageSkillSpells });
