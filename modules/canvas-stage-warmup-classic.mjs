import { createStageWarmup } from './rendering/stage-warmup.mjs';

const native = createStageWarmup({
    get mobilitySkill() { return mobilitySkill; },
    get SKILL_DB() { return SKILL_DB; },
    get stageSkillVfx() { return stageSkillVfx.preparation; },
    get stageSkillRules() { return stageSkillRules; },
    get stageBlessing() { return stageBlessing; },
    get stageGothicRemakes() { return stageGothicRemakes; },
    get SKILL_FX_ATLAS() { return SKILL_FX_ATLAS; },
    get fxRemake() { return fxRemake; },
    get actExplorationState() { return actExplorationState; },
    get stageRoster() { return stageRoster.preparation; },
    get battleAssets() { return battleAssets; },
    get HTMLImageElement() { return HTMLImageElement; },
    get performance() { return performance; }
});
const stageWarmup = Object.freeze({
    afterBattleDraw: (ctx) => native.afterBattleDraw(game, ctx)
});
safeExposeGlobals({ stageWarmup });
