import { BLACK_MARKET_SHELF } from '../data/black-market.mjs';
import { marketTradeGetBlackMarketOfferSize } from './black-market-items.mjs';

export function marketTradeBlackMarketShelfCells(at, size) {
    const cells = [];
    for (let row = at.row; row < at.row + size.rows; row++) for (let column = at.column; column < at.column + size.columns; column++) cells.push(`${column}:${row}`);
    return cells;
}

export function marketTradeKeepsBlackMarketPlace(env, offer, size, taken) {
    const placed = Number.isInteger(offer.column) && Number.isInteger(offer.row) && offer.column >= 0 && offer.row >= 0
        && offer.column + size.columns <= BLACK_MARKET_SHELF.columns;
    return placed && !marketTradeBlackMarketShelfCells(offer, size).some(cell => taken.has(cell));
}

export function marketTradeFirstFreeBlackMarketPlace(env, taken, size) {
    for (let row = 0; ; row++) {
        for (let column = 0; column + size.columns <= BLACK_MARKET_SHELF.columns; column++) {
            if (!marketTradeBlackMarketShelfCells({ column, row }, size).some(cell => taken.has(cell))) return { column, row };
        }
    }
}

export function marketTradePlaceBlackMarketOffers(env, bm) {
    const taken = new Set(), waiting = [];
    let rows = BLACK_MARKET_SHELF.rows;
    const claim = (offer, size) => {
        marketTradeBlackMarketShelfCells(offer, size).forEach(cell => taken.add(cell));
        rows = Math.max(rows, offer.row + size.rows);
    };
    for (const offer of bm.offers) {
        if (!offer) continue;
        const size = marketTradeGetBlackMarketOfferSize(env, offer);
        if (marketTradeKeepsBlackMarketPlace(env, offer, size, taken)) claim(offer, size);
        else waiting.push({ offer, size });
    }
    waiting.sort((a, b) => b.size.rows - a.size.rows || b.size.columns - a.size.columns);
    for (const { offer, size } of waiting) {
        Object.assign(offer, marketTradeFirstFreeBlackMarketPlace(env, taken, size));
        claim(offer, size);
    }
    return rows;
}
