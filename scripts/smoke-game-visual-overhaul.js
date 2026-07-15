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
  const placementFields = new Set(['x', 'y', 'angle', 'treeDepth', 'treeDirection', 'treeBranchRoot', 'treeBranchOrder']);
  function contentSnapshot() {
    return JSON.stringify(Object.values(PASSIVE_TREE.nodes)
      .sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }))
      .map(node => Object.fromEntries(Object.keys(node)
        .filter(key => !placementFields.has(key))
        .sort()
        .map(key => [key, node[key]]))));
  }
  const contentBefore = contentSnapshot();
  const edgesBefore = JSON.stringify(PASSIVE_TREE.edges);
  shapePassiveTreeAsLifeTree();
  const contentPreserved = contentBefore === contentSnapshot() && edgesBefore === JSON.stringify(PASSIVE_TREE.edges);
  let overlaps = 0;
  let minimumClearance = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const radiusSum = getPassiveNodeVisualRadius(a) + getPassiveNodeVisualRadius(b);
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      minimumClearance = Math.min(minimumClearance, distance - radiusSum);
      if (distance < radiusSum + 3) overlaps++;
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
    edgeCount: PASSIVE_TREE.edges.length,
    contentPreserved,
    rootY: root.y,
    canopyCount: canopyNodes.length,
    rootCount: rootNodes.length,
    canopyWrongSide: canopyNodes.filter(node => node.y >= root.y).length,
    rootWrongSide: rootNodes.filter(node => node.y <= root.y).length,
    overlaps,
    minimumClearance,
    canopyBranchCount: new Set(canopyNodes.map(node => node.treeBranchRoot)).size,
    rootBranchCount: new Set(rootNodes.map(node => node.treeBranchRoot)).size,
    aspectRatio: (PASSIVE_BOUNDS.maxX - PASSIVE_BOUNDS.minX) / (PASSIVE_BOUNDS.maxY - PASSIVE_BOUNDS.minY),
    trunkSplit: (root.y - PASSIVE_BOUNDS.minY) / (PASSIVE_BOUNDS.maxY - PASSIVE_BOUNDS.minY),
    starterCount: starters.length,
    uniqueStartingStats: uniqueStartingStats.size,
    canopyRows: directionalRowAverages(canopyNodes),
    rootRows: directionalRowAverages(rootNodes),
  };
})()`, context);

assert.strictEqual(layout.count, 1101, 'life-tree remapping should preserve all passive nodes from main');
assert.strictEqual(layout.edgeCount, 1353, 'life-tree remapping should preserve every passive connection from main');
assert.strictEqual(layout.contentPreserved, true, 'life-tree remapping must not alter node effects or graph data');
assert.strictEqual(layout.canopyCount + layout.rootCount, layout.count - 1, 'every non-root node should belong to a canopy or root branch');
assert.ok(layout.canopyCount > layout.count * 0.25, 'the upper canopy should retain substantial branches');
assert.ok(layout.rootCount > layout.count * 0.25, 'the lower root system should carry substantial branches');
assert.strictEqual(layout.canopyWrongSide, 0, 'canopy branches should remain above the trunk root');
assert.strictEqual(layout.rootWrongSide, 0, 'root branches should continue below the trunk root');
assert.strictEqual(layout.overlaps, 0, 'life-tree remapping should not overlap node hit areas');
assert.ok(layout.minimumClearance >= 18, 'passive nodes should retain comfortable visual spacing');
assert.strictEqual(layout.canopyBranchCount, 5, 'the canopy should preserve five readable major branches');
assert.strictEqual(layout.rootBranchCount, 3, 'the lower tree should preserve three readable root paths');
assert.ok(layout.aspectRatio >= 0.42 && layout.aspectRatio <= 0.65, 'the full passive tree should keep a tall reference-like silhouette');
assert.ok(layout.trunkSplit >= 0.38 && layout.trunkSplit <= 0.56, 'the trunk junction should remain near the visual center');
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
const impactFeedback = vm.runInContext(`(() => {
  game.enemies = [{ id: 'feedback-target', hp: 0, maxHp: 100, lastOverkillDamage: 35 }];
  battleFx = [];
  addBattleFx('playerSwing', { projectile: false, duration: 600 });
  addBattleFx('hit', { enemyId: 'feedback-target', damage: 100, duration: 320, syncToSwing: true });
  addBattleFx('enemyDeath', { enemyId: 'feedback-target', duration: 600 });
  addBattleFx('hit', { enemyId: 'independent-target', damage: 10, duration: 220, syncToSwing: false });
  return { swing: battleFx[0], hit: battleFx[1], death: battleFx[2], independent: battleFx[3] };
})()`, context);
assert.ok(impactFeedback.hit.start > impactFeedback.swing.start, 'hit feedback should wait for the attack impact frame');
assert.strictEqual(impactFeedback.hit.impactTier, 'annihilate', '100%+ raw damage should use annihilation feedback');
assert.strictEqual(impactFeedback.death.start, impactFeedback.hit.start, 'death feedback should stay on the same impact frame');
assert.strictEqual(impactFeedback.independent.start, impactFeedback.independent.queuedAt, 'summon, reflect, and delayed hits should not attach to the player swing');

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
assert.ok(windowCss.includes('z-index: 6;'), 'window frame should render above the window surface');
assert.ok(windowCss.includes('padding: clamp(20px, 1.5vw, 24px);'), 'window content should reserve a text-safe frame inset');
const indexSource = fs.readFileSync('index.html', 'utf8');
assert.ok(indexSource.includes('id="tutorial-dismiss-btn"'), 'tutorial notice should expose a single acknowledgement action');
assert.ok(!indexSource.includes('id="tutorial-progress-fill"'), 'tutorial notice should not use multi-step progress');
assert.ok(!indexSource.includes('id="tutorial-visual"'), 'tutorial notice should keep the actual game screen visible');
assert.ok(!passiveSource.includes('activeTutorial.steps = getTutorialGuide(activeTutorial)'), 'tutorial notices should not expand into illustrated multi-step lessons');
assert.ok(windowCss.includes('#tutorial-overlay.active'), 'tutorial notice should use a compact live-screen presentation');
const battlefieldSource = fs.readFileSync('js/canvas-battlefield.js', 'utf8');
assert.ok(!battlefieldSource.includes('let flashFx = (battleFx || []).find'), 'battlefield rendering should not flash the full screen on impact');
assert.ok(!passiveSource.includes('ctx.roundRect(x - boxW / 2'), 'damage labels should not draw opaque backing boxes');
assert.ok(passiveSource.includes("impactTier = damageRatio >= 1 ? 'annihilate'"), 'combat feedback should classify heavy and annihilating hits');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
assert.ok(combatSource.includes("addBattleFx('levelUp'"), 'player level-ups should create a battlefield effect');
const socialSource = fs.readFileSync('js/social.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const windowManagerSource = fs.readFileSync('js/ui-window-manager.js', 'utf8');
assert.ok(uiSource.includes('.tutorial-overlay.active:not(#tutorial-overlay)'), 'compact tutorial notices should not pause the live battle screen');
assert.ok(!uiSource.includes('if (isTutorialOpen() || isRewardOpen()'), 'compact tutorial notices should keep the game loop running');
assert.ok(windowManagerSource.includes('.tutorial-overlay.active:not(#tutorial-overlay)'), 'compact tutorial notices should not block desktop window interactions');
assert.ok(socialSource.includes('연결이 끝나면 채팅이 이 화면에서 자동으로 열립니다.'), 'chat should show a cloud-session pending state');
assert.ok(uiSource.includes('refreshSocialAfterCloudStateChange'), 'cloud session changes should refresh an already-open chat tab');
assert.ok(uiSource.includes('exitPushStartedAt - lastPageExitCloudPushAt < 1500'), 'page-exit cloud uploads should be deduplicated across lifecycle events');
assert.ok(socialSource.includes('function syncSocialBackgroundTasks()'), 'social timers should follow cloud-session lifetime');
assert.ok(!socialSource.includes('setInterval(() => { if (socialCloudReady() && getMyNickname()) ensureHeartbeat(); }, SOCIAL_HEARTBEAT_MS);\n    // 커뮤니티'), 'social module should not run an eager cloud-ready watcher forever');
assert.ok(passiveSource.includes('data-hero-id="${escapeHTML(id)}"'), 'hero preview cards should expose stable hero ids');
assert.ok(windowCss.includes(".hero-choice[data-hero-id=\"hero2\"]::after { background-image: url('../assets/hero2/hero2_walk.png')"), 'warrior preview should match its battle sprite');
assert.ok(windowCss.includes(".hero-choice[data-hero-id=\"hero7\"]::after { background-image: url('../assets/hero3/hero3_walk.png')"), 'summoner preview should match its reused battle sprite');
assert.ok(windowCss.includes(".hero-choice[data-hero-id=\"hero8\"]::after { background-image: url('../assets/hero2/hero2_walk.png')"), 'guardian preview should match its reused battle sprite');

console.log('smoke-game-visual-overhaul passed');
