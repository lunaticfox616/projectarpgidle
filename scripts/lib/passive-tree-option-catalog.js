'use strict';

function line(statId, value, options = {}) {
    return Object.freeze({ statId, value, ...options });
}

function profile(name, ...lines) {
    return Object.freeze({ name, lines: Object.freeze(lines) });
}

const STAT_META = Object.freeze({
    strength: ['힘', ''], dexterity: ['민첩', ''], intelligence: ['지능', ''], accuracy: ['정확도', ''],
    flatHp: ['최대 생명력', ''], pctHp: ['최대 생명력', '%'], regen: ['초당 생명력 재생', '%'],
    flatDmg: ['기본 피해', ''], spellFlatDmg: ['주문 내장 피해', ''], pctDmg: ['피해', '%'], meleePctDmg: ['근접 피해', '%'],
    slamPctDmg: ['강타 피해', '%'], projectilePctDmg: ['투사체 피해', '%'], physPctDmg: ['물리 피해', '%'],
    elementalPctDmg: ['원소 피해', '%'], firePctDmg: ['화염 피해', '%'], coldPctDmg: ['냉기 피해', '%'],
    lightPctDmg: ['번개 피해', '%'], chaosPctDmg: ['카오스 피해', '%'], aoePctDmg: ['범위 피해', '%'],
    dotPctDmg: ['지속 피해 배율', '%'], spellPctDmg: ['주문 피해', '%'], shieldPctDmg: ['방패 스킬 피해', '%'],
    potionPctDmg: ['포션 스킬 피해', '%'], minePctDmg: ['지뢰 피해', '%'],
    mobilityPctDmg: ['기동 스킬 피해', '%'], channelingPctDmg: ['채널링 피해', '%'],
    ailmentDamagePct: ['상태이상 피해', '%'], ailmentPotencyPct: ['상태이상 위력', '%'],
    igniteChance: ['점화 확률', '%p'], chillChance: ['냉각 확률', '%p'], shockChance: ['감전 확률', '%p'],
    poisonChance: ['중독 확률', '%p'], bleedChance: ['출혈 확률', '%p'], freezeChance: ['동결 확률', '%p'],
    aspd: ['스킬 속도', '%'], leech: ['생명력 흡수', '%'],
    move: ['이동 속도', '%'], crit: ['치명타 확률', '%p'], critDmg: ['치명타 피해 배율', '%'],
    armor: ['방어도', ''], armorPct: ['방어도', '%'], evasion: ['회피', ''], evasionPct: ['회피', '%'],
    energyShield: ['에너지 보호막', ''], energyShieldPct: ['에너지 보호막', '%'], blockChance: ['막기 확률', '%p'],
    energyShieldRegen: ['에너지 보호막 회복 속도', '%'], energyShieldRechargeFaster: ['에너지 보호막 재충전 대기시간 감소', '초'],
    blockChanceMax: ['막기 확률 최대치', '%p'], maxResAll: ['모든 원소 최대 저항', '%'],
    maxResF: ['화염 저항 최대치', '%p'], maxResC: ['냉기 저항 최대치', '%p'],
    maxResL: ['번개 저항 최대치', '%p'], maxResChaos: ['카오스 저항 최대치', '%p'],
    deflectChance: ['비껴내기 확률', '%p'], dr: ['물리 피해 감소', '%p'], physIgnore: ['적 물리 피해 감소 무시', '%'],
    resPen: ['저항 관통', '%'], resF: ['화염 저항', '%'], resC: ['냉기 저항', '%'],
    resL: ['번개 저항', '%'], resAll: ['모든 원소 저항', '%'], resChaos: ['카오스 저항', '%'],
    accuracyBonusPct: ['정확도 보정', '%'], minDmgRoll: ['최소 피해 보정', '%'], maxDmgRoll: ['최대 피해 보정', '%'],
    doubleDamageChance: ['두 배 피해 확률', '%p'], slamEchoChance: ['강타 여진 발생 확률', '%p'],
    takenDamageReduceWhen1EnemyPct: ['주변 적이 1명일 때 받는 피해 감소', '%'],
    takenDamageReduceWhen2EnemiesPct: ['주변 적이 2명 이상일 때 받는 피해 감소', '%'],
    physTakenAsFire: ['받는 물리 피해를 화염 피해로 전환', '%'],
    physTakenAsCold: ['받는 물리 피해를 냉기 피해로 전환', '%'],
    physTakenAsLight: ['받는 물리 피해를 번개 피해로 전환', '%'],
    physTakenAsChaos: ['받는 물리 피해를 카오스 피해로 전환', '%'],
    addedFireDamagePct: ['총 피해만큼 추가 화염 피해', '%'], addedColdDamagePct: ['총 피해만큼 추가 냉기 피해', '%'],
    addedLightDamagePct: ['총 피해만큼 추가 번개 피해', '%'], addedChaosDamagePct: ['총 피해만큼 추가 카오스 피해', '%'],
    addedPhysDamagePct: ['총 피해만큼 추가 물리 피해', '%'], shockedEnemyHitDamageMorePct: ['감전된 적 명중 피해 증폭', '%'],
    shockedEnemyHitDamagePct: ['감전된 적에게 주는 명중 피해', '%'], chillEffect: ['냉각 효율', '%'],
    shockEffect: ['감전 효율', '%'], igniteDamageMultiplierPct: ['점화 효율', '%'], poisonDamageMultiplierPct: ['중독 피해', '%'],
    leechTotalCap: ['흡혈 총 회복량 최대치', '%p'], summonResPen: ['소환수 저항 관통', '%'],
    summonEfficiency: ['소환수 효율', '%'], summonGuardRedirectPct: ['방어형 소환수 피해 대리', '%'],
    gemLevel: ['모든 스킬 젬 레벨', ''], elementalGemLevel: ['원소 스킬 젬 레벨', ''],
    fireGemLevel: ['화염 스킬 젬 레벨', ''], coldGemLevel: ['냉기 스킬 젬 레벨', ''],
    lightGemLevel: ['번개 스킬 젬 레벨', ''], chaosGemLevel: ['카오스 스킬 젬 레벨', ''],
    physGemLevel: ['물리 스킬 젬 레벨', ''], projectileGemLevel: ['투사체 스킬 젬 레벨', ''],
    meleeGemLevel: ['근접 스킬 젬 레벨', ''], slamGemLevel: ['강타 스킬 젬 레벨', ''],
    spellGemLevel: ['주문 스킬 젬 레벨', ''], dotGemLevel: ['지속 스킬 젬 레벨', ''],
    aoeGemLevel: ['범위 스킬 젬 레벨', ''],
    suppCap: ['보조 스킬 젬 한도', ''], projectileExtraShots: ['추가 투사체', '개'],
    targetProjectile: ['투사체 스킬 타겟 수', ''],
    summonPctDmg: ['소환수 피해', '%'], summonAspd: ['소환수 공격 속도', '%'], summonHpPct: ['소환수 생명력', '%'],
    summonCrit: ['소환수 치명타 확률', '%p'], summonGemLevel: ['소환수 공격 스킬 젬 레벨', ''],
    mystique: ['신비', ''], devotion: ['헌신', ''], cycle: ['순환', '']
});

const FINE_STEP_STATS = new Set([
    'regen', 'leech', 'crit', 'blockChance', 'blockChanceMax', 'deflectChance', 'dr', 'physIgnore', 'resPen',
    'summonCrit', 'doubleDamageChance', 'energyShieldRechargeFaster'
]);
const HALF_STEP_STATS = new Set(['mystique', 'devotion', 'cycle']);

const PASSIVE_TYPE_MULTIPLIER = Object.freeze({ minor: 1, assist: 1.15, normal: 1.6, major: 2.4 });

function passiveValueStep(statId) {
    const suffix = STAT_META[statId]?.[1];
    if (FINE_STEP_STATS.has(statId)) return 0.1;
    if (HALF_STEP_STATS.has(statId)) return 0.5;
    if (suffix === '%' || suffix === '%p') return 1;
    return 1;
}

function normalizePassiveValue(statId, value) {
    const step = passiveValueStep(statId), rounded = Math.round(Number(value) / step) * step;
    return Number(rounded.toFixed(step === 0.1 ? 1 : 2));
}

function scalePassiveLine(line, type, powerBand) {
    const typeMultiplier = PASSIVE_TYPE_MULTIPLIER[type];
    if (!typeMultiplier) throw new Error(`지원하지 않는 패시브 종류: ${type}`);
    const band = Math.max(0, Math.min(4, Number(powerBand) || 0));
    const value = line.fixed ? line.value : line.value * typeMultiplier * (1 + band * 0.05);
    return { statId: line.statId, value: normalizePassiveValue(line.statId, value) };
}

function isReadablePassiveValue(statId, value) {
    const step = passiveValueStep(statId), scaled = Number(value) / step;
    return Number.isFinite(scaled) && Math.abs(scaled - Math.round(scaled)) < 1e-8;
}

function isAllAttributesEffects(effects) {
    if (!Array.isArray(effects) || effects.length !== 3) return false;
    if (new Set(effects.map(effect => Number(effect.value))).size !== 1) return false;
    return effects.map(effect => effect.statId).sort().join(',') === 'dexterity,intelligence,strength';
}

const ARCHETYPE_PROFILES = Object.freeze({
    strength: Object.freeze([
        profile('단단한 혈맥', line('strength', 6), line('flatHp', 15)),
        profile('무거운 완력', line('strength', 6), line('physPctDmg', 3)),
        profile('전열의 체력', line('pctHp', 2), line('armorPct', 4)),
        profile('불굴의 힘줄', line('strength', 5), line('regen', 0.2))
    ]),
    dexterity: Object.freeze([
        profile('민첩한 발놀림', line('dexterity', 6), line('move', 1.5)),
        profile('정교한 손놀림', line('dexterity', 6), line('accuracy', 40)),
        profile('바람의 반사', line('evasionPct', 4), line('aspd', 1.5)),
        profile('기민한 감각', line('dexterity', 5), line('crit', 0.8))
    ]),
    intelligence: Object.freeze([
        profile('축적된 지식', line('intelligence', 6), line('energyShield', 10)),
        profile('주문 해석', line('intelligence', 6), line('spellPctDmg', 4)),
        profile('비전 장막', line('energyShieldPct', 4), line('resAll', 2)),
        profile('정신의 가속', line('intelligence', 5), line('aspd', 1.5))
    ]),
    projectile: Object.freeze([
        profile('곧은 궤적', line('projectilePctDmg', 5), line('accuracy', 35)),
        profile('빠른 시위', line('projectilePctDmg', 4), line('aspd', 1.5)),
        profile('약점 조준', line('projectilePctDmg', 4), line('crit', 0.8)),
        profile('갈라지는 탄도', line('projectilePctDmg', 3), line('projectileExtraShots', 1, { majorOnly: true, fixed: true }))
    ]),
    melee: Object.freeze([
        profile('날 선 일격', line('meleePctDmg', 5), line('flatDmg', 2)),
        profile('연속 베기', line('meleePctDmg', 4), line('aspd', 1.5)),
        profile('파고드는 칼끝', line('meleePctDmg', 4), line('physIgnore', 1.5)),
        profile('급소 절개', line('meleePctDmg', 4), line('crit', 0.8))
    ]),
    slam: Object.freeze([
        profile('대지 충격', line('slamPctDmg', 6), line('aoePctDmg', 3)),
        profile('무거운 낙하', line('slamPctDmg', 5), line('flatDmg', 3)),
        profile('파쇄 여파', line('slamPctDmg', 5), line('physIgnore', 1.5)),
        profile('흔들리지 않는 자세', line('slamPctDmg', 4), line('armorPct', 4))
    ]),
    physical: Object.freeze([
        profile('철을 가르는 힘', line('physPctDmg', 5), line('physIgnore', 1)),
        profile('깊은 상처', line('physPctDmg', 4), line('bleedChance', 3)),
        profile('피의 궤적', line('dotPctDmg', 4), line('bleedChance', 3)),
        profile('무거운 타격', line('physPctDmg', 4), line('flatDmg', 2))
    ]),
    armor: Object.freeze([
        profile('강철 외피', line('armor', 14), line('armorPct', 4)),
        profile('전열 방벽', line('armorPct', 5), line('pctHp', 2)),
        profile('완강한 수비', line('blockChance', 1), line('armorPct', 4)),
        profile('충격 분산', line('armorPct', 4), line('dr', 1))
    ]),
    evasion: Object.freeze([
        profile('흐르는 몸놀림', line('evasion', 14), line('evasionPct', 4)),
        profile('흔적 없는 걸음', line('evasionPct', 4), line('move', 1.5)),
        profile('가속하는 몸놀림', line('mobilityPctDmg', 5), line('move', 1.5)),
        profile('비스듬한 회피', line('deflectChance', 2), line('evasionPct', 3)),
        profile('반격의 틈', line('evasionPct', 4), line('crit', 0.8))
    ]),
    energyShield: Object.freeze([
        profile('비전 방벽', line('energyShield', 12), line('energyShieldPct', 4)),
        profile('정신의 외피', line('energyShieldPct', 5), line('resAll', 2)),
        profile('응축된 보호막', line('energyShield', 16), line('intelligence', 3)),
        profile('차오르는 장막', line('energyShieldPct', 4), line('regen', 0.2))
    ]),
    spell: Object.freeze([
        profile('주문 직조', line('spellPctDmg', 5), line('aspd', 1.5)),
        profile('집중된 술식', line('spellPctDmg', 5), line('crit', 0.8)),
        profile('확장된 주문진', line('spellPctDmg', 4), line('aoePctDmg', 3)),
        profile('고등 마도', line('spellPctDmg', 4), line('gemLevel', 1, { majorOnly: true, fixed: true }))
    ]),
    chaos: Object.freeze([
        profile('심연의 침식', line('chaosPctDmg', 5), line('resPen', 1)),
        profile('독성 주입', line('chaosPctDmg', 4), line('poisonChance', 3)),
        profile('느린 부패', line('chaosPctDmg', 4), line('dotPctDmg', 4)),
        profile('공허의 장막', line('chaosPctDmg', 3), line('resChaos', 3))
    ]),
    elemental: Object.freeze([
        profile('삼원 조율', line('elementalPctDmg', 5), line('resPen', 1)),
        profile('불꽃 촉매', line('firePctDmg', 5), line('igniteChance', 3)),
        profile('서리 촉매', line('coldPctDmg', 5), line('chillChance', 3)),
        profile('전류 촉매', line('lightPctDmg', 5), line('shockChance', 3))
    ]),
    fire: Object.freeze([
        profile('타오르는 핵', line('firePctDmg', 5), line('igniteChance', 3)),
        profile('번지는 불씨', line('firePctDmg', 4), line('aoePctDmg', 3)),
        profile('잿불의 잔열', line('firePctDmg', 4), line('dotPctDmg', 4)),
        profile('화염 관통', line('firePctDmg', 4), line('resPen', 1))
    ]),
    cold: Object.freeze([
        profile('차가운 핵', line('coldPctDmg', 5), line('chillChance', 3)),
        profile('깨지는 서리', line('coldPctDmg', 4), line('crit', 0.8)),
        profile('빙결의 장막', line('coldPctDmg', 4), line('energyShieldPct', 3)),
        profile('냉기 관통', line('coldPctDmg', 4), line('resPen', 1))
    ]),
    lightning: Object.freeze([
        profile('전도성 핵', line('lightPctDmg', 5), line('shockChance', 3)),
        profile('연쇄 전류', line('lightPctDmg', 4), line('aspd', 1.5)),
        profile('폭발하는 뇌광', line('lightPctDmg', 4), line('crit', 0.8)),
        profile('번개 관통', line('lightPctDmg', 4), line('resPen', 1))
    ]),
    ailment: Object.freeze([
        profile('상처의 숙성', line('dotPctDmg', 5), line('bleedChance', 3)),
        profile('독의 숙성', line('dotPctDmg', 5), line('poisonChance', 3)),
        profile('원소 병증', line('dotPctDmg', 4), line('igniteChance', 2), line('shockChance', 2)),
        profile('빠른 감염', line('dotPctDmg', 4), line('aspd', 1.5))
    ]),
    potion: Object.freeze([
        profile('농축 시약', line('potionPctDmg', 5), line('dotPctDmg', 3)),
        profile('휘발성 혼합', line('potionPctDmg', 5), line('aoePctDmg', 3)),
        profile('신속 투척', line('potionPctDmg', 4), line('aspd', 1.5)),
        profile('맹독 용액', line('potionPctDmg', 4), line('poisonChance', 3))
    ]),
    shield: Object.freeze([
        profile('방패 강타', line('shieldPctDmg', 5), line('armorPct', 3)),
        profile('반격 방벽', line('shieldPctDmg', 4), line('blockChance', 1)),
        profile('성역의 방패', line('shieldPctDmg', 4), line('resAll', 2)),
        profile('굳건한 진군', line('blockChance', 1), line('pctHp', 2))
    ]),
    summon: Object.freeze([
        profile('사역 강화', line('summonPctDmg', 5), line('summonAspd', 3)),
        profile('사역 보호', line('summonHpPct', 5), line('summonPctDmg', 3)),
        profile('사역의 눈', line('summonCrit', 1), line('summonPctDmg', 4)),
        profile('상위 사역술', line('summonPctDmg', 4), line('summonGemLevel', 1, { majorOnly: true, fixed: true }))
    ]),
    mystique: Object.freeze([
        profile('감긴 눈', line('mystique', 1, { fixed: true })),
        profile('깊은 응시', line('mystique', 1, { fixed: true }), line('dotPctDmg', 3)),
        profile('병증의 비의', line('mystique', 1, { fixed: true }), line('poisonChance', 2)),
        profile('금단의 관측', line('mystique', 1, { fixed: true }), line('crit', 0.6))
    ]),
    devotion: Object.freeze([
        profile('작은 헌신', line('devotion', 1, { fixed: true })),
        profile('전투의 헌신', line('devotion', 1, { fixed: true }), line('pctDmg', 3)),
        profile('수호의 헌신', line('devotion', 1, { fixed: true }), line('resAll', 2)),
        profile('생명의 헌신', line('devotion', 1, { fixed: true }), line('pctHp', 1.5))
    ]),
    cycle: Object.freeze([
        profile('잔잔한 물결', line('cycle', 1, { fixed: true })),
        profile('빠른 회귀', line('cycle', 1, { fixed: true }), line('move', 1.2)),
        profile('되찾는 숨', line('cycle', 1, { fixed: true }), line('regen', 0.15)),
        profile('반복되는 충격', line('cycle', 1, { fixed: true }), line('aspd', 1.2))
    ])
});

const ZONE_PALETTES = Object.freeze({
    archer: Object.freeze(['projectile', 'dexterity', 'evasion', 'physical', 'cold']),
    alchemist: Object.freeze(['potion', 'ailment', 'elemental', 'dexterity', 'intelligence']),
    occultist: Object.freeze(['spell', 'chaos', 'energyShield', 'summon', 'intelligence']),
    cleric: Object.freeze(['shield', 'energyShield', 'spell', 'strength', 'elemental']),
    warrior: Object.freeze(['melee', 'slam', 'physical', 'armor', 'strength']),
    wanderer: Object.freeze(['melee', 'dexterity', 'evasion', 'physical', 'ailment'])
});

const ZONE_ADJECTIVES = Object.freeze({
    archer: ['매의', '질풍의', '꿰뚫는', '정조준의', '추적하는', '먼거리'],
    alchemist: ['증류된', '촉매의', '정제된', '휘발성', '농축된', '변성의'],
    occultist: ['금단의', '심연의', '봉인된', '차원의', '의식의', '공허한'],
    cleric: ['성스러운', '굳건한', '서약의', '수호의', '빛나는', '정화의'],
    warrior: ['전장의', '불굴의', '강철의', '맹렬한', '철벽의', '파쇄하는'],
    wanderer: ['그림자의', '침묵의', '날렵한', '황혼의', '기습의', '흔적 없는']
});

const CATEGORY_NOUNS = Object.freeze({
    strength: ['완력', '혈맥', '거체'], dexterity: ['발놀림', '감각', '반사'], intelligence: ['통찰', '지식', '정신'],
    projectile: ['궤적', '시위', '탄도'], melee: ['칼끝', '절개', '연격'], slam: ['강타', '진동', '충격'],
    physical: ['파쇄', '상흔', '격돌'], armor: ['갑주', '보루', '방벽'], evasion: ['회피', '잔상', '몸놀림'],
    energyShield: ['장막', '보호막', '외피'], spell: ['주문', '술식', '주문핵'], chaos: ['침식', '독기', '왜곡'],
    elemental: ['조율', '촉매', '공명'], fire: ['불씨', '작열', '화로'], cold: ['서리', '빙결', '설화'],
    lightning: ['뇌광', '전류', '낙뢰'], ailment: ['병증', '감염', '상처'], potion: ['시약', '혼합', '증류'],
    shield: ['방패', '수호', '성벽'], summon: ['사역', '의식', '권속'], mystique: ['눈', '비의', '응시'],
    devotion: ['헌신', '성약', '복음'], cycle: ['윤회', '파문', '회귀']
});

module.exports = {
    ARCHETYPE_PROFILES, CATEGORY_NOUNS, STAT_META, ZONE_ADJECTIVES, ZONE_PALETTES,
    isAllAttributesEffects, isReadablePassiveValue, normalizePassiveValue, passiveValueStep, scalePassiveLine
};
