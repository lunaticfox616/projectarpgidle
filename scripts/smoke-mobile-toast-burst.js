const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// 모바일/로그숨김 상태에서 실패 알림(예: "일괄 해체할 부적이 없습니다")이 짧은 시간에
// 여러 번 쌓이면, 예전에는 한 번에 하나씩만 순차로 떠서 큐가 밀릴수록 체감이 느려졌다.
// 이제는 (1) 최대 3개까지 동시에 뜨고, (2) 밀린 개수가 많을수록 표시 시간이 짧아져
// 더 빨리 소화되어야 한다.
function readFunctionSource(source, name) {
    const start = source.indexOf(`function ${name}`);
    assert.ok(start >= 0, `${name} must exist`);
    let depth = 0;
    const bodyStart = source.indexOf('{', source.indexOf(')', start));
    for (let index = bodyStart; index < source.length; index++) {
        if (source[index] === '{') depth++;
        if (source[index] !== '}') continue;
        depth--;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`${name} must have a closing brace`);
}

const uiSource = fs.readFileSync('js/ui.js', 'utf8');

// setTimeout/requestAnimationFrame을 수동으로 제어할 수 있는 가짜 타이머로 교체한다.
let pendingTimeouts = [];
let rafQueue = [];
let createdElements = [];
const context = {
    console,
    document: {
        getElementById(id) { return createdElements.find(element => element.id === id) || null; },
        createElement() {
            let element = { style: {}, dataset: {}, listeners: {}, appendChild() {}, remove() {}, parentNode: { removeChild() {} },
                addEventListener(type, fn) { this.listeners[type] = fn; } };
            Object.defineProperty(element, 'innerHTML', {
                set(value) { this.textContent = String(value).replace(/<[^>]*>/g, ''); }
            });
            createdElements.push(element);
            return element;
        },
        body: { appendChild() {} }
    },
    setTimeout(fn, ms) { let entry = { fn, ms }; pendingTimeouts.push(entry); return entry; },
    requestAnimationFrame(fn) { rafQueue.push(fn); return rafQueue.length; },
    matchMedia() { return { matches: true }; },
    game: { settings: { showCombatLog: true } }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
require('./lib/load-ui-display')(context);

const varsSource = uiSource.slice(uiSource.indexOf('let mobileToastQueue ='), uiSource.indexOf('function shouldShowMobileToast'));
const fnNames = ['shouldShowMobileToast', 'getMobileToastRoot', 'stripHtmlMessage', 'enqueueMobileToast', 'pumpMobileToastQueue', 'getMobileToastDisplayDurationMs', 'showNextMobileToast', 'releaseMobileToast', 'resumeMobileToastsAfterResult'];
const combined = varsSource + fnNames.map(name => readFunctionSource(uiSource, name)).join('\n') + '\n'
    + fnNames.map(name => `this.${name} = ${name};`).join('\n')
    + '\nthis.getMobileToastQueue = function(){ return mobileToastQueue; };'
    + '\nthis.getMobileToastActiveCount = function(){ return mobileToastActiveCount; };';
vm.runInContext(combined, context, { filename: 'mobile-toast.js' });

assert.strictEqual(context.shouldShowMobileToast('적 6마리 참전', 'attack-monster'), false,
    'routine combat log entries must not cover mobile controls as toasts');
assert.strictEqual(context.shouldShowMobileToast('재화가 부족합니다', 'attack-monster'), true,
    'important failures should remain visible on mobile');

function flushAllTimeouts() {
    while (pendingTimeouts.length > 0) {
        let batch = pendingTimeouts;
        pendingTimeouts = [];
        batch.forEach(entry => entry.fn());
    }
}

// 6개의 실패 알림을 한꺼번에 쌓는다.
for (let i = 1; i <= 6; i++) context.enqueueMobileToast(`실패 알림 ${i}`, 'attack-monster');

const toastRoot = context.document.getElementById('mobile-toast-root');
assert.strictEqual(toastRoot.style.zIndex, '22000', '오류 알림은 루프 재작성 오버레이보다 위에 표시되어야 한다');
assert.strictEqual(context.getMobileToastActiveCount(), 1, '모바일 알림은 한 개씩 표시해 조작 영역을 가리지 않는다');
assert.strictEqual(context.getMobileToastQueue().length, 5, '나머지는 큐에 남아 다음 자리가 빌 때 순서대로 떠야 한다');

// 표시 시간은 밀린 알림이 많을수록 더 짧아야 한다(점점 빨리 나옴).
let durationWithBacklog = context.getMobileToastDisplayDurationMs();
context.getMobileToastQueue().length = 0; // 큐를 비운 상태를 흉내
let durationEmpty = context.getMobileToastDisplayDurationMs();
assert.ok(durationWithBacklog < durationEmpty, '큐에 알림이 많이 밀려 있을수록 표시 시간이 짧아져야 한다');

// 다시 6개를 채우고, 큐가 완전히 소진될 때까지 타이머를 흘려보낸다.
for (let i = 1; i <= 6; i++) context.getMobileToastQueue().push({ msg: `재시도 ${i}`, cls: 'attack-monster' });
context.pumpMobileToastQueue();
for (let round = 0; round < 20 && (context.getMobileToastQueue().length > 0 || context.getMobileToastActiveCount() > 0); round++) {
    flushAllTimeouts();
}
assert.strictEqual(context.getMobileToastQueue().length, 0, '결국 큐가 모두 소진되어야 한다');
assert.strictEqual(context.getMobileToastActiveCount(), 0, '모든 토스트가 사라진 뒤에는 활성 개수가 0이어야 한다');

// 탭하면 그 알림은 바로(90ms) 사라지고 다음 알림이 뜬다. 뒤늦게 오는 자동 타이머는 같은 알림을 두 번 풀지 않는다.
function runTimeouts(match) {
    let due = pendingTimeouts.filter(match);
    pendingTimeouts = pendingTimeouts.filter(entry => !due.includes(entry));
    due.forEach(entry => entry.fn());
}
pendingTimeouts = [];
context.enqueueMobileToast('첫째', 'attack-monster');
let firstAutoTimers = pendingTimeouts.slice();
context.enqueueMobileToast('둘째', 'attack-monster');
let first = createdElements.filter(element => element.textContent === '첫째').pop();
first.listeners.click();
runTimeouts(entry => entry.ms === 90);
runTimeouts(entry => entry.ms === 0);
assert.strictEqual(context.getMobileToastQueue().length, 0, '탭하면 다음 알림이 바로 나온다');
assert.strictEqual(context.getMobileToastActiveCount(), 1, '떠 있는 것은 둘째 알림 하나');
runTimeouts(entry => firstAutoTimers.includes(entry));
assert.strictEqual(context.getMobileToastActiveCount(), 1, '첫째 알림의 자동 타이머가 와도 활성 개수를 또 줄이지 않는다');
assert.ok(!pendingTimeouts.some(entry => entry.ms === 220), '이미 풀린 알림은 다시 사라지는 애니메이션을 걸지 않는다');


// 방치 전투 결과 창이 떠 있는 동안은 알림을 그리지 않고 기다렸다가, 창이 닫히면 이어서 보인다(PR #1030 리뷰).
flushAllTimeouts();
context.getMobileToastQueue().length = 0;
const resultCard = { id: 'background-combat-result-overlay' };
createdElements.push(resultCard);
const activeBefore = context.getMobileToastActiveCount();
context.enqueueMobileToast('결과 창 뒤 알림', 'attack-monster');
assert.strictEqual(context.getMobileToastActiveCount(), activeBefore, 'no notice is drawn over the offline result card');
assert.strictEqual(context.getMobileToastQueue().length, 1, 'it waits in the queue');
createdElements.splice(createdElements.indexOf(resultCard), 1);
pendingTimeouts.splice(0).forEach(entry => entry.fn());
assert.strictEqual(context.getMobileToastQueue().length, 0, 'after the card closes the notice shows');
console.log('smoke-mobile-toast-burst passed');
