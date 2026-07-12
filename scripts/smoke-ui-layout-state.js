// UI 배치 저장 상태의 손상/경계 입력 처리 검사.
// js/ui-window-manager.js 전체를 가짜 브라우저 경계(localStorage/matchMedia/DOM stub) 위에서
// 실행해, 공개 API를 통해 관찰 가능한 저장 결과를 검증한다.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('js/ui-window-manager.js', 'utf8');

function bootManager(storedRaw, options = {}) {
    const saved = [];
    const exposed = {};
    const storage = {
        getItem: () => (storedRaw === undefined ? null : storedRaw),
        setItem: (key, value) => saved.push({ key, value })
    };
    const fakeBody = {
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        style: { setProperty() {}, removeProperty() {} },
        appendChild() {}
    };
    const context = {
        console,
        JSON,
        Math,
        Number,
        Object,
        Array,
        String,
        window: null,
        document: {
            readyState: 'complete',
            body: fakeBody,
            documentElement: { clientWidth: 1280, clientHeight: 720 },
            getElementById: () => null,
            querySelector: () => null,
            querySelectorAll: () => [],
            createElement: () => ({ classList: { add() {}, toggle() {} }, style: {}, dataset: {}, setAttribute() {}, addEventListener() {}, appendChild() {}, prepend() {}, querySelector: () => null }),
            addEventListener() {}
        },
        requestAnimationFrame: () => 0,
        safeExposeGlobals: fns => Object.assign(exposed, fns)
    };
    context.window = {
        innerWidth: options.width || 1280,
        innerHeight: options.height || 720,
        localStorage: storage,
        matchMedia: () => ({ matches: !!options.desktop }),
        addEventListener() {}
    };
    vm.createContext(context);
    vm.runInContext(source, context, { filename: 'js/ui-window-manager.js' });
    return { exposed, saved, lastSaved: () => JSON.parse(saved[saved.length - 1].value) };
}

// 1) 손상된 JSON: 예외 없이 부팅되고, 저장 시 기본 상태(version 포함)로 복구된다.
{
    const m = bootManager('{corrupt!!');
    m.exposed.closeCommunityDock();
    const state = m.lastSaved();
    assert.strictEqual(state.version, 1, '손상 저장 후 버전이 복구되어야 함');
    assert.strictEqual(state.community.open, false);
    assert.strictEqual(state.community.width, 360, '손상 저장 후 커뮤니티 기본 너비');
}

// 2) 저장 없음(null): 기본 상태로 동작한다.
{
    const m = bootManager(undefined);
    m.exposed.closeCommunityDock();
    const state = m.lastSaved();
    assert.deepStrictEqual(state.goals, { expanded: false, pinned: false });
}

// 3) 숫자가 아닌 커뮤니티 너비: 기본값 360으로 정규화된다.
{
    const m = bootManager(JSON.stringify({ version: 1, community: { open: true, width: 'abc' } }));
    m.exposed.closeCommunityDock();
    assert.strictEqual(m.lastSaved().community.width, 360, '비숫자 너비는 기본값으로');
}

// 4) 범위를 벗어난 너비: 최소/최대로 clamp된다.
{
    const wide = bootManager(JSON.stringify({ community: { width: 99999 } }));
    wide.exposed.closeCommunityDock();
    assert.strictEqual(wide.lastSaved().community.width, 520, '과대 너비는 최대값으로 clamp');
    const narrow = bootManager(JSON.stringify({ community: { width: 5 } }));
    narrow.exposed.closeCommunityDock();
    assert.strictEqual(narrow.lastSaved().community.width, 280, '과소 너비는 최소값으로 clamp');
}

// 5) 필드 누락/이상 타입 windows: 객체가 아니면 빈 windows로 대체된다.
{
    const m = bootManager(JSON.stringify({ version: 0, windows: 'garbage', goals: 7 }));
    m.exposed.resetWindowLayout();
    const state = m.lastSaved();
    assert.deepStrictEqual(state.windows, {}, '이상 타입 windows는 비워져야 함');
    assert.deepStrictEqual(state.goals, { expanded: false, pinned: false }, '이상 타입 goals는 기본값');
}

// 6) UI 배치 초기화: 저장된 창 배치가 있어도 기본 상태로 되돌린다.
{
    const m = bootManager(JSON.stringify({
        version: 1,
        windows: { 'tab-items': { open: true, x: -5000, y: -5000, width: 20, height: 20 } },
        community: { open: true, width: 500 },
        goals: { expanded: true, pinned: true }
    }));
    m.exposed.resetWindowLayout();
    const state = m.lastSaved();
    assert.deepStrictEqual(state.windows, {});
    assert.strictEqual(state.community.open, false);
    assert.strictEqual(state.goals.pinned, false);
}

console.log('smoke-ui-layout-state passed');
