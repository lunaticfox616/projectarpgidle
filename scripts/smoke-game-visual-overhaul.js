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
  const rowAverages = [...new Set(nodes.filter(node => Number.isFinite(node.depth)).map(node => node.depth))]
    .sort((a, b) => a - b)
    .map(depth => ({ depth, y: nodes.filter(node => node.depth === depth).reduce((sum, node) => sum + node.y, 0) / nodes.filter(node => node.depth === depth).length }));
  return { count: nodes.length, rootY: root.y, aboveRoot: nodes.filter(node => node.id !== root.id && node.y < root.y).length, overlaps, starterCount: starters.length, uniqueStartingStats: uniqueStartingStats.size, rowAverages };
})()`, context);

assert.ok(layout.count > 100, 'passive graph should preserve the full node set');
assert.strictEqual(layout.aboveRoot, layout.count - 1, 'every branch should grow upward from the root');
assert.strictEqual(layout.overlaps, 0, 'life-tree remapping should not overlap node hit areas');
assert.strictEqual(layout.uniqueStartingStats, layout.starterCount, 'every root-adjacent starting node should provide a distinct stat');
for (let index = 1; index < layout.rowAverages.length; index++) {
  assert.ok(layout.rowAverages[index].y < layout.rowAverages[index - 1].y, 'deeper graph rows should grow upward through the canopy');
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
assert.ok(fs.existsSync('assets/ui/window-frame-luxe-v1.png'), 'generated window frame should exist');
assert.ok(fs.readFileSync('index.html', 'utf8').includes('id="tutorial-progress-fill"'), 'tutorial modal should expose multi-step progress');
assert.ok(fs.readFileSync('js/passives.js', 'utf8').includes('const TUTORIAL_GUIDES ='), 'content tutorials should be backed by structured guides');

console.log('smoke-game-visual-overhaul passed');
