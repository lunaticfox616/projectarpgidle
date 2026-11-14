import { createStageStride } from './rendering/stage-stride.mjs';

const native = createStageStride({
    get getGridUnitStepSec() { return getGridUnitStepSec; },
    get STAGE_VIEW() { return STAGE_VIEW; },
    get getCombatTime() { return getCombatTime; }
});
const stageStride = Object.freeze({
    read: native.read,
    walked: native.walked,
    lag: native.lag
});
safeExposeGlobals({ stageStride });
