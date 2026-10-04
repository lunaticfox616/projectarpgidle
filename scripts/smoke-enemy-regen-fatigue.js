// 몬스터 회복 지침(2026-10-04): 계속 생명력을 잃는 동안 회복이 60초에 걸쳐 0으로 줄고, 2초 동안 아무것도 맞지 않으면 돌아온다.
// 혼돈 20 보스(초당 생명력 0.48%, 약 2.1만 회복)를 그보다 약하게 때리는 빌드는 끝나지 않는 교착에 빠졌다(방치 런이 영원히 멈춤).
// 실제 0.1초 걸음(applyEnemyRegen)과 피해(applyDamageToEnemyResource)로 확인한다. 나무꾼은 지치지 않는다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

run(`game = mergeDefaults({ season: 10 }); game.combatTimeMs = 1800000000000;
    window.fight = (spec, seconds, hitPerStep) => {
        const enemy = { id: 1, hp: 500000, maxHp: 1000000, regenRate: 0.00048, regenSuppressPct: 0, isBoss: true, ...spec };
        const life = [];
        for (let step = 0; step < seconds * 10; step++) {
            game.combatTimeMs += 100;
            if (hitPerStep) applyDamageToEnemyResource(enemy, hitPerStep);
            applyEnemyRegen(enemy, null);
            if (step % 10 === 9) life.push(enemy.hp);
        }
        return { enemy, life };
    };`);

// Untouched: the full 0.48% a step (480 of 1,000,000).
const calm = json('fight({}, 1, 0)');
assert.equal(calm.life[0], 500000 + 4800, 'an untouched monster regenerates its full rate');

// Hit for 300 a step (3,000 a second) against 4,800 a second of regeneration: it heals at first, then tires and loses life.
const tired = json('fight({}, 120, 300)');
assert.ok(tired.life[4] > 500000, 'early in the fight the regeneration still outheals the hits');
assert.ok(tired.life[119] < tired.life[30], 'once tired the same hits take its life down');
assert.equal(tired.enemy.regenFatigueMs, 60000, 'fatigue stops at the full minute');
const regenAfterMinute = json(`(() => { const r = fight({}, 61, 300); const before = r.enemy.hp; applyEnemyRegen(r.enemy, null); return r.enemy.hp - before; })()`);
assert.equal(regenAfterMinute, 0, 'after a minute of fighting it no longer regenerates');

// Two quiet seconds give the regeneration back.
const rested = json(`(() => { const r = fight({}, 30, 300); for (let i = 0; i < 25; i++) { game.combatTimeMs += 100; applyEnemyRegen(r.enemy, null); }
    const before = r.enemy.hp; game.combatTimeMs += 100; applyEnemyRegen(r.enemy, null); return { gain: r.enemy.hp - before, fatigue: r.enemy.regenFatigueMs }; })()`);
assert.deepEqual(rested, { gain: 480, fatigue: 0 }, 'two seconds without a hit reset the fatigue');

// The woodsman never tires.
const woodsman = json('fight({ isWoodsman: true }, 90, 300)');
assert.equal(woodsman.enemy.regenFatigueMs || 0, 0);
assert.ok(woodsman.life[89] > woodsman.life[0], 'the woodsman keeps regenerating through the hits');

// The map estimate averages the tiring regeneration over the fight.
const estimate = json(`[getMapBossRequiredDps(1000000, 30, 0.01), getMapBossRequiredDps(1000000, 30, 0), getMapBossRequiredDps(1000000, 120, 0.01)]`);
assert.equal(estimate[0] - estimate[1], 1000000 * 0.01 * 10 * 0.75, 'a 30 s fight keeps three quarters of the regeneration (per 0.1 s step) on average');
assert.ok(Math.abs(estimate[2] - 1000000 / 120 - 1000000 * 0.01 * 10 * 0.25) < 1e-6, 'a 120 s fight keeps a quarter');

// Saved records: corrupt fatigue fields fall back to a rested monster.
const loaded = json(`mergeDefaults({ enemies: [{ id: 3, hp: 10, maxHp: 20, regenFatigueMs: 'x', regenLastLossAt: -5, regenHpMark: null }] }).enemies[0]`);
assert.deepEqual([loaded.regenFatigueMs, loaded.regenLastLossAt, loaded.regenHpMark], [0, 0, 0], 'corrupt fatigue fields load rested');
console.log('enemy regeneration fatigue: full when untouched, tires over a minute of fighting, rests in two seconds, woodsman exempt: OK');
