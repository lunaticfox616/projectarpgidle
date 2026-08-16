const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
function readFunctionSource(name) {
    const start = uiSource.indexOf(`function ${name}(`);
    assert(start >= 0, `${name} must exist`);
    let depth = 0;
    for (let index = uiSource.indexOf('{', start); index < uiSource.length; index++) {
        if (uiSource[index] === '{') depth++;
        if (uiSource[index] !== '}') continue;
        depth--;
        if (depth === 0) return uiSource.slice(start, index + 1);
    }
    throw new Error(`${name} must have a closing brace`);
}

const qualityContext = {
    game: { currencies: { deepWhetstone: 1, rootIron: 1, jewelPolish: 1 } },
    ORB_DB: { deepWhetstone: {}, rootIron: {}, jewelPolish: {} },
    MOBILE_CRAFT_ORB_KEYS: ['deepWhetstone', 'rootIron', 'jewelPolish'],
    Math, Array, String,
    getCraftOrbUseState: () => ({ enabled: false, reason: 'unexpected fallback' })
};
vm.createContext(qualityContext);
vm.runInContext(readFunctionSource('getMobileCraftCurrencyUseState'), qualityContext);
const qualityStates = vm.runInContext(`([
        getMobileCraftCurrencyUseState('deepWhetstone', { slot: '무기', quality: 0 }),
        getMobileCraftCurrencyUseState('rootIron', { slot: '갑옷', quality: 0 }),
        getMobileCraftCurrencyUseState('jewelPolish', { slot: '반지', quality: 0 })
    ])`, qualityContext);
assert(qualityStates.every(state => state.enabled),
    'each quality material must be usable on its matching equipment family');

const context = buildGameRuntime();
vm.runInContext(`
    updateStaticUI = function () {};
    addLog = function () {};
    game.jewelInventory = [];
    game.jewelSlots = [{ id: 7001, name: '장착된 주얼', rarity: 'normal', stats: [] }];
    game.currencies.magicBud = 1;
    selectEquippedJewelCraftTarget(0);
`, context);

Promise.resolve(vm.runInContext("useCurrencyOnJewel('magicBud')", context)).then(() => {
    const result = vm.runInContext(`({
        target: getSelectedJewelCraftTarget(),
        equipped: game.jewelSlots[0],
        inventoryLength: game.jewelInventory.length,
        remaining: game.currencies.magicBud
    })`, context);
    assert.strictEqual(result.target, result.equipped,
        'the workbench target must remain the equipped jewel object');
    assert.strictEqual(result.target.rarity, 'magic',
        'crafting must mutate the equipped jewel in place');
    assert.strictEqual(result.inventoryLength, 0,
        'crafting an equipped jewel must not move or duplicate it');
    assert.strictEqual(result.remaining, 0,
        'successful equipped-jewel crafting must consume one currency');
    console.log('smoke-crafting-target-stability passed');
}).catch(error => {
    console.error(error);
    process.exitCode = 1;
});
