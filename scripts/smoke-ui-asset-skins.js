const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function readPngSize(file) {
  const bytes = fs.readFileSync(file);
  assert.strictEqual(bytes.subarray(1, 4).toString('ascii'), 'PNG', `${file} must be a PNG`);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

function readPngColorType(file) {
  return fs.readFileSync(file).readUInt8(25);
}

function readFunctionSource(sourceText, name) {
  const start = sourceText.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} must exist`);
  let depth = 0;
  for (let index = sourceText.indexOf('{', start); index < sourceText.length; index++) {
    if (sourceText[index] === '{') depth++;
    if (sourceText[index] !== '}') continue;
    depth--;
    if (depth === 0) return sourceText.slice(start, index + 1);
  }
  throw new Error(`${name} must have a closing brace`);
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
  ['assets/ui/menu-tab-default-v1.png', [384, 384]],
  ['assets/ui/menu-tab-hover-v1.png', [384, 384]],
  ['assets/ui/menu-tab-active-v1.png', [384, 384]],
  ['assets/ui/menu-tab-pressed-v1.png', [384, 384]],
  ['assets/ui/menu-tab-disabled-v1.png', [384, 384]],
  ['assets/ui/reliquary/progress-frame-v3.png', [2172, 724]],
  ['assets/ui/reliquary/health-player-five-v3.png', [2172, 724]],
  ['assets/ui/reliquary/combat-hud-frame-v1.png', [2166, 304]],
  ['assets/ui/reliquary/combat-hud-mobile-v1.png', [2187, 441]],
]);

for (const [file, expectedSize] of expectedSkins) {
  assert.ok(fs.existsSync(file), `${file} must exist`);
  assert.deepStrictEqual(readPngSize(file), expectedSize, `${file} must keep its source dimensions`);
}
['assets/ui/reliquary/progress-frame-v3.png', 'assets/ui/reliquary/health-player-five-v3.png', 'assets/ui/reliquary/combat-hud-frame-v1.png', 'assets/ui/reliquary/combat-hud-mobile-v1.png'].forEach(file => {
  assert.strictEqual(readPngColorType(file), 6, `${file} must keep real RGBA transparency`);
});

const html = fs.readFileSync('index.html', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');
const items = fs.readFileSync('data/items.js', 'utf8');
const css = fs.readFileSync('css/ui-asset-skins.css', 'utf8');
const menuCss = fs.readFileSync('css/ui-menu-sockets.css', 'utf8');
const polishCss = fs.readFileSync('css/ui-polish.css', 'utf8');
const reliquaryCss = fs.readFileSync('css/ui-reliquary-shell.css', 'utf8');
const windowManager = fs.readFileSync('js/ui-window-manager.js', 'utf8');

assert.ok(html.includes('css/ui-asset-skins.css?v=20260722-merged-tabs-timers1'), 'asset skin CSS must be cache-versioned');
assert.ok(html.includes('20260811-mobile-status-fix2'), 'combat HUD CSS changes must invalidate deployed browser caches');
assert.ok(html.includes('css/ui-menu-sockets.css?v=20260723-menu-button-states2'), 'menu socket CSS must be cache-versioned');
assert.ok(html.includes('css/ui-polish.css?v=20260723-currency-icons1'), 'currency card CSS must be cache-versioned');
assert.ok(html.includes('data/items.js?v=20260723-currency-salvage1'), 'currency item data must be cache-versioned');
assert.ok(html.includes('js/ui.js?v=20260723-merged-tab-window-fix2'), 'combat HUD JavaScript must be cache-versioned');
assert.ok(html.includes('js/combat.js?v=20260806-loot-tiers1'), 'combat effect state fixes must be cache-versioned');
assert.ok(html.includes('js/ui-window-manager.js?v=20260723-merged-tab-window-fix2'), 'menu socket JavaScript must be cache-versioned');
assert.ok(html.indexOf('css/ui-asset-skins.css') > html.indexOf('typography-readability.css'), 'asset skins must load after legacy UI rules');
assert.ok(reliquaryCss.includes("url('../assets/ui/reliquary/combat-hud-frame-v1.png')"), 'the lower HUD must use one continuous generated frame');
assert.ok(reliquaryCss.includes("url('../assets/ui/reliquary/combat-hud-mobile-v1.png')"),
  'mobile vitals must use a compact asset instead of shrinking the desktop utility wings');
assert.ok(!html.includes('player-health-frame-art'), 'the lower HUD must not retain a hidden legacy frame element');
assert.ok(reliquaryCss.includes("url('../assets/ui/reliquary/progress-frame-v3.png')"), 'the area progress gauge must share the combat HUD pixel-art family');
assert.ok(!reliquaryCss.includes('health-player-mobile-v1.svg'), 'mobile and desktop HUDs must not drift into separate art styles');
assert.ok(fs.existsSync('assets/ui/reliquary/menu-icons-v1.svg'), 'the desktop rail must use a dedicated game icon atlas');
assert.ok(reliquaryCss.includes("background-image: url('../assets/ui/reliquary/menu-icons-v1.svg')"), 'rail buttons must consume the shared icon atlas');
assert.ok(reliquaryCss.includes('background-size: 100% 1800%'), 'the rail atlas must expose exactly one of its eighteen icon cells');
assert.ok(html.indexOf('player-health-frame') < html.indexOf('id="ui-hp-bar"'), 'the live player HP bar must remain inside its art frame');
const hpTrackStart = html.indexOf('class="hp-bar-bg combat-hp-bar"');
const expTrackStart = html.indexOf('class="hp-bar-bg combat-exp-bar"', hpTrackStart);
const esTrackStart = html.indexOf('id="ui-es-track"', hpTrackStart);
assert.ok(hpTrackStart >= 0 && esTrackStart > hpTrackStart && esTrackStart < expTrackStart, 'energy shield must overlay the shared health track');
assert.ok(!html.includes('combat-es-bar'), 'energy shield must not reserve a separate horizontal segment');
assert.ok(ui.includes('<div class="health-skin-track">'), 'enemy fills must be clipped separately from their art');
assert.ok(ui.includes("? 'boss' : (focusedEnemy.isElite ? 'elite' : 'mob')"), 'boss, elite, and normal enemies must select distinct art tiers');
assert.ok(ui.includes('src="assets/ui/health-${enemyHudTier}-v1.png"'), 'enemy frames must use one real image selected by tier');
assert.ok(ui.includes('class="enemy-trait-marquee"'), 'enemy traits must have one clipped marquee track per tier');
assert.ok(ui.includes("let effectMarkup = '<div class=\"enemy-tags muted enemy-ailments combat-effect-strip enemy-combat-effect-strip\""),
  'enemy effects must have one DOM owner per tier');
assert.ok(ui.includes('let metaMarkup = `<div class="enemy-hud-meta">${traitMarkup}</div>`'),
  'enemy traits must remain attached to the health-frame art panel');
const enemyEffectSlot = ui.indexOf('${effectMarkup}', ui.indexOf('let metaMarkup'));
const enemyFrameSlot = ui.indexOf('<div class="enemy-health-frame">', ui.indexOf('let metaMarkup'));
assert.ok(enemyFrameSlot >= 0 && enemyEffectSlot > enemyFrameSlot,
  'enemy effect icons must use an unclipped row below the health frame');
assert.ok(ui.indexOf('${metaMarkup}', enemyFrameSlot) > enemyFrameSlot,
  'every enemy tier must render its trait panel inside its health frame');
assert.ok(/#enemy-area \.enemy-hud-meta \{[\s\S]*?flex-direction: column;[\s\S]*?gap: 2px;/.test(css),
  'enemy traits and effect icons must occupy separate stacked rows');
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
assert.ok(reliquaryCss.includes('.player-hud-flask-rack') && reliquaryCss.includes('position: static !important'),
  'equipped flasks must use their own flow-based rack instead of shifting the health track');
assert.ok(reliquaryCss.includes('background-image: linear-gradient(180deg, #b83a43 0%, #941f2b 42%, #6d0f19 100%) !important'),
  'player health must use a clean red material instead of repeating the noisy enemy texture');
assert.ok(reliquaryCss.includes('.player-hud-skill-rack') && html.includes('id="ui-combat-skill-gems"'),
  'the lower HUD must reserve a dedicated right-side rack for equipped skill gems');
assert.ok(reliquaryCss.includes('health-player-five-v3.png'),
  'desktop equipped flasks must reuse the supplied five-socket artwork');
assert.ok(!html.includes('player-hud-rack-title'),
  'the equipped-gem artwork must not repeat a title beside the icons');
assert.ok(reliquaryCss.includes('left: 1.9% !important') && reliquaryCss.includes('right: 3.1% !important'),
  'the live HP track must remain aligned with the central opening in the continuous frame');
assert.strictEqual((html.match(/<span class="combat-flask-mini/g) || []).length, 1, 'the boot HUD must expose only the always-equipped health flask before live state renders');
assert.ok(/\.player-hud-flask-rack \.combat-flask-mini \{[\s\S]*?position: relative !important;/.test(reliquaryCss),
  'flask sockets must participate in the left HUD layout instead of using painted absolute coordinates');
assert.ok(/\.player-hud-flask-rack \.combat-flask-mini \{[\s\S]*?overflow: visible !important;/.test(reliquaryCss),
  'flask charge badges must not be clipped by their circular sockets');
assert.ok(reliquaryCss.includes('--flask-slot-edge') && reliquaryCss.includes('0 0 0 3px var(--flask-slot-edge)'),
  'each equipped potion must sit in a visibly separate metal socket');
assert.ok(reliquaryCss.includes('--flask-liquid')
  && /\.player-hud-flask-rack \.combat-flask-mini::before \{[\s\S]*?clip-path: polygon\(/.test(reliquaryCss)
  && /\.player-hud-flask-rack \.combat-flask-mini::after \{[\s\S]*?#c39b60[\s\S]*?rgba\(205, 222, 216, \.3\)/.test(reliquaryCss),
  'each flask socket must draw a shouldered glass bottle with liquid, reflection, and a corked neck');
const skinSourceStart = ui.indexOf('const UI_SKIN_IDS =');
const skinSourceEnd = ui.indexOf('function getHeroSelectionDef(', skinSourceStart);
const skinContext = { document: { body: { dataset: {} } } };
vm.createContext(skinContext);
vm.runInContext(ui.slice(skinSourceStart, skinSourceEnd), skinContext, { filename: 'ui-skins.js' });
assert.strictEqual(skinContext.normalizeUiSkin('verdigris'), 'verdigris', 'a supported skin must survive normalization');
assert.strictEqual(skinContext.normalizeUiSkin('missing'), 'reliquary', 'an unknown saved skin must fall back safely');
skinContext.applyUiSkin('crimson');
assert.strictEqual(skinContext.document.body.dataset.uiSkin, 'crimson', 'skin selection must update one body-level theme boundary');
assert.ok(reliquaryCss.includes('.player-hud-left-wing .player-hud-identity-row') && reliquaryCss.includes('position: static !important'),
  'desktop identity text must occupy the dedicated lower-left wing beside health');
assert.ok(css.includes('body.desktop-windowed-ui .combat-panel { overflow: visible; }'),
  'desktop identity panel must remain visible outside the combat panel padding box');
assert.ok(css.includes('.player-exp-percent') && css.includes('.player-exp-values { display: none; }'), 'experience percent must sit above the art while exact values remain hover-only');
assert.ok(css.includes('.combat-effect-icon') && css.includes('.combat-effect-strip:empty'), 'active effects must render as collapsible icon strips');
assert.ok(css.includes('border: 1px solid var(--effect-color') && css.includes('filter: brightness(1.55)'),
  'effect icons must keep a bright framed treatment at small sizes');
assert.ok(css.includes("status-effects-atlas-v1.png") && fs.existsSync('assets/ui/status-effects-atlas-v1.png'), 'active effects must use the generated raster icon atlas');
const effectAtlasSize = readPngSize('assets/ui/status-effects-atlas-v1.png');
assert.strictEqual(effectAtlasSize[0], effectAtlasSize[1], 'effect atlas must remain square');
assert.strictEqual(effectAtlasSize[0] % 7, 0, 'effect atlas must retain seven equal sprite columns and rows');
assert.strictEqual(readPngColorType('assets/ui/status-effects-atlas-v1.png'), 6, 'effect atlas must retain RGBA transparency');
assert.ok(css.includes('background-size: 700% 700%'), 'effect art must expose exactly one cell from the 7x7 atlas');
assert.ok(/\.combat-effect-art \{[\s\S]*?overflow: hidden;/.test(css)
  && /\.combat-effect-art::before \{[\s\S]*?inset: 1px;[\s\S]*?background-repeat: no-repeat;[\s\S]*?clip-path: inset\(0 0 5\.5% 0\);/.test(css),
  'effect art must isolate one atlas cell and clip the neighboring row pixels baked into its lower edge');
assert.ok(css.includes('.effect-lifeLeech .combat-effect-art::before')
  && css.includes('.effect-gladiatorFlurry .combat-effect-art::before') && css.includes('transform: scale(.94);'),
  'the leech and flurry artwork must receive their per-icon framing correction');
assert.ok(/\.player-health-frame \.player-combat-effect-strip \{[\s\S]*?bottom: calc\(100% \+ 4px\);[\s\S]*?flex-wrap: wrap-reverse;/.test(css),
  'player effects must occupy a wrapped shelf above the health frame instead of covering its gauge');
assert.ok(/\.player-health-frame \.player-combat-effect-strip \.combat-effect-icon \{[\s\S]*?min-width: 32px;/.test(css),
  'player effects must remain recognizable instead of shrinking below their icon art');
assert.ok(/\.player-health-frame \.player-combat-effect-strip \{[\s\S]*?width: max-content;[\s\S]*?border: 0;[\s\S]*?background: transparent;[\s\S]*?box-shadow: none;/.test(css),
  'player effects must not reserve an opaque strip over the battlefield');
assert.ok(/\.player-combat-effect-strip \.combat-effect-icon \{[\s\S]*?flex: 0 0 clamp\(24px, 5\.8vw, 28px\);[\s\S]*?aspect-ratio: 1;/.test(css),
  'mobile player effects must remain square so atlas rows cannot bleed together');
assert.ok(css.includes('.enemy-card.enemy-boss .enemy-traits'), 'boss traits must occupy the lower frame panel');
assert.ok(css.includes('--health-frame-width: 520px') && css.includes('.enemy-card.enemy-boss .enemy-hud-meta'),
  'boss health and traits must use the compact integrated frame');
assert.ok(/\.enemy-card\.enemy-boss \.enemy-traits \{[\s\S]*?position: absolute;[\s\S]*?top: 41%;[\s\S]*?left: 34%;[\s\S]*?width: 32%;[\s\S]*?height: 17%;/.test(css),
  'boss traits must stay centered within the supplied pink trait panel');
assert.ok(/body\.mobile-battle-tab #tab-battle \.enemy-card\.enemy-boss \.enemy-traits \{[\s\S]*?display: flex;[\s\S]*?align-items: center;[\s\S]*?height: 17%;/.test(css),
  'mobile boss traits must keep the frame-panel centering contract');
assert.ok(css.includes('@keyframes boss-trait-marquee') && css.includes('animation-play-state: paused')
  && css.includes('mask-image: linear-gradient') && css.includes('translate3d(-50%, 0, 0)')
  && css.includes('.enemy-trait-marquee-copy'),
  'overflowing boss traits must use a filled, faded, pausable transform ticker');
assert.ok(ui.includes('onmouseenter="showEnemyTraitTooltip(event)"') && !ui.includes('traitEl.title ='),
  'boss trait hover must use the shared custom tooltip without a native title fallback');
['mob', 'elite', 'boss'].forEach(tier => assert.ok(css.includes(`.enemy-card.enemy-${tier} .enemy-hud-meta`),
  `${tier} traits must have their own health-frame position`));
assert.ok(css.includes('.enemy-card.enemy-elite .enemy-traits') && css.includes('background: rgba(15, 10, 12, .55)'), 'elite traits must use a content-sized translucent panel');
assert.ok(/#enemy-area \.enemy-ailments \{[\s\S]*?border: 0;[\s\S]*?background: transparent;/.test(css), 'enemy effects must no longer use a text box');
assert.ok(/#enemy-area \.enemy-card\.targeted > \.enemy-combat-effect-strip \{[\s\S]*?overflow: visible;[\s\S]*?background: rgba\(7, 9, 13, \.9\);/.test(css),
  'enemy effect icons must remain visible on their own unclipped shelf');
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
[
  'menu-tab-default-v1.png', 'menu-tab-hover-v1.png', 'menu-tab-active-v1.png',
  'menu-tab-pressed-v1.png', 'menu-tab-disabled-v1.png'
].forEach(file => assert.ok(menuCss.includes(file), `${file} must skin one menu button state`));
assert.ok(menuCss.includes(':hover:not(:disabled):not([aria-disabled="true"])'), 'enabled menu tabs must show a supplied hover state');
assert.ok(menuCss.includes(':active:not(:disabled):not([aria-disabled="true"])'), 'enabled menu tabs must show a supplied pressed state');
assert.ok(menuCss.includes('.tab-btn:disabled'), 'locked menu tabs must show a supplied disabled state');
assert.ok(menuCss.includes('[aria-pressed="true"]'), 'opened desktop menu tabs must keep the supplied active frame');

const expectedCurrencyIcons = new Map([
  ['magicBud', 'magic-bud.png'], ['sapBud', 'sap-bud.png'], ['formlessDew', 'formless-dew.png'],
  ['goldenRule', 'golden-rule.png'], ['emberBranch', 'ember-branch.png'], ['ouroboros', 'ouroboros.png'],
  ['blightSpore', 'blight-spore.png'], ['pruningShears', 'pruning-shears.png'], ['fairyRing', 'fairy-ring.png'],
  ['blessing', 'blessing-petal.png']
]);
for (const [currencyKey, filename] of expectedCurrencyIcons) {
  const file = `assets/ui/currency/${filename}`;
  assert.ok(fs.existsSync(file), `${currencyKey} currency art must exist`);
  assert.deepStrictEqual(readPngSize(file), [64, 64], `${currencyKey} currency art must preserve its square source size`);
  assert.ok(items.includes(`${currencyKey}: 'assets/ui/currency/${filename}'`), `${currencyKey} must use its renamed currency art`);
}
assert.ok(items.includes('if (ORB_DB[key]) ORB_DB[key].icon = icon;'), 'the canonical orb database must own currency icon assignments');
assert.ok(ui.includes('function getCurrencyIconHtml('), 'currency cards must render icons through one shared helper');
assert.ok(ui.includes('currency-card-name-wrap') && ui.includes('currency-tooltip-icon'), 'currency cards and their tooltips must both render icon art');
assert.ok(polishCss.includes('.currency-icon') && polishCss.includes('.currency-tooltip-icon'), 'currency icon sizing must be owned by the UI polish stylesheet');

const currencyIconContext = { ORB_DB: { magicBud: { icon: 'assets/ui/currency/magic-bud.png' }, fossil: {} } };
vm.createContext(currencyIconContext);
vm.runInContext(`${readFunctionSource(ui, 'getCurrencyIconHtml')}; this.getCurrencyIconHtml = getCurrencyIconHtml;`, currencyIconContext);
assert.strictEqual(
  currencyIconContext.getCurrencyIconHtml('magicBud'),
  '<img class="currency-icon" src="assets/ui/currency/magic-bud.png" alt="" aria-hidden="true">',
  'currency card helper must render the canonical item art'
);
assert.strictEqual(currencyIconContext.getCurrencyIconHtml('fossil'), '', 'currencies without artwork must retain a text-only fallback');

console.log('smoke-ui-asset-skins passed');
