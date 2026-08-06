// 저장 마이그레이션(mergeDefaults) 행동 검사.
//
// mergeDefaults는 모든 불러오기가 지나가는 단일 관문이다(로컬·클라우드·백그라운드
// 정산·새 게임). 그런데 지금까지는 소스 문자열 검사만 있었고 실제로 옛 저장을
// 넣어 보는 검사가 없었다. 예전 저장을 가진 사람이 돌아왔을 때 조용히 깨지는 것을
// 막으려면 실제 저장 모양을 넣어 봐야 한다.
//
// index.html의 로드 순서대로 27개 파일을 vm에 올린다. DOM은 최소 shim만 준다
// (파일들이 로드 시점에 document/window를 건드리기 때문). 무거워 보이지만
// 이 관문을 실제로 실행해 보는 유일한 방법이고, 전체 실행이 몇 초로 끝난다.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// index.html의 <script> 순서와 같아야 한다. 순서가 바뀌면 로드가 깨지므로
// 이 목록 자체가 로드 순서 계약이기도 하다.
const LOAD_ORDER = [
    'data/constants.js', 'data/maps.js', 'data/skills.js', 'data/items.js',
    'data/growth-items.js', 'data/passives.js', 'data/bosses.js', 'data/rewards.js',
    'data/talent-cards.js',
    'js/utils.js', 'js/ui-feedback.js', 'js/state.js', 'js/save.js', 'js/items.js',
    'js/skills.js', 'js/passives.js', 'js/growth-board.js', 'js/growth-effects.js',
    'js/growth-generation.js', 'js/core-cube.js', 'js/combat-grid.js',
    'js/combat-patterns.js', 'js/combat.js', 'js/canvas-battlefield.js',
    'js/canvas-attack-fx.js', 'js/canvas-passive-tree.js', 'js/ui.js'
];

function buildRuntime() {
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

const ctx = buildRuntime();
assert.strictEqual(typeof ctx.mergeDefaults, 'function', 'mergeDefaults를 불러오지 못했다');

const merge = save => ctx.mergeDefaults(JSON.parse(JSON.stringify(save)));

// ── 새 게임 ──────────────────────────────────────────────────────────────
{
    const g = merge({});
    assert.strictEqual(g.season, 1, '빈 저장은 루프 1로 시작해야 한다');
    assert.ok(Array.isArray(g.inventory), '인벤토리는 배열이어야 한다');
    assert.ok(Array.isArray(g.growthInventory), '생장 보관함도 준비되어야 한다');
    assert.ok(g.playerHp > 0, '체력은 양수여야 한다');
}

// ── 새 시스템 필드가 전혀 없는 옛 저장 ───────────────────────────────────
{
    const g = merge({
        level: 12, season: 3, playerHp: 100,
        inventory: [], equipment: {}, currencies: { goldenRule: 1 },
        unlocks: { items: true }, settings: {}
    });
    assert.strictEqual(g.season, 3, '진행도를 잃으면 안 된다');
    assert.ok(Array.isArray(g.growthInventory), '없던 생장 필드를 만들어 줘야 한다');
    assert.ok(Array.isArray(g.recentGrowthDrops), '최근 획득함도 만들어 줘야 한다');
    assert.strictEqual(typeof g.growthInventoryExpandLevel, 'number', '확장 레벨이 숫자여야 한다');
}

// ── 생장판 추가 전에 저장한 루프 40 세이브 ───────────────────────────────
{
    const g = merge({
        level: 80, season: 40, loopCount: 40, playerHp: 500, maxZoneId: 40,
        inventory: [], equipment: {}, currencies: {}, unlocks: { items: true }, settings: {}
    });
    assert.strictEqual(g.season, 40, '루프를 잃으면 안 된다');
    assert.strictEqual(g.growthInventory.length, 0, '없던 생장 아이템이 생기면 안 된다');
}

// ── 폴리오미노 시절(10x6) 판 저장 ────────────────────────────────────────
// 이 브랜치가 판을 8x4로 줄이고 아이템을 전부 1칸으로 바꿨다.
{
    const g = merge({
        level: 80, season: 40, loopCount: 40, playerHp: 500, maxZoneId: 40,
        inventory: [], equipment: {}, currencies: {}, unlocks: { items: true }, settings: {},
        growthInventory: [
            { id: 11, growthCategory: 'flower', growthShapeId: 'L4', growthBaseId: 'gf_spark_seed', name: 'L4 꽃', rarity: 'rare', baseStats: [], stats: [] },
            { id: 12, growthCategory: 'branch', growthShapeId: 'T4', growthBaseId: 'gb_iron_stump', name: 'T4 가지', rarity: 'rare', baseStats: [], stats: [] }
        ],
        growthBoard: {
            width: 10, height: 6, unlockedCellCount: 60, activeLoadout: 0,
            loadouts: [{ name: '옛 세팅', placements: { 11: { x: 0, y: 0, rotation: 0 }, 12: { x: 9, y: 5, rotation: 1 } } }]
        }
    });
    assert.strictEqual(g.growthInventory.length, 2, '옛 생장 아이템을 잃으면 안 된다');
    // 판 크기 정규화는 mergeDefaults가 아니라 첫 접근 시점의 ensureGrowthBoardState가 한다.
    // 게임도 그 순서로 지나가므로 여기서도 같은 순서로 확인한다.
    // game은 js/utils.js의 최상위 let이라 컨텍스트 속성 대입으로는 바뀌지 않는다.
    // vm 안에서 대입해야 실제 바인딩이 바뀐다.
    ctx.__loaded = g;
    vm.runInContext('game = __loaded; ensureGrowthBoardState(); validateGrowthPlacements();', ctx);
    assert.strictEqual(g.growthBoard.width, ctx.GROWTH_BOARD_W, '판 폭을 현재 값으로 맞춰야 한다');
    assert.strictEqual(g.growthBoard.height, ctx.GROWTH_BOARD_H, '판 높이를 현재 값으로 맞춰야 한다');
    assert.ok(g.growthBoard.unlockedCellCount <= ctx.GROWTH_BOARD_W * ctx.GROWTH_BOARD_H,
        '옛 60칸 해금이 현재 최대 칸수를 넘으면 안 된다');
    // 판 밖(9,5)을 가리키던 배치는 검증 경로가 정리하고, 아이템은 보관함에 남는다.
    const placedIds = Array.from(vm.runInContext('getPlacedGrowthEntries().map(e => e.item.id)', ctx));
    assert.ok(!placedIds.includes(12), '새 판 밖을 가리키는 배치는 정리되어야 한다');
    assert.strictEqual(g.growthInventory.length, 2, '배치가 정리되어도 아이템은 남아야 한다');
}

// ── 큐브 프리셋이 망가진 저장 ────────────────────────────────────────────
{
    const g = merge({
        level: 50, season: 30, playerHp: 300, inventory: [], equipment: {},
        currencies: {}, unlocks: {}, settings: {},
        coreCube: { unlocked: true, everUnlocked: true, faces: 'xxx', powers: null,
                    presets: 'bad', powersUsedEver: 5, presetSlot2Unlocked: 'yes', revealedOptions: 3 }
    });
    assert.ok(g.coreCube && typeof g.coreCube === 'object', '큐브 상태가 객체여야 한다');
    assert.ok(Array.isArray(g.coreCube.faces), '망가진 faces를 배열로 되돌려야 한다');
    assert.ok(Array.isArray(g.coreCube.presets), '망가진 presets를 배열로 되돌려야 한다');
}

// ── 비정상적으로 큰/음수인 확장 레벨 ─────────────────────────────────────
{
    const g = merge({
        level: 50, season: 30, playerHp: 300, inventory: [], equipment: {},
        currencies: {}, unlocks: {}, settings: {},
        growthInventoryExpandLevel: 1e9, inventoryExpandLevel: Infinity, jewelInventoryExpandLevel: -5
    });
    [['growthInventoryExpandLevel', g.growthInventoryExpandLevel],
     ['inventoryExpandLevel', g.inventoryExpandLevel],
     ['jewelInventoryExpandLevel', g.jewelInventoryExpandLevel]].forEach(([name, value]) => {
        assert.ok(Number.isFinite(value) && value >= 0, `${name}은 0 이상의 유한한 수여야 한다 (${value})`);
    });
}

// ── 보관 초과분은 불러오기에서 잘리지 않는다 ─────────────────────────────
// 전투 드랍이 유실 방지로 한도를 넘겨 보관한 희귀·고유 주얼이 조용히 사라지던 회귀.
{
    const jewel = () => ({ id: 0, name: '주얼', rarity: 'rare', stats: [{ id: 'allRes', val: 5, tier: 3 }] });
    const limit = 40;
    const many = Array.from({ length: limit + 3 }, (_, i) => Object.assign(jewel(), { id: 800000 + i }));
    const g = merge({
        level: 50, season: 30, playerHp: 300, inventory: [], equipment: {},
        currencies: {}, unlocks: {}, settings: {}, jewelInventory: many
    });
    assert.ok(g.jewelInventory.length > limit,
        `한도를 넘긴 주얼을 불러오기에서 자르면 안 된다 (${many.length}개 → ${g.jewelInventory.length}개)`);
}

// ── 손상된 저장은 조용히 넘어가지 않고 던진다 ────────────────────────────
// js/save.js가 이 예외를 받아 손상본을 백업하고 자동 저장을 멈춘다.
// 여기서 조용히 빈 배열로 고쳐 버리면 플레이어 아이템이 말없이 사라진다.
{
    assert.throws(() => merge({
        level: 'abc', season: null, playerHp: NaN,
        inventory: 'not-an-array', equipment: null, currencies: [], unlocks: 42, settings: 'x'
    }), '타입이 망가진 저장은 예외로 알려야 한다(손상 저장 처리 경로가 받는다)');
    const save = fs.readFileSync('js/save.js', 'utf8');
    assert.ok(/catch\s*\([^)]*\)\s*\{[\s\S]{0,400}preserveCorruptLocalSave/.test(save),
        '손상 저장은 백업을 남겨야 한다');
    assert.ok(/setLocalSaveRuntimeState\('corrupt'/.test(save), '손상 상태를 기록해 자동 저장을 멈춰야 한다');
}

console.log('smoke-save-migration passed');
