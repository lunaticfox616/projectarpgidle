import { createItemInfluences } from './domain/item-influences.mjs';

const rules = createItemInfluences({
    get ITEM_INFLUENCES() { return ITEM_INFLUENCES; },
    get _t() { return _t; },
    get ALTAR_INFLUENCE_LINES() { return ALTAR_INFLUENCE_LINES; },
    get ITEM_INFLUENCE_RULES() { return ITEM_INFLUENCE_RULES; },
    get getStatName() { return getStatName; },
    get equipmentCrafting() { return equipmentCrafting; },
    get getAvailableMods() { return getAvailableMods; },
    get rollAffixValueInTierRange() { return rollAffixValueInTierRange; },
    get STAT_AFFIX_TAGS() { return typeof STAT_AFFIX_TAGS === 'undefined' ? undefined : STAT_AFFIX_TAGS; },
    get SWAPPED_UNIQUE_LINES() { return SWAPPED_UNIQUE_LINES; },
    get MEMORY_DUNGEON() { return MEMORY_DUNGEON; },
    get INFLUENCE_AFFIX_MODS() { return INFLUENCE_AFFIX_MODS; }
});
const itemInfluences = rules;
safeExposeGlobals({ itemInfluences });
