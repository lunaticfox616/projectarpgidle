/**
 * 경매장 출품(출품 저장 game.listings의 kind 'auction' 줄, modules/domain/listing-rows.mjs). 출품한 장비는 가방에서 빠져 그 줄이 맡는다.
 * 값은 감정의 추천 재화로 2부터 그 구간 감정가의 1.2배까지. 시세 구간이 지날 때마다 상인 수요가 한 번 붙는다(auction-demand.mjs): 팔리면 줄이
 * 없어지고 받을 금액(net)이 출품의 정산함(listings.proceeds)에 들어가며, 세 번 다 안 팔리면 기간이 끝나 장비를 든 채 칸에 남는다(회수할 때까지).
 * row: { id, kind: 'auction', slot, item, name, price (ask), currency, listedAt (UTC ms), listedBucket, rolls, status: 'open' | 'expired' }.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { auctionFactor, auctionItemFamily } from './auction-pulse.mjs';
import { auctionChanceAt, auctionSaleAmounts } from './auction-demand.mjs';
import { auctionUseBlock, auctionManageBlock, auctionClockFor, auctionAddTrend } from './auction-clock.mjs';
import { listingShelfBlock, listingCapacity, listingFreeSlot, listingSlotOpen, listingRemove } from './listing-rows.mjs';

const MINE = AUCTION_HOUSE.myLots;

/** Why item cannot be listed by owner, or '': the stall's trade rules (flags, sockets, worn, presets) plus rare or unique gear with an
 * appraisal, never an item bought here (auctionBound). */
export function auctionListIssue(env, owner, item) {
    if (!item || !Number.isSafeInteger(item.id) || !env.deps.itemAppraisal.quote(item)) return env.deps._t('경매장에 올릴 수 없는 물건입니다.');
    if (item.auctionBound) return env.deps._t('경매장에서 산 장비는 다시 팔 수 없습니다.');
    if (!['rare', 'unique'].includes(item.rarity)) return env.deps._t('희귀, 고유 장비만 출품할 수 있습니다.');
    return env.deps.playerStall.listBlockReason(item, owner);
}

/**
 * The terms for listing item at the saved bucket, or null without an appraisal.
 * @returns {{currency: string, family: string, factor: number, fairNow: number, askMin: number, askMax: number, listable: boolean,
 *   feeAt: (ask: number) => number, netAt: (ask: number) => number, chanceAt: (ask: number) => number} | null}
 *   fairNow: the appraisal in currency units (fractional); asks are integers askMin..askMax; listable is false when askMax < askMin.
 */
export function auctionListQuote(env, owner, item) {
    const quote = item ? env.deps.itemAppraisal.quote(item) : null;
    if (!quote) return null;
    const family = auctionItemFamily(env, item), factor = auctionFactor(owner.auction, family, owner.auction.bucket);
    const terms = auctionListCurrencies(env, quote.recommendedCurrency).map(currency => auctionAskRange(env, quote.marketValue * factor, currency));
    const { currency, fairNow, askMax } = terms.find(row => row.askMax >= MINE.askMin) || terms[0];
    return { currency, family, factor, fairNow, askMin: MINE.askMin, askMax, listable: askMax >= MINE.askMin,
        feeAt: ask => auctionSaleAmounts(ask).fee, netAt: ask => auctionSaleAmounts(ask).net, chanceAt: ask => auctionChanceAt(ask, fairNow) };
}

/** The appraisal's recommended currency first, then the cheaper ones (largest unit first): an item worth 1 to 1.6 dew has no integer
 * ask from 2 to 1.2x its value in dew, but has one in buds. */
export function auctionListCurrencies(env, recommended) {
    const unit = currency => env.deps.itemAppraisal.unitValue(currency);
    const cheaper = env.deps.PLAYER_STALL_RULES.currencies.filter(currency => unit(currency) < unit(recommended)).sort((a, b) => unit(b) - unit(a));
    return [recommended, ...cheaper];
}

/** fairNow (the appraisal worth valueDew in currency units) and the highest integer ask, 1.2x fairNow rounded down. */
export function auctionAskRange(env, valueDew, currency) {
    const fairNow = valueDew / env.deps.itemAppraisal.unitValue(currency);
    return { currency, fairNow, askMax: Math.floor(fairNow * MINE.askMax + AUCTION_HOUSE.epsilon) };
}

/** Why item cannot go up at ask now, or '': the auction's own terms first, then a place on the shelf. */
export function auctionListReason(env, owner, item, ask) {
    const block = auctionUseBlock(env, owner);
    if (block) return block;
    const issue = item ? auctionListIssue(env, owner, item) : env.deps._t('가방에 없는 장비입니다.');
    if (issue) return issue;
    const terms = auctionListQuote(env, owner, item);
    if (!terms.listable) return env.deps._t('감정가가 낮아 출품할 수 없습니다.');
    const shelf = listingShelfBlock(env.deps, owner);
    if (shelf) return shelf;
    const valid = Number.isSafeInteger(ask) && ask >= terms.askMin && ask <= terms.askMax;
    return valid ? '' : env.deps._t('출품가는 {min}~{max} 사이의 정수로 입력하세요.', { min: terms.askMin, max: terms.askMax });
}

/** The place a new lot takes: request.slot when it is an empty place below the capacity, else the first empty one (-1: none). */
function auctionPlaceOf(env, owner, slot) {
    const capacity = listingCapacity(env.deps, owner);
    if (slot !== undefined && slot !== null) return listingSlotOpen(owner.listings, capacity, slot) ? slot : -1;
    return listingFreeSlot(owner.listings, capacity);
}

/**
 * Lists bag item request.itemId at request.ask (an integer in the list quote's currency) on place request.slot (optional) at now (UTC ms;
 * advances the auction clock first).
 * @returns {{ok: boolean, reason?: string, lot?: object, settled: Array}}
 */
export function auctionList(env, owner, request, now) {
    const clock = auctionClockFor(env, owner, now);
    if (!clock.ok) return clock;
    const item = owner.inventory.find(entry => entry && entry.id === request.itemId);
    const reason = auctionListReason(env, owner, item, request.ask);
    const slot = reason ? -1 : auctionPlaceOf(env, owner, request.slot);
    if (reason || slot < 0) return { ok: false, reason: reason || env.deps._t('진열할 빈칸을 선택해 주세요.'), settled: clock.settled };
    const state = owner.auction, store = owner.listings, terms = auctionListQuote(env, owner, item);
    store.sequence += 1;
    owner.inventory.splice(owner.inventory.indexOf(item), 1);
    const lot = { id: store.sequence, kind: 'auction', slot, item, name: item.name, price: request.ask, currency: terms.currency, listedAt: state.lastAt,
        listedBucket: state.bucket, rolls: 0, status: 'open' };
    store.rows.push(lot);
    auctionAddTrend(state, terms.family, -1);
    return { ok: true, lot, settled: clock.settled };
}

/**
 * Takes auction lot lotId (open, or ended with its item) back into the bag at now (UTC ms; advances first, so a lot that has just sold is
 * reported as gone). Refused (nothing changes) when the bag has no room; allowed without the unlock so nothing is stranded.
 * @returns {{ok: boolean, reason?: string, lotId?: number, item?: object, settled: Array}}
 */
export function auctionWithdraw(env, owner, lotId, now) {
    const clock = auctionClockFor(env, owner, now);
    if (!clock.ok) return clock;
    const lot = owner.listings.rows.find(row => row.kind === 'auction' && row.id === lotId);
    const reason = auctionManageBlock(env, owner) || (!lot ? env.deps._t('이미 판매되었거나 회수된 물건입니다.') : '')
        || (!env.deps.canStoreEquipmentItems([lot.item], owner) ? env.deps._t('가방에 빈칸이 없습니다. 장비는 출품에 보관됩니다.') : '');
    if (reason) return { ok: false, reason, settled: clock.settled };
    owner.inventory.push(lot.item);
    listingRemove(owner.listings, lot);
    return { ok: true, lotId: lot.id, item: lot.item, settled: clock.settled };
}
