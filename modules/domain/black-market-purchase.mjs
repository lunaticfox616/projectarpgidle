import { marketTradeNormalizeBlackMarketState } from './black-market-ledger.mjs';
import { marketTradeRefreshBlackMarket } from './black-market-refresh.mjs';
import { marketTradeGetBlackMarketBaseItemShape, marketTradeCreateBlackMarketUniqueItem } from './black-market-items.mjs';

export function marketTradeGetBlackMarketOfferPrice(offer) {
    return offer.type === 'exchange' ? { key: offer.from, amount: offer.need } : { key: offer.priceKey, amount: offer.price };
}

export function marketTradeCheckBlackMarketOffer(env, owner, index, place = null) {
    if (owner.woodsmanBuildLock) return { ok: false, reason: env.deps._t('☠️ 나무꾼 전투 중에는 살 수 없습니다.') };
    const offer = marketTradeNormalizeBlackMarketState(env, owner).offers[index];
    if (!offer) return { ok: false, reason: env.deps._t('이미 팔린 물건입니다.') };
    const price = marketTradeGetBlackMarketOfferPrice(offer), have = Math.floor(Number(owner.currencies[price.key]) || 0);
    if (have < price.amount) return { ok: false, reason: env.deps._t('{name} 부족, {have}/{amount}', { name: env.deps._t(env.deps.ORB_DB[price.key].name), have, amount: price.amount }) };
    if (offer.type === 'skillGem') return { ok: true };
    return offer.type === 'baseItem' || offer.type === 'unique' ? marketTradeCheckBlackMarketRoom(env, owner, offer, place) : { ok: true };
}

export function marketTradeCheckBlackMarketRoom(env, owner, offer, place) {
    if (!place) return env.deps.canStoreEquipmentItems([offer], owner) ? { ok: true } : { ok: false, reason: env.deps._t('가방에 빈칸이 없습니다.') };
    const fit = env.deps.equipmentInventoryGridRuntime.canAdd(offer, place.column, place.row, owner);
    return fit.ok ? { ok: true } : { ok: false, reason: fit.reason };
}

export function marketTradeGetBlackMarketConfirmText(env, offer) {
    const price = marketTradeGetBlackMarketOfferPrice(offer);
    if (!(offer.chase || offer.featured || (price.key === 'goldenRule' && Number(price.amount) >= 5))) return '';
    return `[${offer.name || env.deps._t('암거래 상품')}]${env.deps.pickParticle(offer.name || '암거래 상품', '을', '를')} 삽니다.\n${env.deps._t(env.deps.ORB_DB[price.key].name)} ${price.amount}개를 쓰며 되돌릴 수 없습니다.`;
}

export function* marketTradeSellBlackMarketOffer(env, owner, index, { place = null, offer = null } = {}) {
    // Recheck the displayed object after refresh; charge only after the synchronous grant succeeds.
    marketTradeRefreshBlackMarket(env, owner, false);
    const bm = marketTradeNormalizeBlackMarketState(env, owner);
    if (offer && bm.offers[index] !== offer) return { ok: false, reason: env.deps._t('진열이 바뀌었습니다. 새 물건을 다시 확인하세요.') };
    const check = marketTradeCheckBlackMarketOffer(env, owner, index, place);
    if (!check.ok) return check;
    const sold = bm.offers[index], summary = (yield* marketTradeGrantBlackMarketOffer(env, owner, sold, place));
    if (!summary) return { ok: false, reason: env.deps._t('가방에 넣지 못했습니다.') };
    const price = marketTradeGetBlackMarketOfferPrice(sold);
    owner.currencies[price.key] -= price.amount;
    bm.offers[index] = null;
    delete bm.lockedOffers[index];
    return { ok: true, summary, notable: !!(sold.chase || sold.featured) };
}

export function* marketTradeGrantBlackMarketOffer(env, owner, offer, place) {
    if (offer.type === 'exchange') {
        (yield { kind: 'marketGrantCurrency', args: [offer.to, offer.gain] });
        return `${env.deps._t(env.deps.ORB_DB[offer.from].name)} ${offer.need} → ${env.deps._t(env.deps.ORB_DB[offer.to].name)} ${offer.gain}`;
    }
    if (offer.type === 'skillGem') {
        (yield { kind: 'marketGrantGem', args: [owner, { kind: 'attack', name: offer.name, awakened: false }, 0] });
        return env.deps._t('공격 룬 [{name}]', { name: offer.name });
    }
    const item = offer.type === 'baseItem' ? env.deps.normalizeItem({ ...marketTradeGetBlackMarketBaseItemShape(env, offer), id: (yield { kind: 'marketAllocateItemId', args: [] }) }) : (yield* marketTradeCreateBlackMarketUniqueItem(env, offer));
    if (!item || !(yield { kind: 'marketStowItem', args: [item, place] })) return '';
    owner.noti.items = true;
    return offer.type === 'baseItem' ? env.deps._t('제작 베이스 [{name}]', { name: item.name }) : env.deps._t('{value}고유 [{name}]', { value: offer.featured ? env.deps._t('표적 ') : '', name: item.name });
}
