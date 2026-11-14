import { createStageSkillStrokes } from './rendering/stage-skill-strokes.mjs';

const native = createStageSkillStrokes({
    get STAGE_SKILL_VFX() { return STAGE_SKILL_VFX; },
    get stageSkillVfx() { return stageSkillVfx; },
    get document() { return document; },
    get parseInt() { return parseInt; }
});
const stageSkillStrokes = Object.freeze({
    hang: native.hang,
    random: native.random,
    line: native.line,
    lens: native.lens,
    ramp: native.ramp,
    ink: native.ink,
    crossCut: native.crossCut,
    vCut: native.vCut,
    upCut: native.upCut,
    riseSwing: native.riseSwing,
    slashWave: native.slashWave,
    frostMist: native.frostMist,
    flameFan: native.flameFan,
    dragSpark: native.dragSpark,
    scorch: native.scorch,
    fuse: native.fuse,
    flickerTrail: native.flickerTrail,
    flickerCut: native.flickerCut
});
safeExposeGlobals({ stageSkillStrokes });
