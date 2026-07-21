const assert = require('assert');
const fs = require('fs');

function readPngSize(file) {
  const bytes = fs.readFileSync(file);
  assert.strictEqual(bytes.subarray(1, 4).toString('ascii'), 'PNG', `${file} must be a PNG`);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

const expectedSkins = new Map([
  ['assets/ui/health-boss-v1.png', [309, 105]],
  ['assets/ui/health-elite-v1.png', [236, 78]],
  ['assets/ui/health-mob-v1.png', [153, 51]],
  ['assets/ui/health-player-v1.png', [512, 84]],
  ['assets/ui/menu-rail-v1.png', [216, 532]],
]);

for (const [file, expectedSize] of expectedSkins) {
  assert.ok(fs.existsSync(file), `${file} must exist`);
  assert.deepStrictEqual(readPngSize(file), expectedSize, `${file} must keep its source dimensions`);
}

const html = fs.readFileSync('index.html', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');
const css = fs.readFileSync('css/ui-asset-skins.css', 'utf8');

assert.ok(html.includes('css/ui-asset-skins.css?v=20260722-health-menu-skin1'), 'asset skin CSS must be cache-versioned');
assert.ok(html.indexOf('css/ui-asset-skins.css') > html.indexOf('typography-readability.css'), 'asset skins must load after legacy UI rules');
assert.ok(html.includes('<div class="player-health-frame">'), 'the player HUD must expose one integrated art frame');
assert.ok(html.indexOf('player-health-frame') < html.indexOf('id="ui-hp-bar"'), 'the live player HP bar must remain inside its art frame');
assert.ok(ui.includes('<div class="health-skin-track">'), 'enemy fills must be clipped separately from their art');
assert.ok(ui.includes("focusedEnemy.isElite ? ' enemy-elite'"), 'elite enemies must retain their dedicated skin class');
assert.ok(css.includes("url('../assets/ui/health-boss-v1.png')"), 'boss health art must be wired');
assert.ok(css.includes("url('../assets/ui/health-elite-v1.png')"), 'elite health art must be wired');
assert.ok(css.includes("url('../assets/ui/health-mob-v1.png')"), 'normal monster health art must be wired');
assert.ok(css.includes("url('../assets/ui/health-player-v1.png')"), 'player health art must be wired');
assert.ok(css.includes("url('../assets/ui/menu-rail-v1.png')"), 'menu rail art must be wired');
assert.ok(css.includes('.desktop-windowed-ui .tab-header:not(.tab-header-bottom)'), 'menu art must be limited to the desktop rail');
assert.ok(css.includes('--health-track-left:'), 'baked health colors must be covered by a live clipped track');
assert.ok(css.includes('@media (max-width: 1080px)'), 'the integrated player frame must retain a mobile layout');

console.log('smoke-ui-asset-skins passed');
