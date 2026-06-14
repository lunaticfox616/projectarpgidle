const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const index = fs.readFileSync('index.html', 'utf8');
const canvasSource = fs.readFileSync('js/canvas-passive-tree.js', 'utf8');

['css/components.css', 'js/utils.js', 'js/items.js', 'js/canvas-passive-tree.js'].forEach(asset => {
  assert(index.includes(`${asset}?v=20260614-runtime-fixes1`), `${asset} cache buster must include the runtime fixes version`);
});
['css/layout.css', 'data/items.js', 'js/skills.js', 'js/passives.js', 'js/combat.js', 'js/canvas-battlefield.js', 'js/ui.js'].forEach(asset => {
  assert(index.includes(`${asset}?v=20260614-cosmos-es1`), `${asset} cache buster must include the cosmos/es version`);
});
assert(index.includes('js/state.js?v=20260614-deep-chaos-map1'), 'js/state.js cache buster must include the deep-chaos map version');
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
