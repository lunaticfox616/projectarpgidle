// 목표 서랍 행동 검사.
// js/ui-window-manager.js를 가짜 DOM/스토리지/타이머 경계 위에서 실행해
// presentGoalDrawer 공개 계약(숨김/자동 펼침/자동 수납/필수·고정 예외/화면 열기 전용 버튼)을 고정한다.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('js/ui-window-manager.js', 'utf8');

function createFakeDom() {
    const registry = {};
    function createElement(tag) {
        const el = {
            tagName: String(tag || 'div').toUpperCase(),
            id: '',
            style: {},
            dataset: {},
            attrs: {},
            handlers: {},
            textContent: '',
            _classes: new Set(),
            classList: {
                add: (...names) => names.forEach(name => el._classes.add(name)),
                remove: (...names) => names.forEach(name => el._classes.delete(name)),
                toggle: (name, force) => {
                    const on = force === undefined ? !el._classes.has(name) : !!force;
                    if (on) el._classes.add(name); else el._classes.delete(name);
                    return on;
                },
                contains: name => el._classes.has(name)
            },
            setAttribute: (key, value) => { el.attrs[key] = String(value); },
            getAttribute: key => (key in el.attrs ? el.attrs[key] : null),
            addEventListener: (type, fn) => { el.handlers[type] = fn; },
            removeEventListener: () => {},
            appendChild: () => {},
            prepend: () => {},
            matches: () => false,
            contains: () => false,
            focus: () => {},
            querySelector: sel => (sel.startsWith('#') ? registry[sel.slice(1)] || null : null)
        };
        Object.defineProperty(el, 'innerHTML', {
            set(html) {
                let match;
                const idPattern = /id="([^"]+)"/g;
                while ((match = idPattern.exec(html)) !== null) registry[match[1]] = createElement('div');
            },
            get() { return ''; }
        });
        Object.defineProperty(el, 'className', {
            set(value) { el._classes = new Set(String(value).split(/\s+/).filter(Boolean)); },
            get() { return Array.from(el._classes).join(' '); }
        });
        return el;
    }
    return { registry, createElement };
}

function bootManager() {
    const dom = createFakeDom();
    const exposed = {};
    const timers = [];
    const switchCalls = [];
    const body = dom.createElement('body');
    const context = {
        console, JSON, Math, Number, Object, Array, String,
        setTimeout: (fn, ms) => { timers.push({ fn, ms, cleared: false }); return timers.length; },
        clearTimeout: id => { if (timers[id - 1]) timers[id - 1].cleared = true; },
        requestAnimationFrame: () => 0,
        safeExposeGlobals: fns => Object.assign(exposed, fns),
        document: {
            readyState: 'complete',
            body,
            documentElement: { clientWidth: 1920, clientHeight: 1080 },
            getElementById: id => dom.registry[id] || null,
            querySelector: () => null,
            querySelectorAll: () => [],
            createElement: tag => dom.createElement(tag),
            addEventListener: () => {},
            activeElement: null
        }
    };
    context.window = {
        innerWidth: 1920,
        innerHeight: 1080,
        localStorage: { getItem: () => null, setItem: () => {} },
        matchMedia: () => ({ matches: true }),
        addEventListener: () => {},
        switchTab: tabId => switchCalls.push(tabId)
    };
    context.document.createElement = tag => {
        const el = dom.createElement(tag);
        return new Proxy(el, {
            set(target, prop, value) {
                target[prop] = value;
                if (prop === 'id' && value) dom.registry[value] = target;
                return true;
            }
        });
    };
    vm.createContext(context);
    vm.runInContext(source, context, { filename: 'js/ui-window-manager.js' });
    return { dom, exposed, timers, switchCalls, context };
}

const goal = id => ({ id, title: '혼돈 14층을 돌파하세요', description: '심화층 등반', current: 13, target: 14, actionLabel: '혼돈 지도 열기', actionTabId: 'tab-map' });

// 1) 목표가 없으면 서랍 전체가 숨겨진다.
{
    const m = bootManager();
    const drawer = m.dom.registry['ui-goal-drawer'];
    assert(drawer, '목표 서랍이 설치되어야 함');
    assert.strictEqual(drawer.style.display, 'none', '초기에는 숨김');
    m.exposed.presentGoalDrawer(null);
    assert.strictEqual(drawer.style.display, 'none', 'null 목표는 숨김 유지');
}

// 2) 새 목표는 자동으로 펼치고, 7초 자동 수납 타이머를 건다.
{
    const m = bootManager();
    const drawer = m.dom.registry['ui-goal-drawer'];
    m.exposed.presentGoalDrawer(goal('g1'));
    assert.strictEqual(drawer.style.display, '', '목표가 있으면 표시');
    assert(drawer.classList.contains('expanded'), '새 목표는 자동 펼침');
    const pending = m.timers.filter(t => !t.cleared && t.ms === 7000);
    assert.strictEqual(pending.length, 1, '자동 수납 타이머 1개');
    pending[0].fn();
    assert(!drawer.classList.contains('expanded'), '시간 경과 후 자동 수납');
}

// 3) 같은 목표의 단순 진행 숫자 변화는 다시 펼치지 않는다.
{
    const m = bootManager();
    const drawer = m.dom.registry['ui-goal-drawer'];
    m.exposed.presentGoalDrawer(goal('g1'));
    m.exposed.toggleGoalDrawer(false);
    m.exposed.presentGoalDrawer({ ...goal('g1'), current: 14 });
    assert(!drawer.classList.contains('expanded'), '숫자 변화만으로 자동 펼침 금지');
}

// 4) 필수 목표도 시간이 지나면 자동 수납된다(고정만 수납을 막는다).
{
    const m = bootManager();
    const drawer = m.dom.registry['ui-goal-drawer'];
    m.exposed.presentGoalDrawer({ ...goal('g2'), mandatory: true });
    assert(drawer.classList.contains('expanded'));
    const pending = m.timers.filter(t => !t.cleared && t.ms === 7000);
    assert.strictEqual(pending.length, 1, '필수 목표에도 자동 수납 타이머가 걸려야 함');
    pending[0].fn();
    assert(!drawer.classList.contains('expanded'), '필수 목표도 시간이 지나면 수납');
    assert(drawer.classList.contains('ui-goal-mandatory'), '필수 목표는 시각 강조 클래스 유지');
}

// 5) 고정 상태에서는 자동 수납하지 않는다.
{
    const m = bootManager();
    const drawer = m.dom.registry['ui-goal-drawer'];
    m.dom.registry['ui-goal-pin'].handlers.click();
    m.exposed.presentGoalDrawer(goal('g3'));
    assert(drawer.classList.contains('expanded'));
    assert.strictEqual(m.timers.filter(t => !t.cleared && t.ms === 7000).length, 0, '고정 시 자동 수납 없음');
}

// 6) 목표 버튼은 관련 화면 이동(switchTab)만 수행한다.
{
    const m = bootManager();
    m.exposed.presentGoalDrawer(goal('g4'));
    m.dom.registry['ui-goal-action'].handlers.click();
    assert.deepStrictEqual(m.switchCalls, ['tab-map'], '버튼은 화면 열기만 호출');
}

console.log('smoke-goal-drawer passed');
