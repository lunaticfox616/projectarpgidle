const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const files = [
  'js/bootstrap.js',
  'cloud-save-config.js',
  'data/constants.js',
  'data/maps.js',
  'data/skills.js',
  'data/items.js',
  'data/passives.js',
  'data/bosses.js',
  'data/rewards.js',
  'data/talent-cards.js',
  'js/utils.js',
  'js/state.js',
  'js/save.js',
  'js/items.js',
  'js/skills.js',
  'js/passives.js',
  'js/core-cube.js',
  'js/combat.js',
  'js/talent-cards.js',
];

function createElement() {
  return {
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild() {},
    setAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getContext() { return null; },
  };
}

const context = {
  console,
  window: null,
  globalThis: null,
  document: {
    readyState: 'loading',
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement,
    head: { appendChild() {} },
    body: { appendChild() {} },
  },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  location: { search: '', hash: '', href: '' },
  navigator: {},
  addEventListener() {},
  removeEventListener() {},
  setTimeout() {},
  clearTimeout() {},
  setInterval() {},
  clearInterval() {},
  requestAnimationFrame() {},
  cancelAnimationFrame() {},
  Image: function Image() {},
  Date,
  Math,
  JSON,
  Number,
  String,
  Boolean,
  Array,
  Object,
  Map,
  Set,
  WeakSet,
  RegExp,
  Error,
  URLSearchParams,
  structuredClone,
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
files.forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }));
context.getHeroSelectionDef = () => ({ label: '테스트 영웅', classId: null });
context.getCodexBonusPct = () => 0;

vm.runInContext('game = JSON.parse(JSON.stringify(defaultGame)); window.game = game;', context);
context.game.activeSkill = '기본 공격';
context.game.equipment = {
  장갑1: { slot: '장갑', rarity: 'rare', baseStats: [], stats: [{ id: 'ds', val: 400 }] },
};

assert.strictEqual(context.getPlayerStats().ds, 400, '연속 타격 확률은 250%로 소프트캡되지 않아야 한다');

context.addLog = () => {};
context.game.season = 31;
context.game.loopProgressCurrent = { bestAbyssDepth: 45, cosmosPlanets: ['planet-45'] };
context.game.cosmosLoopCount = 0;
assert.strictEqual(context.triggerSeasonReset(), false, 'both loop routes should require an explicit path');
assert.strictEqual(context.game.season, 31, 'generic loop reset must not consume the run when multiple routes are ready');
assert.strictEqual(context.game.cosmosLoopCount, 0, 'generic loop reset must not skip the cosmos-loop counter choice');
console.log('smoke-double-strike-uncapped passed');
