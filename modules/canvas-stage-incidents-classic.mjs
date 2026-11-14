import { createStageIncidents } from './rendering/stage-incidents.mjs';

const native = createStageIncidents({
    get ACT_EXPLORATION_INCIDENTS() { return ACT_EXPLORATION_INCIDENTS; },
    get battleFx() { return battleFx; }
});
const stageIncidents = Object.freeze({
    ground: native.ground
});
safeExposeGlobals({ stageIncidents });
