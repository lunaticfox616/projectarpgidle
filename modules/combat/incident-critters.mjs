import { incidentRule, incidentTell } from '../combat/incident-common.mjs';

/** 금빛(rainbow면 무지갯빛) 수액 슬라임 하나: 그 구역의 보통 몬스터를 바탕으로 한다. */
export function incidentMakeCritter(env, zone, cell, rainbow) {
    const critter = env.deps.createEnemy(zone, { at: 0, count: 1, boss: false, elite: false, storyStage: null }, 0);
    return Object.assign(incidentDressCritter(env, critter, rainbow), cell, { gridMoveTimer: 0, regenBank: 0, spawnStamp: 0 });
}

/** 몬스터를 금빛(rainbow면 무지갯빛) 수액 슬라임으로: 그림, 이름, 생명력(hpMul배), 덤비지 않음, 경험치(expMul배), 테. */
export function incidentDressCritter(env, enemy, rainbow) {
    const C = incidentRule(env).critter, maxHp = Math.ceil(enemy.maxHp * C.hpMul);
    return Object.assign(enemy, {
        name: rainbow ? C.rainbow.name : C.name, spriteVariantId: C.look, monsterVisualId: C.look, monsterArchetype: null, realmVisual: null,
        hp: maxHp, maxHp, noAttack: true, critter: rainbow ? 'rainbow' : 'gold', encounterOutline: C.outline,
        expMul: (Number(enemy.expMul) || 1) * C.expMul });
}

/** 싸우는 중에 세우는 슬라임(시험 패널, 황금을 빚는 손, 7,777번째 처치): 그 무리(host)에 들어 바로 싸움에 든다. */
export function incidentJoinFight(env, host, critter) {
    critter.explorationPack = host.key;
    host.aliveIds.push(critter.id);
    env.owner.enemies.push(critter);
    return critter;
}

/** 영웅에게서 가장 먼 방 구석(한 칸 안쪽). */
export function incidentFarCorner(env, room) {
    const hero = env.owner.gridPlayer, corners = [[room.x0 + 1, room.y0 + 1], [room.x1 - 1, room.y0 + 1], [room.x0 + 1, room.y1 - 1], [room.x1 - 1, room.y1 - 1]];
    return corners.map(([gx, gy]) => ({ gx, gy })).sort((a, b) => env.deps.gridChebyshevDist(b.gx, b.gy, hero.gx, hero.gy) - env.deps.gridChebyshevDist(a.gx, a.gy, hero.gx, hero.gy))[0];
}

/** 싸움에 든 슬라임: 처음 본 때를 적고(나타났다는 알림, 자동 사냥이면 영웅이 잠가 쫓는다), 먼 구석으로 달아나며, fleeMs가 지나면
     * 사라진다. 슬라임이 영웅보다 빨라 구석에 몰린 뒤에 잡힌다. */
export function* incidentTickCritter(env, run, enemy, room, now) {
    const C = incidentRule(env).critter, rainbow = enemy.critter === 'rainbow';
    if (!(enemy.critterSeenAt > 0)) {
        enemy.critterSeenAt = now;
        if (run.mode !== 'manual' && !env.deps.actExplorationState.lockedEnemy(run)) env.deps.actExplorationState.lockOn(run, enemy);
        (yield* incidentTell(rainbow ? '무지갯빛 수액 슬라임이 나타났습니다.' : '금빛 수액 슬라임이 나타났습니다.', rainbow ? 'chase' : 'reward', rainbow));
    }
    if (now - enemy.critterSeenAt >= C.fleeMs) return (yield* incidentEscape(env, run, enemy, rainbow));
    if (room && env.deps.hasGridCell(enemy)) env.deps.advanceGridUnitMovement(enemy, incidentFarCorner(env, room), 0.1, C.stepSec);
    return false;
}

/** 달아난 슬라임은 전리품 없이 사라진다. 무리에서 빠지는 셈은 처치와 같다(무리의 산 몬스터 목록, 지도 오브젝트의 진행:
     * js/combat-kill-rewards.js handleEnemyDeath). */
export function* incidentEscape(env, run, enemy, rainbow) {
    enemy.hp = 0;
    env.owner.enemies = env.owner.enemies.filter(entry => entry.id !== enemy.id);
    if (env.deps.actExplorationState.recordDeath(env.owner, enemy)) env.deps.actExplorationProgress.objects.afterDeath(run);
    (yield { kind: 'addBattleFx', args: ['enemyDeath', { enemyId: enemy.id, name: enemy.name, color: '#fff0a8', duration: 420 }] });
    if (rainbow || !enemy.feast) (yield* incidentTell(rainbow ? '무지갯빛 수액 슬라임이 달아났습니다.' : '금빛 수액 슬라임이 달아났습니다.', 'warning'));
    return true;
}
