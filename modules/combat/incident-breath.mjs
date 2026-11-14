import { incidentRule, incidentDraw, incidentOften, incidentTell, incidentNote } from '../combat/incident-common.mjs';

/** 처음 들어선 방에 chance의 확률로(forced면 반드시) 숨결 하나가 seconds초 동안 영웅에게(game.incidentBreath: 전투 시각까지).
     * 깃든 숨결이 있으면 새것으로 바뀐다. 능력치는 js/player-stat-cache.js incidentBreath가 읽어 js/combat.js가 더한다(breathStats). */
export function* incidentBreathe(env, key, now, forced = false) {
    const B = incidentRule(env).breath;
    if (!forced && incidentDraw(env, 'breath', key) >= B.chance * incidentOften(env)) return false;
    const kind = B.kinds[Math.floor(incidentDraw(env, 'breath-kind', key) * B.kinds.length)];
    env.owner.incidentBreath = { kind: kind.key, until: now + B.seconds * 1000 };
    (yield { kind: 'addBattleFx', args: ['statusText', { text: kind.name, color: '#b8f0c8', duration: 700, bodyCue: true }] });
    (yield* incidentTell(env.deps._t('세계수의 숨결: {seconds}초 동안 {text}.', { seconds: B.seconds, text: kind.text }), 'reward'));
    (yield* incidentNote(env, 'breath'));
    return true;
}

/** 깃든 숨결(js/player-stat-cache.js incidentBreath가 읽은 값)의 종류(rule().breath.kinds), 없으면 null. */
export function incidentBreathKind(env, breath) { return breath ? incidentRule(env).breath.kinds.find(kind => kind.key === breath.kind) || null : null; }

/** 깃든 숨결의 능력치 줄 [[stat, value]], 없으면 []. */
export function incidentBreathStats(env, breath) { return (incidentBreathKind(env, breath) || { stats: [] }).stats; }
