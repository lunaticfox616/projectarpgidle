// 지속 피해와 에너지 보호막(2026-10-04): 화상 · 출혈은 타격처럼 보호막을 먼저 깎고, 중독(카오스)은 그대로 생명력으로 간다.
// 예전에는 셋 다 보호막을 건너뛰어, 혼돈 20 보스의 화상이 보호막 9,500이 가득한 채로 생명력 1,900짜리 빌드를 쓰러뜨렸다.
// 실제 상태이상 걸음(tickAilments)으로 확인한다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

run(`game = mergeDefaults({ level: 60 }); game.combatTimeMs = 1800000000000;
    window.burnFor = (type, shield, seconds) => {
        const stats = getPlayerStats();
        game.playerHp = 1000; game.playerEnergyShield = shield; game.playerEsLastHitAt = 0;
        game.playerAilments = [{ type, time: 30, power: 1, sourceHitDamage: 400 }];
        for (let step = 0; step < seconds * 10; step++) { game.combatTimeMs += 100; tickAilments(stats, 0.1); }
        return { hp: game.playerHp, shield: game.playerEnergyShield, esHitAt: game.playerEsLastHitAt };
    };`);

for (const type of ['ignite', 'bleed']) {
    const shielded = json(`burnFor('${type}', 100000, 2)`);
    assert.equal(shielded.hp, 1000, `${type}: life stays while the shield holds`);
    assert.ok(shielded.shield < 100000, `${type}: the shield takes the damage`);
    assert.ok(shielded.esHitAt > 0, `${type}: the shield's recharge waits like after a hit`);
    const bare = json(`burnFor('${type}', 0, 2)`);
    assert.ok(bare.hp < 1000, `${type}: without a shield life takes it`);
    const thin = json(`burnFor('${type}', 5, 2)`);
    assert.equal(thin.shield, 0, `${type}: a thin shield is used up`);
    assert.ok(thin.hp > bare.hp && thin.hp < 1000, `${type}: the rest reaches life`);
}
const poison = json(`burnFor('poison', 100000, 2)`);
assert.ok(poison.hp < 1000 && poison.shield === 100000, 'poison (chaos) still reaches life past the shield');
console.log('ailment damage and energy shield: burn and bleed drain the shield first, poison goes to life: OK');
