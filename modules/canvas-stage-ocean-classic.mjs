import { createStageOcean } from './rendering/stage-ocean.mjs';

const native = createStageOcean({
    get stageAssetRetry() { return stageAssetRetry; },
    get STAGE_OCEAN() { return typeof STAGE_OCEAN === 'undefined' ? undefined : STAGE_OCEAN; },
    get stageDots() { return stageDots; },
    get actExplorationState() { return actExplorationState; },
    get actExplorationDoors() { return actExplorationDoors; },
    get performance() { return performance; },
    get OCEAN_ZONE_ID() { return OCEAN_ZONE_ID; },
    get stageRegionFit() { return stageRegionFit; },
    get stageActors() { return stageActors; },
    get STAGE_ROOM_PLANS() { return STAGE_ROOM_PLANS; },
    get getBossStageActor() { return typeof getBossStageActor === 'undefined' ? undefined : getBossStageActor; },
    get battleVisualState() { return battleVisualState; },
    get battleFx() { return battleFx; }
});
const lighting = Object.freeze({
    light: native.light,
    shade: () => native.shade(game),
    brightFloor: () => native.brightFloor(game)
});
const stageOcean = Object.freeze({
    ...lighting,
    lighting,
    back: (ctx, view, p, area) => {
        const next = native.back(game, ctx, view, p, area);
        if (next) stageRegion.warm(next);
    },
    ground: (ctx, view) => native.ground(game, ctx, view),
    front: (ctx, scene) => native.front(game, ctx, scene)
});
safeExposeGlobals({ stageOcean });
