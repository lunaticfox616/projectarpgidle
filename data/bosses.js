// Phase-1 extracted data block.
const ACT_BOSS_NAMES = Object.fromEntries(STORY_ACTS.map((act, idx) => [idx, act.bossName]));

const ENEMY_TRAIT_POOL = [
    { id: 'rapid', name: '광폭 연타', atkMul: 1.35 },
    { id: 'fortified', name: '강철 피부', hpMul: 1.35, dr: 8 },
    { id: 'bulwark', name: '수문장 비늘', firstHitGuard: 0.75 },
    { id: 'duelist', name: '반격 태세', hitRateGuard: 0.12 },
    { id: 'leechResist', name: '흡혈저항', leechEffMul: 0.45, expMul: 1.06, dropMul: 1.04 },
    { id: 'bloodless', name: '무혈', leechEffMul: 0, expMul: 1.10, dropMul: 1.08 },
    { id: 'swiftHands', name: '고속 공세', attackSpeedVarMul: 1.18, expMul: 1.05, dropMul: 1.03 },
    { id: 'strong', name: '강함', atkMul: 1.2, expMul: 1.07, dropMul: 1.05 },
    { id: 'veryStrong', name: '매우 강함', atkMul: 1.5, hpMul: 1.12, expMul: 1.12, dropMul: 1.08 },
    { id: 'deadly', name: '치명적', critChanceBonus: 18, expMul: 1.08, dropMul: 1.06 },
    { id: 'tenacious', name: '끈질김', hpMul: 1.45, expMul: 1.08, dropMul: 1.06 },
    { id: 'fireWard', name: '화염 장막', resF: 28 },
    { id: 'coldWard', name: '서리 장막', resC: 28 },
    { id: 'lightWard', name: '뇌전 장막', resL: 28 },
    { id: 'chaosWard', name: '심연 장막', resChaos: 22 },
    { id: 'physWard', name: '중갑 전개', dr: 14 }
];

Object.assign(window, { ACT_BOSS_NAMES, ENEMY_TRAIT_POOL });
