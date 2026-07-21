const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// 패시브 트리를 처음 열면 전체 트리(1000개+ 노드, 우주계까지 포함하는 광대한 범위)를
// 한 화면에 맞추려다 배율이 극단적으로 작아져 노드가 사실상 보이지 않는 회귀를 막는다.
// fitPassiveCameraToBounds는 "지금 다룰 수 있는 범위"(투자한 노드 + 다음 구매 가능 노드)만
// 화면에 맞춰야 한다.
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
  'js/passives.js',
];

const treeContainer = {
  clientWidth: 874,
  clientHeight: 520,
  offsetParent: {},
};

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
    readyState: 'loading', addEventListener() {},
    getElementById(id) { return id === 'tree-container' ? treeContainer : null; },
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

// 전체 트리 배율(옛 동작)을 비교 기준으로 계산: 새 노드 하나만 도달 가능한 최초 상태에서도
// 옛 계산식은 전체 트리 범위를 기준으로 하므로 항상 0.14(클램프 최솟값)에 붙는다.
const legacyWholeTreeZoom = vm.runInContext(`
(function () {
  const spanX = Math.max(1, PASSIVE_BOUNDS.maxX - PASSIVE_BOUNDS.minX);
  const spanY = Math.max(1, PASSIVE_BOUNDS.maxY - PASSIVE_BOUNDS.minY);
  const width = 874, height = 520;
  const zoom = Math.min((width - 64) / spanX, (height - 72) / spanY);
  return Math.max(0.14, Math.min(0.72, zoom));
})()
`, context);
assert(legacyWholeTreeZoom <= 0.15, '이 스모크 검사의 전제(전체 트리 범위는 최소 배율로 클램프된다)가 더 이상 성립하지 않는다 — 트리 데이터가 바뀌었다면 검사를 다시 검토하라.');

vm.runInContext('calculateReachableNodes();', context);
vm.runInContext('fitPassiveCameraToBounds(true);', context);
const freshZoom = vm.runInContext('camZoom', context);
assert(freshZoom > 0.5, `막 게임을 시작한 캐릭터가 패시브 트리를 처음 열었을 때 배율이 너무 작다 (camZoom=${freshZoom}). 루트 노드가 화면에서 사실상 보이지 않는 회귀다.`);

const rootNode = vm.runInContext('PASSIVE_TREE.nodes.n0', context);
const camX = vm.runInContext('camX', context);
const camY = vm.runInContext('camY', context);
const screenX = camX + rootNode.x * freshZoom;
const screenY = camY + rootNode.y * freshZoom;
assert(Math.abs(screenX) < treeContainer.clientWidth / 2, '루트 노드가 초기 화면 가로 범위 밖에 있다.');
assert(Math.abs(screenY) < treeContainer.clientHeight / 2, '루트 노드가 초기 화면 세로 범위 밖에 있다.');

// 노드를 널리 투자한 베테랑 상태에서도 화면이 그 투자 범위에 맞춰져야 한다(전체 트리로 튀지 않는다).
vm.runInContext(`
(function () {
  let root = PASSIVE_TREE.nodes.n0;
  let ids = Object.keys(PASSIVE_TREE.nodes).filter(id => {
    let n = PASSIVE_TREE.nodes[id];
    let d = Math.hypot(n.x - root.x, n.y - root.y);
    return d > 200 && d < 1800;
  }).slice(0, 60);
  game.passives = ['n0'].concat(ids);
  calculateReachableNodes();
})();
`, context);
vm.runInContext('passiveCameraInitialized = false; fitPassiveCameraToBounds(false);', context);
const veteranZoom = vm.runInContext('camZoom', context);
assert(veteranZoom >= 0.14, `베테랑 상태에서 배율이 클램프 최솟값 아래로 내려갔다 (camZoom=${veteranZoom}).`);
assert(veteranZoom <= 0.72, `베테랑 상태에서 배율이 클램프 최댓값 위로 올라갔다 (camZoom=${veteranZoom}).`);

console.log('smoke-passive-tree-initial-view passed');
