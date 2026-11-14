import { createStageSkillRules } from './rendering/stage-skill-rules.mjs';

const native = createStageSkillRules({
    get stageSkillKit() { return stageSkillKit; },
    get stageSkillVfx() { return stageSkillVfx; },
    get SKILL_DB() { return SKILL_DB; },
    get stageSkillDraws() { return stageSkillDraws; },
    get stageSkillRunes() { return stageSkillRunes; },
    get stageRuneRemakes() { return stageRuneRemakes; },
    get stageProjectileImpact() { return stageProjectileImpact; },
    get STAGE_SKILL_VFX() { return STAGE_SKILL_VFX; },
    get supports() { return window.GameModules.combat.supports; },
    get stageActors() { return stageActors; },
    get stageSkillSigil() { return stageSkillSigil; },
    get stageSkillPolish() { return stageSkillPolish; },
    get createSeededRng() { return createSeededRng; },
    get stageSkillSpells() { return stageSkillSpells; },
    get stageSkillCasts() { return stageSkillCasts; }
});
const stageSkillRules = Object.freeze({
    claim: native.claim,
    hit: (fx) => native.hit(game, fx),
    windup: native.windup,
    repeat: (fx, now) => native.repeat(game, fx, now),
    clipsOf: native.clipsOf,
    owns: native.owns
});
safeExposeGlobals({ stageSkillRules });
