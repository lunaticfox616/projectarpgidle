import { unlockGuideCount, unlockGuideGuide, unlockGuideRequirement } from './content-guide-common.mjs';

export function unlockGuideGetRoadmapMilestones(env) {
    if (typeof env.deps.SEASON_CONTENT_ROADMAP === 'undefined' || !env.deps.SEASON_CONTENT_ROADMAP) return [];
    return Object.keys(env.deps.SEASON_CONTENT_ROADMAP).map(Number).sort((a, b) => a - b).map(loop => {
        let row = env.deps.SEASON_CONTENT_ROADMAP[loop] || {};
        let features = (Array.isArray(row.features) ? row.features : []).filter(text => !/^심화:|^전술 조건/.test(text));
        return { loop, features };
    }).filter(row => row.features.length > 0);
}

export function unlockGuideCleanRoadmapFeature(text) {
    return String(text || '').replace(/^(?:조건부 )?해금:\s*/, '').replace(/^전환점:\s*/, '').replace(/\s*\/\s*/g, ', ');
}

export function unlockGuideLoopMilestoneGuide(env, state) {
    let loop = Math.max(1, unlockGuideCount(state.season) || 1);
    let next = unlockGuideGetRoadmapMilestones(env).find(row => row.loop > loop);
    if (!next) return null;
    let titles = next.features.map(unlockGuideCleanRoadmapFeature);
    return unlockGuideGuide({
        id: `loop-${next.loop}`,
        title: titles[0],
        description: env.deps._t('루프 {loop}: {titles}', { loop: next.loop, titles: titles.join(', ') }),
        requirements: [unlockGuideRequirement(env.deps._t('루프 {loop}', { loop: next.loop }), false, loop, next.loop)],
        actionLabel: state.unlocks && state.unlocks.season ? '루프 보기' : '',
        actionTabId: state.unlocks && state.unlocks.season ? 'tab-season' : ''
    });
}

export function unlockGuideEventUnlockGuide(env, state) {
    let loop = Math.max(1, unlockGuideCount(state.season) || 1);
    if (loop >= 4 && !state.gemEnhanceUnlocked) return unlockGuideGuide({
        id: 'gem-enhancement', title: env.deps._t('룬 강화'),
        description: env.deps._t('군주의 핵 또는 창공의 정수를 얻으면 스킬룬 강화가 열립니다.'),
        requirements: [unlockGuideRequirement('루프 4', true), unlockGuideRequirement('강화 재료 획득', false)],
        actionLabel: '스킬룬 보기', actionTabId: 'tab-skills', actionSubtabId: 'skill-tab-enhance'
    });
    let meteorUnlocked = !!(state.meteorSite && state.meteorSite.unlocked);
    if (loop >= 7 && !meteorUnlocked) return unlockGuideGuide({
        id: 'meteor-site', title: env.deps._t('운석 낙하 지점'),
        description: env.deps._t('루프 7에서 액트 7을 클리어하면 하늘 균열 게이지가 차기 시작합니다.'),
        requirements: [unlockGuideRequirement('루프 7', true), unlockGuideRequirement('액트 7 클리어', unlockGuideCount(state.maxZoneId) >= 7, unlockGuideCount(state.maxZoneId), 7)],
        actionLabel: '사냥터 보기', actionTabId: 'tab-map', actionSubtabId: 'map-explore-atlas', actionMapAct: 6
    });
    return null;
}

export function unlockGuideContentChoiceGuide(env, state) {
    const points = env.deps.contentProgression.points(state);
    if (points.complete) return null;
    const next = env.deps.contentProgression.cheapestOpen(state), ready = points.balance > 0 && !!next && next.cost <= points.balance;
    // 글은 목표 창의 문체를 따른다(js/goal-system.js 규칙 머리말).
    return unlockGuideGuide({
        id: 'content-choice', title: ready ? '해금 선택' : '다음 해금',
        description: ready ? env.deps._t('해금 포인트 {balance}점 사용', { balance: points.balance }) : unlockGuideContentWaitText(env, points, next),
        requirements: [unlockGuideRequirement('해금 포인트', ready, points.balance, next ? Math.max(1, next.cost) : 1)],
        actionLabel: state.season >= 2 ? '해금 열기' : '장비 열기', actionTabId: state.season >= 2 ? 'tab-unlocks' : 'tab-items'
    });
}

export function unlockGuideContentWaitText(env, points, next) {
    const award = points.nextAward > 0 ? env.deps._t('다음 루프에 도달하여 해금 포인트 {nextAward}점 획득', { nextAward: points.nextAward }) : '';
    if (points.balance <= 0) return award;
    const need = next ? env.deps._t('다음 해금에 {cost}점 필요', { cost: next.cost }) : '지금 고를 해금 없음';
    return [need, award || '남은 해금은 조건 달성 후 열림'].join(', ');
}
