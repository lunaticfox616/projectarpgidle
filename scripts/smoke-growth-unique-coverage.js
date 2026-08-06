// 종류별 두 번째 고유 생장판의 실제 배치 효과와 관계 표시 데이터를 검증한다.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);

run(`
    game.season = 60;
    game.maxZoneId = 60;
    game.growthInventory = [];
    game.growthBoard = null;
    ensureGrowthBoardState();
    syncGrowthBoardUnlocks({ silent: true });
    game.season = 37;
`);

function resetBoard() {
    run(`game.growthInventory = []; unplaceAllGrowthItems();`);
}

function readSpatialStats() {
    return JSON.parse(run(`JSON.stringify((function () {
        let bucket = createEmptyStatBucket();
        applyGrowthSpatialStats(bucket);
        return bucket;
    })())`));
}

// 꽃: 서로 다른 세 종류를 인접시키면 누적 피해와 문턱 보너스를 함께 받는다.
resetBoard();
run(`
    let ashenSun = generateGrowthUniqueItem(20, '재의 태양');
    ashenSun.id = 8000;
    game.growthInventory.push(ashenSun);
    ['branch', 'leaf', 'seed'].forEach((category, index) => {
        let base = GROWTH_BASE_DB.find(row => row.category === category && row.shapeId === 'dot1');
        let item = createGrowthItemFromBase(base, 'normal', 20);
        item.id = 8001 + index;
        game.growthInventory.push(item);
    });
    placeGrowthItem(8000, 3, 1, 0);
    [[3,0],[2,1],[4,1]].forEach((cell, index) => placeGrowthItem(8001 + index, cell[0], cell[1], 0));
`);
let stats = readSpatialStats();
assert.strictEqual(stats.firePctDmg, 26,
    '재의 태양은 고유 효과 +24%와 베이스의 잎 인접 효과 +2%를 함께 받아야 한다');
assert.strictEqual(stats.resPen, 5, '재의 태양은 인접 종류 3개 문턱에서 저항 관통 +5%를 받아야 한다');
assert.strictEqual(JSON.parse(run('JSON.stringify(getGrowthItemRelatedIds(8000))')).length, 3,
    '재의 태양 호버 관계는 실제 인접 대상 세 개를 가리켜야 한다');

// 열매: 씨앗 수만큼 모든 열매의 베이스 옵션을 증폭한다.
resetBoard();
run(`
    let harvestChalice = generateGrowthUniqueItem(20, '첫 수확의 성배');
    harvestChalice.id = 8100;
    let fruit = createGrowthItemFromBase(GROWTH_BASE_DB.find(row => row.id === 'gfr_red_berry'), 'normal', 20);
    fruit.id = 8101;
    game.growthInventory.push(harvestChalice, fruit);
    [8102, 8103].forEach(id => {
        let seed = createGrowthItemFromBase(GROWTH_BASE_DB.find(row => row.id === 'gsd_patient_seed'), 'normal', 20);
        seed.id = id;
        game.growthInventory.push(seed);
    });
    [[8100,0,0],[8101,4,0],[8102,2,0],[8103,3,0]].forEach(row => placeGrowthItem(row[0], row[1], row[2], 0));
`);
assert.ok(Math.abs(run('getGrowthItemBaseMultiplier(8100)') - 1.2) < 1e-9,
    '첫 수확의 성배는 씨앗 두 개로 자신의 베이스 옵션을 20% 증폭해야 한다');
assert.ok(Math.abs(run('getGrowthItemBaseMultiplier(8101)') - 1.2) < 1e-9,
    '첫 수확의 성배는 다른 열매의 베이스 옵션도 20% 증폭해야 한다');

// 뿌리: 모든 점유 칸이 음수 레벨일 때 페널티를 방어 자원으로 전환한다.
resetBoard();
run(`
    let invertedRoot = generateGrowthUniqueItem(20, '거꾸로 자란 뿌리');
    invertedRoot.id = 8200;
    game.growthInventory.push(invertedRoot,
        { id: 8201, name: '광휘 1', rarity: 'magic', growthShapeId: 'dot1', growthCategory: 'slab', growthSlabId: 'gs_radiance', baseStats: [], stats: [] },
        { id: 8202, name: '광휘 2', rarity: 'magic', growthShapeId: 'dot1', growthCategory: 'slab', growthSlabId: 'gs_radiance', baseStats: [], stats: [] });
    placeGrowthItem(8200, 0, 1, 0);
    placeGrowthItem(8201, 7, 1, 0);
    placeGrowthItem(8202, 7, 2, 0);
`);
assert.strictEqual(run('getGrowthItemLevel(8200)'), -1, '거꾸로 자란 뿌리는 실제 음수 석판 레벨을 받아야 한다');
stats = readSpatialStats();
assert.strictEqual(stats.pctHp, 5, '음수 레벨 1은 생명력 +5%로 전환되어야 한다');
assert.strictEqual(stats.armor, 25, '음수 레벨 1은 방어도 +25로 전환되어야 한다');

// 가시: 인접 대상을 공격력과 생명력의 맞교환으로 바꾼다.
resetBoard();
run(`
    let bloodTithe = generateGrowthUniqueItem(20, '피의 십일조');
    bloodTithe.id = 8300;
    game.growthInventory.push(bloodTithe);
    ['flower', 'branch', 'leaf', 'seed'].forEach((category, index) => {
        let base = GROWTH_BASE_DB.find(row => row.category === category && row.shapeId === 'dot1');
        let item = createGrowthItemFromBase(base, 'normal', 20);
        item.id = 8301 + index;
        game.growthInventory.push(item);
    });
    placeGrowthItem(8300, 3, 1, 0);
    [[3,0],[2,1],[4,1],[3,2]].forEach((cell, index) => placeGrowthItem(8301 + index, cell[0], cell[1], 0));
`);
stats = readSpatialStats();
assert.strictEqual(stats.physPctDmg, 28, '피의 십일조는 인접 네 개로 물리 피해 +28%를 받아야 한다');
assert.strictEqual(stats.pctHp, -8, '피의 십일조는 인접 네 개의 대가로 생명력 -8%를 적용해야 한다');

// 줄기: 같은 선상에 있는 원소 대상만 증폭한다.
resetBoard();
run(`
    let stormConduit = generateGrowthUniqueItem(20, '폭풍을 꿰는 도관');
    stormConduit.id = 8400;
    let elemental = createGrowthItemFromBase(GROWTH_BASE_DB.find(row => row.id === 'gf_ember_crown'), 'normal', 20);
    elemental.id = 8401;
    let defense = createGrowthItemFromBase(GROWTH_BASE_DB.find(row => row.category === 'branch' && row.shapeId === 'dot1'), 'normal', 20);
    defense.id = 8402;
    game.growthInventory.push(stormConduit, elemental, defense);
    placeGrowthItem(8400, 0, 2, 0);
    placeGrowthItem(8401, 5, 2, 0);
    placeGrowthItem(8402, 0, 0, 0);
`);
assert.ok(Math.abs(run('getGrowthItemStatMultiplier(8401)') - 1.18) < 1e-9,
    '폭풍 도관은 같은 행의 원소 생장판 옵션을 18% 증폭해야 한다');
assert.strictEqual(run('getGrowthItemStatMultiplier(8402)'), 1,
    '폭풍 도관은 같은 열이어도 원소 태그가 없는 생장판을 증폭하면 안 된다');

// 덩굴: 다른 소환수 생장판 네 개를 증폭하고 소환수 한도를 연다.
resetBoard();
run(`
    let hiveUmbilical = generateGrowthUniqueItem(20, '군체의 탯줄');
    hiveUmbilical.id = 8500;
    game.growthInventory.push(hiveUmbilical);
    [8501, 8502, 8503, 8504].forEach(id => {
        let summon = createGrowthItemFromBase(GROWTH_BASE_DB.find(row => row.id === 'gv_binding_tendril'), 'normal', 20);
        summon.id = id;
        game.growthInventory.push(summon);
    });
    placeGrowthItem(8500, 0, 0, 0);
    [[3,0],[4,0],[5,0],[6,0]].forEach((cell, index) => placeGrowthItem(8501 + index, cell[0], cell[1], 0));
`);
assert.ok(Math.abs(run('getGrowthItemStatMultiplier(8501)') - 1.15) < 1e-9,
    '군체의 탯줄은 다른 소환수 생장판 옵션을 15% 증폭해야 한다');
stats = readSpatialStats();
assert.strictEqual(stats.summonCap, 1, '다른 소환수 생장판 네 개는 소환수 한도 +1을 열어야 한다');
assert.strictEqual(JSON.parse(run('JSON.stringify(getGrowthItemRelatedIds(8500))')).length, 4,
    '군체의 탯줄 호버 관계는 실제 증폭 대상 네 개를 가리켜야 한다');

console.log('smoke-growth-unique-coverage passed');
