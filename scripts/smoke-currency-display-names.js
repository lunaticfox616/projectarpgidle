const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const itemDataSource = fs.readFileSync('data/items.js', 'utf8');
const passiveSource = fs.readFileSync('js/passives.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');

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
assert.strictEqual(currencyContext.getCanonicalCurrencyKey('scour'), 'blightSpore');
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

const infusionItem = { name: '테스트 갑옷', chaosInfusion: { id: 'res_fire', val: 5 } };
const infusionLogs = [];
const infusionContext = {
    ORB_DB: { blightSpore: { name: '마름병 포자' } },
    game: { woodsmanBuildLock: false, currencies: { blightSpore: 2 } },
    getSelectedCraftItem: () => infusionItem,
    addLog: message => infusionLogs.push(String(message)),
    updateStaticUI() {}
};
vm.createContext(infusionContext);
vm.runInContext([
    readFunctionSource(passiveSource, 'getChaosInfusionCost'),
    readFunctionSource(passiveSource, 'canPayCurrencyCosts'),
    readFunctionSource(passiveSource, 'payCurrencyCosts'),
    readFunctionSource(passiveSource, 'removeChaosInfusionFromSelectedItem')
].join('\n'), infusionContext);

const replaceCost = infusionContext.getChaosInfusionCost({ currency: 'formlessDew', cost: 3 }, infusionItem);
assert.deepStrictEqual(
    Array.from(replaceCost, row => ({ ...row })),
    [{ key: 'formlessDew', amount: 3 }, { key: 'blightSpore', amount: 1 }],
    '혼돈 주입 교체 비용은 통합된 마름병 포자 키를 써야 한다'
);
infusionContext.removeChaosInfusionFromSelectedItem();
assert.strictEqual(infusionContext.game.currencies.blightSpore, 1, '혼돈 주입 제거는 마름병 포자 1개만 소모해야 한다');
assert.strictEqual(infusionContext.game.currencies.scour, undefined, '삭제된 정화의 오브 잔액을 다시 만들면 안 된다');
assert.strictEqual(infusionItem.chaosInfusion, null, '재화 소모 후 혼돈 주입 옵션이 제거되어야 한다');
assert(infusionLogs.some(message => message.includes('혼돈 주입 제거')), '혼돈 주입 제거 결과를 로그로 알려야 한다');

assert(!passiveSource.includes('정화의 오브') && !uiSource.includes('정화의 오브'),
    '사용자 문구에 이전 재화명이 다시 등장하면 안 된다');
assert(!uiSource.includes('game.currencies.scour'),
    '패시브·전직·전문가 반환은 통합 전 재화 키를 읽으면 안 된다');

console.log('smoke-currency-display-names passed');
