// 방치 정산이 인정하는 시간과 효율(2026-10-25 사용자: 영구 방치 성장을 해금에 통합). 단계는 해금 탭의 강화 시간 인식(offlineHours)과
// 전투 효율(offlineRate)을 몇 단계 가졌는지다(data/content-progression.js CONTENT_UNLOCK_SERIES, js/offline-progress.js). 전에는 시간의
// 잔재로 올렸고, 보관함과 방치 지시(사냥, 안전 귀환, 전리품)도 있었다(이날 없앴다).
const OFFLINE_PROGRESS_RECOGNITION_HOURS = Object.freeze([3, 6, 9, 12, 15, 18, 21, 24]);
// 효율: 2026-10-08 방치 효율 2에서 기본 30%, 끝 50%였다. 2026-10-25 사용자 "전투 효율 업그레이드의 성능을 더 줄여줘": 단계마다 +2%p,
// 끝 40%(예전 6단계는 5단계로 옮긴다).
const OFFLINE_PROGRESS_EFFICIENCY_RATES = Object.freeze([0.30, 0.32, 0.34, 0.36, 0.38, 0.40]);
// 강화 밖의 효율(강화 효율에 더한다): 시대 특전 고요한 시대(data/atlas.js epoch.perks), 무기 숙련 합계(data/weapon-mastery.js),
// 세계수 연대기 고리(data/chronicle.js). 합은 cap까지(24시간 × 75% = 18시간 정산: 휴대폰 속도 측정은 docs/offline-performance.md).
const OFFLINE_PROGRESS_EFFICIENCY_CAP = 0.75;
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
