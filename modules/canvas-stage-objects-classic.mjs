import { createStageObjects } from './rendering/stage-objects.mjs';

const native = createStageObjects({
    get actExplorationState() { return actExplorationState; },
    get actExplorationMap() { return actExplorationMap; },
    get STAGE_OBJECTS() { return STAGE_OBJECTS; },
    get stageAssetRetry() { return stageAssetRetry; },
    get stageStory() { return stageStory.objects; },
    get stageRegion() { return typeof stageRegion === 'undefined' ? undefined : stageRegion.objects; },
    get stageDots() { return stageDots; },
    get document() { return document; }
});
const stageObjects = Object.freeze({
    ready: () => native.ready(game),
    draw: (ctx, look, at) => native.draw(game, ctx, look, at),
    outline: (ctx, look, at, colour) => native.outline(game, ctx, look, at, colour),
    top: (look, at) => native.top(game, look, at),
    renderer: native
});
safeExposeGlobals({ stageObjects });
