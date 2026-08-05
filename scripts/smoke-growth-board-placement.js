// 생장판 배치 도메인 회귀 검사: 형태 회전/정규화, 경계·봉인·겹침 거부, 분리형/고리형 빈칸,
// 세팅별 독립 배치, 아이템 소실 시 배치 정리.
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
    ctx.game.inventory.push(item);
    return item;
}

const ctx = loadGrowthContext();
const run = code => vm.runInContext(code, ctx);

// ── 형태 회전과 정규화 ────────────────────────────────────────────────────
// VM 컨텍스트의 배열은 프로토타입이 달라 deepStrictEqual이 실패한다. 직렬화해서 비교한다.
const json = code => run(`JSON.stringify(${code})`);

assert.strictEqual(json('normalizeGrowthCells([[3,5],[4,5]])'), '[[0,0],[1,0]]', '정규화는 좌상단 원점 정렬이어야 한다');
assert.strictEqual(json('rotateGrowthCells([[0,0],[1,0]], 1)'), '[[0,0],[0,1]]', '가로 2칸을 90도 돌리면 세로 2칸이어야 한다');
assert.strictEqual(json('rotateGrowthCells([[0,0],[1,0]], 4)'), json('rotateGrowthCells([[0,0],[1,0]], 0)'), '360도 회전은 원본과 같아야 한다');
assert.strictEqual(json('rotateGrowthCells([[0,0],[1,0],[1,1]], 2)'), json('rotateGrowthCells(rotateGrowthCells([[0,0],[1,0],[1,1]], 1), 1)'), '180도 회전은 90도 두 번과 같아야 한다');
assert.strictEqual(json('rotateGrowthCells([[0,0],[1,0]], -1)'), json('rotateGrowthCells([[0,0],[1,0]], 3)'), '음수 회전도 정상 정규화되어야 한다');

// 모든 형태가 모든 회전에서 칸 수를 보존해야 한다 (분리형/고리형 포함).
const shapeSizeReport = run(`Object.keys(GROWTH_SHAPE_DB).map(function (key) {
    var sizes = [0,1,2,3].map(function (rot) { return rotateGrowthCells(GROWTH_SHAPE_DB[key].cells, rot).length; });
    return { key: key, sizes: sizes, base: GROWTH_SHAPE_DB[key].cells.length };
})`);
shapeSizeReport.forEach(row => {
    row.sizes.forEach(size => assert.strictEqual(size, row.base, `${row.key} 형태는 회전해도 칸 수가 같아야 한다`));
});

// ── 보드 상태와 해금 ─────────────────────────────────────────────────────
run('ensureGrowthBoardState()');
assert.strictEqual(run('game.growthBoard.unlockedCellCount'), 12, '튜토리얼 단계는 12칸이어야 한다');
assert.strictEqual(run('game.growthBoard.loadouts.length'), 3, '세팅은 항상 3개여야 한다');

// 진행하면 칸이 늘고, 되돌아가도 줄어들지 않는다(영구 성장).
ctx.game.maxZoneId = 4;
run('syncGrowthBoardUnlocks({ silent: true })');
assert.strictEqual(run('game.growthBoard.unlockedCellCount'), 24, '중반 액트에서 24칸이어야 한다');
ctx.game.maxZoneId = 0;
run('syncGrowthBoardUnlocks({ silent: true })');
assert.strictEqual(run('game.growthBoard.unlockedCellCount'), 24, '해금 칸은 진행이 후퇴해도 줄지 않아야 한다');

// ── 배치 검증 ────────────────────────────────────────────────────────────
makeItem(ctx, 1, 'duo2', 'flower');
assert.strictEqual(run('placeGrowthItem(1, 5, 2, 0).ok'), true, '해금된 칸에는 배치할 수 있어야 한다');

// 경계 초과 거부
makeItem(ctx, 2, 'line5', 'flower');
assert.strictEqual(run('canPlaceGrowthItem(findGrowthItemById(2), 9, 2, 0).ok'), false, '보드 밖으로 나가는 배치는 거부해야 한다');

// 봉인 칸 거부 (해금은 중앙부터이므로 x=0 열은 24칸 단계에서 봉인 상태)
assert.strictEqual(run('isGrowthCellUnlocked(0, 0)'), false, '가장자리 칸은 아직 봉인 상태여야 한다');
assert.strictEqual(run('canPlaceGrowthItem(findGrowthItemById(2), 0, 0, 0).ok'), false, '봉인된 칸에는 배치할 수 없어야 한다');

// 겹침 거부
makeItem(ctx, 3, 'duo2', 'branch');
assert.strictEqual(run('canPlaceGrowthItem(findGrowthItemById(3), 5, 2, 0).ok'), false, '이미 점유된 칸에는 배치할 수 없어야 한다');
assert.strictEqual(run('placeGrowthItem(3, 6, 1, 0).ok'), true, '비어 있는 칸에는 배치할 수 있어야 한다');

// 자기 자신과는 겹침 판정을 하지 않는다(같은 자리 회전/재배치).
assert.strictEqual(run('canPlaceGrowthItem(findGrowthItemById(1), 5, 2, 0).ok'), true, '자기 자신이 있는 자리로의 재배치는 허용해야 한다');

// 회전 후에도 배치가 유지된다
assert.strictEqual(run('rotatePlacedGrowthItem(1).ok'), true, '공간이 있으면 회전할 수 있어야 한다');
assert.strictEqual(run('getActiveGrowthLoadout().placements[1].rotation'), 1, '회전 결과가 저장되어야 한다');

// ── 분리형 / 고리형 내부 빈칸 ────────────────────────────────────────────
assert.strictEqual(json('getGrowthItemGapCells({ growthShapeId: "split2" }, 0)'), '[[1,0]]', '분리형의 사이 칸이 빈칸으로 계산되어야 한다');
assert.strictEqual(json('getGrowthItemGapCells({ growthShapeId: "split2" }, 1)'), '[[0,1]]', '분리형 빈칸은 회전과 함께 돌아야 한다');
assert.strictEqual(json('getGrowthItemGapCells({ growthShapeId: "ring8" }, 0)'), '[[1,1]]', '고리형 중앙이 빈칸으로 계산되어야 한다');
assert.strictEqual(json('getGrowthItemGapCells({ growthShapeId: "block9" }, 0)'), '[]', '꽉 찬 형태에는 내부 빈칸이 없어야 한다');

// 분리형 사이 칸에는 다른 아이템을 배치할 수 있어야 한다.
const splitCtx = loadGrowthContext();
splitCtx.game.maxZoneId = 10;
vm.runInContext('ensureGrowthBoardState(); syncGrowthBoardUnlocks({ silent: true });', splitCtx);
makeItem(splitCtx, 10, 'split2', 'leaf');
makeItem(splitCtx, 11, 'dot1', 'flower');
assert.strictEqual(vm.runInContext('placeGrowthItem(10, 4, 2, 0).ok', splitCtx), true, '분리형을 배치할 수 있어야 한다');
assert.strictEqual(vm.runInContext('placeGrowthItem(11, 5, 2, 0).ok', splitCtx), true, '분리형 사이 칸에 다른 아이템을 넣을 수 있어야 한다');

// ── 세팅 독립성 ──────────────────────────────────────────────────────────
run('game.growthBoard.activeLoadout = 1');
assert.strictEqual(run('Object.keys(getActiveGrowthLoadout().placements).length'), 0, '다른 세팅은 독립적으로 비어 있어야 한다');
assert.strictEqual(run('placeGrowthItem(1, 5, 2, 0).ok'), true, '같은 아이템을 다른 세팅에서도 배치할 수 있어야 한다');
run('game.growthBoard.activeLoadout = 0');
assert.strictEqual(run('getActiveGrowthLoadout().placements[1].rotation'), 1, '세팅을 오가도 원래 세팅의 배치가 보존되어야 한다');

// ── 아이템 소실 후 정리 ──────────────────────────────────────────────────
run('game.inventory = game.inventory.filter(function (item) { return item.id !== 3; })');
const removed = run('validateGrowthPlacements()');
assert.ok(removed >= 1, '보관함에서 사라진 아이템의 배치는 제거되어야 한다');
assert.strictEqual(run('getActiveGrowthLoadout().placements[3]'), undefined, '유효하지 않은 배치가 남아 있으면 안 된다');
assert.ok(run('getActiveGrowthLoadout().placements[1]') !== undefined, '유효한 배치는 유지되어야 한다');

// 배치된 아이템은 일괄 해체 보호 대상이다.
assert.strictEqual(run('isGrowthItemPlacedAnywhere(1)'), true, '배치된 아이템은 보호 대상으로 보고되어야 한다');
assert.strictEqual(run('purgeGrowthItemFromAllLoadouts(1) >= 1'), true, '모든 세팅에서 배치를 정리할 수 있어야 한다');
assert.strictEqual(run('isGrowthItemPlacedAnywhere(1)'), false, '정리 후에는 배치가 남지 않아야 한다');

// ── 루프 리셋 ────────────────────────────────────────────────────────────
run('placeGrowthItem(2, 4, 2, 0)');
run('resetGrowthBoardForLoop(game.growthBoard.unlockedCellCount)');
assert.strictEqual(run('Object.keys(getActiveGrowthLoadout().placements).length'), 0, '루프 리셋은 배치를 비워야 한다');
assert.strictEqual(run('game.growthBoard.unlockedCellCount'), 24, '루프 리셋 후에도 해금 칸은 유지되어야 한다');

console.log('smoke-growth-board-placement passed');
