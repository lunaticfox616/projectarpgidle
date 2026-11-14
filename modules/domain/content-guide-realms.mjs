import { unlockGuideCount, unlockGuideGuide, unlockGuideRequirement, unlockGuideTabUnlocked, unlockGuideHighestChaosDepth } from './content-guide-common.mjs';

export function unlockGuideChaosRealmGuide(env, state) {
    let loop = Math.max(1, unlockGuideCount(state.season) || 1);
    if (loop < 10 || (state.chaosRealm && state.chaosRealm.unlocked)) return null;
    let woodsmanPct = Math.min(100, unlockGuideCount(state.chaosRealm && state.chaosRealm.woodsmanBestDamagePct));
    let loopReady = typeof env.deps.hasCurrentLoopAbyssRequirementClear === 'function'
        ? env.deps.hasCurrentLoopAbyssRequirementClear(loop) : false;
    return unlockGuideGuide({
        id: 'chaos-realm', title: env.deps._t('혼돈계'),
        description: env.deps._t('현재 루프 조건을 달성한 뒤 혼돈 밖 나무꾼에게 최대 생명력의 10% 이상 피해를 주세요.'),
        requirements: [
            unlockGuideRequirement('루프 10', true),
            unlockGuideRequirement('이번 루프 혼돈 조건', loopReady),
            unlockGuideRequirement('나무꾼 피해', woodsmanPct >= 10, Math.min(10, woodsmanPct), 10)
        ],
        actionLabel: loopReady ? '혼돈 밖 보기' : '혼돈 보기',
        actionTabId: loopReady ? 'tab-season' : 'tab-map',
        actionSubtabId: loopReady ? '' : 'map-explore-chaos'
    });
}

export function unlockGuideSkyTowerGuide(env, state) {
    let loop = Math.max(1, unlockGuideCount(state.season) || 1);
    if (loop < 15 || (state.skyTower && state.skyTower.unlocked)) return null;
    let chaos20 = typeof env.deps.hasCurrentLoopChaos20Clear === 'function' ? env.deps.hasCurrentLoopChaos20Clear(state) : false;
    return unlockGuideGuide({
        id: 'sky-tower', title: env.deps._t('창공의 탑'),
        description: env.deps._t('루프 15에서 혼돈 20층을 클리어하면 영구 해금됩니다.'),
        requirements: [unlockGuideRequirement('루프 15', true), unlockGuideRequirement('이번 루프 혼돈 20층', chaos20)],
        actionLabel: '혼돈 보기', actionTabId: 'tab-map', actionSubtabId: 'map-explore-chaos'
    });
}

export function unlockGuideUnderworldGuide(env, state) {
    if (unlockGuideTabUnlocked(env, state, 'map-tab-underworld')) return null;
    let roots = new Set(Array.isArray(state.clearedRootBosses) ? state.clearedRootBosses : []);
    let deep = unlockGuideHighestChaosDepth(env, state);
    let labyrinth = Math.max(1, unlockGuideCount(state.labyrinthUnlockedMaxFloor || state.labyrinthFloor) || 1);
    let requirements = [
        unlockGuideRequirement('혼돈계 발견', !!(state.chaosRealm && state.chaosRealm.unlocked)),
        unlockGuideRequirement('케르베로스 처치', roots.has('s6_beast_cerberus')),
        unlockGuideRequirement('혼돈 심화 30층', deep >= 30, Math.min(deep, 30), 30),
        unlockGuideRequirement('고대 미궁 100층', labyrinth >= 100, Math.min(labyrinth, 100), 100)
    ];
    let nextSubtab = !roots.has('s6_beast_cerberus') ? 'map-explore-root-boss'
        : deep < 30 ? 'map-explore-chaos' : 'map-explore-labyrinth';
    return unlockGuideGuide({
        id: 'underworld', title: env.deps._t('지하계'),
        description: env.deps._t('네 갈래의 엔드게임 기록을 모으면 지하계가 영구적으로 나타납니다.'),
        requirements, actionLabel: '다음 조건 보기', actionTabId: 'tab-map', actionSubtabId: nextSubtab
    });
}

export function unlockGuideCoreGuide(env, state) {
    let loop = Math.max(1, unlockGuideCount(state.season) || 1);
    let highest = Math.max(1, unlockGuideCount(state.underworldProgress && state.underworldProgress.highestFloor) || 1);
    if (loop >= 20 && highest >= 11) return null;
    return unlockGuideGuide({
        id: 'core', title: env.deps._t('코어'),
        description: env.deps._t('루프 20 이후 지하계 10층을 넘기면 지하계 적에게서 코어가 떨어집니다. 장비창 왼쪽 위 코어 칸에 낍니다.'),
        requirements: [unlockGuideRequirement('루프 20', loop >= 20, Math.min(loop, 20), 20), unlockGuideRequirement('지하계 10층', highest >= 11, Math.min(highest - 1, 10), 10)],
        actionLabel: '지하계 보기', actionTabId: 'tab-map', actionSubtabId: 'map-tab-underworld'
    });
}

export function unlockGuideCosmosGuide(env, state) {
    if (unlockGuideTabUnlocked(env, state, 'map-tab-cosmos')) return null;
    let journal = new Set(Array.isArray(state.journalEntries) ? state.journalEntries : []);
    let highest = Math.max(1, unlockGuideCount(state.underworldProgress && state.underworldProgress.highestFloor) || 1);
    return unlockGuideGuide({
        id: 'cosmos', title: env.deps._t('우주계'),
        description: env.deps._t('나무꾼의 정체를 확인하고 지하계 30층에 도달하면 우주계가 영구적으로 나타납니다.'),
        requirements: [unlockGuideRequirement('나무꾼 처치 기록', journal.has('woodsman')), unlockGuideRequirement('지하계 30층', highest >= 30, Math.min(highest, 30), 30)],
        actionLabel: highest < 30 ? '지하계 보기' : '지도 보기', actionTabId: 'tab-map', actionSubtabId: highest < 30 ? 'map-tab-underworld' : 'map-tab-zones'
    });
}

export function unlockGuideAstraGuide(env, state) {
    let roots = new Set(Array.isArray(state.clearedRootBosses) ? state.clearedRootBosses : []);
    if (roots.has('cosmos_astra')) return null;
    let loop = Math.max(1, unlockGuideCount(state.season) || 1);
    let zone = env.deps.SEASON_BOSS_ZONES.find(row => row.id === 'cosmos_astra');
    let gate = zone ? env.deps.getSeasonBossProgressGate(zone, state) : { met: false, current: 0, target: 5 };
    let keys = unlockGuideCount(state.currencies && state.currencies.cosmosSovereignKey);
    let ready = loop >= 31 && gate.met && keys > 0;
    return unlockGuideGuide({
        id: 'astra', title: env.deps._t('잔향체 아스트라'),
        description: env.deps._t('다섯 은하 보스를 이번 루프에 격파하고 표식: 잔향을 준비하세요.'),
        requirements: [unlockGuideRequirement('루프 31', loop >= 31, Math.min(loop, 31), 31), unlockGuideRequirement('은하 보스', gate.met, gate.current, gate.target), unlockGuideRequirement('표식: 잔향', keys > 0, Math.min(keys, 1), 1)],
        actionLabel: ready ? '아스트라 도전' : '우주계 보기', actionTabId: 'tab-map', actionSubtabId: ready ? 'map-explore-root-boss' : 'map-tab-cosmos'
    });
}

export function unlockGuideGetPinnacleSubtab(zone) {
    if (zone.pinnacleTrack === 'underworld') return 'map-tab-underworld';
    if (zone.pinnacleTrack === 'ocean') return 'map-tab-ocean';
    if (zone.pinnacleTrack === 'sky') return 'map-tab-sky';
    return 'map-explore-root-boss';
}

export function unlockGuideGetPinnacleRequirementLabel(zone) {
    if (zone.pinnacleTrack === 'underworld') return '지하계 층수';
    if (zone.pinnacleTrack === 'ocean') return '심해 깊이';
    if (zone.pinnacleTrack === 'sky') return '창공의 탑 층수';
    return '수호자 격파';
}

export function unlockGuidePinnacleGuide(env, state) {
    let roots = new Set(Array.isArray(state.clearedRootBosses) ? state.clearedRootBosses : []);
    let zones = env.deps.SEASON_BOSS_ZONES.filter(zone => zone.milestonePinnacle);
    let next = zones.find(zone => !roots.has(zone.id));
    if (!next) return null;
    let gate = env.deps.getSeasonBossProgressGate(next, state);
    let isObserver = !!next.pinnacleCapstone;
    return unlockGuideGuide({
        id: next.id, title: next.name,
        description: isObserver ? '지하/심해/창공/우주의 네 수호자를 격파하면 최종 관문, 베일라에게 도전할 수 있습니다.'
            : '경계의 수호자입니다. 대응하는 무한 콘텐츠 기록을 완성하세요.',
        requirements: [unlockGuideRequirement(unlockGuideGetPinnacleRequirementLabel(next), gate.met, gate.current, gate.target)],
        actionLabel: gate.met ? '보스 도전' : '진행 화면 보기', actionTabId: 'tab-map', actionSubtabId: gate.met ? 'map-explore-root-boss' : unlockGuideGetPinnacleSubtab(next)
    });
}
