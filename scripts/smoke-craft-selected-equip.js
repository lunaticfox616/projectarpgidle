const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const items = fs.readFileSync('js/items.js', 'utf8');
const start = items.indexOf('let craftingSelectionState');
const end = items.indexOf('// Phase-3 extracted market/crafting service handlers.');
assert(start >= 0 && end > start, 'items crafting/equip block must be discoverable');

const exposed = {};
const context = {
  console,
  game: {
    inventory: [{ id: 101, name: '제작 완료 검', slot: '무기' }],
    equipment: { 무기: null },
    ascendClass: 'none'
  },
  window: {},
  safeExposeGlobals(obj) { Object.assign(exposed, obj); Object.assign(context, obj); },
  getInventoryLimit() { return 30; },
  hideItemTooltip() {},
  normalizeSupportLoadout() {},
  updateStaticUI() { context.updateCount += 1; },
  updateCount: 0
};
context.window = context;
vm.createContext(context);
vm.runInContext(items.slice(start, end), context);

context.selectForCrafting(101, false);
assert.strictEqual(context.getSelectedCraftItem().name, '제작 완료 검', 'crafted inventory item should be selected before equipping');
assert.strictEqual(context.equipSelectedCraftInventoryItem(), true, 'selected crafted inventory item should equip from the craft panel action');
assert.strictEqual(context.game.equipment.무기.id, 101, 'selected crafted item should move into its equipment slot');
assert.deepStrictEqual(context.game.inventory, [], 'equipping should remove the crafted item from inventory when the slot is empty');
assert.strictEqual(context.isCraftSelectionEquip(), true, 'craft selection should keep following the item after it is equipped');
assert.strictEqual(context.getCraftSelectionRef(), '무기', 'craft selection should point at the equipped slot after equipping');
assert.strictEqual(context.equipSelectedCraftInventoryItem(), false, 'equipped craft selections should not try to equip again');
assert.strictEqual(typeof exposed.equipSelectedCraftInventoryItem, 'function', 'craft selected equip action must be globally exposed');

const ui = fs.readFileSync('js/ui.js', 'utf8');
assert(ui.includes('let equipSelectedButtonHtml = isCraftSelectionEquip() ? \'\' : `<button onclick="equipSelectedCraftInventoryItem()">착용</button>`;'), 'craft selected panel should render an equip button only for inventory selections');
assert(ui.includes('${equipSelectedButtonHtml}<button onclick="upgradeSelectedItemBase()"'), 'craft selected equip button should appear beside existing item actions');

console.log('craft selected equip smoke checks passed');
