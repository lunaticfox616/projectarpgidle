// 정적 UI 렌더 도중 들어온 탭 전환 갱신을 다음 프레임까지 보존하는지 검사한다.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
const callbacks = [];
let requestDuringRender = true;

runtime.requestAnimationFrame = callback => {
    callbacks.push(callback);
    return callbacks.length;
};

// 실제 렌더가 DOM을 처음 조회하는 순간 사용자의 후속 탭 갱신을 재현한다.
// DOM만 외부 경계로 대체하고 updateStaticUI/performUpdateStaticUI는 실제 구현을 실행한다.
runtime.document.getElementById = () => {
    if (requestDuringRender) {
        requestDuringRender = false;
        runtime.updateStaticUI();
    }
    const element = runtime.document.createElement();
    element.style.setProperty = () => {};
    return element;
};

runtime.updateStaticUI();
assert.strictEqual(callbacks.length, 1, '첫 UI 갱신은 다음 프레임에 예약되어야 한다');

callbacks.shift()();
assert.strictEqual(callbacks.length, 1,
    '렌더 도중 들어온 탭 전환 갱신은 버리지 않고 다음 프레임에 다시 예약해야 한다');

callbacks.shift()();
assert.strictEqual(callbacks.length, 0, '보존된 후속 렌더까지 실행한 뒤 예약이 남으면 안 된다');

let renderReads = 0;
runtime.document.getElementById = () => {
    renderReads++;
    const element = runtime.document.createElement();
    element.style.setProperty = () => {};
    return element;
};
runtime.document.activeElement = { tagName: 'SELECT', isConnected: true };
runtime.updateStaticUI();
assert.strictEqual(callbacks.length, 1, '선택창 포커스 중에도 갱신 요청 자체는 한 번 예약되어야 한다');
callbacks.shift()();
assert.strictEqual(renderReads, 0, '열린 네이티브 선택창의 DOM을 정적 갱신으로 교체하면 안 된다');
runtime.document.activeElement = null;
vm.runInContext('processQueuedUIRefresh()', runtime);
assert.ok(renderReads > 0, '선택창 포커스가 끝나면 보류한 정적 갱신을 실행해야 한다');

const details = { dataset: { uiDisclosure: 'smoke-panel' }, open: true, id: '', closest: () => null };
const disclosureRoot = { querySelectorAll: selector => selector === 'details' ? [details] : [] };
runtime.__disclosureRoot = disclosureRoot;
runtime.__details = details;
vm.runInContext('captureUiDisclosureState(__disclosureRoot)', runtime);
details.open = false;
vm.runInContext('restoreUiDisclosureState(__disclosureRoot)', runtime);
assert.strictEqual(details.open, true, '열린 접이식 카드 상태는 DOM 재생성 뒤 복원되어야 한다');
details.open = false;
vm.runInContext('captureUiDisclosureState(__disclosureRoot)', runtime);
details.open = true;
vm.runInContext('restoreUiDisclosureState(__disclosureRoot)', runtime);
assert.strictEqual(details.open, false, '사용자가 접은 카드도 다음 갱신에서 다시 열리면 안 된다');

console.log('smoke-ui-refresh-queue passed');
