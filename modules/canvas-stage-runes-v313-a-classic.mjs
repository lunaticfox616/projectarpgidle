import { createStageRunesV313A } from './rendering/stage-runes-v313-a.mjs';

const native = createStageRunesV313A({
    get stageSkillKit() { return stageSkillKit; },
    get STAGE_SKILL_VFX() { return STAGE_SKILL_VFX; },
    get stageSkillVfx() { return stageSkillVfx; },
    get stageSkillStrokes() { return stageSkillStrokes; },
    get getCombatGridSize() { return getCombatGridSize; },
    get stagePictures() { return stagePictures; },
    get document() { return document; },
    get stageRoster() { return stageRoster; },
    get STAGE_VIEW() { return STAGE_VIEW; },
    onCutBlocked(error, operation) { console.warn(`[stageRunesV313A] ${operation}: slash mask unavailable`, error); }
});
const stageRunesV313A = Object.freeze({
    frozenOrb: native.frozenOrb,
    orbit: native.orbit,
    zap: native.zap,
    rift: native.rift,
    collapse: native.collapse,
    issenLine: native.issenLine,
    issenCut: native.issenCut,
    voidPull: native.voidPull,
    voidSpirit: native.voidSpirit,
    voidWeak: native.voidWeak
});
safeExposeGlobals({ stageRunesV313A });
