// 룬 강화(2026-11-02 사용자): 창공의 정수로 20강까지, 군주의 핵은 성공 확률을 올린다. 10강부터 룬이 파괴될 수 있고, 10강 위로는 피해 증폭이 함께 붙는다.
// 확률은 퍼센트, 표의 번호는 지금 단계다(0번이 +0에서 +1로 가는 시도). 실패 보정은 룬마다 따로 쌓인다.
const GEM_CORE_FORGE = Object.freeze({
    maxLevel: 20,
    materialKey: 'skyEssence',
    boosterKey: 'bossCore',
    costs: Object.freeze([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 10]),
    successPct: Object.freeze([100, 90, 80, 70, 60, 55, 50, 45, 40, 35, 35, 32, 30, 27, 25, 22, 20, 17, 14, 11]),
    // 룬이 파괴될 확률. 성공 확률이 오르면 남은 몫 안에서만 파괴된다.
    destroyPct: Object.freeze([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 3, 3, 4, 5, 6, 8, 10, 12]),
    // Cumulative bonus: increments decrease through 10, 9.6, 9, 8.2, 7.2, 6, then stay at 5 points.
    pityBonusPct: Object.freeze([0, 10, 19.6, 28.6, 36.8, 44, 50, 55, 60, 65, 70, 75, 80, 85, 90]),
    riskFromLevel: 10,
    riskPityMul: 0.75,      // riskFromLevel부터 실패 보정에 곱한다
    speedStepPct: 2,        // 단계마다 공격/시전 속도
    damageStepPct: 4,       // riskFromLevel 위의 단계마다 피해(옛 군주의 핵 강화의 값)
    runeLevelEvery: 5,      // 이 단계마다 룬 레벨 +1
    boosterPct: 2,          // 군주의 핵 하나당 성공 확률 %p
    boosterMax: 10,         // 한 번에 쓰는 군주의 핵
    // 담금질: 낮은 단계에서 높은 단계로 갈수록 칸이 좁고 표시가 빠르다. 맞히면 성공 확률에 mul을 곱한다.
    timing: Object.freeze({ mul: 1.05, zonePct: Object.freeze([24, 10]), periodMs: Object.freeze([1300, 620]) }),
    // 빛과 연출이 강해지는 단계와 그 색. 3번째 단계부터 주인공 몸에도 빛이 돈다.
    tiers: Object.freeze([5, 10, 15, 20]),
    tierColours: Object.freeze(['#e4ba79', '#8cd8ef', '#c7a0ff', '#ff9a55', '#ffe9a8'])
});
