const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/items.js', 'utf8');

function readFunctionSource(name) {
    const start = source.indexOf(`function ${name}(`);
    assert(start >= 0, `${name} must exist`);
    let depth = 0;
    for (let index = source.indexOf('{', start); index < source.length; index++) {
        if (source[index] === '{') depth++;
        if (source[index] !== '}') continue;
        depth--;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`${name} must have a closing brace`);
}

const elements = Object.fromEntries([
    'ui-market-locked', 'ui-market-panel', 'ui-market-exchange-list', 'ui-market-service-passive',
    'ui-market-service-annul', 'ui-market-service-inv', 'ui-market-service-jewel-inv'
].map(id => [id, { style: {}, innerHTML: '' }]));
const selectedItem = { name: '검증 장비', stats: [{ id: 'flatHp', statName: '생명력', val: 10 }] };
const context = {
    game: { season: 5, passives: ['p1'], currencies: { magicBud: 24, formlessDew: 100, goldenRule: 3, divine: 0 } },
    document: { getElementById: id => elements[id] || null },
    isMarketUnlocked: () => true,
    refreshBlackMarket() {},
    MARKET_EXCHANGES: [
        { id: 'm1', from: 'magicBud', to: 'formlessDew', need: 8, gain: 1 },
        { id: 'm3', from: 'formlessDew', to: 'goldenRule', need: 100, gain: 1 }
    ],
    ORB_DB: {
        magicBud: { name: '마법의 새싹' }, formlessDew: { name: '형체 없는 이슬' },
        goldenRule: { name: '황금률' }
    },
    getSelectedCraftItem: () => selectedItem,
    getAnnulmentRemovableStats: item => item.stats.map((stat, index) => ({ stat, index })),
    getStatName: id => id,
    formatValue: (id, value) => value,
    getMarketInventoryExpandCost: () => 2,
    getInventoryLimit: () => 40,
    getJewelMarketExpandCost: () => 2,
    getJewelInventoryLimit: () => 30,
    Array,
    Math
};
vm.createContext(context);
vm.runInContext(readFunctionSource('renderMarketExchangePicker'), context, { filename: 'market-exchange-picker.js' });
vm.runInContext(readFunctionSource('renderMarketUI'), context, { filename: 'market-golden-rule-services.js' });

context.renderMarketUI();
const exchangeHtml = elements['ui-market-exchange-list'].innerHTML;
assert(exchangeHtml.includes('id="ui-market-exchange-from"') && exchangeHtml.includes('id="ui-market-exchange-to"'),
    'currency exchange must use explicit give and receive selectors');
assert(exchangeHtml.includes('마법의 새싹 8개') && exchangeHtml.includes('형체 없는 이슬 1개'),
    'the selected pair must disclose its exact price and proceeds');
assert(exchangeHtml.includes('보유 24개') && exchangeHtml.includes('최대 24 → 3'),
    'the picker must disclose current balance and maximum exchange outcome');
elements['ui-market-exchange-list'].querySelector = selector => ({
    value: selector === '#ui-market-exchange-from' ? 'formlessDew' : 'goldenRule'
});
context.renderMarketUI();
const selectedExchangeHtml = elements['ui-market-exchange-list'].innerHTML;
assert(selectedExchangeHtml.includes('형체 없는 이슬 100개') && selectedExchangeHtml.includes('황금률 1개'),
    'selecting a give/receive pair must immediately replace the displayed quote');
const serviceHtml = [
    elements['ui-market-service-passive'].innerHTML,
    elements['ui-market-service-annul'].innerHTML,
    elements['ui-market-service-inv'].innerHTML,
    elements['ui-market-service-jewel-inv'].innerHTML
].join('\n');
assert(!serviceHtml.includes('신성한 오브'), 'golden-rule services must not show the obsolete currency name');
assert.strictEqual((serviceHtml.match(/황금률/g) || []).length, 4, 'every golden-rule service must show its actual currency');
assert(!serviceHtml.includes('<button onclick="marketResetPassiveTreeByDivine()" disabled'), 'golden-rule balance must enable passive reset');
assert(!serviceHtml.includes('marketExpandInventoryByDivine()" disabled'), 'golden-rule balance must enable inventory expansion');

context.game.currencies.goldenRule = 0;
context.renderMarketUI();
assert(elements['ui-market-service-passive'].innerHTML.includes('disabled'), 'zero golden rule must disable passive reset');
assert(elements['ui-market-service-inv'].innerHTML.includes('disabled'), 'zero golden rule must disable inventory expansion');
assert(elements['ui-market-service-jewel-inv'].innerHTML.includes('disabled'), 'zero golden rule must disable jewel expansion');

console.log('smoke-market-golden-rule-services passed');
