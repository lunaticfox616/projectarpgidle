import { stallRulesValidPrice, stallRulesValidCurrency, stallRulesValidSlot, stallRulesFirstEmptySlot } from './stall-access.mjs';
import { stallRulesValidPriceChangeAt } from './stall-clock.mjs';
import { stallRulesBuyerLimit } from './stall-appraisal.mjs';

export function stallRulesValidListing(env, row, seen) {
    return Number.isSafeInteger(row.id) && row.id > 0 && !seen.listings.has(row.id)
        && stallRulesValidPrice(env, row.price) && stallRulesValidCurrency(env, row.currency) && !!env.deps.itemAppraisal.quote(row.item, row.currency);
}

export function stallRulesRestoreListing(env, row, owner, seen) {
    if (!row?.item || !Number.isSafeInteger(row.item.id) || seen.items.has(row.item.id)) {
        env.deps.console.warn('가판대 저장 오류: 장비가 없거나 이미 소유 중인 진열 정보를 제외했습니다.');
        return false;
    }
    seen.items.add(row.item.id);
    row.item = env.deps.normalizeItem(row.item);
    if (row.currency === undefined) row.currency = 'formlessDew';
    if (!stallRulesValidListing(env, row, seen)) {
        owner.inventory.push(row.item);
        env.deps.console.warn('가판대 저장 오류: 장비를 보관함으로 반환했습니다.');
        return false;
    }
    seen.listings.add(row.id);
    row.listedAt = Number.isSafeInteger(row.listedAt) && row.listedAt >= 0 ? row.listedAt : owner.playerStall.lastAt;
    row.priceChangedAt = stallRulesValidPriceChangeAt(row, owner.playerStall.lastAt) ? row.priceChangedAt : row.listedAt;
    row.negotiate = row.negotiate === true;
    return true;
}

export function stallRulesRestorePositions(env, stall, owner) {
    const occupied = new Set(), repair = [];
    for (const row of stall.listings) {
        if (stallRulesValidSlot(env, row.slot) && !occupied.has(row.slot)) occupied.add(row.slot);
        else repair.push(row);
    }
    const overflow = new Set();
    for (const row of repair) {
        if (row.slot !== undefined) env.deps.console.warn('가판대 저장 오류: 겹치거나 유효하지 않은 진열 위치를 복구했습니다.');
        const slot = stallRulesFirstEmptySlot(env, occupied);
        if (slot < 0) {
            owner.inventory.push(row.item); overflow.add(row);
            env.deps.console.warn('가판대 저장 오류: 진열 칸을 초과한 장비를 보관함으로 반환했습니다.');
            continue;
        }
        row.slot = slot; occupied.add(slot);
    }
    stall.listings = stall.listings.filter(row => !overflow.has(row));
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
        env.deps.console.warn('가판대 저장 오류: 유효하지 않은 가격 제안만 취소했습니다. 장비와 판매 대금은 유지됩니다.');
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

export function stallRulesRestoreSales(env, stall, source) {
    const legacy = source?.version < 8 && !source.sales?.length ? stall.history.filter(event => event.sold)
        .map((event, index) => ({ ...event, id: index + 1, listedAt: null, item: null })) : [];
    const ids = new Set();
    stall.sales = (legacy.length ? legacy : Array.isArray(source?.sales) ? source.sales : []).filter(sale => {
        if (!sale || !Number.isSafeInteger(sale.id) || sale.id < 1 || ids.has(sale.id)) return false;
        if (!Number.isSafeInteger(sale.at) || sale.at < 0 || !stallRulesValidCurrency(env, sale.currency) || !stallRulesValidPrice(env, sale.price)) return false;
        ids.add(sale.id);
        return true;
    }).slice(0, env.rules.salesLimit).map(sale => ({ ...sale, item: sale.item && env.deps.itemAppraisal.quote(sale.item) ? JSON.parse(JSON.stringify(sale.item)) : null,
        listedAt: Number.isSafeInteger(sale.listedAt) && sale.listedAt <= sale.at && sale.listedAt >= 0 ? sale.listedAt : null }));
    stall.saleSequence = Math.max(stall.saleSequence, ...stall.sales.map(sale => sale.id));
}

/** 옛 저장의 방치 보관함(2026-10-25에 없앴다): 그 장비는 불러오기 끝에 가방으로 돌아오므로(js/save-migrations.js retireOfflineGrowth)
 * 가판대에 같이 걸려 있으면 안 된다. */
export function stallRulesLegacyOfflineItems(owner) {
    const offline = owner.offlineProgress || {};
    return [offline.stash, offline.protectedOverflow].flat();
}

export function stallRulesRestore(env, owner) {
    const source = owner.playerStall;
    const stall = { ...JSON.parse(JSON.stringify(env.deps.defaultGame.playerStall)), ...(source && typeof source === 'object' ? source : {}) };
    for (const key of ['sequence','offerSequence','eventSequence','saleSequence','nextOfferAt','lastAt','nextVisitAt',...Object.values(env.rules.proceedsKeys)]) {
        stall[key] = Number.isSafeInteger(stall[key]) && stall[key] >= 0 ? stall[key] : 0;
    }
    stall.version = 8;
    // Legacy NPC credit is neither player currency nor proceeds. Retire it without paying it out.
    delete stall.budgetMs;
    stallRulesRestoreVisitClock(env, stall);
    stall.rng = Number.isSafeInteger(stall.rng) ? stall.rng >>> 0 : 1357911;
    stall.history = Array.isArray(stall.history) ? stall.history.filter(event => event && Number.isFinite(event.at))
        .map(event => ({ ...event, currency: event.currency === undefined ? 'formlessDew' : event.currency }))
        .filter(event => stallRulesValidCurrency(env, event.currency)).slice(0, env.rules.historyLimit) : [];
    stall.eventSequence = Math.max(stall.eventSequence, ...stall.history.map(event => Number.isSafeInteger(event.id) ? event.id : 0));
    stallRulesRestoreSales(env, stall, source);
    owner.playerStall = stall;
    const owned = [env.deps.getEquipmentLoadoutOwnedItems(owner), owner.equipmentTemporaryStorage,
        owner.timeRift.altarUnique, owner.timeRift.altarRare,
        stallRulesLegacyOfflineItems(owner),
        env.deps.actExplorationLoot.reservedItems(owner), env.deps.actExplorationState.groundLoot.reservedItems(owner)].flat().filter(Boolean);
    const seen = { items: new Set(owned.map(item => item.id)), listings: new Set() };
    stall.listings = (Array.isArray(stall.listings) ? stall.listings : []).filter(row => stallRulesRestoreListing(env, row, owner, seen));
    stall.sequence = Math.max(stall.sequence, ...seen.listings);
    stallRulesRestorePositions(env, stall, owner);
    if (!stall.listings.length) stall.nextVisitAt = 0;
    const offerIds = new Set();
    stall.listings.forEach(row => stallRulesRestoreOffer(env, stall, row, offerIds));
}
