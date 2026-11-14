import { npcTradeShopStock } from './npc-shop-stock.mjs';

export function npcTradePriceIsHarvest(env, key) { return env.deps.stumpBox.isHarvestPrice(key); }

export function npcTradeCurrencyName(env, key) { return npcTradePriceIsHarvest(env, key) ? env.deps.stumpBox.harvestPriceName(key) : env.deps.ORB_DB[key] ? env.deps._t(env.deps.ORB_DB[key].name) : key; }

export function npcTradePriceHeld(env, owner, key) { return npcTradePriceIsHarvest(env, key) ? env.deps.stumpBox.harvestPriceHeld(owner, key) : Math.floor(Number(owner.currencies[key]) || 0); }

export function npcTradePayShopPrice(env, owner, { priceKey, price }) {
    if (npcTradePriceIsHarvest(env, priceKey)) env.deps.stumpBox.payHarvestPrice(owner, priceKey);
    else owner.currencies[priceKey] -= price;
}

/** Whether offer index of the NPC's stock can be bought now: { ok, reason }. place: a bag cell { column, row } (row over all pages). */
export function* npcTradeCheckShopWare(env, owner, id, index, place) {
    if (owner.woodsmanBuildLock) return { ok: false, reason: env.deps._t('☠️ 나무꾼 전투 중에는 살 수 없습니다.') };
    const offer = (yield* npcTradeShopStock(env, owner, id))?.offers[index];
    if (!offer) return { ok: false, reason: env.deps._t('이미 팔린 물건입니다.') };
    const have = npcTradePriceHeld(env, owner, offer.priceKey);
    if (have < offer.price) return { ok: false, reason: env.deps._t('{priceKey} 부족, {have}/{price}', { priceKey: npcTradeCurrencyName(env, offer.priceKey), have, price: offer.price }) };
    if (offer.gem) return npcTradeCheckGemWare(env, owner, offer.gem);
    if (place) {
        const fit = env.deps.equipmentInventoryGridRuntime.canAdd(offer.item, place.column, place.row, owner);
        return fit.ok ? { ok: true } : { ok: false, reason: fit.reason };
    }
    return env.deps.canStoreEquipmentItems([offer.item], owner) ? { ok: true } : { ok: false, reason: env.deps._t('가방에 빈칸이 없습니다.') };
}

export function npcTradeCheckGemWare(env, owner, gem) {
    if (gem.kind === 'attack') return { ok: true };
    const next = env.deps.gemDropRewards.nextSupport(owner, gem.name);
    return next && next.tier === gem.tier ? { ok: true } : { ok: false, reason: env.deps._t('이미 가진 룬입니다.') };
}

/** Why seen (the ware the window showed at index) cannot be bought there now, or ''. */
export function* npcTradeShelfChangedReason(env, owner, id, index, seen) {
    return seen && (yield* npcTradeShopStock(env, owner, id))?.offers[index] !== seen ? env.SHELF_CHANGED : '';
}

/** Buys offer index: pays, puts the gem in the collection or the item in the bag (at place when given) and takes it off the
 * shelf. resonanceCap: the support gems' resonance cap (js/ui.js getEffectiveResonanceCap), as a gem drop uses it. seen: the
 * ware the player saw; when a new meeting laid out a new shelf meanwhile, nothing is bought. */
export function* npcTradeSellShopWare(env, owner, id, index, { place = null, resonanceCap = 0, seen } = {}) {
    const moved = (yield* npcTradeShelfChangedReason(env, owner, id, index, seen));
    if (moved) return { ok: false, reason: moved };
    const result = (yield* npcTradeCheckShopWare(env, owner, id, index, place));
    if (!result.ok) return result;
    const shop = (yield* npcTradeShopStock(env, owner, id)), offer = shop.offers[index];
    if (offer.gem) (yield { kind: 'npcGrantGem', args: [owner, offer.gem, offer.gem.kind === 'support' ? resonanceCap : 0] });
    else if (!(yield* npcTradeStowShopItem(env, offer.item, place))) return { ok: false, reason: env.deps._t('가방에 넣지 못했습니다.') };
    npcTradePayShopPrice(env, owner, offer);
    npcTradeRefillSoldShelfCell(env, owner, shop, index, offer);
    return { ok: true, offer };
}

/** The sold ware leaves its cell; on the every-rune shelf a support's next tier takes the cell instead. An attack rune stays: it sells as long as the price is there. */
export function npcTradeRefillSoldShelfCell(env, owner, shop, index, offer) {
    if (offer.gem?.kind === 'attack') return;
    const next = shop.allRunes && offer.gem?.kind === 'support' ? env.deps.gemDropRewards.nextSupport(owner, offer.gem.name) : null;
    if (next) shop.offers[index] = { ...offer, gem: next };
    else shop.offers.splice(index, 1);
}

/** The bought item into the bag: a fresh id (the shelf's may be taken by drops since a reload), then the chosen place. */
export function* npcTradeStowShopItem(env, item, place) {
    item.id = (yield { kind: 'npcAllocateItemId', args: [] });
    delete item.instanceId;
    return (yield { kind: 'npcStowItem', args: [item, place] });
}

/** How many of the NPC's wares the purse buys now, cheapest first in each currency, each one buyable on its own (checkShopWare:
 * the price, a rune not owned yet, bag room). Salvage fills the purse in loop 1, so this tells when a shelf became worth a visit. */
export function* npcTradeReadyShopWares(env, owner, id) {
    const spent = {}, stock = (yield* npcTradeShopStock(env, owner, id));
    const fits = ware => {
        const left = npcTradePriceHeld(env, owner, ware.priceKey) - (spent[ware.priceKey] || 0);
        if (left < ware.price) return false;
        spent[ware.priceKey] = (spent[ware.priceKey] || 0) + ware.price;
        return true;
    };
    if (!stock) return 0;
    const available = [], offers = stock.offers, length = offers.length;
    for (let index = 0; index < length; index++) {
        if (!(index in offers)) continue;
        const ware = offers[index];
        if ((yield* npcTradeCheckShopWare(env, owner, id, index, null)).ok) available.push(ware);
    }
    return available.sort((a, b) => a.price - b.price).filter(fits).length;
}
