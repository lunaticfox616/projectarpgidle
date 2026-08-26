const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

function plain(value) {
    return JSON.parse(JSON.stringify(value));
}

const context = buildGameRuntime();
const footprint = item => plain(context.getEquipmentInventoryFootprint(item));

assert.deepStrictEqual(footprint({ slot: '반지' }), { columns: 1, rows: 1 });
assert.deepStrictEqual(footprint({ slot: '허리띠' }), { columns: 2, rows: 1 });
assert.deepStrictEqual(footprint({ slot: '장갑' }), { columns: 2, rows: 2 });
assert.deepStrictEqual(footprint({ slot: '갑옷' }), { columns: 2, rows: 3 });
assert.deepStrictEqual(footprint({ slot: '무기', baseName: '잿불 완드' }), { columns: 1, rows: 2 });
assert.deepStrictEqual(footprint({ slot: '무기', baseName: '녹슨 검' }), { columns: 1, rows: 3 });
assert.deepStrictEqual(footprint({ slot: '무기', baseName: '돌풍 장궁' }), { columns: 2, rows: 3 });
assert.deepStrictEqual(footprint({ slot: '무기', baseName: '사냥꾼의 도끼' }), { columns: 2, rows: 2 });

const exactAsset = context.getEquipmentGridVisualAsset({ slot: '무기', baseId: 'rusted_blade' });
assert.strictEqual(exactAsset, 'assets/items/grid/item-short-sword-v1.webp');
const firstFallback = context.getEquipmentGridVisualAsset({ slot: '투구', baseId: 'unknown_helm' });
const repeatedFallback = context.getEquipmentGridVisualAsset({ slot: '투구', baseId: 'unknown_helm' });
assert.strictEqual(firstFallback, repeatedFallback, 'the same base must keep the same visual across renders');
assert(context.ITEM_VISUAL_ASSET_DB.equipmentGrid.slotAssets['투구'].includes(firstFallback),
    'an unmapped helmet must stay inside the helmet art pool');

const gridAssets = new Set();
const gridDb = context.ITEM_VISUAL_ASSET_DB.equipmentGrid;
Object.values(gridDb.baseAssets).forEach(asset => gridAssets.add(asset));
Object.values(gridDb.slotAssets).flat().forEach(asset => gridAssets.add(asset));
assert.strictEqual(gridAssets.size, 40, 'the first inventory art set must contain 40 distinct silhouettes');
let totalBytes = 0;
gridAssets.forEach(asset => {
    assert(asset.endsWith('.webp'), `${asset} must use the compressed WebP format`);
    assert(fs.existsSync(asset), `${asset} must exist`);
    totalBytes += fs.statSync(asset).size;
});
assert(totalBytes < 350000, `the 40-icon set must stay compact (actual ${totalBytes} bytes)`);

vm.runInContext(`game.inventory = [{
    id: 7001, slot: '무기', baseId: 'windlash_bow', baseName: '돌풍 장궁',
    name: '검증용 장궁', rarity: 'rare', baseStats: [], stats: []
}]`, context);
const item = vm.runInContext('game.inventory[0]', context);
const html = context.renderEquipmentGridItem(item, 0, null);
assert(html.includes('--item-grid-columns:2;--item-grid-rows:3;'), 'a bow must visibly occupy a 2x3 footprint');
assert(html.includes('item-recurve-bow-v1.webp'), 'the grid must render the base-specific item artwork');
assert(!html.includes('equipment-grid-inspector-actions'), 'grid cells must not squeeze full action controls into the footprint');

const inspector = { innerHTML: '' };
const cards = [{
    dataset: { equipmentGridId: '7001' },
    classList: { toggle(name, enabled) { this[name] = enabled; } },
    setAttribute(name, value) { this[name] = value; }
}];
context.document.getElementById = id => id === 'ui-equipment-inventory-inspector' ? inspector : null;
context.document.querySelectorAll = selector => selector === '[data-equipment-grid-id]' ? cards : [];
context.focusEquipmentGridItem(7001);
assert.strictEqual(cards[0].classList.selected, true, 'clicking a grid item must focus its cell');
assert.strictEqual(cards[0]['aria-pressed'], 'true', 'the focused cell must expose its selected state');
assert(inspector.innerHTML.includes('검증용 장궁'), 'the inspector must show the focused item');
assert(inspector.innerHTML.includes('equipItemById(7001)'), 'the focused item must keep an accessible equip action');
assert(inspector.innerHTML.includes('salvageItemById(7001)'), 'the focused item must keep an accessible salvage action');

console.log('smoke-equipment-grid-inventory: ok');
