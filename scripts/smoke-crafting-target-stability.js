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
    for (const [amplified, funds, succeeds] of [[true, 13, false], [true, 14, true], [false, 5, false], [false, 6, true]]) {
        context.fusionCase = { amplified, funds };
        const fusion = vm.runInContext(`
            document.getElementById = id => id === 'chk-jewel-amplified-fusion' ? {checked: fusionCase.amplified} : null;
            game.jewelInventory = [
                {id: 8001, name: 'A', rarity: 'magic', stats: [{id: 'crit', val: 2, tier: 1}]},
                {id: 8002, name: 'B', rarity: 'magic', stats: [{id: 'armor', val: 2, tier: 1}]}
            ];
            jewelFusionSelection = [0, 1];
            game.currencies.jewelShard = fusionCase.funds;
            confirmJewelFusion();
            ({funds: game.currencies.jewelShard, count: game.jewelInventory.length,
                ids: game.jewelInventory.map(j => j.id), options: getJewelCoreStats(game.jewelInventory[0]).length})
        `, context);
        assert.strictEqual(fusion.funds, succeeds ? 0 : funds, 'fusion must validate and charge the total cost');
        assert.strictEqual(fusion.count, succeeds ? 1 : 2, 'insufficient funds must not consume materials');
        if (!succeeds) assert.deepStrictEqual(Array.from(fusion.ids), [8001, 8002]);
        else assert.strictEqual(fusion.options, amplified ? 4 : 2);
    }
    console.log('smoke-crafting-target-stability passed');
}).catch(error => {
    console.error(error);
    process.exitCode = 1;
});
