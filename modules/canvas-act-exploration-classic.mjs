import { createActExplorationView } from './rendering/act-exploration.mjs';

// The object actions extension loads next; only its drawing API flows into the view.
const native = createActExplorationView({
    get uiDisplay() { return typeof uiDisplay === 'undefined' ? undefined : uiDisplay; },
    get actExplorationState() { return actExplorationState; },
    get actExplorationMap() { return actExplorationMap; },
    get actExplorationMotion() { return actExplorationMotion; },
    get stageView() { return stageView.layout; },
    get woodsmanView() { return woodsmanView; },
    get stageScene() { return typeof stageScene === 'undefined' ? undefined : stageScene.scenery; },
    get actExplorationDoors() { return actExplorationDoors; },
    get stageRoomsView() { return stageRoomsView.renderer; },
    get hasGridCell() { return hasGridCell; },
    get getGridUnitCenter() { return getGridUnitCenter; },
    get battleVisualState() { return battleVisualState; },
    get performance() { return performance; },
    get objects() { return actExplorationView.objects.renderer; },
    get actExplorationSight() { return actExplorationSight; },
    get messageFrames() { return typeof messageFrames === 'undefined' ? undefined : messageFrames; },
    get ACT_EXPLORATION_BACKDROPS() { return ACT_EXPLORATION_BACKDROPS; },
    get document() { return document; },
    get stageStory() { return stageStory.scenery; },
    get actTitleCard() { return actTitleCard.scenery; }
});
const actExplorationView = {
    projection: (width, height) => native.projection(game, width, height),
    background: (ctx, width, height, p) => native.background(game, ctx, width, height, p),
    appendScenery: (actors, state) => native.appendScenery(game, actors, state),
    waitingEnemies: () => native.waitingEnemies(game),
    inSight: native.inSight,
    drawScenery: (ctx, actor, state) => native.drawScenery(game, ctx, actor, state),
    bossRoomGlow: () => native.bossRoomGlow(game),
    cellAt: (point, precise) => native.cellAt(game, point, precise)
};
safeExposeGlobals({ actExplorationView });
