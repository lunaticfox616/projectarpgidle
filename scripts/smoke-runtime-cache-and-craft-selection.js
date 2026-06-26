const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const index = fs.readFileSync('index.html', 'utf8');
const canvasSource = fs.readFileSync('js/canvas-passive-tree.js', 'utf8');

const expectedCacheBusters = {
  'css/components.css': '20260626-void-cache1',
  'js/utils.js': '20260623-flatele1',
  'js/items.js': '20260623-base-chain4',
  'js/canvas-passive-tree.js': '20260618-codex-autoreg1',
  'css/layout.css': '20260626-void-cache1',
  'css/ui-polish.css': '20260625-premium-tabs1',
  'css/ui-premium.css': '20260621-vertical-tabs1',
  'data/items.js': '20260624-cosmoscodex1',
  'js/skills.js': '20260623-shieldfossil2',
  'js/passives.js': '20260626-void-cache1',
  'js/combat.js': '20260626-void-cache1',
  'js/canvas-battlefield.js': '20260625-attackfx2',
  'js/ui.js': '20260626-void-cache1',
  'js/state.js': '20260626-void-cache1'
};
Object.entries(expectedCacheBusters).forEach(([asset, version]) => {
  assert(index.includes(`${asset}?v=${version}`), `${asset} cache buster must include ${version}`);
});
assert(canvasSource.includes('function isCraftSelectionEquipAvailableLocal()'), 'canvas paperdoll must guard missing craft-selection equip helper');
assert(canvasSource.includes('function getCraftSelectionRefLocal()'), 'canvas paperdoll must guard missing craft-selection ref helper');

const target = { innerHTML: '' };
const sandbox = {
  console,
  window: {},
  game: { equipment: {} },
  document: { getElementById(id) { return id === 'paper' ? target : null; } },
  getEquipSearchQueryLocal() { return ''; },
  highlightEquipTextLocal(text) { return String(text || ''); },
  formatValue(_id, value) { return String(value); },
  getStatName(id) { return id; }
};
vm.createContext(sandbox);
vm.runInContext(canvasSource, sandbox, { filename: 'js/canvas-passive-tree.js' });
assert.doesNotThrow(() => sandbox.renderPaperdoll('paper', true), 'renderPaperdoll must not throw when craft-selection helpers are unavailable');
assert(target.innerHTML.includes('[무기]'), 'renderPaperdoll should still render empty equipment slots without craft-selection helpers');

console.log('runtime cache and craft selection smoke checks passed');
