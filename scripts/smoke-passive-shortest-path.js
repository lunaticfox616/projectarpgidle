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

const treeShape = vm.runInContext(`
(function inspectAuthoredTree() {
  const nodes = Object.values(PASSIVE_TREE.nodes);
  const starts = nodes.filter(node => node.kind === 'start');
  return {
    nodeCount: nodes.length,
    edgeCount: PASSIVE_TREE.edges.length,
    builtNodeCount: Object.keys(PASSIVE_TREE_V22.nodes).length,
    builtEdgeCount: PASSIVE_TREE_V22.edges.length,
    starWedgeOptionCount: nodes.filter(node => node.kind === 'star_option').length,
    startCount: starts.length,
    selectedRoot: getPassiveTreeRootNodeId(),
    allStarts: PASSIVE_TREE_V22.classStarts
  };
})()
`, context);
assert.strictEqual(treeShape.starWedgeOptionCount, 24, '외곽 별쐐기 여섯 개는 각각 네 선택지를 만들어야 한다');
assert.strictEqual(treeShape.nodeCount, treeShape.builtNodeCount,
    '빌드된 패시브와 외곽 별쐐기 선택지가 런타임에 빠짐없이 로드되어야 한다');
assert.strictEqual(treeShape.edgeCount, treeShape.builtEdgeCount,
    '빌드된 패시브 연결선이 런타임에 빠짐없이 유지되어야 한다');
assert.strictEqual(treeShape.startCount, 6, '직업별 시작점은 여섯 개여야 한다');
assert.strictEqual(treeShape.selectedRoot, treeShape.allStarts.archer, '기본 궁수 직업은 궁수 시작점에서 출발해야 한다');
const firstAdjacency = context.getPassiveTreeAdjacency();
const secondAdjacency = context.getPassiveTreeAdjacency();
assert.strictEqual(firstAdjacency, secondAdjacency, '변하지 않은 패시브 구조의 인접 목록은 다시 만들면 안 된다');
assert.strictEqual(firstAdjacency.size, treeShape.nodeCount, '인접 목록은 모든 패시브 노드를 포함해야 한다');

const targetId = vm.runInContext(`
(function findTarget() {
  const rootId = getPassiveTreeRootNodeId();
  const q = [{ id: rootId, depth: 0 }];
  const seen = new Set([rootId]);
  while (q.length) {
    const cur = q.shift();
    if (cur.depth >= 3 && isPassiveNodeAvailable(cur.id)) return cur.id;
    PASSIVE_TREE.edges.forEach(edge => {
      const next = edge.from === cur.id ? edge.to : (edge.to === cur.id ? edge.from : null);
      if (!next || seen.has(next) || !isPassiveNodeAvailable(next)) return;
      seen.add(next);
      q.push({ id: next, depth: cur.depth + 1 });
    });
  }
  return null;
})()
`, context);
assert.ok(targetId, 'a distant passive node should exist in generated tree');

const rootId = context.getPassiveTreeRootNodeId();
context.game.passives = [];
context.game.passivePoints = 99;
const path = context.getPassiveActivationPath(targetId);
assert.ok(path.length >= 3, 'shortest activation path should include intermediate nodes');
assert.strictEqual(path[path.length - 1], targetId, 'path should end at requested target');
assert.ok(!path.includes(rootId), 'path cost should exclude the free class starting point');

context.game.passivePoints = path.length - 1;
const blocked = context.activatePassivePath(targetId, { forcePulseNodeId: targetId });
assert.strictEqual(blocked.activated, false, 'activation should fail when points are short');
assert.deepStrictEqual(context.game.passives, [], 'failed activation must not partially add nodes');

context.game.passivePoints = path.length;
const activated = context.activatePassivePath(targetId, { forcePulseNodeId: targetId });
assert.strictEqual(activated.activated, true, 'activation should spend points and add the shortest path');
assert.strictEqual(context.game.passivePoints, 0, 'activation should spend one point per inactive path node');
assert.deepStrictEqual(Array.from(context.game.passives), Array.from(path), 'activation should add exactly the shortest path in order');

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const activationHandler = uiSource.slice(uiSource.indexOf('async function activateHoveredPassive'), uiSource.indexOf("canvas.addEventListener('mousedown'", uiSource.indexOf('async function activateHoveredPassive')));
assert.ok(activationHandler.includes('const targetNodeId = targetNode.id;'), 'passive UI should snapshot the target before awaiting confirmation');
assert.ok(activationHandler.includes('activatePassivePath(targetNodeId'), 'confirmed activation should use the snapshotted target instead of the mutable hover node');
console.log('smoke-passive-shortest-path passed');
