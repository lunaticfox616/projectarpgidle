#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function createBrowserContext() {
  const context = {
    console,
    Date,
    Math: Object.create(Math),
    JSON,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Array,
    Object,
    Number,
    String,
    Boolean,
    RegExp,
    Promise,
    performance: { now: () => 0 },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {},
    Image: function Image() {},
    Audio: function Audio() {},
    addLog(message) { context.lastLog = message; },
    confirm() { context.confirmCalls = (context.confirmCalls || 0) + 1; return context.confirmResult; },
    updateStaticUI() {},
    markPassiveRenderCacheDirty() {},
    queueTutorialNotice() {},
    unlockJournalEntry() {},
    getExpertLevel() { return 15; },
    addEventListener() {},
    removeEventListener() {}
  };
  context.Math.random = () => 0.42;
  context.window = context;
  context.globalThis = context;
  context.navigator = {};
  context.location = {};
  context.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  context.document = {
    addEventListener() {},
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
      style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      appendChild() {},
      remove() {},
      addEventListener() {},
      removeEventListener() {},
      setAttribute() {},
      getAttribute: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      getContext: () => null
    }),
    body: { appendChild() {}, classList: { add() {}, remove() {}, toggle() {} } },
    documentElement: { style: {}, classList: { add() {}, remove() {}, toggle() {} } }
  };
  return vm.createContext(context);
}

function loadRuntime(context) {
  [
    'data/constants.js',
    'data/maps.js',
    'data/skills.js',
    'data/items.js',
    'data/passives.js',
    'data/bosses.js',
    'data/rewards.js',
    'js/utils.js',
    'js/state.js',
    'js/passives.js',
    'js/ui.js'
  ].forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }));
}

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
assert(uiSource.includes('function openVoidPassiveCraftOverlay(nodeId)'), 'void passive crafting must be opened from a dedicated overlay');
assert(uiSource.includes('refundVoidPassiveFromOverlay'), 'void passive overlay must own the refund action');
assert(uiSource.includes('function askRefundPassiveNode(id)'), 'regular passive refunds must keep a confirmation wrapper');
assert(uiSource.includes('return askRefundPassiveNode(hoverNode.id);'), 'regular passive clicks must use the confirmation wrapper');
assert(!uiSource.includes('전직 패시브를 반환하시겠습니까?'), 'normal passive refunds must not show the ascend-passive confirmation text');
assert(!uiSource.includes('onclick="applyVoidPassiveCurrency'), 'void passive orb buttons must not be embedded directly in the canvas tooltip');

const context = createBrowserContext();
loadRuntime(context);
vm.runInContext('game = JSON.parse(JSON.stringify(defaultGame)); window.game = game;', context);
context.game.passives = ['n0'];
context.game.currencies = { ...context.game.currencies, transmute: 1, augment: 1, alteration: 1 };

const voidNodes = Object.values(context.PASSIVE_TREE.nodes).filter(node => node.kind === 'void');
assert.strictEqual(voidNodes.length, 16, 'one void passive must exist on each central spoke');
assert.strictEqual(new Set(voidNodes.map(node => node.webSpoke)).size, 16, 'void passives must occupy distinct straight spokes');
assert(voidNodes.every(node => node.webRing >= 3), 'void passives must be at least two nodes away from the center');
assert(voidNodes.every(node => !node.clusterId), 'void passives must reuse straight-path nodes instead of changing cluster structure');
assert(voidNodes.every(node => node.legacyVoidStat && Number.isFinite(Number(node.legacyVoidVal))), 'void passives must retain their legacy stat for save migration');
assert(voidNodes.every(node => context.isStarWedgeNodeMutable(node) === false), 'void passives must not be mutable by star wedges');
assert(voidNodes.every(node => context.getPassiveEffectLabel(node).includes('공허 옵션 없음')), 'uncrafted void passives must start with no effect');

const node = voidNodes[0];

const refundableNodeId = context.PASSIVE_TREE.edges.find(edge => edge.from === 'n0' || edge.to === 'n0');
const regularNodeId = refundableNodeId.from === 'n0' ? refundableNodeId.to : refundableNodeId.from;
context.game.passives = ['n0', regularNodeId];
context.game.currencies.scour = 2;
context.confirmResult = false;
context.askRefundPassiveNode(regularNodeId);
assert(context.game.passives.includes(regularNodeId), 'declining the regular passive refund confirmation must keep the node allocated');
assert.strictEqual(context.game.currencies.scour, 2, 'declining the regular passive refund confirmation must not spend scour');
context.confirmResult = true;
context.askRefundPassiveNode(regularNodeId);
assert(!context.game.passives.includes(regularNodeId), 'accepting the regular passive refund confirmation must refund the node');
assert.strictEqual(context.game.currencies.scour, 1, 'accepting the regular passive refund confirmation must spend one scour');

function getPathToNode(nodeId) {
  const previous = { n0: null };
  const queue = ['n0'];
  while (queue.length > 0 && !Object.prototype.hasOwnProperty.call(previous, nodeId)) {
    const current = queue.shift();
    context.PASSIVE_TREE.edges.forEach(edge => {
      const next = edge.from === current ? edge.to : (edge.to === current ? edge.from : null);
      if (next && !Object.prototype.hasOwnProperty.call(previous, next)) {
        previous[next] = current;
        queue.push(next);
      }
    });
  }
  const path = [];
  let current = nodeId;
  while (current) {
    path.push(current);
    current = previous[current];
  }
  return path.reverse();
}

const passiveLayoutVersion = vm.runInContext('PASSIVE_LAYOUT_VERSION', context);
const legacyPath = getPathToNode(node.id);
const migrated = context.mergeDefaults({ saveVersion: 16, passiveLayoutVersion, passives: legacyPath });
assert(migrated.passives.includes(node.id), 'legacy allocated void passive should remain allocated after save normalization');
assert.strictEqual(migrated.voidPassives[node.id].stats[0].id, node.legacyVoidStat, 'legacy allocated void passive must keep its previous stat as a crafted line');
assert.strictEqual(migrated.voidPassives[node.id].stats[0].val, node.legacyVoidVal, 'legacy allocated void passive must keep its previous value as a crafted line');

context.applyVoidPassiveCurrency(node.id, 'transmute');
assert.strictEqual(context.game.currencies.transmute, 1, 'unallocated void passive must reject currency use');
context.game.passives.push(node.id);
assert.strictEqual(typeof context.openVoidPassiveCraftOverlay, 'function', 'void passive craft overlay opener must be globally callable');
context.applyVoidPassiveCurrency(node.id, 'transmute');
assert.strictEqual(context.game.currencies.transmute, 0, 'transmute must be consumed by an allocated void passive');
assert.strictEqual(context.getVoidPassiveCraft(node.id).stats.length, 1, 'transmute must add one void passive option');
context.applyVoidPassiveCurrency(node.id, 'augment');
assert.strictEqual(context.game.currencies.augment, 0, 'augment must be consumed by a one-line void passive');
assert.strictEqual(context.getVoidPassiveCraft(node.id).stats.length, 2, 'augment must add the second void passive option');
const beforeAlteration = context.getVoidPassiveCraft(node.id).stats.map(line => line.id).join('|');
context.applyVoidPassiveCurrency(node.id, 'alteration');
assert.strictEqual(context.game.currencies.alteration, 0, 'alteration must be consumed by a crafted void passive');
assert.strictEqual(context.getVoidPassiveCraft(node.id).stats.length, 2, 'alteration must preserve the magic line count up to two lines');
assert(vm.runInContext(`getVoidPassiveCraft('${node.id}').stats.every(line => P_STATS[line.id])`, context), 'void passive options must use valid passive stats');
assert(beforeAlteration.length > 0, 'pre-alteration crafted state must be observable');

context.game.starWedge.unlocked = true;
context.assignStarWedgeSockets();
const hubs = Object.values(context.PASSIVE_TREE.nodes).filter(node => node.kind === 'hub');
assert(hubs.length > 0, 'passive tree must contain star wedge slot nodes');
assert(hubs.every(node => node.title === '별쐐기 슬롯'), 'star wedge hub naming must be unified to slot naming');
assert(hubs.every(node => node.socketType === 'star_wedge'), 'every star wedge slot candidate must accept star wedges after unlock');

console.log('void passive and star wedge slot smoke checks passed');
