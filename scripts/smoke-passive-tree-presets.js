const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const files = [
  'js/bootstrap.js', 'cloud-save-config.js', 'data/constants.js', 'data/maps.js',
  'data/skills.js', 'data/items.js', 'data/growth-items.js', 'data/passives.js', 'data/bosses.js',
  'data/rewards.js', 'data/talent-cards.js', 'data/endgame-progression.js', 'js/utils.js', 'js/state.js', 'js/passives.js',
];
const emptyElement = () => ({
  style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  appendChild() {}, setAttribute() {}, addEventListener() {}, removeEventListener() {},
  querySelector() { return null; }, querySelectorAll() { return []; }, getContext() { return null; },
});
const context = {
  console, window: null, globalThis: null,
  document: { readyState: 'loading', addEventListener() {}, getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; }, createElement: emptyElement, head: { appendChild() {} }, body: { appendChild() {} } },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  location: { search: '', hash: '', href: '' }, navigator: {},
  addEventListener() {}, removeEventListener() {}, setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {}, requestAnimationFrame() {}, cancelAnimationFrame() {},
  performance: { now() { return 0; } }, Image: function Image() {}, Date, Math, JSON, Number, String, Boolean, Array, Object, Map, Set, WeakSet, RegExp, Error, URLSearchParams, structuredClone,
  btoa: value => Buffer.from(value, 'binary').toString('base64'), atob: value => Buffer.from(value, 'base64').toString('binary'), escape, unescape, encodeURIComponent, decodeURIComponent,
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
files.forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }));
vm.runInContext(`
  game = JSON.parse(JSON.stringify(defaultGame)); window.game = game;
  Object.keys(PASSIVE_TREE.nodes).forEach(id => delete PASSIVE_TREE.nodes[id]);
  PASSIVE_TREE.edges.length = 0;
  PASSIVE_TREE.nodes.n0 = { id:'n0', kind:'root', x:0, y:0, stat:'flatDmg', val:1 };
  PASSIVE_TREE.nodes.a = { id:'a', kind:'path', x:100, y:0, stat:'move', val:1 };
  PASSIVE_TREE.nodes.b = { id:'b', kind:'major', x:200, y:0, stat:'pctDmg', val:5 };
  PASSIVE_TREE.edges.push({from:'n0',to:'a'}, {from:'a',to:'b'});
  game.passives = ['n0','a','b'];
  game.passivePoints = 0;
`, context);

const saved = vm.runInContext("saveCurrentPassiveTreePreset(0, '이동 빌드')", context);
assert.strictEqual(saved.name, '이동 빌드');
assert.deepStrictEqual(Array.from(saved.nodeIds), ['a', 'b']);
const shareCode = vm.runInContext('encodePassiveTreePreset(0)', context);
assert.ok(shareCode.startsWith('PT1.'), '프리셋은 복사 가능한 버전 코드로 내보내야 한다');
const repaired = vm.runInContext("normalizePassiveTreePlannerState({layoutVersion:PASSIVE_LAYOUT_VERSION,activeSlot:'broken',autoInvest:true,presets:[]})", context);
assert.strictEqual(repaired.activeSlot, 0, '손상된 활성 슬롯은 첫 슬롯으로 복구한다');
const stale = vm.runInContext("normalizePassiveTreePlannerState({layoutVersion:PASSIVE_LAYOUT_VERSION-1,activeSlot:0,autoInvest:true,presets:[{name:'old',nodeIds:['a']}]})", context);
assert.strictEqual(stale.autoInvest, false, '레이아웃이 바뀐 낡은 프리셋은 자동 투자를 중단한다');
assert.strictEqual(stale.presets[0], null, '레이아웃이 바뀐 낡은 노드 경로를 재사용하지 않는다');
vm.runInContext(`game.settings.passiveTreePlanner.presets[1] = null; importPassiveTreePreset(1, ${JSON.stringify(shareCode)});`, context);
assert.strictEqual(vm.runInContext('game.settings.passiveTreePlanner.presets[1].name', context), '이동 빌드');

vm.runInContext(`
  game.passives = ['n0']; game.passivePoints = 2;
  setActivePassiveTreePreset(1); setPassiveTreeAutoInvest(true);
  calculateReachableNodes();
`, context);
const invested = vm.runInContext('runPassiveTreeAutoInvest()', context);
assert.strictEqual(invested.nodes, 2);
assert.strictEqual(invested.points, 2);
assert.strictEqual(vm.runInContext('game.passivePoints', context), 0, '자동 투자는 가진 포인트보다 더 쓰면 안 된다');
assert.deepStrictEqual(Array.from(vm.runInContext('game.passives', context)), ['n0', 'a', 'b']);
const secondRun = vm.runInContext('runPassiveTreeAutoInvest()', context);
assert.deepStrictEqual({ nodes: secondRun.nodes, points: secondRun.points }, { nodes: 0, points: 0 }, '완료된 프리셋은 재실행해도 중복 투자하지 않는다');

console.log('smoke-passive-tree-presets passed');
