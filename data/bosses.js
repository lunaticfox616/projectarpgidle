function safeExposeData(map) {
  Object.keys(map || {}).forEach(function (key) {
    if (typeof window[key] === "undefined") window[key] = map[key];
  });
}

// Phase-1 extracted data block.
const ACT_BOSS_NAMES = Object.fromEntries(STORY_ACTS.map((act, idx) => [idx, act.bossName]));


const ACT_BOSS_ASSET_KEYS = [
    'bossAct1', 'bossAct2', 'bossAct3', 'bossAct4_1', 'bossAct5',
    'bossAct6', 'bossAct7', 'bossAct8_1', 'bossAct9', 'bossAct10_1'
];

const BOSS_ASSET_MANIFEST = {
    bossAct1: 'assets/boss/Act1.png',
    bossAct2: 'assets/boss/Act2.png',
    bossAct3: 'assets/boss/Act3.png',
    bossAct4_1: 'assets/boss/Act4-1.png',
    bossAct4_2: 'assets/boss/Act4-2.png',
    bossAct5: 'assets/boss/Act5.png',
    bossAct6: 'assets/boss/Act6.png',
    bossAct7: 'assets/boss/Act7.png',
    bossAct8_1: 'assets/boss/Act8-1.png',
    bossAct8_2: 'assets/boss/Act8-2.png',
    bossAct8_3: 'assets/boss/Act8-3.png',
    bossAct9: 'assets/boss/Act9.png',
    bossAct10_1: 'assets/boss/Act10(1).png',
    bossAct10_2: 'assets/boss/Act10(2).png',
    bossAct10_3: 'assets/boss/Act10(3).png',
    bossAct10_4: 'assets/boss/Act10(4).png',
    bossAct10_5: 'assets/boss/Act10(5).png'
};

const BOSS_ASSET_VARIANTS_BY_ACT = {
    4: ['bossAct4_1', 'bossAct4_2'],
    8: ['bossAct8_1', 'bossAct8_2', 'bossAct8_3'],
    10: ['bossAct10_1', 'bossAct10_2', 'bossAct10_3', 'bossAct10_4', 'bossAct10_5']
};

function getBossAssetKeyForZone(zone, variantSeed) {
    if (!zone || (zone.type && zone.type !== 'act') || !Number.isInteger(Number(zone.id))) return null;
    const actNumber = Number(zone.id) + 1;
    const variants = BOSS_ASSET_VARIANTS_BY_ACT[actNumber];
    if (variants && variants.length > 0) {
        const index = Math.abs(Math.floor(Number(variantSeed) || 0)) % variants.length;
        return variants[index];
    }
    return ACT_BOSS_ASSET_KEYS[actNumber - 1] || null;
}

const ENEMY_TRAIT_POOL = [
    { id: 'rapid', name: '광폭 연타', atkMul: 1.35 },
    { id: 'fortified', name: '강철 피부', hpMul: 1.35, dr: 8 },
    { id: 'bulwark', name: '수문장 비늘', firstHitGuard: 0.75 },
    { id: 'duelist', name: '반격 태세', hitRateGuard: 0.12 },
    { id: 'leechResist', name: '흡혈저항', leechEffMul: 0.45, expMul: 1.06, dropMul: 1.04 },
    { id: 'bloodless', name: '무혈', leechEffMul: 0, expMul: 1.10, dropMul: 1.08 },
    { id: 'swiftHands', name: '고속 공세', attackSpeedVarMul: 1.18, expMul: 1.05, dropMul: 1.03 },
    { id: 'veryFast', name: '매우 빠름', attackSpeedVarMul: 1.26, expMul: 1.08, dropMul: 1.06 },
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

safeExposeData({ ACT_BOSS_NAMES, ACT_BOSS_ASSET_KEYS, BOSS_ASSET_MANIFEST, BOSS_ASSET_VARIANTS_BY_ACT, getBossAssetKeyForZone, ENEMY_TRAIT_POOL });
