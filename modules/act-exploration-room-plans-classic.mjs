import { createRoomPlans } from './act-exploration-room-plans.mjs';
// The standalone room-plan checker has no atlas table; only region resolution needs it.
const actExplorationRoomPlans = createRoomPlans(STAGE_ROOM_PLANS, createSeededRng, () => ATLAS);
safeExposeGlobals({ actExplorationRoomPlans });
