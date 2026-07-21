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
const menuCss = fs.readFileSync('css/ui-menu-sockets.css', 'utf8');
const windowManager = fs.readFileSync('js/ui-window-manager.js', 'utf8');

assert.ok(html.includes('css/ui-asset-skins.css?v=20260722-health-menu-skin2'), 'asset skin CSS must be cache-versioned');
assert.ok(html.includes('css/ui-menu-sockets.css?v=20260722-health-menu-skin2'), 'menu socket CSS must be cache-versioned');
assert.ok(html.indexOf('css/ui-asset-skins.css') > html.indexOf('typography-readability.css'), 'asset skins must load after legacy UI rules');
assert.ok(html.includes('<img class="player-health-frame-art" src="assets/ui/health-player-v1.png"'), 'the player HUD must use one real frame image');
assert.ok(html.indexOf('player-health-frame') < html.indexOf('id="ui-hp-bar"'), 'the live player HP bar must remain inside its art frame');
assert.ok(ui.includes('<div class="health-skin-track">'), 'enemy fills must be clipped separately from their art');
assert.ok(ui.includes("? 'boss' : (focusedEnemy.isElite ? 'elite' : 'mob')"), 'boss, elite, and normal enemies must select distinct art tiers');
assert.ok(ui.includes('src="assets/ui/health-${enemyHudTier}-v1.png"'), 'enemy frames must use one real image selected by tier');
assert.ok(ui.indexOf('<div class="hp-text"></div>') < ui.indexOf('</div>\n                        </div>\n                        <div class="enemy-tags muted enemy-traits">'), 'enemy HP text must remain inside the live gauge track');
assert.ok(css.includes('.player-health-frame #ui-hp-bar'), 'player HP must have its own green live fill');
assert.ok(css.includes('.player-health-frame #ui-es-bar'), 'player energy shield must have its own blue live fill');
assert.ok(css.includes('.player-health-frame #ui-exp-bar'), 'player experience must have its own live fill');
assert.ok(css.includes('.enemy-card.enemy-boss .enemy-traits'), 'boss traits must occupy the lower frame panel');
assert.ok(css.includes('--health-track-left:'), 'baked health colors must be covered by a live clipped track');
assert.ok(css.includes('@media (max-width: 1080px)'), 'the integrated player frame must retain a mobile layout');
assert.ok(windowManager.includes("art.src = RAIL_ART_SRC"), 'the menu rail must be connected as a real image');
assert.ok(menuCss.includes('.ui-rail-art'), 'the real menu image must be sized by its own element');
assert.ok(menuCss.includes('--menu-rail-width:'), 'the menu image size must stay adjustable from one CSS variable');
assert.ok(menuCss.includes('width: var(--menu-rail-width)'), 'the menu image frame must consume the adjustable width');
assert.ok(!menuCss.includes("url('../assets/ui/menu-rail-v1.png')"), 'the menu image must not be painted as a CSS background');
assert.ok(!menuCss.includes('background-repeat'), 'the menu art must not be tiled or copied');

console.log('smoke-ui-asset-skins passed');
