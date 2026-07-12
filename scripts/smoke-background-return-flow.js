const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const source = fs.readFileSync('js/ui.js', 'utf8');
const start = source.indexOf('const BACKGROUND_PROGRESS_RATE = 0.1;');
const end = source.indexOf('function syncLoop10PanelCopies', start);
assert(start >= 0 && end > start, 'background progress block not found');
let timeouts = [];
const body = {
  appended: [],
  appendChild(node) { this.appended.push(node); node.parent = this; },
};
const nodes = { body };
function makeNode(tag) {
  return {
    tag,
    id: '',
    className: '',
    innerHTML: '',
    textContent: '',
    removed: false,
    remove() { this.removed = true; if (this.id) delete nodes[this.id]; },
  };
}
const context = {
  console,
  setTimeout: fn => { timeouts.push(fn); return timeouts.length; },
  requestAnimationFrame: fn => { context.rafCount += 1; fn(); return context.rafCount; },
  performance: { now: () => { context.perf += 4; return context.perf; } },
  Date: { now: () => context.now },
  now: 0,
  perf: 0,
  rafCount: 0,
  document: {
    body,
    getElementById(id) { return nodes[id] || null; },
    createElement(tag) {
      const node = makeNode(tag);
      Object.defineProperty(node, 'id', {
        get() { return this._id || ''; },
        set(value) { this._id = value; if (value) nodes[value] = this; }
      });
      return node;
    },
  },
  game: {},
  mergeDefaults: state => state,
  updateStaticUI: () => { context.updated = (context.updated || 0) + 1; },
  renderBattlefield: force => { context.rendered.push(force); },
  scheduleStableResize: () => { context.resized = (context.resized || 0) + 1; },
  syncBattleTabLayout: () => { context.synced = (context.synced || 0) + 1; },
  runUiCoreLoop: () => {
    context.observedNow.push(context.Date.now());
    context.game.exp += 1;
    context.game.killsInZone += 1;
    if (context.killAfter && context.game.exp >= context.killAfter) context.game.playerHp = 0;
  },
  observedNow: [],
  rendered: [],
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);
async function flushTimers() {
  while (timeouts.length) {
    const pending = timeouts;
    timeouts = [];
    pending.forEach(fn => fn());
    await Promise.resolve();
  }
}
(async () => {
  context.game = { currentZoneId: 1, playerHp: 100, combatHalted: false, enemies: [{ hp: 5 }], encounterPlan: [], moveTimer: 0, currencies: {}, inventory: [], exp: 0, killsInZone: 0 };
  vm.runInContext('recordBackgroundCombatEntry(1000)', context);
  const promise = vm.runInContext('startBackgroundCombatReturn(11 * 60 * 1000)', context);
  await flushTimers();
  assert.strictEqual(await promise, true, 'background return should complete');
  assert(context.resized > 0, 'canvas resize should happen before replay');
  assert(context.rendered.includes(true), 'battlefield should be force-rendered before replay');
  assert(context.rafCount > 0, 'return flow should yield at least one frame');
  assert(context.observedNow.length > 0, 'combat steps should run');
  const onceExp = context.game.exp;
  assert.strictEqual(await vm.runInContext('startBackgroundCombatReturn(12 * 60 * 1000)', context), false, 'same elapsed time should not apply twice');
  assert.strictEqual(context.game.exp, onceExp, 'duplicate return should not grant rewards');

  context.killAfter = 3;
  context.game = { currentZoneId: 1, playerHp: 100, combatHalted: false, enemies: [{ hp: 5 }], encounterPlan: [], moveTimer: 0, currencies: {}, inventory: [], exp: 0, killsInZone: 0 };
  vm.runInContext('recordBackgroundCombatEntry(1000)', context);
  const deathPromise = vm.runInContext('startBackgroundCombatReturn(11 * 60 * 1000)', context);
  await flushTimers();
  assert.strictEqual(await deathPromise, true);
  assert.strictEqual(context.game.playerHp, 0, 'death during replay should be preserved');
  assert(context.game.exp < onceExp, 'death should stop remaining background chunks');
  console.log('smoke-background-return-flow passed');
})().catch(error => { console.error(error); process.exit(1); });
