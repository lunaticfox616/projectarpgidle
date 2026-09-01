const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const files = [
  'js/bootstrap.js', 'cloud-save-config.js', 'data/constants.js', 'data/maps.js',
  'data/skills.js', 'data/items.js', 'data/growth-items.js', 'data/passives.js', 'data/passive-tree-v22.js', 'data/bosses.js',
  'data/rewards.js', 'data/talent-cards.js', 'data/endgame-progression.js', 'js/utils.js', 'js/state.js', 'js/passives.js',
];

function createElement() {
  return {
    style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild() {}, setAttribute() {}, addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; }, getContext() { return null; },
  };
}

const context = {
  console, window: null, globalThis: null,
  document: {
    readyState: 'loading', addEventListener() {}, getElementById() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; }, createElement,
    head: { appendChild() {} }, body: { appendChild() {} },
  },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  location: { search: '', hash: '', href: '' }, navigator: {},
  addEventListener() {}, removeEventListener() {}, setTimeout() {}, clearTimeout() {},
  setInterval() {}, clearInterval() {}, requestAnimationFrame() {}, cancelAnimationFrame() {},
  performance: { now() { return 0; } }, Image: function Image() {}, Date, Math, JSON,
  Number, String, Boolean, Array, Object, Map, Set, WeakSet, RegExp, Error, URLSearchParams, structuredClone,
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
files.forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }));
vm.runInContext('game = JSON.parse(JSON.stringify(defaultGame)); window.game = game;', context);

const line = stat => ({ stat, val: 5, boosted: false });
const setup = vm.runInContext(`
(() => {
  Object.keys(PASSIVE_TREE.nodes).forEach(id => delete PASSIVE_TREE.nodes[id]);
  PASSIVE_TREE.edges.length = 0;
  PASSIVE_TREE.nodes.n0 = { id:'n0', x:-200, y:0, kind:'root', stat:'flatDmg', val:1 };
  PASSIVE_TREE.nodes.h1 = { id:'h1', x:0, y:0, kind:'hub', socketType:'star_wedge', stat:'pctDmg', val:10, title:'첫 번째 슬롯' };
  PASSIVE_TREE.nodes.h2 = { id:'h2', x:400, y:0, kind:'hub', socketType:'star_wedge', stat:'pctHp', val:10, title:'기록 슬롯' };
  PASSIVE_TREE.nodes.p1 = { id:'p1', x:200, y:0, kind:'path', stat:'move', val:2 };
  PASSIVE_TREE.nodes.c1 = { id:'c1', x:20, y:0, kind:'core', stat:'flatHp', val:20 };
  PASSIVE_TREE.edges.push({from:'n0',to:'h1'}, {from:'h1',to:'p1'}, {from:'h2',to:'p1'}, {from:'h1',to:'c1'});
  return true;
})()
`, context);
assert.strictEqual(setup, true);

context.game.passives = ['n0'];
context.game.starWedge = {
  wedges: [{
    id: 1, unique: true, uniqueType: 'black_hole', recordedHubNodeId: 'h2',
    lines: [line('move'), line('aspd'), line('crit'), line('flatHp')],
  }],
  sockets: [{ nodeId: 'h1', wedgeId: 1 }],
};
context.recalculateStarWedgeMutations(true);
assert.strictEqual(context.game.starWedge.virtualLearnNodes.h2, true, 'black hole should expose its recorded hub as a virtual connection root');
assert.strictEqual(context.game.starWedge.disabledNodeEffects.h1, true, 'black hole should disable the socket hub effect');
assert.strictEqual(context.game.starWedge.disabledNodeEffects.h2, true, 'black hole should disable the recorded hub effect');
context.calculateReachableNodes();
assert.strictEqual(vm.runInContext("reachableNodes.has('p1')", context), true, 'a node adjacent to the recorded hub should become reachable');
assert.deepStrictEqual(Array.from(context.getPassiveActivationPath('p1')), ['p1'], 'virtual hubs should serve as a free shortest-path boundary');

context.game.starWedge.sockets = [];
context.recalculateStarWedgeMutations(true);
assert.deepStrictEqual(Object.keys(context.game.starWedge.virtualLearnNodes), [], 'unsocketing must clear virtual roots immediately');
assert.deepStrictEqual(Object.keys(context.game.starWedge.disabledNodeEffects), [], 'unsocketing must clear disabled node effects immediately');

context.game.starWedge = {
  wedges: [{ id: 2, unique: true, uniqueType: 'satellite', lines: [line('move'), line('aspd'), line('crit'), line('flatHp')] }],
  sockets: [{ nodeId: 'h1', wedgeId: 2 }],
};
context.recalculateStarWedgeMutations(true);
assert.strictEqual(context.game.starWedge.disabledNodeEffects.c1, true, 'satellite should disable core nodes in its radius');

vm.runInContext(`
  PASSIVE_TREE.nodes.r1 = { id:'r1', x:150, y:0, kind:'path', stat:'flatHp', val:1 };
  PASSIVE_TREE.nodes.r2 = { id:'r2', x:220, y:0, kind:'path', stat:'flatHp', val:1 };
  PASSIVE_TREE.nodes.r3 = { id:'r3', x:310, y:0, kind:'path', stat:'flatHp', val:1 };
  PASSIVE_TREE.nodes.r4 = { id:'r4', x:330, y:0, kind:'path', stat:'flatHp', val:1 };
  game.starWedge = { wedges:[{id:20,lines:[
    {stat:'move',val:5},{stat:'aspd',val:5},{stat:'crit',val:5},{stat:'flatHp',val:5}
  ]}], sockets:[{nodeId:'h1',wedgeId:20}] };
  recalculateStarWedgeMutations(true);
`, context);
assert.deepStrictEqual([
  context.game.starWedge.nodeMutations.r1.lineIndex,
  context.game.starWedge.nodeMutations.r2.lineIndex,
  context.game.starWedge.nodeMutations.r3.lineIndex,
], [0, 1, 2], 'central sockets should use three circular distance bands');
assert.strictEqual(context.game.starWedge.nodeMutations.r4, undefined, 'nodes outside the circular radius must not be mutated');

context.game.starWedge = {
  wedges: [
    { id: 3, lines: [line('move'), line('aspd'), line('crit'), line('flatHp')] },
    { id: 4, lines: [line('crit'), line('move'), line('aspd'), line('flatHp')] },
  ],
  sockets: [{ nodeId: 'h1', wedgeId: 3 }, { nodeId: 'h2', wedgeId: 4 }],
};
context.recalculateStarWedgeMutations(true);
assert.strictEqual(context.game.starWedge.nodeMutations.p1, undefined, 'overlapping star-wedge mutations should cancel instead of depending on socket order');
assert.deepStrictEqual(Array.from(context.game.starWedge.mutationConflictSources.p1).sort(), [3, 4], 'conflicts should retain all responsible wedge ids for UI feedback');

const brokenSun = { id: 5, unique: true, uniqueType: 'sun', lines: [line('move'), line('move'), line('move'), { stat:'pctDmg', val:10 }] };
context.normalizeUniqueStarWedgeItem(brokenSun);
assert.ok(brokenSun.lines.slice(0, 3).every(row => row.disabled), 'sun normalization should restore disabled path lines');
assert.strictEqual(brokenSun.lines[3].val, 30, 'sun normalization should restore its triple core rule once');
context.normalizeUniqueStarWedgeItem(brokenSun);
assert.strictEqual(brokenSun.lines[3].val, 30, 'sun normalization must be idempotent');

vm.runInContext(`
  PASSIVE_TREE.nodes.h3 = { id:'h3', x:700, y:0, kind:'hub', starWedgeMode:'constellation', socketType:'star_wedge' };
  PASSIVE_TREE.nodes.o1 = { id:'o1', x:820, y:0, kind:'star_option', requiresStarWedgeSocketNodeId:'h3', starWedgeLineIndex:0, starWedgeOptionActive:false, effects:[] };
  PASSIVE_TREE.edges.push({from:'h3',to:'o1'});
  game.starWedge = { wedges:[{id:6,lines:[{stat:'move',val:7}]}], sockets:[{nodeId:'h3',wedgeId:6}] };
  recalculateStarWedgeMutations(true);
`, context);
assert.strictEqual(vm.runInContext('PASSIVE_TREE.nodes.o1.starWedgeOptionActive', context), true,
  'an outer star-wedge socket should reveal an investable option node');
assert.deepStrictEqual(JSON.parse(vm.runInContext('JSON.stringify(PASSIVE_TREE.nodes.o1.effects)', context)), [{ stat:'move', val:7 }],
  'the revealed outer option should use the matching star-wedge line');
assert.deepStrictEqual(Array.from(context.getPassiveActivationPath('o1')), ['o1'],
  'an outer star-wedge option should always cost exactly one passive point');
vm.runInContext(`game.passives=['n0']; game.passivePoints=1; activatePassivePath('o1');`, context);
assert.strictEqual(vm.runInContext("game.passives.includes('o1')", context), true,
  'the outer option should be allocatable without buying the socket route');
assert.strictEqual(vm.runInContext('game.passivePoints', context), 0,
  'the outer option should spend exactly one passive point');
vm.runInContext(`game.starWedge.sockets=[]; recalculateStarWedgeMutations(true);`, context);
assert.strictEqual(vm.runInContext("game.passives.includes('o1')", context), false, 'unsocketing should remove unavailable outer options');
assert.strictEqual(vm.runInContext('game.passivePoints', context), 1, 'unsocketing should refund invested outer options');
vm.runInContext('recalculateStarWedgeMutations(true);', context);
assert.strictEqual(vm.runInContext('game.passivePoints', context), 1,
  'recalculating an already empty socket must not refund twice');

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
assert.ok(combatSource.includes('if (disabledPassiveEffects[String(id)]) return;'), 'combat stat aggregation must skip disabled passive effects');
assert.ok(combatSource.includes('disabledPassiveEffects[String(nodeId)]'), 'automatic star-wedge core stats must also respect disabled effects');

console.log('smoke-star-wedge-integrity passed');
