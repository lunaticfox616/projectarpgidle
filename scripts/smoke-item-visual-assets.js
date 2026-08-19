const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function readFunctionSource(sourceText, name) {
  const start = sourceText.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} must exist`);
  let depth = 0;
  for (let index = sourceText.indexOf('{', start); index < sourceText.length; index++) {
    if (sourceText[index] === '{') depth += 1;
    if (sourceText[index] !== '}') continue;
    depth -= 1;
    if (depth === 0) return sourceText.slice(start, index + 1);
  }
  throw new Error(`${name} must have a closing brace`);
}

const assets = [
  'root-sword-v1', 'thorn-bow-v1', 'branch-staff-v1', 'tower-shield-v1',
  'antler-helmet-v1', 'root-armor-v1', 'claw-gauntlets-v1', 'travel-boots-v1',
  'engraved-belt-v1', 'ruby-ring-v1', 'violet-amulet-v1', 'chaos-jewel-v1',
  'seed-talisman-v1', 'flower-growth-v1', 'thorn-growth-v1', 'cosmic-slab-v1'
].map(name => `assets/items/${name}.png`);

assets.forEach(file => {
  assert(fs.existsSync(file), `${file} must exist`);
  const bytes = fs.readFileSync(file);
  assert.strictEqual(bytes.readUInt32BE(16), 256, `${file} must be 256px wide`);
  assert.strictEqual(bytes.readUInt32BE(20), 256, `${file} must be 256px tall`);
  assert.strictEqual(bytes.readUInt8(25), 6, `${file} must have RGBA transparency`);
});

const dataSource = fs.readFileSync('data/items.js', 'utf8');
const itemsSource = fs.readFileSync('js/items.js', 'utf8');
const mappingStart = dataSource.indexOf('const ITEM_VISUAL_ASSET_DB');
const mappingEnd = dataSource.indexOf('\n});', mappingStart) + 4;
assert(mappingStart >= 0 && mappingEnd > mappingStart, 'item visual asset database must exist');

const context = { safeExposeGlobals() {} };
context.window = context;
vm.createContext(context);
vm.runInContext(`${dataSource.slice(mappingStart, mappingEnd)}\nthis.ITEM_VISUAL_ASSET_DB = ITEM_VISUAL_ASSET_DB;`, context);
vm.runInContext(`${readFunctionSource(itemsSource, 'getInventoryItemVisualAsset')}\nthis.getInventoryItemVisualAsset = getInventoryItemVisualAsset;`, context);

const resolve = context.getInventoryItemVisualAsset;
assert.strictEqual(resolve({ slot: '무기', baseName: '고목 활' }, 'equipment'), 'assets/items/thorn-bow-v1.png');
assert.strictEqual(resolve({ slot: '무기', name: '제의 지팡이' }, 'equipment'), 'assets/items/branch-staff-v1.png');
assert.strictEqual(resolve({ slot: '방패' }, 'equipment'), 'assets/items/tower-shield-v1.png');
assert.strictEqual(resolve({}, 'jewel'), 'assets/items/chaos-jewel-v1.png');
assert.strictEqual(resolve({}, 'talisman'), 'assets/items/seed-talisman-v1.png');
assert.strictEqual(resolve({ growthCategory: 'flower' }, 'growth'), 'assets/items/flower-growth-v1.png');
assert.strictEqual(resolve({ growthCategory: 'slab' }, 'growth'), 'assets/items/cosmic-slab-v1.png');

console.log('smoke-item-visual-assets: ok');
