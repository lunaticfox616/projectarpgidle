const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function createRuntime() {
  const logs = [];
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
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
      style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      appendChild() {},
      addEventListener() {},
      getContext: () => null
    }),
    body: { appendChild() {}, classList: { add() {}, remove() {}, toggle() {} } }
  };
  context.addLog = (message, type) => logs.push({ message, type });
  return { context: vm.createContext(context), logs };
}

function loadProductionScripts(context) {
  const scripts = [
    'data/constants.js', 'data/maps.js', 'data/skills.js', 'data/items.js',
    'data/passives.js', 'data/bosses.js', 'data/rewards.js', 'js/utils.js',
    'js/state.js', 'js/items.js', 'js/skills.js', 'js/passives.js'
  ];
  scripts.forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }));
}

const { context, logs } = createRuntime();
loadProductionScripts(context);
context.updateStaticUI = () => {};
vm.runInContext(`
  game.inventory = [{
    id: 501,
    slot: '신발',
    baseName: '강철 발걸음',
    name: '희귀한 강철 발걸음',
    rarity: 'rare',
    itemTier: 10,
    baseStats: [{ id: 'armor', val: 100 }],
    stats: [
      { id: 'resF', val: 20, tier: 5 },
      { id: 'crit', val: 4, tier: 5 },
      { id: 'move', val: 18, tier: 5 },
      { id: 'flatHp', val: 70, tier: 5 }
    ]
  }];
  game.currencies.exalted = 1;
  game.currencies.sporeFire = 10;
  game.sporeCraftModes = { exalted: 'fire' };
  selectForCrafting(501, false);
`, context);

assert.strictEqual(vm.runInContext('getItemExplicitOptionCount(game.inventory[0])', context), 4, 'fixture must begin at four of six explicit options');
vm.runInContext("useCurrency('exalted')", context);
assert.strictEqual(vm.runInContext('getItemExplicitOptionCount(game.inventory[0])', context), 4, 'unavailable spore guarantee must leave the item unchanged');
assert.strictEqual(vm.runInContext('game.currencies.exalted', context), 1, 'blocked exalted crafting must not consume the orb');
assert.strictEqual(vm.runInContext('game.currencies.sporeFire', context), 10, 'blocked exalted crafting must not consume spores');
assert(logs.some(entry => entry.message.includes('홀씨 모드를 미사용으로 바꾸거나')), 'blocked crafting must explain how to resolve the unavailable spore guarantee');

vm.runInContext("game.sporeCraftModes.exalted = 'none'; useCurrency('exalted')", context);
assert.strictEqual(vm.runInContext('getItemExplicitOptionCount(game.inventory[0])', context), 5, 'disabling the exhausted spore mode must allow normal exalted crafting');
assert.strictEqual(vm.runInContext('game.currencies.exalted', context), 0, 'successful normal exalted crafting must consume the orb');

console.log('exalted four-of-six smoke checks passed');
