const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const itemDataSource = fs.readFileSync('data/items.js', 'utf8');
const passiveSource = fs.readFileSync('js/passives.js', 'utf8');

function readFunctionSource(source, name) {
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

const mappingStart = itemDataSource.indexOf('const CURRENCY_LEGACY_MERGE');
const mappingEnd = itemDataSource.indexOf('\n});', mappingStart) + 4;
const currencyContext = { Object, String };
vm.createContext(currencyContext);
vm.runInContext([
    itemDataSource.slice(mappingStart, mappingEnd),
    readFunctionSource(itemDataSource, 'getCanonicalCurrencyKey')
].join('\n'), currencyContext);

assert.strictEqual(currencyContext.getCanonicalCurrencyKey('alteration'), 'magicBud');
assert.strictEqual(currencyContext.getCanonicalCurrencyKey('divine'), 'goldenRule');
assert.strictEqual(currencyContext.getCanonicalCurrencyKey('goldenRule'), 'goldenRule');

const banner = { innerText: '', classList: { add() {}, remove() {} } };
const logs = [];
const awardContext = {
    document: { getElementById: id => id === 'divine-drop-banner' ? banner : null },
    ORB_DB: { goldenRule: { name: '황금률' }, ouroboros: { name: '우로보로스' } },
    game: { currencies: {}, currencyDropVersion: 0, noti: {} },
    divineBannerTimer: null,
    getCanonicalCurrencyKey: currencyContext.getCanonicalCurrencyKey,
    addLog: message => logs.push(message),
    clearTimeout() {},
    setTimeout() {}
};
vm.createContext(awardContext);
vm.runInContext([
    readFunctionSource(passiveSource, 'showDivineDropBanner'),
    readFunctionSource(passiveSource, 'awardCurrency')
].join('\n'), awardContext);

awardContext.awardCurrency('divine', 2);
assert.strictEqual(awardContext.game.currencies.goldenRule, 2, 'legacy divine rewards must enter the consolidated balance');
assert.strictEqual(awardContext.game.currencies.divine, undefined, 'deleted balances must not be recreated');
assert.strictEqual(banner.innerText, '✨ 황금률 획득! +2 ✨');
assert(logs.some(message => message.includes('황금률 +2') && !message.includes('신성한 오브')), 'drop logs must use the current currency name');

console.log('smoke-currency-display-names passed');
