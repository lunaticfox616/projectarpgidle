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
    'ui-market-locked', 'ui-market-panel', 'ui-market-service-passive',
    'ui-market-service-annul', 'ui-market-service-inv', 'ui-market-service-jewel-inv'
].map(id => [id, { style: {}, innerHTML: '' }]));
const selectedItem = { name: '검증 장비', stats: [{ id: 'flatHp', statName: '생명력', val: 10 }] };
const context = {
    game: { season: 5, passives: ['p1'], currencies: { goldenRule: 3, divine: 0 } },
    document: { getElementById: id => elements[id] || null },
    isMarketUnlocked: () => true,
    refreshBlackMarket() {},
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
vm.runInContext(readFunctionSource('renderMarketUI'), context, { filename: 'market-golden-rule-services.js' });

context.renderMarketUI();
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
