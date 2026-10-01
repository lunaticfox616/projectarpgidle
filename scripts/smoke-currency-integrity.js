const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const stateSource = fs.readFileSync('js/state.js', 'utf8');
const uiSource = (fs.readFileSync('js/ui.js', 'utf8') + '\n' + fs.readFileSync('js/save-migrations.js', 'utf8'));
const cosmosSource = fs.readFileSync('js/cosmos-atlas.js', 'utf8');

const defaultCurrencyLine = stateSource.split('\n').find(line => line.includes('currencies: {')) || '';
assert(!defaultCurrencyLine.includes('hiveTrace:'), 'legacy hiveTrace must not remain in new-save defaults');
assert(!defaultCurrencyLine.includes('condensedSkyPower:'), 'condensed sky power belongs to skyTower, not the global currency wallet');

assert(uiSource.includes('merged.currencies.colonyTrace = Math.max'), 'legacy hive trace must migrate into colony trace');
assert(uiSource.includes('delete merged.currencies.hiveTrace'), 'legacy hive trace must be removed after migration');
assert(uiSource.includes('merged.skyTower.condensedPower = Math.max'), 'legacy condensed sky power must migrate into the sky tower state');
assert(uiSource.includes('delete merged.currencies.condensedSkyPower'), 'legacy condensed sky power must be removed after migration');
// Currency catalog exclusions are behavior-tested in smoke-crafting-workspace.js.
// 별가루는 없어졌다(2026-10-01): 지갑 · 우주계 지역 값 모두 불러올 때 지운다.
assert(uiSource.includes('delete merged.currencies.starDust'), 'star dust is dropped from the wallet on load');
assert(uiSource.includes('delete merged.cosmosAtlas.starDust'), 'atlas-local star dust must not survive save migration');

const context = {
    console,
    window: null,
    globalThis: null,
    document: { readyState: 'loading', addEventListener() {} },
    addEventListener() {},
    safeExposeGlobals(fns) { Object.assign(context, fns); },
    game: {
        currencies: { skyEssence: 11 },
        cosmosAtlas: {}
    }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
for (const file of ['data/constants.js', 'data/cosmos-route.js', 'js/cosmos-route.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}
vm.runInContext(cosmosSource, context, { filename: 'js/cosmos-atlas.js' });

// 우주계 탐사 보상은 창공의 힘: 예전 별가루 계산값의 1/5(최소 1)을 지갑에 한 번만 더한다.
assert.strictEqual(context.grantCosmosSkyPower(25), 5);
assert.strictEqual(context.game.currencies.skyEssence, 16, 'cosmos rewards must increment the authoritative wallet exactly once');
assert.strictEqual(context.grantCosmosSkyPower(1), 1, 'every exploration pays at least one');
assert.strictEqual(context.game.currencies.skyEssence, 17);
context.game.currencies = undefined;
assert.strictEqual(context.grantCosmosSkyPower(10), 2, 'a save without a wallet object still gets one');
assert.strictEqual(context.game.currencies.skyEssence, 2);

assert(!/starDust\s*=/.test(cosmosSource), 'no star dust balance is written any more');
assert(cosmosSource.includes('창공의 힘은 우주계 탐사'), 'the atlas must explain the currency source and sink');

console.log('smoke-currency-integrity passed');
