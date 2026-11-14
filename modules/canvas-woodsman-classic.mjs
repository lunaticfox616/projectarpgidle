import { createWoodsmanView } from './rendering/woodsman-view.mjs';

const native = createWoodsmanView({
    get isForegroundGameplayPausedForBackground() { return isForegroundGameplayPausedForBackground; },
    get getCombatTime() { return getCombatTime; },
    get bossAttackView() { return bossAttackView; },
    get stageAssetRetry() { return stageAssetRetry; },
    get WOODSMAN_BATTLE() { return WOODSMAN_BATTLE; },
    get woodsmanBattle() { return woodsmanBattle; },
    get performance() { return performance; },
    get OUTSIDE_CHAOS_ZONE_ID() { return OUTSIDE_CHAOS_ZONE_ID; },
    get actExplorationRooms() { return actExplorationRooms; },
    get stageRegionFit() { return stageRegionFit; },
    get stageView() { return stageView; },
    get STAGE_VIEW() { return STAGE_VIEW; },
    get bossEntranceView() { return bossEntranceView; },
    get getCombatGridSize() { return getCombatGridSize; },
    get Path2D() { return Path2D; },
    get uiDisplay() { return uiDisplay; },
    get gridCellKey() { return gridCellKey; },
    get woodsmanStumps() { return woodsmanStumps; },
    get getGridFootprintCells() { return getGridFootprintCells; },
    get stageRoster() { return stageRoster; }
});
const woodsmanView = Object.freeze({
    active: native.active,
    fitTile: (map, width, height, normal) => native.fitTile(game, map, width, height, normal),
    body: (ctx, view, p, picture) => native.body(game, ctx, view, p, picture),
    field: (ctx, projection) => native.field(game, ctx, projection),
    foreground: (ctx, projection) => native.foreground(game, ctx, projection),
    stumps: (actors, projection) => native.stumps(game, actors, projection),
    poseAt: native.poseAt,
    hitAt: (point) => native.hitAt(game, point),
    speechAnchor: native.speechAnchor
});
safeExposeGlobals({ woodsmanView });
