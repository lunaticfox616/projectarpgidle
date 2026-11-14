import { createBlackMarket } from './domain/black-market.mjs';
import { consumeDomainCommands } from './common/consume-commands.mjs';
import { renderBlackMarketOfferTooltip } from './ui/black-market-tooltips.mjs';
import { BLACK_MARKET_BASE_SLOT_COUNT, BLACK_MARKET_MAX_SLOT_COUNT, BLACK_MARKET_MAX_EXTRA_SLOTS, BLACK_MARKET_CHASE_UNIQUE_CHANCE, BLACK_MARKET_BASE_CRAFT_TIER, BLACK_MARKET_MAX_LOCKED_OFFERS, BLACK_MARKET_INSIGHT_TARGET, BLACK_MARKET_EQUIPMENT_SLOTS, BLACK_MARKET_SHELF } from './data/black-market.mjs';

const rules = createBlackMarket({
    get getBaseChainInfo() { return typeof getBaseChainInfo === 'undefined' ? undefined : getBaseChainInfo; },
    get rollBaseStats() { return typeof rollBaseStats === 'undefined' ? undefined : rollBaseStats; },
    get isTenthStat() { return isTenthStat; },
    get _t() { return _t; },
    get getStatName() { return getStatName; },
    get BASE_ITEM_DB() { return BASE_ITEM_DB; },
    get rndChoice() { return rndChoice; },
    get chooseItemBase() { return chooseItemBase; },
    get UNIQUE_EQUIPMENT_RULES() { return UNIQUE_EQUIPMENT_RULES; },
    get UNIQUE_DB() { return UNIQUE_DB; },
    get RENAMED_UNIQUES() { return RENAMED_UNIQUES; },
    get ARM_GUARD_BASE_LEGACY_NAMES() { return ARM_GUARD_BASE_LEGACY_NAMES; },
    get WEAPON_BASE_LEGACY_NAMES() { return WEAPON_BASE_LEGACY_NAMES; },
    get normalizeArmGuardIdentity() { return normalizeArmGuardIdentity; },
    get migrateEquipmentBlockBases() { return migrateEquipmentBlockBases; },
    get getZone() { return getZone; },
    get MARKET_EXCHANGES() { return MARKET_EXCHANGES; },
    get pickSkillRuneReward() { return pickSkillRuneReward; },
    get gemDropRewards() { return gemDropRewards; },
    get contentProgression() { return contentProgression; },
    marketNow: () => Date.now(),
    get ORB_DB() { return ORB_DB; },
    get canStoreEquipmentItems() { return canStoreEquipmentItems; },
    get equipmentInventoryGridRuntime() { return equipmentInventoryGridRuntime; },
    get pickParticle() { return pickParticle; },
    get normalizeItem() { return normalizeItem; },
    get maybeApplyExceptionalBase() { return maybeApplyExceptionalBase; },
    get getEquipmentInventoryFootprint() { return getEquipmentInventoryFootprint; }
});
const effects = {
    marketGrantCurrency: (...args) => awardCurrency(...args),
    marketGrantGem: (...args) => gemDropRewards.grant(...args),
    marketStowItem: (...args) => stowBoughtItem(...args),
    marketAllocateItemId() { return ++window.GameModules.state.session.itemIdCounter; },
    marketCreateUnique: (...args) => generateUniqueItem(...args)
};
const tooltipDeps = {
    get _t() { return _t; },
    get getStatName() { return getStatName; },
    get escapeHTML() { return escapeHTML; },
    get formatSignedValue() { return formatSignedValue; },
    get getUniqueStatRollRange() { return getUniqueStatRollRange; },
    get formatValue() { return formatValue; },
    get getStyledOrbName() { return typeof getStyledOrbName === 'undefined' ? undefined : getStyledOrbName; },
    get ORB_DB() { return ORB_DB; },
    get SKILL_DB() { return SKILL_DB; },
    get BASE_ITEM_DB() { return BASE_ITEM_DB; },
    get UNIQUE_DB() { return UNIQUE_DB; },
    baseRange: rules.getBlackMarketBaseRollRange,
    compareBase: rules.getBlackMarketBaseComparison
};
const isUniqueEligibleForBlackMarket = rules.isUniqueEligibleForBlackMarket;
const isBaseEligibleForBlackMarket = rules.isBaseEligibleForBlackMarket;
const rollBlackMarketExchangeOffer = rules.rollBlackMarketExchangeOffer;
const normalizeBlackMarketState = (...args) => rules.normalizeBlackMarketState(game, ...args);
const getBlackMarketLockCount = (...args) => rules.getBlackMarketLockCount(game, ...args);
const getBlackMarketManualRefreshCost = (...args) => rules.getBlackMarketManualRefreshCost(game, ...args);
const getBlackMarketSlotCount = (...args) => rules.getBlackMarketSlotCount(game, ...args);
const createBlackMarketUniqueOffer = rules.createBlackMarketUniqueOffer;
const buildBlackMarketOffer = (...args) => rules.buildBlackMarketOffer(game, ...args);
const refreshBlackMarket = (...args) => rules.refreshBlackMarket(game, ...args);
const lockBlackMarketOffer = (...args) => rules.lockBlackMarketOffer(game, ...args);
const setBlackMarketPreferredSlot = (...args) => rules.setBlackMarketPreferredSlot(game, ...args);
const payBlackMarketRefresh = (...args) => rules.payBlackMarketRefresh(game, ...args);
const payBlackMarketExpansion = (...args) => rules.payBlackMarketExpansion(game, ...args);
const getBlackMarketSlotExpandCost = (...args) => rules.getBlackMarketSlotExpandCost(game, ...args);
const getBlackMarketOfferPrice = rules.getBlackMarketOfferPrice;
const checkBlackMarketOffer = (...args) => rules.checkBlackMarketOffer(game, ...args);
const getBlackMarketConfirmText = rules.getBlackMarketConfirmText;
const sellBlackMarketOffer = (...args) => consumeDomainCommands(rules.sellBlackMarketOffer(game, ...args), effects);
const getBlackMarketBaseItemShape = rules.getBlackMarketBaseItemShape;
const getBlackMarketOfferSize = rules.getBlackMarketOfferSize;
const placeBlackMarketOffers = rules.placeBlackMarketOffers;
const getBlackMarketOfferTooltipHtml = offer => renderBlackMarketOfferTooltip(tooltipDeps, game, offer);

const blackMarketShop = Object.freeze({
    shelf: BLACK_MARKET_SHELF, state: normalizeBlackMarketState, refresh: refreshBlackMarket, place: placeBlackMarketOffers,
    size: getBlackMarketOfferSize, price: getBlackMarketOfferPrice, check: checkBlackMarketOffer, confirmText: getBlackMarketConfirmText,
    buy: sellBlackMarketOffer, baseItem: getBlackMarketBaseItemShape, lock: lockBlackMarketOffer, track: setBlackMarketPreferredSlot,
    refreshCost: getBlackMarketManualRefreshCost, refreshNow: payBlackMarketRefresh, expandCost: getBlackMarketSlotExpandCost,
    expand: payBlackMarketExpansion, slotCount: getBlackMarketSlotCount, lockCount: getBlackMarketLockCount
});
safeExposeGlobals({
    isUniqueEligibleForBlackMarket,
    isBaseEligibleForBlackMarket,
    rollBlackMarketExchangeOffer,
    normalizeBlackMarketState,
    getBlackMarketLockCount,
    getBlackMarketManualRefreshCost,
    getBlackMarketSlotCount,
    createBlackMarketUniqueOffer,
    buildBlackMarketOffer,
    getBlackMarketOfferTooltipHtml,
    refreshBlackMarket,
    lockBlackMarketOffer,
    setBlackMarketPreferredSlot,
    payBlackMarketRefresh,
    payBlackMarketExpansion,
    getBlackMarketSlotExpandCost,
    getBlackMarketOfferPrice,
    checkBlackMarketOffer,
    getBlackMarketConfirmText,
    sellBlackMarketOffer,
    getBlackMarketBaseItemShape,
    getBlackMarketOfferSize,
    placeBlackMarketOffers,
    BLACK_MARKET_BASE_SLOT_COUNT,
    BLACK_MARKET_MAX_SLOT_COUNT,
    BLACK_MARKET_MAX_EXTRA_SLOTS,
    BLACK_MARKET_CHASE_UNIQUE_CHANCE,
    BLACK_MARKET_BASE_CRAFT_TIER,
    BLACK_MARKET_MAX_LOCKED_OFFERS,
    BLACK_MARKET_INSIGHT_TARGET,
    BLACK_MARKET_EQUIPMENT_SLOTS,
    BLACK_MARKET_SHELF,
    blackMarketShop
});
