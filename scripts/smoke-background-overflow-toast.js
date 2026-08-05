const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/passives.js', 'utf8');

function readFunctionSource(name) {
    const start = source.indexOf(`function ${name}(`);
    assert(start >= 0, `${name} must exist`);
    let depth = 0;
    for (let index = source.indexOf('{', start); index < source.length; index++) {
        if (source[index] === '{') depth += 1;
        if (source[index] !== '}') continue;
        depth -= 1;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`${name} source boundary not found`);
}

const logs = [];
const context = {
    game: {
        inventory: [{ id: 'kept' }],
        isBackgroundCalculation: true,
        settings: { showLootLog: true }
    },
    normalizeItem() {},
    tryAutoEquipEmptySlot: () => null,
    passesItemPickupFilter: () => true,
    getInventoryLimit: () => 1,
    salvageItemObject: () => ({ alteration: 1 }),
    formatSalvageRewardSummary: () => '변화의 오브 +1',
    addLog: message => logs.push(message),
    checkUnlocks() {},
    registerUniqueToCodexOnAcquire() {},
    Number,
    Math
};
vm.createContext(context);
vm.runInContext(readFunctionSource('addItemToInventory'), context, { filename: 'background-overflow-toast.js' });

assert.strictEqual(context.addItemToInventory({ name: '넘친 장비 1', rarity: 'rare' }), false);
assert.strictEqual(context.addItemToInventory({ name: '넘친 장비 2', rarity: 'magic' }), false);
assert.strictEqual(logs.length, 0, 'background overflow salvage must not enqueue one alert per discarded item');
assert.strictEqual(context.game.backgroundOverflowSalvageCount, 2, 'background overflow salvage must retain one summary count');

context.game.isBackgroundCalculation = false;
assert.strictEqual(context.addItemToInventory({ name: '일반 전투 장비', rarity: 'normal' }), false);
assert.strictEqual(logs.length, 1, 'foreground overflow salvage must keep its immediate combat log');

console.log('smoke-background-overflow-toast passed');
