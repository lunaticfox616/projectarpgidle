import { createRedrawnSkillRenderer } from './rendering/redrawn/skill-renderer.mjs';

/** Transitional classic boundary; final scene composition supplies these same read-only ports. */
const native = createRedrawnSkillRenderer({
    get atlas() { return SKILL_FX_ATLAS; },
    get skillDb() { return SKILL_DB; },
    get skillGrid() { return SKILL_GRID_DB; },
    get remake() { return fxRemake; },
    readHits: () => battleFx,
    readPlayerPosition: () => typeof battleVisualState === 'object' ? battleVisualState.playerPos : null,
    heroSwingsBigCenser: () => {
        if (typeof stageView !== 'object' || typeof getStageHeroStance !== 'function') return false;
        const classId = getHeroAppearanceId(), stance = getStageHeroStance();
        const motion = stageActors.motionFor('파문심판', classId, stance);
        return motion === 'special2' && !!stageActors.clipOf(classId, stance, motion);
    }
});
const redrawnSkillFx = Object.freeze({
    ...native,
    drawLayer: (layer, visualNow) => native.drawLayer(layer, visualNow, worldTreeSkillFx.castClock()),
    weaponHidden: visualNow => native.weaponHidden(visualNow, worldTreeSkillFx.castClock())
});
safeExposeGlobals({ redrawnSkillFx });
