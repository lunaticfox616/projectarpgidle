const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/ui.js', 'utf8');
const start = source.indexOf('function estimateSummonEquipCapForMergedSave');
assert.ok(start >= 0, 'save summon-cap estimator not found');

let depth = 0;
let end = -1;
for (let index = source.indexOf('{', start); index < source.length; index++) {
  if (source[index] === '{') depth++;
  if (source[index] !== '}') continue;
  depth--;
  if (depth === 0) {
    end = index + 1;
    break;
  }
}
assert.ok(end > start, 'save summon-cap estimator body not found');

const context = {
  PASSIVE_TREE: { nodes: {} },
  TALENT_CARD_SLOT_UNLOCKS: [1],
  TALENT_CARD_DEFS: {
    summonCard: { surface: { uniq: [{ key: 'summonCapBonus', params: { cap: 2 } }] } },
  },
  getImmutableItemSpecialStats() { return []; },
};
vm.createContext(context);
vm.runInContext(`${source.slice(start, end)}; this.estimate = estimateSummonEquipCapForMergedSave;`, context);

const equipmentOnly = {
  equipment: {
    무기: { uniqueEffectKey: 'summonCapBonus', uniqueEffectParams: { cap: 2 } },
    반지2: { uniqueEffectKey: 'rightRingSummonCap', uniqueEffectParams: { cap: 1 } },
  },
  passives: [],
};
assert.strictEqual(context.estimate(equipmentOnly), 4, 'equipment unique effects must survive save-cap estimation');

const expanded = {
  ...equipmentOnly,
  ascendClass: 'soulbinder',
  ascendKeystones: ['sb4', 'sb8', 'sb9'],
  talentCards: { summonCard: { level: 1 } },
  talentCardLoadout: ['summonCard'],
};
assert.strictEqual(context.estimate(expanded), 12, 'talent and Soulbinder expanded cap must be restored up to hard cap');
assert.ok(!source.includes('let saveSummonUsed = 0;'), 'save merge must not destructively trim the desired summon loadout');

console.log('smoke-summon-cap-save passed');
