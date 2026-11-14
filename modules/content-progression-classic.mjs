import { createContentProgression } from './domain/content-progression.mjs';

const rules = createContentProgression({
    get _t() { return _t; },
    get CONTENT_UNLOCK_CATALOG() { return CONTENT_UNLOCK_CATALOG; },
    get ORB_DB() { return ORB_DB; },
    get getCanonicalCurrencyKey() { return getCanonicalCurrencyKey; },
    get CONTENT_UNLOCK_POINT_AWARDS() { return CONTENT_UNLOCK_POINT_AWARDS; },
    get hasSupportGemOwned() { return hasSupportGemOwned; },
    get normalizeGemRecord() { return normalizeGemRecord; },
    get CONTENT_UNLOCK_RECORD_VERSION() { return CONTENT_UNLOCK_RECORD_VERSION; },
    get getEquipmentInventoryPageCount() { return getEquipmentInventoryPageCount; },
    get SKILL_DB() { return SKILL_DB; },
    get getUnderworldUnlockChecks() { return getUnderworldUnlockChecks; },
    get getCosmosUnlockChecks() { return getCosmosUnlockChecks; },
    get hasCombatTacticsUnlockProgress() { return hasCombatTacticsUnlockProgress; },
    get hasCurrentLoopChaos20Clear() { return hasCurrentLoopChaos20Clear; },
    get isBeyondBoundaryUnlockRequirementMet() { return isBeyondBoundaryUnlockRequirementMet; },
    get hasPermanentTalentTabUnlock() { return hasPermanentTalentTabUnlock; },
    get stumpBox() { return stumpBox; },
    get CONTENT_UNLOCK_SERIES_VERSION() { return CONTENT_UNLOCK_SERIES_VERSION; },
    get CONTENT_UNLOCK_TREE_VERSION() { return CONTENT_UNLOCK_TREE_VERSION; },
    get CONTENT_UNLOCK_LOOP_MOVE_VERSION() { return CONTENT_UNLOCK_LOOP_MOVE_VERSION; }
});
// Existing callers may omit the owner. Native rules always receive one explicitly.
const contentProgression = Object.freeze({
    ...rules,
    requirements: (id, owner = game) => rules.requirements(id, owner),
    isUnlocked: (id, owner = game) => rules.isUnlocked(id, owner),
    holds: (id, owner = game, loop = null) => rules.holds(id, owner, loop),
    rank: (series, owner = game) => rules.rank(series, owner),
    canDropCurrency: (key, owner = game) => rules.canDropCurrency(key, owner),
    canDropUnique: (unique, owner = game) => rules.canDropUnique(unique, owner),
    canOpen: (route, owner = game) => rules.canOpen(route, owner),
    points: (owner = game) => rules.points(owner),
    overflow: (owner = game) => rules.overflow(owner),
    balance: (owner = game) => rules.balance(owner),
    cheapestOpen: (owner = game) => rules.cheapestOpen(owner),
    status: (id, owner = game) => rules.status(id, owner),
    sync: (owner = game) => rules.sync(owner),
    purchase: (id, owner = game, rewardKey) => rules.purchase(id, owner, rewardKey),
    planTarget: (id, owner = game) => rules.planTarget(id, owner)
});
safeExposeGlobals({ contentProgression });
