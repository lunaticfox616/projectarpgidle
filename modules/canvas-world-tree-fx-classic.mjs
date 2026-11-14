import { createWorldTreeSkillFx } from './rendering/world-tree-skill-fx.mjs';

const native = createWorldTreeSkillFx({
    get fxRemake() { return fxRemake; },
    get SKILL_FX_ATLAS() { return SKILL_FX_ATLAS; },
    get stageSkillRules() { return typeof stageSkillRules === 'undefined' ? undefined : stageSkillRules; },
    get mobilitySkill() { return mobilitySkill; },
    get getStageHeroStance() { return typeof getStageHeroStance === 'undefined' ? undefined : getStageHeroStance; },
    get stageActors() { return stageActors; },
    get getHeroAppearanceId() { return getHeroAppearanceId; },
    get getCombatTime() { return getCombatTime; },
    get performance() { return performance; },
    get document() { return document; },
    get skillGemCombatRuntime() { return window.GameModules.state.combat.skillGemCombatRuntime; },
    get redrawnSkillFx() { return redrawnSkillFx; },
    get getSkillGemVfxImage() { return getSkillGemVfxImage; },
    get worldTreeNativeFx() { return worldTreeNativeFx; },
    get battleVisualState() { return battleVisualState; },
    get SKILL_DB() { return SKILL_DB; },
    get PROJECTILE_FLIGHT_LIFT() { return PROJECTILE_FLIGHT_LIFT; },
    get PROJECTILE_HAND_REACH() { return PROJECTILE_HAND_REACH; }
});
const worldTreeSkillFx = {
    beginFrame: native.beginFrame,
    renderEvent: native.renderEvent,
    travel: native.travel,
    impact: native.impact,
    mobility: native.mobility,
    queueHit: native.queueHit,
    drawQueued: native.drawQueued,
    swing: native.swing,
    castFrame: (ctx, projection, layer) => native.castFrame(game, ctx, projection, layer),
    actorState: (state) => native.actorState(game, state),
    castClock: native.castClock
};
safeExposeGlobals({ worldTreeSkillFx });
