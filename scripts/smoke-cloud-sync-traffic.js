// 클라우드 부담 줄이기(2026-10-03, Supabase 무료 플랜의 전송량 한도): 업로드 전 확인은 세이브 요약만 받고, 바뀐 것이
// 없거나 화면이 숨겨져 있으면 자동 업로드를 하지 않으며, 나가는 순간 업로드는 64KiB를 넘는 세이브도 보낸다.
// 전에는 자동 업로드 한 번마다 세이브 전체를 두 번 내려받았고, 큰 세이브의 나가는 순간 업로드는 브라우저가 막았다.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);
const plain = source => JSON.parse(run(`JSON.stringify(${source})`));
const tick = () => new Promise(resolve => setImmediate(resolve));
context.Blob = Blob;
// The cloud panel re-reads this config on every refresh (cloudState.configured).
context.CLOUD_SAVE_CONFIG = { enabled: true, supabaseUrl: 'https://cloud.invalid', supabaseAnonKey: 'anon' };

const REMOTE_TIME = '2026-10-01T00:00:00Z';
const requests = [];
let respond = () => [];
context.cloudJsonRequest = async (path, options = {}) => {
    requests.push({ path: decodeURIComponent(path), method: options.method || 'GET' });
    return respond(decodeURIComponent(path), options);
};
const readsWholeSave = request => /[=,]save_data(?=[,&]|$)/.test(request.path);
const summaryRow = { user_id: 'user-1', updated_at: REMOTE_TIME, revision: 4, season: 3, loopCount: 2, saveMeta: { cloudRevision: 4 } };
const fullRow = () => ({ user_id: 'user-1', updated_at: REMOTE_TIME, revision: 4, save_data: plain('createCloudSaveState(game)') });

run(`startupOverlayActive = false; game = mergeDefaults({}); game.level = 12; game.season = 3; game.loopCount = 2;
    game.playerStall = game.playerStall || {};
    cloudState.configured = true; cloudState.user = { id: 'user-1' }; cloudState.session = { access_token: 'token', user: { id: 'user-1' } };
    ensureSaveMeta(); game.saveMeta.cloudUserId = 'user-1'; game.saveMeta.cloudRevision = 4;`);

async function main() {
    // 1. The content print ignores save times and the stall clock, not progress.
    const print = () => run('cloudSaveFingerprint(createCloudSaveState(game))');
    const first = print();
    run('game.saveMeta.lastModifiedAt = Date.now() + 5000; game.playerStall.lastAt = Date.now() + 9000;');
    assert.strictEqual(print(), first, 'save times and the stall clock are not a change');
    run('game.exp = (game.exp || 0) + 1;');
    assert.notStrictEqual(print(), first, 'progress changes the print');

    // 2. The summary read names a few save fields and never the save column itself.
    respond = path => (readsWholeSave({ path }) ? [fullRow()] : [summaryRow]);
    const summary = await run('fetchCloudSaveSummary()');
    assert.strictEqual(summary.summaryOnly, true);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(summary.save_data)), { season: 3, loopCount: 2, saveMeta: { cloudRevision: 4 } });
    assert.strictEqual(requests.length, 1);
    assert(requests[0].path.includes('save_data->season') && !readsWholeSave(requests[0]), 'the summary read must not select the whole save');
    // A row without those fields (an odd or very old save) is decided on the full save.
    requests.length = 0;
    respond = path => (readsWholeSave({ path }) ? [fullRow()] : [{ user_id: 'user-1', updated_at: REMOTE_TIME, revision: 4, season: null, loopCount: null, saveMeta: null }]);
    const odd = await run('fetchCloudSaveSummary()');
    assert(odd.save_data && odd.summaryOnly !== true && requests.some(readsWholeSave), 'an empty summary falls back to the full read');

    // 3. A whole automatic sync (overwrite guard, then upload) never downloads the save.
    requests.length = 0;
    respond = (path, options) => {
        if (options.method === 'POST' && path.includes('commit_cloud_save')) return [{ committed: true, current_revision: 5, saved_at: '2026-10-03T00:00:00Z' }];
        return readsWholeSave({ path }) ? [fullRow()] : [summaryRow];
    };
    run('ensureCloudSessionFresh = async () => true; game.saveMeta.lastModifiedAt = Date.parse("2026-10-02T00:00:00Z"); cloudState.busy = false;');
    await run('syncCloudSave({ automatic: true })');
    assert.strictEqual(requests.filter(readsWholeSave).length, 0, 'an automatic sync must not download the whole save');
    assert.strictEqual(requests.filter(request => request.path.includes('commit_cloud_save')).length, 1, 'it uploads once');
    assert.strictEqual(run('game.saveMeta.cloudRevision'), 5);

    // 4. The auto-upload timer: nothing but clocks changed, or the page is hidden, means no upload at all.
    const timers = [];
    context.setTimeout = fn => timers.push(fn);
    run('globalThis.__syncCalls = 0; syncCloudSave = async () => { globalThis.__syncCalls += 1; };');
    run('cloudState.lastSyncAttemptAt = 0; game.saveMeta.lastModifiedAt = Date.now(); cloudState.lastSyncedLocalModifiedAt = 0;');
    run('scheduleCloudAutoSync()');
    assert.strictEqual(timers.length, 1);
    timers.pop()();
    assert.strictEqual(run('globalThis.__syncCalls'), 0, 'only save times changed since the upload: skip it');
    assert.strictEqual(run('isCloudSaveDirty()'), false);
    run('game.exp += 5; game.saveMeta.lastModifiedAt = Date.now() + 1; cloudState.lastSyncAttemptAt = 0;');
    run('scheduleCloudAutoSync()');
    timers.pop()();
    assert.strictEqual(run('globalThis.__syncCalls'), 1, 'progress is uploaded');
    context.document.hidden = true;
    run('game.exp += 5; game.saveMeta.lastModifiedAt = Date.now() + 2; cloudState.lastSyncAttemptAt = 0;');
    run('scheduleCloudAutoSync()');
    assert.strictEqual(timers.length, 0, 'a hidden page schedules no cloud upload');
    context.document.hidden = false;

    // 5. Page exit: a small save keeps keepalive, a save over 64 KiB still goes out as a normal request.
    const sent = [];
    context.fetch = async (url, options) => {
        sent.push({ url, keepalive: options.keepalive, bytes: Buffer.byteLength(options.body) });
        return { ok: true, status: 200, text: async () => JSON.stringify([{ committed: true, current_revision: 9, saved_at: '2026-10-03T01:00:00Z' }]) };
    };
    run(`gameplayStarted = true; cloudState.lastCloudCommitAt = 0; cloudState.lastUploadedFingerprint = null;
        cloudState.lastRemoteLoop = 0; cloudState.lastRemoteResetRevision = 0; game.saveMeta.cloudResetRevision = 0; lastPageExitCloudPushAt = 0;`);
    assert.strictEqual(run("pushCloudSaveOnPageExit('visibilitychange')"), true);
    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].keepalive, true, `a small save (${sent[0].bytes} B) keeps keepalive`);
    await tick(); await tick();
    assert.strictEqual(run('game.saveMeta.cloudRevision'), 9, 'the exit upload result is applied');
    run('lastPageExitCloudPushAt = 0;');
    assert.strictEqual(run("pushCloudSaveOnPageExit('visibilitychange')"), false, 'nothing changed since that upload');
    run("game.records = { ...(game.records || {}), exitPad: 'x'.repeat(90000) }; lastPageExitCloudPushAt = 0; cloudState.lastCloudCommitAt = Date.now() - 61000;");
    assert.strictEqual(run("pushCloudSaveOnPageExit('visibilitychange')"), true);
    assert.strictEqual(sent.length, 2);
    assert(sent[1].bytes > 64 * 1024 && sent[1].keepalive === false, 'a save over 64 KiB goes out without keepalive (browsers refuse that)');
    await tick(); await tick();
    run('game.exp += 1; lastPageExitCloudPushAt = 0;');
    assert.strictEqual(run("pushCloudSaveOnPageExit('visibilitychange')"), false, 'switching apps right after an upload does not upload again');
    assert.strictEqual(sent.length, 2);
    console.log('smoke-cloud-sync-traffic passed');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
