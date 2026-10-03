const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/ui.js', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');
assert.match(indexSource, /js\/ui\.js[^\"]*save-guard=20260826-1/, 'save rollback guard must invalidate cached cloud reconciliation code');

function sourceBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert(start >= 0 && end > start, `Could not extract ${startMarker}`);
  return source.slice(start, end);
}

const ownershipSource = sourceBetween('function getCloudSaveOwnerId', 'function applyExternalSave');
const loopGuardSource = sourceBetween('function getSaveLoopNumber', 'function shouldPreferRemoteOverBootstrapLocal');
const staleGuardSource = sourceBetween('async function guardAgainstStaleLocalOverwrite', 'async function commitCloudSavePayload');
const revisionResolutionSource = sourceBetween('async function resolveCloudRevisionConflict', 'async function reconcileCloudSaveState');
const reconcileSource = sourceBetween('async function reconcileCloudSaveState', 'let cloudSyncTimer');

function createContext(localSave, remoteRecord, flow = {}) {
  const writes = [];
  const confirmations = [];
  const choices = [];
  const detached = [];
  let pushes = 0;
  let fullReads = 0;
  let summaryReads = 0;
  const context = {
    JSON, Math, Number, Date,
    game: JSON.parse(JSON.stringify(localSave)),
    defaultGame: { level: 1, saveMeta: { lastModifiedAt: 0, lastCloudSyncAt: 0, cloudUserId: null, cloudRevision: 0 } },
    cloudState: {
      user: { id: 'account-b' },
      lastRemoteUpdatedAt: 0,
      lastRemoteRevision: remoteRecord && Number.isFinite(Number(remoteRecord.revision)) ? Number(remoteRecord.revision) : 0,
      revisionSupported: !!(remoteRecord && Object.prototype.hasOwnProperty.call(remoteRecord, 'revision'))
    },
    cloneDefaultGame() { return JSON.parse(JSON.stringify(context.defaultGame)); },
    ensureSaveMeta() {
      if (!context.game.saveMeta || typeof context.game.saveMeta !== 'object') context.game.saveMeta = {};
      if (!Number.isFinite(context.game.saveMeta.lastModifiedAt)) context.game.saveMeta.lastModifiedAt = 0;
      if (!Number.isFinite(context.game.saveMeta.lastCloudSyncAt)) context.game.saveMeta.lastCloudSyncAt = 0;
      context.game.saveMeta.cloudRevision = Math.max(0, Math.floor(Number(context.game.saveMeta.cloudRevision) || 0));
    },
    persistLocalSave() { writes.push(JSON.parse(JSON.stringify(context.game))); return true; },
    fetchCloudSaveRecord: async () => {
      fullReads += 1;
      if (remoteRecord && Object.prototype.hasOwnProperty.call(remoteRecord, 'revision')) {
        context.cloudState.lastRemoteRevision = Math.max(0, Math.floor(Number(remoteRecord.revision) || 0));
      }
      return remoteRecord;
    },
    // The upload checks read only this summary (2026-10-03): the full save is read only to pull it.
    fetchCloudSaveSummary: async () => {
      summaryReads += 1;
      if (remoteRecord && Object.prototype.hasOwnProperty.call(remoteRecord, 'revision')) {
        context.cloudState.lastRemoteRevision = Math.max(0, Math.floor(Number(remoteRecord.revision) || 0));
      }
      if (!remoteRecord) return null;
      const save = remoteRecord.save_data || {};
      return { updated_at: remoteRecord.updated_at, revision: remoteRecord.revision, summaryOnly: true,
        save_data: { season: save.season, loopCount: save.loopCount, saveMeta: save.saveMeta || {} } };
    },
    getLocalSaveStamp() { return context.game.saveMeta.lastModifiedAt || 0; },
    getLocalCloudRevision() { context.ensureSaveMeta(); return context.game.saveMeta.cloudRevision; },
    getRemoteSaveStamp(record) { return new Date(record.updated_at).getTime(); },
    applyExternalSave(snapshot) {
      context.game = JSON.parse(JSON.stringify(snapshot));
      context.ensureSaveMeta();
      context.game.saveMeta.cloudUserId = context.cloudState.user.id;
      context.persistLocalSave();
    },
    pushCloudSave: async () => { pushes += 1; },
    requestGameConfirmation: async (message, options) => { confirmations.push({ message, options }); return flow.confirm === true; },
    // Guest save adoption (2026-10-03): the real check has its own smoke (smoke-guest-save-check); here it answers per case.
    guestSaveCheck: { inspect: () => flow.verdict || { ok: true, keys: [], problems: [] } },
    requestGameChoice: async options => { choices.push(options); return flow.fate === undefined ? null : flow.fate; },
    markSkipOAuthRestoreOnce() {},
    clearSupabasePersistedSession() {},
    applyCloudSession(session) { detached.push(session); context.cloudState.user = session ? session.user : null; },
    formatCloudTime(value) { return new Date(value).toISOString(); },
    setCloudMessage() {},
    addLog() {},
    CLOUD_REMOTE_TIME_SKEW_MS: 0,
    CLOUD_STALE_OVERWRITE_GUARD_MS: 5000
  };
  vm.createContext(context);
  vm.runInContext(ownershipSource, context, { filename: 'cloud-ownership.js' });
  vm.runInContext(loopGuardSource, context, { filename: 'cloud-loop-guards.js' });
  vm.runInContext(staleGuardSource, context, { filename: 'cloud-stale-guard.js' });
  vm.runInContext(revisionResolutionSource, context, { filename: 'cloud-revision-resolution.js' });
  vm.runInContext(reconcileSource, context, { filename: 'cloud-reconcile.js' });
  return { context, writes, confirmations, choices, detached, getPushes: () => pushes, getFullReads: () => fullReads, getSummaryReads: () => summaryReads };
}

async function run() {
  const remoteRecord = {
    updated_at: '2026-07-22T00:00:00Z',
    save_data: { level: 7, season: 1, loopCount: 0, maxZoneId: 5, saveMeta: { lastModifiedAt: 100 } }
  };
  const foreignLocal = { level: 99, saveMeta: { lastModifiedAt: 999999, cloudUserId: 'account-a' } };
  const remoteCase = createContext(foreignLocal, remoteRecord);
  const remoteStatus = await vm.runInContext('reconcileCloudSaveState({ strictRemoteResume: true })', remoteCase.context);
  assert.strictEqual(remoteStatus, 'pulled-remote-strict-resume');
  assert.strictEqual(remoteCase.context.game.level, 7, 'a new account must replace the previous account cache with its remote save');
  assert.strictEqual(remoteCase.context.game.saveMeta.cloudUserId, 'account-b', 'the replaced cache must be owned by the active account');
  assert.strictEqual(remoteCase.getPushes(), 0, 'foreign high-progress local data must never be uploaded during account login');
  assert.strictEqual(remoteCase.writes.at(-1).level, 7, 'the local cache must finish with the connected account save');

  const fetchFailureCase = createContext(foreignLocal, remoteRecord);
  fetchFailureCase.context.fetchCloudSaveRecord = async () => { throw new Error('network unavailable'); };
  await assert.rejects(
    vm.runInContext('reconcileCloudSaveState({ strictRemoteResume: true })', fetchFailureCase.context),
    /network unavailable/
  );
  assert.strictEqual(fetchFailureCase.context.game.level, 99, 'a failed cloud lookup must leave the previous local cache untouched');
  assert.strictEqual(fetchFailureCase.context.game.saveMeta.cloudUserId, 'account-a');
  assert.strictEqual(fetchFailureCase.writes.length, 0, 'a failed cloud lookup must not write a blank replacement cache');

  const noRemoteCase = createContext(foreignLocal, null);
  const noRemoteStatus = await vm.runInContext('reconcileCloudSaveState({ createRemoteFromLocal: true })', noRemoteCase.context);
  assert.strictEqual(noRemoteStatus, 'no-remote');
  assert.strictEqual(noRemoteCase.context.game.level, 1, 'a foreign cache must be discarded even when the new account has no remote row');
  assert.strictEqual(noRemoteCase.context.game.saveMeta.cloudUserId, 'account-b');
  assert.strictEqual(noRemoteCase.getPushes(), 0, 'discarded foreign data must not create or overwrite another account save');

  const guestLocal = { level: 42, saveMeta: { lastModifiedAt: 500 } };
  const signupCase = createContext(guestLocal, null);
  const signupStatus = await vm.runInContext('reconcileCloudSaveState({ createRemoteFromLocal: true, allowLocalBootstrap: true })', signupCase.context);
  assert.strictEqual(signupStatus, 'pushed-local');
  assert.strictEqual(signupCase.context.game.level, 42, 'a newly created account may explicitly adopt an unlinked guest save');
  assert.strictEqual(signupCase.context.game.saveMeta.cloudUserId, 'account-b');
  assert.strictEqual(signupCase.getPushes(), 1);
  assert.strictEqual(signupCase.choices.length, 0, 'sign-up moves the guest save without asking');

  // 게스트 저장(2026-10-03): 이메일 인증 뒤 로그인, Google, 카카오는 로그인 경로라 예전에는 게스트 저장을 확인 없이 지웠다.
  // 이제 옮기거나(서버 저장이 없는 계정, 조작 검사 통과), 묻고 지우거나, 계정 연결을 끊고 게스트로 남는다.
  // 따로 남기는 사본은 없어서 게스트 저장 하나가 두 계정으로 갈 수 없다.
  const loginOptions = '{ preferRemoteOnResume: true, strictRemoteResume: true }';
  const login = made => vm.runInContext(`reconcileCloudSaveState(${loginOptions})`, made.context);

  const moveCase = createContext(guestLocal, null, { fate: 'move' });
  assert.strictEqual(await login(moveCase), 'pushed-local');
  assert.strictEqual(moveCase.choices.length, 1, 'a login asks what to do with the guest save');
  assert.match(moveCase.choices[0].message, /레벨 42/);
  assert.strictEqual(moveCase.context.game.level, 42, 'moving makes it the account save');
  assert.strictEqual(moveCase.context.game.saveMeta.cloudUserId, 'account-b', 'marked, so it can never move to another account');
  assert.strictEqual(moveCase.getPushes(), 1, 'and it goes up as the first cloud save');

  const discardCase = createContext(guestLocal, null, { fate: 'discard' });
  assert.strictEqual(await login(discardCase), 'no-remote');
  assert.strictEqual(discardCase.context.game.level, 1, 'deleting starts the account fresh and leaves no guest copy');
  assert.strictEqual(discardCase.getPushes(), 0);

  const keepCase = createContext(guestLocal, null, {});
  await assert.rejects(login(keepCase), /계정 연결을 취소/);
  assert.strictEqual(keepCase.context.game.level, 42, 'cancelling keeps the guest save as it was');
  assert.strictEqual(keepCase.context.game.saveMeta.cloudUserId, undefined);
  assert.strictEqual(keepCase.writes.length, 0);
  assert.deepStrictEqual([keepCase.detached, keepCase.context.cloudState.user], [[null], null], 'and drops the account link on this device');

  const tamperedVerdict = { ok: false, keys: ['currency'], problems: ['화폐'] };
  const tamperedCase = createContext(guestLocal, null, { fate: 'move', verdict: tamperedVerdict, confirm: true });
  assert.strictEqual(await login(tamperedCase), 'no-remote');
  assert.strictEqual(tamperedCase.getPushes(), 0, 'a save that fails the check never reaches the account');
  assert.match(tamperedCase.confirmations[0].message, /화폐/, 'the player is told why before it is deleted');
  assert.strictEqual(tamperedCase.context.game.level, 1);

  const tamperedKeepCase = createContext(guestLocal, null, { fate: 'move', verdict: tamperedVerdict, confirm: false });
  await assert.rejects(login(tamperedKeepCase), /계정 연결을 취소/);
  assert.strictEqual(tamperedKeepCase.context.game.level, 42);

  const signupTamperedCase = createContext(guestLocal, null, { verdict: { ok: false, keys: ['clock'], problems: ['기기 시간'] }, confirm: true });
  const signupTamperedStatus = await vm.runInContext('reconcileCloudSaveState({ createRemoteFromLocal: true, allowLocalBootstrap: true })', signupTamperedCase.context);
  assert.strictEqual(signupTamperedStatus, 'no-remote');
  assert.strictEqual(signupTamperedCase.getPushes(), 0, 'sign-up checks the guest save too');
  assert.strictEqual(signupTamperedCase.context.game.level, 1);

  const guestWithRemoteCase = createContext(guestLocal, remoteRecord, { confirm: true });
  assert.strictEqual(await login(guestWithRemoteCase), 'pulled-remote-strict-resume');
  assert.strictEqual(guestWithRemoteCase.choices.length, 0, 'an account with a cloud save never takes a guest save');
  assert.match(guestWithRemoteCase.confirmations[0].message, /이미 저장이 있어/, 'deleting it is asked first');
  assert.strictEqual(guestWithRemoteCase.context.game.level, 7);

  const guestWithRemoteKeepCase = createContext(guestLocal, remoteRecord, { confirm: false });
  await assert.rejects(login(guestWithRemoteKeepCase), /계정 연결을 취소/);
  assert.strictEqual(guestWithRemoteKeepCase.context.game.level, 42);
  assert.strictEqual(guestWithRemoteKeepCase.writes.length, 0);

  const remoteStamp = new Date(remoteRecord.updated_at).getTime();
  const newerOwnedLocal = { level: 42, season: 3, saveMeta: { lastModifiedAt: remoteStamp + 1000, cloudUserId: 'account-b' } };
  const newerOwnedCase = createContext(newerOwnedLocal, remoteRecord);
  const newerOwnedStatus = await vm.runInContext(
    'reconcileCloudSaveState({ preferRemoteOnResume: true, strictRemoteResume: true })',
    newerOwnedCase.context
  );
  assert.strictEqual(newerOwnedStatus, 'pushed-local-higher-loop');
  assert.strictEqual(newerOwnedCase.context.game.level, 42, 're-login must keep a newer local save owned by the same account');
  assert.strictEqual(newerOwnedCase.getPushes(), 1, 'newer same-account local progress must update the cloud save');

  const olderOwnedLocal = { level: 5, season: 1, saveMeta: { lastModifiedAt: remoteStamp - 1000, cloudUserId: 'account-b' } };
  const olderOwnedCase = createContext(olderOwnedLocal, remoteRecord);
  const olderOwnedStatus = await vm.runInContext(
    'reconcileCloudSaveState({ preferRemoteOnResume: true, strictRemoteResume: true })',
    olderOwnedCase.context
  );
  assert.strictEqual(olderOwnedStatus, 'pulled-remote-resume-preferred');
  assert.strictEqual(olderOwnedCase.context.game.level, 7, 're-login must still apply a newer cloud save for the same account');
  assert.strictEqual(olderOwnedCase.getPushes(), 0);

  const higherLoopRemote = {
    updated_at: '2026-07-21T00:00:00Z',
    save_data: { level: 30, season: 4, loopCount: 3, maxZoneId: 10, saveMeta: { lastModifiedAt: 200 } }
  };
  const newerLowerLoopLocal = { level: 50, season: 3, loopCount: 2, saveMeta: { lastModifiedAt: remoteStamp + 2000, cloudUserId: 'account-b' } };
  const lowerLoopCase = createContext(newerLowerLoopLocal, higherLoopRemote);
  const lowerLoopStatus = await vm.runInContext(
    'reconcileCloudSaveState({ preferRemoteOnResume: true, strictRemoteResume: true })',
    lowerLoopCase.context
  );
  assert.strictEqual(lowerLoopStatus, 'pulled-remote-higher-loop');
  assert.strictEqual(lowerLoopCase.context.game.season, 4, 'a newer timestamp must not let a lower-loop local save replace higher-loop cloud progress');
  assert.strictEqual(lowerLoopCase.getPushes(), 0, 'the real loop guard must block lower-loop local uploads');

  const lowerLoopNewerRemote = {
    updated_at: '2026-07-25T00:00:00Z',
    revision: 8,
    save_data: { level: 70, season: 6, loopCount: 5, saveMeta: { lastModifiedAt: 800, cloudRevision: 8 } }
  };
  const higherLoopOlderLocal = {
    level: 90, season: 8, loopCount: 7,
    saveMeta: { lastModifiedAt: new Date('2026-07-24T00:00:00Z').getTime(), cloudUserId: 'account-b', cloudRevision: 8 }
  };
  const monotonicResumeCase = createContext(higherLoopOlderLocal, lowerLoopNewerRemote);
  const monotonicResumeStatus = await vm.runInContext(
    'reconcileCloudSaveState({ preferRemoteOnResume: true, strictRemoteResume: true })',
    monotonicResumeCase.context
  );
  assert.strictEqual(monotonicResumeStatus, 'pushed-local-higher-loop');
  assert.strictEqual(monotonicResumeCase.context.game.season, 8, 'a newer cloud timestamp must never roll back a higher-loop local save');
  assert.strictEqual(monotonicResumeCase.getPushes(), 1, 'the higher-loop local save should repair the stale cloud save');

  const sameLoopRemoteForGuard = {
    updated_at: '2026-07-25T00:00:00Z', revision: 8,
    save_data: { level: 70, season: 8, loopCount: 7, maxZoneId: 12, saveMeta: { lastModifiedAt: 800, cloudRevision: 8 } }
  };
  const autoSyncGuardCase = createContext(higherLoopOlderLocal, lowerLoopNewerRemote);
  const autoSyncGuard = await vm.runInContext('guardAgainstStaleLocalOverwrite({ automatic: true })', autoSyncGuardCase.context);
  assert.strictEqual(autoSyncGuard.status, 'safe-to-push-higher-loop');
  assert.strictEqual(autoSyncGuardCase.context.game.season, 8, 'automatic sync must not replace a higher-loop local save by timestamp');
  assert.strictEqual(autoSyncGuardCase.getSummaryReads(), 1, 'the automatic upload check reads the save summary');
  assert.strictEqual(autoSyncGuardCase.getFullReads(), 0, 'the automatic upload check must not download the whole save');

  // The summary decides, the full save is applied: a pull never applies the few summary fields.
  const guardPullCase = createContext(newerLowerLoopLocal, higherLoopRemote);
  const guardPull = await vm.runInContext('guardAgainstStaleLocalOverwrite({ automatic: true })', guardPullCase.context);
  assert.strictEqual(guardPull.status, 'pulled-remote-higher-loop');
  assert.strictEqual(guardPullCase.getFullReads(), 1, 'pulling a higher-loop cloud save reads the whole save once');
  assert.strictEqual(guardPullCase.context.game.level, 30, 'the pulled save is the full remote save');
  assert.strictEqual(guardPullCase.context.game.maxZoneId, 10, 'fields outside the summary arrive with the pull');
  const olderSameLoopLocal = { level: 90, season: 8, loopCount: 7,
    saveMeta: { lastModifiedAt: new Date('2026-07-20T00:00:00Z').getTime(), cloudUserId: 'account-b', cloudRevision: 8 } };
  const newerRemoteCase = createContext(olderSameLoopLocal, { ...sameLoopRemoteForGuard });
  const newerRemote = await vm.runInContext('guardAgainstStaleLocalOverwrite({ automatic: true })', newerRemoteCase.context);
  assert.strictEqual(newerRemote.status, 'pulled-remote');
  assert.strictEqual(newerRemoteCase.getFullReads(), 1);
  assert.strictEqual(newerRemoteCase.context.game.level, 70, 'a newer same-loop cloud save is pulled in full');

  const revisionConflictLocal = JSON.parse(JSON.stringify(higherLoopOlderLocal));
  revisionConflictLocal.saveMeta.cloudRevision = 7;
  const revisionConflictCase = createContext(revisionConflictLocal, lowerLoopNewerRemote);
  const revisionConflictStatus = await vm.runInContext(
    'reconcileCloudSaveState({ preferRemoteOnResume: true, strictRemoteResume: true })',
    revisionConflictCase.context
  );
  assert.strictEqual(revisionConflictStatus, 'pushed-local-higher-loop-conflict');
  assert.strictEqual(revisionConflictCase.context.game.season, 8, 'a cloud revision conflict must preserve the higher-loop local save');
  assert.strictEqual(revisionConflictCase.context.game.saveMeta.cloudRevision, 8, 'the protected local save should advance to the checked remote revision');
  assert.strictEqual(revisionConflictCase.getPushes(), 1);

  const sameLoopRemote = {
    updated_at: '2026-07-25T00:00:00Z', revision: 8,
    save_data: { level: 70, season: 8, loopCount: 7, saveMeta: { lastModifiedAt: 800, cloudRevision: 8 } }
  };
  const sameLoopLocal = {
    level: 90, season: 8, loopCount: 7,
    saveMeta: { lastModifiedAt: new Date('2026-07-26T00:00:00Z').getTime(), cloudUserId: 'account-b', cloudRevision: 7 }
  };
  const choiceCase = createContext(sameLoopLocal, sameLoopRemote);
  const choiceStatus = await vm.runInContext(
    'reconcileCloudSaveState({ preferRemoteOnResume: true, strictRemoteResume: true })',
    choiceCase.context
  );
  assert.strictEqual(choiceStatus, 'pulled-remote-conflict');
  assert.strictEqual(choiceCase.confirmations.length, 1, 'same-loop revision conflict must ask which save to use once');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(choiceCase.confirmations[0].options)), {
    title: '저장 충돌', tone: 'danger', confirmLabel: '현재 기기 사용', cancelLabel: '서버 기록 사용'
  });
  assert.match(choiceCase.confirmations[0].message, /^현재 기기 기록\n루프 8 · 마지막 저장 .*\n\n서버 기록\n루프 8 · 마지막 저장 /,
    'save choices must show only each record loop and last-save time');

  const bootstrapOwnedLocal = { level: 1, season: 1, loopCount: 0, saveMeta: { lastModifiedAt: remoteStamp + 3000, cloudUserId: 'account-b' } };
  const bootstrapOwnedCase = createContext(bootstrapOwnedLocal, remoteRecord);
  const bootstrapOwnedStatus = await vm.runInContext(
    'reconcileCloudSaveState({ preferRemoteOnResume: true, strictRemoteResume: true })',
    bootstrapOwnedCase.context
  );
  assert.strictEqual(bootstrapOwnedStatus, 'pulled-remote-higher-loop');
  assert.strictEqual(bootstrapOwnedCase.context.game.level, 7, 'a bootstrap local save must yield to the existing same-account cloud save');
  assert.strictEqual(bootstrapOwnedCase.getPushes(), 0, 'the real bootstrap guard must block cloud overwrite');
}

run()
  .then(() => console.log('smoke-cloud-account-isolation passed'))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
