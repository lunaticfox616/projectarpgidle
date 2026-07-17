const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const stateSource = fs.readFileSync('js/state.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const cosmosSource = fs.readFileSync('js/cosmos-atlas.js', 'utf8');

const defaultCurrencyLine = stateSource.split('\n').find(line => line.includes('currencies: {')) || '';
assert(!defaultCurrencyLine.includes('hiveTrace:'), 'legacy hiveTrace must not remain in new-save defaults');
assert(!defaultCurrencyLine.includes('condensedSkyPower:'), 'condensed sky power belongs to skyTower, not the global currency wallet');

assert(uiSource.includes('merged.currencies.colonyTrace = Math.max'), 'legacy hive trace must migrate into colony trace');
assert(uiSource.includes('delete merged.currencies.hiveTrace'), 'legacy hive trace must be removed after migration');
assert(uiSource.includes('merged.skyTower.condensedPower = Math.max'), 'legacy condensed sky power must migrate into the sky tower state');
assert(uiSource.includes('delete merged.currencies.condensedSkyPower'), 'legacy condensed sky power must be removed after migration');
assert(uiSource.includes("hiddenCurrencyKeys.add('condensedSkyPower')"), 'the logical condensed-power award key must stay out of the generic wallet UI');
assert(uiSource.includes("Object.prototype.hasOwnProperty.call(save.currencies, 'starDust')"), 'save migration must distinguish a real wallet from a legacy atlas-only balance');
assert(uiSource.includes('delete merged.cosmosAtlas.starDust'), 'atlas-local star dust must not survive save migration');

const context = {
    console,
    window: null,
    globalThis: null,
    document: { readyState: 'loading', addEventListener() {} },
    addEventListener() {},
    game: {
        currencies: { starDust: 11 },
        cosmosAtlas: { starDust: 17 }
    }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(cosmosSource, context, { filename: 'js/cosmos-atlas.js' });

assert.strictEqual(context.migrateLegacyCosmosStarDust(context.game.cosmosAtlas), 11, 'the authoritative wallet must win so spent star dust is never restored');
assert.strictEqual(context.game.currencies.starDust, 11);
assert.strictEqual(Object.prototype.hasOwnProperty.call(context.game.cosmosAtlas, 'starDust'), false);
assert.strictEqual(context.grantCosmosStarDust(5), 5);
assert.strictEqual(context.game.currencies.starDust, 16, 'cosmos rewards must increment the authoritative wallet exactly once');
assert.strictEqual(context.getCosmosStarDustBalance(), 16);

context.game.currencies = {};
context.game.cosmosAtlas = { starDust: 17 };
assert.strictEqual(context.migrateLegacyCosmosStarDust(context.game.cosmosAtlas), 17, 'atlas-only legacy saves must retain their balance');
assert.strictEqual(context.game.currencies.starDust, 17);

assert(!cosmosSource.includes('state.starDust = Math.max(0, Math.floor(state.starDust || 0)) + reward'), 'cosmos rewards must not write a second local balance');
assert(cosmosSource.includes('별가루는 우주계 탐사·이상 현상에서 얻고'), 'the atlas must explain the currency source and sink');

console.log('smoke-currency-integrity passed');
