const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const saveSource = fs.readFileSync('js/save.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const windowCss = fs.readFileSync('css/ui-windows.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const storageWrites = [];
let scheduledCloudSyncs = 0;
const savedGame = {
  saveMeta: { lastModifiedAt: 10, lastCloudSyncAt: 20, lastCloudUploadProfile: null, cloudUserId: null },
  inventory: [{ id: 1, stats: [{ id: 'flatHp', val: 42 }] }],
  equipment: {},
  timeRift: {},
  runtime: undefined
};
const saveContext = {
  JSON, Math, Number, Date, Set, WeakSet, console,
  LOCAL_SAVE_KEY: 'project-arpg-save',
  LEGACY_SAVE_KEYS: [],
  game: savedGame,
  defaultGame: { saveMeta: { lastModifiedAt: 0, lastCloudSyncAt: 0, lastCloudUploadProfile: null, cloudUserId: null } },
  itemIdCounter: 0,
  cloudState: { configured: false, user: null },
  localStorage: {
    getItem() { return null; },
    setItem(key, value) { storageWrites.push({ key, value }); }
  },
  scheduleCloudAutoSync() { scheduledCloudSyncs += 1; },
  updateCloudSaveUI() {},
  safeExposeGlobals(map) { Object.assign(saveContext, map); }
};
vm.createContext(saveContext);
vm.runInContext(saveSource, saveContext, { filename: 'save-runtime.js' });

assert.strictEqual(saveContext.saveGame({ touchModifiedAt: false }), true, 'autosave should report successful persistence');
assert.strictEqual(storageWrites.length, 1, 'one autosave should perform one storage write');
assert.strictEqual(storageWrites[0].key, 'project-arpg-save');
assert.deepStrictEqual(JSON.parse(storageWrites[0].value), JSON.parse(JSON.stringify(savedGame)), 'persisted JSON should preserve the save state');
assert.strictEqual(scheduledCloudSyncs, 1, 'successful autosave should schedule one cloud sync');

const cloudSample = {
  enemies: [{ id: 10 }], encounterPlan: [{ id: 10 }], encounterIndex: 2, nextEnemyId: 12,
  inventory: [{ id: 4 }], combatLog: ['hit'], recentDamageEvents: [{ value: 1 }],
  playerAilments: Array.from({ length: 50 }, (_, index) => ({ index })),
  playerLeechInstances: Array.from({ length: 90 }, (_, index) => ({ index })),
  enemyConditionDebuffs: { 10: [{ id: 'shock' }] }, realmDeathWard: { amount: 100 }, realmInvulnerableBarrierUntil: 999
};
const cloudRequestBody = saveContext.createCloudSaveRequestBody('user-1', cloudSample);
assert.strictEqual(typeof cloudRequestBody, 'string', 'cloud upload should produce a serialized request body');
const fastCloudBody = JSON.parse(cloudRequestBody);
assert.strictEqual(fastCloudBody.user_id, 'user-1');
assert.deepStrictEqual(fastCloudBody.save_data.inventory, [{ id: 4 }], 'cloud upload should preserve persistent inventory data');
assert.deepStrictEqual(fastCloudBody.save_data.enemies, [], 'cloud upload should omit transient enemies');
assert.deepStrictEqual(fastCloudBody.save_data.combatLog, [], 'cloud upload should omit transient combat logs');
assert.strictEqual(fastCloudBody.save_data.playerAilments.length, 40, 'cloud upload should bound player ailments');
assert.strictEqual(fastCloudBody.save_data.playerLeechInstances.length, 80, 'cloud upload should bound leech instances');
assert.strictEqual(fastCloudBody.save_data.realmDeathWard, null, 'cloud upload should clear transient realm wards');
assert.strictEqual(fastCloudBody.save_data.realmInvulnerableBarrierUntil, 0, 'cloud upload should clear transient realm barriers');
assert.strictEqual(cloudSample.enemies.length, 1, 'building a cloud upload must not mutate the live game state');

const schedulerStart = uiSource.indexOf('function cancelScheduledAutoSave()');
const schedulerEnd = uiSource.indexOf('function renderBattlefieldThrottled', schedulerStart);
const idleJobs = [];
let autosaveRuns = 0;
const schedulerContext = {
  autoSaveIdleHandle: null,
  isStartupOverlayOpen() { return false; },
  isLoadingOverlayOpen() { return false; },
  saveGame() { autosaveRuns += 1; },
  requestIdleCallback(callback, options) {
    idleJobs.push({ callback, options });
    return idleJobs.length;
  },
  cancelIdleCallback() {},
  setTimeout,
  clearTimeout
};
vm.createContext(schedulerContext);
vm.runInContext(uiSource.slice(schedulerStart, schedulerEnd), schedulerContext, { filename: 'autosave-scheduler.js' });
vm.runInContext('scheduleAutoSaveWhenIdle(); scheduleAutoSaveWhenIdle();', schedulerContext);
assert.strictEqual(idleJobs.length, 1, 'repeated timer ticks should coalesce into one pending idle autosave');
assert.strictEqual(autosaveRuns, 0, 'periodic autosave should not serialize during the active timer tick');
assert.strictEqual(idleJobs[0].options.timeout, 4000, 'idle autosave should retain a bounded deadline');
idleJobs[0].callback();
assert.strictEqual(autosaveRuns, 1, 'the pending autosave should run when the browser becomes idle');
assert.strictEqual(schedulerContext.autoSaveIdleHandle, null, 'the idle slot should be released after saving');

async function exerciseCloudUpload() {
  let capturedRequest = null;
  let localPersistCalls = 0;
  const uploadGame = { ...cloudSample, saveMeta: {}, loopCount: 3 };
  const uploadContext = {
    JSON, Math, Date, console,
    game: uploadGame,
    cloudState: { user: { id: 'user-1' }, lastRemoteUpdatedAt: 0, lastRemoteLoop: 0 },
    canPersistLocalSave() { return true; },
    getLocalSaveStatus() { return { message: '' }; },
    fetchCloudSaveRecord: async () => null,
    shouldBlockLocalPushForRemoteLoop() { return { blocked: false }; },
    persistLocalSave() { localPersistCalls += 1; return true; },
    createCloudSaveRequestBody(userId, sourceGame) { return saveContext.createCloudSaveRequestBody(userId, sourceGame); },
    async cloudJsonRequest(path, options) { capturedRequest = { path, options }; return [{ updated_at: '2026-07-19T00:00:00Z' }]; },
    ensureSaveMeta() { if (!uploadGame.saveMeta) uploadGame.saveMeta = {}; },
    markCurrentSaveCloudOwner() { uploadGame.saveMeta.cloudUserId = 'user-1'; return true; },
    getSaveLoopNumber() { return 3; },
    rememberCloudUploadProfile() {},
    updateCloudSaveUI() {},
    setCloudMessage() {}
  };
  vm.createContext(uploadContext);
  const uploadStart = uiSource.indexOf('async function pushCloudSave(options = {})');
  const uploadEnd = uiSource.indexOf('async function pullCloudSave', uploadStart);
  vm.runInContext(uiSource.slice(uploadStart, uploadEnd), uploadContext, { filename: 'cloud-upload.js' });

  const uploadedRow = await vm.runInContext('pushCloudSave({ touchModifiedAt: false })', uploadContext);
  assert.strictEqual(uploadedRow.updated_at, '2026-07-19T00:00:00Z');
  assert.strictEqual(capturedRequest.path, '/rest/v1/cloud_saves');
  assert.strictEqual(capturedRequest.options.method, 'POST');
  assert.strictEqual(capturedRequest.options.headers['Content-Type'], 'application/json');
  assert.strictEqual(typeof capturedRequest.options.body, 'string', 'cloud transport should receive the serialized body');
  assert.strictEqual(JSON.parse(capturedRequest.options.body).user_id, 'user-1');
  assert.strictEqual(localPersistCalls, 3, 'cloud upload should persist before upload and after sync metadata updates');
}

assert(windowCss.includes('max-height: none'), 'trait enemy cards should grow with their status rows');
assert(windowCss.includes('.enemy-traits { display: block') && windowCss.includes('white-space: normal'), 'enemy traits should wrap instead of being clipped to one line');
assert(windowCss.includes('.enemy-ailments { display: block') && windowCss.includes('overflow-wrap: anywhere'), 'enemy status effects should remain readable with long labels');
assert(windowCss.includes('#enemy-area') && windowCss.includes('top: 24px') && windowCss.includes('z-index: 24'), 'the enemy health card should sit above the progress panel');
const overhaulCss = fs.readFileSync('css/ui-game-overhaul.css', 'utf8');
assert(overhaulCss.includes('#enemy-area { top: 24px; z-index: 24'), 'the final dark-mode override must keep the enemy HUD above progress');
assert(!html.includes('\u{1F9ED} 진행도'), 'the initial progress label should not show a compass emoji');
assert(!uiSource.includes('\u{1F6B6} 다음 구간 준비'), 'the next-area preparation label should not show a walking emoji');
assert(!uiSource.includes('\u{1F9ED} 진행도'), 'the live progress label should not restore a compass emoji');
assert(html.includes('css/ui-windows.css?v=20260722-map-action-native-tab1'), 'enemy HUD and shared font CSS cache must refresh');
assert(html.includes('css/ui-game-overhaul.css?v=20260722-inventory-expansion1'), 'the inventory expansion layout CSS cache must refresh');
assert(html.includes('js/ui.js?v=20260722-map-action-native-tab1'), 'the native map action tab runtime cache must refresh');
assert(html.includes('js/state.js?v=20260722-cloud-account-isolation1'), 'the cloud ownership state cache must refresh');
assert(html.includes('js/save.js?v=20260719-stutter-fix1'), 'save runtime cache must refresh');

exerciseCloudUpload()
  .then(() => console.log('smoke-runtime-stutter passed'))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
