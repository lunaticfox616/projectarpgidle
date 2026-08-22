// index.html의 <script> 순서대로 게임 전체를 node vm에 올린다.
//
// 이 게임은 번들러가 없어서 파일들이 전역을 통해 서로를 부른다. 그래서
// "실제로 불러왔을 때 그 함수가 전역에 있는가"는 소스만 읽어서는 알 수 없고,
// 한 번 올려 봐야 안다. mergeDefaults 같은 관문 함수나 모듈 간 호출면 검사가
// 이 로더를 쓴다.
//
// DOM은 최소 shim만 준다. 파일들이 로드 시점에 document/window를 건드리므로
// 없으면 로드 자체가 실패한다. 화면을 검사하려는 것이 아니라 로드를 통과시키는 것이 목적이다.
const fs = require('fs');
const vm = require('vm');

// index.html의 <script src> 순서와 같아야 한다. 이 목록 자체가 로드 순서 계약이다.
const LOAD_ORDER = [
    'data/constants.js', 'data/shrines.js', 'data/bounties.js', 'data/maps.js', 'data/skills.js', 'data/endgame-progression.js', 'data/severed-wanderers.js', 'data/items.js', 'data/offline-progress.js',
    'data/growth-items.js', 'data/passives.js', 'data/bosses.js', 'data/rewards.js',
    'data/talent-cards.js',
    'js/utils.js', 'js/ui-feedback.js', 'js/state.js', 'js/endgame-progression.js', 'js/hideout.js', 'js/salvage-recovery.js', 'js/unique-hunt.js', 'js/offline-progress.js', 'js/records.js', 'js/save.js', 'js/items.js', 'js/equipment-loadouts.js',
    'js/passives.js', 'js/battle-backdrops.js', 'js/shrines.js', 'js/growth-board.js', 'js/growth-effects.js',
    'js/growth-generation.js', 'js/equipment-stat-resolution.js', 'js/skills.js', 'js/bounties.js', 'js/core-cube.js', 'js/combat-grid.js', 'js/condition-patterns.js', 'js/hidden-journal.js', 'js/severed-wanderers.js',
    'js/combat-patterns.js', 'js/combat.js', 'js/combat-ehp.js', 'js/equipment-triage.js', 'js/canvas-battlefield.js',
    'js/canvas-attack-fx.js', 'js/canvas-passive-tree.js', 'js/crafting-result-ui.js', 'js/bounty-ui.js', 'js/loop-ui.js', 'js/endgame-progression-ui.js', 'js/hideout-ui.js', 'js/ui.js', 'js/salvage-recovery-ui.js', 'js/unique-hunt-ui.js', 'js/equipment-loadouts-ui.js', 'js/growth-ui.js',
    'js/skills-ui.js', 'js/offline-progress-ui.js', 'js/records-ui.js',
    'js/talent-cards.js', 'js/talent-precise.js', 'js/talent-hit-effects.js', 'js/talent-recovery.js'
];
// 여기까지만 올린다. index.html은 뒤에 ui-window-manager·goal-system·main 등을 더
// 불러오지만, 그쪽은 로드 시점에 실제 DOM 노드를 찾아 이벤트를 건다(초기화까지 실행).
// 최소 shim으로는 통과할 수 없고, 통과시키려고 shim을 키우면 그 자체가 깨지기 쉬운
// 가짜 브라우저가 된다. 이 로더의 목적은 "게임 데이터·도메인·UI 모듈이 전역에
// 올라오는가"이므로 거기까지면 충분하다.
// index.html 전체 순서와의 일치는 smoke-growth-module-surface.js가 따로 확인한다.

function buildGameRuntime() {
    const noop = () => {};
    const stubCtx = {
        fillRect: noop, clearRect: noop, drawImage: noop, save: noop, restore: noop,
        beginPath: noop, arc: noop, fill: noop, stroke: noop, closePath: noop, clip: noop,
        moveTo: noop, lineTo: noop, fillText: noop, translate: noop, rotate: noop,
        scale: noop, setTransform: noop, putImageData: noop,
        measureText: () => ({ width: 0 }), getImageData: () => ({ data: [] }),
        createLinearGradient: () => ({ addColorStop: noop })
    };
    const makeEl = () => ({
        style: {}, dataset: {}, children: [], childNodes: [],
        classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
        innerHTML: '', innerText: '', textContent: '', value: '',
        hidden: false, disabled: false, checked: false, offsetParent: null,
        appendChild: noop, insertBefore: noop, removeChild: noop, remove: noop,
        setAttribute: noop, getAttribute: () => null, removeAttribute: noop,
        addEventListener: noop, removeEventListener: noop,
        querySelector: () => null, querySelectorAll: () => [], closest: () => null,
        getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }),
        getContext: () => stubCtx
    });
    const context = {
        console: { log: noop, warn: noop, error: noop, info: noop },
        setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
        requestAnimationFrame: () => 0, cancelAnimationFrame: noop,
        Math, JSON, Date, Number, String, Boolean, Array, Object, Set, Map, WeakMap, Promise,
        isNaN, parseInt, parseFloat, Infinity, NaN,
        performance: { now: () => Date.now() },
        localStorage: { getItem: () => null, setItem: noop, removeItem: noop, clear: noop, length: 0 },
        navigator: { userAgent: 'node', language: 'ko' },
        location: { href: 'http://localhost/', protocol: 'http:', search: '' },
        fetch: () => Promise.reject(new Error('vm has no network')),
        Image: function () { return makeEl(); },
        matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }),
        addEventListener: noop, removeEventListener: noop, dispatchEvent: noop,
        getComputedStyle: () => ({ getPropertyValue: () => '' }),
        innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1,
        scrollTo: noop, alert: noop, confirm: () => false, prompt: () => null
    };
    context.window = context;
    context.globalThis = context;
    context.self = context;
    context.document = {
        readyState: 'complete', hidden: false, visibilityState: 'visible',
        body: makeEl(), documentElement: makeEl(), head: makeEl(),
        getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
        createElement: makeEl, createTextNode: makeEl, createDocumentFragment: makeEl,
        addEventListener: noop, removeEventListener: noop
    };
    vm.createContext(context);
    LOAD_ORDER.forEach(file => {
        vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
    });
    return context;
}

module.exports = { LOAD_ORDER, buildGameRuntime };
