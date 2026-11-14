import { createStageSkillRunes } from './rendering/stage-skill-runes.mjs';

const native = createStageSkillRunes({
    get stageSkillKit() { return stageSkillKit; },
    get stageSkillStrokes() { return stageSkillStrokes; },
    get stageSkillSpells() { return stageSkillSpells; },
    get SKILL_DB() { return SKILL_DB; },
    get battleFx() { return battleFx; },
    get stageSkillVfx() { return stageSkillVfx; },
    get PROJECTILE_FLIGHT_LIFT() { return PROJECTILE_FLIGHT_LIFT; },
    get stageView() { return typeof stageView === 'undefined' ? undefined : stageView; },
    get getStageHeroStance() { return typeof getStageHeroStance === 'undefined' ? undefined : getStageHeroStance; },
    get getHeroAppearanceId() { return getHeroAppearanceId; },
    get stageActors() { return stageActors; },
    get getEquippedWeaponStance() { return typeof getEquippedWeaponStance === 'undefined' ? undefined : getEquippedWeaponStance; },
    get STAGE_SKILL_VFX() { return STAGE_SKILL_VFX; }
});
const stageSkillRunes = Object.freeze({
    swing: (gem, fx, look) => native.swing(game, gem, fx, look),
    drawsSwing: native.drawsSwing,
    victim: (gem, hit, lead) => native.victim(game, gem, hit, lead),
    claim: (gem, event, view, hooks) => native.claim(game, gem, event, view, hooks),
    windup: native.windup,
    moves: native.moves,
    mobility: native.mobility,
    bow: native.bow,
    bowFlash: native.bowFlash,
    hitRef: native.hitRef,
    hitRefs: native.hitRefs,
    heroAir: native.heroAir
});
safeExposeGlobals({ stageSkillRunes });
