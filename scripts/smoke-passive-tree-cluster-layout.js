const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function createBrowserContext() {
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
  return vm.createContext(context);
}

function loadPassiveRuntime(context) {
  const scripts = [
    'data/constants.js',
    'data/maps.js',
    'data/skills.js',
    'data/items.js',
    'data/passives.js',
    'data/bosses.js',
    'data/rewards.js',
    'js/utils.js',
    'js/state.js',
    'js/passives.js'
  ];
  scripts.forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }));
}

const context = createBrowserContext();
loadPassiveRuntime(context);
const nodes = Object.values(context.PASSIVE_TREE.nodes);
const clusterNodes = nodes.filter(node => node.clusterId);

assert(nodes.length >= 1000, 'production passive generation must retain the full tree structure');

const summonNodes = nodes.filter(node => String(node.stat).startsWith('summon'));
assert(summonNodes.length > 0, 'the relocated summon cluster must exist');
assert(summonNodes.every(node => node.clusterId), 'summon stats must not remain on mandatory path or star-end nodes');
assert(summonNodes.every(node => [14, 15].includes(node.webCellSpoke)), 'summon clusters must stay in the 10–12 o’clock area');
assert(new Set(summonNodes.map(node => node.stat)).has('summonPctDmg'), 'summon damage cluster must exist');
assert(new Set(summonNodes.map(node => node.stat)).has('summonHpPct'), 'summon life cluster must exist');

const slamValues = [...new Set(clusterNodes.filter(node => node.stat === 'slamPctDmg').map(node => node.val))].sort((a, b) => a - b);
assert.deepStrictEqual(slamValues, [8, 16, 32], 'slam cluster node values must be doubled in the generated tree');

const fireClusters = new Set(clusterNodes.filter(node => node.clusterBaseStat === 'firePctDmg').map(node => `${node.webCellSpoke}:${node.webCellRing}`));
assert(fireClusters.has('10:5') && fireClusters.has('11:8'), 'two fire clusters must occupy the 7–9 o’clock area');
assert(fireClusters.has('14:6'), 'the 11–1 o’clock area must contain a fire cluster');
assert(clusterNodes.some(node => node.webCellSpoke === 0 && node.webCellRing === 6 && node.clusterBaseStat === 'coldPctDmg'), 'the 11–1 o’clock area must contain a cold cluster');
assert(clusterNodes.some(node => node.webCellSpoke === 1 && node.webCellRing === 6 && node.clusterBaseStat === 'lightPctDmg'), 'the 11–1 o’clock area must contain a lightning cluster');
assert(!clusterNodes.some(node => [1, 2].includes(node.webCellSpoke) && node.stat === 'poisonChance'), 'the 1–2 o’clock poison cluster must be replaced');
assert(clusterNodes.some(node => [1, 2].includes(node.webCellSpoke) && node.clusterBaseStat === 'coldPctDmg'), 'the replacement cold cluster must exist at 1–2 o’clock');

const southDefenseNodes = clusterNodes.filter(node => ['deflect_south_cluster', 'block_south_cluster'].includes(node.clusterId));
assert.strictEqual(southDefenseNodes.length, 8, 'one block and one deflect cluster must be added at 5–6 o’clock');
assert(southDefenseNodes.every(node => {
  const angle = Math.atan2(node.y, node.x);
  return angle >= 1.1 && angle <= 1.75;
}), 'new block and deflect nodes must remain in the 5–6 o’clock area');

console.log('passive tree cluster layout smoke checks passed');
