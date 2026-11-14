import { npcTradeSyncAllRunes, npcTradeMeetShopNpc, npcTradeShopStock } from './npc-shop-stock.mjs';
import { npcTradeCheckShopWare, npcTradeSellShopWare, npcTradeReadyShopWares, npcTradeCurrencyName } from './npc-shop-purchase.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createNpcShop(deps) {
    const env = { deps };
    env.GRID = Object.freeze({ columns: 10, rows: 7 });
    env.RARITY = Object.freeze({ rare: 0.25, magic: 0.5 });
    env.PRICE = Object.freeze({ normal: 1, magic: 2, rare: 1, tierStep: 4, rareTierStep: 6, attackGem: 3, supportGem: 1 });
    env.RESISTANCE_WEIGHT = 1.5;
    env.ALL_RUNES = Object.freeze({ npc: 'haken', act: 5 });
    env.ELEMENT_FLOWER = Object.freeze({ phys: 'physical', fire: 'fire', cold: 'cold', light: 'lightning', chaos: 'chaos' });
    env.SHELF_CHANGED = '진열이 바뀌었습니다. 새 물건을 다시 확인하세요.';
    return Object.freeze({
        grid: env.GRID,
        allRunesAct: env.ALL_RUNES.act,
        syncAllRunes: (...args) => npcTradeSyncAllRunes(env, ...args),
        meet: (...args) => npcTradeMeetShopNpc(env, ...args),
        stock: (...args) => npcTradeShopStock(env, ...args),
        check: (...args) => npcTradeCheckShopWare(env, ...args),
        buy: (...args) => npcTradeSellShopWare(env, ...args),
        ready: (...args) => npcTradeReadyShopWares(env, ...args),
        currencyName: (...args) => npcTradeCurrencyName(env, ...args),
        shelfChanged: env.SHELF_CHANGED
    });
}
