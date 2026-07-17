const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('js/items.js', 'utf8');
const passiveSource = fs.readFileSync('js/passives.js', 'utf8');
const start = source.indexOf('function getBlackMarketOfferPurchaseState(offer)');
const end = source.indexOf('function getBlackMarketOfferTooltipHtml(offer)', start);
assert(start >= 0 && end > start, 'purchase state helper not found');

const context = {
    game: { currencies: { chaos: 4, divine: 2 }, inventory: [], skills: ['보유 젬'] },
    getInventoryLimit: () => 2,
    hasSkillGemOwned: name => context.game.skills.includes(name)
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);

let state = vm.runInContext("getBlackMarketOfferPurchaseState({type:'exchange',from:'chaos',need:5})", context);
assert.strictEqual(state.canBuy, false);
assert(state.reason.includes('4/5'));

state = vm.runInContext("getBlackMarketOfferPurchaseState({type:'skillGem',name:'보유 젬',priceKey:'chaos',price:1})", context);
assert.strictEqual(state.canBuy, false);
assert(state.reason.includes('이미 보유'));

context.game.inventory = [{}, {}];
state = vm.runInContext("getBlackMarketOfferPurchaseState({type:'unique',priceKey:'divine',price:1})", context);
assert.strictEqual(state.canBuy, false);
assert(state.reason.includes('인벤토리'));

context.game.inventory = [];
state = vm.runInContext("getBlackMarketOfferPurchaseState({type:'baseItem',priceKey:'divine',price:2})", context);
assert.strictEqual(state.canBuy, true);
assert(state.reason.includes('2/2'));

context.game.equipment = { '투구': { hiddenTier: 3 } };
const comparison = vm.runInContext("getBlackMarketBaseComparison({type:'baseItem',slot:'투구',hiddenTier:6})", context);
assert.strictEqual(comparison.delta, 3);
assert(comparison.label.includes('+3티어'));

const buyStart = source.indexOf('async function buyBlackMarketOffer(idx)');
const buyEnd = source.indexOf('function renderMarketUI()', buyStart);
assert(buyStart >= 0 && buyEnd > buyStart, 'market purchase runtime not found');

const expiredOffer = { type: 'exchange', name: '만료 상품', from: 'chaos', to: 'divine', need: 1, gain: 1 };
const replacementOffer = { type: 'exchange', name: '새 상품', from: 'chaos', to: 'divine', need: 2, gain: 1 };
const purchaseLogs = [];
const buyContext = {
    console,
    Date,
    Number,
    Math,
    ORB_DB: { chaos: { name: '카오스 오브' }, divine: { name: '신성한 오브' } },
    game: {
        blackMarket: { nextRefreshAt: Date.now() - 1, offers: [expiredOffer], lockedOffers: {} },
        currencies: { chaos: 10, divine: 0 },
        noti: {}
    },
    normalizeBlackMarketState() { return buyContext.game.blackMarket; },
    getBlackMarketSlotCount: () => 1,
    refreshBlackMarket() {
        buyContext.game.blackMarket.offers[0] = replacementOffer;
        buyContext.game.blackMarket.nextRefreshAt = Date.now() + 600000;
    },
    getBlackMarketOfferPurchaseState: () => ({ canBuy: true, reason: '구매 가능' }),
    addLog(message) { purchaseLogs.push(message); },
    updateStaticUI() {},
    awardCurrency() { throw new Error('expired offer must not be purchased'); }
};
vm.createContext(buyContext);
vm.runInContext(source.slice(buyStart, buyEnd), buyContext, { filename: 'market-expiry-purchase.js' });

(async () => {
    await buyContext.buyBlackMarketOffer(0);
    assert.strictEqual(buyContext.game.currencies.chaos, 10, 'expired visible offer must not spend currency on its replacement');
    assert.strictEqual(buyContext.game.blackMarket.offers[0], replacementOffer);
    assert(purchaseLogs.some(message => message.includes('판매 시간이 끝나')));
    assert(source.includes('Math.ceil(hiddenTier * 0.45)'), 'base offer prices must scale with their actual crafting tier');
    assert(source.includes("offer.chase || offer.featured || (offer.priceKey === 'divine'"), 'high-value black-market purchases need confirmation');

    const exchangeStart = passiveSource.indexOf('async function exchangeAtMarket(exchangeId, exchangeAll)');
    const exchangeEnd = passiveSource.indexOf('safeExposeGlobals({', exchangeStart);
    assert(exchangeStart >= 0 && exchangeEnd > exchangeStart, 'market exchange runtime not found');
    let exchangeAwarded = 0;
    const exchangeLogs = [];
    const exchangeContext = {
        game: { maxZoneId: 5, currencies: { chaos: 100, divine: 0 } },
        MARKET_EXCHANGES: [{ id: 'race', from: 'chaos', to: 'divine', need: 100, gain: 1 }],
        ORB_DB: { chaos: { name: '카오스 오브' }, divine: { name: '신성한 오브' } },
        isMarketUnlocked: () => true,
        async requestGameConfirmation() {
            exchangeContext.game.currencies.chaos = 0;
            return true;
        },
        awardCurrency() { exchangeAwarded++; },
        addLog(message) { exchangeLogs.push(message); },
        checkUnlocks() {},
        updateStaticUI() {}
    };
    vm.createContext(exchangeContext);
    vm.runInContext(passiveSource.slice(exchangeStart, exchangeEnd), exchangeContext, { filename: 'market-exchange-race.js' });
    await exchangeContext.exchangeAtMarket('race', true);
    assert.strictEqual(exchangeAwarded, 0, 'confirmed bulk exchange must recheck currency before granting output');
    assert(exchangeLogs.some(message => message.includes('재화가 변경')));
    console.log('smoke-market-purchase-state passed');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
