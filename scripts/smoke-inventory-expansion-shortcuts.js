const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

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

const html = fs.readFileSync('index.html', 'utf8');
const source = fs.readFileSync('js/ui.js', 'utf8');
const equipmentButton = { hidden: true, disabled: false, textContent: '', title: '' };
const jewelButton = { hidden: true, disabled: false, textContent: '', title: '' };
const context = {
  Math,
  game: { maxZoneId: 5, season: 5, currencies: { divine: 2 } },
  document: {
    getElementById(id) {
      if (id === 'btn-equipment-inventory-expand') return equipmentButton;
      if (id === 'btn-jewel-inventory-expand') return jewelButton;
      return null;
    }
  },
  isMarketUnlocked() { return context.game.maxZoneId >= 5; },
  getMarketInventoryExpandCost() { return 2; },
  getJewelMarketExpandCost() { return 1; },
  getInventoryLimit() { return 30; },
  getJewelInventoryLimit() { return 20; }
};
vm.createContext(context);
vm.runInContext(readFunctionSource(source, 'syncInventoryExpansionShortcuts'), context);

context.syncInventoryExpansionShortcuts();
assert.strictEqual(equipmentButton.hidden, false);
assert.strictEqual(equipmentButton.disabled, false);
assert.strictEqual(equipmentButton.textContent, '+5칸 · 신성한 2');
assert(equipmentButton.title.includes('현재 30칸'));
assert.strictEqual(jewelButton.hidden, false);
assert.strictEqual(jewelButton.disabled, false);
assert.strictEqual(jewelButton.textContent, '+5칸 · 신성한 1');
assert(jewelButton.title.includes('현재 20칸'));

context.game.currencies.divine = 0;
context.syncInventoryExpansionShortcuts();
assert.strictEqual(equipmentButton.disabled, true, '재화가 부족하면 장비 한도 확장을 누를 수 없어야 한다');
assert.strictEqual(jewelButton.disabled, true, '재화가 부족하면 주얼 한도 확장을 누를 수 없어야 한다');

context.game.maxZoneId = 4;
context.syncInventoryExpansionShortcuts();
assert.strictEqual(equipmentButton.hidden, true, '거래소 해금 전에는 장비 확장 바로가기를 숨겨야 한다');
assert.strictEqual(jewelButton.hidden, true, '거래소 해금 전에는 주얼 확장 바로가기를 숨겨야 한다');

assert(html.includes('id="btn-equipment-inventory-expand"') && html.includes('onclick="marketExpandInventoryByDivine()"'));
assert(html.includes('id="btn-jewel-inventory-expand"') && html.includes('onclick="marketExpandJewelInventoryByDivine()"'));
console.log('smoke-inventory-expansion-shortcuts passed');
