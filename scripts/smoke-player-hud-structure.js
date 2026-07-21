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
assert(html.indexOf('id="ui-hp-bar"', frameStart) < html.indexOf('id="ui-es-track"', frameStart), 'HP and energy shield must use separate tracks');
assert(html.indexOf('id="ui-es-bar"', frameStart) < html.indexOf('id="ui-exp-bar"', frameStart), 'energy shield and experience must use separate live fills');

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
  ensureFlaskState() {
    return {
      healTier: 1,
      healCharges: 3,
      healOverTimeUntil: 0,
      utils: [
        { key: 'u1', charges: 1, until: 0 },
        { key: 'u2', charges: 2, until: 0 },
        { key: 'u3', charges: 3, until: 0 },
        { key: 'u4', charges: 4, until: 0 }
      ]
    };
  },
  getFlaskHealDef() { return { key: 'heal', name: '생명력 플라스크', maxCharges: 5 }; },
  getMaxFlaskUtilitySlotCount() { return 4; },
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
assert.strictEqual((flaskHost.innerHTML.match(/combat-flask-mini/g) || []).length, 5, 'all five available flask buttons must remain in the HUD DOM');
assert(flaskHost.innerHTML.includes('유틸리티 4'), 'the fifth flask must remain interactive instead of being discarded by the three-orb art');

console.log('smoke-player-hud-structure passed');
