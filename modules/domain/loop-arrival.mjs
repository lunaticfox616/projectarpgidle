import { loopFlowGetLoopAdvancePathLabel } from './loop-progress.mjs';

export function* loopFlowAdvanceLoopCounters(env, owner, loopPath) {
    if (loopPath === 'cosmos') owner.cosmosLoopCount = Math.max(0, Math.floor(owner.cosmosLoopCount || 0)) + 1;
    owner.lastLoopAdvancePath = loopPath;
    owner.season++;
    env.deps.loopMutation.begin(owner);
    owner.loopCount = Math.max(0, Math.floor(owner.loopCount || 0)) + 1;
    owner.seasonPoints++;
    (yield { kind: 'loopLog', args: [`🔁 ${loopFlowGetLoopAdvancePathLabel(loopPath)}로 다음 루프에 진입합니다.${loopPath === 'cosmos' ? env.deps._t(' (우주계 난이도 +{max}단계)', { max: Math.max(0, Math.floor(owner.cosmosLoopCount || 0)) }) : ''}`, 'season-up'] });
}

export function loopFlowQueueLoopArrivalNotices(env, owner) {
    Object.entries(env.deps.EXPLORATION_EVENT_NOTICES).forEach(([kind, notice]) => {
        if (owner.season === notice.loop) env.deps.queueTutorialNotice('exploration_event_' + kind, notice.title, notice.body);
    });
    if (owner.season === 31 && typeof env.deps.queueTutorialNotice === 'function') {
        env.deps.queueTutorialNotice('unlock_rival_blades', env.deps._t('버려진 날붙이들'), env.deps._t('나무꾼이 벼리다 버린 다른 날들이 당신을 찾아옵니다.\n‘지도 → 탐험 → 강대한 적’에서 결투에 도전하세요.\n도전권 [표식: 버려진 날]은 심층 보스가 떨어뜨립니다.\n한 루프 안에 다섯 날을 모두 꺾으면 「완성작」이 모습을 드러냅니다.'), 'tab-map');
    }
}

export function loopFlowGetLoopSettleLogLine(env, loopReward) {
    return [env.deps._t('🧬 심화 루프 정산: +{bonus}pt (혼돈 심화 +{depthGain}, 미궁 +{labGain}, 특수보스 +{bossGain}, 나무꾼 +{woodsmanGain})', { bonus: loopReward.bonus, depthGain: loopReward.depthGain, labGain: loopReward.labGain, bossGain: loopReward.bossGain, woodsmanGain: loopReward.woodsmanGain || 0 }), loopReward.bonus > 0 ? 'season-up' : 'attack-monster'];
}
