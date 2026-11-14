import { createStageRoomsView } from './rendering/stage-rooms.mjs';
import { clearStageRoomEffects } from './rendering/stage-room-effects.mjs';

const effects = {
    get stageSkillVfx() { return stageSkillVfx; },
    get stageSkillSigil() { return stageSkillSigil; },
    get redrawnSkillFx() { return typeof redrawnSkillFx === 'undefined' ? undefined : redrawnSkillFx; },
    get attackFxClear() { return typeof attackFxClear === 'undefined' ? undefined : attackFxClear; }
};

const native = createStageRoomsView({
    get actExplorationDoors() { return actExplorationDoors; },
    get actExplorationRooms() { return actExplorationRooms; },
    get uiDisplay() { return uiDisplay; },
    get stageView() { return stageView; },
    get performance() { return performance; },
    get STAGE_ROOMS() { return STAGE_ROOMS; },
    get getCombatTime() { return getCombatTime; },
    get hasGridCell() { return hasGridCell; },
    get getGridUnitCenter() { return getGridUnitCenter; },
    get stageStride() { return stageStride; },
    get getGridUnitFootprint() { return getGridUnitFootprint; },
    get stageRoster() { return stageRoster; },
    get getEnemyFieldBarLift() { return getEnemyFieldBarLift; },
    get STAGE_VIEW() { return STAGE_VIEW; },
    get actExplorationState() { return actExplorationState; },
    get actExplorationProgress() { return actExplorationProgress; },
    get getGrandBreachProgress() { return getGrandBreachProgress; },
    get GRAND_BREACH_ENCOUNTER() { return GRAND_BREACH_ENCOUNTER; },
    clearRoomEffects: () => clearStageRoomEffects(battleVisualState, effects),
    get stageRegion() { return stageRegion; },
    get stageScene() { return stageScene; },
    get stageRoomPictures() { return stageRoomPictures; },
    get stageDots() { return stageDots; },
    get stageOcean() { return typeof stageOcean === 'undefined' ? undefined : stageOcean; },
    get getZone() { return getZone; },
    get getAbyssDepthFromZoneId() { return getAbyssDepthFromZoneId; },
    get stageDoorMarks() { return stageDoorMarks; }
});
const stageRoomsView = Object.freeze({
    focus: (run, cell, view) => native.focus(game, run, cell, view),
    background: (ctx, run, p, area) => native.background(game, ctx, run, p, area),
    drawOverlay: (ctx, area, p) => native.drawOverlay(game, ctx, area, p),
    renderer: Object.freeze({ focus: native.focus, background: native.background })
});
safeExposeGlobals({ stageRoomsView });
