/**
 * 출품(game.listings, 2026-11-26)의 진열대 하나. 가판대(kind 'stall')와 경매장(kind 'auction') 출품이 같은 칸 줄을 쓴다: 거래소 해금(market)이
 * 4칸, 경매장 해금(auction)이 3칸을 더한다(예전의 가판대 4칸과 내 출품 3칸, 한꺼번에 내놓는 수는 그대로 7). 어느 칸에나 어느 종류든 둔다.
 * 장비 전당 출품은 서버가 원본을 들고 있어 여기에 없다(modules/ui/listings-*.mjs가 서버 자료를 같은 목록에 섞는다).
 *
 * store (game.listings): { version, sequence (출품 번호, 모든 종류), rows, proceeds { 재화: 정수 } (정산함: 가판대와 경매장의 판매 대금),
 *   saleSequence, sales (팔린 물건의 읽기 전용 기록, 새것부터), 가판대 손님 필드(lastAt, nextVisitAt, rng, offerSequence, nextOfferAt, eventSequence, history) }.
 * row: { id, kind, slot (0..listingSlotMax-1, 진열대의 자리), item, price (정수, currency 단위), currency, listedAt (UTC ms), ...종류의 필드 }.
 *   stall: priceChangedAt, negotiate, offer (modules/domain/player-stall.mjs). auction: name, listedBucket, rolls, status 'open' | 'expired'
 *   (modules/domain/auction-my-lots.mjs; 팔린 출품은 줄이 없어지고 대금이 정산함에 들어간다).
 * sale: { id, kind, at, listedAt (UTC ms 또는 null), currency, price (받은 금액), item (사본 또는 null), name?, customer? (가판대 손님),
 *   buyer? ([앞말, 뒷말] 번호, 경매장 상인), gross?, fee? (경매장) }.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';

/** Every place of the shelf: the stall's 4 (rules: PLAYER_STALL_RULES) and the auction's 3. */
export function listingSlotMax(rules) { return rules.slots + AUCTION_HOUSE.myLots.slots; }

/** The rows of kind in store, in saved order. */
export function listingRowsOf(store, kind) { return store.rows.filter(row => row.kind === kind); }

/** Takes row out of store; false when it is not there (sold or taken back meanwhile). */
export function listingRemove(store, row) {
    const index = store.rows.indexOf(row);
    if (index < 0) return false;
    store.rows.splice(index, 1);
    return true;
}

/** The places owner may fill now: 4 with the market (stall) unlock, 3 more with the auction unlock. deps: contentProgression, PLAYER_STALL_RULES. */
export function listingCapacity(deps, owner) {
    return (deps.contentProgression.isUnlocked('market', owner) ? deps.PLAYER_STALL_RULES.slots : 0)
        + (deps.contentProgression.isUnlocked('auction', owner) ? AUCTION_HOUSE.myLots.slots : 0);
}

/** The first empty place below capacity, or -1. */
export function listingFreeSlot(store, capacity) {
    const occupied = new Set(store.rows.map(row => row.slot));
    for (let slot = 0; slot < capacity; slot++) if (!occupied.has(slot)) return slot;
    return -1;
}

/** Whether slot is a place below capacity that no listing holds. */
export function listingSlotOpen(store, capacity, slot) {
    return Number.isInteger(slot) && slot >= 0 && slot < capacity && !store.rows.some(row => row.slot === slot);
}

/** Why owner cannot put up another listing (any kind), or '': no unlock gives a place, or every place is taken. deps: contentProgression,
 * PLAYER_STALL_RULES, _t. */
export function listingShelfBlock(deps, owner) {
    const capacity = listingCapacity(deps, owner);
    if (!capacity) return deps._t('출품할 수 있는 곳이 아직 열리지 않았습니다.');
    return owner.listings.rows.length >= capacity ? deps._t('출품 칸이 가득 찼습니다. 판매 대금이나 돌아온 장비를 먼저 수령하세요.') : '';
}

/** Adds amount (an integer) of currency to the settlement box; false (nothing changes) when it would pass the safe integer range. */
export function listingCredit(store, currency, amount) {
    const next = (store.proceeds[currency] || 0) + amount;
    if (!Number.isSafeInteger(next)) return false;
    store.proceeds[currency] = next;
    return true;
}

/** Records a sold listing (newest first, at most limit: PLAYER_STALL_RULES.salesLimit); sale carries every field but its id. */
export function listingRecordSale(store, sale, limit) {
    store.sales.unshift({ ...sale, id: ++store.saleSequence });
    store.sales.length = Math.min(store.sales.length, limit);
}

/** The unclaimed proceeds, per currency with any (currencies: PLAYER_STALL_RULES.currencies, in order): [{ key, amount }]. */
export function listingPayouts(store, currencies) {
    return currencies.map(key => ({ key, amount: store.proceeds[key] || 0 })).filter(row => row.amount > 0);
}
