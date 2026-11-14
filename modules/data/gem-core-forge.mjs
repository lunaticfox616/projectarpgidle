// 룬 강화(2026-11-02 사용자): 창공의 정수로 20강까지, 군주의 핵은 성공 확률을 올린다. 10강부터 룬이 파괴될 수 있고, 10강 위로는 피해 증폭이 함께 붙는다.
// 확률은 퍼센트, 표의 번호는 지금 단계다(0번이 +0에서 +1로 가는 시도). 실패 보정은 룬마다 따로 쌓인다.
const GEM_CORE_FORGE = Object.freeze({
    maxLevel: 20,
    materialKey: 'skyEssence',
    boosterKey: 'bossCore',
    costs: Object.freeze([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 10]),
    // 2026-11-03 사용자: +5, +10, +15 뒤로 낮췄다(전: 55~35, 35~25, 22~11).
    successPct: Object.freeze([100, 90, 80, 70, 60, 50, 45, 40, 36, 32, 30, 27, 24, 22, 20, 17, 15, 13, 11, 9]),
    // 룬이 파괴될 확률. 성공 확률이 오르면 남은 몫 안에서만 파괴된다.
    destroyPct: Object.freeze([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 3, 3, 4, 5, 6, 8, 10, 12]),
    // 실패 보정(2026-11-03 사용자: 기본 확률에 비례): 실패할 때마다 그 단계 기본 확률의 pityStepOfBase만큼 오르고, 기본 확률의
    // pityMaxOfBase만큼에서 멈춘다(전: 정해진 표로 최대 +90%p, 같은 날 최대 +20%p). Measured with no 군주의 핵: about 36 창공의 정수
    // to +10 (was 31), 151 to +15 (111), 2000 to +20 (710), about 13 breaks to +20.
    pityStepOfBase: 0.1,
    pityMaxOfBase: 1,
    riskFromLevel: 10,
    // 강화 효과(2026-11-03 사용자, 전: 단계마다 속도 +2% 증폭, +10 위로 단계마다 피해 +4% 증폭, 5단계마다 룬 레벨):
    // 증가는 다른 증가 %와 합하고(js/skills.js applyRuneForgeToSkill → getPlayerStats, 소환 룬은 소환수의 피해와 공격 속도 증가),
    // 증폭은 따로 곱한다. 낮은 단계는 조금, 높은 단계로 갈수록 많이 오른다(같은 날 사용자, +20의 합은 그대로).
    // 피해 증가는 단계(번호)까지의 합 %이고, 나머지는 [단계, 그 단계까지의 합 %]: 그 단계에 닿으면 그 합이 된다.
    damageIncPct: Object.freeze([0, 1, 3, 5, 8, 11, 14, 18, 22, 26, 31, 36, 41, 47, 53, 60, 67, 75, 83, 91, 100]),
    speedIncAt: Object.freeze([[3, 1], [6, 3], [9, 5], [12, 8], [15, 12], [18, 18]].map(Object.freeze)),   // 공격/시전 속도 증가
    damageMoreAt: Object.freeze([[5, 2], [10, 6], [15, 12], [20, 20]].map(Object.freeze)),                // 피해 증폭
    speedMoreAt: Object.freeze([[20, 10]].map(Object.freeze)),                                           // 공격/시전 속도 증폭
    runeLevelAt: Object.freeze([8, 15, 20]),   // 이 단계마다 룬 레벨 +1
    boosterPct: 2,          // 군주의 핵 하나당 성공 확률 %p
    boosterMax: 10,         // 한 번에 쓰는 군주의 핵
    // 담금질: 낮은 단계에서 높은 단계로 갈수록 칸이 좁고 표시가 빠르다. 맞히면 성공 확률에 mul을 곱한다.
    timing: Object.freeze({ mul: 1.05, zonePct: Object.freeze([24, 10]), periodMs: Object.freeze([1300, 620]) }),
    // 빛과 연출이 강해지는 단계와 그 색. 3번째 단계부터 주인공 몸에도 빛이 돈다.
    tiers: Object.freeze([5, 10, 15, 20]),
    tierColours: Object.freeze(['#e4ba79', '#8cd8ef', '#c7a0ff', '#ff9a55', '#ffe9a8'])
});
export { GEM_CORE_FORGE };
