const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');

function countHtmlId(id) {
  return (html.match(new RegExp(`id="${id}"`, 'g')) || []).length;
}

const shellStart = html.indexOf('<div class="player-hud-shell">');
const infoStart = html.indexOf('<div class="player-hud-info-box"', shellStart);
const frameStart = html.indexOf('<div class="player-health-frame">', shellStart);
const oxygenStart = html.indexOf('id="ui-ocean-oxygen-box"', shellStart);
assert(shellStart >= 0 && infoStart > shellStart, 'the player HUD must have a boxed information section');
assert(frameStart > infoStart && oxygenStart > frameStart, 'the information box and health frame must share one HUD shell');
assert(html.includes('class="player-health-frame-art" src="assets/ui/health-player-v1.png" width="512" height="84"'), 'the player frame must be a real image with stable dimensions');

[
  'ui-player-name-label', 'ui-player-class-label', 'ui-exp-level-label',
  'ui-exp', 'ui-maxexp', 'ui-exp-note', 'ui-player-ailments-under',
  'ui-hp-bar', 'ui-es-track', 'ui-es-bar', 'ui-es-inline', 'ui-exp-bar',
  'ui-combat-flasks', 'ui-player-ailments-mobile'
].forEach(id => assert.strictEqual(countHtmlId(id), 1, `${id} must have exactly one DOM owner`));

assert(html.indexOf('id="ui-player-ailments-under"', infoStart) < frameStart, 'desktop effects must live inside the information box');
const hpTrackStart = html.indexOf('class="hp-bar-bg combat-hp-bar"', frameStart);
const expTrackStart = html.indexOf('class="hp-bar-bg combat-exp-bar"', frameStart);
const esTrackStart = html.indexOf('id="ui-es-track"', hpTrackStart);
const esBarStart = html.indexOf('id="ui-es-bar"', hpTrackStart);
assert(hpTrackStart >= 0 && expTrackStart > hpTrackStart, 'the player frame must retain health and experience tracks');
assert(esTrackStart > hpTrackStart && esTrackStart < expTrackStart, 'energy shield must overlay the health track instead of occupying a separate segment');
assert(esBarStart > esTrackStart && esBarStart < expTrackStart, 'the shared health track must retain a live energy-shield fill');
assert(!html.includes('combat-es-bar'), 'the old separate energy-shield segment must be removed');

const identityStart = uiSource.indexOf('function getUiPlayerHudIdentity()');
const identityEnd = uiSource.indexOf('const BACKGROUND_PROGRESS_MIN_REAL_MS', identityStart);
assert(identityStart >= 0 && identityEnd > identityStart, 'player identity calculation must have a testable boundary');
const identityContext = {
  game: { selectedHeroId: 'hero2', ascendClass: null },
  CLASS_TEMPLATES: { warrior: { name: '워리어' } },
  getHeroSelectionDef(heroId) {
    return heroId === 'hero2' ? { label: '전사' } : null;
  }
};
vm.createContext(identityContext);
vm.runInContext(uiSource.slice(identityStart, identityEnd), identityContext, { filename: 'player-hud-identity.js' });
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(identityContext.getUiPlayerHudIdentity())),
  { name: '전사', className: '미전직' },
  'an unascended hero must keep its hero name and an explicit class state'
);
identityContext.game.ascendClass = 'warrior';
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(identityContext.getUiPlayerHudIdentity())),
  { name: '전사', className: '워리어' },
  'ascension must update the class without replacing the hero name'
);
identityContext.game.selectedHeroId = 'missing';
assert.strictEqual(identityContext.getUiPlayerHudIdentity().name, '플레이어', 'missing hero data must use the visible fallback name');

const flaskStart = uiSource.indexOf('function renderCombatFlaskHud()');
const flaskEnd = uiSource.indexOf('function updateCombatUI(', flaskStart);
assert(flaskStart >= 0 && flaskEnd > flaskStart, 'combat flask rendering must have a testable boundary');
const flaskHost = { dataset: {}, innerHTML: '' };
const flaskContext = {
  Date,
  document: { getElementById(id) { return id === 'ui-combat-flasks' ? flaskHost : null; } },
  utilitySlotCount: 4,
  flaskState: {
    healTier: 1,
    healCharges: 3,
    healOverTimeUntil: 0,
    utils: [
      { key: 'u1', charges: 1, until: 0 },
      { key: 'u2', charges: 2, until: 0 },
      { key: 'u3', charges: 3, until: 0 },
      { key: 'u4', charges: 4, until: 0 }
    ]
  },
  ensureFlaskState() {
    return flaskContext.flaskState;
  },
  getFlaskHealDef() { return { key: 'heal', name: '생명력 플라스크', maxCharges: 5 }; },
  getMaxFlaskUtilitySlotCount() { return flaskContext.utilitySlotCount; },
  FLASK_UTILITY_POOL: {
    u1: { key: 'u1', name: '유틸리티 1', maxCharges: 5 },
    u2: { key: 'u2', name: '유틸리티 2', maxCharges: 5 },
    u3: { key: 'u3', name: '유틸리티 3', maxCharges: 5 },
    u4: { key: 'u4', name: '유틸리티 4', maxCharges: 5 }
  },
  escapeHTML(value) { return String(value); }
};
vm.createContext(flaskContext);
vm.runInContext(uiSource.slice(flaskStart, flaskEnd), flaskContext, { filename: 'player-hud-flasks.js' });
flaskContext.renderCombatFlaskHud();
assert.strictEqual((flaskHost.innerHTML.match(/combat-flask-mini/g) || []).length, 4, 'three art sockets plus one overflow control must represent five flasks without leaving the frame');
assert(flaskHost.innerHTML.includes('class="combat-flask-mini overflow"'), 'extra flasks must share a compact control inside the third orb');
assert(flaskHost.innerHTML.includes('유틸리티 4 · 4/5회'), 'the overflow tooltip must preserve the fifth flask charge information');

flaskContext.flaskState = { healTier: 1, healCharges: 3, healOverTimeUntil: 0, utils: [] };
flaskContext.utilitySlotCount = 2;
flaskHost.dataset = {};
flaskHost.innerHTML = '';
flaskContext.renderCombatFlaskHud();
assert.strictEqual((flaskHost.innerHTML.match(/<button/g) || []).length, 1, 'only the health flask may be interactive before utility flasks are equipped');
assert.strictEqual((flaskHost.innerHTML.match(/combat-flask-mini empty/g) || []).length, 2, 'unequipped green and blue art sockets must be visibly masked as empty');
assert(!flaskHost.innerHTML.includes('class="combat-flask-mini utility'), 'an empty utility slot must not look like an equipped potion');

flaskContext.flaskState = {
  healTier: 1,
  healCharges: 3,
  healOverTimeUntil: 0,
  utils: [{ key: 'u1', charges: 1, until: 0 }]
};
flaskHost.dataset = {};
flaskContext.renderCombatFlaskHud();
assert.strictEqual((flaskHost.innerHTML.match(/<button/g) || []).length, 2, 'equipping one utility flask must reveal only one utility art socket');
assert.strictEqual((flaskHost.innerHTML.match(/combat-flask-mini empty/g) || []).length, 1, 'the remaining utility art socket must stay empty');

const gaugeStyle = {
  width: '',
  values: {},
  setProperty(name, value) { this.values[name] = value; }
};
flaskContext.setUiImageGaugePercent({ style: gaugeStyle }, 42.5);
assert.strictEqual(gaugeStyle.width, '100%', 'image gauges must preserve the source texture width');
assert.strictEqual(gaugeStyle.values['--gauge-fill'], '42.5%', 'image gauges must clip the source texture to the live percentage');
flaskContext.setUiImageGaugePercent({ style: gaugeStyle }, -1);
assert.strictEqual(gaugeStyle.values['--gauge-fill'], '0%', 'image gauges must clamp underflow');
flaskContext.setUiImageGaugePercent({ style: gaugeStyle }, 101);
assert.strictEqual(gaugeStyle.values['--gauge-fill'], '100%', 'image gauges must clamp overflow');

console.log('smoke-player-hud-structure passed');
