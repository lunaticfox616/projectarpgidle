const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/items.js', 'utf8');

function readFunctionSource(name) {
    let start = source.indexOf(`function ${name}(`);
    assert(start >= 0, `${name} must exist`);
    if (source.slice(Math.max(0, start - 6), start) === 'async ') start -= 6;
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
elements['ui-market-exchange-list'].dataset = {};
let exchangeRenderCount = 0;
let exchangeMarkup = '';
Object.defineProperty(elements['ui-market-exchange-list'], 'innerHTML', {
    get: () => exchangeMarkup,
    set: value => { exchangeMarkup = value; exchangeRenderCount++; }
});
const selectedItem = { name: '검증 장비', stats: [{ id: 'flatHp', statName: '생명력', val: 10 }] };
const context = {
    game: { season: 30, passives: ['p1'], currencies: { magicBud: 24, formlessDew: 100, goldenRule: 3, divine: 0 } },
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
    getGrowthMarketExpandCost: () => 2,
    getGrowthInventoryLimit: () => 40,
    isGrowthBoardUnlocked: () => true,
    requestGameConfirmation: async message => { context.confirmationPrompts.push(message); return false; },
    confirmationPrompts: [],
    addLog() {},
    updateStaticUI() {},
    Array,
    Math
};
vm.createContext(context);
vm.runInContext("const marketExchangeSelection = { from: '', to: '' };", context, { filename: 'market-exchange-state.js' });
vm.runInContext(readFunctionSource('setMarketExchangeSelection'), context, { filename: 'market-exchange-selection.js' });
vm.runInContext(readFunctionSource('renderMarketExchangePicker'), context, { filename: 'market-exchange-picker.js' });
vm.runInContext(readFunctionSource('renderMarketUI'), context, { filename: 'market-golden-rule-services.js' });
vm.runInContext(readFunctionSource('buildGoldenRuleSpendPrompt'), context, { filename: 'golden-rule-spend-prompt.js' });
['marketExpandInventoryByDivine', 'marketExpandJewelInventoryByDivine', 'marketExpandGrowthInventoryByDivine']
    .forEach(name => vm.runInContext(readFunctionSource(name), context, { filename: `${name}.js` }));

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
elements['ui-market-exchange-list'].querySelector = () => null;
const rendersBeforeUnrelatedUpdate = exchangeRenderCount;
context.game.inventory = [{ id: 1, name: '새 전리품' }];
context.renderMarketUI();
assert.strictEqual(exchangeRenderCount, rendersBeforeUnrelatedUpdate,
    'unrelated loot UI updates must not replace an open exchange selector');
assert(elements['ui-market-exchange-list'].innerHTML.includes('형체 없는 이슬 100개'),
    'the exchange choice must survive after its select element temporarily disappears');
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

Promise.resolve().then(async () => {
    await context.marketExpandInventoryByDivine();
    await context.marketExpandJewelInventoryByDivine();
    await context.marketExpandGrowthInventoryByDivine();
    assert.strictEqual(context.confirmationPrompts.length, 3, '모든 황금률 인벤토리 확장창을 열어야 한다');
    context.confirmationPrompts.forEach(prompt => {
        assert(prompt.includes('현재 보유: 황금률 3개'), '확장창은 현재 황금률 보유량을 표시해야 한다');
    });

    context.game.currencies.goldenRule = 0;
    context.renderMarketUI();
    assert(elements['ui-market-service-passive'].innerHTML.includes('disabled'), 'zero golden rule must disable passive reset');
    assert(elements['ui-market-service-inv'].innerHTML.includes('disabled'), 'zero golden rule must disable inventory expansion');
    assert(elements['ui-market-service-jewel-inv'].innerHTML.includes('disabled'), 'zero golden rule must disable jewel expansion');

    console.log('smoke-market-golden-rule-services passed');
}).catch(error => {
    console.error(error);
    process.exitCode = 1;
});
