import { createStageSkillDraws } from './rendering/stage-skill-draws.mjs';

const native = createStageSkillDraws({
    get parseInt() { return parseInt; },
    get STAGE_SKILL_VFX() { return STAGE_SKILL_VFX; },
    get document() { return document; },
    get stageDots() { return stageDots; },
    get i18n() { return i18n; },
    get drawCrispCanvasText() { return drawCrispCanvasText; }
});
const stageSkillDraws = Object.freeze({
    pierce: native.pierce,
    gash: native.gash,
    body: native.body,
    rock: native.rock,
    echo: native.echo
});
safeExposeGlobals({ stageSkillDraws });
