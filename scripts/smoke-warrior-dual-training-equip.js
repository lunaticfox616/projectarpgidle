const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function createElement() {
  const classes = new Set();
  return {
    style: {},
    innerHTML: '',
    classList: {
      add: value => classes.add(value),
      remove: value => classes.delete(value),
      contains: value => classes.has(value),
      toggle(value, enabled) {
        if (enabled) classes.add(value);
        else classes.delete(value);
      }
    }
  };
}

function createRuntime() {
  const elements = new Map();
  const context = {
    console,
    Date,
    Math,
    JSON,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Array,
    Object,
    Number,
    String,
    Boolean,
    RegExp,
    Promise,
    performance: { now: () => 0 },
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {},
    Image: function Image() {},
    Audio: function Audio() {}
  };
  context.window = context;
  context.globalThis = context;
  context.navigator = {};
  context.location = {};
  context.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  context.document = {
    addEventListener() {},
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createElement());
      return elements.get(id);
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement,
    body: { appendChild() {}, classList: createElement().classList }
  };
  return { context: vm.createContext(context), elements };
}

function loadProductionScripts(context) {
  const scripts = [
    'data/constants.js', 'data/maps.js', 'data/skills.js', 'data/items.js',
    'data/passives.js', 'data/bosses.js', 'data/rewards.js', 'js/utils.js',
    'js/state.js', 'js/items.js', 'js/skills.js', 'js/passives.js', 'js/combat.js'
  ];
  scripts.forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }));
}

const { context, elements } = createRuntime();
loadProductionScripts(context);
context.updateStaticUI = () => {};
context.normalizeSupportLoadout = () => {};
context.hideItemTooltip = () => {};
vm.runInContext(`
  game.ascendClass = 'warrior';
  game.ascendKeystones = ['w3'];
  game.inventory = [{ id: 101, name: '새 쌍수 무기', slot: '무기' }];
  game.equipment = {
    무기: { id: 201, name: '기존 주 무기', slot: '무기' },
    방패: { id: 202, name: '기존 방패', slot: '방패' },
    장갑1: null,
    장갑2: null,
    반지1: null,
    반지2: null
  };
`, context);

assert.strictEqual(vm.runInContext('equipItemById(101)', context), true, 'weapon equip request must be accepted');
assert(elements.get('weapon-slot-overlay').classList.contains('active'), 'dual training weapon equip must open the slot selector');
assert.strictEqual(vm.runInContext('game.equipment.방패.id', context), 202, 'opening the selector must not replace equipment early');

vm.runInContext("selectWeaponSlotFromOverlay('방패')", context);
assert.strictEqual(vm.runInContext('game.equipment.방패.id', context), 101, 'selected weapon must replace a shield in the off-hand slot');
assert(vm.runInContext('game.inventory.some(item => item.id === 202)', context), 'replaced shield must return to inventory');

vm.runInContext("game.inventory.push({ id: 102, name: '새 방패', slot: '방패' })", context);
assert.strictEqual(vm.runInContext('equipItemById(102)', context), true, 'shield equip request must be accepted over an off-hand weapon');
assert.strictEqual(vm.runInContext('game.equipment.방패.id', context), 102, 'shield must replace an off-hand weapon without stalling');
assert(vm.runInContext('game.inventory.some(item => item.id === 101)', context), 'replaced off-hand weapon must return to inventory');

vm.runInContext("game.inventory.push({ id: 103, name: '새 주 무기', slot: '무기' })", context);
vm.runInContext("equipItemById(103); selectWeaponSlotFromOverlay('무기')", context);
assert.strictEqual(vm.runInContext('game.equipment.무기.id', context), 103, 'slot selector must also replace the main weapon');
assert.strictEqual(vm.runInContext('game.equipment.방패.id', context), 102, 'main-weapon replacement must preserve the off-hand slot');

console.log('warrior dual training equip smoke checks passed');
