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

function setAdvancedFixture(rarity, stats) {
    run(`(function () {
        const ocean = ensureOceanState();
        Object.keys(ocean.fishStock).forEach(key => { ocean.fishStock[key] = 99; });
        window.__seaGiftTarget = {
            id: 990002,
            slot: '투구',
            baseId: 'sea_gift_advanced_helmet',
            baseName: '심해 제작 검증 투구',
            name: '심해 제작 검증 투구',
            rarity: ${JSON.stringify(rarity)},
            itemTier: 10,
            hiddenTier: 10,
            baseStats: [],
            stats: ${JSON.stringify(stats)}
        };
    })()`);
}

run('window.__seaGiftOriginalRandom = Math.random; Math.random = () => 0;');

setAdvancedFixture('rare', [
    { id: 'flatHp', statName: '생명력', val: 0, valMin: 0, valMax: 200, tier: 5 }
]);
assert.strictEqual(run("craftSeaGift('safeReroll', window.__seaGiftTarget)"), true,
    'safe reroll must accept a rerollable affix');
assert.strictEqual(run('window.__seaGiftTarget.stats[0].id'), 'flatHp',
    'safe reroll must reroll the selected affix value instead of replacing its stat identity');

setAdvancedFixture('rare', [
    { id: 'flatHp', statName: '생명력', val: 50, valMin: 40, valMax: 60, tier: 4 },
    { id: 'resF', statName: '화염 저항', val: 20, valMin: 18, valMax: 24, tier: 4 }
]);
assert.strictEqual(run("craftSeaGift('twinCurrentReroll', window.__seaGiftTarget)"), true,
    'two-line reroll must accept two rerollable affixes');
assert.deepStrictEqual(JSON.parse(run('JSON.stringify(window.__seaGiftTarget.stats.map(stat => stat.id))')), ['flatHp', 'resF'],
    'two-line reroll must preserve both affix identities');

setAdvancedFixture('rare', [
    { id: 'flatHp', statName: '생명력', val: 50, valMin: 40, valMax: 60, tier: 4 }
]);
assert.strictEqual(run("craftSeaGift('tierStepUp', window.__seaGiftTarget)"), true,
    'tier-step crafting must accept an affix below its cap');
assert.strictEqual(run('window.__seaGiftTarget.stats[0].id'), 'flatHp',
    'tier-step crafting must not turn the upgraded line into another stat');
assert.strictEqual(run('window.__seaGiftTarget.stats[0].tier'), 5,
    'tier-step crafting must raise the existing affix by exactly one tier');

setAdvancedFixture('normal', []);
assert.strictEqual(run("craftSeaGift('voidPureRefine', window.__seaGiftTarget)"), true,
    'forced rarity upgrade must accept normal equipment');
assert.strictEqual(run('window.__seaGiftTarget.rarity'), 'rare',
    'forced rarity upgrade must take a normal item directly to rare');

setAdvancedFixture('rare', [{ id: 'flatHp', statName: '생명력', val: 50, valMin: 40, valMax: 60, tier: 4 }]);
const rareUpgradeBefore = run('JSON.stringify({ item: window.__seaGiftTarget, fish: game.ocean.fishStock })');
assert.strictEqual(run("craftSeaGift('voidPureRefine', window.__seaGiftTarget)"), false,
    'forced rarity upgrade must reject equipment that is already rare');
assert.strictEqual(run('JSON.stringify({ item: window.__seaGiftTarget, fish: game.ocean.fishStock })'), rareUpgradeBefore,
    'a rejected forced rarity upgrade must not consume fish or mutate the item');

setAdvancedFixture('rare', [
    { id: 'flatHp', statName: '생명력', val: 20, valMin: 10, valMax: 30, tier: 1 },
    { id: 'resF', statName: '화염 저항', val: 40, valMin: 35, valMax: 45, tier: 8 }
]);
assert.strictEqual(run("craftSeaGift('leviathanRemnant', window.__seaGiftTarget)"), true,
    'leviathan remnant must apply when another removable affix exists');
assert.strictEqual(run('window.__seaGiftTarget.stats.length'), 1,
    'leviathan remnant must replace one line and remove one different line');
assert(!['flatHp', 'resF'].includes(run('window.__seaGiftTarget.stats[0].id')),
    'leviathan remnant must retain the newly granted top affix instead of deleting it');

run('Math.random = window.__seaGiftOriginalRandom;');

console.log('smoke-sea-gift-crafting passed');
