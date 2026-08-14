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

    context.__simpleStats.totalDps = 1000;
    context.__mapEstimate = {
        dps: 1000, ehp: 4000, peakHit: 3500, resistancePressure: 14,
        elements: ['fire'], playerDpsMultiplier: 1
    };
    const readiness = JSON.parse(run('JSON.stringify(getMapPowerReadiness(__simpleStats, __mapEstimate))'));
    assert.strictEqual(readiness.dps.label, '적정', '권장 DPS와 같은 빌드는 적정으로 표시해야 한다');
    assert.strictEqual(readiness.ehp.label, '낮음',
        '엔트로피 EHP가 높아도 관통된 보스 강공격에 직격사하면 낮음으로 표시해야 한다');
    assert.ok(readiness.recommendedEhp > context.__mapEstimate.ehp,
        '권장 EHP는 저항 관통과 직격 생존 하한을 반영해야 한다');
    context.__mapEstimate = { ...context.__mapEstimate, ehp: 3000, peakHit: 1500, resistancePressure: 0 };
    assert.strictEqual(run('getMapPowerReadiness(__simpleStats, __mapEstimate).ehp.label'), '높음',
        '직격 하한을 만족하는 엔트로피 회피 빌드는 반복 공격 생존력을 인정해야 한다');
    context.__mapEstimate = { ...context.__mapEstimate, dps: 600, oceanPressureDepthTier: 10 };
    context.__simpleStats.oceanPressureResist = 0;
    assert.strictEqual(run('getMapPowerReadiness(__simpleStats, __mapEstimate).dps.label'), '낮음',
        '심해 최종 관문 준비도는 진입 전 수압 공격 속도 저하를 포함해야 한다');
    context.__simpleStats.oceanPressureResist = 80;
    assert.strictEqual(run('getMapPowerReadiness(__simpleStats, __mapEstimate).dps.label'), '높음',
        '수압 저항을 확보한 빌드는 심해 공격 속도 손실을 완화해야 한다');

    context.__mapEstimate = {
        dps: 800, ehp: 1000, peakHit: 1000, elements: ['phys'],
        underworldGravityFloor: 30, zoneId: 'pinnacle_underking'
    };
    context.__simpleStats.underworldGravityReductionPct = 0;
    assert.strictEqual(run('getMapPowerReadiness(__simpleStats, __mapEstimate).dps.label'), '낮음',
        '진입 전 지하계 준비도는 해당 층의 중력 공격 속도 저하를 포함해야 한다');
    context.__simpleStats.underworldGravityReductionPct = 75;
    assert.strictEqual(run('getMapPowerReadiness(__simpleStats, __mapEstimate).dps.label'), '적정',
        '창공석 중력 완화는 지하계 준비도에도 실제 전투와 같은 비율로 반영해야 한다');
    context.__mapEstimate.underworldGravityIgnoresReduction = true;
    assert.strictEqual(run('getMapPowerReadiness(__simpleStats, __mapEstimate).dps.label'), '낮음',
        '재능 개화 시련의 고정 중력은 창공석으로 우회할 수 없어야 한다');

    context.__guardianStats = {
        ...simpleStats, evadeChance: 0,
        uniqueGuardianArmor: { takenLessPct: 8, bossTakenLessPct: 20 }
    };
    context.__bossEstimate = { dps: 1, ehp: 3000, peakHit: 1500, elements: ['fire'] };
    const baseBossReadiness = JSON.parse(run('JSON.stringify(getMapPowerReadiness(__simpleStats, __bossEstimate))'));
    const guardianBossReadiness = JSON.parse(run('JSON.stringify(getMapPowerReadiness(__guardianStats, __bossEstimate))'));
    assert.ok(Math.abs(guardianBossReadiness.recommendedEhp / baseBossReadiness.recommendedEhp - (0.8 / 0.92)) < 0.001,
        '보스 권장 EHP는 일반 피해 감소 대신 가디언 장비의 보스 전용 피해 감소를 적용해야 한다');

    context.__armoredStats = { ...simpleStats, evadeChance: 0, armor: 5000 };
    assert.ok(run('calculatePlayerEhpProfile(__armoredStats).elements.phys.direct') > 999,
        'physical EHP must solve the hit-size-dependent armor formula');

    const summaryHost = { innerHTML: '' };
    const characterHost = { innerHTML: '' };
    context.document.getElementById = id => id === 'ui-equipment-loadout-summary' ? summaryHost
        : id === 'ui-character-ehp' ? characterHost : null;
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
    run('renderCharacterEhpSummary(__summaryStats)');
    ['물리 EHP', '화염 EHP', '냉기 EHP', '번개 EHP', '카오스 EHP'].forEach(label => {
        assert.ok(characterHost.innerHTML.includes(label), `the character sheet must render ${label}`);
    });
} finally {
    Math.random = originalRandom;
}

console.log('smoke-evasion-entropy-ehp passed');
