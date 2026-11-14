import { incidentJoinFight, incidentMakeCritter } from '../combat/incident-critters.mjs';
import { incidentStrayable, incidentStrayLook, incidentDressStray } from '../combat/incident-strays.mjs';
import { incidentLull, incidentYawn } from '../combat/incident-sleep.mjs';
import { incidentFeast } from '../combat/incident-feast.mjs';
import { incidentStarShower, incidentDropStar } from '../combat/incident-stars.mjs';
import { incidentBreathe } from '../combat/incident-breath.mjs';
import { incidentOpenChallenge } from '../combat/incident-challenge.mjs';

/** 시험 패널(js/dev-test-panel-ui.js): 지금 방에서 싸우는 무리의 영웅 곁에 슬라임 하나를 바로 세운다. 세웠는지. */
export function incidentTestSpawn(env, rainbow = false) {
    const zone = env.deps.getZone(env.owner.currentZoneId), run = env.deps.actExplorationState.current(env.owner), hero = env.owner.gridPlayer;
    const live = (env.owner.enemies || []).find(enemy => enemy && enemy.hp > 0 && enemy.explorationPack);
    const host = live && run ? run.packs.find(row => row.key === live.explorationPack) : null;
    const taken = new Set((env.owner.enemies || []).map(enemy => env.deps.gridCellKey(enemy.gx, enemy.gy)).concat(env.deps.gridCellKey(hero.gx, hero.gy)));
    const cell = [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 1], [-2, 1]].map(([dx, dy]) => ({ gx: hero.gx + dx, gy: hero.gy + dy }))
        .find(c => !taken.has(env.deps.gridCellKey(c.gx, c.gy)) && env.deps.canPlaceGridFootprint(taken, c.gx, c.gy, { columns: 1, rows: 1 }));
    if (!host || !cell) return false;
    incidentJoinFight(env, host, incidentMakeCritter(env, zone, cell, rainbow));
    return true;
}

/** 시험 패널: 지금 방의 첫 보통 몬스터를 길 잃은 몬스터로. 바꿨는지. */
export function incidentTestStray(env) {
    const enemy = (env.owner.enemies || []).find(row => row && row.hp > 0 && !row.critter && !row.stray && incidentStrayable(env, row));
    const look = enemy ? incidentStrayLook(env, env.deps.getZone(env.owner.currentZoneId), `test:${enemy.id}`) : null;
    return look ? incidentDressStray(env, enemy, look) : false;
}

/** 시험 패널: 지금 방의 보통 몬스터를 잠재운다(생명력을 채워서). 잠재웠는지. */
export function incidentTestSleep(env) {
    const here = (env.owner.enemies || []).filter(enemy => enemy && enemy.hp > 0 && !enemy.isBoss && !enemy.critter && !enemy.asleep);
    here.forEach(enemy => { incidentLull(env, enemy).hp = enemy.maxHp; });
    return here.length > 0;
}

/** 시험 패널: 지금 방에 황금 수액 잔치. 열렸는지. */
export function* incidentTestFeast(env) {
    const run = env.deps.actExplorationState.current(env.owner), here = (env.owner.enemies || []).filter(enemy => enemy && enemy.hp > 0 && !enemy.isBoss);
    return !!run && (yield* incidentFeast(env, run, here, `test:${env.deps.getCombatTime()}`));
}

/** 시험 패널: 지금 싸우는 몬스터에게 하품. */
export function* incidentTestYawn(env) {
    const here = (env.owner.enemies || []).filter(enemy => enemy && enemy.hp > 0 && !enemy.isBoss);
    if (here.length) (yield* incidentYawn(env, here, env.deps.getCombatTime()));
    return here.length > 0;
}

/** 시험 패널: 지금 방에 유성우. */
export function* incidentTestShower(env) {
    const run = env.deps.actExplorationState.current(env.owner), room = run && env.deps.actExplorationDoors.stageMap(run) ? env.deps.actExplorationDoors.room(run) : null;
    return !!room && (yield* incidentStarShower(env, run, room, `test:${env.deps.getCombatTime()}`, env.deps.getCombatTime()));
}

/** 시험 패널: 지금 방에 별똥별 하나. 떨어뜨렸는지. */
export function* incidentTestStar(env) {
    const run = env.deps.actExplorationState.current(env.owner), room = run && env.deps.actExplorationDoors.stageMap(run) ? env.deps.actExplorationDoors.room(run) : null;
    return !!room && (yield* incidentDropStar(env, run, room, `test:${env.deps.getCombatTime()}`, { now: env.deps.getCombatTime(), forced: true }));
}

/** 시험 패널: 지금 영웅에게 숨결 하나. */
export function* incidentTestBreath(env) {
    const now = env.deps.getCombatTime();
    return (yield* incidentBreathe(env, `test:${now}`, now, true));
}

/** 시험 패널: 지금 방에 사냥 도전. 열었는지. */
export function* incidentTestChallenge(env) {
    const run = env.deps.actExplorationState.current(env.owner), room = run && env.deps.actExplorationDoors.stageMap(run) ? env.deps.actExplorationDoors.room(run) : null;
    return !!room && (yield* incidentOpenChallenge(env, run, room, `test:${env.deps.getCombatTime()}`, { now: env.deps.getCombatTime(), forced: true }));
}
