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
console.log('smoke-passive-shortest-path passed');
