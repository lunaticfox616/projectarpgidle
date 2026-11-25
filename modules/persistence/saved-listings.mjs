/**
 * saveVersion 23 (2026-11-26): 가판대(game.playerStall)와 경매장 내 출품(game.auction.lots, auction.sequence)을 출품 저장 하나(game.listings,
 * modules/domain/listing-rows.mjs)로 옮긴다. 불러오기 처음(기본값과 합친 바로 뒤, 장비 검사들보다 먼저)에 옛 열쇠가 있을 때만 돌고 옮긴 뒤 그 열쇠를
 * 지운다: 같은 저장을 다시 돌려도 할 일이 없다. 옛 판이 새 저장을 열어 두 모양이 다 있는 저장도 이미 있는 listings에 더한다(겹치는 번호는 새로 매긴다).
 * 장비 하나도 버리거나 늘리지 않는다: 줄의 검사와 중복 장비 제외는 그 뒤의 복원(modules/domain/listing-restore.mjs)이 한 곳에서 한다.
 *   가판대 진열: kind 'stall' 줄(번호, 칸, 값, 제안 그대로). 대금 셋(proceeds, budProceeds, goldProceeds) -> listings.proceeds. 손님 시계, rng,
 *     history는 새 저장에 손님 기록이 없을 때만 가져온다. 판매 기록은 더한다.
 *   경매장 판매 중, 기간 끝남: kind 'auction' 줄(새 번호, 칸은 복원이 빈 칸에), ask -> price, listedAt = 출품 구간의 시작 시각.
 *   경매장 팔림(대금 수령 전): net을 listings.proceeds에 더하고 판매 기록 하나(장비는 없다). 수가 틀린 기록은 예전 복원처럼 경고하고 뺀다.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';

const OLD_PROCEEDS = Object.freeze({ magicBud: 'budProceeds', formlessDew: 'proceeds', goldenRule: 'goldProceeds' });
const VISITOR_FIELDS = Object.freeze(['lastAt', 'nextVisitAt', 'rng', 'offerSequence', 'nextOfferAt', 'eventSequence', 'history']);
const count = value => (Number.isSafeInteger(value) && value >= 0 ? value : 0);
const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);

/** The listing store to move into: the save's own when it is one, else a fresh copy of defaults' (rows, sales and proceeds made sound). */
function targetStore(merged, defaults) {
    const store = isRecord(merged.listings) ? merged.listings : JSON.parse(JSON.stringify(defaults.listings));
    store.rows = Array.isArray(store.rows) ? store.rows : [];
    store.sales = Array.isArray(store.sales) ? store.sales : [];
    store.proceeds = isRecord(store.proceeds) ? store.proceeds : {};
    store.sequence = Math.max(count(store.sequence), ...store.rows.map(row => count(row && row.id)));
    store.saleSequence = Math.max(count(store.saleSequence), ...store.sales.map(sale => count(sale && sale.id)));
    return store;
}

/** Adds amount to the box when the sum stays a safe integer; false (warned by the caller) otherwise. */
function credit(store, currency, amount) {
    const next = count(store.proceeds[currency]) + amount;
    if (!Number.isSafeInteger(next)) return false;
    store.proceeds[currency] = next;
    return true;
}

/** A saved buyer: a [prefix index, suffix index] pair inside gear.sellers, otherwise (an old name, a damaged value) the first pair. */
function soundBuyer(buyer) {
    const { prefixes, suffixes } = AUCTION_HOUSE.gear.sellers;
    const sound = Array.isArray(buyer) && buyer.length === 2 && count(buyer[0]) === buyer[0] && buyer[0] < prefixes.length
        && count(buyer[1]) === buyer[1] && buyer[1] < suffixes.length;
    return sound ? [buyer[0], buyer[1]] : [0, 0];
}

/** The old stall's sold records; a stall from before version 8 kept them only as sold visits. */
function oldStallSales(stall) {
    if (Array.isArray(stall.sales) && stall.sales.length) return stall.sales;
    if (!(stall.version < 8) || !Array.isArray(stall.history)) return [];
    return stall.history.filter(event => event && event.sold).map(event => ({ ...event, listedAt: null, item: null }));
}

/** The old stall's rows as kind 'stall' rows; an id the store already has (or a broken one) takes the next free number. */
function moveStallRows(store, stall) {
    for (const row of Array.isArray(stall.listings) ? stall.listings : []) {
        if (!isRecord(row)) continue;
        const taken = !Number.isSafeInteger(row.id) || row.id < 1 || store.rows.some(other => other && other.id === row.id);
        const id = taken ? store.sequence + 1 : row.id;
        store.rows.push({ ...row, kind: 'stall', id });
        store.sequence = Math.max(store.sequence, id);
    }
    store.sequence = Math.max(store.sequence, count(stall.sequence));
}

function moveOldStall(store, stall, warn) {
    const fresh = !store.rows.length && !store.lastAt;
    moveStallRows(store, stall);
    for (const [currency, key] of Object.entries(OLD_PROCEEDS)) {
        if (count(stall[key]) && !credit(store, currency, count(stall[key]))) warn('출품 저장 오류: 가판대 판매 대금이 보유 한도를 넘어 일부를 옮기지 못했습니다.');
    }
    for (const sale of oldStallSales(stall).filter(isRecord)) store.sales.push({ currency: 'formlessDew', ...sale, kind: 'stall', id: ++store.saleSequence });
    if (!fresh) return;
    for (const key of VISITOR_FIELDS.filter(field => stall[field] !== undefined)) store[key] = stall[key];
}

function moveSoldLot(store, lot, warn) {
    const amounts = [lot.gross, lot.fee, lot.net].every(value => Number.isSafeInteger(value) && value >= 0) && lot.net >= 1 && lot.net <= lot.gross;
    if (!Object.prototype.hasOwnProperty.call(OLD_PROCEEDS, lot.currency) || !amounts || !credit(store, lot.currency, lot.net)) {
        warn('경매장 저장 오류: 유효하지 않은 판매 대금 기록을 제외했습니다.');
        return;
    }
    const listedBucket = count(lot.listedBucket);
    store.sales.push({ kind: 'auction', id: ++store.saleSequence, at: (listedBucket + Math.max(1, count(lot.rolls))) * AUCTION_HOUSE.bucketMs,
        listedAt: listedBucket * AUCTION_HOUSE.bucketMs, currency: lot.currency, price: lot.net, gross: lot.gross, fee: lot.fee,
        buyer: soundBuyer(lot.buyer), name: typeof lot.name === 'string' ? lot.name : '', item: null });
}

function moveOldLots(store, lots, warn) {
    for (const lot of lots) {
        if (!isRecord(lot)) continue;
        if (lot.status === 'sold') { moveSoldLot(store, lot, warn); continue; }
        const listedBucket = count(lot.listedBucket);
        store.rows.push({ id: ++store.sequence, kind: 'auction', item: lot.item, name: lot.name, price: lot.ask, currency: lot.currency,
            listedAt: listedBucket * AUCTION_HOUSE.bucketMs, listedBucket, rolls: lot.rolls, status: lot.status });
    }
}

/**
 * Moves the old stall and auction lots of merged (a save merged over the defaults) into merged.listings once. defaults: the default game
 * (its listings shape). warn(text): the load's warning. Returns whether anything was moved.
 */
export function moveOldListingsSave(merged, defaults, warn) {
    const stall = isRecord(merged.playerStall) ? merged.playerStall : null;
    const lots = isRecord(merged.auction) && Array.isArray(merged.auction.lots) ? merged.auction.lots : null;
    if (!stall && !lots) {
        delete merged.playerStall;
        return false;
    }
    const store = targetStore(merged, defaults);
    if (stall) moveOldStall(store, stall, warn);
    if (lots) moveOldLots(store, lots, warn);
    store.sales.sort((a, b) => count(b && b.at) - count(a && a.at));
    merged.listings = store;
    delete merged.playerStall;
    if (isRecord(merged.auction)) { delete merged.auction.lots; delete merged.auction.sequence; }
    return true;
}
