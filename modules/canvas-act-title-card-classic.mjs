import { createActTitleCard } from './ui/act-title-card.mjs';

const native = createActTitleCard({
    get i18n() { return i18n; },
    get STORY_ACTS() { return STORY_ACTS; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get _t() { return _t; },
    get addLog() { return addLog; },
    get escapeHTML() { return escapeHTML; },
    get STORY_ACT_ENCOUNTERS() { return STORY_ACT_ENCOUNTERS; },
    get STORY_TRIAL_ENCOUNTERS() { return STORY_TRIAL_ENCOUNTERS; },
    get ATLAS() { return ATLAS; },
    get getZone() { return getZone; },
    get ATLAS_BOARD() { return ATLAS_BOARD; },
    get STORY_ENDGAME_ENCOUNTERS() { return STORY_ENDGAME_ENCOUNTERS; },
    get STORY_CLASS_ORIGINS() { return STORY_CLASS_ORIGINS; },
    get actExplorationState() { return actExplorationState; },
    get isLoopHeroSelectOpen() { return isLoopHeroSelectOpen; },
    get actExplorationDoors() { return actExplorationDoors; },
    get openingJourney() { return typeof openingJourney === 'undefined' ? undefined : openingJourney; },
    get contentProgression() { return contentProgression; },
    get npcShop() { return npcShop; },
    get updateTabUnlockButtons() { return updateTabUnlockButtons; },
    get STORY_NPCS() { return typeof STORY_NPCS === 'undefined' ? undefined : STORY_NPCS; },
    get actExplorationRooms() { return actExplorationRooms; },
    get stagePictures() { return stagePictures; },
    get STAGE_NPC_ART() { return STAGE_NPC_ART; },
    get contentUnlockUi() { return contentUnlockUi; },
    get drawCrispCanvasText() { return drawCrispCanvasText; },
    get battleFx() { return battleFx; },
    get stageDots() { return stageDots; },
    get stageActors() { return stageActors; },
    get stageRings() { return stageRings; },
    get Date() { return Date; },
    get getEnemyDisplayName() { return getEnemyDisplayName; },
    get hasGridCell() { return hasGridCell; },
    get getGridUnitCenter() { return getGridUnitCenter; },
    get woodsmanBattle() { return woodsmanBattle; },
    get STAGE_BOSS_REVIVAL() { return STAGE_BOSS_REVIVAL; },
    get pixelFontSize() { return pixelFontSize; },
    get woodsmanView() { return woodsmanView; },
    get getHeroHeadY() { return getHeroHeadY; },
    get HERO_SIZE_SCALE() { return HERO_SIZE_SCALE; },
    get getEnemyFieldBarLift() { return getEnemyFieldBarLift; },
    get bossRevive() { return bossRevive; },
    get WOODSMAN_BATTLE() { return WOODSMAN_BATTLE; },
    get OUTSIDE_CHAOS_ZONE_ID() { return OUTSIDE_CHAOS_ZONE_ID; }
});
const actTitleCard = Object.freeze({
    draw: (ctx, scene) => native.draw(game, ctx, scene),
    busy: native.busy,
    greeting: native.greeting,
    speaking: native.speaking,
    appendNpc: (actors, state) => native.appendNpc(game, actors, state),
    drawNpc: native.drawNpc,
    npcAt: native.npcAt,
    hover: native.hover,
    scenery: Object.freeze({ appendNpc: native.appendNpc, drawNpc: native.drawNpc })
});
if (typeof document === 'object' && document.fonts?.load) {
    document.fonts.load("20px 'Galmuri14'").catch(error => console.warn('[actTitleCard] Story font preload failed', error));
}
safeExposeGlobals({ actTitleCard });
