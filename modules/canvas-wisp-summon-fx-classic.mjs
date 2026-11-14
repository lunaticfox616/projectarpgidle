import { createWispSummonFx } from './rendering/wisp-summon-fx.mjs';

const native = createWispSummonFx({
    get WISP_SUMMONS() { return WISP_SUMMONS; },
    get stageSkillCasts() { return typeof stageSkillCasts === 'undefined' ? undefined : stageSkillCasts; },
    get fxRemake() { return fxRemake; },
    get battleFx() { return battleFx; }
});
const wispSummonFx = Object.freeze({
    drawLayer: native.drawLayer
});
safeExposeGlobals({ wispSummonFx });
