const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('js/items.js', 'utf8');
const passiveSource = fs.readFileSync('js/passives.js', 'utf8');
const utilitySource = fs.readFileSync('js/utils.js', 'utf8');
const start = source.indexOf('function getBlackMarketOfferPurchaseState(offer)');
const end = source.indexOf('function getBlackMarketOfferTooltipHtml(offer)', start);
assert(start >= 0 && end > start, 'purchase state helper not found');

const context = {
    game: { currencies: { chaos: 4, divine: 2 }, inventory: [], skills: ['보유 젬'] },
    EQUIPMENT_INVENTORY_MAX_PAGES: 1,
    EQUIPMENT_INVENTORY_CELLS_PER_PAGE: 2,
    hasSkillGemOwned: name => context.game.skills.includes(name)
};
vm.createContext(context);
const capacityStart = utilitySource.indexOf('function getEquipmentInventoryPageCount(');
const capacityEnd = utilitySource.indexOf('function getJewelInventoryLimit(', capacityStart);
assert(capacityStart >= 0 && capacityEnd > capacityStart, 'spatial inventory capacity helpers not found');
vm.runInContext(utilitySource.slice(capacityStart, capacityEnd), context);
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
const buyEnd = source.indexOf('safeExposeGlobals({', buyStart);
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

async function verifyVendorSelection() {
    const { buildGameRuntime } = require('./lib/game-runtime');
    const ids = ['market-refresh-time', 'market-black-controls', 'market-black-status', 'market-black-insight',
        'market-black-expand', 'market-black-navigation', 'ui-market-black', 'market-black-stock-grid',
        'market-black-stock-footer', 'market-black-detail'];
    const hosts = Object.fromEntries(ids.map(id => [id, { innerHTML:'', textContent:'', scrollIntoView() {} }]));
    const runtime = buildGameRuntime({}, null, {getElementById:id => hosts[id] || null});
    const run = code => vm.runInContext(code, runtime);
    run(`game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior'});
        Math.random=()=>.5;game.currencies.formlessDew=100;
        game.blackMarket.offers=[buildBlackMarketOffer(0),buildBlackMarketOffer(1),
            createBlackMarketUniqueOffer(UNIQUE_DB.find(isUniqueEligibleForBlackMarket),1)];
        game.blackMarket.offers[2].uniqueStats=[{id:'pctHp',min:12,max:18}];
        game.blackMarket.nextRefreshAt=Date.now()+600000;marketUi.renderBlackMarket();`);
    const detail = hosts['market-black-detail'], stock = hosts['market-black-stock-grid'];
    assert.equal(run('marketUi.blackIndex'), 0, 'the first available item has a persistent detail view');
    assert(stock.innerHTML.includes('data-market-offer-index="0"'), 'stock exposes individually selectable items');
    assert(stock.innerHTML.includes('aria-pressed="true"'), 'selected stock is announced to keyboard users');
    run('marketUi.selectBlack(2);');
    assert(detail.innerHTML.includes(run('game.blackMarket.offers[2].name')), 'detail follows the selected actual item');
    assert(/12.*18/.test(detail.innerHTML), 'the selected unique displays its actual option range');
    run('marketUi.selectBlack(1);marketUi.renderBlackMarket();');
    assert.equal(run('marketUi.blackIndex'), 1, 'routine refresh preserves selection');
    const amount = run('game.blackMarket.offers[1].price');
    const baseId = run('game.blackMarket.offers[1].baseId');
    await run('marketUi.purchaseBlack()');
    assert.equal(run('game.currencies.formlessDew'), 100 - amount, 'the selected purchase charges its actual price once');
    assert.equal(run('game.inventory[0].baseId'), baseId, 'the selected actual base enters inventory');
    assert.equal(run('game.blackMarket.offers[1]'), null, 'purchased stock is retired');
    await run('marketUi.purchaseBlack()');
    assert.equal(run('game.inventory.length'), 1, 'stale selected details cannot buy a second item');
    run('marketUi.selectBlack(0);{const replacement=buildBlackMarketOffer(0);game.blackMarket.offers[0]=replacement;}');
    await run('marketUi.purchaseBlack()');
    assert.equal(run('game.currencies.formlessDew'), 100 - amount, 'a replacement in the same slot requires fresh selection');
    assert(detail.innerHTML.includes('진열이 갱신'), 'expired selection visibly explains why purchase stopped');
    run('marketUi.selectBlack(0);marketUi.lockBlack();marketUi.browseBlack("locked");');
    assert.equal(run('game.blackMarket.lockedOffers[0]'), true, 'the detail lock uses the existing stock lock');
    assert(!stock.innerHTML.includes('data-market-offer-index="2"'), 'locked filtering omits other items');
}

(async () => {
    await buyContext.buyBlackMarketOffer(0);
    assert.strictEqual(buyContext.game.currencies.chaos, 10, 'expired visible offer must not spend currency on its replacement');
    assert.strictEqual(buyContext.game.blackMarket.offers[0], replacementOffer);
    assert(purchaseLogs.some(message => message.includes('판매 시간이 끝나')));
    assert(source.includes('Math.ceil(hiddenTier * 0.45)'), 'base offer prices must scale with their actual crafting tier');
    assert(source.includes("offer.chase || offer.featured || (offer.priceKey === 'goldenRule'"), 'high-value black-market purchases need confirmation');

    const exchangeStart = passiveSource.indexOf('function getMarketExchangeQuote(');
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
    assert(exchangeLogs.some(message => message.includes('취소')));
    await verifyVendorSelection();
    console.log('smoke-market-purchase-state passed');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
