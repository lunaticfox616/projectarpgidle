import { createStageNewRunes } from './rendering/stage-new-runes.mjs';

const native = createStageNewRunes({
    get stageSkillKit() { return stageSkillKit; },
    get stageSkillStrokes() { return stageSkillStrokes; },
    get stageSkillVfx() { return stageSkillVfx; },
    get STAGE_SKILL_VFX() { return STAGE_SKILL_VFX; },
    get document() { return document; },
    get stageSkillRunes() { return stageSkillRunes; },
    get stageRoster() { return stageRoster; },
    get STAGE_VIEW() { return STAGE_VIEW; },
    get enemyTimeSlowed() { return typeof enemyTimeSlowed === 'undefined' ? undefined : enemyTimeSlowed; },
    get stageGothicRemakes() { return stageGothicRemakes; }
});
const stageNewRunes = Object.freeze({
    raw: native.raw,
    tint: native.tint,
    homingFly: native.homingFly,
    petrifyBurst: native.petrifyBurst,
    timeField: native.timeField,
    fieldBusy: native.fieldBusy,
    timeBlades: native.timeBlades,
    timeBounce: native.timeBounce,
    glazeOf: native.glazeOf,
    heldAt: native.heldAt
});
safeExposeGlobals({ stageNewRunes });
