const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const passiveFiles = [
  'js/bootstrap.js', 'cloud-save-config.js', 'data/constants.js', 'data/maps.js',
  'data/skills.js', 'data/items.js', 'data/passives.js', 'data/bosses.js',
  'data/rewards.js', 'data/talent-cards.js', 'js/utils.js', 'js/state.js', 'js/passives.js',
];

function createElement() {
  return {
    style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
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
  performance: { now() { return 1000; } }, Image: function Image() {}, Date, Math, JSON,
  Number, String, Boolean, Array, Object, Map, Set, WeakSet, RegExp, Error,
  URLSearchParams, structuredClone,
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
passiveFiles.forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }));

const layout = vm.runInContext(`(() => {
  const nodes = Object.values(PASSIVE_TREE.nodes);
  const root = PASSIVE_TREE.nodes.n0;
  let overlaps = 0;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const minimum = getPassiveNodeVisualRadius(a) + getPassiveNodeVisualRadius(b) + 3;
      if (Math.hypot(a.x - b.x, a.y - b.y) < minimum) overlaps++;
    }
  }
  const starters = nodes.filter(node => node.depth === 1);
  const uniqueStartingStats = new Set(starters.map(node => node.stat));
  const canopyNodes = nodes.filter(node => node.treeDirection === 'canopy');
  const rootNodes = nodes.filter(node => node.treeDirection === 'root');
  function directionalRowAverages(directionNodes) {
    return [...new Set(directionNodes.filter(node => Number.isFinite(node.depth)).map(node => node.depth))]
      .sort((a, b) => a - b)
      .map(depth => ({ depth, y: directionNodes.filter(node => node.depth === depth).reduce((sum, node) => sum + node.y, 0) / directionNodes.filter(node => node.depth === depth).length }));
  }
  return {
    count: nodes.length,
    rootY: root.y,
    canopyCount: canopyNodes.length,
    rootCount: rootNodes.length,
    canopyWrongSide: canopyNodes.filter(node => node.y >= root.y).length,
    rootWrongSide: rootNodes.filter(node => node.y <= root.y).length,
    overlaps,
    starterCount: starters.length,
    uniqueStartingStats: uniqueStartingStats.size,
    canopyRows: directionalRowAverages(canopyNodes),
    rootRows: directionalRowAverages(rootNodes),
  };
})()`, context);

assert.ok(layout.count > 100, 'passive graph should preserve the full node set');
assert.strictEqual(layout.canopyCount + layout.rootCount, layout.count - 1, 'every non-root node should belong to a canopy or root branch');
assert.ok(layout.canopyCount > layout.count * 0.25, 'the upper canopy should retain substantial branches');
assert.ok(layout.rootCount > layout.count * 0.25, 'the lower root system should carry substantial branches');
assert.strictEqual(layout.canopyWrongSide, 0, 'canopy branches should remain above the trunk root');
assert.strictEqual(layout.rootWrongSide, 0, 'root branches should continue below the trunk root');
assert.strictEqual(layout.overlaps, 0, 'life-tree remapping should not overlap node hit areas');
assert.strictEqual(layout.uniqueStartingStats, layout.starterCount, 'every root-adjacent starting node should provide a distinct stat');
for (let index = 1; index < layout.canopyRows.length; index++) {
  assert.ok(layout.canopyRows[index].y < layout.canopyRows[index - 1].y, 'deeper canopy rows should grow upward');
}
for (let index = 1; index < layout.rootRows.length; index++) {
  assert.ok(layout.rootRows[index].y > layout.rootRows[index - 1].y, 'deeper root rows should grow downward');
}

vm.runInContext(fs.readFileSync('js/canvas-battlefield.js', 'utf8'), context, { filename: 'js/canvas-battlefield.js' });
const shake = vm.runInContext(`(() => { game.settings.cameraShake = false; battleFx = [{ type: 'hit', start: 900, crit: true }]; return getBattleCameraShake(1000); })()`, context);
assert.strictEqual(Math.abs(shake.x) + Math.abs(shake.y), 0, 'camera shake toggle should fully disable translation');

for (let index = 0; index < 18; index++) {
  assert.ok(fs.existsSync(`assets/background/chaos/endgame-${index}.png`), `chaos backdrop ${index} should exist`);
}
assert.ok(fs.existsSync('assets/background/chaos/loop-final.png'), 'chaos loop-final backdrop should exist');
assert.ok(fs.readFileSync('index.html', 'utf8').includes('id="chk-camera-shake"'), 'settings should expose the camera shake checkbox');
assert.ok(fs.existsSync('assets/ui/passive-node-major-v1.png'), 'generated major passive frame should exist');
assert.ok(fs.existsSync('assets/ui/passive-node-void-v1.png'), 'generated void socket frame should exist');
assert.ok(fs.existsSync('assets/ui/passive-node-star-wedge-v1.png'), 'generated star-wedge socket frame should exist');
assert.ok(fs.existsSync('assets/ui/passive-node-path-v1.png'), 'generated path node frame should exist');
assert.ok(fs.existsSync('assets/ui/window-frame-luxe-v1.png'), 'generated window frame should exist');
const passiveSource = fs.readFileSync('js/passives.js', 'utf8');
assert.ok(passiveSource.includes("const frameKey = getPassiveNodeFrameKey(node)"), 'passive nodes should select their dedicated frame assets');
assert.ok(!passiveSource.includes('if (!lightweightMode && useMajorFrame'), 'drag optimization should not hide passive frame images');
const windowCss = fs.readFileSync('css/ui-game-overhaul.css', 'utf8');
assert.ok(windowCss.includes('border-image-source:'), 'window frame should use nine-slice-style border rendering');
assert.ok(windowCss.includes('> .ui-window-resize'), 'window resize handle should retain an explicit absolute layer');
assert.ok(fs.readFileSync('index.html', 'utf8').includes('id="tutorial-progress-fill"'), 'tutorial modal should expose multi-step progress');
assert.ok(passiveSource.includes('const TUTORIAL_GUIDES ='), 'content tutorials should be backed by structured guides');

console.log('smoke-game-visual-overhaul passed');
