import { createStageSceneAssets } from './rendering/stage-scene-assets.mjs';
import { createStageSceneView } from './rendering/stage-scene.mjs';

const assets = createStageSceneAssets({
    get STAGE_SCENES() { return STAGE_SCENES; },
    get stageAssetRetry() { return stageAssetRetry; },
    get stageRegion() { return typeof stageRegion === 'undefined' ? undefined : stageRegion; },
    get stageDoorMarks() { return stageDoorMarks; },
    get stageDots() { return stageDots; },
    get stageView() { return stageView; },
    get STAGE_VIEW() { return STAGE_VIEW; },
    get document() { return document; }
});
const view = createStageSceneView(assets, {
    get actExplorationState() { return actExplorationState; },
    get actExplorationDoors() { return actExplorationDoors; },
    get stageRoomPictures() { return stageRoomPictures; },
    get stageActors() { return stageActors; },
    get stageDoorMarks() { return stageDoorMarks; },
    get stageRegion() { return typeof stageRegion === 'undefined' ? undefined : stageRegion; },
    get stageDots() { return stageDots; },
    viewportSize: () => window.GameModules.battlefieldPresentation.viewport.size()
});
const stageScene = Object.freeze({
    ready: assets.ready, pending: assets.pending, coverTile: assets.coverTile,
    drawFar: assets.drawFar, paintRoom: assets.paintRoom, fitJobs: assets.fitJobs,
    append: (actors, state) => view.append(game, actors, state),
    draw: (ctx, actor, state) => view.draw(game, ctx, actor, state),
    drawMarks: (ctx, p) => view.drawMarks(game, ctx, p),
    // The queue receives only preparation operations. None can call the live view.
    preparation: Object.freeze({ ready: assets.ready, paintRoom: assets.paintRoom, fitJobs: assets.fitJobs }),
    scenery: Object.freeze({ coverTile: assets.coverTile, append: view.append, draw: view.draw })
});
safeExposeGlobals({ stageScene });
