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


// Socket actions (2026-09-30, they replaced the jewel workbench) work on the chosen equipment object and move the exact
// jewel objects: reordering the store between actions cannot swap which jewel goes in or comes out.
const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);
run(`updateStaticUI = function () {}; addLog = function () {};
    game.jewelInventory = ['A', 'B', 'C'].map((name, index) => ({ id: 9100 + index, name, rarity: 'magic', stats: [{ id: 'crit', val: 2, tier: 1 }] }));
    game.equipment['목걸이'] = createItemFromBase(BASE_ITEM_DB.find(row => row.slot === '목걸이'), 'rare', 10);
    equipmentSockets.openVoidSocket(game.equipment['목걸이']);`);
const moved = run(`(() => { const chosen = game.jewelInventory[1]; game.jewelInventory.reverse();
    equipmentSockets.insert(game.equipment['목걸이'], chosen.id); return game.equipment['목걸이'].voidSocket.jewel === chosen; })()`);
assert.strictEqual(moved, true, 'the jewel chosen by id goes in even after the store reorders');
assert.deepStrictEqual(JSON.parse(run('JSON.stringify(game.jewelInventory.map(jewel => jewel.name))')), ['C', 'A'],
    'the socketed jewel leaves the store exactly once');
assert.strictEqual(run("equipmentSockets.insert(game.equipment['목걸이'], 9102).ok"), false, 'a filled socket takes no second jewel');
run(`game.jewelInventory.length = 0;
    for (let i = 0; i < getJewelInventoryLimit(); i++) game.jewelInventory.push({ id: 9200 + i, name: 'x', rarity: 'magic', stats: [] });`);
assert.strictEqual(run("equipmentSockets.remove(game.equipment['목걸이'], 'void', 0).ok"), false, 'a full store blocks taking a jewel out');
assert.strictEqual(run("game.equipment['목걸이'].voidSocket.jewel.name"), 'B', 'a blocked removal leaves the jewel in place');
console.log('smoke-crafting-target-stability passed');
