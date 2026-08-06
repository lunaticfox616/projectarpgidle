// 생장판 후속 개편 회귀: 10% 석판 드랍, 형태 재배열, 체이싱 가중치와 실제 효과·관계를 검증한다.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);

run(`
    game.season = 60;
    game.maxZoneId = 60;
    game.currentZoneId = 1;
    game.growthInventory = [];
    game.recentGrowthDrops = [];
    game.growthBoard = null;
    game.currencies.growthEssence = 100;
    ensureGrowthBoardState();
    syncGrowthBoardUnlocks({ silent: true });
`);

assert.strictEqual(run('GROWTH_SLAB_DROP_RATE'), 0.10, '석판 드랍 비중은 정확히 10%여야 한다');
assert.strictEqual(run('GROWTH_LEVEL_STAT_PCT'), 15, '석판 레벨당 증폭은 15%여야 한다');
const dropBoundary = JSON.parse(run(`JSON.stringify((function () {
    let originalRandom = Math.random;
    Math.random = () => 0.099;
    let slab = generateGrowthDrop({ isBoss: false, isElite: false });
    Math.random = () => 0.101;
    let growth = generateGrowthDrop({ isBoss: false, isElite: false });
    Math.random = originalRandom;
    return { below: slab.growthCategory, above: growth.growthCategory };
})())`));
assert.strictEqual(dropBoundary.below, 'slab', '10% 경계 바로 아래 드랍은 실제 석판 생성 경로를 타야 한다');
assert.notStrictEqual(dropBoundary.above, 'slab', '10% 경계 바로 위 드랍은 석판 생성 경로를 타면 안 된다');

// 같은 칸 수 안에서만 형태가 바뀌고 전용 재화가 정확히 소모된다.
run(`game.growthInventory.push({ id: 7001, name: '형태 시험', rarity: 'rare', growthShapeId: 'domino2',
    growthCategory: 'thorn', growthBaseId: 'gt_crown_briar', baseStats: [], stats: [] });`);
const shapeResult = JSON.parse(run(`JSON.stringify((function () {
    let originalRandom = Math.random;
    Math.random = () => 0;
    let result = reforgeGrowthItemShape(7001);
    Math.random = originalRandom;
    return result;
})())`));
assert.strictEqual(shapeResult.ok, true, '2칸 생장판은 다른 2칸 형태로 재배열되어야 한다');
assert.strictEqual(run('findGrowthItemById(7001).growthShapeId'), 'diagonal2');
assert.strictEqual(run('game.currencies.growthEssence'), 94, '2칸 형태 재배열은 정수 6개를 소모해야 한다');
assert.strictEqual(run('getGrowthItemCells(findGrowthItemById(7001), 0).length'), 2, '형태 변경 뒤에도 공간 비용은 같아야 한다');

run(`game.growthInventory.push({ id: 7002, name: '한 칸 시험', rarity: 'normal', growthShapeId: 'dot1',
    growthCategory: 'flower', growthBaseId: 'gf_sun_bloom', baseStats: [], stats: [] });`);
const beforeFailedReforge = run('game.currencies.growthEssence');
assert.strictEqual(run('reforgeGrowthItemShape(7002).ok'), false, '대안이 없는 1칸 형태는 재화를 쓰지 않고 거부해야 한다');
assert.strictEqual(run('game.currencies.growthEssence'), beforeFailedReforge, '실패한 재배열은 재화를 소모하면 안 된다');

// 일반 석판은 제작대에서 다른 일반 문양으로 재각인되며 체이싱 문양은 보호된다.
run(`
    game.growthInventory.push({ id: 7003, name: '기반의 석판', rarity: 'magic', itemTier: 10, hiddenTier: 10,
        growthShapeId: 'dot1', growthCategory: 'slab', growthSlabId: 'gs_base', baseStats: [], stats: [] });
    growthCraftItemId = 7003;
`);
const beforeSlabReforge = run('game.currencies.growthEssence');
run(`(function () { let originalRandom = Math.random; Math.random = () => 0; reforgeGrowthSlabAtBench(); Math.random = originalRandom; })()`);
assert.notStrictEqual(run('findGrowthItemById(7003).growthSlabId'), 'gs_base', '일반 석판 재각인은 다른 문양을 선택해야 한다');
assert.strictEqual(run('game.currencies.growthEssence'), beforeSlabReforge - run('GROWTH_SLAB_REFORGE_COST'),
    '석판 재각인은 정해진 생장 정수를 한 번만 소모해야 한다');
run(`
    game.growthInventory.push({ id: 7004, name: '일식의 석판', rarity: 'unique', itemTier: 20, hiddenTier: 20,
        growthShapeId: 'dot1', growthCategory: 'slab', growthSlabId: 'gs_eclipse', growthChase: true,
        baseStats: [], stats: [] });
    growthCraftItemId = 7004;
`);
const beforeChaseReforge = run('game.currencies.growthEssence');
run('reforgeGrowthSlabAtBench()');
assert.strictEqual(run('findGrowthItemById(7004).growthSlabId'), 'gs_eclipse', '체이싱 석판 문양은 변경되면 안 된다');
assert.strictEqual(run('game.currencies.growthEssence'), beforeChaseReforge, '거부된 체이싱 재각인은 재화를 소모하면 안 된다');

// 체이싱 정의는 일반 고유/석판보다 최소 20배 낮은 가중치를 가지며 강제 생성 시 표식과 문구를 보존한다.
const chaseWeights = JSON.parse(run(`JSON.stringify({
    uniques: GROWTH_UNIQUE_DB.filter(row => row.chase).map(row => row.weight),
    slabs: GROWTH_SLAB_DB.filter(row => row.chase).map(row => row.weight),
    normalUniqueMin: Math.min(...GROWTH_UNIQUE_DB.filter(row => !row.chase).map(row => row.weight || 1)),
    normalSlabMin: Math.min(...GROWTH_SLAB_DB.filter(row => !row.chase).map(row => row.weight || 1))
})`));
assert.ok(chaseWeights.uniques.length >= 2 && chaseWeights.slabs.length >= 2, '체이싱 생장판과 석판이 각각 2종 이상이어야 한다');
assert.ok(Math.max(...chaseWeights.uniques) <= chaseWeights.normalUniqueMin / 20, '체이싱 생장판 가중치는 일반 고유의 1/20 이하여야 한다');
assert.ok(Math.max(...chaseWeights.slabs) <= chaseWeights.normalSlabMin / 20, '체이싱 석판 가중치는 일반 석판의 1/20 이하여야 한다');
const chaseItem = JSON.parse(run('JSON.stringify(generateGrowthUniqueItem(20, "태초의 설계도"))'));
assert.strictEqual(chaseItem.growthChase, true, '체이싱 생장판 인스턴스에 표식이 남아야 한다');
assert.ok(chaseItem.flavorText.length > 0, '체이싱 생장판은 고유 문구를 가져야 한다');

// 실제 효과 계산에서 다양성 빌드가 태초의 설계도를 발동한다.
run(`
    game.growthInventory = [];
    unplaceAllGrowthItems();
    let blueprint = generateGrowthUniqueItem(20, '태초의 설계도');
    blueprint.id = 7100;
    game.growthInventory.push(blueprint);
    ['flower','branch','leaf','fruit','root'].forEach((category, index) => game.growthInventory.push({
        id: 7101 + index, name: category, rarity: 'normal', growthShapeId: 'dot1', growthCategory: category,
        growthBaseId: GROWTH_BASE_DB.find(base => base.category === category).id, baseStats: [], stats: []
    }));
    placeGrowthItem(7100, 0, 0, 0);
    [[3,0],[4,0],[5,0],[6,0],[7,0]].forEach((cell, index) => placeGrowthItem(7101 + index, cell[0], cell[1], 0));
`);
assert.ok(Math.abs(run('getGrowthItemBaseMultiplier(7101)') - 1.4) < 1e-9,
    '서로 다른 6종 배치는 모든 비석판 베이스 옵션을 40% 증폭해야 한다');
assert.ok(JSON.parse(run('JSON.stringify(getGrowthItemRelatedIds(7100))')).includes(7101),
    '효과 계산은 UI가 강조할 실제 연결 대상을 제공해야 한다');

// 체이싱 석판의 판 전체 범위와 죽은 별의 석판 레벨 포식은 실제 스탯으로 이어져야 한다.
run(`
    game.growthInventory = [];
    unplaceAllGrowthItems();
    let mycelium = generateGrowthUniqueItem(20, '죽은 별의 균사체');
    mycelium.id = 7300;
    game.growthInventory.push(mycelium,
        { id: 7301, name: '일식의 석판', rarity: 'unique', hiddenTier: 20, growthShapeId: 'dot1',
            growthCategory: 'slab', growthSlabId: 'gs_eclipse', growthChase: true, baseStats: [], stats: [] },
        { id: 7302, name: '별빛 대상', rarity: 'normal', growthShapeId: 'dot1', growthCategory: 'root',
            growthBaseId: 'gr_iron_root', baseStats: [], stats: [] });
    placeGrowthItem(7300, 0, 0, 0);
    placeGrowthItem(7301, 7, 3, 0);
    placeGrowthItem(7302, 5, 0, 0);
`);
assert.strictEqual(run('getGrowthItemLevel(7300)'), 2, '일식의 석판은 멀리 있는 체이싱 생장판에도 판 전체 +2를 부여해야 한다');
assert.strictEqual(run('getGrowthItemLevel(7302)'), 2, '일식의 석판은 멀리 있는 일반 생장판에도 판 전체 +2를 부여해야 한다');
const deadStarStats = JSON.parse(run(`JSON.stringify((function () {
    let bucket = createEmptyStatBucket();
    applyGrowthSpatialStats(bucket);
    return { chaos: bucket.chaosPctDmg, dot: bucket.dotPctDmg, hp: bucket.pctHp };
})())`));
assert.deepStrictEqual(deadStarStats, { chaos: 16, dot: 16, hp: -10 },
    '죽은 별은 양의 석판 레벨 합계를 카오스·지속 피해로 바꾸고 생명력 대가를 적용해야 한다');
assert.ok(JSON.parse(run('JSON.stringify(getGrowthItemRelatedIds(7301))')).includes(7302),
    '판 전체 체이싱 석판은 실제 영향을 받는 먼 대상도 호버 관계에 포함해야 한다');

// 석판과 영향을 받는 아이템의 관계도 실제 레벨 계산에서 연결된다.
run(`
    game.growthInventory = [];
    unplaceAllGrowthItems();
    game.growthInventory.push({ id: 7200, name: '화로', rarity: 'magic', growthShapeId: 'dot1',
        growthCategory: 'slab', growthSlabId: 'gs_hearth', baseStats: [], stats: [] });
    game.growthInventory.push({ id: 7201, name: '대상', rarity: 'normal', growthShapeId: 'dot1',
        growthCategory: 'thorn', growthBaseId: 'gt_crown_briar', baseStats: [], stats: [] });
    placeGrowthItem(7200, 3, 2, 0);
    placeGrowthItem(7201, 3, 1, 0);
`);
assert.strictEqual(run('getGrowthItemLevel(7201)'), 2, '화로 석판은 인접 대상에 실제 레벨을 부여해야 한다');
assert.ok(JSON.parse(run('JSON.stringify(getGrowthItemRelatedIds(7200))')).includes(7201),
    '석판 호버용 관계에는 실제 영향을 받는 아이템이 포함되어야 한다');

console.log('smoke-growth-chase-reforge passed');
