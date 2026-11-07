// 계정 저장과 게스트 저장의 분리(2026-10-30): 게스트 칸은 서버와 통신하지 않고, 계정 칸은 서버 저장의 사본이며, 서버가 기준이다.
// 게임 전체를 vm에 올리고(scripts/lib/game-runtime.js) 서버(fetch)와 기기 저장소(localStorage)만 가짜로 두어 실제 진입 흐름을 돈다.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const indexSource = fs.readFileSync('index.html', 'utf8');
for (const file of ['js/save.js', 'js/ui.js']) {
    assert.match(indexSource, new RegExp(`${file.replace(/[./]/g, '\\$&')}\\?[^"]*save-slots=20261030-1`), `${file} must leave the cache with the save slots`);
}

const USER = 'account-b', OTHER = 'account-a';
const BUILD = '2026-10-28T00:00:00.000Z';

/** A game runtime on a fake device (storage map) talking to a fake server (one cloud_saves row). */
function createDevice({ guestSave = null, accountSave = null, serverSave = null, serverRevision = 0 } = {}) {
    // 브라우저 localStorage처럼 저장한 키가 Object.keys에 보여야 한다(js/save.js가 그렇게 훑는다): 메서드는 열거되지 않게 둔다.
    const storage = {};
    Object.defineProperties(storage, {
        getItem: { value: key => (Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null) },
        setItem: { value: (key, value) => { storage[key] = String(value); } },
        removeItem: { value: key => { delete storage[key]; } },
        has: { value: key => Object.prototype.hasOwnProperty.call(storage, key) }
    });
    const server = { row: serverSave ? { revision: serverRevision, updated_at: '2026-10-30T00:00:00Z', save_data: serverSave } : null, commits: [], down: false };
    const runtime = buildGameRuntime({}, null, { querySelector: selector => (selector === 'meta[name="game-build"]' ? { content: BUILD } : null) });
    runtime.localStorage = storage;
    // 화면을 다시 그리는 길(refreshRuntimeForLoadedSave)이 요소를 찾으므로 id마다 빈 요소 하나를 준다. 화면은 검사하지 않는다.
    const elements = new Map();
    const stubElement = () => {
        const el = runtime.document.createElement('div');
        const noop = () => {};
        Object.assign(el, { querySelector: () => stubElement(), scrollIntoView: noop, focus: noop, blur: noop, scrollTo: noop, dispatchEvent: noop,
            matches: () => false, contains: () => false, insertAdjacentHTML: noop, replaceChildren: noop, append: noop, prepend: noop, before: noop,
            after: noop, replaceWith: noop, cloneNode: () => stubElement(), animate: () => ({ cancel: noop, finished: Promise.resolve() }) });
        Object.defineProperty(el, 'parentElement', { get: () => stubElement() });
        return el;
    };
    runtime.document.getElementById = id => { if (!elements.has(id)) elements.set(id, stubElement()); return elements.get(id); };
    runtime.location.reload = () => { runtime.__reloaded = true; };
    runtime.CLOUD_SAVE_CONFIG = { enabled: true, supabaseUrl: 'https://test.invalid', supabaseAnonKey: 'anon' };
    const confirmations = [], toasts = [], downloads = [];
    let answer = false;
    runtime.requestGameConfirmation = async (message, options) => { confirmations.push({ message, options }); return answer; };
    runtime.showGameToast = message => toasts.push(String(message));
    runtime.addLog = () => {};
    const createElement = runtime.document.createElement;
    runtime.document.createElement = tag => tag === 'a'
        ? { click() { downloads.push(this.download); }, remove() {}, set href(value) { this.url = value; }, get href() { return this.url || ''; } }
        : createElement(tag);
    runtime.URL = { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} };
    runtime.Blob = class { constructor(parts) { this.size = parts.join('').length; } };
    runtime.fetch = async (url, init = {}) => {
        if (server.down) throw new Error('network unavailable');
        const json = (status, body) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });
        if (/\/rpc\/claim_cloud_session|\/cloud_sessions/.test(url)) return json(404, { message: 'not found' });   // 접속 표 장치는 꺼진 채
        if (url.includes('/rest/v1/cloud_saves?')) {
            if (!server.row) return json(200, []);
            const summary = url.includes('save_data->');
            const { revision, updated_at, save_data } = server.row;
            return json(200, [summary
                ? { user_id: USER, updated_at, revision, season: save_data.season, loopCount: save_data.loopCount, saveMeta: save_data.saveMeta || {} }
                : { user_id: USER, updated_at, revision, save_data }]);
        }
        if (url.endsWith('/rpc/commit_cloud_save')) {
            const body = JSON.parse(init.body);
            server.commits.push(body);
            const stored = server.row ? server.row.revision : 0;
            if (Math.max(0, body.expected_revision) !== stored) return json(200, [{ committed: false, current_revision: stored }]);
            server.row = { revision: stored + 1, updated_at: new Date().toISOString(), save_data: body.next_save_data };
            return json(200, [{ committed: true, current_revision: stored + 1, saved_at: server.row.updated_at }]);
        }
        return json(200, []);
    };
    const key = runtime.LOCAL_SAVE_KEY, accountKey = runtime.accountSaveKey(USER);
    if (guestSave) storage.setItem(key, JSON.stringify(guestSave));
    if (accountSave) storage.setItem(accountKey, JSON.stringify(accountSave));
    runtime.loadGameAtBoot();   // 부팅: 게스트 칸(그 전에 한 키 시절의 계정 저장을 옮긴다)
    const signIn = (id = USER) => runtime.applyCloudSession({ access_token: 't', refresh_token: 'r', expires_at: 4102444800, user: { id, email: `${id}@example.invalid` } });
    const slot = () => runtime.getSaveSlot();
    // 최상위 let(cloudState, gameplayStarted)은 전역 객체의 속성이 아니라 문맥 안에서 읽고 쓴다.
    const cloud = () => vm.runInContext('cloudState', runtime);
    const startPlay = () => vm.runInContext('gameplayStarted = true; setStartupOverlayActive(false);', runtime);
    const stored = name => (storage.has(name) ? JSON.parse(storage.getItem(name)) : null);
    return { runtime, storage, server, confirmations, toasts, downloads, key, accountKey, signIn, slot, cloud, startPlay, stored, setAnswer: value => { answer = value; } };
}

const guestSave = { level: 42, season: 3, loopCount: 2, maxZoneId: 9, saveMeta: { lastModifiedAt: 500 } };
const serverSave = { level: 7, season: 1, loopCount: 0, maxZoneId: 5, saveMeta: { lastModifiedAt: 100, cloudRevision: 7 } };
const ownedCopy = (level, revision, pending) => ({ level, season: 4, loopCount: 3, maxZoneId: 12, saveMeta: { lastModifiedAt: 900, cloudUserId: USER, cloudRevision: revision, cloudPending: pending } });

async function checkServerMutationWithSameStamp() {
    const seed = createDevice();
    const item = JSON.parse(JSON.stringify(vm.runInContext(`(() => {
        const base = BASE_ITEM_DB.find(row => row.slot === '무기');
        return { id: 90, slot: base.slot, baseId: base.id, baseName: base.name, name: base.name,
            rarity: 'rare', itemTier: 10, baseStats: rollBaseStats(base, 10), stats: [],
            tradeKey: '00000000-0000-4000-8000-000000000001' };
    })()`, seed.runtime)));
    // The hall changes inventory/revision, preserving the client's stamp; the reply was lost before the device could apply it.
    for (const incoming of [false, true]) {
        const local = { ...ownedCopy(50, 7, true), inventory: incoming ? [] : [item] };
        const remote = { ...ownedCopy(50, 7, false), inventory: incoming ? [item] : [] };
        const d = createDevice({ accountSave: local, serverSave: remote, serverRevision: 8 });
        d.signIn();
        assert.strictEqual(await d.runtime.enterAccountSave(), 'pulled-server');
        assert.strictEqual(d.runtime.game.inventory.length, Number(incoming), 'server removal/receipt survives a matching client stamp');
        assert.strictEqual(d.runtime.game.saveMeta.cloudRevision, 8);
        d.runtime.saveGame({ skipCloudSync: true });
        await d.runtime.pushCloudSave();
        assert.strictEqual(d.server.row.save_data.inventory.length, Number(incoming), 'the next upload must not undo the hall change');
    }
    // A page-exit upload whose reply was lost still resumes the correct body, without asking to export a competing save.
    const own = createDevice({ accountSave: ownedCopy(50, 7, true), serverSave: ownedCopy(50, 7, false), serverRevision: 8 });
    own.signIn();
    assert.strictEqual(await own.runtime.enterAccountSave(), 'pulled-server');
    assert.deepStrictEqual([own.runtime.game.level, own.runtime.game.saveMeta.cloudRevision, own.confirmations.length, own.server.commits.length], [50, 8, 0, 0]);
}

async function checkProgressDuringUpload() {
    const d = createDevice({ accountSave: ownedCopy(50, 7, false), serverSave, serverRevision: 7 });
    d.signIn(); await d.runtime.enterAccountSave(); d.startPlay();
    d.runtime.game.level = 51;
    d.runtime.saveGame({ skipCloudSync: true });
    const stamp = d.runtime.game.saveMeta.lastModifiedAt;
    const fetch = d.runtime.fetch;
    let release, sent;
    const reached = new Promise(resolve => { sent = resolve; });
    d.runtime.fetch = async (url, init) => {
        if (url.endsWith('/rpc/commit_cloud_save')) { sent(); await new Promise(resolve => { release = resolve; }); }
        return fetch(url, init);
    };
    const pending = d.runtime.syncCloudSave({ automatic: true });
    await reached;
    d.runtime.game.level = 52;
    d.runtime.saveGame({ skipCloudSync: true });
    d.runtime.game.saveMeta.lastModifiedAt = stamp; // same-millisecond changes must be protected as well
    release(); await pending;
    assert.deepStrictEqual([d.server.row.save_data.level, d.stored(d.accountKey).level, d.runtime.isCloudSaveDirty(), d.runtime.game.saveMeta.cloudRevision], [51, 52, true, 8]);
    const next = createDevice({ accountSave: d.stored(d.accountKey), serverSave: d.server.row.save_data, serverRevision: 8 });
    next.signIn();
    assert.strictEqual(await next.runtime.enterAccountSave(), 'pushed-pending');
    assert.deepStrictEqual([next.server.row.save_data.level, next.server.row.revision, next.runtime.isCloudSaveDirty()], [52, 9, false]);

    // The same acknowledgement rule also applies after a page-exit request, if the page resumed before its reply arrived.
    const before = vm.runInContext('cloudSaveFingerprint(createCloudSyncPayload(game))', next.runtime);
    next.runtime.game.level = 53;
    next.runtime.saveGame({ skipCloudSync: true });
    next.runtime.applyPageExitCloudSaveResult(JSON.stringify([{ committed: true, current_revision: 10, saved_at: new Date().toISOString() }]), next.runtime.game, before);
    assert.deepStrictEqual([next.runtime.game.level, next.runtime.game.saveMeta.cloudRevision, next.runtime.isCloudSaveDirty()], [53, 10, true]);
}

async function checkCloudRequestDeadline(phase) {
    const d = createDevice({ accountSave: ownedCopy(50, 7, false), serverSave, serverRevision: 7 });
    d.signIn(); await d.runtime.enterAccountSave();
    d.runtime.game.level = 51;
    d.runtime.saveGame({ skipCloudSync: true });
    const fetch = d.runtime.fetch, setTimeout = d.runtime.setTimeout, clearTimeout = d.runtime.clearTimeout;
    const timers = new Map();
    let serial = 0, sent;
    const reached = new Promise(resolve => { sent = resolve; });
    d.runtime.setTimeout = (callback, delay) => { const id = ++serial; timers.set(id, { callback, delay }); return id; };
    d.runtime.clearTimeout = id => timers.delete(id);
    d.runtime.fetch = (url, init) => {
        if (!url.endsWith('/rpc/commit_cloud_save')) return fetch(url, init);
        const wait = () => new Promise((resolve, reject) => {
            init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
            sent(init.signal);
        });
        return phase === 'headers' ? wait() : Promise.resolve({ ok: true, status: 200, text: wait });
    };
    const pending = d.runtime.syncCloudSave({ automatic: true });
    const signal = await reached;
    assert.strictEqual(d.cloud().busy, true);
    const deadline = [...timers.values()].find(timer => timer.delay === 30000);
    assert.ok(deadline, 'network and response-body reads both have a 30 second deadline');
    deadline.callback();
    await assert.rejects(pending, error => error.code === 'CLOUD_REQUEST_TIMEOUT');
    assert.deepStrictEqual([signal.aborted, d.cloud().busy, d.runtime.isCloudSaveDirty(), d.stored(d.accountKey).level, timers.size], [true, false, true, 51, 0]);
    d.runtime.fetch = fetch; d.runtime.setTimeout = setTimeout; d.runtime.clearTimeout = clearTimeout;
    await d.runtime.syncCloudSave({ automatic: true });
    assert.deepStrictEqual([d.server.row.save_data.level, d.runtime.isCloudSaveDirty()], [51, false], 'a later explicit/normal attempt can succeed');
}

async function checkLateSessionRefresh(mode) {
    const d = createDevice({ guestSave, accountSave: ownedCopy(50, 7, false), serverSave, serverRevision: 7 });
    d.signIn(); await d.runtime.enterAccountSave();
    const fetch = d.runtime.fetch;
    let release, sent;
    const reached = new Promise(resolve => { sent = resolve; });
    d.runtime.fetch = async (url, init) => {
        if (!url.includes('grant_type=refresh_token')) return fetch(url, init);
        sent(); await new Promise(resolve => { release = resolve; });
        const rejected = mode === 'new-token-rejected';
        return { ok: !rejected, status: rejected ? 400 : 200, text: async () => JSON.stringify(rejected ? { message: 'invalid_grant' }
            : { access_token: 'old-response', refresh_token: 'old-r', expires_at: 4102444800, user: { id: USER } }) };
    };
    const pending = d.runtime.refreshCloudSession('regression'); await reached;
    const epoch = d.cloud().sessionEpoch;
    if (mode === 'logout') await d.runtime.prepareStartupAccountSwitch();
    else if (mode === 'aba') { d.signIn(OTHER); d.signIn(); }
    else if (mode === 'other') d.signIn(OTHER);
    else d.runtime.applyCloudSession({ access_token: 'new-token', refresh_token: 'new-r', expires_at: 4102444800, user: { id: USER } });
    const user = d.runtime.getActiveCloudUserId(), token = d.cloud().session?.access_token;
    release(); const result = await pending;
    assert.deepStrictEqual([d.runtime.getActiveCloudUserId(), d.cloud().session?.access_token], [user, token], 'late refreshes never revive a logged-out account or replace a newer session');
    assert.strictEqual(result, mode.startsWith('new-token'), 'a newer same-entry token keeps waiting authenticated requests usable');
    assert.strictEqual(d.cloud().sessionEpoch === epoch, mode.startsWith('new-token'));
    assert.strictEqual(d.stored(d.key).level, 42);
}

async function checkRestoreAccountBoundary(phase) {
    const d = createDevice({ guestSave, accountSave: ownedCopy(50, 7, false), serverSave, serverRevision: 7 });
    d.signIn(); await d.runtime.enterAccountSave(); d.setAnswer(true);
    d.runtime.URLSearchParams = URLSearchParams;
    vm.runInContext(fs.readFileSync('js/cloud-tools-ui.js', 'utf8'), d.runtime, { filename: 'js/cloud-tools-ui.js' });
    const fetch = d.runtime.fetch;
    let release, sent, restores = 0;
    const reached = new Promise(resolve => { sent = resolve; });
    const wait = async () => { sent(); await new Promise(resolve => { release = resolve; }); };
    if (phase === 'confirmation') d.runtime.requestGameConfirmation = async () => { await wait(); return true; };
    d.runtime.fetch = async (url, init) => {
        if (url.endsWith('/rpc/restore_cloud_save_version')) {
            restores++; if (phase === 'restore') await wait();
            return { ok: true, status: 200, text: async () => '[{"restored":true}]' };
        }
        const response = await fetch(url, init);
        if (phase === 'pull' && url.includes('/cloud_saves?') && !url.includes('save_data->')) await wait();
        return response;
    };
    const pending = d.runtime.restoreCloudSaveVersion(6); await reached;
    if (phase !== 'confirmation') {
        // 복구와 그 저장을 받는 동안은 다른 클라우드 작업처럼 busy라 계정 전환이 기다린다(2026-11-07): 복구는 같은 계정에서 끝난다.
        await d.runtime.prepareStartupAccountSwitch();
        assert.strictEqual(d.slot().userId, USER, 'the account switch waits for the restore');
        release(); await pending;
        assert.deepStrictEqual([restores, d.cloud().busy, d.cloud().syncHalted], [1, false, false]);
        assert.ok(d.toasts.includes('선택한 클라우드 저장을 복구했습니다.'));
        return;
    }
    d.signIn(OTHER); d.signIn();
    const before = [d.runtime.game, d.storage.getItem(d.key), d.storage.getItem(d.accountKey), d.cloud().lastRemoteRevision];
    release(); await pending;
    assert.deepStrictEqual([d.runtime.game, d.storage.getItem(d.key), d.storage.getItem(d.accountKey), d.cloud().lastRemoteRevision], before);
    assert.strictEqual(restores, 0);
    assert.ok(d.toasts.some(text => text.includes('복구 실패')), 'late restore completion is refused instead of reporting success');
}

function checkSdkTokenWatch() {
    const d = createDevice({ guestSave });
    let tokenEvent;
    d.runtime.watchSupabaseTokenRefresh({ auth: { onAuthStateChange(callback) { tokenEvent = callback; } } });
    const session = id => ({ access_token: 'sdk-token', refresh_token: 'sdk-refresh', expires_at: 4102444800, user: { id } });
    assert.strictEqual(d.cloud().sessionEpoch, 0);
    d.runtime.applyCloudSession(null);
    assert.strictEqual(d.cloud().sessionEpoch, 0, 'normalizing an empty session does not create an account entry');
    d.signIn(); const first = d.cloud().sessionEpoch;
    tokenEvent('TOKEN_REFRESHED', session(OTHER));
    assert.strictEqual(d.runtime.getActiveCloudUserId(), USER, 'SDK refresh events cannot switch accounts');
    d.runtime.applyCloudSession(null); const left = d.cloud().sessionEpoch;
    tokenEvent('TOKEN_REFRESHED', session(USER));
    assert.strictEqual(d.runtime.getActiveCloudUserId(), null, 'SDK refresh events cannot undo logout');
    d.signIn(); const returned = d.cloud().sessionEpoch;
    tokenEvent('TOKEN_REFRESHED', session(USER));
    assert.deepStrictEqual([d.cloud().session.access_token, d.cloud().sessionEpoch], ['sdk-token', returned]);
    assert.deepStrictEqual([first, left, returned], [1, 2, 3]);
}

async function checkSessionGuardTransitions(mode) {
    const d = createDevice({ guestSave }), timers = [];
    let serverToken, release, sent, claims = 0;
    const reached = new Promise(resolve => { sent = resolve; });
    const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
    const wait = async () => { sent(); await new Promise(resolve => { release = resolve; }); };
    d.runtime.setInterval = (callback, delay) => { timers.push({ callback, delay }); return timers.length; };
    d.runtime.fetch = async (url, init) => {
        const response = body => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });
        const failure = message => ({ ok: false, status: message === 'CLOUD_SESSION_SUPERSEDED' ? 403 : 404, text: async () => JSON.stringify({ message }) });
        if (url.endsWith('/rpc/claim_cloud_session')) {
            claims++;
            if (mode === 'network') throw new Error('network unavailable');
            if (mode.startsWith('claim') && claims === 1) { await wait(); if (mode === 'claim-404') return failure('not found'); }
            serverToken = JSON.parse(init.body).p_token; return response([]);
        }
        if (url.includes('/cloud_sessions?')) { const token = serverToken; await wait(); return mode === 'read-404' ? failure('not found') : response([{ token }]); }
        if (url.endsWith('/rpc/guard-regression')) { await wait(); return failure('CLOUD_SESSION_SUPERSEDED'); }
        return response([]);
    };
    d.signIn(); await flush();
    if (mode === 'network') { assert.strictEqual(claims, 1, 'network failures do not create an immediate retry loop'); return; }
    let request;
    if (mode.startsWith('read')) timers.find(timer => timer.delay === 60000).callback();
    if (mode.endsWith('refusal')) request = d.runtime.cloudJsonRequest('/rest/v1/rpc/guard-regression').catch(error => error.message);
    await reached;
    if (mode !== 'current-refusal') d.signIn(OTHER);
    if (mode === 'read' || mode === 'refusal') d.signIn();
    release(); await request; await flush();
    if (mode === 'current-refusal') {
        assert.strictEqual(!!d.runtime.__reloaded, true, 'a refusal for the current transmitted token still stops this device');
        assert.strictEqual(d.runtime.getLocalSaveStatus().status, 'superseded');
        return;
    }
    assert.strictEqual(!!d.runtime.__reloaded, false, 'a stale account read must not suspend the new account entry');
    assert.strictEqual(claims, 2, 'the new entry claims immediately after the stale request settles');
    assert.ok(vm.runInContext('cloudSessionGuard.requestHeaders()["x-rignin-session"]', d.runtime));
}

async function checkLateAccountEntry() {
    const d = createDevice({ guestSave, accountSave: ownedCopy(50, 7, false), serverSave, serverRevision: 7 });
    d.signIn(); const fetch = d.runtime.fetch;
    let release, sent;
    const reached = new Promise(resolve => { sent = resolve; });
    d.runtime.fetch = async (url, init) => {
        const response = await fetch(url, init);
        if (url.includes('save_data->')) { sent(); await new Promise(resolve => { release = resolve; }); }
        return response;
    };
    const pending = d.runtime.enterAccountSave(); await reached;
    d.signIn(OTHER); d.signIn();
    const before = [d.slot().key, d.runtime.game, d.cloud().lastRemoteRevision];
    release(); await assert.rejects(pending, /계정이나 게임 상태가 바뀌어/);
    assert.deepStrictEqual([d.slot().key, d.runtime.game, d.cloud().lastRemoteRevision], before, 'late summaries cannot switch slots or replace remote metadata after A-B-A');
}

async function checkOAuthBootstrapBoundary(changeAccount) {
    const d = createDevice({ guestSave });
    let release, sent;
    const reached = new Promise(resolve => { sent = resolve; });
    const session = { access_token: 'sdk-boot', refresh_token: 'sdk-r', expires_at: 4102444800, user: { id: USER } };
    let first = true;
    d.runtime.supabaseClient = { auth: {
        onAuthStateChange() {},
        async getSession() { if (first) { first = false; sent(); await new Promise(resolve => { release = resolve; }); } return { data: { session } }; },
        async getUser() { return { data: { user: { id: USER, identities: [] } } }; }
    } };
    const pending = d.runtime.tryRestoreSupabaseOAuthSession(); await reached;
    if (changeAccount) d.signIn(OTHER);
    release(); assert.strictEqual(await pending, !changeAccount);
    assert.strictEqual(d.runtime.getActiveCloudUserId(), changeAccount ? OTHER : USER, 'bootstrap restore respects a newer explicit login');
}

async function run() {
    // 1. Login to an account with a server save: the server save becomes the account slot; the guest slot is not touched or uploaded.
    {
        const d = createDevice({ guestSave, serverSave, serverRevision: 7 });
        d.signIn();
        assert.strictEqual(await d.runtime.enterAccountSave(), 'pulled-server');
        assert.deepStrictEqual([d.runtime.game.level, d.slot().kind, d.runtime.game.saveMeta.cloudUserId, d.runtime.game.saveMeta.cloudRevision], [7, 'account', USER, 7]);
        assert.strictEqual(d.stored(d.key).level, 42, 'the guest save stays as it was');
        assert.strictEqual(d.stored(d.accountKey).level, 7, 'the account slot holds the server copy');
        assert.strictEqual(d.server.commits.length, 0, 'a guest save never goes up on login');
        assert.strictEqual(d.confirmations.length, 0, 'login asks nothing');
    }
    // 2. A failed server read leaves every slot and the running game as they were.
    {
        const d = createDevice({ guestSave, serverSave, serverRevision: 7 });
        d.signIn();
        d.server.down = true;
        await assert.rejects(d.runtime.enterAccountSave(), /network unavailable/);
        assert.deepStrictEqual([d.runtime.game.level, d.slot().kind, d.storage.has(d.accountKey)], [42, 'guest', false]);
    }
    // 3. Login to an account without a server save asks about the guest save (2026-11-08): declined, a fresh account save (revision 1) goes up
    //    and the guest save stays a guest save; accepted, the guest save is the first server save. A device copy with progress is not asked over.
    {
        const d = createDevice({ guestSave });
        d.signIn();
        assert.strictEqual(await d.runtime.enterAccountSave(), 'pushed-first');
        assert.deepStrictEqual([d.confirmations.length, d.runtime.game.level, d.server.row.revision, d.server.row.save_data.level, d.stored(d.key).level], [1, 1, 1, 1, 42]);
        assert.match(d.confirmations[0].message, /루프 3, 레벨 42/, 'the question names the guest save');
        // 설정의 게스트 저장 옮기기: 계정 저장이 새 게임이거나 게스트 저장보다 뒤인 동안. 옮기면 게스트 칸은 비고 서버 저장이 된다.
        assert.strictEqual(d.runtime.canMoveGuestSaveIntoAccount(), true);
        d.runtime.game.killsInZone = 1; d.runtime.game.exp = 5;   // 자동 사냥의 첫 처치
        assert.strictEqual(d.runtime.canMoveGuestSaveIntoAccount(), true, 'a few kills in the new account do not lock the move');
        d.runtime.game.season = 3; d.runtime.game.level = 42;
        assert.strictEqual(d.runtime.canMoveGuestSaveIntoAccount(), false, 'an account save level with the guest save is kept');
        d.runtime.game.level = 41;
        d.setAnswer(true);
        await d.runtime.moveGuestSaveIntoAccount();
        assert.match(d.confirmations[1].message, /루프 3, 레벨 41/, 'the replaced account save is named');
        assert.deepStrictEqual([d.runtime.game.level, d.server.row.revision, d.server.row.save_data.level, d.storage.has(d.key)], [42, 2, 42, false]);
        assert.strictEqual(d.runtime.canMoveGuestSaveIntoAccount(), false, 'nothing left to move');

        const accepted = createDevice({ guestSave });
        accepted.signIn(); accepted.setAnswer(true);
        assert.strictEqual(await accepted.runtime.enterAccountSave(), 'pushed-guest');
        assert.deepStrictEqual([accepted.runtime.game.level, accepted.server.row.save_data.level, accepted.storage.has(accepted.key)], [42, 42, false]);

        const copy = createDevice({ guestSave, accountSave: ownedCopy(50, 0, true) });   // 첫 올리기에 실패했던 사본
        copy.signIn();
        assert.strictEqual(await copy.runtime.enterAccountSave(), 'pushed-first');
        assert.deepStrictEqual([copy.confirmations.length, copy.runtime.game.level, copy.server.row.save_data.level, copy.stored(copy.key).level], [0, 50, 50, 42]);
    }
    // 4. Sign-up adopts the guest save as the first server save (the 2026-10-03 rule); a save that fails the check stays a guest save.
    {
        const d = createDevice({ guestSave });
        d.signIn();
        assert.strictEqual(await d.runtime.enterAccountSave({ signUp: true }), 'pushed-guest');
        assert.deepStrictEqual([d.runtime.game.level, d.server.row.save_data.level, d.storage.has(d.key)], [42, 42, false]);
        const tampered = createDevice({ guestSave: { ...guestSave, currencies: { embers: 999999999 } } });
        tampered.signIn();
        assert.strictEqual(await tampered.runtime.enterAccountSave({ signUp: true }), 'pushed-first');
        assert.deepStrictEqual([tampered.runtime.game.level, tampered.server.row.save_data.level, tampered.stored(tampered.key).level], [1, 1, 42]);
        assert.match(tampered.cloud().lastMessage, /정상 플레이로는 나올 수 없는 값/);
        assert.match(tampered.toasts[0] || '', /정상 플레이로는 나올 수 없는 값/, 'the refusal is shown, not only kept in the panel');
    }
    // 5. The account slot at the server's revision: pending changes go up first; nothing pending, nothing is sent.
    {
        const d = createDevice({ guestSave, accountSave: ownedCopy(50, 7, true), serverSave, serverRevision: 7 });
        d.signIn();
        assert.strictEqual(await d.runtime.enterAccountSave(), 'pushed-pending');
        assert.deepStrictEqual([d.runtime.game.level, d.server.row.revision, d.server.row.save_data.level, d.runtime.game.saveMeta.cloudPending], [50, 8, 50, false]);
        const clean = createDevice({ guestSave, accountSave: ownedCopy(50, 7, false), serverSave, serverRevision: 7 });
        clean.signIn();
        assert.strictEqual(await clean.runtime.enterAccountSave(), 'cached-current');
        assert.deepStrictEqual([clean.runtime.game.level, clean.server.commits.length], [50, 0]);
    }
    // 6. Another device committed since: the server wins. Pending progress is dropped with a log line, no question, no file (2026-11-01); nothing goes up.
    {
        const d = createDevice({ guestSave, accountSave: ownedCopy(50, 7, true), serverSave: { ...serverSave, level: 70 }, serverRevision: 9 });
        d.signIn();
        assert.strictEqual(await d.runtime.enterAccountSave(), 'pulled-server');
        assert.deepStrictEqual([d.confirmations.length, d.downloads.length, d.runtime.game.level, d.runtime.game.saveMeta.cloudRevision, d.runtime.game.saveMeta.cloudPending, d.server.commits.length], [0, 0, 70, 9, false, 0]);
        assert.match(d.cloud().lastMessage, /올리지 못한 진행은 지웠습니다/);
        const quiet = createDevice({ guestSave, accountSave: ownedCopy(50, 7, false), serverSave: { ...serverSave, level: 70 }, serverRevision: 9 });
        quiet.signIn();
        assert.strictEqual(await quiet.runtime.enterAccountSave(), 'pulled-server');
        assert.deepStrictEqual([quiet.confirmations.length, quiet.runtime.game.level], [0, 70], 'nothing pending: no question');
    }
    // 7. A server save from a later release stops the entry before any slot changes (2026-10-28).
    {
        const later = { ...serverSave, saveMeta: { ...serverSave.saveMeta, gameBuild: '2026-10-29T00:00:00.000Z' } };
        const d = createDevice({ guestSave, serverSave: later, serverRevision: 7 });
        d.signIn();
        await assert.rejects(d.runtime.enterAccountSave(), error => error.code === 'GAME_BUILD_OUTDATED');
        assert.deepStrictEqual([d.runtime.game.level, d.slot().kind, d.server.commits.length], [42, 'guest', 0]);
    }
    // 8. In play, a commit the server refuses (another device moved on) halts auto uploads and the page-exit upload, with one toast;
    //    a connection failure keeps the progress pending and says so once per streak. Entering the account again clears both.
    {
        const d = createDevice({ guestSave, accountSave: ownedCopy(50, 7, false), serverSave, serverRevision: 7 });
        d.signIn();
        await d.runtime.enterAccountSave();
        d.startPlay();
        d.runtime.game.level = 51;
        d.runtime.saveGame({ skipCloudSync: true });
        assert.strictEqual(d.runtime.isCloudSaveDirty(), true, 'a save in the account slot is pending');
        d.server.row.revision = 9;   // 다른 기기가 올렸다
        await d.runtime.syncCloudSave({ automatic: true }).catch(error => d.runtime.noteAutoCloudSyncFailure(error));
        await d.runtime.syncCloudSave({ automatic: true }).catch(error => d.runtime.noteAutoCloudSyncFailure(error));
        assert.deepStrictEqual([d.cloud().syncHalted, d.toasts.length, d.server.row.revision, d.runtime.pushCloudSaveOnPageExit('pagehide')], [true, 1, 9, false]);
        assert.match(d.toasts[0], /다른 기기에서 서버 저장이 바뀌어/);
        assert.strictEqual(d.stored(d.accountKey).level, 51, 'the progress stays in the slot');
        d.server.row.save_data = { ...serverSave, level: 80 };
        assert.strictEqual(await d.runtime.enterAccountSave(), 'pulled-server');
        assert.deepStrictEqual([d.cloud().syncHalted, d.runtime.game.level], [false, 80]);

        d.runtime.game.level = 81;
        d.runtime.saveGame({ skipCloudSync: true });
        d.server.down = true;
        await d.runtime.syncCloudSave({ automatic: true }).catch(error => d.runtime.noteAutoCloudSyncFailure(error));
        await d.runtime.syncCloudSave({ automatic: true }).catch(error => d.runtime.noteAutoCloudSyncFailure(error));
        assert.deepStrictEqual([d.toasts.length, d.runtime.isCloudSaveDirty()], [2, true]);
        assert.match(d.toasts[1], /서버에 올리지 못했습니다/);
        d.server.down = false;
        await d.runtime.syncCloudSave({ automatic: true });
        assert.deepStrictEqual([d.server.row.revision, d.server.row.save_data.level, d.runtime.isCloudSaveDirty()], [10, 81, false]);
    }
    // 9. Leaving the account (게스트로 시작, 다른 계정 사용, 로그아웃): pending changes go up, the guest slot comes back untouched.
    {
        const d = createDevice({ guestSave, accountSave: ownedCopy(50, 7, true), serverSave, serverRevision: 7 });
        d.signIn();
        await d.runtime.enterAccountSave();
        d.runtime.game.level = 52;
        d.runtime.saveGame({ skipCloudSync: true });
        await d.runtime.leaveAccountForGuest();
        assert.deepStrictEqual([d.server.row.save_data.level, d.cloud().user, d.slot().kind, d.runtime.game.level, d.stored(d.accountKey).level], [52, null, 'guest', 42, 52]);
    }
    // 10. Before the slots one key held whichever save was last played: an account's save there moves to its slot at boot and the guest
    //     slot empties, so it can never be moved into another account as a guest save.
    {
        const d = createDevice({ guestSave: ownedCopy(60, 5, false) });
        assert.deepStrictEqual([d.storage.has(d.key), d.stored(d.accountKey).level, d.runtime.game.level, d.slot().kind], [false, 60, 1, 'guest']);
        // 시작 화면의 빈 칸은 이 기기에 계정 저장이 있다고 알린다(2026-11-08); 계정 사본이 없는 기기는 카드의 기본 글을 둔다.
        const shownGuest = { account: false, preview: false, save: d.runtime.game };
        assert.match(d.runtime.startupSaveCardState(shownGuest, 0).emptyText, /로그인/, 'an empty guest slot beside an account copy says to log in');
        assert.strictEqual(createDevice().runtime.startupSaveCardState(shownGuest, 0).emptyText, null);
        d.signIn(OTHER);
        assert.strictEqual(await d.runtime.enterAccountSave({ signUp: true }), 'pushed-first');
        assert.strictEqual(d.server.row.save_data.level, 1, 'another account gets a fresh save, not the moved one');
    }
    // 11. The account reset commits a blank save at the server's revision into the account slot only.
    {
        const d = createDevice({ guestSave, accountSave: ownedCopy(50, 7, false), serverSave, serverRevision: 7 });
        d.signIn();
        await d.runtime.enterAccountSave();
        await d.runtime.resetProgressStorage(USER);
        assert.deepStrictEqual([d.server.row.revision, d.server.row.save_data.level, d.stored(d.accountKey).level, d.stored(d.key).level, d.runtime.__reloaded], [8, 1, 1, 42, true]);
    }
    await checkServerMutationWithSameStamp();
    await checkProgressDuringUpload();
    await checkCloudRequestDeadline('headers');
    await checkCloudRequestDeadline('body');
    for (const mode of ['logout', 'other', 'aba', 'new-token', 'new-token-rejected']) await checkLateSessionRefresh(mode);
    for (const phase of ['confirmation', 'restore', 'pull']) await checkRestoreAccountBoundary(phase);
    checkSdkTokenWatch();
    for (const mode of ['read', 'claim', 'network', 'refusal', 'claim-404', 'read-404', 'current-refusal']) await checkSessionGuardTransitions(mode);
    await checkLateAccountEntry();
    await checkOAuthBootstrapBoundary(false);
    await checkOAuthBootstrapBoundary(true);
}

run()
    .then(() => console.log('smoke-cloud-account-isolation passed'))
    .catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
