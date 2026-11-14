export const SKILL_HIT_SEQUENCE_CONFIG = Object.freeze({
    whirlIntervalMs: 80,
    chainIntervalMs: 110,
    pierceIntervalMs: 30,
    // 관통하는 발이 맞은 자리에 잠깐 멈췄다 지나간다(2026-11-02 전달본 V3.8, 무게별). 맞는 때만 그만큼 늦는다.
    pierceHoldMs: Object.freeze({ longest: 54, plain: 46, '관통 사격': 40, '부싯돌 베기': 48, '빙결 파열창': 54 }),
    slamAftershockDelayMs: 360,
    slamAftershockDamagePct: 32
});
