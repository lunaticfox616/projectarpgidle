import { createBossEntrance } from './rendering/boss-entrance.mjs';
import { createObserverEntrance } from './rendering/observer-entrance.mjs';

const native = createBossEntrance({
    get getElementColor() { return getElementColor; },
    get battleFx() { return battleFx; },
    get stageView() { return typeof stageView === 'undefined' ? undefined : stageView; },
    get uiDisplay() { return uiDisplay; },
    get woodsmanBattle() { return woodsmanBattle; },
    get getBattleLayout() { return getBattleLayout; },
    get STAGE_VIEW() { return STAGE_VIEW; },
    get STAGE_ROOMS() { return STAGE_ROOMS; },
    get battleVisualState() { return battleVisualState; },
    get getHeroHeadY() { return getHeroHeadY; }
});
const observer = createObserverEntrance({
    get BEYOND_BOUNDARY_UNLOCK_BOSS_ID() { return BEYOND_BOUNDARY_UNLOCK_BOSS_ID; },
    get bossMoves() { return bossMoves; },
    get bossAttackView() { return bossAttackView.timing; },
    get playUiFeedbackSound() { return playUiFeedbackSound; },
    get uiDisplay() { return uiDisplay; },
    get getEnemyBodyHeight() { return getEnemyBodyHeight; },
    get stageRoster() { return stageRoster; },
    get _t() { return _t; },
    get battlePixelFont() { return battlePixelFont; },
    get drawCrispCanvasText() { return drawCrispCanvasText; }
});
const bossEntranceView = {
    enemyAge: native.enemyAge,
    stageLook: native.stageLook,
    revealedBoss: native.revealedBoss,
    shake: native.shake,
    drawGround: native.drawGround,
    drawScreen: native.drawScreen,
    enteringSpans: native.enteringSpans,
    bannerLine: native.bannerLine,
    sceneryDim: native.sceneryDim,
    observer: Object.freeze({ ...observer, frame: enemy => observer.frame(game, enemy) })
};
safeExposeGlobals({ bossEntranceView });
