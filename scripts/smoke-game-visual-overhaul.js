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
  return { count: nodes.length, rootY: root.y, aboveRoot: nodes.filter(node => node.id !== root.id && node.y < root.y).length, overlaps };
})()`, context);

assert.ok(layout.count > 100, 'passive graph should preserve the full node set');
assert.strictEqual(layout.aboveRoot, layout.count - 1, 'every branch should grow upward from the root');
assert.strictEqual(layout.overlaps, 0, 'life-tree remapping should not overlap node hit areas');

vm.runInContext(fs.readFileSync('js/canvas-battlefield.js', 'utf8'), context, { filename: 'js/canvas-battlefield.js' });
const shake = vm.runInContext(`(() => { game.settings.cameraShake = false; battleFx = [{ type: 'hit', start: 900, crit: true }]; return getBattleCameraShake(1000); })()`, context);
assert.strictEqual(Math.abs(shake.x) + Math.abs(shake.y), 0, 'camera shake toggle should fully disable translation');

for (let index = 0; index < 18; index++) {
  assert.ok(fs.existsSync(`assets/background/chaos/endgame-${index}.png`), `chaos backdrop ${index} should exist`);
}
assert.ok(fs.existsSync('assets/background/chaos/loop-final.png'), 'chaos loop-final backdrop should exist');
assert.ok(fs.readFileSync('index.html', 'utf8').includes('id="chk-camera-shake"'), 'settings should expose the camera shake checkbox');

console.log('smoke-game-visual-overhaul passed');
