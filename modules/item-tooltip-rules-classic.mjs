import { createItemTooltipRules } from './domain/item-tooltip-rules.mjs';
import { renderEmptyItemExplicit } from './ui/item-tooltip-empty.mjs';

const rules = createItemTooltipRules({
    get getImmutableItemSpecialStats() { return getImmutableItemSpecialStats; },
    get getUniqueImplicitMultiplier() { return getUniqueImplicitMultiplier; }
});
const display = {
    get colonyWards() { return typeof colonyWards === 'undefined' ? undefined : colonyWards; },
    get _t() { return _t; }
};
const itemTooltipRules = Object.freeze({
    statOrder: rules.statOrder,
    compareStats: rules.compareStats,
    defenseView: rules.defenseView,
    emptyExplicitHtml: item => renderEmptyItemExplicit(display, item),
    DEFENSE_IDS: rules.DEFENSE_IDS
});
safeExposeGlobals({ itemTooltipRules });
