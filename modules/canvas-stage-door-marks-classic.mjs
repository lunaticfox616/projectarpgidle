import { createStageDoorMarks } from './rendering/stage-door-marks.mjs';

const native = createStageDoorMarks({
    get actExplorationState() { return actExplorationState; },
    get actExplorationDoors() { return actExplorationDoors; },
    get actExplorationMap() { return actExplorationMap; },
    get STAGE_REGIONS() { return STAGE_REGIONS; },
    get stageAssetRetry() { return stageAssetRetry; },
    get STAGE_ROOMS() { return STAGE_ROOMS; },
    get document() { return document; },
    get performance() { return performance; },
    get stageOcean() { return typeof stageOcean === 'undefined' ? undefined : stageOcean.lighting; },
    get i18n() { return i18n; },
    get drawCrispCanvasText() { return drawCrispCanvasText; },
    get messageFrames() { return typeof messageFrames === 'undefined' ? undefined : messageFrames; },
    viewportSize: () => window.GameModules.battlefieldPresentation?.viewport.size()
});
const stageDoorMarks = Object.freeze({
    begin: native.begin,
    targetAt: (point) => native.targetAt(game, point),
    arrows: (ctx, box, door, look) => native.arrows(game, ctx, box, door, look),
    edges: (ctx, p, rows, width) => native.edges(game, ctx, p, rows, width),
    underFrame: native.underFrame,
    seal: Object.freeze({
        ready: () => native.seal.ready(game),
        note: native.seal.note,
        body: native.seal.body,
        draw: (ctx, run, row, at) => native.seal.draw(game, ctx, run, row, at)
    })
});
safeExposeGlobals({ stageDoorMarks });
