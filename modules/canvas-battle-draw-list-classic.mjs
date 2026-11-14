import { createBattleDrawList } from './rendering/battle-draw-list.mjs';

const native = createBattleDrawList({
    get inSight() { return actExplorationState.inSight; },
    get stageView() { return stageView; },
    get resolveEnemyFacingDirection() { return resolveEnemyFacingDirection; },
    get noteEnemySpriteSide() { return noteEnemySpriteSide; },
    get performance() { return performance; },
    get getGridUnitFootprint() { return getGridUnitFootprint; },
    drawnEnemyHeight: enemy => window.GameModules.battlefieldHud.drawnEnemyHeight(enemy),
    get woodsmanView() { return woodsmanView; }
});
const battleDrawList = Object.freeze({
    REACH: native.REACH,
    touchesView: native.touchesView,
    markDrawn: native.markDrawn,
    keepFacing: native.keepFacing,
    noteDrawn: native.noteDrawn,
    enemyAt: native.enemyAt,
    drawnEntry: native.drawnEntry
});
safeExposeGlobals({ battleDrawList });
