/**
 * 내 출품 3칸. 출품한 장비는 가방에서 빠져 출품(owner.auction.lots)이 맡는다. 값은 감정의 추천 재화로 2부터 그 구간 감정가의 1.2배까지.
 * 시세 구간이 지날 때마다 상인 수요가 한 번 붙는다(auction-demand.mjs). 팔린 출품은 장비를 내려놓고 대금(net)을 수령할 때까지 지니고,
 * 기간이 끝난 출품은 장비를 수령할 때까지 지닌다. 칸은 수령한 뒤에야 빈다(정산함은 팔린 출품과 기간이 끝난 출품의 목록이다).
 * lot: { id, name, item (open, expired; null when sold), ask, currency, listedBucket, rolls, status: 'open'|'sold'|'expired',
 *   gross, fee, net, buyer ([prefix index, suffix index] of gear.sellers when sold, else null) }.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { auctionFactor, auctionItemFamily } from './auction-pulse.mjs';
import { auctionChanceAt, auctionSaleAmounts } from './auction-demand.mjs';
import { auctionUseBlock, auctionManageBlock, auctionClockFor, auctionAddTrend } from './auction-clock.mjs';

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

/** Why bag item itemId cannot be listed at ask now, or ''. */
export function auctionListReason(env, owner, item, ask) {
    const block = auctionUseBlock(env, owner);
    if (block) return block;
    if (owner.auction.lots.length >= MINE.slots) return env.deps._t('출품 칸이 가득 찼습니다. 판매 대금이나 돌아온 장비를 먼저 수령하세요.');
    const issue = item ? auctionListIssue(env, owner, item) : env.deps._t('가방에 없는 장비입니다.');
    if (issue) return issue;
    const terms = auctionListQuote(env, owner, item);
    if (!terms.listable) return env.deps._t('감정가가 낮아 출품할 수 없습니다.');
    const valid = Number.isSafeInteger(ask) && ask >= terms.askMin && ask <= terms.askMax;
    return valid ? '' : env.deps._t('출품가는 {min}~{max} 사이의 정수로 입력하세요.', { min: terms.askMin, max: terms.askMax });
}

/**
 * Lists bag item itemId at ask (an integer in the list quote's currency) at now (UTC ms; advances the clock first).
 * @returns {{ok: boolean, reason?: string, lot?: object, settled: Array}}
 */
export function auctionList(env, owner, itemId, ask, now) {
    const clock = auctionClockFor(env, owner, now);
    if (!clock.ok) return clock;
    const item = owner.inventory.find(entry => entry && entry.id === itemId);
    const reason = auctionListReason(env, owner, item, ask);
    if (reason) return { ok: false, reason, settled: clock.settled };
    const state = owner.auction, terms = auctionListQuote(env, owner, item);
    state.sequence += 1;
    owner.inventory.splice(owner.inventory.indexOf(item), 1);
    const lot = { id: state.sequence, name: item.name, item, ask, currency: terms.currency, listedBucket: state.bucket, rolls: 0, status: 'open',
        gross: 0, fee: 0, net: 0, buyer: null };
    state.lots.push(lot);
    auctionAddTrend(state, terms.family, -1);
    return { ok: true, lot, settled: clock.settled };
}

/** Puts lot's item back in the bag and frees its slot; refused (nothing changes) when the bag has no room. */
export function auctionReturnItem(env, owner, lot) {
    if (!env.deps.canStoreEquipmentItems([lot.item], owner)) return { ok: false, reason: env.deps._t('가방에 빈칸이 없습니다. 장비는 경매장에 보관됩니다.') };
    owner.inventory.push(lot.item);
    owner.auction.lots.splice(owner.auction.lots.indexOf(lot), 1);
    return { ok: true, kind: 'item', lotId: lot.id, item: lot.item };
}

/**
 * Takes open lot lotId back into the bag at now (UTC ms; advances first, so a lot that has just sold or expired is reported as such).
 * @returns {{ok: boolean, reason?: string, kind?: string, lotId?: number, item?: object, settled: Array}} kind is 'item'.
 */
export function auctionWithdraw(env, owner, lotId, now) {
    const clock = auctionClockFor(env, owner, now);
    if (!clock.ok) return clock;
    const block = auctionManageBlock(env, owner), lot = owner.auction.lots.find(row => row.id === lotId);
    const reason = block || (!lot ? env.deps._t('이미 수령했거나 없는 출품입니다.') : lot.status !== 'open' ? env.deps._t('이미 판매가 끝난 출품입니다. 수령해 주세요.') : '');
    if (reason) return { ok: false, reason, settled: clock.settled };
    return { ...auctionReturnItem(env, owner, lot), settled: clock.settled };
}

/**
 * Claims a sold lot's money (yields { kind: 'auctionGrantCurrency', args: [currency, net] }) or an expired lot's item (needs bag room).
 * @returns {Generator<object, {ok: boolean, reason?: string, kind?: string, lotId?: number, currency?: string, amount?: number, item?: object}, any>}
 * kind is 'money' or 'item'.
 */
export function* auctionClaim(env, owner, lotId) {
    const block = auctionManageBlock(env, owner), lot = owner.auction.lots.find(row => row.id === lotId);
    const reason = block || (!lot ? env.deps._t('이미 수령했거나 없는 출품입니다.') : lot.status === 'open' ? env.deps._t('아직 판매 중인 출품입니다.') : '');
    if (reason) return { ok: false, reason };
    if (lot.status === 'expired') return auctionReturnItem(env, owner, lot);
    if (!Number.isSafeInteger((Number(owner.currencies[lot.currency]) || 0) + lot.net)) return { ok: false, reason: env.deps._t('보유 한도를 넘어 받을 수 없습니다. 대금은 경매장에 남아 있습니다.') };
    owner.auction.lots.splice(owner.auction.lots.indexOf(lot), 1);
    (yield { kind: 'auctionGrantCurrency', args: [lot.currency, lot.net] });
    return { ok: true, kind: 'money', lotId: lot.id, currency: lot.currency, amount: lot.net };
}

/**
 * Claims every sold and expired lot it can. @returns {Generator<object, {ok: boolean, claimed: number, results: Array, reason: string}, any>}
 * ok when at least one was claimed; reason is the first refusal ('' when none).
 */
export function* auctionClaimAll(env, owner) {
    const results = [];
    for (const lot of owner.auction.lots.filter(row => row.status !== 'open')) results.push(yield* auctionClaim(env, owner, lot.id));
    const claimed = results.filter(result => result.ok).length, refused = results.find(result => !result.ok);
    return { ok: claimed > 0, claimed, results, reason: refused ? refused.reason : (results.length ? '' : env.deps._t('수령할 출품이 없습니다.')) };
}
