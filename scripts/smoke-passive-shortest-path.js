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

const radialSummary = vm.runInContext(`(() => {
  const nodes = Object.values(PASSIVE_TREE.nodes);
  const axisSpokes = new Set(nodes.filter(node => node.radialRole === 'axis').map(node => node.webSpoke));
  const pillarSpokes = new Set(nodes.filter(node => node.radialRole === 'pillar').map(node => node.webSpoke));
  const worlds = nodes.reduce((counts, node) => {
    if (Number.isFinite(node.radialWorld)) counts[node.radialWorld] = (counts[node.radialWorld] || 0) + 1;
    return counts;
  }, {});
  let minimumDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      minimumDistance = Math.min(minimumDistance, Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y));
    }
  }
  return {
    nodeCount: nodes.length,
    edgeCount: PASSIVE_TREE.edges.length,
    axisCount: axisSpokes.size,
    pillarCount: pillarSpokes.size,
    worlds,
    minimumDistance,
  };
})()`, context);
assert.strictEqual(context.PASSIVE_RADIAL_SCHEMA.sectorCount, 12, 'passive layout should use twelve 30-degree sectors');
assert.strictEqual(context.PASSIVE_RADIAL_SCHEMA.axisCount, 6, 'passive layout should retain six primary axes');
assert.strictEqual(context.PASSIVE_LAYOUT_VERSION, 17, 'radial topology should use a new save-layout version');
assert.strictEqual(context.PASSIVE_FULL_DISCOVERY, true, 'radial layout play-test should begin with the full available tree explored');
assert.deepStrictEqual(Array.from(context.PASSIVE_RADIAL_SCHEMA.worldDepths), [3, 6, 9, 12], 'passive layout should expose four concentric worlds');
assert.strictEqual(radialSummary.nodeCount, 1101, 'radial adaptation should preserve the live passive node count');
assert.ok(radialSummary.edgeCount > radialSummary.nodeCount, 'radial tree should retain alternate routes instead of becoming a single chain');
assert.strictEqual(radialSummary.axisCount, 6, 'generated tree should contain six populated axes');
assert.strictEqual(radialSummary.pillarCount, 6, 'generated tree should contain six populated inter-axis pillars');
assert.ok([0, 1, 2, 3].every(world => (radialSummary.worlds[world] || 0) >= 100), 'all four concentric worlds should contain meaningful node populations');
assert.ok(radialSummary.minimumDistance >= 36, 'passive nodes should retain enough clearance to avoid unreadable overlap');
const passiveCanvasSource = fs.readFileSync('js/canvas-passive-tree.js', 'utf8');
assert.ok(passiveCanvasSource.includes('drawPassiveRadialFramework(ctx, lightweightMode, zoomedOutMode)'), 'canvas should render the four rings and twelve-sector framework');

context.game.discoveredPassives = [];
context.refreshPassiveVisibility();
const discoverySummary = vm.runInContext(`({
  available: Object.values(PASSIVE_TREE.nodes).filter(node => isPassiveNodeAvailable(node)).length,
  discovered: discoveredPassiveNodes.size,
  saved: game.discoveredPassives.length,
  hiddenAvailable: Object.values(PASSIVE_TREE.nodes).filter(node => isPassiveNodeAvailable(node) && getPassiveVisibility(node.id) === 'hidden').length,
})`, context);
assert.strictEqual(discoverySummary.discovered, discoverySummary.available, 'every available passive should be explored on first refresh');
assert.strictEqual(discoverySummary.saved, discoverySummary.available, 'full exploration should persist in the save state');
assert.strictEqual(discoverySummary.hiddenAvailable, 0, 'no available passive should remain hidden during layout testing');

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
assert.ok(uiSource.includes("const refundedForRadialLayout = (merged.passives || []).filter(id => id !== 'n0').length"), 'old passive allocations should be counted for a one-time radial-layout refund');
assert.ok(uiSource.includes("merged.passives = ['n0']"), 'old layouts should reset to the root instead of remapping ids to unrelated effects');
const activationHandler = uiSource.slice(uiSource.indexOf('async function activateHoveredPassive'), uiSource.indexOf("canvas.addEventListener('mousedown'", uiSource.indexOf('async function activateHoveredPassive')));
assert.ok(activationHandler.includes('const targetNodeId = targetNode.id;'), 'passive UI should snapshot the target before awaiting confirmation');
assert.ok(activationHandler.includes('activatePassivePath(targetNodeId'), 'confirmed activation should use the snapshotted target instead of the mutable hover node');
console.log('smoke-passive-shortest-path passed');
