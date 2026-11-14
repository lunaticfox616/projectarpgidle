import { createStageRegion } from './rendering/stage-region.mjs';

const region = createStageRegion({
    get stageRegionFit() { return stageRegionFit; },
    get STAGE_REGIONS() { return typeof STAGE_REGIONS === 'undefined' ? undefined : STAGE_REGIONS; },
    get stageAssetRetry() { return stageAssetRetry; },
    get stageDots() { return stageDots; },
    get HTMLCanvasElement() { return HTMLCanvasElement; },
    get stageOcean() { return typeof stageOcean === 'undefined' ? undefined : stageOcean.lighting; },
    get woodsmanView() { return woodsmanView; },
    get document() { return document; },
    get createSeededRng() { return createSeededRng; },
    get actExplorationDoors() { return actExplorationDoors; },
    get stageActors() { return stageActors; },
    get stageDoorMarks() { return stageDoorMarks; },
    get actExplorationState() { return actExplorationState; }
});
// Only the legacy boundary reads the active game. Native drawing receives its owner.
const stageRegion = Object.freeze({
    ...region,
    drawObject: (ctx, look, at) => region.drawObject(game, ctx, look, at),
    outlineObject: (ctx, look, at, colour) => region.outlineObject(game, ctx, look, at, colour),
    objectTop: (look, at) => region.objectTop(game, look, at),
    objects: Object.freeze({ drawObject: region.drawObject, outlineObject: region.outlineObject, objectTop: region.objectTop })
});
safeExposeGlobals({ stageRegion });
