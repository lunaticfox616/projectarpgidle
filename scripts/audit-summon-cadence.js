// Read-only diagnostic: real summon combat with synthetic speed and a fixed target.
const { prepare } = require('./audit-combat-20260905');

function measureSummonCadence(speed) {
    const { runtime, state, enemy } = prepare();
    const stats = runtime.getPlayerStats();
    stats.summonAspd = speed;
    const start = state.combatTimeMs;
    const summon = {
        id: 501, gemName: '진단 소환수', gx: 3, gy: 4, gridRange: 8,
        alive: true, role: 'attack', baseDamage: 100, attackSpeedMul: 1,
        ele: 'phys', crit: 0, critDmg: 140, dmgRollMinPct: 100,
        hp: 100, maxHp: 100, nextAttackAt: start + 300
    };
    state.summons = [summon];
    let attacks = 0;
    for (let tick = 1; tick <= 200; tick++) {
        state.combatTimeMs = start + tick * 100;
        const before = enemy.hp;
        runtime.runSummonAttackTick(stats);
        if (enemy.hp < before) attacks++;
    }
    const interval = runtime.getSummonAttackIntervalMs(stats, summon);
    return {
        summonSpeedBonusPct: speed, configuredIntervalMs: interval,
        theoreticalAps: 1000 / interval, actualAttacks20Seconds: attacks,
        expectedAttacksWithInitialDelay: 1 + Math.floor(19700 / interval)
    };
}

console.log(JSON.stringify([0, 200, 500, 1000].map(measureSummonCadence), null, 2));
