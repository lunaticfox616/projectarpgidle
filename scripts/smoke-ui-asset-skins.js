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
  ['assets/ui/health-boss-v2.png', [2203, 714]],
  ['assets/ui/health-elite-v2.png', [2172, 724]],
  ['assets/ui/health-mob-v2.png', [2172, 724]],
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
[
  'assets/ui/health-boss-v2.png',
  'assets/ui/health-elite-v2.png',
  'assets/ui/health-mob-v2.png',
  'assets/ui/reliquary/progress-frame-v3.png',
  'assets/ui/reliquary/health-player-five-v3.png',
  'assets/ui/reliquary/combat-hud-frame-v1.png',
  'assets/ui/reliquary/combat-hud-mobile-v1.png',
].forEach(file => {
  assert.strictEqual(readPngColorType(file), 6, `${file} must keep real RGBA transparency`);
});

const html = fs.readFileSync('index.html', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');
const items = fs.readFileSync('data/items.js', 'utf8');
const css = fs.readFileSync('css/ui-asset-skins.css', 'utf8');
const polishCss = fs.readFileSync('css/ui-polish.css', 'utf8');
const reliquaryCss = fs.readFileSync('css/ui-reliquary-shell.css', 'utf8');

assert.ok(html.includes('css/ui-asset-skins.css?v=20260722-merged-tabs-timers1'), 'asset skin CSS must be cache-versioned');
assert.ok(html.includes('20260811-mobile-status-fix2'), 'combat HUD CSS changes must invalidate deployed browser caches');
assert.ok(/css\/ui-menu-sockets\.css\?v=[^\"]+/.test(html), 'menu socket CSS must be cache-versioned');
assert.ok(html.includes('css/ui-polish.css?v=20260723-currency-icons1'), 'currency card CSS must be cache-versioned');
assert.ok(html.includes('data/items.js?v=20260723-currency-salvage1'), 'currency item data must be cache-versioned');
assert.ok(html.includes('js/ui.js?v=20260723-merged-tab-window-fix2'), 'combat HUD JavaScript must be cache-versioned');
assert.ok(html.includes('js/combat.js?v=20260806-loot-tiers1'), 'combat effect state fixes must be cache-versioned');
assert.ok(/js\/ui-window-manager\.js\?v=[^\"]+/.test(html), 'menu socket JavaScript must be cache-versioned');
assert.ok(html.indexOf('css/ui-asset-skins.css') > html.indexOf('typography-readability.css'), 'asset skins must load after legacy UI rules');
assert.ok(reliquaryCss.includes("url('../assets/ui/reliquary/combat-hud-frame-v1.png')"), 'the lower HUD must use one continuous generated frame');
assert.ok(reliquaryCss.includes("url('../assets/ui/reliquary/combat-hud-mobile-v1.png')"),
  'mobile vitals must use a compact asset instead of shrinking the desktop utility wings');
assert.ok(!html.includes('player-health-frame-art'), 'the lower HUD must not retain a hidden legacy frame element');
assert.ok(reliquaryCss.includes("url('../assets/ui/reliquary/progress-frame-v3.png')"), 'the area progress gauge must share the combat HUD pixel-art family');
assert.ok(html.includes('class="map-progress-ticks"'), 'the area progress gauge must expose fixed ten-percent tick marks');
assert.ok(reliquaryCss.includes("url('../assets/ui/gauge-player-hp-v1.png')"), 'the progress fill must use a textured gauge material');
assert.ok(!reliquaryCss.includes('health-player-mobile-v1.svg'), 'mobile and desktop HUDs must not drift into separate art styles');
assert.ok(html.indexOf('player-health-frame') < html.indexOf('id="ui-hp-bar"'), 'the live player HP bar must remain inside its art frame');
const hpTrackStart = html.indexOf('class="hp-bar-bg combat-hp-bar"');
const expTrackStart = html.indexOf('class="hp-bar-bg combat-exp-bar"', hpTrackStart);
const esTrackStart = html.indexOf('id="ui-es-track"', hpTrackStart);
assert.ok(hpTrackStart >= 0 && esTrackStart > hpTrackStart && esTrackStart < expTrackStart, 'energy shield must overlay the shared health track');
assert.ok(!html.includes('combat-es-bar'), 'energy shield must not reserve a separate horizontal segment');
assert.ok(ui.includes('<div class="health-skin-track">'), 'enemy fills must be clipped separately from their art');
assert.ok(ui.includes("? 'boss' : (focusedEnemy.isElite ? 'elite' : 'mob')"), 'boss, elite, and normal enemies must select distinct art tiers');
assert.ok(ui.includes('src="assets/ui/health-${enemyHudTier}-v2.png"'), 'enemy frames must use the high-resolution art selected by tier');
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
[
  'gauge-player-hp-v1.png', 'gauge-player-es-v1.png', 'gauge-player-exp-v1.png',
  'gauge-mob-hp-v1.png', 'gauge-elite-hp-v1.png', 'gauge-boss-hp-v1.png'
].forEach(file => assert.ok(css.includes(file), `${file} must provide a live gauge texture`));
assert.ok(reliquaryCss.includes('health-player-five-v3.png'),
  'desktop equipped flasks must reuse the supplied five-socket artwork');
assert.ok(!html.includes('player-hud-rack-title'),
  'the equipped-gem artwork must not repeat a title beside the icons');
assert.strictEqual((html.match(/<span class="combat-flask-mini/g) || []).length, 1, 'the boot HUD must expose only the always-equipped health flask before live state renders');
const skinContext = { document: { body: { dataset: {} } } };
vm.createContext(skinContext);
vm.runInContext(readFunctionSource(fs.readFileSync('js/utils.js', 'utf8'), 'normalizeUiSkin')
    + readFunctionSource(ui, 'applyUiSkin'), skinContext, { filename: 'ui-skins.js' });
assert.strictEqual(skinContext.normalizeUiSkin('verdigris'), 'verdigris', 'a supported skin must survive normalization');
assert.strictEqual(skinContext.normalizeUiSkin('missing'), 'reliquary', 'an unknown saved skin must fall back safely');
skinContext.applyUiSkin('crimson');
assert.strictEqual(skinContext.document.body.dataset.uiSkin, 'crimson', 'skin selection must update one body-level theme boundary');
assert.ok(css.includes("status-effects-atlas-v1.png") && fs.existsSync('assets/ui/status-effects-atlas-v1.png'), 'active effects must use the generated raster icon atlas');
const effectAtlasSize = readPngSize('assets/ui/status-effects-atlas-v1.png');
assert.strictEqual(effectAtlasSize[0], effectAtlasSize[1], 'effect atlas must remain square');
assert.strictEqual(effectAtlasSize[0] % 7, 0, 'effect atlas must retain seven equal sprite columns and rows');
assert.strictEqual(readPngColorType('assets/ui/status-effects-atlas-v1.png'), 6, 'effect atlas must retain RGBA transparency');
assert.ok(css.includes('background-size: 700% 700%'), 'effect art must expose exactly one cell from the 7x7 atlas');
assert.ok(ui.includes('onmouseenter="showEnemyTraitTooltip(event)"') && !ui.includes('traitEl.title ='),
  'boss trait hover must use the shared custom tooltip without a native title fallback');
['mob', 'elite', 'boss'].forEach(tier => assert.ok(css.includes(`.enemy-card.enemy-${tier} .enemy-hud-meta`),
  `${tier} traits must have their own health-frame position`));
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
