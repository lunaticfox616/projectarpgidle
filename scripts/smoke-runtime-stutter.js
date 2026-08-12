const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const saveSource = fs.readFileSync('js/save.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');

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
    cloudState: { user: { id: 'user-1' }, lastRemoteUpdatedAt: 0, lastRemoteLoop: 0, revisionSupported: false },
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
  const uploadStart = uiSource.indexOf('async function commitCloudSavePayload(payload, legacyBody)');
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

exerciseCloudUpload()
  .then(async () => {
    const requests = [];
    const revisionContext = {
      JSON, Math, Date, console,
      cloudState: { revisionSupported: true, user: { id: 'user-1' }, lastRemoteRevision: 4 },
      getLocalCloudRevision() { return 4; },
      async cloudJsonRequest(path, options) {
        requests.push({ path, options });
        return [{ committed: true, current_revision: 5, saved_at: '2026-07-20T00:00:00Z' }];
      }
    };
    vm.createContext(revisionContext);
    const commitStart = uiSource.indexOf('async function commitCloudSavePayload(payload, legacyBody)');
    const commitEnd = uiSource.indexOf('async function pushCloudSave', commitStart);
    vm.runInContext(uiSource.slice(commitStart, commitEnd), revisionContext, { filename: 'cloud-revision.js' });
    const row = await vm.runInContext('commitCloudSavePayload({ level: 9 })', revisionContext);
    assert.strictEqual(requests[0].path, '/rest/v1/rpc/commit_cloud_save');
    assert.strictEqual(requests[0].options.body.expected_revision, 4);
    assert.strictEqual(requests[0].options.body.next_save_data.level, 9);
    assert.strictEqual(row.revision, 5);

    revisionContext.cloudJsonRequest = async () => [{ committed: false, current_revision: 6 }];
    await assert.rejects(
      vm.runInContext('commitCloudSavePayload({ level: 10 })', revisionContext),
      /다른 기기에서 서버 저장이 변경/
    );
  })
  .then(() => console.log('smoke-runtime-stutter passed'))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
