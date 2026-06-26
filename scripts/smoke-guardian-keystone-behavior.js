#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function createElement() {
  return {
    style: {},
    innerHTML: '',
    classList: { add() {}, remove() {}, contains: () => false, toggle() {} }
  };
}

function createRuntime() {
  const context = {
    console,
    Date,
    Math: Object.create(Math),
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
    Audio: function Audio() {},
    addLog() {},
    addBattleFx() {},
    queueTutorialNotice() {},
    unlockJournalEntry() {},
    getHeroSelectionDef() { return { label: '테스트 영웅' }; },
    getCodexBonusPct() { return 0; }
  };
  context.Math.random = () => 0.99;
  context.window = context;
  context.globalThis = context;
  context.navigator = {};
  context.location = {};
  context.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  context.document = {
    addEventListener() {},
    getElementById: () => createElement(),
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement,
    body: { appendChild() {}, classList: createElement().classList }
  };
  return vm.createContext(context);
}

function loadRuntime(context) {
  [
    'data/constants.js',
    'data/maps.js',
    'data/skills.js',
    'data/items.js',
    'data/passives.js',
    'data/bosses.js',
    'data/rewards.js',
    'js/utils.js',
    'js/state.js',
    'js/items.js',
    'js/skills.js',
    'js/passives.js',
    'js/combat.js'
  ].forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }));
}

const context = createRuntime();
loadRuntime(context);
vm.runInContext(`
  game.ascendClass = 'guardian';
  game.ascendKeystones = ['gd7', 'gd8'];
  game.skills = ['기본 공격'];
  game.selectedSkill = '기본 공격';
  game.equipment = { 무기: null, 방패: null, 장갑1: null, 장갑2: null, 반지1: null, 반지2: null };
`, context);

const baseMaxHp = vm.runInContext('game.playerHp = 999999; getPlayerStats().maxHp;', context);
vm.runInContext(`game.playerHp = ${Math.ceil(baseMaxHp * 0.51)};`, context);
const aboveHalf = vm.runInContext('getPlayerStats()', context);
assert.strictEqual(aboveHalf.genericTakenDamageMultiplier, 1, 'Last Line must not reduce damage above 50% life');

vm.runInContext(`game.playerHp = ${Math.floor(baseMaxHp * 0.5)};`, context);
const atHalf = vm.runInContext('getPlayerStats()', context);
assert.strictEqual(atHalf.genericTakenDamageMultiplier, 0.8, 'Last Line must reduce taken damage by 20% at 50% life or below');
assert(atHalf.baseDmg > aboveHalf.baseDmg, 'Last Line must still amplify outgoing base damage at the active threshold');
assert.strictEqual(atHalf.guardianDamageNullifyChance, 25, 'Absolute Guard must grant a separate 25% damage nullify chance');
assert.strictEqual(atHalf.guardianBlockChance, 0, 'Absolute Guard must not add block chance');
assert.strictEqual(atHalf.blockChance, 0, 'Absolute Guard must not inflate final block chance without shield/block sources');
assert.strictEqual(atHalf.ailmentResistBonusPct, 50, 'Absolute Guard must keep the ailment resistance bonus');

console.log('guardian keystone behavior smoke checks passed');
