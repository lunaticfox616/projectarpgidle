import { incidentFirstLook, incidentRoomKey, incidentDraw, incidentRule, incidentOften, incidentQuiet } from '../combat/incident-common.mjs';
import { incidentFeast } from '../combat/incident-feast.mjs';
import { incidentDropStar, incidentLandStars } from '../combat/incident-stars.mjs';
import { incidentOpenChallenge, incidentTickChallenge } from '../combat/incident-challenge.mjs';
import { incidentBreathe } from '../combat/incident-breath.mjs';
import { incidentYawnChance, incidentYawn, incidentTickSleep } from '../combat/incident-sleep.mjs';
import { incidentTickCritter } from '../combat/incident-critters.mjs';

/** 처음 들어선 전투 방: 아주 드물게 황금 수액 잔치가 열리거나, 별똥별이 떨어지거나, 세계수가 하품을 해 그 방의 몬스터가 잠든다. */
export function* incidentTickRoom(env, run, room, now) {
    if (!room || (room.role !== 'battle' && room.role !== 'optional')) return;
    const here = (env.owner.enemies || []).filter(enemy => enemy && enemy.hp > 0 && !enemy.isBoss);
    if (!here.length || !incidentFirstLook(run, room)) return;
    (yield* incidentRollRoom(env, run, room, { here, key: incidentRoomKey(env, run, room), now }));
}

/** 처음 들어선 전투 방의 굴림: 잔치가 열리면 그것뿐, 아니면 별똥별과 사냥 도전, 도전이 열리지 않았으면 하품. */
export function* incidentRollRoom(env, run, room, { here, key, now }) {
    if (incidentDraw(env, 'feast', key) < incidentRule(env).feast.chance * incidentOften(env) && (yield* incidentFeast(env, run, here, key))) return;
    (yield* incidentDropStar(env, run, room, key, { now }));
    if ((yield* incidentOpenChallenge(env, run, room, key, { now }))) return;
    (yield* incidentBreathe(env, key, now));
    if (incidentDraw(env, 'yawn', key) < incidentYawnChance(env)) (yield* incidentYawn(env, here, now));
}

/** 시간이 걸리는 사건: 떨어지는 별똥별과 열린 사냥 도전. */
export function* incidentTickTimed(env, run, now) {
    if (env.runtime.stars.length) (yield* incidentLandStars(env, run, now));
    if (env.runtime.challenge) (yield* incidentTickChallenge(env, run, now));
}

/** 전투 한 틱마다(js/combat-summon-stats.js prepareCombatTick): 슬라임이 달아나고, 잠든 무리가 자거나 깨고, 처음 들어선 방에서 잔치와 하품을 굴린다. */
export function* incidentTick(env) {
    const zone = env.deps.getZone(env.owner.currentZoneId), run = env.deps.actExplorationState.current(env.owner);
    if (incidentQuiet(env, zone) || !run || !env.owner.enemies) return;
    const map = env.deps.actExplorationDoors.stageMap(run), room = map ? env.deps.actExplorationDoors.room(run) : null, now = env.deps.getCombatTime();
    const live = env.owner.enemies.filter(enemy => enemy && enemy.hp > 0);
    for (const enemy of live) if (enemy.critter) (yield* incidentTickCritter(env, run, enemy, room, now));
    const sleepers = live.filter(enemy => enemy.asleep);
    if (sleepers.length) (yield* incidentTickSleep(env, run, sleepers, now));
    (yield* incidentTickTimed(env, run, now));
    if (map) (yield* incidentTickRoom(env, run, room, now));
}
