import { stallRulesUnlocked, stallRulesCanManage, stallRulesValidPrice, stallRulesListBlockReason, stallRulesListingPlacement, stallRulesValidClock, stallRulesValidSlot, stallRulesValidCurrency } from './stall-access.mjs';
import { stallRulesStallClock, stallRulesVisitDelay } from './stall-clock.mjs';
import { stallRulesAdvance } from './stall-visits.mjs';
import { stallRulesReleaseOffer } from './stall-offers.mjs';

/** Lists bag item itemId at price. options: { slot, currency, negotiate } (a bare boolean is the old negotiate flag). */
export function stallRulesList(env, owner, itemId, price, ...selection) {
    const [now, options = false] = selection;
    if (!stallRulesUnlocked(env, owner) || !stallRulesCanManage(owner)) return { ok: false, reason: env.deps._t('지금은 가판대를 이용할 수 없습니다.') };
    if (!stallRulesValidPrice(env, price)) return { ok: false, reason: env.deps._t('가격은 1~1,000,000 사이의 정수로 입력하세요.') };
    const item = owner.inventory.find(entry => entry.id === itemId), stall = owner.playerStall;
    const blocked = stallRulesListBlockReason(env, item, owner);
    if (blocked) return { ok: false, reason: blocked };
    if (stall.listings.length >= env.rules.slots) return { ok: false, reason: env.deps._t('가판대가 가득 찼습니다.') };
    const placement = stallRulesListingPlacement(env, stall, options);
    if (!placement.available) return { ok: false, reason: env.deps._t('판매 재화와 진열할 빈칸을 확인해 주세요.') };
    if (!stallRulesValidClock(now)) return { ok: false, reason: env.deps._t('기기의 시간을 확인해 주세요.') };
    const clock = stallRulesStallClock(stall, now);
    // Visits only remove listings, so a validated empty position stays empty during this synchronous settlement.
    stallRulesAdvance(env, owner, clock);
    stall.sequence++;
    owner.inventory.splice(owner.inventory.indexOf(item), 1);
    stall.listings.push({ id: stall.sequence, item, price, currency: placement.currency, listedAt: clock, priceChangedAt: clock, slot: placement.slot, negotiate: placement.negotiate, offer: null });
    if (stall.listings.length === 1) stall.nextVisitAt = clock + stallRulesVisitDelay(env, stall);
    return { ok: true };
}

/** Move only the display position: this never restarts viewing time, visits, or a pending price offer. */
export function stallRulesMoveListing(env, owner, listingId, targetSlot) {
    if (!stallRulesCanManage(owner) || !stallRulesUnlocked(env, owner)) return { ok: false, reason: env.deps._t('지금은 진열 위치를 바꿀 수 없습니다.') };
    const row = owner.playerStall.listings.find(entry => entry.id === listingId);
    if (!row) return { ok: false, reason: env.deps._t('이미 판매되었거나 회수된 물건입니다.') };
    if (!stallRulesValidSlot(env, targetSlot)) return { ok: false, reason: env.deps._t('진열할 빈칸을 선택해 주세요.') };
    if (owner.playerStall.listings.some(entry => entry !== row && entry.slot === targetSlot)) {
        return { ok: false, reason: env.deps._t('다른 물건이 놓여 있는 칸입니다.') };
    }
    row.slot = targetSlot;
    return { ok: true, reason: env.deps._t('진열 위치를 바꿨습니다.') };
}

/** Takes the listing back into the bag, at place (a bag cell { column, row }, row over all pages) when given: dragged off the
 * shelf onto the bag (js/player-stall-ui.js). */
export function stallRulesWithdraw(env, owner, listingId, place = null) {
    if (!stallRulesCanManage(owner)) return { ok: false, reason: env.deps._t('지금은 회수할 수 없습니다.') };
    const stall = owner.playerStall, row = stall.listings.find(entry => entry.id === listingId);
    if (!row) return { ok: false, reason: env.deps._t('이미 판매되었거나 회수된 물건입니다.') };
    const fit = place ? env.deps.equipmentInventoryGridRuntime.canAdd(row.item, place.column, place.row, owner) : { ok: env.deps.canStoreEquipmentItems([row.item], owner) };
    if (!fit.ok) return { ok: false, reason: place ? fit.reason : '장비 보관함에 공간이 필요합니다. 물건은 가판대에 보관됩니다.' };
    stallRulesReleaseOffer(env, stall, row, stall.lastAt);
    owner.inventory.push(row.item);
    stall.listings.splice(stall.listings.indexOf(row), 1);
    if (place) env.deps.equipmentInventoryGridRuntime.placeInventoryItem(env.deps.equipmentInventoryGridRuntime.getItemKey(row.item), place.column, place.row, owner);
    return { ok: true };
}

export function stallRulesReprice(env, owner, listingId, price, ...selection) {
    const [now, currency] = selection;
    if (!stallRulesCanManage(owner) || !stallRulesUnlocked(env, owner)) return false;
    if (!stallRulesValidPrice(env, price) || !stallRulesValidClock(now)) return false;
    const row = owner.playerStall.listings.find(entry => entry.id === listingId);
    if (!row) return false;
    const nextCurrency = currency === undefined ? row.currency : currency;
    if (!stallRulesValidCurrency(env, nextCurrency)) return false;
    const clock = stallRulesStallClock(owner.playerStall, now);
    stallRulesAdvance(env, owner, clock);
    if (!owner.playerStall.listings.includes(row)) return false;
    if (`${row.price}:${row.currency}` === `${price}:${nextCurrency}`) return true;
    stallRulesReleaseOffer(env, owner.playerStall, row, clock);
    row.price = price; row.currency = nextCurrency; row.priceChangedAt = clock;
    return true;
}

export function stallRulesSetNegotiation(env, owner, listingId, enabled, now) {
    if (!stallRulesCanManage(owner) || !stallRulesUnlocked(env, owner) || !stallRulesValidClock(now) || typeof enabled !== 'boolean') return false;
    const clock = stallRulesStallClock(owner.playerStall, now);
    stallRulesAdvance(env, owner, clock);
    const row = owner.playerStall.listings.find(entry => entry.id === listingId);
    if (!row) return false;
    if (!enabled) stallRulesReleaseOffer(env, owner.playerStall, row, clock);
    row.negotiate = enabled;
    return true;
}
