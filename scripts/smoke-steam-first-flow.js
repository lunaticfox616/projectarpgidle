const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();

const recommendedId = vm.runInContext(`getRecommendedHuntingZone([
  { id: 1, name: '첫 지역', type: 'act' },
  { id: 2, name: '혼돈', type: 'abyss' },
  { id: 3, name: '다음 지역', type: 'act' }
]).id`, runtime);
assert.strictEqual(recommendedId, 3, 'the route summary must recommend the furthest available hunting zone');

const sameRoute = vm.runInContext("buildMapRouteSummaryHtml({id:3,name:'현재'}, {id:3,name:'현재'})", runtime);
assert(sameRoute.includes("switchTab('tab-battle')"), 'the current recommendation must return directly to battle');
assert(sameRoute.includes('전투로 돌아가기'), 'the current recommendation needs an explicit battle action');

const nextRoute = vm.runInContext("buildMapRouteSummaryHtml({id:1,name:'현재'}, {id:3,name:'<다음>'})", runtime);
assert(nextRoute.includes('changeZone(3)'), 'a later recommendation must select that zone');
assert(nextRoute.includes('&lt;다음&gt;'), 'zone names in the route summary must be escaped');

const powerEstimate = vm.runInContext('buildMapPowerEstimateHtml(getZone(1))', runtime);
assert(powerEstimate.includes('tabindex="0"'), 'map power details must be keyboard focusable');
assert(powerEstimate.includes('onfocus="showMapPowerEstimateTooltip(event)"'), 'keyboard focus must reveal map power details');
assert(powerEstimate.includes('ontouchstart="event.stopPropagation(); showMapPowerEstimateTooltip(event)"'), 'touch must reveal map power details before a parent map action');
assert(powerEstimate.includes('onclick="event.stopPropagation(); this.focus(); showMapPowerEstimateTooltip(event)"'), 'touch must pin details without entering the map');

const workspace = { dataset: {} };
const buttons = Object.fromEntries(['inventory', 'loadout'].map(key => [key, {
  active: false,
  attrs: {},
  classList: { toggle(name, value) { if (name === 'active') this.owner.active = value; }, owner: null },
  setAttribute(name, value) { this.attrs[name] = value; },
}]));
Object.values(buttons).forEach(button => { button.classList.owner = button; });
runtime.document.querySelector = selector => selector === '#item-tab-equip .equipment-workspace' ? workspace : null;
runtime.document.getElementById = id => buttons[id.replace('btn-equipment-mobile-', '')] || null;
vm.runInContext("game.settings.equipmentMobilePane='invalid'; syncEquipmentMobilePane();", runtime);
assert.strictEqual(workspace.dataset.mobilePane, 'inventory', 'invalid or legacy mobile equipment state must fall back to inventory');
assert.strictEqual(buttons.inventory.attrs['aria-pressed'], 'true', 'the visible equipment pane must expose its selected state');
assert.strictEqual(buttons.loadout.attrs['aria-pressed'], 'false', 'the hidden equipment pane must expose its unselected state');

const pipCanvas = { getContext: () => ({}) };
const pipHost = { style: { display: 'none' }, querySelector: () => pipCanvas };
const battleTab = { classList: { contains: () => false } };
const loadingOverlay = { classList: { contains: () => false } };
const startupOverlay = { classList: { toggle() {} }, scrollTop: 0 };
const battlefield = { width: 960, height: 540, dataset: {} };
runtime.document.getElementById = id => ({
  'mobile-battle-pip': pipHost,
  'tab-battle': battleTab,
  'loading-overlay': loadingOverlay,
  'startup-overlay': startupOverlay,
  'battlefield-canvas': battlefield,
}[id] || null);
vm.runInContext('setStartupOverlayActive(false)', runtime);
runtime.ontouchstart = () => {};
runtime.matchMedia = () => ({ matches: false });
vm.runInContext('updateMobileBattlePipVisibility()', runtime);
assert.strictEqual(pipHost.style.display, 'none', 'wide touch screens must not receive the mobile-only dock');
runtime.matchMedia = () => ({ matches: true });
vm.runInContext('updateMobileBattlePipVisibility()', runtime);
assert.strictEqual(pipHost.style.display, 'grid', 'the dock must remain available inside the mobile breakpoint');

console.log('smoke-steam-first-flow passed');
