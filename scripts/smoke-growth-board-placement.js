// 생장판 배치 도메인 회귀 검사: 1칸 계약, 경계·봉인·겹침 거부, 회전(방향 조건용),
// 세팅별 독립 배치, 아이템 소실 시 배치 정리, 루프 리셋.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function loadGrowthContext() {
    const context = {
        console,
        window: {},
        game: {
            maxZoneId: 0,
            season: 1,
            inventory: [],
            growthInventory: [],
            recentGrowthDrops: [],
            growthBoard: null,
            settings: { showLootLog: false, autoSalvageEnabled: false, autoSalvageRarities: {} }
        },
        addLog: () => {},
        updateStaticUI: () => {},
        queueImportantSave: () => {},
        startMoving: () => {},
        normalizeItem: item => item,
        salvageItemObject: () => {},
        addItemToInventory: () => true,
        getInventoryLimit: () => 60,
        registerUniqueToCodexOnAcquire: () => {},
        passesItemPickupFilter: () => true
    };
    context.safeExposeData = function (map) {
        Object.keys(map || {}).forEach(key => {
            if (typeof context[key] === 'undefined') context[key] = map[key];
        });
    };
    context.safeExposeGlobals = function (map) {
        Object.keys(map || {}).forEach(key => { context.window[key] = map[key]; });
    };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync('data/growth-items.js', 'utf8'), context);
    vm.runInContext(fs.readFileSync('js/growth-board.js', 'utf8'), context);
    // 공간 효과 캐시 무효화는 배치 모듈이 호출하므로 최소 구현만 제공한다.
    vm.runInContext('function invalidateGrowthEffects() { globalThis.__invalidateCount = (globalThis.__invalidateCount || 0) + 1; }', context);
    return context;
}

function makeItem(ctx, id, shapeId, category) {
    const item = { id, growthShapeId: shapeId, growthCategory: category || 'flower', growthBaseId: 'test_base', name: `item${id}`, rarity: 'normal', baseStats: [], stats: [] };
    ctx.game.growthInventory.push(item);
    return item;
}

const ctx = loadGrowthContext();
const run = code => vm.runInContext(code, ctx);

// ── 형태 회전과 정규화 ────────────────────────────────────────────────────
// VM 컨텍스트의 배열은 프로토타입이 달라 deepStrictEqual이 실패한다. 직렬화해서 비교한다.
const json = code => run(`JSON.stringify(${code})`);

assert.strictEqual(json('normalizeGrowthCells([[3,5]])'), '[[0,0]]', '정규화는 좌상단 원점 정렬이어야 한다');

// 1칸 호환 형태와 2~4칸 회전 형태가 모두 동작한다.
assert.strictEqual(run('getGrowthItemCells({ growthShapeId: "dot1" }, 0).length'), 1, 'dot1은 1칸이어야 한다');
assert.strictEqual(json('getGrowthItemCells({ growthShapeId: "line3" }, 1)'), '[[0,0],[0,1],[0,2]]', '3칸 직선은 세로로 회전해야 한다');
assert.strictEqual(run('getGrowthItemCells({ growthShapeId: "square4" }, 0).length'), 4, '고급 형태는 최대 4칸을 지원해야 한다');
// 예전 저장에 남은 폴리오미노 id도 1칸으로 해석되어야 한다(마이그레이션 없이 호환).
assert.strictEqual(json('getGrowthItemCells({ growthShapeId: "ring8" }, 0)'), '[[0,0]]', '알 수 없는 형태 id는 1칸으로 되돌아야 한다');
assert.strictEqual(run('getGrowthItemCells({ growthShapeId: "block9" }, 0).length'), 1, '모든 아이템의 크기는 1이어야 한다');

// ── 해금 게이트: 생장판은 루프 25 전에는 존재하지 않는다 ──────────────────
run('ensureGrowthBoardState()');
assert.strictEqual(run('isGrowthBoardUnlocked()'), false, '루프 25 전에는 생장판이 잠겨 있어야 한다');
run('syncGrowthBoardUnlocks({ silent: true })');
assert.strictEqual(run('game.growthBoard.unlockedCellCount'), 0, '해금 전에는 활성 칸이 0이어야 한다');
assert.strictEqual(run('isGrowthCellUnlocked(5, 2)'), false, '해금 전에는 어떤 칸도 열려 있으면 안 된다');
assert.strictEqual(run('game.growthBoard.loadouts.length'), 3, '세팅은 항상 3개여야 한다');

// 루프 24까지는 여전히 잠겨 있다(경계값).
ctx.game.season = 24;
run('syncGrowthBoardUnlocks({ silent: true })');
assert.strictEqual(run('game.growthBoard.unlockedCellCount'), 0, '루프 24에서도 아직 잠겨 있어야 한다');

// 루프 25에 8칸으로 각성한다.
ctx.game.season = 25;
run('syncGrowthBoardUnlocks({ silent: true })');
assert.strictEqual(run('isGrowthBoardUnlocked()'), true, '루프 25에 해금되어야 한다');
assert.strictEqual(run('game.growthBoard.unlockedCellCount'), 8, '해금 시점에는 8칸이어야 한다');

// 루프가 진행되면 칸이 늘고, 되돌아가도 줄어들지 않는다(영구 성장).
ctx.game.season = 32;
run('syncGrowthBoardUnlocks({ silent: true })');
assert.strictEqual(run('game.growthBoard.unlockedCellCount'), 15, '루프 32에서 15칸이어야 한다');
ctx.game.season = 25;
run('syncGrowthBoardUnlocks({ silent: true })');
assert.strictEqual(run('game.growthBoard.unlockedCellCount'), 15, '해금 칸은 진행이 후퇴해도 줄지 않아야 한다');

// ── 배치 검증 ────────────────────────────────────────────────────────────
makeItem(ctx, 1, 'dot1', 'flower');
assert.strictEqual(run('placeGrowthItem(1, 4, 1, 0).ok'), true, '해금된 칸에는 배치할 수 있어야 한다');

// 경계 초과 거부
makeItem(ctx, 2, 'dot1', 'flower');
assert.strictEqual(run('canPlaceGrowthItem(findGrowthItemById(2), GROWTH_BOARD_W, 1, 0).ok'), false, '보드 밖으로 나가는 배치는 거부해야 한다');

// 봉인 칸 거부 (해금은 중앙부터이므로 모서리는 15칸 단계에서 봉인 상태)
assert.strictEqual(run('isGrowthCellUnlocked(0, 0)'), false, '모서리 칸은 아직 봉인 상태여야 한다');
assert.strictEqual(run('canPlaceGrowthItem(findGrowthItemById(2), 0, 0, 0).ok'), false, '봉인된 칸에는 배치할 수 없어야 한다');

// 겹침 거부
makeItem(ctx, 3, 'dot1', 'branch');
assert.strictEqual(run('canPlaceGrowthItem(findGrowthItemById(3), 4, 1, 0).ok'), false, '이미 점유된 칸에는 배치할 수 없어야 한다');
assert.strictEqual(run('placeGrowthItem(3, 5, 1, 0).ok'), true, '비어 있는 칸에는 배치할 수 있어야 한다');

// UI 배치 경로는 겹침 오류 대신 두 자리의 아이템을 원자적으로 교환한다.
const swap = JSON.parse(run('JSON.stringify(placeGrowthItem(1, 5, 1, 0))'));
assert.strictEqual(swap.mode, 'swap', '배치된 한 아이템 위로 옮기면 위치를 교환해야 한다');
assert.strictEqual(run('getActiveGrowthLoadout().placements[1].x'), 5, '선택 아이템은 새 자리로 가야 한다');
assert.strictEqual(run('getActiveGrowthLoadout().placements[3].x'), 4, '밀린 아이템은 선택 아이템의 이전 자리로 가야 한다');
assert.strictEqual(run('placeGrowthItem(1, 4, 1, 0).mode'), 'swap', '반대로 옮겨 원래 자리로 되돌릴 수 있어야 한다');

// 자기 자신과는 겹침 판정을 하지 않는다(같은 자리 회전/재배치).
assert.strictEqual(run('canPlaceGrowthItem(findGrowthItemById(1), 4, 1, 0).ok'), true, '자기 자신이 있는 자리로의 재배치는 허용해야 한다');

// 회전은 점유 칸을 바꾸지 않지만(1칸), 방향 조건용으로 값이 저장되어야 한다.
assert.strictEqual(run('rotatePlacedGrowthItem(1).ok'), true, '1칸이어도 회전은 항상 가능해야 한다');
assert.strictEqual(run('getActiveGrowthLoadout().placements[1].rotation'), 1, '회전 결과가 저장되어야 한다');
assert.strictEqual(json('getGrowthItemCells(findGrowthItemById(1), 1)'), '[[0,0]]', '회전해도 점유 칸은 1칸 그대로여야 한다');

// ── 세팅 독립성 ──────────────────────────────────────────────────────────
run('game.growthBoard.activeLoadout = 1');
assert.strictEqual(run('Object.keys(getActiveGrowthLoadout().placements).length'), 0, '다른 세팅은 독립적으로 비어 있어야 한다');
assert.strictEqual(run('placeGrowthItem(1, 4, 1, 0).ok'), true, '같은 아이템을 다른 세팅에서도 배치할 수 있어야 한다');
run('game.growthBoard.activeLoadout = 0');
assert.strictEqual(run('getActiveGrowthLoadout().placements[1].rotation'), 1, '세팅을 오가도 원래 세팅의 배치가 보존되어야 한다');

// ── 아이템 소실 후 정리 ──────────────────────────────────────────────────
run('game.growthInventory = game.growthInventory.filter(function (item) { return item.id !== 3; })');
const removed = run('validateGrowthPlacements()');
assert.ok(removed >= 1, '보관함에서 사라진 아이템의 배치는 제거되어야 한다');
assert.strictEqual(run('getActiveGrowthLoadout().placements[3]'), undefined, '유효하지 않은 배치가 남아 있으면 안 된다');
assert.ok(run('getActiveGrowthLoadout().placements[1]') !== undefined, '유효한 배치는 유지되어야 한다');

// 배치된 아이템은 일괄 해체 보호 대상이다.
assert.strictEqual(run('isGrowthItemPlacedAnywhere(1)'), true, '배치된 아이템은 보호 대상으로 보고되어야 한다');
assert.strictEqual(run('purgeGrowthItemFromAllLoadouts(1) >= 1'), true, '모든 세팅에서 배치를 정리할 수 있어야 한다');
assert.strictEqual(run('isGrowthItemPlacedAnywhere(1)'), false, '정리 후에는 배치가 남지 않아야 한다');

// ── 루프 리셋 ────────────────────────────────────────────────────────────
run('placeGrowthItem(2, 3, 1, 0)');
run('resetGrowthBoardForLoop(game.growthBoard.unlockedCellCount)');
assert.strictEqual(run('Object.keys(getActiveGrowthLoadout().placements).length'), 0, '루프 리셋은 배치를 비워야 한다');
assert.strictEqual(run('game.growthBoard.unlockedCellCount'), 15, '루프 리셋 후에도 해금 칸은 유지되어야 한다');

// ── 자동 배치: 석판은 영향 범위가 넓게 닿는 칸에 놓아야 한다 ──────────────
// 회귀: 앞칸부터 채우면 석판이 (0,0) 모서리에 박혀 상하좌우·주변 8칸 패턴이
// 절반 넘게 판 밖으로 새어 나간다 — 석판을 먼저 놓는 의미가 사라진다.
{
    const ctx2 = loadGrowthContext();
    ctx2.game.season = 60;
    vm.runInContext('ensureGrowthBoardState(); syncGrowthBoardUnlocks({ silent: true });', ctx2);
    const mk = (id, category, slabId) => {
        ctx2.game.growthInventory.push({
            id, growthShapeId: 'dot1', growthCategory: category, growthSlabId: slabId || null,
            growthBaseId: category === 'slab' ? null : 'test_base', name: `it${id}`, rarity: 'normal', baseStats: [], stats: []
        });
    };
    mk(1, 'slab', 'gs_hearth');
    for (let i = 2; i <= 10; i++) mk(i, 'flower');
    vm.runInContext('autoFillGrowthBoard()', ctx2);

    const slabCell = vm.runInContext(`(function () {
        var entry = getPlacedGrowthEntries().find(function (e) { return isGrowthSlab(e.item); });
        return entry ? entry.cells[0] : null;
    })()`, ctx2);
    assert.ok(slabCell, '석판이 배치되어야 한다');

    const reach = vm.runInContext(`(function () {
        var c = getPlacedGrowthEntries().find(function (e) { return isGrowthSlab(e.item); }).cells[0];
        var r = 0;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (isGrowthCellUnlocked(c[0] + dx, c[1] + dy)) r++;
        }
        return r;
    })()`, ctx2);
    assert.strictEqual(reach, 8, `석판은 주변 8칸이 모두 살아 있는 안쪽 칸에 놓여야 한다 (현재 ${reach}칸)`);
}

// ── 렌더 지문 계약 (js/growth-ui.js) ─────────────────────────────────────
// renderGrowthTab은 updateStaticUI마다 불린다. 매번 전부 다시 그리면 25ms가 나와
// 전투 중 프레임이 튄다. 대신 지문으로 걸러 내는데, 화면에 영향을 주는 값이
// 지문에서 빠지면 반대로 화면이 낡은 채로 굳는다. 빠지기 쉬운 항목을 고정한다.
{
    const ui = fs.readFileSync('js/growth-ui.js', 'utf8');
    const sig = ui.slice(ui.indexOf('function getGrowthTabSignature'), ui.indexOf('function renderGrowthTab'));
    assert.ok(sig.length > 0, '렌더 지문 함수가 있어야 한다');
    [
        ['activeLoadout', '세팅 전환'],
        ['unlockedCellCount', '칸 해금'],
        ['placements', '배치'],
        ['rarity', '제작으로 바뀐 등급'],
        ['stats', '제작으로 바뀐 옵션 수'],
        ['locked', '잠금 토글'],
        ['recentGrowthDrops', '최근 획득함'],
        ['growthSelection.itemId', '선택'],
        ['growthInventoryFilter', '보관함 필터'],
        ['growthSortMode', '정렬']
    ].forEach(([token, why]) => {
        assert.ok(sig.includes(token), `렌더 지문에 ${token}(${why})이 빠지면 화면이 낡은 채로 굳는다`);
    });
    // 지문이 같아도 강제로 다시 그릴 수 있어야 한다(첫 렌더·DOM 교체 대비).
    const render = ui.slice(ui.indexOf('function renderGrowthTab'), ui.indexOf('function renderGrowthTab') + 700);
    assert.ok(/options\s*&&\s*options\.force/.test(render), '강제 렌더 경로가 있어야 한다');
    assert.ok(/!host\s*\|\|\s*!host\.firstChild/.test(render), '비어 있는 화면은 지문과 무관하게 그려야 한다');
}

// ── 레이아웃 계약 (css/growth-board.css) ─────────────────────────────────
// 이 프로젝트는 전역 border-box를 쓰지 않는다. 패딩·테두리가 있는 컨테이너에
// width:100%만 주면 좁은 화면에서 부모 밖으로 삐져나간다(390px에서 12px 넘침).
{
    const css = fs.readFileSync('css/growth-board.css', 'utf8');
    const boardRule = css.slice(css.indexOf('.growth-board {'), css.indexOf('.growth-cell {'));
    assert.ok(/box-sizing:\s*border-box/.test(boardRule),
        '패딩·테두리를 가진 생장판 격자는 border-box여야 부모 폭을 넘지 않는다');
    ['.growth-item-card', '.growth-synergy-row', '.growth-compare-row'].forEach(selector => {
        const idx = css.indexOf(selector + ' {');
        assert.ok(idx >= 0, `${selector} 규칙이 있어야 한다`);
        assert.ok(/box-sizing:\s*border-box/.test(css.slice(idx, idx + 220)),
            `${selector}도 border-box여야 한다`);
    });
    const hintRuleStart = css.indexOf('.growth-context-hints {');
    const hintRule = css.slice(hintRuleStart, hintRuleStart + 240);
    assert.ok(hintRuleStart >= 0, '호버 안내 전용 행이 있어야 한다');
    assert.ok(/height:\s*1\.35em/.test(hintRule) && /overflow:\s*hidden/.test(hintRule),
        '호버 안내 행은 내용이 생겨도 생장판 위치를 밀지 않도록 높이가 고정되어야 한다');
}

// ── 드래그 배치 계약 (js/growth-ui.js) ───────────────────────────────────
{
    const ui = fs.readFileSync('js/growth-ui.js', 'utf8');

    // 회귀: elementFromPoint를 쓰면 드래그 중 커서를 따라다니는 툴팁이 먼저 잡혀
    // 판 위에 있는데도 놓지 못한다. 칸 rect를 직접 히트 테스트해야 한다.
    assert.ok(!/growthCellFromPoint[\s\S]{0,400}elementFromPoint/.test(ui),
        '드롭 대상 판정은 elementFromPoint에 의존하면 안 된다');
    assert.ok(/growthCellFromPoint[\s\S]{0,600}getBoundingClientRect/.test(ui),
        '드롭 대상은 칸 rect로 직접 판정해야 한다');

    // 짧은 탭이 드래그로 오해되면 기존 선택 동작이 망가진다.
    assert.ok(/GROWTH_DRAG_THRESHOLD_PX\s*=\s*\d+/.test(ui), '드래그 임계값이 있어야 한다');

    // 터치에서 드래그 중 페이지가 스크롤되지 않으려면 pointermove가 비수동이어야 한다.
    assert.ok(/addEventListener\('pointermove',\s*onGrowthPointerMove,\s*\{\s*passive:\s*false\s*\}\)/.test(ui),
        'pointermove는 preventDefault가 가능하도록 비수동으로 등록해야 한다');

    // 드래그 직후 따라오는 합성 클릭이 한 번 더 배치하면 안 된다.
    assert.ok(/growthSuppressClickUntil/.test(ui), '드래그 직후 클릭 억제가 있어야 한다');

    // 카드 안 버튼(배치/해체/잠금)에서 시작한 입력은 드래그로 가로채면 안 된다.
    assert.ok(/onGrowthPointerDown[\s\S]{0,500}closest\('button'\)/.test(ui),
        '카드 내부 버튼은 드래그 시작에서 제외해야 한다');

    // 드래그 중 툴팁이 커서를 따라다니면 정작 봐야 할 미리보기와 칸 레벨을 가린다.
    assert.ok(/function showGrowthItemTooltip[\s\S]{0,300}growthDrag[\s\S]{0,80}return;/.test(ui),
        '드래그 중에는 아이템 툴팁을 띄우지 않아야 한다');
}

// 배치된 생장판을 보드에서 해제 영역으로 끌면 실제 배치 상태가 해제되어야 한다.
{
    const listeners = {};
    const removed = [];
    let refreshed = 0;
    const makeClassList = () => {
        const values = new Set();
        return {
            add: (...names) => names.forEach(name => values.add(name)),
            remove: (...names) => names.forEach(name => values.delete(name)),
            toggle: (name, force) => force === undefined
                ? (values.has(name) ? (values.delete(name), false) : (values.add(name), true))
                : (force ? (values.add(name), true) : (values.delete(name), false)),
            contains: name => values.has(name)
        };
    };
    const board = { querySelectorAll: () => [], querySelector: () => null };
    const zone = { classList: makeClassList(), getBoundingClientRect: () => ({ left: 100, top: 100, right: 220, bottom: 180 }) };
    const body = { classList: makeClassList() };
    const uiContext = {
        console,
        game: { woodsmanBuildLock: false },
        document: {
            body,
            addEventListener: (name, handler) => { listeners[name] = handler; },
            getElementById: id => id === 'ui-growth-board' ? board : (id === 'ui-growth-unplace-zone' ? zone : null)
        },
        safeExposeGlobals: () => {},
        isGrowthItemPlacedInLoadout: () => true,
        getPlacedGrowthEntries: () => [{ item: { id: 7 }, cells: [[1, 1]] }],
        findGrowthItemById: id => ({ id, name: `item${id}` }),
        removeGrowthPlacement: id => { removed.push(id); return true; },
        updateStaticUI: () => { refreshed++; },
        hideInfoTooltip: () => {}
    };
    vm.createContext(uiContext);
    vm.runInContext(fs.readFileSync('js/growth-ui.js', 'utf8'), uiContext);
    vm.runInContext("growthSelection = { itemId: 7, source: 'board', rotation: 0, hoverCell: null }; bindGrowthDragOnce();", uiContext);
    const cell = { dataset: { x: '1', y: '1' }, classList: { contains: () => false } };
    const target = { closest: selector => selector === '#ui-growth-board .growth-cell' ? cell : null };
    listeners.pointerdown({ button: 0, target, clientX: 20, clientY: 20 });
    listeners.pointermove({ target, clientX: 130, clientY: 130, cancelable: true, preventDefault() {} });
    listeners.pointerup({ target, clientX: 130, clientY: 130 });
    assert.deepStrictEqual(removed, [7], '해제 영역에 놓은 배치 생장판만 보드에서 내려야 한다');
    assert.strictEqual(refreshed, 1, '드래그 해제 뒤 UI를 한 번 갱신해야 한다');
    assert.strictEqual(body.classList.contains('growth-dragging'), false, '드롭 뒤 드래그 시각 상태가 남으면 안 된다');
}

// ── 옛 판(폴리오미노 10x6) 저장을 불러올 때 ──────────────────────────────
// 이 브랜치가 판을 10x6·60칸에서 8x4·32칸으로 줄이고 모든 아이템을 1칸으로 바꿨다.
// 그 전에 저장한 사람이 돌아오면 판 밖을 가리키는 배치가 남아 있다. 아이템을
// 잃지 않으면서 판 밖 배치만 정리되어야 한다.
{
    const legacy = loadGrowthContext();
    const runLegacy = code => vm.runInContext(code, legacy);
    legacy.game.season = 40;
    legacy.game.maxZoneId = 40;
    legacy.game.growthInventory = [
        { id: 11, growthShapeId: 'L4', growthCategory: 'flower', growthBaseId: 'test_base', name: 'L4 꽃', rarity: 'rare', baseStats: [], stats: [] },
        { id: 12, growthShapeId: 'T4', growthCategory: 'branch', growthBaseId: 'test_base', name: 'T4 가지', rarity: 'rare', baseStats: [], stats: [] },
        { id: 13, growthShapeId: 'I3', growthCategory: 'leaf', growthBaseId: 'test_base', name: 'I3 잎', rarity: 'magic', baseStats: [], stats: [] }
    ];
    // 옛 저장 그대로: 10x6 판, 60칸 해금, 판 밖(9,5)을 가리키는 배치 포함
    legacy.game.growthBoard = {
        width: 10, height: 6, unlockedCellCount: 60, activeLoadout: 0,
        loadouts: [{ name: '옛 세팅', placements: {
            11: { x: 0, y: 0, rotation: 0 },
            12: { x: 9, y: 5, rotation: 1 },
            13: { x: 3, y: 1, rotation: 3 }
        } }]
    };
    runLegacy('ensureGrowthBoardState()');
    runLegacy('validateGrowthPlacements()');

    assert.strictEqual(runLegacy('game.growthBoard.width'), 8, '옛 판 폭은 현재 폭으로 맞춰져야 한다');
    assert.strictEqual(runLegacy('game.growthBoard.height'), 4, '옛 판 높이는 현재 높이로 맞춰져야 한다');
    assert.strictEqual(runLegacy('game.growthBoard.unlockedCellCount'), 32,
        '옛 60칸 해금은 현재 최대 칸수로 잘려야 한다(32칸을 넘으면 없는 칸이 열린 것으로 취급된다)');

    // 아이템은 하나도 잃지 않는다.
    assert.strictEqual(legacy.game.growthInventory.length, 3, '옛 아이템을 잃으면 안 된다');
    [11, 12, 13].forEach(id => {
        assert.strictEqual(runLegacy(`getGrowthItemCells(findGrowthItemById(${id}), 0).length`), 1,
            `옛 폴리오미노 아이템 ${id}도 1칸으로 해석되어야 한다`);
    });

    // 판 밖 배치만 정리되고, 판 안 배치는 좌표 그대로 살아남는다.
    const placedIds = JSON.parse(runLegacy('JSON.stringify(getPlacedGrowthEntries().map(e => e.item.id))'));
    assert.strictEqual(JSON.stringify(placedIds.slice().sort((a, b) => a - b)), '[11,13]',
        '판 밖(9,5) 배치만 정리되어야 한다');
    assert.strictEqual(runLegacy('JSON.stringify(getPlacedGrowthEntries().map(e => [e.placement.x, e.placement.y]).sort())'),
        JSON.stringify([[0, 0], [3, 1]]), '판 안 배치는 좌표를 그대로 유지해야 한다');
    const inBounds = runLegacy('getPlacedGrowthEntries().every(e => e.cells.every(c => isGrowthCellUnlocked(c[0], c[1])))');
    assert.strictEqual(inBounds, true, '살아남은 배치는 모두 열린 칸 위에 있어야 한다');

    // 정리된 배치는 다시 놓을 수 있어야 한다(보관함에 그대로 있으므로).
    assert.strictEqual(runLegacy('placeGrowthItem(12, 5, 2, 0).ok'), true, '정리된 아이템은 새 판에 다시 놓을 수 있어야 한다');
}

console.log('smoke-growth-board-placement passed');
