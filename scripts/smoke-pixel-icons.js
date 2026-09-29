// Pixel icon copies (scripts/build-pixel-icons.cjs → assets/px/, data/pixel-icons.js) and the painted/pixel switch
// (js/utils.js pixelIconPath, game.settings.iconArtStyle).
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = code => vm.runInContext(code, context);

function imageSize(file) {
    const bytes = fs.readFileSync(file);
    if (bytes.toString('ascii', 1, 4) === 'PNG') return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
    const chunk = bytes.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return [1 + bytes.readUIntLE(24, 3), 1 + bytes.readUIntLE(27, 3)];
    if (chunk === 'VP8L') { const bits = bytes.readUInt32LE(21); return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1]; }
    if (chunk === 'VP8 ') return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
    throw new Error(`unknown image format: ${file}`);
}
function strings(value, out = new Set()) {
    if (typeof value === 'string') out.add(value.split('?')[0]);
    else if (value && typeof value === 'object') Object.values(value).forEach(child => strings(child, out));
    return out;
}

// Every painted icon larger than the dot grid has a pixel copy; small ones (32-dot world-tree gems) are already pixel art.
const sources = new Set(run('PIXEL_ICON_SOURCES'));
const referenced = [...strings(run('[ITEM_VISUAL_ASSET_DB, SKILL_GEM_ART_PATHS, CURRENCY_ICON_PATHS]'))]
    .filter(file => /^assets\/.+\.(png|webp)$/.test(file) && fs.existsSync(file));
for (const file of referenced) {
    const [width, height] = imageSize(file);
    const needsCopy = Math.max(Math.min(width, height) / 32, Math.max(width, height) / 48) > 1;
    assert.strictEqual(sources.has(file), needsCopy, `${file} (${width}×${height}) ${needsCopy ? 'needs' : 'must not get'} a pixel copy`);
}
assert(sources.size > 300, `the pixel copy list covers the item, gem and currency art (got ${sources.size})`);

// Copies exist, are PNG, and stay within 32 dots on the short side and 48 on the long side.
run("game.settings.iconArtStyle = 'pixel';");
for (const source of sources) {
    const copy = run(`pixelIconPath(${JSON.stringify(source)})`);
    assert.strictEqual(copy, 'assets/px/' + source.slice('assets/'.length).replace(/\.(png|webp)$/, '.png'));
    assert(fs.existsSync(copy), `${copy} must exist — run node scripts/build-pixel-icons.cjs`);
    const [width, height] = imageSize(copy);
    assert(Math.min(width, height) <= 32 && Math.max(width, height) <= 48, `${copy} is ${width}×${height}`);
}

// The switch: default and 'pixel' → copy, 'painted' → the original path (query string kept), unknown paths untouched.
const jewel = run('ITEM_VISUAL_ASSET_DB.jewel');
assert.strictEqual(run(`pixelIconPath(${JSON.stringify(jewel)})`), 'assets/px/items/chaos-jewel-v3.png', 'a cache-busting query does not hide the copy');
run("game.settings.iconArtStyle = 'painted';");
assert.strictEqual(run(`pixelIconPath(${JSON.stringify(jewel)})`), jewel, 'the painted setting keeps the original path and its query');
assert.strictEqual(run("getEquipmentGridVisualAsset({ slot: '반지' })"), 'assets/items/illustrated/copper_ring.webp');
run("game.settings.iconArtStyle = undefined;");
assert.strictEqual(run("getEquipmentGridVisualAsset({ slot: '반지' })"), 'assets/px/items/illustrated/copper_ring.png', 'pixel copies are the default');
assert.strictEqual(run("pixelIconPath('assets/ui/login-world-tree.webp')"), 'assets/ui/login-world-tree.webp', 'art without a copy is untouched');
assert.strictEqual(run("pixelIconPath('')"), '', 'an empty path stays empty');
assert.strictEqual(run("normalizeIconArtStyle('weird')"), 'pixel');

console.log(`pixel icons: ${sources.size} copies, painted/pixel switch ok`);
