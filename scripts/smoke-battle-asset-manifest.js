const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { decodeVfxData, loadVfxAssetCatalog } = require('./lib/skill-vfx-editor-model');
const { createZipArchive } = require('./lib/zip-archive');

const ROOT = path.resolve(__dirname, '..');

const source = fs.readFileSync('js/passives.js', 'utf8');
const manifestStart = source.indexOf('    const manifest = {', source.indexOf('function initBattleAssets('));
const manifestEnd = source.indexOf('\n    };', manifestStart);

assert(manifestStart >= 0 && manifestEnd > manifestStart, 'battle asset manifest must be present');
const manifestSource = source.slice(manifestStart, manifestEnd);
const assetPaths = [...manifestSource.matchAll(/'((?:assets\/)[^'?]+)(?:\?[^']*)?'/g)].map(match => match[1]);

assert(assetPaths.length > 20, 'battle asset manifest must retain its local asset entries');
assetPaths.forEach(assetPath => {
    assert(fs.existsSync(assetPath), `battle asset manifest references a missing file: ${assetPath}`);
});

const vfxAssets = loadVfxAssetCatalog(ROOT);
assert.ok(vfxAssets.some(asset => asset.key === 'skillFxFrostBurst' && asset.label === '서리 폭발'),
    'the dedicated frost burst wave should be available to the editor');
assert.ok(vfxAssets.some(asset => asset.key === 'skillFxFrostWaveRing' && asset.label === '서리 폭발 파동'),
    'the separate frost wavefront should be available to the editor');
assert.ok(vfxAssets.every(asset => assetPaths.includes(asset.path)), 'VFX editor should only expose live manifest assets');
assert.ok(!source.includes('battle-effects-v1.png') && !fs.existsSync('assets/battle-effects-v1.png'),
    'unused legacy battle effect atlas should stay removed');

const editorHtml = fs.readFileSync('tools/skill-vfx-editor/index.html', 'utf8');
assert.ok(editorHtml.includes('href="/api/download-all"'), 'VFX editor should expose one-click ZIP download');
const archive = createZipArchive(vfxAssets.map(asset => ({
    name: `rignin-skill-vfx/${path.basename(asset.path)}`,
    data: fs.readFileSync(asset.path)
})));
assert.strictEqual(archive.readUInt32LE(0), 0x04034b50, 'bulk VFX download should be a ZIP archive');
assert.strictEqual(archive.readUInt16LE(archive.length - 12), vfxAssets.length,
    'bulk VFX ZIP should contain every live image exactly once');
vfxAssets.forEach(asset => assert.ok(archive.includes(Buffer.from(path.basename(asset.path))),
    `bulk VFX ZIP should retain ${path.basename(asset.path)}`));

const pngAsset = vfxAssets.find(asset => asset.path.endsWith('.png'));
const pngBytes = fs.readFileSync(pngAsset.path);
const pngDataUrl = `data:image/png;base64,${pngBytes.toString('base64')}`;
assert.deepStrictEqual(decodeVfxData(pngAsset, pngDataUrl), pngBytes,
    'VFX replacement should preserve a valid same-format image');

console.log(`smoke-battle-asset-manifest passed (${assetPaths.length} local assets)`);
