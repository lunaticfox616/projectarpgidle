// 생장판 드랍은 장비 드랍률 배율이 아니라 독립 원본 확률을 사용한다.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const chances = JSON.parse(run('JSON.stringify(GROWTH_ITEM_BASE_DROP_CHANCES)'));
const equipmentChances = JSON.parse(run('JSON.stringify(EQUIPMENT_BASE_DROP_CHANCES)'));

assert.strictEqual(chances.regular, 0.003, '일반몹 생장판 원본 확률은 0.3%여야 한다');
assert.strictEqual(chances.elite, 0.01, '정예 생장판 원본 확률은 1%여야 한다');
assert.strictEqual(chances.boss, 0.03, '보스 생장판 원본 확률은 3%여야 한다');
assert.deepStrictEqual(equipmentChances, { regular: 0.009, elite: 0.04, boss: 0.155 },
    '장비 원본 확률은 일반 0.9%, 정예 4%, 보스 15.5%여야 한다');
assert.strictEqual(run('getAdditiveDropBonusMultiplier(18.7, 16)'), 1.347,
    '도감과 계약 보너스는 서로 곱하지 않고 같은 원본 확률에 합연산해야 한다');

assert.strictEqual(run('getGrowthItemBaseDropChance({})'), chances.regular);
assert.strictEqual(run('getGrowthItemBaseDropChance({ isElite: true })'), chances.elite);
assert.strictEqual(run('getGrowthItemBaseDropChance({ isBoss: true, isElite: true })'), chances.boss);
assert.strictEqual(run("(game.maxZoneId=4,isFirstActBossEquipmentDropThisLoop({ id:4, type:'act' }, { isBoss:true }))"), true,
    '각 액트의 이번 루프 첫 보스 격파는 장비 한 개를 확정해야 한다');
assert.strictEqual(run("isFirstActBossEquipmentDropThisLoop({ id:3, type:'act' }, { isBoss:true })"), false,
    '이미 돌파한 액트 보스의 반복 사냥은 확정 장비를 다시 주면 안 된다');

run(`
    game.season = 60;
    game.maxZoneId = 60;
    game.currentZoneId = 1;
    game.growthInventory = [];
    game.recentGrowthDrops = [];
    game.growthBoard = null;
    game.settings.showLootLog = false;
    ensureGrowthBoardState();
    syncGrowthBoardUnlocks({ silent: true });
`);

function rollAt(randomValue, chance) {
    return JSON.parse(run(`JSON.stringify((function () {
        game.growthInventory = [];
        game.recentGrowthDrops = [];
        let originalRandom = Math.random;
        Math.random = () => ${randomValue};
        rollGrowthItemDrop({ isBoss: false, isElite: false }, ${chance});
        Math.random = originalRandom;
        return { drops: game.growthInventory.length, pending: game.recentGrowthDrops.length };
    })())`));
}

assert.strictEqual(rollAt(chances.regular - 0.000001, chances.regular).drops, 1,
    '원본 확률 바로 아래 굴림은 실제 생장판 생성·보관 경로까지 완료해야 한다');
assert.strictEqual(rollAt(chances.regular - 0.000001, chances.regular).pending, 0,
    '생장판 드랍이 별도 최근 획득 대기함에 남으면 안 된다');
assert.strictEqual(rollAt(chances.regular, chances.regular).drops, 0,
    '원본 확률 경계 이상 굴림은 생장판을 생성하면 안 된다');

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const dropFunction = combatSource.slice(combatSource.indexOf('function rollGrowthItemDrop('),
    combatSource.indexOf('function cleanupConditionGemStates'));
assert.ok(!/equipmentDropChance|\*\s*0\.5/.test(dropFunction),
    '생장판 드랍 판정이 장비 확률이나 사후 0.5배에 다시 의존하면 안 된다');
assert.ok(/rollGrowthItemDrop\(enemy, growthItemChance\)/.test(combatSource),
    '전투 드랍 경로는 독립 생장판 원본 확률을 전달해야 한다');

console.log('smoke-growth-drop-rate passed');
