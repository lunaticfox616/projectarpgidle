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

const webShape = vm.runInContext(`
(function inspectSpiderWeb() {
  const nodes = Object.values(PASSIVE_TREE.nodes);
  const webNodes = nodes.filter(node => Number.isFinite(node.webSpoke) && Number.isFinite(node.webRing));
  const spokes = new Set(webNodes.map(node => node.webSpoke));
  const rings = new Set(webNodes.map(node => node.webRing));
  const rootLinks = PASSIVE_TREE.edges.filter(edge => edge.from === 'n0' || edge.to === 'n0');
  const ringLinks = PASSIVE_TREE.edges.filter(edge => {
    const a = PASSIVE_TREE.nodes[edge.from];
    const b = PASSIVE_TREE.nodes[edge.to];
    return a && b && Number.isFinite(a.webRing) && a.webRing === b.webRing && a.webSpoke !== b.webSpoke;
  });
  return {
    spokeCount: spokes.size,
    ringCount: rings.size,
    completeSpokes: Array.from(spokes).filter(spoke => webNodes.filter(node => node.webSpoke === spoke).length >= 12).length,
    rootLinkCount: rootLinks.length,
    ringLinkCount: ringLinks.length,
    hasReferenceLayout: nodes.some(node => !!node.layoutGroup)
  };
})()
`, context);
assert.strictEqual(webShape.spokeCount, 16, '거미줄 트리는 중심에서 16개 방사 경로로 뻗어야 한다');
assert.strictEqual(webShape.ringCount, 12, '거미줄 트리는 12단계 원형 고리를 유지해야 한다');
assert.strictEqual(webShape.completeSpokes, 16, '모든 방사 경로가 중심부터 외곽까지 이어져야 한다');
assert.strictEqual(webShape.rootLinkCount, 8, '중앙 루트는 여덟 주축에 연결되어야 한다');
assert.ok(webShape.ringLinkCount >= 100, '인접 방사 경로 사이에 충분한 원형 고리 연결이 있어야 한다');
assert.strictEqual(webShape.hasReferenceLayout, false, '참조 스키마 배치가 거미줄 구조를 다시 덮어쓰면 안 된다');

const targetId = vm.runInContext(`
(function findTarget() {
  const q = [{ id: 'n0', depth: 0 }];
  const seen = new Set(['n0']);
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

context.game.passives = ['n0'];
context.game.passivePoints = 99;
const path = context.getPassiveActivationPath(targetId);
assert.ok(path.length >= 3, 'shortest activation path should include intermediate nodes');
assert.strictEqual(path[path.length - 1], targetId, 'path should end at requested target');
assert.ok(!path.includes('n0'), 'path cost should exclude already active root');

context.game.passivePoints = path.length - 1;
const blocked = context.activatePassivePath(targetId, { forcePulseNodeId: targetId });
assert.strictEqual(blocked.activated, false, 'activation should fail when points are short');
assert.deepStrictEqual(context.game.passives, ['n0'], 'failed activation must not partially add nodes');

context.game.passivePoints = path.length;
const activated = context.activatePassivePath(targetId, { forcePulseNodeId: targetId });
assert.strictEqual(activated.activated, true, 'activation should spend points and add the shortest path');
assert.strictEqual(context.game.passivePoints, 0, 'activation should spend one point per inactive path node');
assert.deepStrictEqual(Array.from(context.game.passives.slice(1)), Array.from(path), 'activation should add exactly the shortest path in order');

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const activationHandler = uiSource.slice(uiSource.indexOf('async function activateHoveredPassive'), uiSource.indexOf("canvas.addEventListener('mousedown'", uiSource.indexOf('async function activateHoveredPassive')));
assert.ok(activationHandler.includes('const targetNodeId = targetNode.id;'), 'passive UI should snapshot the target before awaiting confirmation');
assert.ok(activationHandler.includes('activatePassivePath(targetNodeId'), 'confirmed activation should use the snapshotted target instead of the mutable hover node');
console.log('smoke-passive-shortest-path passed');
