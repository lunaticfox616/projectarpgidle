import { createItemAppraisal } from './domain/item-appraisal.mjs';

const rules = createItemAppraisal({
    get PLAYER_STALL_RULES() { return PLAYER_STALL_RULES; },
    get MARKET_EXCHANGES() { return MARKET_EXCHANGES; },
    get MOD_DB() { return MOD_DB; },
    get getItemCraftTier() { return getItemCraftTier; },
    get BASE_ITEM_DB() { return BASE_ITEM_DB; },
    get UNIQUE_DB() { return UNIQUE_DB; },
    get PLAYER_STALL_CUSTOMERS() { return PLAYER_STALL_CUSTOMERS; },
    get PLAYER_STALL_APPRAISAL() { return PLAYER_STALL_APPRAISAL; }
});
const itemAppraisal = rules;
safeExposeGlobals({ itemAppraisal });
