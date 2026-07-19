const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const saveSource = fs.readFileSync('js/save.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const passiveSource = fs.readFileSync('js/passives.js', 'utf8');
const windowCss = fs.readFileSync('css/ui-windows.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert(saveSource.includes('function serializeSaveState(sourceGame)'), 'local saves should have a single-pass serializer');
assert(saveSource.includes('localStorage.setItem(LOCAL_SAVE_KEY, serializeSaveState(game))'), 'autosave must not deep-clone and then re-stringify the entire game');
assert(!saveSource.includes('localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(createSaveSnapshot(game)))'), 'the previous double serialization path must stay removed');

const serializerStart = saveSource.indexOf('function serializeSaveState');
const serializerEnd = saveSource.indexOf('function createCloudSavePayload', serializerStart);
const serializerContext = { JSON, game: null };
vm.createContext(serializerContext);
vm.runInContext(saveSource.slice(serializerStart, serializerEnd), serializerContext, { filename: 'save-single-pass.js' });
const sample = { inventory: [{ id: 1, stats: [{ id: 'flatHp', val: 42 }] }], runtime: undefined };
assert.deepStrictEqual(JSON.parse(serializerContext.serializeSaveState(sample)), JSON.parse(JSON.stringify(sample)), 'single-pass save output must preserve JSON save semantics');

const cloudContext = {
  JSON, Math, Number, Date, Set, WeakSet, console,
  game: {},
  defaultGame: { saveMeta: {} },
  safeExposeGlobals(map) { Object.assign(cloudContext, map); }
};
vm.createContext(cloudContext);
vm.runInContext(saveSource, cloudContext, { filename: 'save-cloud-fast-path.js' });
const cloudSample = {
  enemies: [{ id: 10 }], encounterPlan: [{ id: 10 }], encounterIndex: 2, nextEnemyId: 12,
  inventory: [{ id: 4 }], combatLog: ['hit'], recentDamageEvents: [{ value: 1 }],
  playerAilments: Array.from({ length: 50 }, (_, index) => ({ index })),
  playerLeechInstances: Array.from({ length: 90 }, (_, index) => ({ index })),
  enemyConditionDebuffs: { 10: [{ id: 'shock' }] }, realmDeathWard: { amount: 100 }, realmInvulnerableBarrierUntil: 999
};
const legacyCloudPayload = cloudContext.createCloudSavePayload(cloudSample);
const fastCloudBody = JSON.parse(cloudContext.createCloudSaveRequestBody('user-1', cloudSample));
assert.strictEqual(fastCloudBody.user_id, 'user-1');
assert.strictEqual(JSON.stringify(fastCloudBody.save_data), JSON.stringify(legacyCloudPayload), 'single-pass cloud body must preserve the existing sanitized payload contract');
assert(uiSource.includes("if (typeof createCloudSaveRequestBody === 'function')"), 'cloud autosave should use the single-pass request body fast path');
assert(uiSource.includes('body: requestBody'), 'cloud transport should not stringify the full payload again');

assert(passiveSource.includes('let autoSaveIdleHandle = null;'), 'autosave scheduling should track one pending idle job');
assert(uiSource.includes('function scheduleAutoSaveWhenIdle()'), 'periodic autosaves should be deferred to an idle window');
assert(uiSource.includes("requestIdleCallback(run, { timeout: 4000 })"), 'idle autosaves should retain a bounded fallback deadline');
assert(uiSource.includes('autoSaveHandle = setInterval(() => {\n            scheduleAutoSaveWhenIdle();'), 'the periodic timer should schedule instead of serializing immediately');

assert(windowCss.includes('max-height: none'), 'trait enemy cards should grow with their status rows');
assert(windowCss.includes('.enemy-traits { display: block') && windowCss.includes('white-space: normal'), 'enemy traits should wrap instead of being clipped to one line');
assert(windowCss.includes('.enemy-ailments { display: block') && windowCss.includes('overflow-wrap: anywhere'), 'enemy status effects should remain readable with long labels');
assert(windowCss.includes('#enemy-area') && windowCss.includes('top: 44px'), 'the enemy health card should sit higher in the battle viewport');
const overhaulCss = fs.readFileSync('css/ui-game-overhaul.css', 'utf8');
assert(overhaulCss.includes('#enemy-area { top: 48px'), 'the final dark-mode override must preserve the raised enemy HUD position');
assert(!html.includes('\u{1F9ED} 진행도'), 'the initial progress label should not show a compass emoji');
assert(!uiSource.includes('\u{1F6B6} 다음 구간 준비'), 'the next-area preparation label should not show a walking emoji');
assert(!uiSource.includes('\u{1F9ED} 진행도'), 'the live progress label should not restore a compass emoji');
assert(html.includes('css/ui-windows.css?v=20260719-enemy-hud2'), 'enemy HUD CSS cache must refresh');
assert(html.includes('css/ui-game-overhaul.css?v=20260719-enemy-hud2'), 'the final combat layout CSS cache must refresh');
assert(html.includes('js/ui.js?v=20260719-enemy-hud2'), 'the progress label runtime cache must refresh');
assert(html.includes('js/save.js?v=20260719-stutter-fix1'), 'save runtime cache must refresh');

console.log('smoke-runtime-stutter passed');
