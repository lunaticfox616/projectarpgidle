// 생장판 공간 시너지 회귀 검사: 인접·벽·방향(회전 반영)·행/열·태그·복합 조건,
// 계층 해금 게이팅, 캐시 무효화, 순환/재증폭 없음.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function loadContext() {
    const context = {
        console,
        window: {},
        game: { maxZoneId: 0, season: 1, inventory: [], growthInventory: [], recentGrowthDrops: [], growthBoard: null, settings: {} },
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
        // 스탯 버킷은 utils.js 계약을 그대로 흉내 낸다(합산만 확인하면 되므로 최소 구현).
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
    // 최대 진행도로 모든 시너지 계층을 열어 둔다(계층 게이팅은 별도로 검사).
    context.game.maxZoneId = 20;
    context.game.season = 60;
    vm.runInContext('ensureGrowthBoardState(); syncGrowthBoardUnlocks({ silent: true });', context);
    return context;
}

// 지정한 베이스로 아이템을 만들어 보관함에 넣고 배치한다.
function placeBase(ctx, id, baseId, x, y, rotation) {
    const base = vm.runInContext(`GROWTH_BASE_DB.find(function (b) { return b.id === ${JSON.stringify(baseId)}; })`, ctx);
    assert.ok(base, `${baseId} 베이스가 존재해야 한다`);
    ctx.game.growthInventory.push({
        id, growthBaseId: baseId, growthShapeId: base.shapeId, growthCategory: base.category,
        name: `${baseId}#${id}`, rarity: 'normal', baseStats: [], stats: [], growthTags: [], growthRemovedTags: []
    });
    const result = vm.runInContext(`placeGrowthItem(${id}, ${x}, ${y}, ${rotation || 0})`, ctx);
    assert.strictEqual(result.ok, true, `${baseId}(${id})를 (${x},${y})에 배치할 수 있어야 한다: ${result.reason}`);
}

function grantTotals(ctx) {
    return vm.runInContext('(function () { var bucket = {}; applyGrowthSpatialStats(bucket); return bucket; })()', ctx);
}

// ── 인접 조건: per 조건은 충족 횟수만큼 반복 적용된다 ──────────────────────
{
    const ctx = loadContext();
    // 무쇠 밑동(가지, 1칸): 인접한 꽃 1개당 방어도 +12
    placeBase(ctx, 1, 'gb_iron_trunk', 4, 1, 0);
    let totals = grantTotals(ctx);
    assert.ok(!totals.armor, '인접한 꽃이 없으면 인접 보너스가 없어야 한다');

    // 밑동의 위·왼쪽에 꽃 두 개를 붙인다(1칸이므로 상하좌우만 인접).
    placeBase(ctx, 2, 'gf_spark_seed', 4, 0, 0);
    placeBase(ctx, 3, 'gf_spark_seed', 3, 1, 0);
    totals = grantTotals(ctx);
    assert.strictEqual(totals.armor, 24, '인접한 꽃 2개면 방어도 +24여야 한다 (per 조건 2회)');

    // 꽃(불꽃 씨앗)은 고립 시 피해 +14% — 이제 인접했으므로 발동하지 않아야 한다.
    assert.ok(!totals.pctDmg, '인접한 상태에서는 고립 조건이 발동하면 안 된다');
}

// ── 고립 조건 ────────────────────────────────────────────────────────────
{
    const ctx = loadContext();
    placeBase(ctx, 1, 'gf_spark_seed', 5, 2, 0);
    const totals = grantTotals(ctx);
    assert.strictEqual(totals.pctDmg, 6, '고립된 불꽃 씨앗은 피해 +6%를 받아야 한다');
}

// ── 벽/방향 조건은 회전과 함께 돈다 ───────────────────────────────────────
{
    const ctx = loadContext();
    // 서리 가시꽃(1칸): 왼쪽(회전 반영)이 외벽이면 냉각 확률 +14
    placeBase(ctx, 1, 'gf_frost_thorn', 0, 1, 0);
    let totals = grantTotals(ctx);
    assert.strictEqual(totals.chillChance, 14, '왼쪽 외벽에 붙으면 냉각 확률 조건이 충족되어야 한다');

    // 같은 아이템을 보드 안쪽으로 옮기면 조건이 풀린다.
    vm.runInContext('placeGrowthItem(1, 5, 1, 0)', ctx);
    totals = grantTotals(ctx);
    assert.ok(!totals.chillChance, '외벽에서 떨어지면 방향 조건이 풀려야 한다');

    // 위쪽 외벽에 붙이고 90도 돌리면 "왼쪽" 방향이 "위쪽"으로 회전해 다시 충족된다.
    const dirCheck = vm.runInContext('resolveGrowthDirection("left", 1)', ctx);
    assert.strictEqual(dirCheck, 'up', '회전 1단계에서 left는 up으로 회전해야 한다');
}

// ── 행/열 조건 ───────────────────────────────────────────────────────────
{
    const ctx = loadContext();
    // 방벽 옹이(가지 1칸): 같은 열에 가지가 3개 이상이면 막기 +3%p
    placeBase(ctx, 1, 'gb_bulwark_knot', 4, 0, 0);
    let totals = grantTotals(ctx);
    assert.ok(!totals.blockChance, '같은 열의 가지가 부족하면 조건이 충족되지 않아야 한다');

    placeBase(ctx, 2, 'gb_thorn_stud', 4, 1, 0);
    placeBase(ctx, 3, 'gb_thorn_stud', 4, 3, 0);
    totals = grantTotals(ctx);
    // 아이템 조건(방벽 옹이 +3)과 전역 시너지(가지 기둥 +1)가 함께 발동한다.
    assert.strictEqual(totals.blockChance, 4, '같은 열에 가지 3개 이상이면 아이템 조건과 전역 시너지가 모두 발동해야 한다');
    const columnGlobals = vm.runInContext('getActiveGrowthGlobalSynergies().map(function (row) { return row.id; })', ctx);
    assert.ok(columnGlobals.includes('gs_branch_column'), '가지 기둥 전역 시너지가 활성 목록에 있어야 한다');
    // 자기 자신도 열의 가지 수에 포함되어야 한다(3개 중 하나가 방벽 옹이 자신).
    const knotReport = vm.runInContext('getGrowthItemConditionReport(1)', ctx);
    assert.strictEqual(knotReport.met.length, 1, '방벽 옹이의 열 조건이 충족으로 기록되어야 한다');
}

// ── 태그 조건 ────────────────────────────────────────────────────────────
{
    const ctx = loadContext();
    // 잉걸 티끌(잎): 화염 태그와 인접하면 점화 피해 +8
    placeBase(ctx, 1, 'gl_ember_mote', 4, 2, 0);
    let totals = grantTotals(ctx);
    assert.ok(!totals.igniteDamageMultiplierPct, '화염 태그 이웃이 없으면 태그 조건이 충족되지 않아야 한다');

    // 잉걸불 왕관화(꽃, 화염 태그)를 바로 옆에 붙인다.
    placeBase(ctx, 2, 'gf_ember_crown', 5, 2, 0);
    totals = grantTotals(ctx);
    assert.strictEqual(totals.igniteDamageMultiplierPct, 8, '화염 태그와 인접하면 점화 피해 증가가 부여되어야 한다');
}

// ── 계층 해금 게이팅 ─────────────────────────────────────────────────────
{
    const ctx = loadContext();
    // 해금 직후(루프 25)에는 기본 인접만 열려 있다.
    ctx.game.season = 25;
    vm.runInContext('invalidateGrowthEffects()', ctx);
    assert.strictEqual(vm.runInContext('isGrowthSynergyStageUnlocked("adjacency")', ctx), true, '해금 시점에 기본 인접은 열려 있어야 한다');
    assert.strictEqual(vm.runInContext('isGrowthSynergyStageUnlocked("wall")', ctx), false, '벽/방향 계층은 해금 직후에는 잠겨 있어야 한다');
    assert.strictEqual(vm.runInContext('isGrowthSynergyStageUnlocked("complex")', ctx), false, '복합 시너지는 해금 직후에는 잠겨 있어야 한다');

    placeBase(ctx, 1, 'gf_frost_thorn', 0, 1, 0);
    const totals = grantTotals(ctx);
    assert.ok(!totals.chillChance, '계층이 잠겨 있으면 벽 조건 효과가 적용되면 안 된다');

    const report = vm.runInContext('getGrowthItemConditionReport(1)', ctx);
    assert.ok(report.unmet.some(row => row.reason === '시너지 계층 미해금'), '미해금 사유가 툴팁 리포트에 남아야 한다');
}

// ── 전역 시너지 ──────────────────────────────────────────────────────────
{
    const ctx = loadContext();
    // 사방의 주춧돌: 판의 네 모서리가 모두 채워지면 공격/이동 속도 +6
    const W = ctx.GROWTH_BOARD_W;
    const H = ctx.GROWTH_BOARD_H;
    placeBase(ctx, 1, 'gf_spark_seed', 0, 0, 0);
    placeBase(ctx, 2, 'gf_spark_seed', W - 1, 0, 0);
    placeBase(ctx, 3, 'gf_spark_seed', 0, H - 1, 0);
    let totals = grantTotals(ctx);
    assert.ok(!totals.move, '모서리가 하나라도 비면 조건이 충족되지 않아야 한다');

    placeBase(ctx, 4, 'gf_spark_seed', W - 1, H - 1, 0);
    totals = grantTotals(ctx);
    assert.strictEqual(totals.aspd, 6, '네 모서리가 모두 채워지면 전역 시너지가 발동해야 한다');
    assert.strictEqual(totals.move, 6, '전역 시너지의 두 번째 스탯도 적용되어야 한다');
}

// ── 캐시: 배치가 그대로면 재계산하지 않는다 ───────────────────────────────
{
    const ctx = loadContext();
    placeBase(ctx, 1, 'gf_sun_bloom', 4, 1, 0);
    const first = vm.runInContext('getGrowthEffectSnapshot()', ctx);
    const second = vm.runInContext('getGrowthEffectSnapshot()', ctx);
    assert.strictEqual(first, second, '배치가 바뀌지 않으면 같은 스냅샷 객체를 재사용해야 한다');

    vm.runInContext('rotatePlacedGrowthItem(1)', ctx);
    const third = vm.runInContext('getGrowthEffectSnapshot()', ctx);
    assert.notStrictEqual(first, third, '배치가 바뀌면 스냅샷을 다시 계산해야 한다');
}

// ── 재증폭/순환 없음: 공간 효과 산출물은 조건 입력이 되지 않는다 ───────────
{
    const ctx = loadContext();
    // 서로를 강화하는 배치(꽃↔가지 상호 인접)에서도 각 효과는 정확히 1회만 계산되어야 한다.
    placeBase(ctx, 1, 'gb_iron_trunk', 4, 1, 0);
    placeBase(ctx, 2, 'gf_spark_seed', 4, 0, 0);
    const a = grantTotals(ctx);
    const b = grantTotals(ctx);
    assert.strictEqual(a.armor, 12, '상호 인접이어도 방어도 보너스는 1회만 적용되어야 한다');
    assert.strictEqual(JSON.stringify(a), JSON.stringify(b), '같은 배치를 반복 계산해도 결과가 누적되면 안 된다');
}

// ── 저장을 새로 불러오면 캐시를 버려야 한다 ──────────────────────────────
// 회귀: 스냅샷은 game 상태에 묶여 있는데 game이 통째로 교체되어도 캐시가 남아,
// 다른 기기의 저장을 불러온 뒤에도 이전 판의 보너스가 그대로 적용됐다.
{
    const ui = fs.readFileSync('js/ui.js', 'utf8');
    const merge = ui.slice(ui.indexOf('function mergeDefaults'), ui.indexOf('function cloneDefaultGame'));
    assert.ok(/invalidateGrowthEffects/.test(merge),
        'game을 교체하는 mergeDefaults는 생장 효과 캐시를 비워야 한다');
    // 저장 불러오기·클라우드 복원·초기화가 모두 이 함수를 거치는지 확인한다.
    assert.ok(/function cloneDefaultGame\(\)\s*\{\s*return mergeDefaults\(\{\}\);/.test(ui),
        '초기화 경로도 mergeDefaults를 거쳐야 캐시 무효화가 한곳에서 끝난다');
}

console.log('smoke-growth-synergy passed');
