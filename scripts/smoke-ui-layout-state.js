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
    const listeners = new Map(), elements = options.elements || {};
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
            getElementById: id => elements[id] || null,
            querySelector: () => null,
            querySelectorAll: () => [],
            createElement: () => ({
                classList: { add() {}, toggle() {}, remove() {}, contains: () => false },
                style: {}, dataset: {}, setAttribute() {}, addEventListener() {}, appendChild() {}, prepend() {},
                // 모바일 경로에서도 목표 서랍이 설치되므로, 하위 요소 접근이 no-op 요소를 받도록 한다.
                querySelector: () => ({ addEventListener() {}, setAttribute() {}, classList: { add() {}, toggle() {}, remove() {}, contains: () => false }, style: {} })
            }),
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
        addEventListener: (type, listener) => listeners.set(type, listener)
    };
    vm.createContext(context);
    require('./lib/load-ui-display')(context);
    vm.runInContext(source, context, { filename: 'js/ui-window-manager.js' });
    return { exposed, saved, lastSaved: () => JSON.parse(saved[saved.length - 1].value),
        resize(desktop) { options.desktop = desktop; listeners.get('resize')(); } };
}

// 1) 손상된 JSON: 예외 없이 부팅되고, 저장 시 기본 상태(version 포함)로 복구된다.
{
    const m = bootManager('{corrupt!!');
    m.exposed.closeCommunityDock();
    const state = m.lastSaved();
    assert.strictEqual(state.version, 1, '손상 저장 후 버전이 복구되어야 함');
    assert.strictEqual(state.passiveTreePresentationVersion, 1, '패시브 트리 창 표현 버전이 복구되어야 함');
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

// 7) 게임을 다시 열면 위치/크기는 유지하되 열린 창과 채팅 도크는 모두 닫힌다.
{
    const m = bootManager(JSON.stringify({
        version: 1,
        windows: { 'tab-items': { open: true, minimized: true, x: 410, y: 90, width: 880, height: 620 } },
        community: { open: true, width: 420 }
    }));
    const bootState = m.lastSaved();
    assert.strictEqual(bootState.windows['tab-items'].open, false, 'saved windows should start closed');
    assert.strictEqual(bootState.windows['tab-items'].minimized, false, 'saved minimized windows should also start closed');
    assert.strictEqual(bootState.windows['tab-items'].x, 410, 'window position should remain available for the next manual open');
    assert.strictEqual(bootState.windows['tab-items'].width, 880, 'window size should remain available for the next manual open');
    assert.strictEqual(bootState.community.open, false, 'chat dock should not reopen automatically');
}

// 8) 병합 하위 탭은 독립 창으로 열리지 않는다.
// 도감은 기록(tab-journal)이 창을 소유하므로 tab-codex를 다시 openWindow하면
// 병합 패널 안에 제목 표시줄과 리사이즈 핸들이 중첩된다.
{
    const m = bootManager(undefined);
    assert.strictEqual(m.exposed.openWindow('tab-codex'), false, 'codex must not create a nested standalone window');
    assert.strictEqual(m.exposed.openWindow('tab-journal'), true, 'the records launcher must remain the codex window owner');
}

// 9) 기존 창 배치는 한 번만 몰입형 패시브 화면으로 이행하고, 이후 사용자의 복원 선택은 보존한다.
{
    const legacy = bootManager(JSON.stringify({
        version: 1,
        windows: { 'tab-char': { open: false, maximized: false, x: 250, y: 80, width: 900, height: 680 } }
    }));
    const migrated = legacy.lastSaved();
    assert.strictEqual(migrated.passiveTreePresentationVersion, 1);
    assert.strictEqual(migrated.windows['tab-char'].maximized, true,
        '기존 패시브 창도 새 표현 버전에서 한 번은 몰입형 크기로 열려야 한다');

    const restored = bootManager(JSON.stringify({
        version: 1,
        passiveTreePresentationVersion: 1,
        windows: { 'tab-char': { open: false, maximized: false, x: 250, y: 80, width: 900, height: 680 } }
    }));
    assert.strictEqual(restored.lastSaved().windows['tab-char'].maximized, false,
        '표현 버전 이행 후 사용자가 창 크기를 복원한 선택은 다시 덮어쓰면 안 된다');
}

// 10) 장비·스킬·지도 창은 한 번만 도킹 작업대로 이행하고, 떼어 낸 창은 다시 붙이지 않는다.
//     전장 폭이 모자란 좁은 데스크톱에서는 도킹 대신 작업 영역 전체를 쓴다.
{
    const legacy = bootManager(JSON.stringify({
        version: 1, passiveTreePresentationVersion: 1, workspacePresentationVersion: 1,
        windows: { 'tab-items': { open: false, maximized: true, x: 150, y: 54, width: 1060, height: 780 } }
    }), { desktop: true, width: 1440, height: 900 });
    const upgraded = legacy.lastSaved();
    assert.strictEqual(upgraded.workspacePresentationVersion, 2);
    assert.strictEqual(upgraded.windows['tab-items'].docked, true, '기존 최대화 장비 창은 도킹 작업대로 이행해야 한다');
    assert.strictEqual(upgraded.windows['tab-items'].maximized, false);
    legacy.exposed.openWindow('tab-items');
    const docked = legacy.lastSaved().windows['tab-items'];
    assert(docked.x > 400 && docked.x + docked.width <= 1440, '도킹 창은 전장 오른쪽에 붙어야 한다: ' + JSON.stringify(docked));

    const floating = bootManager(JSON.stringify({
        version: 1, passiveTreePresentationVersion: 1, workspacePresentationVersion: 2,
        windows: { 'tab-items': { open: false, docked: false, maximized: false, x: 300, y: 60, width: 800, height: 600 } }
    }), { desktop: true, width: 1440, height: 900 });
    floating.exposed.openWindow('tab-items');
    assert.strictEqual(floating.lastSaved().windows['tab-items'].docked, false, '사용자가 떼어 낸 창은 다시 도킹하지 않는다');
    assert.strictEqual(floating.lastSaved().windows['tab-items'].x, 300);

    const narrow = bootManager(undefined, { desktop: true, width: 1100, height: 800 });
    narrow.exposed.openWindow('tab-skills');
    const cover = narrow.lastSaved().windows['tab-skills'];
    assert.strictEqual(cover.docked, true, '도킹 선호는 저장된 채로 남는다');
    assert.strictEqual(cover.x, 140, '좁은 화면에서는 레일 옆 작업 영역 전체를 쓴다');
}

// 11) The phone's selected panel, not an older desktop window, survives a breakpoint.
// DOM classes are the browser boundary; the real manager handles state, focus and storage.
function panel(id) {
    const classes = new Set(), listeners = new Map();
    return { id, dataset: {}, style: {},
        classList: { contains: key => classes.has(key), add: (...keys) => keys.forEach(key => classes.add(key)),
            remove: (...keys) => keys.forEach(key => classes.delete(key)),
            toggle(key, value) { if (value) classes.add(key); else classes.delete(key); } },
        setAttribute() {}, removeAttribute(name) { if (name === 'data-window-prepared') delete this.dataset.windowPrepared; },
        querySelector: () => null, appendChild() {}, prepend() {}, focus() {},
        addEventListener(type, handler) { listeners.set(type, [...(listeners.get(type) || []), handler]); },
        clickAction(action) {
            const button = { dataset: { windowAction: action } };
            const event = { target: { closest: () => button }, stopPropagation() {} };
            for (const listener of listeners.get('click') || []) listener(event);
        } };
}
{
    const elements = Object.fromEntries(['tab-items', 'tab-skills', 'tab-battle'].map(id => [id, panel(id)]));
    elements['tab-items'].classList.add('active');
    const m = bootManager(undefined, { desktop: true, elements });
    assert(!elements['tab-items'].classList.contains('ui-window-open'), 'boot still starts with windows closed');
    m.exposed.openWindow('tab-items');
    const before = m.lastSaved().windows['tab-items'];
    m.resize(false);
    elements['tab-items'].classList.remove('active'); elements['tab-skills'].classList.add('active');
    m.resize(true);
    assert(elements['tab-skills'].classList.contains('ui-window-open'), 'the selected phone panel remains visible on desktop');
    assert(elements['tab-skills'].classList.contains('ui-window-active'), 'the selected panel receives focus');
    elements['tab-skills'].clickAction('maximize');
    assert(m.lastSaved().windows['tab-skills'].maximized, 'one click still maximizes after rebuilding the desktop title bar');
    elements['tab-skills'].clickAction('maximize');
    assert(!m.lastSaved().windows['tab-skills'].maximized, 'a second click restores the window');
    const after = m.lastSaved().windows['tab-items'];
    assert.deepStrictEqual([after.x, after.y, after.width, after.height], [before.x, before.y, before.width, before.height]);
    m.exposed.closeWindow('tab-skills');
    m.resize(true);
    assert(!elements['tab-skills'].classList.contains('ui-window-open'), 'ordinary desktop resizing must not reopen a closed panel');
    m.resize(false);
    elements['tab-skills'].classList.remove('active'); elements['tab-battle'].classList.add('active');
    m.resize(true);
    assert(!elements['tab-items'].classList.contains('ui-window-open'), 'returning to combat on phone must not restore old windows');
    assert(!elements['tab-skills'].classList.contains('ui-window-open'));
}

// 12) The actual tab controller and window manager agree when returning to phone.
{
    const elements = Object.fromEntries(['tab-items', 'tab-skills', 'tab-character', 'tab-battle', 'item-tab-equip', 'item-tab-craft'].flatMap(id =>
        [[id, panel(id)], ['btn-' + id, panel('btn-' + id)]]));
    const { buildGameRuntime } = require('./lib/game-runtime');
    elements['ui-goal-drawer'] = panel('ui-goal-drawer');
    elements['info-tooltip'] = panel('info-tooltip');
    elements['item-tooltip-box'] = panel('item-tooltip-box');
    const runtime = buildGameRuntime({}, null, {
        getElementById: id => elements[id] || null,
        querySelectorAll: selector => selector === '.tab-content:not(.merged-subtab-pane), .tab-btn'
            ? Object.values(elements).filter(el => /^(tab-|btn-tab-)/.test(el.id)) : []
    });
    let desktop = true;
    const listeners = new Map();
    runtime.matchMedia = query => ({ matches: query.includes('min-width') ? desktop : !desktop });
    runtime.addEventListener = (type, handler) => listeners.set(type, handler);
    runtime.document.body.style.setProperty = () => {};
    vm.runInContext('contentProgression.sync(game)', runtime);
    vm.runInContext(source, runtime);
    runtime.openWindow('tab-skills');
    elements['tab-skills'].classList.add('active');
    runtime.closeWindow('tab-skills');
    desktop = false; listeners.get('resize')();
    assert(elements['tab-battle'].classList.contains('active'), 'a closed desktop window must not reappear on phone');
    assert(!elements['tab-skills'].classList.contains('active'));
    desktop = true; listeners.get('resize')();
    runtime.openWindow('tab-items');
    runtime.openWindow('tab-character');
    runtime.closeWindow('tab-character');
    desktop = false; listeners.get('resize')();
    assert(elements['tab-items'].classList.contains('active'), 'phone keeps the remaining visible window after the top one closes');
    assert(!elements['tab-battle'].classList.contains('active'));

    // A content shortcut must focus an already-open destination, and must not
    // toggle it closed when used again. Run the real navigation and window code.
    desktop = true; listeners.get('resize')();
    runtime.openWindow('tab-character');
    elements['tab-items'].classList.add('active');
    vm.runInContext("game.season=3;game.contentProgression.inherited=['craft'];contentProgression.sync();contentUnlockUi.open('craft')", runtime);
    assert(elements['tab-items'].classList.contains('ui-window-active'), 'content shortcuts bring an existing destination above the source window');
    vm.runInContext("contentUnlockUi.open('craft')", runtime);
    assert(elements['tab-items'].classList.contains('ui-window-open'), 'repeated shortcuts keep the destination open');
}

console.log('smoke-ui-layout-state passed');
