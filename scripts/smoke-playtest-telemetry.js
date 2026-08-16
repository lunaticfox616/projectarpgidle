const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { webcrypto } = require('crypto');

const source = fs.readFileSync('js/playtest-telemetry.js', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');
const listeners = new Map();
const requests = [];
const storage = new Map();
let requestFailure = null;

const context = {
  console, Date, Math, Number, String, Array, Object, Set, JSON, Uint8Array,
  crypto: webcrypto,
  cloudState: { user: null },
  game: { season: 8, currentZoneId: 4, ascendClass: 'gladiator', selectedHeroId: 'hero2', activeSkill: '연속 베기' },
  gameplayStarted: true,
  battleFx: [],
  battleVisualState: { skillEffects: [], damageTexts: [] },
  document: { hidden: false, querySelector: () => ({ content: 'test-build' }), addEventListener() {} },
  navigator: { clipboard: { writeText: async () => {} } },
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame() {},
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, value); }
  },
  getPlayerStats: () => ({ totalDps: 12345, sSkill: { ele: 'fire' } }),
  calculatePlayerEhpProfile: () => ({ elements: {
    phys: { entropy: 8000 }, fire: { entropy: 9000 }, cold: { entropy: 8500 },
    light: { entropy: 8200 }, chaos: { entropy: 7000 }
  } }),
  async cloudJsonRequest(path, options) {
    requests.push({ path, options });
    if (requestFailure) throw requestFailure;
    return null;
  },
  addLog() {},
  safeExposeGlobals(map) { Object.assign(context, map); }
};
context.window = {
  addEventListener(name, callback) {
    if (!listeners.has(name)) listeners.set(name, []);
    listeners.get(name).push(callback);
  },
  dispatchEvent(event) {
    (listeners.get(event.type) || []).forEach(callback => callback(event));
  }
};

vm.createContext(context);
vm.runInContext(source, context, { filename: 'playtest-telemetry.js' });

function dispatch(type, detail) {
  context.window.dispatchEvent({ type, detail });
}

async function flushAsyncWrites() {
  await new Promise(resolve => setImmediate(resolve));
}

async function run() {
  dispatch('project-idle:encounter-started', { zoneId: 4, zoneType: 'act' });
  dispatch('project-idle:encounter-finished', { zoneId: 4, zoneType: 'act' });
  await flushAsyncWrites();
  assert.strictEqual(requests.length, 0, 'guest play must never send telemetry');

  context.cloudState.user = { id: 'user-1' };
  dispatch('project-idle:encounter-started', { zoneId: 4, zoneType: 'act' });
  dispatch('project-idle:encounter-finished', { zoneId: 4, zoneType: 'act' });
  await flushAsyncWrites();
  assert.strictEqual(requests.length, 1, 'one completed authenticated run should send one summary');
  assert.strictEqual(requests[0].path, '/rest/v1/playtest_runs');
  assert.strictEqual(requests[0].options.body.ascend_class, 'gladiator');
  assert.strictEqual(requests[0].options.body.dps, 12345);
  assert.strictEqual(requests[0].options.body.ehp_min, 7000);
  assert.strictEqual(requests[0].options.body.skill_element, 'fire');
  assert.strictEqual(requests[0].options.body.result, 'clear');
  assert.ok(!Object.hasOwn(requests[0].options.body, 'user_id'), 'the server must derive user_id from auth.uid()');
  assert.ok(!Object.hasOwn(requests[0].options.body, 'ghost_snapshot'),
    'playtest analytics must stay independent from direct ghost registration');

  dispatch('project-idle:encounter-started', { zoneId: 4, zoneType: 'act', background: true });
  dispatch('project-idle:encounter-finished', { zoneId: 4, zoneType: 'act', background: true });
  await flushAsyncWrites();
  assert.strictEqual(requests.length, 1, 'background settlement must not create fake playtest runs');

  dispatch('project-idle:encounter-started', {
    zoneId: 'colony_run', zoneType: 'colony', contentContext: { wave: 17 }
  });
  dispatch('project-idle:movement-started', {});
  await flushAsyncWrites();
  assert.strictEqual(requests.length, 2, 'leaving an active special encounter should record one abandon');
  assert.strictEqual(requests[1].options.body.result, 'abandon');
  assert.deepStrictEqual(requests[1].options.body.content_context, { wave: 17 });

  context.window.dispatchEvent({ type: 'error', error: new Error('test runtime failure'), filename: '/js/combat.js' });
  await flushAsyncWrites();
  assert.strictEqual(requests.length, 3, 'authenticated runtime errors should send one bounded report');
  assert.strictEqual(requests[2].path, '/rest/v1/client_error_reports');
  assert.strictEqual(requests[2].options.body.message, 'test runtime failure');
  assert.ok(!JSON.stringify(requests[2].options.body.context).includes('user-1'), 'diagnostics must omit account identifiers');

  requestFailure = new Error('PLAYTEST_DAILY_LIMIT');
  dispatch('project-idle:encounter-started', { zoneId: 5, zoneType: 'act' });
  dispatch('project-idle:encounter-finished', { zoneId: 5, zoneType: 'act' });
  await flushAsyncWrites();
  const requestsAfterLimit = requests.length;
  requestFailure = null;
  dispatch('project-idle:encounter-started', { zoneId: 6, zoneType: 'act' });
  dispatch('project-idle:encounter-finished', { zoneId: 6, zoneType: 'act' });
  await flushAsyncWrites();
  assert.strictEqual(requests.length, requestsAfterLimit,
    'server daily limit should stop repeated playtest run writes for the rest of the UTC day');
}

assert(indexSource.includes('js/playtest-telemetry.js?v=20260816-telemetry-separation1'),
  'telemetry separation must use a fresh browser cache key');

run()
  .then(() => console.log('smoke-playtest-telemetry passed'))
  .catch(error => { console.error(error); process.exitCode = 1; });
