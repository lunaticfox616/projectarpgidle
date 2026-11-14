import { createStageActors } from './rendering/stage-actors.mjs';
import { createStageView } from './rendering/stage-view.mjs';

const native = createStageActors({
    get STAGE_CHARACTERS() { return typeof STAGE_CHARACTERS === 'undefined' ? undefined : STAGE_CHARACTERS; },
    get STAGE_VIEW() { return STAGE_VIEW; },
    get stageSkillKit() { return typeof stageSkillKit === 'undefined' ? undefined : stageSkillKit.catalog; },
    get STAGE_SKILL_VFX() { return typeof STAGE_SKILL_VFX === 'undefined' ? undefined : STAGE_SKILL_VFX; },
    get stagePictures() { return stagePictures; },
    get getWeaponCategoryId() { return getWeaponCategoryId; },
    get SKILL_RUNE_STANCE_BY_CATEGORY() { return SKILL_RUNE_STANCE_BY_CATEGORY; },
    get STAGE_HERO_RISE() { return STAGE_HERO_RISE; },
    get document() { return document; },
    get stageRings() { return stageRings; },
    get stageDots() { return stageDots; },
    get stageSkillSigil() { return typeof stageSkillSigil === 'undefined' ? undefined : stageSkillSigil; },
    get stageBlessing() { return typeof stageBlessing === 'undefined' ? undefined : stageBlessing; },
    get stageSkillPolish() { return typeof stageSkillPolish === 'undefined' ? undefined : stageSkillPolish; }
});
const stageActors = native;
const view = createStageView({
    get location() { return typeof location === 'object' ? location : undefined; },
    get URLSearchParams() { return URLSearchParams; },
    get STAGE_VIEW() { return STAGE_VIEW; },
    get STAGE_ROOMS() { return STAGE_ROOMS; },
    get actExplorationRoomPlans() { return typeof actExplorationRoomPlans === 'object' ? actExplorationRoomPlans : undefined; },
    get document() { return typeof document === 'object' ? document : undefined; },
    get window() { return window; },
    get uiDisplay() { return typeof uiDisplay === 'object' ? uiDisplay : undefined; }
});
const stageView = Object.freeze({
    ...view,
    layout: view,
    tile: (width, height, rows) => view.tile(game.settings, width, height, rows)
});
safeExposeGlobals({ stageActors, stageView });
