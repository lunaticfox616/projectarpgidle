import { createStageSkillCasts } from './rendering/stage-skill-casts.mjs';

const native = createStageSkillCasts({
    get stageSkillKit() { return stageSkillKit; },
    get stageSkillVfx() { return stageSkillVfx; },
    get stageSkillDraws() { return stageSkillDraws; },
    get PROJECTILE_FLIGHT_LIFT() { return PROJECTILE_FLIGHT_LIFT; },
    get stageSkillRunes() { return stageSkillRunes; },
    get stageSkillSpells() { return stageSkillSpells; },
    get STAGE_SKILL_VFX() { return STAGE_SKILL_VFX; },
    get stageRuneRemakes() { return stageRuneRemakes; },
    get stageActors() { return stageActors; },
    get stageSkillStrokes() { return stageSkillStrokes; },
    get stageNewRunes() { return stageNewRunes; },
    get stageRunesV313A() { return stageRunesV313A; },
    get stageRunesV313B() { return stageRunesV313B; },
    get STAGE_VIEW() { return STAGE_VIEW; },
    get stageAssetRetry() { return stageAssetRetry; },
    get WISP_SUMMONS() { return WISP_SUMMONS; },
    get battleFx() { return battleFx; }
});
const stageSkillCasts = Object.freeze({
    claim: native.claim,
    wispBody: native.wispBody,
    wispShots: native.wispShots,
    wispHit: native.wispHit
});
safeExposeGlobals({ stageSkillCasts });
