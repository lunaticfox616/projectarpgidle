/** The stall kind's part of the listing restore (modules/domain/listing-restore.mjs): a stall row's terms and its price offer, the visit
 * clock, the visitor history. */
import { stallRulesValidPrice, stallRulesValidCurrency } from './stall-access.mjs';
import { stallRulesValidPriceChangeAt } from './stall-clock.mjs';
import { stallRulesBuyerLimit } from './stall-appraisal.mjs';

/** Whether a stall row's terms (price, currency) and its item's appraisal are sound. */
export function stallRulesValidListing(env, row) {
    return stallRulesValidPrice(env, row.price) && stallRulesValidCurrency(env, row.currency) && !!env.deps.itemAppraisal.quote(row.item, row.currency);
}

/** Normalizes a sound stall row's clocks and flags in place (item already normalized, id already checked). */
export function stallRulesRestoreListing(row, store) {
    row.listedAt = Number.isSafeInteger(row.listedAt) && row.listedAt >= 0 ? row.listedAt : store.lastAt;
    row.priceChangedAt = stallRulesValidPriceChangeAt(row, store.lastAt) ? row.priceChangedAt : row.listedAt;
    row.negotiate = row.negotiate === true;
}

export function stallRulesValidOfferPrice(env, row, offer, seen) {
    return row.negotiate && Number.isSafeInteger(offer.id) && offer.id > 0 && !seen.has(offer.id)
        && Number.isSafeInteger(offer.amount) && offer.amount >= 1 && offer.amount < row.price
        && offer.amount <= env.deps.itemAppraisal.quote(row.item, row.currency).ceiling;
}

export function stallRulesValidOfferClock(env, stall, row, offer) {
    return Number.isSafeInteger(offer.createdAt) && offer.createdAt >= row.listedAt + env.rules.minimumAgeMs
        && offer.createdAt <= stall.lastAt && Number.isSafeInteger(offer.expiresAt)
        && offer.expiresAt === offer.createdAt + env.rules.offerLifetimeMs && offer.expiresAt > stall.lastAt;
}

export function stallRulesRestoreOffer(env, stall, row, seen) {
    const offer = row.offer;
    row.offer = null;
    if (!offer) return;
    const customer = Number.isInteger(offer.customerId) && !!env.deps.PLAYER_STALL_CUSTOMERS[offer.customerId];
    if (!stallRulesValidOfferPrice(env, row, offer, seen) || !stallRulesValidOfferClock(env, stall, row, offer) || !customer) {
        env.deps.console.warn('출품 저장 오류: 유효하지 않은 가격 제안만 취소했습니다. 장비와 판매 대금은 유지됩니다.');
        return;
    }
    seen.add(offer.id);
    const value = env.deps.itemAppraisal.quote(row.item, row.currency), buyer = env.deps.PLAYER_STALL_CUSTOMERS[offer.customerId];
    const limit = stallRulesBuyerLimit(value, env.deps.itemAppraisal.affinity(row.item, buyer), buyer);
    offer.buyerLimit = Number.isSafeInteger(offer.buyerLimit) ? Math.min(limit, Math.max(offer.amount, offer.buyerLimit)) : Math.max(offer.amount, limit);
    offer.negotiated = offer.negotiated === true;
    row.offer = offer;
    stall.offerSequence = Math.max(stall.offerSequence, offer.id);
    stall.nextOfferAt = Math.max(stall.nextOfferAt, offer.createdAt + env.rules.offerCooldownMs);
}

export function stallRulesRestoreVisitClock(env, stall) {
    // Preserve valid scheduled arrivals, including v6 deadlines; repair old six-minute cursors once.
    if (!stall.lastAt) return;
    if (stall.nextVisitAt <= stall.lastAt || stall.nextVisitAt > stall.lastAt + env.rules.maxVisitMs) {
        stall.nextVisitAt = stall.lastAt + env.rules.visitMs;
    }
}

/** The visitor history: events with a finite time and a known currency (missing means dew), at most historyLimit. */
export function stallRulesRestoreHistory(env, store) {
    store.history = Array.isArray(store.history) ? store.history.filter(event => event && Number.isFinite(event.at))
        .map(event => ({ ...event, currency: event.currency === undefined ? 'formlessDew' : event.currency }))
        .filter(event => stallRulesValidCurrency(env, event.currency)).slice(0, env.rules.historyLimit) : [];
    store.eventSequence = Math.max(store.eventSequence, ...store.history.map(event => Number.isSafeInteger(event.id) ? event.id : 0));
}

/** 옛 저장의 방치 보관함(2026-10-25에 없앴다): 그 장비는 불러오기 끝에 가방으로 돌아오므로(js/save-migrations.js retireOfflineGrowth)
 * 출품에 같이 걸려 있으면 안 된다. */
export function stallRulesLegacyOfflineItems(owner) {
    const offline = owner.offlineProgress || {};
    return [offline.stash, offline.protectedOverflow].flat();
}

/** Items the save holds outside the listings (bag, gear, presets, temporary storage, altar, old offline stash, exploration loot): a listed
 * item whose id is among them is a duplicate. deps: getEquipmentLoadoutOwnedItems, actExplorationLoot, actExplorationState. */
export function stallRulesOwnedOutsideEscrow(deps, owner) {
    return [deps.getEquipmentLoadoutOwnedItems(owner), owner.equipmentTemporaryStorage,
        owner.timeRift.altarUnique, owner.timeRift.altarRare,
        stallRulesLegacyOfflineItems(owner),
        deps.actExplorationLoot.reservedItems(owner), deps.actExplorationState.groundLoot.reservedItems(owner)].flat().filter(Boolean);
}
