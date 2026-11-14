import { createLoopMutationView } from './ui/loop-mutation-view.mjs';
const loopMutationUi = createLoopMutationView({
    get _t() { return _t; },
    get DAMAGE_ELEMENT_LABELS() { return DAMAGE_ELEMENT_LABELS; },
    get LOOP_MUTATION() { return LOOP_MUTATION; },
    get document() { return document; },
    get loopMutation() { return loopMutation; },
    get i18n() { return i18n; },
    get window() { return window; },
    get addLog() { return addLog; }
});
safeExposeGlobals({ loopMutationUi });
