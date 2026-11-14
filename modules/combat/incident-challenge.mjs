import { incidentRule, incidentDraw, incidentOften, incidentTell, incidentReceipt, incidentNote } from '../combat/incident-common.mjs';

/** 처음 들어선 방에 chance의 확률로(forced면 반드시) 사냥 도전: seconds초 안에 그 방의 무리를 모두 쓰러뜨리면 재화(tickChallenge).
     * 하나씩만, 몬스터가 남은 방에서만 열린다. 열었는지. */
export function* incidentOpenChallenge(env, run, room, key, { now, forced = false }) {
    const C = incidentRule(env).challenge;
    if (env.runtime.challenge || (!forced && incidentDraw(env, 'challenge', key) >= C.chance * incidentOften(env)) || !incidentChallengeRewards(env).length) return false;
    if (!run.packs.some(pack => pack.roomId === room.id && pack.aliveIds.length)) return false;
    env.runtime.challenge = { run, roomId: room.id, until: now + C.seconds * 1000, marks: C.marks.slice() };
    (yield { kind: 'addBattleFx', args: ['statusText', { text: env.deps._t('사냥 도전 {seconds}초', { seconds: C.seconds }), color: '#ff9f6b', duration: 900, bodyCue: true }] });
    (yield* incidentTell(env.deps._t('사냥 도전: {seconds}초 안에 이 방의 몬스터를 모두 쓰러뜨리세요.', { seconds: C.seconds }), 'reward'));
    return true;
}

export function incidentChallengeRewards(env) { return incidentRule(env).challenge.rewards.filter(([currency]) => env.deps.contentProgression.canDropCurrency(currency)); }

/** 열린 도전: 그 방의 무리가 모두 쓰러졌으면 보상, 시간이 지났으면 끝, 남은 시간이 marks에 닿으면 영웅 머리 위에 초. 지도를
     * 떠나면 없어진다. */
export function* incidentTickChallenge(env, run, now) {
    if (env.runtime.challenge.run !== run) { env.runtime.challenge = null; return; }
    if (run.packs.filter(pack => pack.roomId === env.runtime.challenge.roomId).every(pack => !pack.aliveIds.length)) return (yield* incidentFinishChallenge(env, true));
    if (now >= env.runtime.challenge.until) return (yield* incidentFinishChallenge(env, false));
    const left = Math.ceil((env.runtime.challenge.until - now) / 1000);
    if (env.runtime.challenge.marks.length && left <= env.runtime.challenge.marks[0]) (yield { kind: 'addBattleFx', args: ['statusText', { text: env.deps._t('{shift}초', { shift: env.runtime.challenge.marks.shift() }), color: '#ffe9a0', duration: 600, bodyCue: true }] });
}

/** 도전의 끝: 해냈으면 영웅의 칸에 picks번 고른 재화와 알림, 아니면 알림만. */
export function* incidentFinishChallenge(env, won) {
    const C = incidentRule(env).challenge, hero = env.owner.gridPlayer, rows = incidentChallengeRewards(env);
    env.runtime.challenge = null;
    if (!won) return (yield* incidentTell(env.deps._t('사냥 도전의 시간이 지났습니다.'), 'warning'));
    incidentReceipt(env, () => {
        for (let i = 0; i < C.picks && rows.length; i++) {
            const [currency, count] = env.deps.rndChoice(rows);
            env.deps.keepCurrencyDrop({ gx: hero.gx, gy: hero.gy }, currency, count);
        }
    });
    (yield { kind: 'addBattleFx', args: ['statusText', { text: env.deps._t('사냥 도전 성공'), color: '#ff9f6b', duration: 900, bodyCue: true }] });
    (yield* incidentTell(env.deps._t('사냥 도전을 해냈습니다.'), 'reward'));
    (yield* incidentNote(env, 'challenge'));
}
