const assert = require('assert');
const fs = require('fs');

function readPngSize(file) {
  const bytes = fs.readFileSync(file);
  assert.strictEqual(bytes.subarray(1, 4).toString('ascii'), 'PNG', `${file} must be a PNG`);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

function readPngColorType(file) {
  return fs.readFileSync(file).readUInt8(25);
}

const expectedSkins = new Map([
  ['assets/ui/health-boss-v1.png', [309, 105]],
  ['assets/ui/health-elite-v1.png', [236, 78]],
  ['assets/ui/health-mob-v1.png', [153, 51]],
  ['assets/ui/health-player-v1.png', [512, 84]],
  ['assets/ui/menu-rail-v1.png', [216, 532]],
  ['assets/ui/gauge-player-hp-v1.png', [120, 23]],
  ['assets/ui/gauge-player-es-v1.png', [35, 24]],
  ['assets/ui/gauge-player-exp-v1.png', [83, 4]],
  ['assets/ui/gauge-mob-hp-v1.png', [111, 6]],
  ['assets/ui/gauge-elite-hp-v1.png', [145, 10]],
  ['assets/ui/gauge-boss-hp-v1.png', [204, 8]],
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

assert.ok(html.includes('css/ui-asset-skins.css?v=20260722-hud-meta2'), 'asset skin CSS must be cache-versioned');
assert.ok(html.includes('css/ui-menu-sockets.css?v=20260722-combat-icons2'), 'menu socket CSS must be cache-versioned');
assert.ok(html.includes('js/ui.js?v=20260722-hud-meta2'), 'combat HUD JavaScript must be cache-versioned');
assert.ok(html.includes('js/combat.js?v=20260722-combat-icons2'), 'combat effect state fixes must be cache-versioned');
assert.ok(html.includes('js/ui-window-manager.js?v=20260722-combat-icons2'), 'menu socket JavaScript must be cache-versioned');
assert.ok(html.indexOf('css/ui-asset-skins.css') > html.indexOf('typography-readability.css'), 'asset skins must load after legacy UI rules');
assert.ok(html.includes('<img class="player-health-frame-art" src="assets/ui/health-player-v1.png"'), 'the player HUD must use one real frame image');
assert.ok(html.indexOf('player-health-frame') < html.indexOf('id="ui-hp-bar"'), 'the live player HP bar must remain inside its art frame');
const hpTrackStart = html.indexOf('class="hp-bar-bg combat-hp-bar"');
const expTrackStart = html.indexOf('class="hp-bar-bg combat-exp-bar"', hpTrackStart);
const esTrackStart = html.indexOf('id="ui-es-track"', hpTrackStart);
assert.ok(hpTrackStart >= 0 && esTrackStart > hpTrackStart && esTrackStart < expTrackStart, 'energy shield must overlay the shared health track');
assert.ok(!html.includes('combat-es-bar'), 'energy shield must not reserve a separate horizontal segment');
assert.ok(ui.includes('<div class="health-skin-track">'), 'enemy fills must be clipped separately from their art');
assert.ok(ui.includes("? 'boss' : (focusedEnemy.isElite ? 'elite' : 'mob')"), 'boss, elite, and normal enemies must select distinct art tiers');
assert.ok(ui.includes('src="assets/ui/health-${enemyHudTier}-v1.png"'), 'enemy frames must use one real image selected by tier');
assert.ok(ui.includes("let traitMarkup = '<div class=\"enemy-tags muted enemy-traits\"></div>'"), 'enemy traits must have one DOM owner per tier');
assert.ok(ui.includes("let effectMarkup = '<div class=\"enemy-tags muted enemy-ailments combat-effect-strip enemy-combat-effect-strip\""),
  'enemy effects must have one DOM owner per tier');
assert.ok(ui.includes('let metaMarkup = `<div class="enemy-hud-meta">${traitMarkup}${effectMarkup}</div>`'),
  'enemy traits and effects must share one compact row');
assert.ok(ui.includes('${metaMarkup}'), 'every enemy tier must render its metadata row inside its health frame');
assert.ok(css.includes('.player-health-frame #ui-hp-bar'), 'player HP must have its own green live fill');
assert.ok(css.includes('.player-health-frame #ui-es-bar'), 'player energy shield must have its own blue live fill');
assert.ok(css.includes('.player-health-frame #ui-exp-bar'), 'player experience must have its own live fill');
assert.ok(css.includes('left: 29.88%') && css.includes('right: 9.77%'), 'health and energy shield must share the complete supplied art track');
assert.ok(css.includes('left: 14.45%') && css.includes('right: 14.45%'), 'player experience must cover only the supplied art track');
[
  'gauge-player-hp-v1.png', 'gauge-player-es-v1.png', 'gauge-player-exp-v1.png',
  'gauge-mob-hp-v1.png', 'gauge-elite-hp-v1.png', 'gauge-boss-hp-v1.png'
].forEach(file => assert.ok(css.includes(file), `${file} must provide a live gauge texture`));
assert.ok(css.includes('clip-path: inset(0 calc(100% - var(--gauge-fill, 0%)) 0 0)'), 'live gauge percentages must clip rather than rescale the extracted textures');
assert.ok(css.includes('.combat-flask-mini.overflow'), 'extra flask status must stay inside the three-orb art');
assert.ok(css.includes('.combat-flask-mini.empty'), 'unequipped utility art sockets must be masked');
assert.ok(/\.player-health-frame \.combat-flask-mini \{[\s\S]*?position: absolute !important;/.test(css), 'dark theme button chrome must not displace flask sockets');
assert.ok(/\.player-health-frame \.combat-flask-mini \{[\s\S]*?overflow: visible !important;/.test(css), 'flask charge badges must not be clipped by their circular sockets');
assert.ok(css.includes('.player-hud-shell > .player-hud-identity-row') && css.includes('right: calc(100% + 6px)') && css.includes('bottom: 24%'),
  'desktop identity text must occupy the dedicated lower-left panel beside health');
assert.ok(css.includes('body.desktop-windowed-ui .combat-panel { overflow: visible; }'),
  'desktop identity panel must remain visible outside the combat panel padding box');
assert.ok(css.includes('.player-exp-percent') && css.includes('.player-exp-values { display: none; }'), 'experience percent must sit above the art while exact values remain hover-only');
assert.ok(css.includes('.combat-effect-icon') && css.includes('.combat-effect-strip:empty'), 'active effects must render as collapsible icon strips');
assert.ok(css.includes('border: 1px solid var(--effect-color') && css.includes('filter: brightness(1.22)'),
  'effect icons must keep a bright framed treatment at small sizes');
assert.ok(css.includes("status-effects-atlas-v1.png") && fs.existsSync('assets/ui/status-effects-atlas-v1.png'), 'active effects must use the generated raster icon atlas');
const effectAtlasSize = readPngSize('assets/ui/status-effects-atlas-v1.png');
assert.strictEqual(effectAtlasSize[0], effectAtlasSize[1], 'effect atlas must remain square');
assert.strictEqual(effectAtlasSize[0] % 7, 0, 'effect atlas must retain seven equal sprite columns and rows');
assert.strictEqual(readPngColorType('assets/ui/status-effects-atlas-v1.png'), 6, 'effect atlas must retain RGBA transparency');
assert.ok(css.includes('background-size: 700% 700%'), 'effect art must expose exactly one cell from the 7x7 atlas');
assert.ok(/\.player-health-frame \.player-combat-effect-strip \.combat-effect-icon \{[\s\S]*?min-width: 0;/.test(css),
  'dense player effects must shrink inside the framed strip instead of overflowing on mobile');
assert.ok(css.includes('.enemy-card.enemy-boss .enemy-traits'), 'boss traits must occupy the lower frame panel');
assert.ok(css.includes('--health-frame-width: 520px') && css.includes('.enemy-card.enemy-boss .enemy-hud-meta'),
  'boss health, traits, and effects must use the compact integrated frame');
['mob', 'elite', 'boss'].forEach(tier => assert.ok(css.includes(`.enemy-card.enemy-${tier} .enemy-hud-meta`),
  `${tier} traits and effects must have their own health-frame position`));
assert.ok(css.includes('-webkit-line-clamp: 2'), 'the boss trait panel must use both available text rows');
assert.ok(css.includes('.enemy-card.enemy-elite .enemy-traits') && css.includes('background: rgba(15, 10, 12, .55)'), 'elite traits must use a content-sized translucent panel');
assert.ok(/#enemy-area \.enemy-ailments \{[\s\S]*?border: 0;[\s\S]*?background: transparent;/.test(css), 'enemy effects must no longer use a text box');
assert.ok(css.includes('.enemy-card.enemy-boss .health-skin-track { min-height: 0; }'), 'the mobile boss gauge must not expand over its frame');
assert.ok(css.includes('--health-track-left:'), 'baked health colors must be covered by a live clipped track');
assert.ok(/\.enemy-card\.targeted \.hp-bar-bg \{[\s\S]*?z-index: 2;/.test(css), 'the live enemy gauge layer must render above the frame artwork');
assert.ok(css.includes('@media (max-width: 1080px)'), 'the integrated player frame must retain a mobile layout');
assert.ok(css.includes('.enemy-card.targeted.enemy-mob { margin-top: 34px; }'), 'normal enemy names must clear the progress row');
assert.ok(css.includes('.enemy-card.targeted.enemy-elite { margin-top: 32px; }'), 'elite enemy names must use their own frame-aware spacing');
assert.ok(css.includes('.enemy-card.targeted.enemy-boss { margin-top: 30px; }'), 'boss enemy names must use their own frame-aware spacing');
assert.ok(windowManager.includes("art.src = RAIL_ART_SRC"), 'the menu rail must be connected as a real image');
assert.ok(windowManager.includes('RAIL_TAB_SLOTS'), 'the menu artwork must expose one flat set of direct tab sockets');
assert.ok(!windowManager.includes('RAIL_CATEGORY_SLOTS'), 'the menu must not retain upper-category sockets');
assert.ok(menuCss.includes('.ui-rail-art'), 'the real menu image must be sized by its own element');
assert.ok(menuCss.includes('.ui-rail-tab-layer'), 'all illustrated circles must belong to one direct tab layer');
assert.ok(menuCss.includes('.ui-rail-external-controls'), 'misc and window cleanup controls must live outside the artwork');
assert.ok(menuCss.includes('--menu-rail-width:'), 'the menu image size must stay adjustable from one CSS variable');
assert.ok(menuCss.includes('29.2svh'), 'short desktop viewports must shrink the complete menu rail');
assert.ok(menuCss.includes('width: var(--menu-rail-width)'), 'the menu image frame must consume the adjustable width');
assert.ok(!menuCss.includes("url('../assets/ui/menu-rail-v1.png')"), 'the menu image must not be painted as a CSS background');
assert.ok(!menuCss.includes('background-repeat'), 'the menu art must not be tiled or copied');

console.log('smoke-ui-asset-skins passed');
