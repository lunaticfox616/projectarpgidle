if (typeof safeExposeData !== 'function') throw new Error('data/constants.js must load before data/severed-wanderers.js');

const SEVERED_WANDERER_CONFIG = Object.freeze({
    unlockLoop: 31,
    eliteReplacementChance: 0.04,
    hpMultiplier: 1.72,
    maxHpMultiplier: 1.9,
    minDamageMultiplier: 1.15,
    maxDamageMultiplier: 1.42,
    minAttackSpeedMultiplier: 0.9,
    maxAttackSpeedMultiplier: 1.3,
    maxEnergyShieldRatio: 0.28,
    resistanceCap: 78,
    expMultiplier: 1.8,
    dropMultiplier: 1.7,
    names: Object.freeze([
        '잿빛 카엘', '서리발 미라', '폭풍눈 라잔', '독심장 세라',
        '검은 방패 오르드', '핏빛 궤적 벨', '공허걸음 니아', '무너진 현자 에단'
    ]),
    titles: Object.freeze([
        '끊어진 선봉대', '길 잃은 사냥꾼', '금단의 술사', '몰락한 수호자'
    ]),
    skillPool: Object.freeze([
        '연속 베기', '묵직한 강타', '흡혈 타격', '회오리바람', '번개 타격',
        '얼음 창', '독창 투척', '번개 창', '관통 사격', '공허 베기',
        '서리 파동', '뇌운 낙뢰', '독니 사출', '연발 사격', '폭열 창탄',
        '암흑 파열', '화염 폭풍핵', '빙결 파열창', '천뢰 분기', '삼원 파동',
        '방패 투척', '룬 지뢰', '원소 포션 투척', '그림자 점멸'
    ]),
    equipmentSlots: Object.freeze(['무기', '투구', '갑옷', '장갑', '신발'])
});

safeExposeData({ SEVERED_WANDERER_CONFIG });
