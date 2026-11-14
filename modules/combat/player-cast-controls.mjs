

/** 석화(79 석화 혼합물, 2026-11-01): 움직이지도 공격하지도 못한다. 행동을 멈추는 일은 기절과 같고(js/enemy-attack-rules.js), 밀리지 않고(pushEnemyAwayOnHit) 그림은 돌빛이다.
 * 보스는 굳지 않는다: 던지는 간격이 굳는 시간보다 짧아 보스의 패턴이 통째로 멈추기 때문이다. 이미 굳었으면 시간만 다시 채운다. */
export function castPetrifyEnemy(enemy,at,seconds) {
    if (enemy.isBoss) return;
    enemy.ailments=Array.isArray(enemy.ailments)?enemy.ailments:[];
    const row=enemy.ailments.find(ail=>ail && ail.petrified);
    if (row) row.time=Math.max(row.time || 0,seconds);
    else enemy.ailments.push({type:'stun',time:seconds,power:0,petrified:true,petrifiedAt:at});
}

export function castEnemyTimeSlowed(env, enemy) {
    const left=(Number(enemy.timeSlowUntil)||0)-env.deps.getCombatTime();
    return left>0 && left<=TIME_SLOW_MS;
}

/** 끌어당김 한 번: 보스와 굳은 적은 끌려오지 않는다(밀어내기와 같다, canPushEnemy). */
export function castPullEnemyToward(env, enemy,command) {
    if (!env.deps.canPushEnemy(enemy)) return;
    const goal=command.column===undefined ? command.center : { gx: command.column, gy: enemy.gy };
    for (let step=0; step<command.cells; step++) if (!env.deps.gridStepToward(enemy,goal.gx,goal.gy,env.deps.getGridBlockedCells(enemy))) break;
}

const TIME_SLOW_MS = 1300;
export const TIME_SLOW_MOVE = 0.3;
export const castIsEnemyPetrified = enemy => Array.isArray(enemy.ailments) && enemy.ailments.some(ail => ail && ail.petrified && ail.time > 0);
export const CAST_MARKS = Object.freeze({
    mist(_env, command, targets) { for (const enemy of targets) enemy.holyMistUntil = command.at + 4000; },
    petrify(_env, command, targets) { for (const enemy of targets) castPetrifyEnemy(enemy, command.at, command.ms / 1000); },
    timeSlow(_env, command, targets) { for (const enemy of targets) enemy.timeSlowUntil = command.at + command.ms; },
    pull(env, command, targets) { for (const enemy of targets) castPullEnemyToward(env, enemy, command); },
    weaken(_env, command, targets) { for (const enemy of targets) enemy.voidWeakUntil = command.at + command.ms; }
});
