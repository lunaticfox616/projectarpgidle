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
// Default icon art is the pixel copy of the same painted source.
assert.strictEqual(resolve({ slot: '무기', baseName: '고목 활' }, 'equipment'), 'assets/px/items/illustrated/windlash_bow.png');
assert.strictEqual(resolve({}, 'jewel'), 'assets/px/items/chaos-jewel-v3.png');
// The painted sources below are what the "원화" setting shows.
context.game.settings.iconArtStyle = 'painted';
assert.strictEqual(resolve({ slot: '무기', baseName: '고목 활' }, 'equipment'), 'assets/items/illustrated/windlash_bow.webp');
assert.strictEqual(resolve({ slot: '무기', name: '제의 지팡이' }, 'equipment'), 'assets/items/illustrated/ritual_familiar_staff.webp');
assert.strictEqual(resolve({ slot: '방패' }, 'equipment'), 'assets/items/illustrated/buckler_scrap.webp');
assert.strictEqual(resolve({ slot: '허리띠' }, 'equipment'), 'assets/items/illustrated/rope_belt.webp');
assert.strictEqual(resolve({ slot: '반지' }, 'equipment'), 'assets/items/illustrated/copper_ring.webp');
assert.strictEqual(resolve({}, 'jewel'), 'assets/items/chaos-jewel-v3.png?v=20260821-1');
assert.strictEqual(resolve({}, 'talisman'), 'assets/items/seed-talisman-v3.png');
assert.strictEqual(resolve({ growthCategory: 'flower' }, 'growth'), 'assets/items/flower-growth-v3.png');
assert.strictEqual(resolve({ growthCategory: 'slab' }, 'growth'), 'assets/items/cosmic-slab-v3.png');

// Cores (2026-09-30) carry only their lines to ground loot and logs; the icon follows the first line's group.
assert.strictEqual(resolve({ lines: [{ id: 'pct_dmg', value: 10 }] }, 'core'), 'assets/px/cores/core-offense.png');
assert.strictEqual(resolve({}, 'core'), 'assets/px/cores/core-empty.png');
assert(fs.existsSync('assets/px/cores/core-offense.png') && fs.existsSync('assets/px/cores/core-empty.png'));

// The jewel store cards (socket dialog) keep their buttons in their own row under the stats.
const socketUi = fs.readFileSync('js/equipment-sockets-ui.js', 'utf8');
const auxCss = fs.readFileSync('css/equipment-aux.css', 'utf8');
assert(socketUi.includes('<div class="socket-jewel-actions">'), 'jewel store buttons render in their own row');
assert(auxCss.includes('.socket-jewel-actions { display: grid;'), 'the jewel store button row is a grid across the card');

console.log('smoke-item-visual-assets: ok');
