// 석판(레벨) 레이어 회귀 검사 — 세피리아식 "위치가 레벨을 만든다" 규칙을 고정한다.
// - 석판 패턴(행/열/상하좌우/대각선/주변/2칸)이 올바른 칸에만 레벨을 준다.
// - 레벨은 여러 석판에서 중첩되고, 페널티는 음수로 상쇄된다.
// - 아이템 레벨 = 점유 칸 레벨의 "최댓값" (칸 수가 많다고 유리해지지 않는다).
// - 레벨이 아이템 옵션 배율로 이어지고, 상한을 넘지 않는다.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function loadContext() {
    const context = {
        console,
        window: {},
        game: { maxZoneId: 20, season: 60, inventory: [], growthInventory: [], recentGrowthDrops: [], growthBoard: null, settings: {} },
        addLog: () => {},
        updateStaticUI: () => {},
        queueImportantSave: () => {},
        startMoving: () => {},
        normalizeItem: item => item,
        salvageItemObject: () => {},
        addItemToInventory: () => true,
        getInventoryLimit: () => 60,
        registerUniqueToCodexOnAcquire: () => {},
        passesItemPickupFilter: () => true,
        addStatToBucket: (bucket, statId, value) => {
            if (!statId || !Number.isFinite(Number(value))) return;
            bucket[statId] = (bucket[statId] || 0) + Number(value);
        }
    };
    context.safeExposeData = map => Object.keys(map || {}).forEach(key => {
        if (typeof context[key] === 'undefined') context[key] = map[key];
    });
    context.safeExposeGlobals = map => Object.keys(map || {}).forEach(key => { context.window[key] = map[key]; });
    vm.createContext(context);
    vm.runInContext(fs.readFileSync('data/growth-items.js', 'utf8'), context);
    vm.runInContext(fs.readFileSync('js/growth-board.js', 'utf8'), context);
    vm.runInContext(fs.readFileSync('js/growth-effects.js', 'utf8'), context);
    vm.runInContext('ensureGrowthBoardState(); syncGrowthBoardUnlocks({ silent: true });', context);
    return context;
}

function placeSlab(ctx, id, slabId, x, y) {
    ctx.game.growthInventory.push({
        id, growthSlabId: slabId, growthShapeId: 'dot1', growthCategory: 'slab',
        name: `slab#${id}`, rarity: 'magic', baseStats: [], stats: [], growthTags: ['석판'], growthRemovedTags: []
    });
    const result = vm.runInContext(`placeGrowthItem(${id}, ${x}, ${y}, 0)`, ctx);
    assert.strictEqual(result.ok, true, `석판 ${slabId}(${id})을 (${x},${y})에 배치할 수 있어야 한다: ${result.reason}`);
}

function placeBase(ctx, id, baseId, x, y) {
    const base = vm.runInContext(`GROWTH_BASE_DB.find(function (b) { return b.id === ${JSON.stringify(baseId)}; })`, ctx);
    assert.ok(base, `${baseId} 베이스가 존재해야 한다`);
    ctx.game.growthInventory.push({
        id, growthBaseId: baseId, growthShapeId: base.shapeId, growthCategory: base.category,
        name: `${baseId}#${id}`, rarity: 'normal', baseStats: [], stats: [], growthTags: [], growthRemovedTags: []
    });
    const result = vm.runInContext(`placeGrowthItem(${id}, ${x}, ${y}, 0)`, ctx);
    assert.strictEqual(result.ok, true, `${baseId}(${id})를 (${x},${y})에 배치할 수 있어야 한다: ${result.reason}`);
}

const cellLevel = (ctx, x, y) => vm.runInContext(`getGrowthCellLevel(${x}, ${y})`, ctx);
const itemLevel = (ctx, id) => vm.runInContext(`getGrowthItemLevel(${id})`, ctx);

// ── 패턴: 같은 행 ────────────────────────────────────────────────────────
{
    const ctx = loadContext();
    placeSlab(ctx, 1, 'gs_base', 5, 2);   // 같은 행 +1
    assert.strictEqual(cellLevel(ctx, 0, 2), 1, '같은 행의 다른 칸은 레벨 +1이어야 한다');
    assert.strictEqual(cellLevel(ctx, ctx.GROWTH_BOARD_W - 1, 2), 1, '행 끝까지 레벨이 닿아야 한다');
    assert.strictEqual(cellLevel(ctx, 5, 2), 0, '석판 자기 칸은 올리지 않는다');
    assert.strictEqual(cellLevel(ctx, 5, 1), 0, '다른 행은 영향을 받지 않아야 한다');
}

// ── 패턴: 같은 열 / 상하좌우 / 대각선 ─────────────────────────────────────
{
    const ctx = loadContext();
    placeSlab(ctx, 1, 'gs_pillar', 5, 2);
    assert.strictEqual(cellLevel(ctx, 5, 0), 1, '같은 열은 레벨 +1이어야 한다');
    assert.strictEqual(cellLevel(ctx, 4, 2), 0, '다른 열은 영향을 받지 않아야 한다');
}
{
    const ctx = loadContext();
    placeSlab(ctx, 1, 'gs_hearth', 5, 2);  // 상하좌우 +2
    assert.strictEqual(cellLevel(ctx, 4, 2), 2, '왼쪽 칸은 +2여야 한다');
    assert.strictEqual(cellLevel(ctx, 5, 1), 2, '위쪽 칸은 +2여야 한다');
    assert.strictEqual(cellLevel(ctx, 4, 1), 0, '대각선은 상하좌우 패턴에 포함되지 않는다');
}
{
    const ctx = loadContext();
    placeSlab(ctx, 1, 'gs_cross', 5, 2);   // 대각선 +2
    assert.strictEqual(cellLevel(ctx, 4, 1), 2, '대각선 칸은 +2여야 한다');
    assert.strictEqual(cellLevel(ctx, 4, 2), 0, '상하좌우는 대각선 패턴에 포함되지 않는다');
}

// ── 패턴: 2칸 거리 (바로 옆은 건너뛴다) ───────────────────────────────────
{
    const ctx = loadContext();
    placeSlab(ctx, 1, 'gs_echo', 5, 2);
    assert.strictEqual(cellLevel(ctx, 3, 2), 3, '2칸 떨어진 칸은 +3이어야 한다');
    assert.strictEqual(cellLevel(ctx, 4, 2), 0, '바로 옆 칸은 올리지 않아야 한다');
}

// ── 보드 밖으로 새지 않는다 ──────────────────────────────────────────────
{
    const ctx = loadContext();
    placeSlab(ctx, 1, 'gs_hearth', 0, 0);
    assert.strictEqual(cellLevel(ctx, 1, 0), 2, '보드 안쪽 이웃은 정상 적용되어야 한다');
    // 보드 밖 좌표는 조회 자체가 0이어야 하고, 예외가 나면 안 된다.
    assert.strictEqual(cellLevel(ctx, -1, 0), 0, '보드 밖 좌표는 레벨 0이어야 한다');
}

// ── 중첩과 페널티 상쇄 ───────────────────────────────────────────────────
{
    const ctx = loadContext();
    placeSlab(ctx, 1, 'gs_base', 5, 2);     // 행 +1
    placeSlab(ctx, 2, 'gs_base', 7, 2);     // 행 +1 (같은 행)
    assert.strictEqual(cellLevel(ctx, 0, 2), 2, '같은 행 석판 2개는 레벨이 중첩되어야 한다');

    // 반항의 석판: 행 +3 / 상하좌우 -1 → 인접 칸은 3 + (-1) = 2
    const ctx2 = loadContext();
    placeSlab(ctx2, 1, 'gs_defiance', 5, 2);
    assert.strictEqual(cellLevel(ctx2, 0, 2), 3, '같은 행 먼 칸은 +3이어야 한다');
    assert.strictEqual(cellLevel(ctx2, 4, 2), 2, '같은 행이면서 상하좌우인 칸은 +3-1=2여야 한다');
    assert.strictEqual(cellLevel(ctx2, 5, 1), -1, '행 밖의 상하좌우 칸은 페널티만 받아 -1이어야 한다');
}

// ── 아이템 레벨 = 점유 칸 중 가장 높은 석판 레벨 ─────────────────────────
{
    const ctx = loadContext();
    // 화로의 석판(상하좌우 +2)을 (5,2)에 두고, 바로 위 칸에 아이템을 놓는다.
    placeSlab(ctx, 1, 'gs_hearth', 5, 2);
    placeBase(ctx, 2, 'gb_null_lattice', 5, 1);
    assert.strictEqual(itemLevel(ctx, 2), 2, '아이템은 자신이 선 칸의 레벨을 받아야 한다');

    // 종류가 달라도 같은 칸이면 같은 레벨이다 — 레벨은 위치만 본다.
    const ctx2 = loadContext();
    placeSlab(ctx2, 1, 'gs_hearth', 5, 2);
    placeBase(ctx2, 2, 'gf_spark_seed', 5, 1);
    assert.strictEqual(itemLevel(ctx2, 2), 2, '다른 종류의 아이템도 같은 칸에서 같은 레벨을 받아야 한다');

    // 영향권 밖 칸은 레벨 0이다.
    const ctx3 = loadContext();
    placeSlab(ctx3, 1, 'gs_hearth', 5, 2);
    placeBase(ctx3, 2, 'gf_spark_seed', 5, 0);
    assert.strictEqual(itemLevel(ctx3, 2), 0, '영향권 밖 칸의 아이템은 레벨 0이어야 한다');
}

// ── 석판 자신은 레벨을 받지 않는다 ───────────────────────────────────────
{
    const ctx = loadContext();
    placeSlab(ctx, 1, 'gs_base', 5, 2);
    placeSlab(ctx, 2, 'gs_pillar', 3, 2);   // 위 석판의 행 영향권 안
    assert.strictEqual(itemLevel(ctx, 2), 0, '석판은 레벨을 받지 않아야 한다(레벨 인플레 방지)');
}

// ── 레벨 → 옵션 배율, 그리고 상한 ────────────────────────────────────────
{
    const ctx = loadContext();
    const pct = vm.runInContext('GROWTH_LEVEL_STAT_PCT', ctx);
    const cap = vm.runInContext('GROWTH_LEVEL_CAP', ctx);
    assert.strictEqual(vm.runInContext('getGrowthLevelMultiplier(0)', ctx), 1, '레벨 0은 배율 1이어야 한다');
    assert.ok(Math.abs(vm.runInContext('getGrowthLevelMultiplier(3)', ctx) - (1 + 3 * pct / 100)) < 1e-9, '레벨 3 배율이 정의와 일치해야 한다');

    // 상한: 석판을 잔뜩 겹쳐도 아이템 레벨이 cap을 넘지 않는다.
    const ctx2 = loadContext();
    // 반항의 석판(행 +3) 4장을 한 행에 몰면 원래 +12지만 상한에서 잘린다.
    // 대상 칸은 어느 석판과도 상하좌우로 붙지 않아 -1 페널티를 받지 않는다.
    let slabId = 1;
    for (let x = 0; x < 4; x++) placeSlab(ctx2, slabId++, 'gs_defiance', x, 2);
    placeBase(ctx2, 100, 'gf_spark_seed', ctx2.GROWTH_BOARD_W - 1, 2);
    assert.strictEqual(cellLevel(ctx2, ctx2.GROWTH_BOARD_W - 1, 2), 12, '칸 레벨 자체는 중첩 합계 그대로여야 한다');
    const level = itemLevel(ctx2, 100);
    assert.strictEqual(level, cap, `아이템 레벨은 상한(${cap})에서 잘려야 한다 (현재 ${level})`);
}

// ── 배치가 스탯 배율로 이어진다 ──────────────────────────────────────────
{
    const ctx = loadContext();
    placeBase(ctx, 1, 'gf_spark_seed', 5, 1);
    assert.strictEqual(vm.runInContext('getGrowthItemStatMultiplier(1)', ctx), 1, '석판이 없으면 배율은 1이어야 한다');

    placeSlab(ctx, 2, 'gs_hearth', 5, 2);   // 위 아이템의 아래쪽 → 상하좌우 +2
    const multiplier = vm.runInContext('getGrowthItemStatMultiplier(1)', ctx);
    const expected = vm.runInContext('getGrowthLevelMultiplier(2)', ctx);
    assert.ok(Math.abs(multiplier - expected) < 1e-9, '석판 레벨이 아이템 스탯 배율로 반영되어야 한다');

    // 석판을 치우면 배율이 되돌아온다(캐시가 갱신된다).
    vm.runInContext('removeGrowthPlacement(2)', ctx);
    assert.strictEqual(vm.runInContext('getGrowthItemStatMultiplier(1)', ctx), 1, '석판을 내리면 배율이 원복되어야 한다');
}

// ── 석판은 옵션을 가질 수 없다 ───────────────────────────────────────────
{
    const ctx = loadContext();
    // 생성 모듈은 전역 id 카운터를 쓴다 — 실제 런타임과 동일하게 제공한다.
    vm.runInContext('var itemIdCounter = 0;', ctx);
    vm.runInContext(fs.readFileSync('js/growth-generation.js', 'utf8'), ctx);
    const slab = vm.runInContext('createGrowthSlabItem(10)', ctx);
    assert.ok(slab, '석판을 생성할 수 있어야 한다');
    assert.strictEqual(slab.growthCategory, 'slab', '생성된 석판의 종류가 slab이어야 한다');
    assert.strictEqual(vm.runInContext('getGrowthItemAffixCap({ growthCategory: "slab", growthShapeId: "dot1" })', ctx), 0, '석판의 추가 옵션 상한은 0이어야 한다');
    assert.strictEqual(vm.runInContext('JSON.stringify(getGrowthCategoryModSlots("slab"))', ctx), '[]', '석판에는 옵션 풀이 없어야 한다');
}

console.log('smoke-growth-slab passed');
