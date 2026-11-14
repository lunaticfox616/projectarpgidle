import { createStageRings } from './rendering/stage-rings.mjs';

const native = createStageRings({
    get Path2D() { return Path2D; },
    get stageDots() { return stageDots; },
    get document() { return document; },
    get performance() { return performance; }
});
const stageRings = Object.freeze({
    shadow: native.shadow,
    ring: native.ring,
    LIFT: native.LIFT
});
safeExposeGlobals({ stageRings });
