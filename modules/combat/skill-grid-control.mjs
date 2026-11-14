

/** The cast snapshot owns a targeted pull destination; legacy player pulls follow the player. */
export function hitGetSkillGridPullGeometry(env, skill, options) {
    let cells = Math.max(0, Math.min(3, Math.floor(Number(skill?.pullTowardImpactCells || skill?.pullTowardPlayerCells) || 0)));
    let center = skill?.pullTowardImpactCells ? options.attackFootprint?.center : env.owner.gridPlayer;
    return { cells, center };
}

export function* hitPushEnemyAwayOnHit(env, enemy, skill) {
    let cells = Math.max(0, Math.min(3, Math.floor(Number(skill && skill.pushAwayCells) || 0)));
    if (cells <= 0 || !hitCanPushEnemy(env, enemy) || !env.deps.hasGridCell(env.owner.gridPlayer)) return false;
    let moved = false;
    for (let step = 0; step < cells; step++) {
        const cell = env.deps.findGridRetreatCell(enemy, env.owner.gridPlayer, 99, null);
        if (!cell) break;
        Object.assign(enemy, cell);
        moved = true;
    }
    if (moved) (yield { kind: 'addBattleFx', args: ['statusText', { enemyId: enemy.id, text: env.deps._t('밀려남'), color: '#f0c993', duration: 300 }] });
    return moved;
}

/** 철벽 척력화(uniqueRepelMelee): 근접 공격으로 주인공에게 닿은(회피되지 않은) 몬스터를 룬의 밀어내기로 밀어낸다. 막아낸 공격도
 * 닿은 공격이다. 보스는 밀리지 않고(pushEnemyAwayOnHit), 같은 몬스터는 cooldownMs에 한 번만 밀린다. */
export function* hitRepelMeleeAttacker(env, enemy, pStats) {
    const repel = pStats.uniqueRepelMelee;
    if (!repel || enemy.attackKind !== 'melee' || !(enemy.hp > 0)) return;
    const now = env.deps.getCombatTime();
    if (now < (Number(enemy.repelledAt) || -Infinity) + repel.cooldownMs) return;
    if ((yield* hitPushEnemyAwayOnHit(env, enemy, { pushAwayCells: repel.cells }))) enemy.repelledAt = now;
}

/** 맞은 몬스터를 skill.launchMs 동안 띄운다(올려 베기): 그동안 움직이지도 새 공격을 시작하지도 못한다. 보스는 뜨지 않는다. */
export function* hitLaunchEnemyOnHit(env, enemy, skill) {
    let ms = Math.max(0, Math.floor(Number(skill && skill.launchMs) || 0));
    if (ms <= 0 || enemy.isBoss) return false;
    enemy.skillHeldUntil = Math.max(Number(enemy.skillHeldUntil) || 0, env.deps.getCombatTime() + ms);
    (yield { kind: 'addBattleFx', args: ['statusText', { enemyId: enemy.id, text: env.deps._t('띄움'), color: '#f0c993', duration: 300 }] });
    return true;
}

/** 맞은 몬스터를 밀고 띄운다(룬에 있을 때만). 위치 제어를 끈 단계(skipGridControl)와 죽은 몬스터는 그대로 둔다. */
export function* hitDisplaceEnemyOnHit(env, enemy, skill, options) {
    if (options.skipGridControl || !enemy || enemy.hp <= 0) return;
    (yield* hitPushEnemyAwayOnHit(env, enemy, skill));
    (yield* hitLaunchEnemyOnHit(env, enemy, skill));
}

export function* hitApplySkillGridControlOnHit(env, enemy, skill, options = {}) {
    (yield* hitDisplaceEnemyOnHit(env, enemy, skill, options));
    let { cells, center } = hitGetSkillGridPullGeometry(env, skill, options);
    if (cells <= 0 || options.skipGridControl || !enemy || enemy.hp <= 0 || !center || !env.deps.hasGridCell(enemy)) return false;
    let moved = pullEnemyTowardCell(env, enemy, center, cells);
    if (moved) (yield { kind: 'addBattleFx', args: ['statusText', { enemyId: enemy.id, text: env.deps._t('중력 견인'), color: '#c5a8ff', duration: 300 }] });
    return moved;
}

function pullEnemyTowardCell(env, enemy, center, cells) {
    let moved = false;
    for (let step = 0; step < cells; step++) {
        if (!env.deps.gridStepToward(enemy, center.gx, center.gy, env.deps.getGridBlockedCells(enemy))) break;
        moved = true;
    }
    return moved;
}

/** 맞은 몬스터를 주인공 반대쪽으로 skill.pushAwayCells칸 민다(불사르기, 돌진: 2026-10-17 스킬룬 인계). 보스는 밀리지 않는다. */
export function hitCanPushEnemy(env, enemy) { return !enemy.isBoss && !env.deps.isEnemyPetrified(enemy) && env.deps.hasGridCell(enemy); }
