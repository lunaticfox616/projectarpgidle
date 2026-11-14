import { createTargetMarks } from './rendering/target-marks.mjs';

const native = createTargetMarks({
    get performance() { return performance; }
});
const targetMarks = Object.freeze({
    arrow: native.arrow
});
safeExposeGlobals({ targetMarks });
