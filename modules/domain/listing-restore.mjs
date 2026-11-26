/**
 * 저장의 출품(game.listings)을 불러올 때 한 번 고친다(modules/persistence/restore-finish.mjs, 경매장 시세 복원 뒤). 옛 가판대와 경매장 내 출품은
 * 그 전에 이 모양으로 옮겨져 있다(modules/persistence/saved-listings.mjs). 잘못된 수는 0, 모르는 종류의 줄과 장비가 없거나 이미 다른 곳(가방, 장비,
 * 프리셋, 다른 출품 같은)에 있는 번호의 줄은 경고를 남기고 뺀다. 장비는 온전하지만 줄의 조건이 틀리면 장비를 가방으로 돌려보낸다. 칸이 겹치거나
 * 틀리면 빈 칸으로 옮기고, 7칸을 넘는 장비는 가방으로 돌아간다. 판매 대금은 재화마다 0 이상의 정수다.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { listingSlotMax } from './listing-rows.mjs';
import { stallRulesValidListing, stallRulesRestoreListing, stallRulesRestoreOffer, stallRulesRestoreVisitClock, stallRulesRestoreHistory, stallRulesOwnedOutsideEscrow } from './stall-restoration.mjs';

/** The kinds a saved listing can be. */
const LISTING_KINDS = Object.freeze(['stall', 'auction']);
const count = value => (Number.isSafeInteger(value) && value >= 0 ? value : 0);
const COUNTERS = ['sequence', 'offerSequence', 'eventSequence', 'saleSequence', 'nextOfferAt', 'lastAt', 'nextVisitAt'];

/** The store's plain fields from source over the defaults: counters, proceeds per currency, rng, history; rows and sales are left raw. */
export function listingRestoreFields(env, source) {
    const store = { ...JSON.parse(JSON.stringify(env.deps.defaultGame.listings)), ...(source && typeof source === 'object' && !Array.isArray(source) ? source : {}) };
    for (const key of COUNTERS) store[key] = count(store[key]);
    const proceeds = store.proceeds && typeof store.proceeds === 'object' ? store.proceeds : {};
    store.proceeds = Object.fromEntries(env.rules.currencies.map(key => [key, count(proceeds[key])]));
    store.version = env.deps.defaultGame.listings.version;
    store.rng = Number.isSafeInteger(store.rng) ? store.rng >>> 0 : 1357911;
    stallRulesRestoreVisitClock(env, store);
    stallRulesRestoreHistory(env, store);
    return store;
}

/** The sold records: an id once, a time, a known currency, a whole positive price; the item a copy when it still has an appraisal. */
function listingSoundSale(env, sale, ids) {
    if (!sale || typeof sale !== 'object' || !Number.isSafeInteger(sale.id) || sale.id < 1 || ids.has(sale.id)) return false;
    return Number.isSafeInteger(sale.at) && sale.at >= 0 && env.rules.currencies.includes(sale.currency) && Number.isSafeInteger(sale.price) && sale.price >= 1;
}

export function listingRestoreSales(env, store) {
    const ids = new Set();
    store.sales = (Array.isArray(store.sales) ? store.sales : []).filter(sale => listingSoundSale(env, sale, ids) && !!ids.add(sale.id)).slice(0, env.rules.salesLimit).map(sale => ({ ...sale, kind: LISTING_KINDS.includes(sale.kind) ? sale.kind : 'stall',
        item: sale.item && env.deps.itemAppraisal.quote(sale.item) ? JSON.parse(JSON.stringify(sale.item)) : null,
        listedAt: Number.isSafeInteger(sale.listedAt) && sale.listedAt <= sale.at && sale.listedAt >= 0 ? sale.listedAt : null }));
    store.saleSequence = Math.max(store.saleSequence, ...store.sales.map(sale => sale.id));
}

/** Whether an auction row's terms (currency, a whole ask from askMin) and its item's appraisal are sound. */
export function listingValidAuctionRow(env, row) {
    return env.rules.currencies.includes(row.currency) && Number.isSafeInteger(row.price) && row.price >= AUCTION_HOUSE.myLots.askMin
        && !!env.deps.itemAppraisal.quote(row.item);
}

/** Normalizes a sound auction row in place: chances used up to the lot's limit (then it has ended), the listing bucket never past the
 * auction's own (owner.auction, restored before), a name. */
export function listingRestoreAuctionRow(row, owner) {
    row.rolls = Math.min(count(row.rolls), AUCTION_HOUSE.myLots.buckets);
    row.status = row.status === 'expired' || row.rolls >= AUCTION_HOUSE.myLots.buckets ? 'expired' : 'open';
    row.listedBucket = Math.min(count(row.listedBucket), owner.auction.bucket);
    row.listedAt = Number.isSafeInteger(row.listedAt) && row.listedAt >= 0 ? row.listedAt : row.listedBucket * AUCTION_HOUSE.bucketMs;
    row.name = typeof row.name === 'string' && row.name ? row.name : row.item.name;
}

/** Whether row is a known kind holding an item whose id nothing else holds. */
function listingOwnsItem(row, seen) {
    const id = row.item && typeof row.item === 'object' ? row.item.id : undefined;
    return LISTING_KINDS.includes(row.kind) && Number.isSafeInteger(id) && !seen.items.has(id);
}

/** Whether row's own number and its kind's terms are sound (its item normalized). */
function listingSoundRow(env, row, seen) {
    if (!Number.isSafeInteger(row.id) || row.id < 1 || seen.ids.has(row.id)) return false;
    return row.kind === 'stall' ? stallRulesValidListing(env, row) : listingValidAuctionRow(env, row);
}

/** One saved row: kept (true), or dropped with a warning; a row whose item is sound but whose terms are not gives the item back to the bag. */
export function listingRestoreRow(env, owner, row, seen) {
    if (!listingOwnsItem(row, seen)) {
        env.deps.console.warn('출품 저장 오류: 장비가 없거나 이미 소유 중인 출품을 제외했습니다.');
        return false;
    }
    seen.items.add(row.item.id);
    row.item = env.deps.normalizeItem(row.item);
    if (row.kind === 'stall' && row.currency === undefined) row.currency = 'formlessDew';
    if (!listingSoundRow(env, row, seen)) {
        owner.inventory.push(row.item);
        env.deps.console.warn('출품 저장 오류: 장비를 보관함으로 반환했습니다.');
        return false;
    }
    seen.ids.add(row.id);
    if (row.kind === 'stall') stallRulesRestoreListing(row, owner.listings);
    else listingRestoreAuctionRow(row, owner);
    return true;
}

/** Every row on its own place of the shelf: a missing, broken or shared place moves to the first empty one; a row beyond the shelf gives
 * its item back to the bag. */
export function listingRestorePlaces(env, store, owner) {
    const occupied = new Set(), repair = [], max = listingSlotMax(env.rules);
    const fits = slot => Number.isInteger(slot) && slot >= 0 && slot < max && !occupied.has(slot);
    for (const row of store.rows) {
        if (fits(row.slot)) occupied.add(row.slot);
        else repair.push(row);
    }
    const overflow = new Set();
    for (const row of repair) {
        if (row.slot !== undefined) env.deps.console.warn('출품 저장 오류: 겹치거나 유효하지 않은 진열 위치를 복구했습니다.');
        const slot = Array.from({ length: max }, (_, index) => index).find(fits);
        if (slot === undefined) {
            owner.inventory.push(row.item); overflow.add(row);
            env.deps.console.warn('출품 저장 오류: 진열 칸을 초과한 장비를 보관함으로 반환했습니다.');
            continue;
        }
        row.slot = slot; occupied.add(slot);
    }
    store.rows = store.rows.filter(row => !overflow.has(row));
}

/** Normalizes owner.listings once on load. */
export function listingRestore(env, owner) {
    const store = listingRestoreFields(env, owner.listings);
    listingRestoreSales(env, store);
    const rows = Array.isArray(store.rows) ? store.rows : [];
    owner.listings = store;
    store.rows = [];
    const seen = { ids: new Set(), items: new Set(stallRulesOwnedOutsideEscrow(env.deps, owner).map(item => item.id)) };
    store.rows = rows.filter(row => row && typeof row === 'object' && listingRestoreRow(env, owner, row, seen));
    store.sequence = Math.max(store.sequence, ...seen.ids);
    listingRestorePlaces(env, store, owner);
    if (!store.rows.some(row => row.kind === 'stall')) store.nextVisitAt = 0;
    const offerIds = new Set();
    store.rows.filter(row => row.kind === 'stall').forEach(row => stallRulesRestoreOffer(env, store, row, offerIds));
}
