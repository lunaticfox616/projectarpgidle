import { createStageSkillKit } from './rendering/stage-skill-kit.mjs';

const native = createStageSkillKit({
    get STAGE_SKILL_VFX() { return STAGE_SKILL_VFX; },
    get SKILL_FX_ATLAS() { return SKILL_FX_ATLAS; },
    get SKILL_DB() { return SKILL_DB; },
    get STAGE_VIEW() { return STAGE_VIEW; },
    get getEquippedWeaponStance() { return getEquippedWeaponStance; },
    get stageSkillVfx() { return stageSkillVfx; },
    get battleVisualState() { return typeof battleVisualState === 'undefined' ? undefined : battleVisualState; },
    get hasGridCell() { return hasGridCell; },
    get getGridUnitFootprint() { return getGridUnitFootprint; },
    get stageActors() { return typeof stageActors === 'undefined' ? undefined : stageActors; }
});
const stageSkillKit = Object.freeze({
    catalog: native.catalog,
    WIDE: native.WIDE,
    DEEP: native.DEEP,
    BODY: native.BODY,
    HAND: native.HAND,
    gemId: native.gemId,
    gemOf: native.gemOf,
    firedFromBow: native.firedFromBow,
    ramp: native.ramp,
    ref: native.ref,
    onGround: native.onGround,
    heroSpot: () => native.heroSpot(game),
    enemy: (id) => native.enemy(game, id),
    heroDrawn: () => native.heroDrawn(game),
    enemySpot: native.enemySpot,
    heroFace: native.heroFace,
    noteFace: native.noteFace,
    lastFace: native.lastFace,
    at: native.at,
    screen: native.screen,
    along: native.along,
    emerge: native.emerge
});
safeExposeGlobals({ stageSkillKit });
