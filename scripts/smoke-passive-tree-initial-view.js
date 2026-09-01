const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// 패시브 트리를 처음 열면 전체 트리(1000개+ 노드, 우주계까지 포함하는 광대한 범위)를
// 한 화면에 맞추려다 배율이 극단적으로 작아져 노드가 사실상 보이지 않는 회귀를 막는다.
// fitPassiveCameraToBounds는 "지금 다룰 수 있는 범위"(시작점 주변의 몇 개 군집)만 화면에 맞춰야 한다.
const files = [
  'js/bootstrap.js',
  'cloud-save-config.js',
  'data/constants.js',
  'data/maps.js',
  'data/skills.js',
  'data/items.js',
  'data/growth-items.js',
  'data/passives.js',
  'data/passive-tree-v22.js',
  'data/bosses.js',
  'data/rewards.js',
  'data/talent-cards.js',
  'data/endgame-progression.js',
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
const savedDiscoveriesBeforeRefresh = vm.runInContext('game.discoveredPassives.length', context);
vm.runInContext('refreshPassiveVisibility();', context);
const visibilitySummary = vm.runInContext(`
(function () {
  const nodes = Object.values(PASSIVE_TREE.nodes);
  const available = nodes.filter(isPassiveNodeAvailable);
  const unavailable = nodes.filter(node => !isPassiveNodeAvailable(node));
  return {
    available: available.length,
    discovered: available.filter(node => getPassiveVisibility(node.id) === 'discovered').length,
    previews: available.filter(node => getPassiveVisibility(node.id) === 'preview').length,
    unavailable: unavailable.length,
    hiddenUnavailable: unavailable.filter(node => getPassiveVisibility(node.id) === 'hidden').length,
    storedDiscoveries: game.discoveredPassives.length,
  };
})()
`, context);
assert(visibilitySummary.available > 1000, '전체 공개 검사가 충분한 규모의 패시브 트리를 대상으로 하지 않는다.');
assert.strictEqual(visibilitySummary.discovered, visibilitySummary.available,
  '처음부터 사용할 수 있는 패시브 노드가 전부 밝혀져야 한다.');
assert.strictEqual(visibilitySummary.previews, 0, '전체 공개 상태에 흐릿한 미리보기 노드가 남아 있다.');
assert.strictEqual(visibilitySummary.hiddenUnavailable, visibilitySummary.unavailable,
  '아직 생성 조건이 충족되지 않은 별쐐기·각성 노드는 기능 잠금을 유지해야 한다.');
assert.strictEqual(visibilitySummary.storedDiscoveries, savedDiscoveriesBeforeRefresh,
  '전체 공개를 위해 저장 데이터에 모든 노드 id를 복제하면 안 된다.');
vm.runInContext('fitPassiveCameraToBounds(true);', context);
const freshZoom = vm.runInContext('camZoom', context);
const initialViewNodeCount = vm.runInContext('getPassiveActiveViewBoundsIds().size', context);
assert(initialViewNodeCount >= 12 && initialViewNodeCount <= 60,
  `첫 화면은 선택 맥락이 보이는 12~60개의 근접 노드를 포함해야 한다 (nodes=${initialViewNodeCount}).`);
assert(freshZoom >= 0.40 && freshZoom <= 0.65,
  `첫 화면은 군집 구조와 노드 문양을 함께 읽을 수 있는 배율이어야 한다 (camZoom=${freshZoom}).`);

const rootNode = vm.runInContext('getPassiveTreeRootNode()', context);
const camX = vm.runInContext('camX', context);
const camY = vm.runInContext('camY', context);
const screenX = camX + rootNode.x * freshZoom;
const screenY = camY + rootNode.y * freshZoom;
assert(Math.abs(screenX) < treeContainer.clientWidth / 2, '루트 노드가 초기 화면 가로 범위 밖에 있다.');
assert(Math.abs(screenY) < treeContainer.clientHeight / 2, '루트 노드가 초기 화면 세로 범위 밖에 있다.');

// 노드를 널리 투자한 베테랑 상태에서도 화면이 그 투자 범위에 맞춰져야 한다(전체 트리로 튀지 않는다).
vm.runInContext(`
(function () {
  let root = getPassiveTreeRootNode();
  let ids = Object.keys(PASSIVE_TREE.nodes).filter(id => {
    let n = PASSIVE_TREE.nodes[id];
    let d = Math.hypot(n.x - root.x, n.y - root.y);
    return d > 200 && d < 1800;
  }).slice(0, 60);
  game.passives = ids;
  calculateReachableNodes();
})();
`, context);
vm.runInContext('passiveCameraInitialized = false; fitPassiveCameraToBounds(false);', context);
const veteranZoom = vm.runInContext('camZoom', context);
assert(veteranZoom >= 0.14, `베테랑 상태에서 배율이 클램프 최솟값 아래로 내려갔다 (camZoom=${veteranZoom}).`);
assert(veteranZoom <= 0.72, `베테랑 상태에서 배율이 클램프 최댓값 위로 올라갔다 (camZoom=${veteranZoom}).`);

console.log('smoke-passive-tree-initial-view passed');
