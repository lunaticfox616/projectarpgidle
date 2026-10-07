// 기억 던전(12번 루프 21, 2026-10-08, docs/loop-content-12-plan-20261008.md): 루프 21부터 아틀라스의 보스(지도 보스, 지역 수호자,
// 세계수의 그림자, 최종 보스, 리그 우두머리)가 쓰러질 때 드물게 '그 보스의 기억'을 남긴다(사용자: 해당 보스, 콘텐츠별 보스 도전권으로
// 새로운 어려운 도전과 보상). 기억은 1~5단계, 쓰면 그 보스만 있는 투기장이 열리고(지도 장치 런 그대로, 포털과 정산), 단계가 오를수록
// 보스가 세지고 보상이 커진다. 이기면 다음 단계의 기억이 나올 수 있다. 규칙은 js/memory-dungeon.js, 화면은 js/memory-dungeon-ui.js.
const MEMORY_DUNGEON = Object.freeze({
    minLoop: 21,
    tiers: 5,
    // 보관: 보스 하나의 한 단계에 이만큼까지(루프를 넘어 남고 시대 재생에도 남는다).
    ticketCap: 9,
    // 기억이 떨어질 확률(아틀라스 노드 종류별, 기억 싸움이 아닌 처치에서): 1단계 하나.
    ticketDrop: Object.freeze({ map: 0.03, guardian: 0.12, pinnacle: 0.4, apex: 0.25, league: 0.2 }),
    // 이긴 단계 T의 다음 단계(T + 1) 기억이 나올 확률. 5단계는 다음이 없다.
    ladder: Object.freeze([0.5, 0.4, 0.3, 0.2]),
    // 싸움: 지도 등급 = 그 노드의 등급 + tierStep × 단계(아틀라스 등급 상한까지). 보스 생명력과 피해 배수는 단계별.
    // 특수기는 단계와 상관없이 기존 양식의 상한(1.55)을 넘지 않는다: 지도 보스와 수호자는 '되감긴 기억'(data/atlas-endgame.js memory).
    fight: Object.freeze({
        tierStep: 2,
        hpMul: Object.freeze([1.5, 2, 2.6, 3.3, 4.2]),
        damageMul: Object.freeze([1.1, 1.18, 1.27, 1.37, 1.5]),
        mechanic: 'memory',
        tint: 260
    }),
    // 보상: [재화, 기본, 단계당] 기대값(소수는 그만큼의 확률로 하나 더). 타오른 잿불가지(루프 30)는 3단계부터. 재화는 싸움의 지도 등급만큼
    // 더 준다: × 등급 / rewardTier(0.5 ~ 2배), 낮은 노드의 기억이 높은 노드의 기억과 같은 값을 주지 않게.
    rewardTier: 12,
    rewardScale: Object.freeze({ min: 0.5, max: 2 }),
    rewards: Object.freeze([['formlessDew', 2, 2], ['sapBud', 0.5, 0.5], ['goldenRule', 0, 0.2], ['emberBranch', 0, 1]].map(Object.freeze)),
    burning: Object.freeze([0, 0, 0.5, 1, 1.5]),
    // 고유 장비: 자기 고유가 있는 보스(최종 보스, 리그 우두머리)는 그 고유, 나머지는 그 지도 등급의 아무 고유. 단계별 확률.
    uniqueChance: Object.freeze({ own: Object.freeze([0.2, 0.3, 0.4, 0.55, 0.75]), other: Object.freeze([0.08, 0.12, 0.18, 0.25, 0.35]) }),
    // 2단계부터 투기장의 희귀 장비 하나를 더 준다(루프 27부터는 그 지역의 세계수 기운 장비).
    gearFrom: 2
});

if (typeof safeExposeData === 'function') safeExposeData({ MEMORY_DUNGEON });
