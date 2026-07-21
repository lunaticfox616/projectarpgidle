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
    for (let index = source.indexOf('{', start); index < source.length; index++) {
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
const context = {
    console,
    document: {
        getElementById() { return null; },
        createElement() { return { style: {}, appendChild() {}, remove() {}, parentNode: { removeChild() {} } }; },
        body: { appendChild() {} }
    },
    setTimeout(fn, ms) { let entry = { fn, ms }; pendingTimeouts.push(entry); return entry; },
    requestAnimationFrame(fn) { rafQueue.push(fn); return rafQueue.length; }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const varsSource = 'let mobileToastQueue = [];\nlet mobileToastActiveCount = 0;\nconst MOBILE_TOAST_MAX_CONCURRENT = 3;\n';
const fnNames = ['getMobileToastRoot', 'stripHtmlMessage', 'enqueueMobileToast', 'pumpMobileToastQueue', 'getMobileToastDisplayDurationMs', 'showNextMobileToast'];
const combined = varsSource + fnNames.map(name => readFunctionSource(uiSource, name)).join('\n') + '\n'
    + fnNames.map(name => `this.${name} = ${name};`).join('\n')
    + '\nthis.getMobileToastQueue = function(){ return mobileToastQueue; };'
    + '\nthis.getMobileToastActiveCount = function(){ return mobileToastActiveCount; };';
vm.runInContext(combined, context, { filename: 'mobile-toast.js' });

function flushAllTimeouts() {
    while (pendingTimeouts.length > 0) {
        let batch = pendingTimeouts;
        pendingTimeouts = [];
        batch.forEach(entry => entry.fn());
    }
}

// 6개의 실패 알림을 한꺼번에 쌓는다.
for (let i = 1; i <= 6; i++) context.enqueueMobileToast(`실패 알림 ${i}`, 'attack-monster');

assert.strictEqual(context.getMobileToastActiveCount(), 3, '밀린 알림이 많아도 동시에는 최대 3개까지만 떠야 한다');
assert.strictEqual(context.getMobileToastQueue().length, 3, '나머지는 큐에 남아 다음 자리가 빌 때 순서대로 떠야 한다');

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

console.log('smoke-mobile-toast-burst passed');
