const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = expression => vm.runInContext(expression, context);
const originalRandom = Math.random;

try {
    Math.random = () => 0;
    context.__playerDefender = {};
    assert.strictEqual(run('resolveEntropyEvasion(__playerDefender, 50, 1000)'), true,
        'the first 50 percent entropy check should evade from a zero seed');
    assert.strictEqual(run('resolveEntropyEvasion(__playerDefender, 50, 1100)'), false,
        'the second 50 percent entropy check must hit instead of allowing a random streak');
    assert.strictEqual(run('resolveEntropyEvasion(__playerDefender, 50, 1200)'), true,
        'the shared defender counter must continue the deterministic cadence');

    context.__enemyA = {};
    context.__enemyB = {};
    assert.strictEqual(run('resolveEntropyEvasion(__enemyA, 50, 2000)'), true,
        'one enemy defender must start its own entropy sequence');
    assert.strictEqual(run('resolveEntropyEvasion(__enemyB, 50, 2000)'), true,
        'a different enemy defender must not consume the first enemy counter');

    Math.random = () => 0.99;
    assert.strictEqual(run('resolveEntropyEvasion(__playerDefender, 50, 5000)'), false,
        'an idle entropy reset must randomize the next hit position');

    assert.strictEqual(run('calculatePlayerAccuracy(100, 0, 0, 0)'), 380,
        'level growth must be reduced to the new base plus three accuracy per level');
    assert.strictEqual(run('calculatePlayerAccuracy(100, 100, 0, 0)'), 880,
        'dexterity must contribute five accuracy per point');
    assert.strictEqual(run('calculatePlayerAccuracy(100, 0, 200, 0)'), 580,
        'displayed flat item accuracy must contribute one-for-one');
    assert.strictEqual(run('calculatePlayerAccuracy(100, 0, 200, 25)'), 725,
        'accuracy bonus percent must affect the final value');
    assert.deepStrictEqual(
        JSON.parse(run('JSON.stringify(MOD_DB.find(mod => mod.id === "accuracy"))')),
        { id: 'accuracy', type: 'suffix', statName: '정확도', slots: ['무기', '장갑', '반지', '목걸이'], base: 90, step: 60 },
        'the item affix source values must be raised directly instead of using a hidden multiplier'
    );
    assert.ok(run('getEnemyTotalEvadeChance({ evasion: 1200 }, 1200)')
        < run('getEnemyTotalEvadeChance({ evasion: 1200 }, 400)'),
    'investing in accuracy must materially reduce enemy evasion');

    const simpleStats = {
        maxHp: 1000, energyShield: 0, armor: 0, dr: 0, evadeChance: 50,
        resF: 75, maxResF: 75, resC: 50, maxResC: 75,
        resL: 0, maxResL: 75, resChaos: -20, maxResChaos: 75,
        warriorTakenDamageMultiplier: 1, genericTakenDamageMultiplier: 1
    };
    context.__simpleStats = simpleStats;
    const profile = JSON.parse(run('JSON.stringify(calculatePlayerEhpProfile(__simpleStats))'));
    assert.strictEqual(profile.elements.phys.direct, 999, 'unmitigated direct physical EHP must match the resource pool');
    assert.strictEqual(profile.elements.fire.direct, 3999, '75 percent fire resistance must quadruple direct EHP');
    assert.strictEqual(profile.elements.fire.entropy, 7998,
        '50 percent entropy evasion must double repeated-attack fire EHP');
    assert.ok(profile.elements.fire.direct > profile.elements.cold.direct
        && profile.elements.cold.direct > profile.elements.light.direct
        && profile.elements.light.direct > profile.elements.chaos.direct,
    'elemental EHP must follow the effective resistance order');

    context.__armoredStats = { ...simpleStats, evadeChance: 0, armor: 5000 };
    assert.ok(run('calculatePlayerEhpProfile(__armoredStats).elements.phys.direct') > 999,
        'physical EHP must solve the hit-size-dependent armor formula');

    const summaryHost = { innerHTML: '' };
    context.document.getElementById = id => id === 'ui-equipment-loadout-summary' ? summaryHost : null;
    context.game.equipment = {};
    context.game.inventory = [];
    context.__summaryStats = simpleStats;
    run('renderEquipmentLoadoutSummary(__summaryStats)');
    ['물리 EHP', '화염 EHP', '냉기 EHP', '번개 EHP', '카오스 EHP'].forEach(label => {
        assert.ok(summaryHost.innerHTML.includes(label), `the equipment summary must render ${label}`);
    });
    assert.ok(summaryHost.innerHTML.includes('직격 EHP 3,999'),
        'the EHP tooltip must preserve the non-evasion one-hit value');
    assert.ok(summaryHost.innerHTML.includes('엔트로피 회피 50.0%'),
        'the EHP tooltip must explain the entropy multiplier');
} finally {
    Math.random = originalRandom;
}

console.log('smoke-evasion-entropy-ehp passed');
