const assert = require('assert');
const fs = require('fs');
const { buildGameRuntime } = require('./lib/game-runtime');

const assets = [
  'chaos-jewel-v1',
  'seed-talisman-v1', 'flower-growth-v1', 'thorn-growth-v1', 'cosmic-slab-v1'
].map(name => `assets/items/${name.replace('-v1', '-v3')}.png`);

assets.forEach(file => {
  assert(fs.existsSync(file), `${file} must exist`);
  const bytes = fs.readFileSync(file);
  assert.strictEqual(bytes.readUInt32BE(16), 256, `${file} must be 256px wide`);
  assert.strictEqual(bytes.readUInt32BE(20), 256, `${file} must be 256px tall`);
  assert.strictEqual(bytes.readUInt8(25), 6, `${file} must have RGBA transparency`);
});

const context = buildGameRuntime();
const resolve = context.getInventoryItemVisualAsset;
assert.strictEqual(resolve({ slot: '무기', baseName: '고목 활' }, 'equipment'), 'assets/items/illustrated/windlash_bow.webp');
assert.strictEqual(resolve({ slot: '무기', name: '제의 지팡이' }, 'equipment'), 'assets/items/illustrated/ritual_familiar_staff.webp');
assert.strictEqual(resolve({ slot: '방패' }, 'equipment'), 'assets/items/illustrated/buckler_scrap.webp');
assert.strictEqual(resolve({ slot: '허리띠' }, 'equipment'), 'assets/items/illustrated/rope_belt.webp');
assert.strictEqual(resolve({ slot: '반지' }, 'equipment'), 'assets/items/illustrated/copper_ring.webp');
assert.strictEqual(resolve({}, 'jewel'), 'assets/items/chaos-jewel-v3.png?v=20260821-1');
assert.strictEqual(resolve({}, 'talisman'), 'assets/items/seed-talisman-v3.png');
assert.strictEqual(resolve({ growthCategory: 'flower' }, 'growth'), 'assets/items/flower-growth-v3.png');
assert.strictEqual(resolve({ growthCategory: 'slab' }, 'growth'), 'assets/items/cosmic-slab-v3.png');

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const uiCss = fs.readFileSync('css/ui-game-overhaul.css', 'utf8');
assert(uiSource.includes('item-actions jewel-card-actions'), 'jewel action buttons must render outside the icon-and-copy row');
assert(uiCss.includes('.jewel-inventory-card > .jewel-card-actions { grid-column: 1 / -1; }'),
  'jewel actions must span the full card width instead of inheriting the icon column offset');

console.log('smoke-item-visual-assets: ok');
