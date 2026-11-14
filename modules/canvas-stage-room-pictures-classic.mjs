import { createStageRoomPictures } from './rendering/stage-room-pictures.mjs';

const stageRoomPictures = createStageRoomPictures({
    get STAGE_ROOMS() { return STAGE_ROOMS; },
    get scenePreparation() { return stageScene.preparation; },
    get STAGE_REGIONS() { return typeof STAGE_REGIONS === 'undefined' ? undefined : STAGE_REGIONS; },
    get uiDisplay() { return uiDisplay; },
    get setTimeout() { return setTimeout.bind(globalThis); },
    get performance() { return performance; },
    get stageDots() { return stageDots; },
    get console() { return console; },
    get battleFrameStats() { return battleFrameStats; }
});
safeExposeGlobals({ stageRoomPictures });
