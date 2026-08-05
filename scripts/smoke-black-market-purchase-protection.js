const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('js/passives.js', 'utf8');
const start = source.indexOf('function addItemToInventory(item, options)');
const end = source.indexOf('function getTalismanEffectAnchorCell', start);
assert(start >= 0 && end > start, 'inventory acquisition functions not found');
const context = {
  game: {
    inventory: [], uniqueCodex: {},
    settings: {
      showLootLog: true,
      itemFilterEnabled: true,
      itemFilterRarities: { normal: false, magic: false, rare: false, unique: false },
      autoSalvageEnabled: true,
      autoSalvageRarities: { normal: true, magic: true, rare: true, unique: true }
    }
  },
  normalizeItem: item => item,
  addLog: () => {},
  getInventoryLimit: () => 10,
  salvageItemObject: item => {
    context.salvaged.push(item.name);
    return { transmute: 1 };
  },
  formatSalvageRewardSummary: rewards => Object.keys(rewards || {}).join(', '),
  registerUniqueToCodexOnAcquire: item => { context.registered = item.name; },
  getUniqueCodexKeyByItem: item => `${item.slot || 'weapon'}|${item.name}`,
  checkUnlocks: () => { context.checked = true; },
  salvaged: []
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);
assert.strictEqual(vm.runInContext("addItemToInventory({ name:'drop sword', rarity:'normal' })", context), false);
assert.deepStrictEqual(context.game.inventory.map(item => item.name), []);
assert.strictEqual(vm.runInContext("addItemToInventory({ name:'market sword', rarity:'normal' }, { ignoreFilter:true, ignoreAutoSalvage:true })", context), true);
assert.deepStrictEqual(context.game.inventory.map(item => item.name), ['market sword']);
assert.strictEqual(context.salvaged.length, 0);
context.game.inventory = Array.from({ length: 10 }, (_, index) => ({ name: `filled ${index}`, rarity: 'normal' }));
assert.strictEqual(vm.runInContext("addItemToInventory({ name:'full market sword', rarity:'normal' }, { ignoreFilter:true, ignoreAutoSalvage:true })", context), false);
assert.strictEqual(context.game.inventory.length, 10);
console.log('smoke-black-market-purchase-protection passed');
