import { createStageBoard } from './rendering/stage-board.mjs';

const native = createStageBoard({
    get ACT_BATTLE_MAP_LAYOUT() { return ACT_BATTLE_MAP_LAYOUT; },
    get STAGE_ROOM_PLANS() { return typeof STAGE_ROOM_PLANS === 'undefined' ? undefined : STAGE_ROOM_PLANS; },
    get actExplorationRoomPlans() { return actExplorationRoomPlans; },
    get stageRegion() { return stageRegion; },
    get stageView() { return stageView; }
});
const stageBoard = Object.freeze({
    projection: (width, height, zone) => native.projection(game, width, height, zone),
    background: native.background,
    room: native.room,
    place: native.place
});
safeExposeGlobals({ stageBoard });
