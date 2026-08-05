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

// 모든 생장 아이템은 1칸이다. 형태 정의도 dot1 하나뿐이어야 한다.
assert.strictEqual(json('Object.keys(GROWTH_SHAPE_DB)'), '["dot1"]', '형태는 1칸(dot1) 하나만 있어야 한다');
[0, 1, 2, 3].forEach(rot => {
    assert.strictEqual(json(`getGrowthItemCells({ growthShapeId: "dot1" }, ${rot})`), '[[0,0]]', `회전 ${rot}에서도 1칸이어야 한다`);
});
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
}

console.log('smoke-growth-board-placement passed');
