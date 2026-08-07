const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);

function getCostForExpression(baseExpression) {
    return JSON.parse(run(`JSON.stringify(getBaseUpgradeCost(${baseExpression}))`));
}

function getCostForNamedBase(name) {
    return getCostForExpression(`BASE_ITEM_DB.find(base => base.name === ${JSON.stringify(name)})`);
}

const tierCurve = [
    [3, 15], [6, 30], [10, 65], [12, 90], [14, 120], [17, 170], [20, 225]
];
tierCurve.forEach(([tier, total]) => {
    let cost = getCostForExpression(`{ reqTier: ${tier} }`);
    assert.strictEqual(cost.totalDewValue, total, `T${tier} 기본 비용 곡선`);
    assert.strictEqual(cost.formlessDew + cost.goldenRule * cost.dewPerGoldenRule, total,
        '표시 재화의 이슬 환산 합계가 총비용과 같아야 한다');
});

const chainCosts = [
    ['사냥꾼의 도끼', 15],
    ['혈각 검', 65],
    ['처형자의 검', 120],
    ['파멸 대검', 225],
    ['멸세 대검', 625]
];
chainCosts.forEach(([name, total]) => {
    assert.strictEqual(getCostForNamedBase(name).totalDewValue, total,
        `${name} 도착 비용은 베이스 단계에 맞아야 한다`);
});

let penultimate = getCostForNamedBase('파멸 대검');
assert.deepStrictEqual(
    { dew: penultimate.formlessDew, golden: penultimate.goldenRule },
    { dew: 25, golden: 2 },
    '5단계 비용은 황금률 2개와 이슬 25개여야 한다'
);
let final = getCostForNamedBase('멸세 대검');
assert.deepStrictEqual(
    { dew: final.formlessDew, golden: final.goldenRule },
    { dew: 25, golden: 6 },
    '최종 6단계 비용은 황금률 6개와 이슬 25개여야 한다'
);
assert.strictEqual(final.dewPerGoldenRule, 100,
    '황금률 환산값은 거래소의 이슬 100개 교환 비율을 따라야 한다');

function prepareFinalUpgrade(goldenRule) {
    run(`(function () {
        let current = BASE_ITEM_DB.find(base => base.name === '파멸 대검');
        let next = BASE_ITEM_DB.find(base => base.name === '멸세 대검');
        game.inventory = [{ id: 99001, baseId: current.id, baseName: current.name,
            name: current.name, slot: current.slot, rarity: 'rare', itemTier: current.reqTier,
            baseStats: [], stats: [] }];
        game.equipment = {};
        game.currencies.formlessDew = 25;
        game.currencies.goldenRule = ${goldenRule};
        game.currencies.magicBud = 7;
        game.pendingBaseUpgrade = { itemId: 99001, nextBaseId: next.id };
    })()`);
}

prepareFinalUpgrade(6);
run('confirmSelectedItemBaseUpgrade()');
assert.strictEqual(run('game.currencies.formlessDew'), 0, '최종 업그레이드는 표시된 이슬을 차감해야 한다');
assert.strictEqual(run('game.currencies.goldenRule'), 0, '최종 업그레이드는 표시된 황금률을 차감해야 한다');
assert.strictEqual(run('game.currencies.magicBud'), 7, '관련 없는 재화는 유지되어야 한다');
assert.strictEqual(run("game.inventory[0].baseName"), '멸세 대검', '비용 지불 후 다음 베이스로 변경되어야 한다');
assert.strictEqual(run('game.pendingBaseUpgrade'), null, '성공한 업그레이드의 대기 상태는 닫혀야 한다');

prepareFinalUpgrade(5);
run('confirmSelectedItemBaseUpgrade()');
assert.strictEqual(run('game.currencies.formlessDew'), 25, '황금률이 부족하면 이슬을 먼저 차감하면 안 된다');
assert.strictEqual(run('game.currencies.goldenRule'), 5, '실패한 업그레이드는 황금률을 유지해야 한다');
assert.strictEqual(run("game.inventory[0].baseName"), '파멸 대검', '비용 부족 시 베이스를 변경하면 안 된다');

const nonIncreasingChainSteps = JSON.parse(run(`JSON.stringify((function () {
    let violations = [];
    BASE_ITEM_DB.forEach(base => {
        let candidates = getBaseUpgradeCandidates(base);
        let next = candidates && candidates[0];
        if (!next) return;
        let laterCandidates = getBaseUpgradeCandidates(next);
        let later = laterCandidates && laterCandidates[0];
        if (!later) return;
        let nextCost = getBaseUpgradeCost(next).totalDewValue;
        let laterCost = getBaseUpgradeCost(later).totalDewValue;
        if (laterCost <= nextCost) violations.push({ base: base.name, nextCost, laterCost });
    });
    return violations;
})())`));
assert.deepStrictEqual(nonIncreasingChainSteps, [],
    'every later base-chain upgrade must cost more than the preceding upgrade');

console.log('smoke-base-upgrade-cost passed');
