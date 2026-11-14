import { createStageSkillVfx } from './rendering/stage-skill-vfx.mjs';

const native = createStageSkillVfx({
    get STAGE_SKILL_VFX() { return typeof STAGE_SKILL_VFX === 'undefined' ? undefined : STAGE_SKILL_VFX; },
    get stageAssetRetry() { return stageAssetRetry; },
    get stageView() { return typeof stageView === 'undefined' ? undefined : stageView; },
    get parseInt() { return parseInt; },
    get document() { return document; },
    get performance() { return performance; },
    get clearTimeout() { return clearTimeout.bind(globalThis); },
    get setTimeout() { return setTimeout.bind(globalThis); },
    get stagePictures() { return stagePictures; },
    get STAGE_VIEW() { return STAGE_VIEW; },
    onTintBlocked: (error, key) => console.warn('[stageSkillVfx] Cannot read effect pixels; using source colours', key, error)
});
const stageSkillVfx = Object.freeze({
    ready: () => native.ready(game),
    play: native.play,
    paint: native.paint,
    watch: native.watch,
    draw: (ctx, layer, p) => native.draw(game, ctx, layer, p),
    tick: (time) => native.tick(game, time),
    stamp: native.stamp,
    now: native.now,
    projection: native.projection,
    clipOf: native.clipOf,
    picture: native.picture,
    clipWidth: native.clipWidth,
    clipLength: native.clipLength,
    keepStrips: (refs) => native.keepStrips(game, refs),
    clear: native.clear,
    dispose: native.dispose,
    preparation: Object.freeze({ ready: native.ready, keepStrips: native.keepStrips }),
    HIT: native.HIT
});
safeExposeGlobals({ stageSkillVfx });
