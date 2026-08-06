// 생장판 드랍은 장비 드랍률 배율이 아니라 독립 원본 확률을 사용하며,
// 이전 기본 확률의 정확히 1/3이어야 한다.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const chances = JSON.parse(run('JSON.stringify(GROWTH_ITEM_BASE_DROP_CHANCES)'));

assert.ok(Math.abs(chances.regular * 3 - 0.014) < 1e-12,
    '일반몹 생장판 원본 확률은 이전 1.4%의 1/3이어야 한다');
assert.ok(Math.abs(chances.elite * 3 - 0.0525) < 1e-12,
    '정예 생장판 원본 확률은 이전 5.25%의 1/3이어야 한다');
assert.ok(Math.abs(chances.boss * 3 - 0.161) < 1e-12,
    '보스 생장판 원본 확률은 이전 16.1%의 1/3이어야 한다');

assert.strictEqual(run('getGrowthItemBaseDropChance({})'), chances.regular);
assert.strictEqual(run('getGrowthItemBaseDropChance({ isElite: true })'), chances.elite);
assert.strictEqual(run('getGrowthItemBaseDropChance({ isBoss: true, isElite: true })'), chances.boss);

run(`
    game.season = 60;
    game.maxZoneId = 60;
    game.currentZoneId = 1;
    game.growthInventory = [];
    game.recentGrowthDrops = [];
    game.growthBoard = null;
    game.settings.growthAutoClaim = false;
    game.settings.showLootLog = false;
    ensureGrowthBoardState();
    syncGrowthBoardUnlocks({ silent: true });
`);

function rollAt(randomValue, chance) {
    return JSON.parse(run(`JSON.stringify((function () {
        game.recentGrowthDrops = [];
        let originalRandom = Math.random;
        Math.random = () => ${randomValue};
        rollGrowthItemDrop({ isBoss: false, isElite: false }, ${chance});
        Math.random = originalRandom;
        return { drops: game.recentGrowthDrops.length };
    })())`));
}

assert.strictEqual(rollAt(chances.regular - 0.000001, chances.regular).drops, 1,
    '원본 확률 바로 아래 굴림은 실제 생장판 생성·보관 경로까지 완료해야 한다');
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
