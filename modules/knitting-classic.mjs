import { createKnitting } from './domain/knitting.mjs';

const rules = createKnitting({
    get KNITTING() { return KNITTING; },
    get contentProgression() { return contentProgression; },
    get levelProgression() { return levelProgression; },
    get _t() { return _t; },
    get atlas() { return typeof atlas === 'undefined' ? undefined : atlas; }
});
const knitting = rules;
safeExposeGlobals({ knitting });
