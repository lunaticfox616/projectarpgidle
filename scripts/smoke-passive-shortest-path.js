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
  const groups = nodes.reduce((counts, node) => {
    counts[node.layoutGroup || 'legacy'] = (counts[node.layoutGroup || 'legacy'] || 0) + 1;
    return counts;
  }, {});
  let minimumDistance = Number.POSITIVE_INFINITY;
  let closestPair = null;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const distance = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (distance < minimumDistance) {
        minimumDistance = distance;
        closestPair = [nodes[i].id, nodes[j].id, nodes[i].layoutGroup, nodes[j].layoutGroup];
      }
    }
  }
  return {
    nodeCount: nodes.length,
    edgeCount: PASSIVE_TREE.edges.length,
    axisCount: axisSpokes.size,
    pillarCount: pillarSpokes.size,
    worlds,
    groups,
    minimumDistance,
    closestPair,
    voidNodes: nodes.filter(node => node.kind === 'void').map(node => ({ id: node.id, sector: node.sector })),
    voidToVoidEdges: PASSIVE_TREE.edges.filter(edge => PASSIVE_TREE.nodes[edge.from].kind === 'void' && PASSIVE_TREE.nodes[edge.to].kind === 'void').length,
    defenseBySector: nodes.reduce((out, node) => {
      if (!out[node.sector]) out[node.sector] = { energyShield: 0, evasion: 0, armor: 0 };
      if (['energyShield', 'energyShieldPct'].includes(node.stat)) out[node.sector].energyShield++;
      if (['evasion', 'evasionPct'].includes(node.stat)) out[node.sector].evasion++;
      if (['armor', 'armorPct'].includes(node.stat)) out[node.sector].armor++;
      return out;
    }, {}),
  };
})()`, context);
assert.strictEqual(context.PASSIVE_RADIAL_SCHEMA.sectorCount, 12, 'passive layout should use twelve 30-degree sectors');
assert.strictEqual(context.PASSIVE_RADIAL_SCHEMA.axisCount, 6, 'passive layout should retain six primary axes');
assert.strictEqual(context.PASSIVE_LAYOUT_VERSION, 19, 'regional topology should use a new save-layout version');
assert.strictEqual(context.PASSIVE_FULL_DISCOVERY, true, 'radial layout play-test should begin with the full available tree explored');
assert.deepStrictEqual(Array.from(context.PASSIVE_RADIAL_SCHEMA.worldDepths), [3, 6, 9, 12], 'passive layout should expose four concentric worlds');
assert.strictEqual(radialSummary.nodeCount, 1101, 'radial adaptation should preserve the live passive node count');
assert.ok(radialSummary.edgeCount >= radialSummary.nodeCount - 1 && radialSummary.edgeCount <= 1600, `regional topology should remain connected without visual spaghetti (actual ${radialSummary.edgeCount})`);
assert.strictEqual(radialSummary.groups.heikhal, 9, 'the central heikhal should contain nine surrounding gates');
assert.strictEqual(radialSummary.groups['major-anchor'], 22, 'the light and dark trees should expose twenty-two major anchors');
assert.strictEqual(radialSummary.groups.interworld, 120, 'four worlds should be joined by 120 interworld nodes');
assert.strictEqual(radialSummary.groups['sector-path'], 288, 'twelve sectors should contain 288 boundary path nodes');
assert.strictEqual(radialSummary.groups.axis, 60, 'six inversion axes should contain sixty nodes');
assert.strictEqual(radialSummary.groups['mother-path'], 60, 'three mother-letter bridges should contain sixty nodes');
assert.strictEqual(radialSummary.groups.rim, 72, 'the outer rim should contain seventy-two nodes');
assert.strictEqual(radialSummary.groups.nitzotz, 36, 'the outer light and dark sparks should contain thirty-six nodes');
assert.strictEqual(radialSummary.groups.serpent, 6, 'each specialty sector should contain exactly one separated void node');
assert.strictEqual(new Set(radialSummary.voidNodes.map(node => node.sector)).size, 6, 'void nodes should be distributed one per specialty sector');
assert.strictEqual(radialSummary.voidToVoidEdges, 0, 'void nodes should never connect directly to one another');
assert.ok(radialSummary.defenseBySector.templar.energyShield > radialSummary.defenseBySector.templar.evasion, 'templar sector should favor energy shield over evasion');
assert.ok(radialSummary.defenseBySector.witch.energyShield > radialSummary.defenseBySector.witch.armor, 'witch sector should favor energy shield over armor');
assert.ok(radialSummary.defenseBySector.shadow.evasion > radialSummary.defenseBySector.shadow.armor, `shadow sector should favor evasion over armor: ${JSON.stringify(radialSummary.defenseBySector.shadow)}`);
assert.ok(radialSummary.defenseBySector.ranger.evasion > radialSummary.defenseBySector.ranger.energyShield, 'ranger sector should favor evasion over energy shield');
assert.ok(radialSummary.defenseBySector.duelist.armor > radialSummary.defenseBySector.duelist.energyShield, 'duelist sector should favor armor over energy shield');
assert.ok(radialSummary.defenseBySector.marauder.armor > radialSummary.defenseBySector.marauder.evasion, 'marauder sector should favor armor over evasion');
assert.ok([0, 1, 2, 3].every(world => (radialSummary.worlds[world] || 0) >= 100), 'all four concentric worlds should contain meaningful node populations');
assert.ok(radialSummary.minimumDistance >= 16, `reference layout nodes should retain readable separation (actual ${radialSummary.minimumDistance}, pair ${radialSummary.closestPair})`);
const passiveCanvasSource = fs.readFileSync('js/canvas-passive-tree.js', 'utf8');
assert.ok(passiveCanvasSource.includes('drawPassiveRadialFramework(ctx, lightweightMode, zoomedOutMode)'), 'canvas should render the four rings and twelve-sector framework');

const loopPassiveSummary = vm.runInContext(`({
  base: Object.keys(SEASON_NODES).length,
  head: SEASON_OUROBOROS_HEAD_NODES.length,
  body: SEASON_OUROBOROS_BODY_NODES.length,
  inner: Object.keys(SEASON_INNER_NODES).length,
  completeAtStart: Object.keys(SEASON_NODES).every(id => (game.seasonNodes || []).includes(id)),
})`, context);
assert.strictEqual(loopPassiveSummary.base, 23, 'ouroboros must preserve all twenty-three existing loop passives');
assert.strictEqual(loopPassiveSummary.head, 4, 'ouroboros head must hold four passives');
assert.strictEqual(loopPassiveSummary.body, 19, 'the remaining passives must follow the ouroboros body');
assert.strictEqual(loopPassiveSummary.inner, 6, 'completing the body should expose an additional inner magic-circle layer');
assert.strictEqual(loopPassiveSummary.completeAtStart, false, 'the inner circle must remain locked until all body nodes are allocated');

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
assert.ok(uiSource.includes('ouroboros-passive-tree'), 'loop passive UI should render the ouroboros layout');
assert.ok(uiSource.includes("getSeasonPassiveNodeDef(id)"), 'loop passive UI should share definitions between body and inner nodes');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
assert.ok(combatSource.includes('getSeasonPassiveNodeDef(id)'), 'inner magic-circle passives must contribute to combat stats');
assert.ok(uiSource.includes("const refundedForRadialLayout = (merged.passives || []).filter(id => id !== 'n0').length"), 'old passive allocations should be counted for a one-time radial-layout refund');
assert.ok(uiSource.includes("Number(merged.passiveLayoutVersion || 0) < 19"), 'the regional topology migration should refund allocations from the previous dense layout');
assert.ok(uiSource.includes("merged.passives = ['n0']"), 'old layouts should reset to the root instead of remapping ids to unrelated effects');
const activationHandler = uiSource.slice(uiSource.indexOf('async function activateHoveredPassive'), uiSource.indexOf("canvas.addEventListener('mousedown'", uiSource.indexOf('async function activateHoveredPassive')));
assert.ok(activationHandler.includes('const targetNodeId = targetNode.id;'), 'passive UI should snapshot the target before awaiting confirmation');
assert.ok(activationHandler.includes('activatePassivePath(targetNodeId'), 'confirmed activation should use the snapshotted target instead of the mutable hover node');
console.log('smoke-passive-shortest-path passed');
