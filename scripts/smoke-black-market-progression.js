const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/items.js', 'utf8');
const stateSource = fs.readFileSync('js/state.js', 'utf8');
const cssSource = fs.readFileSync('css/components.css', 'utf8');

function extract(startNeedle, endNeedle) {
    const start = source.indexOf(startNeedle);
    const end = source.indexOf(endNeedle, start);
    assert(start >= 0 && end > start, `source block not found: ${startNeedle}`);
    return source.slice(start, end);
}

const runtimeBlock = extract('function refreshBlackMarket(force)', 'function canStoreBlackMarketEquipmentOffer');
const logs = [];
let rollSeq = 0;
const oldOffers = Array.from({ length: 6 }, (_, index) => ({ type: 'baseItem', name: `old ${index}` }));
const context = {
    console,
    BLACK_MARKET_INSIGHT_TARGET: 5,
    BLACK_MARKET_MAX_LOCKED_OFFERS: 3,
    BLACK_MARKET_EQUIPMENT_SLOTS: ['무기', '투구'],
    BLACK_MARKET_MAX_EXTRA_SLOTS: 44,
    BLACK_MARKET_MAX_SLOT_COUNT: 50,
    game: {
        blackMarket: {
            nextRefreshAt: 0,
            extraSlots: 0,
            offers: oldOffers.slice(),
            lockedOffers: { 1: true },
            preferredSlot: 'any',
            insight: 4,
            manualRefreshes: 0
        },
        currencies: { formlessDew: 100, goldenRule: 100 }
    },
    isMarketUnlocked: () => true,
    normalizeBlackMarketState() { return context.game.blackMarket; },
    getBlackMarketSlotCount() { return 6 + context.game.blackMarket.extraSlots; },
    isBlackMarketSlotCapReached() { return context.getBlackMarketSlotCount() >= 50; },
    getBlackMarketLockCount() {
        const bm = context.game.blackMarket;
        return Object.keys(bm.lockedOffers).filter(key => bm.lockedOffers[key] && bm.offers[Number(key)]).length;
    },
    getBlackMarketManualRefreshCost() { return 3 + context.game.blackMarket.manualRefreshes * 2; },
    buildBlackMarketFeaturedOffer: () => ({ type: 'unique', name: '표적 고유', featured: true }),
    buildBlackMarketOffer: index => ({ type: 'baseItem', name: `roll ${index}-${++rollSeq}` }),
    requestGameConfirmation: async () => true,
    addLog(message) { logs.push(message); },
    updateStaticUI() {}
};
vm.createContext(context);
vm.runInContext(runtimeBlock, context, { filename: 'black-market-progression-runtime.js' });

(async () => {
    context.refreshBlackMarket(false);
    assert.strictEqual(context.game.blackMarket.offers[0].featured, true, 'fifth information step should produce a featured unique');
    assert.strictEqual(context.game.blackMarket.offers[1].name, 'old 1', 'locked offers must survive refresh');
    assert.strictEqual(context.game.blackMarket.insight, 0, 'featured offer should consume accumulated market information');
    assert(context.game.blackMarket.nextRefreshAt > Date.now());

    context.game.blackMarket.lockedOffers = { 0: true, 1: true, 2: true };
    context.toggleBlackMarketOfferLock(3);
    assert.strictEqual(context.game.blackMarket.lockedOffers[3], undefined, 'lock count must be capped');
    assert(logs.some(message => message.includes('최대 3개')));
    context.toggleBlackMarketOfferLock(1);
    context.toggleBlackMarketOfferLock(3);
    assert.strictEqual(context.game.blackMarket.lockedOffers[3], true, 'a new lock should work after freeing a slot');

    context.setBlackMarketPreferredSlot('투구');
    assert.strictEqual(context.game.blackMarket.preferredSlot, '투구');
    context.setBlackMarketPreferredSlot('invalid');
    assert.strictEqual(context.game.blackMarket.preferredSlot, 'any');

    const beforeExpandOffers = context.game.blackMarket.offers.slice();
    const beforeExpandRefreshAt = context.game.blackMarket.nextRefreshAt;
    await context.expandBlackMarketSlotsByDivine();
    assert.strictEqual(context.game.blackMarket.extraSlots, 1);
    assert.strictEqual(context.game.currencies.goldenRule, 99);
    assert.deepStrictEqual(
        context.game.blackMarket.offers.slice(0, 6).map(offer => offer && offer.name),
        beforeExpandOffers.map(offer => offer && offer.name),
        'slot expansion must not reroll existing offers'
    );
    assert(context.game.blackMarket.offers[6], 'slot expansion should create only the newly opened offer');
    assert.strictEqual(context.game.blackMarket.nextRefreshAt, beforeExpandRefreshAt);

    context.game.blackMarket.lockedOffers = {};
    context.game.blackMarket.insight = 0;
    context.game.blackMarket.manualRefreshes = 0;
    const beforeManualChaos = context.game.currencies.formlessDew;
    await context.refreshBlackMarketNow();
    assert.strictEqual(context.game.currencies.formlessDew, beforeManualChaos - 3);
    assert.strictEqual(context.game.blackMarket.manualRefreshes, 1);
    assert.strictEqual(context.game.blackMarket.insight, 1);

    const featuredBlock = extract('function buildBlackMarketFeaturedOffer()', 'function buildBlackMarketOffer(index)');
    assert(featuredBlock.includes('{ includeChase: false }'), 'featured guarantees must not trivialize chase uniques');
    assert(featuredBlock.includes('!isBlackMarketUniqueRegistered(unique)'), 'featured offer should prioritize missing codex entries');
    assert(source.includes('Math.random() < 0.7 ? unregisteredNormal'), 'ordinary unique offers should bias toward missing codex entries');
    assert(source.includes('dealPct') && source.includes('정규 거래소 대비 교환 효율'), 'special exchange offers should disclose their value');
    const expandBlock = extract('function expandBlackMarketSlotsByDivine()', 'function getBlackMarketSlotExpandCost');
    assert(!expandBlock.includes('refreshBlackMarket(true)'), 'slot expansion must never reroll the current shop');
    assert(stateSource.includes("preferredSlot: 'any', insight: 0, manualRefreshes: 0"), 'new saves should initialize market progression state');
    assert(cssSource.includes('.market-insight') && cssSource.includes('.market-black-offer.featured'), 'market progression needs visible responsive styling');

    console.log('smoke-black-market-progression passed');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
