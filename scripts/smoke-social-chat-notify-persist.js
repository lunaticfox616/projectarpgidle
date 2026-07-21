const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// 배경 채팅 알림의 토스트 중복 방지 기준(lastNotifiedChatId)이 세션 메모리에만 있으면,
// 아직 채팅 탭을 열어 "읽음" 처리하지 않은 메시지라도 페이지 새로고침 한 번에 세션 상태가
// 날아가 같은 메시지로 토스트가 다시 뜬다. localStorage에 영구 기억해 새로고침 후에도
// 이미 알려준 메시지는 다시 알리지 않아야 한다.
const storage = new Map();
const toasts = [];

function buildContext() {
    const context = {
        console,
        window: null,
        globalThis: null,
        localStorage: {
            getItem(key) { return storage.has(key) ? storage.get(key) : null; },
            setItem(key, value) { storage.set(key, String(value)); },
            removeItem(key) { storage.delete(key); }
        },
        document: {
            readyState: 'complete',
            getElementById() { return null; },
            body: { classList: { contains() { return false; } }, appendChild() {} },
            createElement() { return { textContent: '', style: {}, classList: { add() {}, remove() {} } }; },
            head: { appendChild() {} }
        },
        showGameToast(message) { toasts.push(message); },
        updateTabNotificationDots() {},
        setInterval() { return 1; },
        clearInterval() {},
        setTimeout() { return 1; },
        Date, Math, Number, String, Array, Object, RegExp, JSON, encodeURIComponent
    };
    context.window = context;
    context.globalThis = context;
    vm.createContext(context);
    vm.runInContext(fs.readFileSync('js/social.js', 'utf8'), context, { filename: 'js/social.js' });
    context.cloudState = { user: { id: 'me' } };
    context.game = { noti: {}, settings: {} };
    return context;
}

async function run() {
    // "이 기기에서 채팅을 한 번도 안 봄" 최초 확인 분기를 피하기 위해 이전 세션에서 이미
    // 채팅을 본 적이 있는 것처럼 seen 기준점을 미리 심어둔다(최초 확인 시에는 과거 메시지로
    // 알리지 않고 기준점만 잡는 게 의도된 동작이라, 그 분기와는 별개로 검증해야 한다).
    storage.set('arpg_social_last_seen_chat_id', '100');

    // 1세대 컨텍스트: 다른 유저의 새 메시지 하나를 감지 → 토스트가 떠야 한다.
    let ctxA = buildContext();
    ctxA.cloudJsonRequest = async () => [{ id: 501, user_id: 'other', nickname: 'Bob', body: '안녕!' }];
    await ctxA.checkSocialChatNotification();
    assert.strictEqual(toasts.length, 1, '새 메시지는 최초 한 번 토스트로 알려야 한다');
    assert.ok(ctxA.game.noti.social, '읽지 않은 메시지가 있으면 알림 점이 켜져야 한다');

    // 아직 채팅 탭을 열어 seen을 진전시키지 않은 상태 그대로, "새로고침"을 흉내 내기 위해
    // 완전히 새로운 vm 컨텍스트(세션 메모리 초기화)를 만들되 같은 localStorage(storage Map)는 유지한다.
    let ctxB = buildContext();
    ctxB.cloudJsonRequest = async () => [{ id: 501, user_id: 'other', nickname: 'Bob', body: '안녕!' }];
    await ctxB.checkSocialChatNotification();
    assert.strictEqual(toasts.length, 1, '새로고침으로 세션이 초기화돼도 이미 알렸던 메시지를 다시 토스트하면 안 된다');

    // 진짜 새 메시지(다른 id)가 오면 다시 알려야 한다.
    let ctxC = buildContext();
    ctxC.cloudJsonRequest = async () => [{ id: 502, user_id: 'other', nickname: 'Bob', body: '두 번째' }];
    await ctxC.checkSocialChatNotification();
    assert.strictEqual(toasts.length, 2, '진짜 새로운 메시지는 여전히 토스트로 알려야 한다');

    console.log('smoke-social-chat-notify-persist passed');
}

run().catch(err => { console.error(err); process.exit(1); });
