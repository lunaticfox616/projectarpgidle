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
    // 3. Login to an account without a server save starts a fresh account save (revision 1); the guest save stays a guest save.
    {
        const d = createDevice({ guestSave });
        d.signIn();
        assert.strictEqual(await d.runtime.enterAccountSave(), 'pushed-first');
        assert.deepStrictEqual([d.runtime.game.level, d.server.row.revision, d.server.row.save_data.level, d.stored(d.key).level], [1, 1, 1, 42]);
        // 설정의 게스트 저장 옮기기: 계정 저장이 아직 새 게임인 동안만. 옮기면 게스트 칸은 비고 서버 저장이 된다.
        assert.strictEqual(d.runtime.canMoveGuestSaveIntoAccount(), true);
        d.setAnswer(true);
        await d.runtime.moveGuestSaveIntoAccount();
        assert.deepStrictEqual([d.runtime.game.level, d.server.row.revision, d.server.row.save_data.level, d.storage.has(d.key)], [42, 2, 42, false]);
        assert.strictEqual(d.runtime.canMoveGuestSaveIntoAccount(), false, 'nothing left to move');
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
    // 6. Another device committed since: the server wins. Pending progress is offered as a file once, then dropped; nothing goes up.
    {
        const d = createDevice({ guestSave, accountSave: ownedCopy(50, 7, true), serverSave: { ...serverSave, level: 70 }, serverRevision: 9 });
        d.signIn();
        d.setAnswer(true);
        assert.strictEqual(await d.runtime.enterAccountSave(), 'pulled-server');
        assert.strictEqual(d.confirmations.length, 1);
        assert.match(d.confirmations[0].message, /아직 올리지 못한 진행\(루프 4, 레벨 50/);
        assert.deepStrictEqual([d.downloads.length, d.runtime.game.level, d.runtime.game.saveMeta.cloudRevision, d.runtime.game.saveMeta.cloudPending, d.server.commits.length], [1, 70, 9, false, 0]);
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
}

run()
    .then(() => console.log('smoke-cloud-account-isolation passed'))
    .catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
