import { createLoopMutation } from './domain/loop-mutation.mjs';
import { renderLoopMutationPart, renderLoopMutationParts } from './ui/loop-mutation.mjs';

const rules = createLoopMutation({
    get LOOP_MUTATION() { return LOOP_MUTATION; },
    get createSeededRng() { return createSeededRng; },
    get _t() { return _t; },
    get DAMAGE_ELEMENT_LABELS() { return DAMAGE_ELEMENT_LABELS; }
});
const display = {
    get labels() { return DAMAGE_ELEMENT_LABELS; },
    get _t() { return _t; },
    get getElementColor() { return getElementColor; },
    get escapeHTML() { return escapeHTML; },
    rewardPct: rules.rewardPct
};
const loopMutation = Object.freeze({
    of: rules.of,
    current: (state = game) => rules.current(state),
    bites: (state = game) => rules.bites(state),
    takenMul: (enemy, ele) => rules.takenMul(game, enemy, ele),
    begin: rules.begin,
    describe: rules.describe,
    partHtml: (ele, word) => renderLoopMutationPart(display, ele, word),
    partsHtml: (rule, separator = '') => renderLoopMutationParts(display, rule, separator),
    empoweredHit: (enemy, rawHit) => rules.empoweredHit(game, enemy, rawHit),
    rewardMul: (zone, state = game) => rules.rewardMul(zone, state),
    rewardPct: rules.rewardPct
});
safeExposeGlobals({ loopMutation });
