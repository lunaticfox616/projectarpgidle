const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);

function setSealFixture(stats) {
    run(`(function () {
        const ocean = ensureOceanState();
        Object.keys(ocean.fishStock).forEach(key => { ocean.fishStock[key] = 0; });
        ocean.fishStock.tidelordKoi = 1;
        ocean.fishStock.glowfinTrout = 3;
        window.__seaGiftLogs = [];
        addLog = message => window.__seaGiftLogs.push(String(message));
        window.__seaGiftTarget = {
            id: 990001,
            slot: '투구',
            baseId: 'sea_gift_test_helmet',
            baseName: '바다의 선물 검증 투구',
            name: '바다의 선물 검증 투구',
            rarity: 'rare',
            itemTier: 10,
            hiddenTier: 10,
            baseStats: [],
            stats: ${JSON.stringify(stats)}
        };
    })()`);
}

setSealFixture([
    { id: 'flatHp', statName: '생명력', val: 100, lockedByHoney: true }
]);
const blockedBefore = run('JSON.stringify({ fish: game.ocean.fishStock, item: window.__seaGiftTarget })');
assert.strictEqual(run("craftSeaGift('sealOffering', window.__seaGiftTarget)"), false,
    'seal crafting must fail when the target has no editable affix');
assert.strictEqual(run('JSON.stringify({ fish: game.ocean.fishStock, item: window.__seaGiftTarget })'), blockedBefore,
    'failed seal crafting must not consume fish or mutate the target item');
assert(run("window.__seaGiftLogs.some(message => message.includes('봉인할 수 있는 옵션 줄이 없습니다'))"),
    'failed seal crafting must explain why it was blocked');

setSealFixture([
    { id: 'flatHp', statName: '생명력', val: 100 }
]);
assert.strictEqual(run("craftSeaGift('sealOffering', window.__seaGiftTarget)"), true,
    'seal crafting must still succeed when an editable affix exists');
assert.strictEqual(run('window.__seaGiftTarget.stats[0].lockedByHoney'), true,
    'successful seal crafting must lock the editable affix');
assert.strictEqual(run('game.ocean.fishStock.tidelordKoi'), 0,
    'successful seal crafting must consume the required rare fish');
assert.strictEqual(run('game.ocean.fishStock.glowfinTrout'), 0,
    'successful seal crafting must consume the required common fish');

console.log('smoke-sea-gift-crafting passed');
