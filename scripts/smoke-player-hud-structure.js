const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');

function countHtmlId(id) {
  return (html.match(new RegExp(`id="${id}"`, 'g')) || []).length;
}

const shellStart = html.indexOf('<div class="player-hud-shell">');
const leftWingStart = html.indexOf('<div class="player-hud-left-wing">', shellStart);
const frameStart = html.indexOf('<div class="player-health-frame"', shellStart);
const skillRackStart = html.indexOf('<div class="player-hud-skill-rack"', frameStart);
const oxygenStart = html.indexOf('id="ui-ocean-oxygen-box"', shellStart);
assert(shellStart >= 0 && leftWingStart > shellStart && frameStart > leftWingStart && skillRackStart > frameStart && oxygenStart > skillRackStart,
  'identity, flasks, vitals, equipped gems, and oxygen must share one ordered HUD shell');
assert(!html.includes('player-hud-info-box'), 'identity and experience must not float in a separate box');
assert(html.includes('css/ui-reliquary-shell.css?v=20260819-commercial-hud6'),
  'the continuous combat HUD must invalidate the deployed stylesheet cache');
assert(!html.includes('player-health-frame-art'),
  'the continuous combat HUD must not keep a hidden legacy frame element');

[
  'ui-player-name-label', 'ui-player-class-label', 'ui-exp-level-label',
  'ui-exp', 'ui-maxexp', 'ui-exp-note', 'ui-player-ailments-under',
  'ui-hp-bar', 'ui-es-track', 'ui-es-bar', 'ui-es-inline', 'ui-exp-bar',
  'ui-combat-flasks', 'ui-combat-skill-gems'
].forEach(id => assert.strictEqual(countHtmlId(id), 1, `${id} must have exactly one DOM owner`));

const identityStartInShell = html.indexOf('class="player-hud-identity-row"', shellStart);
const hpTrackStart = html.indexOf('class="hp-bar-bg combat-hp-bar"', frameStart);
const expTrackStart = html.indexOf('class="hp-bar-bg combat-exp-bar"', frameStart);
const esTrackStart = html.indexOf('id="ui-es-track"', hpTrackStart);
const esBarStart = html.indexOf('id="ui-es-bar"', hpTrackStart);
assert(identityStartInShell > shellStart && identityStartInShell < frameStart,
  'name, class, and level must occupy the dedicated left wing beside the health frame');
assert(html.indexOf('id="ui-combat-flasks"', leftWingStart) < frameStart,
  'equipped flasks must stay in the left wing instead of being absolutely positioned over health');
assert(html.indexOf('id="ui-combat-skill-gems"', skillRackStart) < oxygenStart,
  'equipped skill gems must have a dedicated right-side rack');
assert(!html.includes('player-hud-rack-title'),
  'the right-side gem rack must use icons without a redundant title inside the artwork');
assert(html.indexOf('id="ui-player-ailments-under"', frameStart) < hpTrackStart, 'active effects must share the supplied player frame');
assert(hpTrackStart >= 0 && expTrackStart > hpTrackStart, 'the player frame must retain health and experience tracks');
assert(esTrackStart > hpTrackStart && esTrackStart < expTrackStart, 'energy shield must overlay the health track instead of occupying a separate segment');
assert(esBarStart > esTrackStart && esBarStart < expTrackStart, 'the shared health track must retain a live energy-shield fill');
assert(!html.includes('combat-es-bar'), 'the old separate energy-shield segment must be removed');
assert(html.includes('onmouseenter="showPlayerExperienceTooltip(event)"'), 'the experience track must expose its exact values on hover');
assert(!html.includes('id="ui-player-ailments-mobile"') && !html.includes('id="ui-player-ailments"'), 'legacy text status boxes must be removed');

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
const skillHost = { dataset: {}, innerHTML: '', querySelectorAll() { return []; } };
const flaskContext = {
  Date,
  game: { activeSkill: '독니 사출', equippedSummonSkills: ['서리늑대 소환', '유성낙화'] },
  SKILL_DB: {
    '독니 사출': { tags: ['projectile'] },
    '서리늑대 소환': { tags: ['summon', 'summon_attack'] },
    '유성낙화': { tags: ['spell', 'aoe'] }
  },
  document: { getElementById(id) { return id === 'ui-combat-flasks' ? flaskHost : (id === 'ui-combat-skill-gems' ? skillHost : null); } },
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
  getExpReq() { return 100; },
  FLASK_UTILITY_POOL: {
    u1: { key: 'u1', name: '유틸리티 1', maxCharges: 5, category: 'granite' },
    u2: { key: 'u2', name: '유틸리티 2', maxCharges: 5, category: 'quicksilver' },
    u3: { key: 'u3', name: '유틸리티 3', maxCharges: 5, category: 'amethyst' },
    u4: { key: 'u4', name: '유틸리티 4', maxCharges: 5, category: 'sulphur' }
  },
  escapeHTML(value) { return String(value); },
  renderSkillGemArt(name) { return `<i>${name}</i>`; }
};
vm.createContext(flaskContext);
vm.runInContext(uiSource.slice(flaskStart, flaskEnd), flaskContext, { filename: 'player-hud-flasks.js' });
flaskContext.renderCombatFlaskHud();
assert.strictEqual((flaskHost.innerHTML.match(/combat-flask-mini/g) || []).length, 5, 'the HUD must render every unlocked flask socket up to the five-slot cap');
assert(!flaskHost.innerHTML.includes('class="combat-flask-mini overflow"'), 'the fourth and fifth flasks must remain first-class sockets instead of being collapsed');
assert(flaskHost.innerHTML.includes("'util','u4'"), 'the fifth flask socket must preserve its own custom tooltip target');
assert(flaskHost.innerHTML.includes('flask-heal') && flaskHost.innerHTML.includes('flask-granite')
  && flaskHost.innerHTML.includes('flask-quicksilver') && flaskHost.innerHTML.includes('flask-amethyst')
  && flaskHost.innerHTML.includes('flask-sulphur'),
  'equipped flasks must expose their potion category for distinct liquid colors');
assert(!flaskHost.innerHTML.includes(' title='), 'combat flasks must not use browser-native title tooltips');
assert(flaskHost.innerHTML.includes('onmouseenter="showPlayerFlaskTooltip(event'),
  'every combat flask socket must use the shared custom tooltip handler');

flaskContext.flaskState = { healTier: 1, healCharges: 3, healOverTimeUntil: 0, utils: [] };
flaskContext.utilitySlotCount = 2;
flaskHost.dataset = {};
flaskHost.innerHTML = '';
flaskContext.renderCombatFlaskHud();
assert.strictEqual((flaskHost.innerHTML.match(/<button/g) || []).length, 1, 'only the health flask may be interactive before utility flasks are equipped');
assert.strictEqual((flaskHost.innerHTML.match(/combat-flask-mini empty/g) || []).length, 0, 'unequipped utility sockets must not be rendered in the combat HUD');
assert.strictEqual(flaskHost.dataset.visibleSlots, '1', 'the frame must close every socket beyond the equipped health flask');
assert(!flaskHost.innerHTML.includes('class="combat-flask-mini utility'), 'an empty utility slot must not look like an equipped potion');

const flaskTooltipStart = uiSource.indexOf('function showPlayerFlaskTooltip(');
const flaskTooltipEnd = uiSource.indexOf('const UI_ENEMY_AILMENT_DETAIL_FORMATTERS', flaskTooltipStart);
assert(flaskTooltipStart >= 0 && flaskTooltipEnd > flaskTooltipStart, 'flask custom tooltips must have a testable boundary');
const flaskTooltipContext = {
  Date,
  state: {
    healTier: 1, healCharges: 3, healOverTimeUntil: 0, healOverTimePerSec: 120,
    utils: [
      { key: 'u1', charges: 1, until: 0 }, { key: 'u2', charges: 2, until: 0 },
      { key: 'u3', charges: 3, until: 0 }, { key: 'u4', charges: 4, until: 0 }
    ]
  },
  ensureFlaskState() { return flaskTooltipContext.state; },
  getFlaskHealDef() { return { key: 'heal', name: '생명력 플라스크', maxCharges: 5, autoBelowHpPct: 40, durationMs: 4000, healPct: 20 }; },
  getMaxFlaskUtilitySlotCount() { return 4; },
  FLASK_UTILITY_POOL: {
    u1: { key: 'u1', name: '유틸리티 1', maxCharges: 5, desc: '효과 1' },
    u2: { key: 'u2', name: '유틸리티 2', maxCharges: 5, desc: '효과 2' },
    u3: { key: 'u3', name: '유틸리티 3', maxCharges: 5, desc: '효과 3' },
    u4: { key: 'u4', name: '유틸리티 4', maxCharges: 5, desc: '효과 4' }
  },
  escapeHTML(value) { return String(value); },
  showInfoTooltipHtml(x, y, html) { flaskTooltipContext.tooltip = { x, y, html }; },
  hideInfoTooltip() { flaskTooltipContext.hidden = true; }
};
vm.createContext(flaskTooltipContext);
vm.runInContext(uiSource.slice(flaskTooltipStart, flaskTooltipEnd), flaskTooltipContext, { filename: 'player-hud-flask-tooltips.js' });
flaskTooltipContext.showPlayerFlaskTooltip({ clientX: 4, clientY: 8 }, 'heal', 'heal');
assert(flaskTooltipContext.tooltip.html.includes('생명력 플라스크') && flaskTooltipContext.tooltip.html.includes('상태: 대기 중'),
  'an inactive flask socket must show its full state in the custom tooltip');
flaskTooltipContext.showCombatFlaskOverflowTooltip({ clientX: 5, clientY: 9 });
assert(flaskTooltipContext.tooltip.html.includes('유틸리티 3') && flaskTooltipContext.tooltip.html.includes('유틸리티 4'),
  'overflow flask custom tooltip must list every hidden flask and its effect');

flaskContext.flaskState = {
  healTier: 1,
  healCharges: 3,
  healOverTimeUntil: 0,
  utils: [{ key: 'u1', charges: 1, until: 0 }]
};
flaskHost.dataset = {};
flaskContext.renderCombatFlaskHud();
assert.strictEqual((flaskHost.innerHTML.match(/<button/g) || []).length, 2, 'equipping one utility flask must reveal only one utility art socket');
assert.strictEqual((flaskHost.innerHTML.match(/combat-flask-mini empty/g) || []).length, 0, 'unfilled utility slots must stay absent after equipping another flask');
assert.strictEqual(flaskHost.dataset.visibleSlots, '2', 'equipping one utility flask must reveal exactly two sockets including health');

flaskContext.renderCombatSkillHud();
assert(skillHost.innerHTML.includes('독니 사출') && skillHost.innerHTML.includes('서리늑대 소환'),
  'the combat gem rack must show the active attack and equipped summon gems');
assert(!skillHost.innerHTML.includes('유성낙화'),
  'the combat gem rack must ignore non-summon entries outside the single active attack');
assert.strictEqual((skillHost.innerHTML.match(/player-hud-skill-slot/g) || []).length, 2,
  'the combat gem rack must create one actionable slot per equipped attack gem');
assert.strictEqual((skillHost.innerHTML.match(/data-info-tooltip-anchor="1"/g) || []).length, 2,
  'combat gem slots must remain recognized by the shared tooltip lifetime manager while hovered');

const gaugeStyle = {
  width: '',
  values: {},
  setProperty(name, value) { this.values[name] = value; }
};
const gaugeParentStyle = {
  values: {},
  setProperty(name, value) { this.values[name] = value; }
};
flaskContext.setUiImageGaugePercent({ style: gaugeStyle, parentElement: { style: gaugeParentStyle } }, 42.5);
assert.strictEqual(gaugeStyle.width, '100%', 'image gauges must preserve the source texture width');
assert.strictEqual(gaugeStyle.values['--gauge-fill'], '42.5%', 'image gauges must clip the source texture to the live percentage');
assert.strictEqual(gaugeParentStyle.values['--gauge-fill'], '42.5%', 'the gauge frame must receive the live percentage for its end cap');
flaskContext.setUiImageGaugePercent({ style: gaugeStyle }, -1);
assert.strictEqual(gaugeStyle.values['--gauge-fill'], '0%', 'image gauges must clamp underflow');
flaskContext.setUiImageGaugePercent({ style: gaugeStyle }, 101);
assert.strictEqual(gaugeStyle.values['--gauge-fill'], '100%', 'image gauges must clamp overflow');

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(flaskContext.getUiExperienceProgress(7, 42.5))),
  { current: 42.5, required: 100, remaining: 57, percent: 42.5 },
  'experience presentation must derive the bar, percent, and exact remaining value from one calculation'
);
assert.strictEqual(flaskContext.getUiExperienceProgress(7, 150).percent, 100, 'experience presentation must clamp visual overflow');
const igniteIcon = flaskContext.renderCombatEffectIcon({ key: 'ignite', tooltip: 'tip()', badge: '3' });
assert(igniteIcon.includes('effect-ignite') && igniteIcon.includes('combat-effect-art'),
  'ailment icons must use the shared raster presentation');
assert(igniteIcon.includes('combat-effect-badge">3'), 'stacked effects must keep a compact count badge');
assert(igniteIcon.includes('onmouseenter="tip()"'), 'effect icons must retain custom tooltip behavior');

console.log('smoke-player-hud-structure passed');
