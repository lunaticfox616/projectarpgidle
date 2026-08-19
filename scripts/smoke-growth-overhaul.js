// 생장판 개편 회귀: 다칸 교체, 등급별 옵션 수, 전용 해체 재화를 실제 모듈로 검증한다.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);

run(`
    game.season = 60;
    game.maxZoneId = 60;
    game.growthInventory = [];
    game.recentGrowthDrops = [];
    game.growthBoard = null;
    game.currencies.growthEssence = 0;
    ensureGrowthBoardState();
    syncGrowthBoardUnlocks({ silent: true });
`);

function addItem(id, shapeId, category, rarity) {
    run(`game.growthInventory.push({
        id: ${id}, growthShapeId: ${JSON.stringify(shapeId)}, growthCategory: ${JSON.stringify(category)},
        growthBaseId: 'gf_sun_bloom', name: '시험 생장판 ${id}', rarity: ${JSON.stringify(rarity || 'normal')},
        itemTier: 10, hiddenTier: 10, slot: '무기', baseStats: [], stats: []
    })`);
}

// 미배치 다칸 아이템을 한 아이템 위에 놓으면 기존 아이템을 내리고 자리를 차지한다.
addItem(1001, 'dot1', 'flower');
addItem(1002, 'domino2', 'thorn');
assert.strictEqual(run('placeGrowthItem(1001, 2, 1, 0).ok'), true);
const replacement = JSON.parse(run('JSON.stringify(placeGrowthItem(1002, 2, 1, 0))'));
assert.strictEqual(replacement.mode, 'replace', '이전 자리가 없는 다칸 아이템은 겹친 한 아이템을 교체해야 한다');
assert.strictEqual(run('getActiveGrowthLoadout().placements[1001]'), undefined, '교체된 아이템은 보드에서 내려와야 한다');
assert.ok(run('getActiveGrowthLoadout().placements[1002]'), '새 다칸 아이템은 배치되어야 한다');

// 두 아이템을 한 번에 덮는 모호한 교체는 거부하고 기존 배치를 전혀 바꾸지 않는다.
run('unplaceAllGrowthItems();');
addItem(1003, 'dot1', 'flower');
addItem(1004, 'dot1', 'branch');
addItem(1005, 'square4', 'seed');
run('placeGrowthItem(1003, 3, 1, 0); placeGrowthItem(1004, 4, 1, 0);');
const before = run('JSON.stringify(getActiveGrowthLoadout().placements)');
const rejected = JSON.parse(run('JSON.stringify(placeGrowthItem(1005, 3, 1, 0))'));
assert.strictEqual(rejected.ok, false, '여러 아이템을 동시에 덮는 배치는 거부해야 한다');
assert.strictEqual(run('JSON.stringify(getActiveGrowthLoadout().placements)'), before, '실패한 교체는 부분 변경을 남기면 안 된다');

// 실제 생성 경로에서 마법은 정확히 1줄, 희귀는 정확히 2줄이다.
const affixCounts = JSON.parse(run(`JSON.stringify((function () {
    let base = GROWTH_BASE_DB.find(row => row.id === 'gf_sun_bloom');
    let magic = createGrowthItemFromBase(base, 'magic', 15);
    let rare = createGrowthItemFromBase(base, 'rare', 15);
    return { magic: magic.stats.length, rare: rare.stats.length };
})())`));
assert.deepStrictEqual(affixCounts, { magic: 1, rare: 2 }, '마법 1줄·희귀 2줄 계약이 실제 생성에 적용되어야 한다');

// 해체는 기존 보상과 별개로 전용 정수를 지급하되, 대량 드랍에서 과잉 축적되지 않게 제한한다.
const salvage = JSON.parse(run(`JSON.stringify((function () {
    let small = { id: 2001, name: '작은 판', rarity: 'normal', itemTier: 1, slot: '무기',
        growthShapeId: 'dot1', growthCategory: 'flower', growthBaseId: 'gf_sun_bloom', baseStats: [], stats: [] };
    let large = { id: 2002, name: '큰 판', rarity: 'rare', itemTier: 12, slot: '반지',
        growthShapeId: 'square4', growthCategory: 'seed', growthBaseId: 'gsd_world_kernel', baseStats: [], stats: [] };
    let first = salvageGrowthItemObject(small, true, { essenceRandom: () => 0 });
    let second = salvageGrowthItemObject(large, true, { essenceRandom: () => 0.5 });
    return { first: first.growthEssence, second: second.growthEssence, total: game.currencies.growthEssence };
})())`));
assert.strictEqual(salvage.first, 1, '일반 1칸 생장판은 성공 판정 시 정수 1개를 줘야 한다');
assert.ok(salvage.second > salvage.first, '희귀 다칸 생장판은 더 많은 정수를 줘야 한다');
assert.ok(salvage.second <= 4, '희귀 다칸 생장판도 정수를 과도하게 지급하면 안 된다');
assert.strictEqual(salvage.total, salvage.first + salvage.second, '전용 정수 지급량이 상태에 정확히 반영되어야 한다');

// 기존 제작 재화는 생장판 제작대에서만 10개 단위로 1회분을 교환한다.
run('game.currencies.magicBud = 10; exchangeGrowthCraftCurrency("magicBud");');
assert.strictEqual(run('game.currencies.magicBud'), 0, '기존 재화 10개를 정확히 소모해야 한다');
assert.strictEqual(run('game.currencies.growthEssence'), salvage.total + 1, '마법 제작 1회분 정수를 받아야 한다');

const essenceRolls = JSON.parse(run(`JSON.stringify((function () {
    let normal = { growthShapeId: 'dot1', growthCategory: 'flower', rarity: 'normal', itemTier: 1 };
    let magic = { ...normal, rarity: 'magic' };
    let rare = { ...normal, rarity: 'rare' };
    let unique = { ...normal, rarity: 'unique' };
    return {
        normalSuccess: getGrowthSalvageEssenceYield(normal, () => 0.59),
        normalFailure: getGrowthSalvageEssenceYield(normal, () => 0.6),
        magicLow: getGrowthSalvageEssenceYield(magic, () => 0),
        magicHigh: getGrowthSalvageEssenceYield(magic, () => 0.99),
        rareLow: getGrowthSalvageEssenceYield(rare, () => 0),
        rareHigh: getGrowthSalvageEssenceYield(rare, () => 0.99),
        uniqueLow: getGrowthSalvageEssenceYield(unique, () => 0),
        uniqueHigh: getGrowthSalvageEssenceYield(unique, () => 0.99)
    };
})())`));
assert.deepStrictEqual(essenceRolls, {
    normalSuccess: 1, normalFailure: 0, magicLow: 1, magicHigh: 2,
    rareLow: 1, rareHigh: 3, uniqueLow: 3, uniqueHigh: 7
}, '생장 정수는 등급별 범위에서 굴리고 일반 등급은 60% 획득이어야 한다');

const slabYield = run(`getGrowthSalvageEssenceYield({
    growthShapeId: 'dot1', growthCategory: 'slab', rarity: 'normal', itemTier: 10
}, () => 0)`);
assert.strictEqual(slabYield, 3, 'T10 일반 석판은 획득 판정 성공 시 구조 보너스를 받아야 한다');

console.log('smoke-growth-overhaul passed');
