const OFFLINE_PROGRESS_VERSION = 1;
const OFFLINE_PROGRESS_CURRENCY_KEY = 'timeRemnant';
const OFFLINE_PROGRESS_MAX_LIFETIME_GRANT = 281;
const OFFLINE_PROGRESS_RECOGNITION_LEVELS = Object.freeze([
    { hours: 3, cost: 0 }, { hours: 6, cost: 1 }, { hours: 9, cost: 2 },
    { hours: 12, cost: 3 }, { hours: 15, cost: 8 }, { hours: 18, cost: 15 },
    { hours: 21, cost: 25 }, { hours: 24, cost: 40 }
]);
// 방치 효율 2(2026-10-08): 빠른 계산이 루프 초반 액트도 맡게 되어(docs/offline-performance.md) 기본 10%에서 30%로, 잔재 강화 끝은
// 50%로 올렸다. 비용은 그대로다.
const OFFLINE_PROGRESS_EFFICIENCY_LEVELS = Object.freeze([
    { rate: 0.30, cost: 0 }, { rate: 0.33, cost: 2 }, { rate: 0.36, cost: 4 },
    { rate: 0.40, cost: 7 }, { rate: 0.43, cost: 12 }, { rate: 0.46, cost: 20 },
    { rate: 0.50, cost: 32 }
]);
// 잔재 밖의 효율(잔재 효율에 더한다): 시대 특전 고요한 시대(data/atlas.js epoch.perks), 무기 숙련 합계(data/weapon-mastery.js),
// 세계수 연대기 고리(data/chronicle.js). 합은 cap까지(24시간 × 75% = 18시간 정산: 휴대폰 속도 측정은 docs/offline-performance.md).
const OFFLINE_PROGRESS_EFFICIENCY_CAP = 0.75;
const OFFLINE_PROGRESS_STASH_LEVELS = Object.freeze([
    { slots: 0, cost: 0 }, { slots: 8, cost: 3 }, { slots: 16, cost: 6 },
    { slots: 32, cost: 12 }, { slots: 48, cost: 20 }, { slots: 72, cost: 32 }
]);
const OFFLINE_PROGRESS_DIRECTIVE_COSTS = Object.freeze({ hunt: 10, safety: 12, loot: 15 });
// 방치 정산 가속(2026-10-07, js/combat-replay-projection.js): 실제 전투로 지도 한 바퀴(조우 시작부터 다음 조우 시작까지)를 재고
// 나머지는 바퀴째 투영한다. minRealMs 첫 투영 전 실제 전투, minCycles와 minMeasuredMs 투영에 필요한 같은 지역의 온전한 바퀴
// 수와 그 시간 합(한 바퀴만 재면 3분 반짜리 바퀴에서 우연히 안 죽어 사망률 0으로, 두 바퀴면 둘 다 보스 앞에서 죽어 보스를 한
// 번도 못 잡는 것으로 투영했다. 실제로는 그 빌드가 바퀴의 35%쯤 보스를 잡는다), remeasureEveryMs 투영하는 동안
// 실제 바퀴를 하나 더 재는 간격(평균을 고치고 강해진 빌드를 따라간다), realBudgetMs 실제 전투 상한(바퀴를 다 못 재면 남은 시간도
// 실제), objectSampleMin 봉인 보물함과 매복을 직접 잰 비율로 쓰는 최소 개수, timeScale 처치한 생명이 잰 평균과 다를 때 바퀴
// 시간을 늘리고 줄이는 범위, zoneTypes 투영하는 지역.
// 방치 효율 2(2026-10-08): 레벨이 오르면 실제 전투 realHoldMs까지 다시 잰다(빨리 크는 루프 초반: 10분에 재고 멈추면 3시간
// 정산 처치가 실제의 46%였다. 후반 영웅은 몇 시간에 한 번 올라 거의 쓰지 않는다). 투영을 못 탄 실제
// 전투가 realHoldMs를 넘으면 밀어붙이기를 멈추고 지금 지역을 반복해 투영이 재게 하고, realCapMs를 넘으면 남은 시간은 계산하지
// 않는다(휴대폰은 실제 전투 1분에 약 2초).
const OFFLINE_PROJECTION = Object.freeze({ minRealMs: 120000, minCycles: 3, minMeasuredMs: 180000, remeasureEveryMs: 1200000,
    realBudgetMs: 600000, realHoldMs: 1800000, realCapMs: 3600000, objectSampleMin: 6,
    timeScale: Object.freeze([0.5, 2]), zoneTypes: Object.freeze(['act', 'abyss', 'atlasMap']) });
const OFFLINE_PROGRESS_HUNT_MODES = Object.freeze(['push', 'current', 'highestCleared', 'stopBeforeBoss']);
const OFFLINE_PROGRESS_LOOT_MODES = Object.freeze(['rarity', 'itemLevel', 'baseTier']);
const OFFLINE_PROGRESS_SAFETY_DEATHS = Object.freeze([3, 5, 10]);
const OFFLINE_PROGRESS_SAFETY_NO_KILL_MINUTES = Object.freeze([5, 10, 20]);
const OFFLINE_PROGRESS_DEFAULT_STATE = Object.freeze({
    version: OFFLINE_PROGRESS_VERSION,
    recognitionLevel: 0,
    efficiencyLevel: 0,
    stashLevel: 0,
    huntDirectiveUnlocked: false,
    safeReturnUnlocked: false,
    lootDirectiveUnlocked: false,
    rewardedThroughLoop: 0,
    lifetimeGranted: 0,
    huntMode: 'push',
    safetyPolicy: { consecutiveDeaths: 5, noKillMinutes: 10, stopOnNegativeExp: false, stopWhenStorageFull: false },
    lootPolicy: { mode: 'rarity', preferredSlots: [], searchText: '' },
    stash: [],
    // 구버전 보호 대기열 저장을 읽기 위한 호환 필드다. 현재 규칙에서는 항상 비운다.
    protectedOverflow: []
});
