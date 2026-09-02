if (typeof safeExposeData !== 'function') throw new Error('data/constants.js must load before data/bosses.js');

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
    { id: 'rapid', name: '광폭 연타', outlineColor: '#ef6a45', atkMul: 1.35 },
    { id: 'fortified', name: '강철 피부', outlineColor: '#86a8c4', hpMul: 1.35, dr: 8 },
    { id: 'bulwark', name: '수문장 비늘', outlineColor: '#5fa6bb', firstHitGuard: 0.75 },
    { id: 'duelist', name: '반격 태세', outlineColor: '#d8aa55', hitRateGuard: 0.12 },
    { id: 'leechResist', name: '흡혈저항', outlineColor: '#b98aab', leechEffMul: 0.45, expMul: 1.06, dropMul: 1.04 },
    { id: 'bloodless', name: '무혈', outlineColor: '#d9d4cc', leechEffMul: 0, expMul: 1.10, dropMul: 1.08 },
    { id: 'swiftHands', name: '고속 공세', outlineColor: '#eadb72', attackSpeedVarMul: 1.18, expMul: 1.05, dropMul: 1.03 },
    { id: 'veryFast', name: '매우 빠름', outlineColor: '#82d8de', attackSpeedVarMul: 1.26, expMul: 1.08, dropMul: 1.06 },
    { id: 'strong', name: '강함', outlineColor: '#d97845', atkMul: 1.2, expMul: 1.07, dropMul: 1.05 },
    { id: 'veryStrong', name: '매우 강함', outlineColor: '#f14f43', atkMul: 1.5, hpMul: 1.12, expMul: 1.12, dropMul: 1.08 },
    { id: 'deadly', name: '치명적', outlineColor: '#d13d77', critChanceBonus: 18, expMul: 1.08, dropMul: 1.06 },
    { id: 'tenacious', name: '끈질김', outlineColor: '#85b96b', hpMul: 1.45, expMul: 1.08, dropMul: 1.06 },
    { id: 'fireWard', name: '화염 장막', outlineColor: '#f06436', resF: 28 },
    { id: 'coldWard', name: '서리 장막', outlineColor: '#6ac6ee', resC: 28 },
    { id: 'lightWard', name: '뇌전 장막', outlineColor: '#f2d95b', resL: 28 },
    { id: 'chaosWard', name: '심연 장막', outlineColor: '#9b65dc', resChaos: 22 },
    { id: 'physWard', name: '중갑 전개', outlineColor: '#9aa1aa', dr: 14 },
    { id: 'pressureCrush', name: '수압 압살', outlineColor: '#4a8fc7', oceanPressureGainMul: 1.6 },
    { id: 'oxygenLeech', name: '산소 갈취', outlineColor: '#57c7ac', oceanOxygenLeechOnHit: 4 },
    { id: 'accuracyWard', name: '탁한 물막', outlineColor: '#738d9d', hitRateGuard: 0.18 },
    { id: 'currentSwift', name: '급류 가속', outlineColor: '#46b7cf', atkMul: 1.2, attackSpeedVarMul: 1.16 }
];

const MONSTER_VARIANT_DEFS = Object.freeze([
    ['woodSlime-0', '갈색 수액방울'], ['woodSlime-1', '늘어진 수액방울'],
    ['woodSlime-2', '잔가지 수액괴'], ['woodSlime-3', '껍질 수액괴'],
    ['woodSlime-4', '포자 수액괴'], ['woodSlime-5', '유충 수액괴'],
    ['woodSlime-6', '가시 수액괴'], ['woodSlime-7', '왕관 수액괴'],
    ['woodSlime-8', '꽃가루 수액괴'], ['woodSlime-9', '톱니 수액괴'],
    ['woodSlime-10', '암석 수액괴'], ['woodSlime-11', '뿌리가시 수액괴'],
    ...Array.from({ length: 8 }, (_, index) => [`rootSpider-${index}`, '뿌리거미']),
    ['sapLeech-0', '그을린 뿌리관'], ['sapLeech-1', '가지 뿌리관'],
    ['sapLeech-2', '이끼 뿌리관'], ['sapLeech-3', '쌍둥이 뿌리관'],
    ['sapLeech-4', '뒤틀린 뿌리매듭'], ['sapLeech-5', '잿불 뿌리매듭'],
    ['sapLeech-6', '껍질 뿌리매듭'], ['sapLeech-7', '속빈 뿌리매듭'],
    ['sapLeech-8', '늪지 뿌리매듭'], ['sapLeech-9', '육종 뿌리매듭'],
    ['sapLeech-10', '가시눈 뿌리령'], ['sapLeech-11', '벌집 뿌리령'],
    ['sapLeech-12', '잠복 뿌리령'], ['sapLeech-13', '뿌리갑충'],
    ['woodPuppet-0', '껍질 목각병'], ['woodPuppet-1', '백목 목각병'],
    ['woodPuppet-2', '이끼 목각병'], ['woodPuppet-3', '철목 목각병']
].map(([id, name]) => Object.freeze({ id, name })));

function getMonsterVariantDefinition(variantSeed, element) {
    const elementOffset = element === 'fire' ? 1 : (element === 'cold' ? 2 : (element === 'light' ? 3 : (element === 'chaos' ? 4 : 0)));
    const index = (Math.abs(Math.floor(Number(variantSeed) || 0)) + elementOffset) % MONSTER_VARIANT_DEFS.length;
    return MONSTER_VARIANT_DEFS[index];
}

safeExposeData({
    ACT_BOSS_NAMES, ACT_BOSS_ASSET_KEYS, BOSS_ASSET_MANIFEST, BOSS_ASSET_VARIANTS_BY_ACT,
    getBossAssetKeyForZone, ENEMY_TRAIT_POOL, MONSTER_VARIANT_DEFS, getMonsterVariantDefinition
});
