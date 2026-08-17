const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);

run(`(function () {
    window.__oceanLogs = [];
    addLog = message => window.__oceanLogs.push(String(message));
    updateStaticUI = () => {};
    queueImportantSave = () => {};
    game.ocean.unlocked = true;
    game.ocean.diving = false;
})()`);

assert.strictEqual(run("setOceanFishingStrategy('abyss')"), true,
    'a surfaced player must be able to choose the abyss fishing strategy');
assert.strictEqual(run('game.ocean.fishingStrategy'), 'abyss');
run('game.ocean.diving = true');
assert.strictEqual(run("setOceanFishingStrategy('shoal')"), false,
    'fishing strategy changes must be locked during a dive');
assert.strictEqual(run('game.ocean.fishingStrategy'), 'abyss',
    'a rejected strategy change must preserve the active strategy');

run(`(function () {
    game.ocean.fishingStrategy = 'balanced';
    game.ocean.fishingGauge = 0;
    game.ocean.reefInstalled = 0;
    game.ocean.claimedCollectionMilestones = [];
    gainOceanFishingGaugeFromCombat({ depthTier: 0, currents: [] });
    window.__balancedGauge = game.ocean.fishingGauge;
    game.ocean.fishingStrategy = 'shoal';
    game.ocean.fishingGauge = 0;
    gainOceanFishingGaugeFromCombat({ depthTier: 0, currents: [] });
    window.__shoalGauge = game.ocean.fishingGauge;
})()`);
assert(Math.abs(run('window.__balancedGauge') - 1) < 0.0001,
    'balanced fishing must preserve the baseline gauge gain');
assert(Math.abs(run('window.__shoalGauge') - 1.35) < 0.0001,
    'shoal fishing must apply its faster gauge gain');

run(`(function () {
    game.currentZoneId = OCEAN_ZONE_ID;
    game.ocean.oxygenMax = 100;
    game.ocean.oxygenCur = 100;
    game.ocean.fishingStrategy = 'balanced';
    consumeOceanOxygenOnAttack();
    window.__balancedAttackCost = 100 - game.ocean.oxygenCur;
    game.ocean.oxygenCur = 100;
    game.ocean.fishingStrategy = 'abyss';
    consumeOceanOxygenOnAttack();
    window.__abyssAttackCost = 100 - game.ocean.oxygenCur;
})()`);
assert(run('window.__abyssAttackCost > window.__balancedAttackCost'),
    'abyss fishing must pay the advertised additional oxygen cost');

const originalRandom = context.Math.random;
try {
    context.Math.random = () => 0;
    run(`(function () {
        game.ocean.fishStock = {};
        game.ocean.fishCaughtTotal = {};
        game.ocean.rareFishPity = 0;
        game.ocean.fishingStrategy = 'balanced';
    })()`);
    assert.strictEqual(run('catchOceanFish(0)'), 'shallowSilverfin');
    assert.strictEqual(run('game.ocean.fishStock.shallowSilverfin'), 1,
        'a catch must add usable fish stock');
    assert.strictEqual(run('game.ocean.fishCaughtTotal.shallowSilverfin'), 1,
        'a catch must also preserve lifetime collection progress');
    assert.strictEqual(run('game.ocean.rareFishPity'), 8,
        'a common catch must advance the visible rare-fish omen');

    run('game.ocean.rareFishPity = 100');
    assert.strictEqual(run('catchOceanFish(4)'), 'abyssAngler',
        'a full rare-fish omen must force an eligible rare catch');
    assert.strictEqual(run('game.ocean.rareFishPity'), 0,
        'a rare catch must reset the omen');
} finally {
    context.Math.random = originalRandom;
}

run(`(function () {
    game.ocean.diving = false;
    game.ocean.fishCaughtTotal = { shallowSilverfin: 3, tidalEel: 1 };
    game.ocean.claimedCollectionMilestones = [];
    game.currencies.reefFragment = 0;
})()`);
assert.strictEqual(run('claimOceanFishCollectionMilestone(2)'), true,
    'a completed collection milestone must be claimable');
assert.strictEqual(run('game.currencies.reefFragment'), 4,
    'collection rewards must grant their configured currency');
assert.strictEqual(run("getOceanFishCollectionBonus('gaugeGainPct')"), 5,
    'claimed collection milestones must grant their permanent bonus');
assert.strictEqual(run('claimOceanFishCollectionMilestone(2)'), false,
    'a collection milestone must not be claimed twice');
assert.strictEqual(run('game.currencies.reefFragment'), 4,
    'a duplicate claim must not grant currency again');

run(`game = mergeDefaults({
    season: 30,
    ocean: {
        unlocked: true,
        fishingStrategy: 'missing-strategy',
        fishStock: { shallowSilverfin: '3', tidalEel: -4 },
        claimedCollectionMilestones: [2, 2, 999],
        lastCatch: { key: 'missing-fish' }
    }
});`);
const normalized = JSON.parse(run('JSON.stringify(ensureOceanState())'));
assert.strictEqual(normalized.fishingStrategy, 'balanced',
    'legacy saves must fall back to a valid fishing strategy');
assert.strictEqual(normalized.fishCaughtTotal.shallowSilverfin, 3,
    'the real save merge path must retroactively seed lifetime collection progress');
assert.strictEqual(normalized.fishStock.shallowSilverfin, 3,
    'legacy fish stock strings must normalize to finite owned counts');
assert.strictEqual(normalized.fishStock.tidalEel, 0,
    'negative legacy fish stock must not survive normalization');
assert.deepStrictEqual(normalized.claimedCollectionMilestones, [2],
    'collection claims must be deduplicated and unknown milestones removed');
assert.strictEqual(normalized.lastCatch, null,
    'an unknown last-catch fish must not survive normalization');

run(`(function () {
    game.ocean = createDefaultOceanState();
    game.ocean.unlocked = true;
    Object.keys(OCEAN_FISH_DB).forEach(key => {
        game.ocean.fishStock[key] = 99;
        game.ocean.fishCaughtTotal[key] = 1;
    });
    game.equipment['무기'] = { name: '암묵 적용 금지 무기', stats: [{ id: 'flatHp', val: 10 }] };
})()`);
const stockBefore = run('JSON.stringify(game.ocean.fishStock)');
assert.strictEqual(run("craftSeaGift('safeReroll')"), false,
    'item sea gifts must require an explicitly selected crafting target');
assert.strictEqual(run('JSON.stringify(game.ocean.fishStock)'), stockBefore,
    'missing-target crafting must not spend fish');

run(`(function () {
    window.__growthSeaGiftTarget = {
        id: 990200,
        name: '잘못 선택된 생장판',
        growthCategory: 'flower',
        growthShapeId: 'dot1',
        stats: [{ id: 'flatHp', val: 10 }]
    };
    game.growthInventory = [window.__growthSeaGiftTarget];
    selectForCrafting(window.__growthSeaGiftTarget.id, false);
})()`);
const growthBefore = run('JSON.stringify(window.__growthSeaGiftTarget)');
const growthStockBefore = run('JSON.stringify(game.ocean.fishStock)');
assert.strictEqual(run("craftSeaGift('safeReroll', window.__growthSeaGiftTarget)"), false,
    'sea gifts must reject growth-board items as equipment targets');
assert.strictEqual(run('JSON.stringify(window.__growthSeaGiftTarget)'), growthBefore,
    'a rejected growth-board target must not be mutated');
assert.strictEqual(run('JSON.stringify(game.ocean.fishStock)'), growthStockBefore,
    'a rejected growth-board target must not consume fish');
assert.strictEqual(run('getSelectedSeaGiftEquipmentTarget()'), null,
    'the shared crafting selection must not expose a growth item as a sea-gift equipment target');

const elements = {
    'ui-fishing-panel': { innerHTML: '' },
    'ui-sea-gift-panel': { innerHTML: '' }
};
context.document.getElementById = id => elements[id] || null;
run('renderFishingPanel(); renderSeaGiftPanel();');
assert(elements['ui-fishing-panel'].innerHTML.includes('ocean-strategy-card')
    && elements['ui-fishing-panel'].innerHTML.includes('희귀 조짐')
    && elements['ui-fishing-panel'].innerHTML.includes('무광해 도감 완성'),
'the fishing UI must expose strategy, omen, and collection progression');
assert(elements['ui-sea-gift-panel'].innerHTML.includes('현재 제작 대상')
    && elements['ui-sea-gift-panel'].innerHTML.includes('일반 장비가 아님')
    && elements['ui-sea-gift-panel'].innerHTML.includes('대상 선택 필요'),
'the sea-gift UI must explain an incompatible shared crafting target');
assert(!elements['ui-sea-gift-panel'].innerHTML.includes('테스트 중인 컨텐츠'),
    'finished sea-gift presentation must not retain the prototype warning');

const html = fs.readFileSync('index.html', 'utf8');
assert(html.includes('css/ocean.css') && html.includes('class="ocean-panel-shell"'),
    'the ocean UI must load its dedicated responsive stylesheet');

console.log('smoke-ocean-fishing-progression passed');
