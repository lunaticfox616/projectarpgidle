const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const ui = fs.readFileSync('js/ui.js', 'utf8');
const equipmentRenderer = fs.readFileSync('js/canvas-passive-tree.js', 'utf8');
const equipmentCss = fs.readFileSync('css/ui-game-overhaul.css', 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} must exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] !== '}') continue;
    depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`${name} body is incomplete`);
}

const calls = [];
const context = {
  game: { inventory: [{ id: 42 }] },
  document: {
    body: { classList: { contains: value => value === 'desktop-windowed-ui' } },
    getElementById: () => ({ scrollIntoView: () => calls.push('scroll') }),
  },
  hideItemTooltip: () => calls.push('hide-item-tooltip'),
  hideInfoTooltip: () => calls.push('hide-info-tooltip'),
  switchTab: id => calls.push(`switch:${id}`),
  openWindow: id => calls.push(`open:${id}`),
  switchItemSubtab: id => calls.push(`subtab:${id}`),
  selectForCrafting: (id, equipped) => calls.push(`select:${id}:${equipped}`),
  setTimeout: callback => callback(),
  Number,
};
vm.runInNewContext(`${extractFunction(ui, 'craftSelectInventoryItemById')}; craftSelectInventoryItemById(42);`, context);
assert.deepStrictEqual(
  calls.slice(2, 6),
  ['switch:tab-items', 'open:tab-items', 'subtab:item-tab-craft', 'select:42:false'],
  'craft shortcut must keep the item window open before activating the crafting subtab and target',
);

assert(equipmentRenderer.includes('data-item-tooltip-anchor="1"'), 'equipment cards need stable tooltip anchors');
assert(equipmentRenderer.includes('onmousemove="showItemTooltip'), 'equipment tooltips must recover after a DOM refresh while the pointer moves');
assert(equipmentRenderer.includes('onmouseleave="hideItemTooltip(event)"'), 'tooltip leave handling needs pointer context');
assert(ui.includes("hovered.closest('[data-item-tooltip-anchor=\"1\"]')"), 'tooltip dismissal must not hide while another equipment card is under the pointer');

assert(!equipmentRenderer.includes('getItemSalvagePreviewText(item, true)'), 'equipment cards must not show salvage materials in their metadata');
assert(!equipmentRenderer.includes('equipment-meta-detail'), 'equipment cards must not show a redundant detail label');
assert(equipmentRenderer.includes("let optionSummary = explicitCount > 0 ? `추가 옵션 ${explicitCount}` : '추가 옵션 없음'"), 'equipment metadata should keep only the explicit option count');
assert(equipmentCss.includes('repeat(auto-fill, minmax(170px, 1fr))'), 'equipment inventory should fit more cards per row when space allows');

console.log('smoke-equipment-tab-ux passed');
