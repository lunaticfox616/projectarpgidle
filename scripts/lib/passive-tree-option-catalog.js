'use strict';

function line(statId, value, options = {}) {
    return Object.freeze({ statId, value, ...options });
}

function profile(name, ...lines) {
    return Object.freeze({ name, lines: Object.freeze(lines) });
}

/** 무기 조건 줄(js/utils.js addPassiveLineToBucket, data/skills.js WEAPON_CONDITION_STATS와 같은 id): 자세 + 능력치. */
const WEAPON_LINE_STANCES = Object.freeze({ greatsword: '대검', sword: '한손검', bow: '활', orb: '오브', flask: '플라스크', censer: '향로' });
const WEAPON_LINE_BASES = Object.freeze({ pctDmg: ['피해', '%'], attackPctDmg: ['공격 피해', '%'], spellPctDmg: ['주문 피해', '%'], dotPctDmg: ['지속 피해 배율', '%'], crit: ['치명타 확률', '%p'],
    critDmg: ['치명타 피해 배율', '%'], aspd: ['공격 속도', '%'], ds: ['연속 타격', '%p'], minDmgRoll: ['최소 피해 보정', '%'], maxDmgRoll: ['최대 피해 보정', '%'], physIgnore: ['적 물리 피해 감소 무시', '%'],
    move: ['이동 속도', '%'], bleedChance: ['출혈 확률', '%p'], igniteChance: ['점화 확률', '%p'], poisonChance: ['중독 확률', '%p'], leech: ['생명력 흡수', '%'], pctHp: ['최대 생명력', '%'],
    cooldownRecovery: ['재사용 대기시간 회복 속도', '%'], projectileExtraShots: ['투사체 추가 발사', '개'], projectileChain: ['투사체 연쇄', '개'] });
function weaponLineId(stance, stat) {
    return `${stance}${stat[0].toUpperCase()}${stat.slice(1)}`;
}
function weaponConditionMeta() {
    return Object.fromEntries(Object.entries(WEAPON_LINE_STANCES).flatMap(([stance, label]) => Object.entries(WEAPON_LINE_BASES)
        .map(([stat, [name, suffix]]) => [weaponLineId(stance, stat), [`${label} 사용 시 ${name}`, suffix]])));
}

const STAT_META = Object.freeze({
    strength: ['힘', ''], dexterity: ['민첩', ''], intelligence: ['지능', ''], accuracy: ['정확도', ''],
    flatHp: ['최대 생명력', ''], pctHp: ['최대 생명력', '%'], regen: ['초당 생명력 재생', '%'],
    flatDmg: ['기본 피해', ''], spellFlatDmg: ['주문 내장 피해', ''], spellFlatPct: ['주문 내장 피해 증가', '%'],
    pctDmg: ['피해', '%'], meleePctDmg: ['근접 피해', '%'],
    slamPctDmg: ['강타 피해', '%'], projectilePctDmg: ['투사체 피해', '%'], physPctDmg: ['물리 피해', '%'],
    elementalPctDmg: ['원소 피해', '%'], firePctDmg: ['화염 피해', '%'], coldPctDmg: ['냉기 피해', '%'],
    lightPctDmg: ['번개 피해', '%'], chaosPctDmg: ['카오스 피해', '%'], aoePctDmg: ['범위 피해', '%'],
    dotPctDmg: ['지속 피해 배율', '%'], spellPctDmg: ['주문 피해', '%'], shieldPctDmg: ['완갑 착용 근접 피해', '%'],
    potionPctDmg: ['포션 스킬 피해', '%'], minePctDmg: ['지뢰 피해', '%'],
    mobilityPctDmg: ['기동 스킬 피해', '%'], channelingPctDmg: ['채널링 피해', '%'],
    ailmentDamagePct: ['상태이상 피해', '%'], ailmentPotencyPct: ['상태이상 위력', '%'],
    igniteChance: ['점화 확률', '%p'], chillChance: ['냉각 확률', '%p'], shockChance: ['감전 확률', '%p'],
    poisonChance: ['중독 확률', '%p'], bleedChance: ['출혈 확률', '%p'], freezeChance: ['동결 확률', '%p'],
    aspd: ['공격 속도', '%'], ds: ['연속 타격', '%p'], leech: ['생명력 흡수', '%'],
    move: ['이동 속도', '%'], crit: ['치명타 확률', '%p'], critDmg: ['치명타 피해 배율', '%'],
    cooldownRecovery: ['재사용 대기시간 회복 속도', '%'], cooldownReduction: ['재사용 대기시간 감소', '%'],
    mobilityCooldownRecovery: ['이동 스킬 재사용 대기시간 회복 속도', '%'], mobilityCooldownReduction: ['이동 스킬 재사용 대기시간 감소', '%'],
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
    gemLevel: ['모든 스킬룬 레벨', ''], elementalGemLevel: ['원소 스킬룬 레벨', ''],
    fireGemLevel: ['화염 스킬룬 레벨', ''], coldGemLevel: ['냉기 스킬룬 레벨', ''],
    lightGemLevel: ['번개 스킬룬 레벨', ''], chaosGemLevel: ['카오스 스킬룬 레벨', ''],
    physGemLevel: ['물리 스킬룬 레벨', ''], projectileGemLevel: ['투사체 스킬룬 레벨', ''],
    meleeGemLevel: ['근접 스킬룬 레벨', ''], slamGemLevel: ['강타 스킬룬 레벨', ''],
    spellGemLevel: ['주문 스킬룬 레벨', ''], dotGemLevel: ['지속 스킬룬 레벨', ''],
    aoeGemLevel: ['범위 스킬룬 레벨', ''], strGemLevel: ['힘 스킬룬 레벨', ''], dexGemLevel: ['민첩 스킬룬 레벨', ''],
    intGemLevel: ['지능 스킬룬 레벨', ''], runeResonancePower: ['공명력', ''],
    suppCap: ['보조스킬룬 한도', ''], projectileExtraShots: ['추가 투사체', '개'],
    targetProjectile: ['투사체 스킬 타겟 수', ''],
    summonPctDmg: ['소환수 피해', '%'], summonAspd: ['소환수 공격 속도', '%'], summonHpPct: ['소환수 생명력', '%'],
    summonCrit: ['소환수 치명타 확률', '%p'], summonGemLevel: ['소환수 공격 스킬룬 레벨', ''],
    mystique: ['신비', ''], devotion: ['헌신', ''], cycle: ['순환', ''],
    voidLinkEfficiency: ['연결된 공허 소켓의 효율', '%'], attackPctDmg: ['공격 피해', '%'], projectileChain: ['투사체 연쇄', '개'], skillDelayReduce: ['스킬 딜레이 감소', '%'], spellRepeatChance: ['연속 주문 확률', '%p'],
    cooldownReductionCapBonus: ['재사용 대기시간 감소 한도', '%'],
    igniteDurationPct: ['점화 지속시간', '%'], chillDurationPct: ['냉각 지속시간', '%'], freezeDurationPct: ['동결 지속시간', '%'],
    shockDurationPct: ['감전 지속시간', '%'], poisonDurationPct: ['중독 지속시간', '%'], bleedDurationPct: ['출혈 지속시간', '%'],
    ailResIgnite: ['점화 저항 확률', '%p'], ailResShock: ['감전 저항 확률', '%p'], ailResFreeze: ['냉기 저항 확률', '%p'], ailResPoison: ['중독 저항 확률', '%p'], ailResBleed: ['출혈 저항 확률', '%p'],
    ...weaponConditionMeta()
});

const FINE_STEP_STATS = new Set([
    'regen', 'leech', 'crit', 'blockChance', 'blockChanceMax', 'deflectChance', 'dr', 'physIgnore', 'resPen',
    'summonCrit', 'doubleDamageChance', 'energyShieldRechargeFaster', ...Object.keys(WEAPON_LINE_STANCES).flatMap(stance => ['crit', 'physIgnore', 'leech'].map(stat => weaponLineId(stance, stat)))
]);
const HALF_STEP_STATS = new Set(['mystique', 'devotion', 'cycle']);

/** 2026-11-01 (사용자: PoE1/2의 옵션처럼 예쁜 수치): 소형 1배, 주요 보조 1.5배, 일반 2배, 주요 3배. 아래 꾸러미의 기본값은 이 배율마다 끝이 깔끔하게 떨어지도록
 * 골랐다(10% → 10/15/20/30, 힘 10 → 10/15/20/30, 치명타 1%p → 1/1.5/2/3, 재생 0.4% → 0.4/0.6/0.8/1.2). 편집기의 꾸러미 채우기는 거리 구간을 더 곱하지 않는다. */
const PASSIVE_TYPE_MULTIPLIER = Object.freeze({ minor: 1, assist: 1.5, normal: 2, major: 3 });
/** 2026-11-01 사용자: 소형 피해 10%, 주요 보조 피해 12%. 피해 줄만 보조 배율이 1.2다. */
const ASSIST_DAMAGE_MULTIPLIER = 1.2;
function isDamageLine(statId) {
    return /^(pctDmg|\w*PctDmg)$/.test(statId);
}
function passiveTypeMultiplier(statId, type) {
    return type === 'assist' && isDamageLine(statId) ? ASSIST_DAMAGE_MULTIPLIER : PASSIVE_TYPE_MULTIPLIER[type];
}

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
    const typeMultiplier = passiveTypeMultiplier(line.statId, type);
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

/** 2026-11-01 사용자: 새 아이콘과 배경 문양에 맞는 꾸러미, 기존 꾸러미의 변형. 첫 줄이 소형 노드에 들어가므로 그 주제의 대표 능력치를 앞에 둔다.
 * 기본값은 1/1.5/2/3배에도 끝이 깔끔한 수만 쓴다. 대가가 있는 줄(음수)과 강한 줄(레벨, 추가 투사체)은 주요 전용(majorOnly) 고정값이다. */
const ARCHETYPE_PROFILES = Object.freeze({
    weaponGreatsword: [
        profile('무거운 궤적', line('greatswordPctDmg', 10), line('greatswordCrit', 1)),
        profile('내려찍는 결심', line('greatswordAspd', 4), line('greatswordPctDmg', 10)),
        profile('넓게 긋는 대검', line('greatswordCrit', 1), line('greatswordCritDmg', 10)),
        profile('대검의 숨결', line('greatswordPctDmg', 10), line('greatswordMaxDmgRoll', 2)),
        profile('쪼개는 날', line('greatswordAttackPctDmg', 10), line('greatswordDs', 2)),
        profile('굳게 쥔 자루', line('greatswordAttackPctDmg', 10), line('greatswordMinDmgRoll', 2))
    ],
    weaponSword: [
        profile('칼끝의 사냥', line('swordPctDmg', 10), line('swordCrit', 1)),
        profile('날렵한 손목', line('swordAspd', 4), line('swordPctDmg', 10)),
        profile('뒤따르는 칼끝', line('swordCrit', 1), line('swordCritDmg', 10)),
        profile('날아가는 칼날', line('swordPctDmg', 10), line('swordProjectileExtraShots', 1, { majorOnly: true, fixed: true })),
        profile('튀어 오르는 칼날', line('swordPctDmg', 10), line('swordProjectileChain', 1, { majorOnly: true, fixed: true })),
        profile('벌어진 상처', line('swordAttackPctDmg', 10), line('swordMinDmgRoll', 2))
    ],
    weaponBow: [
        profile('곧게 당기기', line('bowPctDmg', 10), line('bowCrit', 1)),
        profile('빠른 장전', line('bowAspd', 4), line('bowPctDmg', 10)),
        profile('가까이 당긴 살', line('bowCrit', 1), line('bowCritDmg', 10)),
        profile('다발 시위', line('bowPctDmg', 10), line('bowProjectileExtraShots', 1, { majorOnly: true, fixed: true })),
        profile('되튀는 화살촉', line('bowPctDmg', 10), line('bowProjectileChain', 1, { majorOnly: true, fixed: true })),
        profile('멀리 보는 활', line('bowAttackPctDmg', 10), line('bowMinDmgRoll', 2))
    ],
    weaponOrb: [
        profile('구슬에 고인 빛', line('orbPctDmg', 10), line('orbCrit', 1)),
        profile('맴도는 구슬', line('orbAspd', 4), line('orbPctDmg', 10)),
        profile('구슬의 속삭임', line('orbCrit', 1), line('orbCritDmg', 10)),
        profile('갈라지는 빛', line('orbPctDmg', 10), line('orbProjectileExtraShots', 1, { majorOnly: true, fixed: true })),
        profile('돌아오는 빛', line('orbPctDmg', 10), line('orbProjectileChain', 1, { majorOnly: true, fixed: true })),
        profile('차오르는 구슬', line('orbSpellPctDmg', 10), line('orbAttackPctDmg', 10))
    ],
    weaponFlask: [
        profile('거품 이는 병', line('flaskPctDmg', 10), line('flaskCrit', 1)),
        profile('가벼운 투척', line('flaskAspd', 4), line('flaskPctDmg', 10)),
        profile('병목의 독', line('flaskCrit', 1), line('flaskCritDmg', 10)),
        profile('한 병 더', line('flaskPctDmg', 10), line('flaskProjectileExtraShots', 1, { majorOnly: true, fixed: true })),
        profile('튀어 오르는 병', line('flaskPctDmg', 10), line('flaskProjectileChain', 1, { majorOnly: true, fixed: true })),
        profile('끓어 넘치는 병', line('flaskSpellPctDmg', 10), line('flaskAttackPctDmg', 10))
    ],
    weaponCenser: [
        profile('연기 속의 기도', line('censerPctDmg', 10), line('censerCrit', 1)),
        profile('향로의 불씨', line('censerAspd', 4), line('censerPctDmg', 10)),
        profile('기울인 향로', line('censerCrit', 1), line('censerCritDmg', 10)),
        profile('퍼지는 향', line('censerPctDmg', 10), line('censerMaxDmgRoll', 2)),
        profile('짙은 연기', line('censerAttackPctDmg', 10), line('censerDs', 2)),
        profile('재를 뿌리는 손', line('censerSpellPctDmg', 10), line('censerAttackPctDmg', 10))
    ],
    strength: Object.freeze([
        profile('단단한 혈맥', line('strength', 10), line('flatHp', 20)),
        profile('무거운 완력', line('strength', 10), line('physPctDmg', 10)),
        profile('전열의 체력', line('pctHp', 4), line('armorPct', 10)),
        profile('불굴의 힘줄', line('strength', 10), line('regen', 0.4)),
        profile('거인의 뼈대', line('strength', 10), line('armorPct', 10)),
        profile('장작 패는 팔', line('strength', 10), line('meleePctDmg', 10)),
        profile('버티는 등뼈', line('strength', 10), line('resAll', 4)),
        profile('내리누르는 힘', line('strength', 10), line('slamPctDmg', 10))
    ]),
    dexterity: Object.freeze([
        profile('민첩한 발놀림', line('dexterity', 10), line('move', 2)),
        profile('정교한 손놀림', line('dexterity', 10), line('accuracy', 40)),
        profile('바람의 반사', line('evasionPct', 10), line('aspd', 4)),
        profile('기민한 감각', line('dexterity', 10), line('crit', 1)),
        profile('쉴 틈 없는 손', line('dexterity', 10), line('aspd', 4)),
        profile('날랜 손끝', line('dexterity', 10), line('projectilePctDmg', 10)),
        profile('빗겨 서기', line('dexterity', 10), line('deflectChance', 2)),
        profile('그림자 밟기', line('dexterity', 10), line('evasionPct', 10))
    ]),
    intelligence: Object.freeze([
        profile('축적된 지식', line('intelligence', 10), line('energyShield', 10)),
        profile('주문 해석', line('intelligence', 10), line('spellPctDmg', 10)),
        profile('비전 장막', line('energyShieldPct', 10), line('resAll', 4)),
        profile('정신의 가속', line('intelligence', 10), line('aspd', 4)),
        profile('깊은 사색', line('intelligence', 10), line('energyShieldRegen', 10)),
        profile('룬 해독', line('intelligence', 10), line('runeResonancePower', 1, { fixed: true })),
        profile('냉철한 계산', line('intelligence', 10), line('crit', 1)),
        profile('원소 문답', line('intelligence', 10), line('elementalPctDmg', 10))
    ]),
    projectile: Object.freeze([
        profile('곧은 궤적', line('projectilePctDmg', 10), line('accuracy', 40)),
        profile('빠른 시위', line('projectilePctDmg', 10), line('aspd', 4)),
        profile('약점 조준', line('projectilePctDmg', 10), line('crit', 1)),
        profile('갈라지는 탄도', line('projectilePctDmg', 10), line('projectileExtraShots', 1, { majorOnly: true, fixed: true })),
        profile('먼 과녁', line('projectilePctDmg', 10), line('physIgnore', 2)),
        profile('바람 읽기', line('projectilePctDmg', 10), line('move', 2)),
        profile('깃털 균형', line('projectilePctDmg', 10), line('evasionPct', 10)),
        profile('화살촉 단련', line('projectilePctDmg', 10), line('flatDmg', 2)),
        profile('무거운 탄두', line('projectilePctDmg', 10), line('physPctDmg', 10), line('aspd', -8, { majorOnly: true, fixed: true }))
    ]),
    melee: Object.freeze([
        profile('날 선 일격', line('meleePctDmg', 10), line('flatDmg', 2)),
        profile('이중 베기', line('meleePctDmg', 10), line('aspd', 4)),
        profile('파고드는 칼끝', line('meleePctDmg', 10), line('physIgnore', 2)),
        profile('급소 절개', line('meleePctDmg', 10), line('crit', 1)),
        profile('피 묻은 칼날', line('meleePctDmg', 10), line('bleedChance', 4)),
        profile('독 바른 날', line('meleePctDmg', 10), line('poisonChance', 4)),
        profile('맞받아치기', line('meleePctDmg', 10), line('deflectChance', 2)),
        profile('한 걸음 안쪽', line('meleePctDmg', 10), line('move', 2)),
        profile('칼등 막기', line('meleePctDmg', 10), line('armorPct', 10)),
        profile('거듭 베기', line('meleePctDmg', 10), line('ds', 2))
    ]),
    slam: Object.freeze([
        profile('대지 충격', line('slamPctDmg', 10), line('aoePctDmg', 10)),
        profile('무거운 낙하', line('slamPctDmg', 10), line('flatDmg', 2)),
        profile('파쇄 여파', line('slamPctDmg', 10), line('physIgnore', 2)),
        profile('흔들리지 않는 자세', line('slamPctDmg', 10), line('armorPct', 10)),
        profile('여진 부르기', line('slamPctDmg', 10), line('slamEchoChance', 4)),
        profile('돌 부수는 망치', line('slamPctDmg', 10), line('physPctDmg', 10)),
        profile('무릎 꿇리기', line('slamPctDmg', 10), line('critDmg', 10)),
        profile('천천히 내리침', line('slamPctDmg', 10), line('minDmgRoll', 2), line('aspd', -8, { majorOnly: true, fixed: true }))
    ]),
    physical: Object.freeze([
        profile('철을 가르는 힘', line('physPctDmg', 10), line('physIgnore', 2)),
        profile('깊은 상처', line('physPctDmg', 10), line('bleedChance', 4)),
        profile('피의 궤적', line('dotPctDmg', 10), line('bleedChance', 4)),
        profile('무거운 타격', line('physPctDmg', 10), line('flatDmg', 2)),
        profile('뼈 바수기', line('physPctDmg', 10), line('critDmg', 10)),
        profile('거친 숫돌', line('physPctDmg', 10), line('minDmgRoll', 2)),
        profile('무딘 날의 무게', line('physPctDmg', 10), line('aspd', 4)),
        profile('갑옷 뚫기', line('physIgnore', 2), line('physPctDmg', 10), line('crit', 1, { majorOnly: true, fixed: true })),
        profile('철의 맛', line('physPctDmg', 10), line('addedPhysDamagePct', 2))
    ]),
    armor: Object.freeze([
        profile('강철 외피', line('armorPct', 10), line('armor', 20)),
        profile('전열 방벽', line('armorPct', 10), line('pctHp', 4)),
        profile('완강한 수비', line('blockChance', 2), line('armorPct', 10)),
        profile('충격 분산', line('armorPct', 10), line('dr', 1)),
        profile('겹친 철판', line('armorPct', 10), line('resAll', 4)),
        profile('충격 흡수', line('armorPct', 10), line('takenDamageReduceWhen2EnemiesPct', 4)),
        profile('닳지 않는 쇠', line('armorPct', 10), line('flatHp', 20)),
        profile('무쇠 심장', line('armorPct', 10), line('regen', 0.4)),
        profile('전진하는 벽', line('armorPct', 10), line('meleePctDmg', 10)),
        profile('단단한 어깨', line('armorPct', 10), line('strength', 10))
    ]),
    evasion: Object.freeze([
        profile('흐르는 몸놀림', line('evasionPct', 10), line('evasion', 20)),
        profile('흔적 없는 걸음', line('evasionPct', 10), line('move', 2)),
        profile('가속하는 몸놀림', line('mobilityPctDmg', 10), line('move', 2)),
        profile('비스듬한 회피', line('deflectChance', 2), line('evasionPct', 10)),
        profile('반격의 틈', line('evasionPct', 10), line('crit', 1)),
        profile('발끝의 여유', line('evasionPct', 10), line('aspd', 4)),
        profile('숨은 칼', line('evasionPct', 10), line('critDmg', 10)),
        profile('스쳐 가는 바람', line('evasionPct', 10), line('resAll', 4)),
        profile('숨 고르기', line('evasionPct', 10), line('regen', 0.4)),
        profile('달아나는 피', line('evasionPct', 10), line('pctHp', 4))
    ]),
    energyShield: Object.freeze([
        profile('비전 방벽', line('energyShieldPct', 10), line('energyShield', 10)),
        profile('정신의 외피', line('energyShieldPct', 10), line('resAll', 4)),
        profile('응축된 보호막', line('energyShieldPct', 10), line('intelligence', 10)),
        profile('차오르는 장막', line('energyShieldPct', 10), line('regen', 0.4)),
        profile('빠른 재충전', line('energyShieldPct', 10), line('energyShieldRegen', 10)),
        profile('장막의 틈', line('energyShieldPct', 10), line('spellPctDmg', 10)),
        profile('고요한 호흡', line('energyShieldPct', 10), line('crit', 1)),
        profile('푸른 외투', line('energyShieldPct', 10), line('flatHp', 20)),
        profile('번지는 빛막', line('energyShieldPct', 10), line('move', 2)),
        profile('끊기지 않는 장막', line('energyShieldPct', 10), line('energyShieldRegen', 10), line('energyShieldRechargeFaster', 0.4, { majorOnly: true, fixed: true }))
    ]),
    spell: Object.freeze([
        profile('주문 직조', line('spellPctDmg', 10), line('aspd', 4)),
        profile('집중된 술식', line('spellPctDmg', 10), line('crit', 1)),
        profile('확장된 주문진', line('spellPctDmg', 10), line('aoePctDmg', 10)),
        profile('고등 마도', line('spellPctDmg', 10), line('gemLevel', 1, { majorOnly: true, fixed: true })),
        profile('내장 주문', line('spellFlatPct', 10), line('spellPctDmg', 10)),
        profile('빠른 영창', line('spellPctDmg', 10), line('ds', 2)),
        profile('주문 관통', line('spellPctDmg', 10), line('resPen', 2)),
        profile('느린 대마법', line('spellPctDmg', 10), line('critDmg', 10), line('aspd', -8, { majorOnly: true, fixed: true })),
        profile('지식의 화살', line('spellPctDmg', 10), line('intelligence', 10)),
        profile('살아 있는 주문', line('spellPctDmg', 10), line('pctHp', 4))
    ]),
    chaos: Object.freeze([
        profile('심연의 침식', line('chaosPctDmg', 10), line('resPen', 2)),
        profile('독성 주입', line('chaosPctDmg', 10), line('poisonChance', 4)),
        profile('느린 부패', line('chaosPctDmg', 10), line('dotPctDmg', 10)),
        profile('공허의 장막', line('chaosPctDmg', 10), line('resChaos', 6)),
        profile('검은 피', line('chaosPctDmg', 10), line('leech', 0.2)),
        profile('뒤틀린 급소', line('chaosPctDmg', 10), line('crit', 1)),
        profile('부식된 손', line('chaosPctDmg', 10), line('aspd', 4)),
        profile('무너지는 경계', line('chaosPctDmg', 10), line('addedChaosDamagePct', 2)),
        profile('공허 삼키기', line('resChaos', 6), line('pctHp', 4)),
        profile('심연의 대가', line('chaosPctDmg', 10), line('dotPctDmg', 10), line('pctHp', -6, { majorOnly: true, fixed: true }))
    ]),
    elemental: Object.freeze([
        profile('삼원 조율', line('elementalPctDmg', 10), line('resPen', 2)),
        profile('불꽃 촉매', line('firePctDmg', 10), line('igniteChance', 4)),
        profile('서리 촉매', line('coldPctDmg', 10), line('chillChance', 4)),
        profile('전류 촉매', line('lightPctDmg', 10), line('shockChance', 4)),
        profile('맞물린 원소', line('elementalPctDmg', 10), line('aspd', 4)),
        profile('원소 갑주', line('elementalPctDmg', 10), line('resAll', 4)),
        profile('고른 저항', line('resAll', 4), line('energyShieldPct', 10)),
        profile('원소 치유', line('elementalPctDmg', 10), line('pctHp', 4)),
        profile('원소 더하기', line('elementalPctDmg', 10), line('addedLightDamagePct', 2))
    ]),
    fire: Object.freeze([
        profile('타오르는 핵', line('firePctDmg', 10), line('igniteChance', 4)),
        profile('번지는 불씨', line('firePctDmg', 10), line('aoePctDmg', 10)),
        profile('잿불의 잔열', line('firePctDmg', 10), line('dotPctDmg', 10)),
        profile('화염 관통', line('firePctDmg', 10), line('resPen', 2)),
        profile('달궈진 날', line('firePctDmg', 10), line('addedFireDamagePct', 2)),
        profile('불꽃 조준', line('firePctDmg', 10), line('crit', 1)),
        profile('화염 내성', line('firePctDmg', 10), line('resF', 6)),
        profile('재로 덮기', line('firePctDmg', 10), line('physTakenAsFire', 4)),
        profile('아궁이 풀무질', line('firePctDmg', 10), line('aspd', 4)),
        profile('뜨거운 심장', line('firePctDmg', 10), line('pctHp', 4))
    ]),
    cold: Object.freeze([
        profile('차가운 핵', line('coldPctDmg', 10), line('chillChance', 4)),
        profile('깨지는 서리', line('coldPctDmg', 10), line('crit', 1)),
        profile('빙결의 장막', line('coldPctDmg', 10), line('energyShieldPct', 10)),
        profile('냉기 관통', line('coldPctDmg', 10), line('resPen', 2)),
        profile('얼음 날', line('coldPctDmg', 10), line('addedColdDamagePct', 2)),
        profile('시린 손끝', line('coldPctDmg', 10), line('aspd', 4)),
        profile('얼음 관절', line('coldPctDmg', 10), line('freezeChance', 2)),
        profile('서리 내성', line('coldPctDmg', 10), line('resC', 6)),
        profile('서늘한 피부', line('coldPctDmg', 10), line('physTakenAsCold', 4)),
        profile('녹지 않는 결정', line('coldPctDmg', 10), line('chillEffect', 6))
    ]),
    lightning: Object.freeze([
        profile('전도성 핵', line('lightPctDmg', 10), line('shockChance', 4)),
        profile('연쇄 전류', line('lightPctDmg', 10), line('aspd', 4)),
        profile('폭발하는 뇌광', line('lightPctDmg', 10), line('crit', 1)),
        profile('번개 관통', line('lightPctDmg', 10), line('resPen', 2)),
        profile('번개 더하기', line('lightPctDmg', 10), line('addedLightDamagePct', 2)),
        profile('감전 증폭', line('lightPctDmg', 10), line('shockEffect', 4)),
        profile('번개 내성', line('lightPctDmg', 10), line('resL', 6)),
        profile('천둥 걸음', line('lightPctDmg', 10), line('move', 2)),
        profile('가시 같은 전류', line('lightPctDmg', 10), line('physTakenAsLight', 4)),
        profile('번개 품은 몸', line('lightPctDmg', 10), line('energyShieldPct', 10))
    ]),
    ailment: Object.freeze([
        profile('상처의 숙성', line('dotPctDmg', 10), line('bleedChance', 4)),
        profile('독의 숙성', line('dotPctDmg', 10), line('poisonChance', 4)),
        profile('원소 병증', line('dotPctDmg', 10), line('igniteChance', 2), line('shockChance', 2)),
        profile('빠른 감염', line('dotPctDmg', 10), line('aspd', 4)),
        profile('병증 심화', line('ailmentPotencyPct', 4), line('dotPctDmg', 10)),
        profile('고통의 값', line('ailmentDamagePct', 10), line('ailmentPotencyPct', 4)),
        profile('고열과 오한', line('igniteChance', 4), line('chillChance', 4)),
        profile('독과 전류', line('poisonChance', 4), line('shockChance', 4)),
        profile('면역의 기억', line('ailmentDamagePct', 10), line('resAll', 4))
    ]),
    potion: Object.freeze([
        profile('농축 시약', line('potionPctDmg', 10), line('dotPctDmg', 10)),
        profile('휘발성 혼합', line('potionPctDmg', 10), line('aoePctDmg', 10)),
        profile('신속 투척', line('potionPctDmg', 10), line('aspd', 4)),
        profile('맹독 용액', line('potionPctDmg', 10), line('poisonChance', 4)),
        profile('뜨거운 약병', line('potionPctDmg', 10), line('firePctDmg', 10)),
        profile('시린 약병', line('potionPctDmg', 10), line('coldPctDmg', 10)),
        profile('튼튼한 유리', line('potionPctDmg', 10), line('pctHp', 4)),
        profile('치명적 농도', line('potionPctDmg', 10), line('crit', 1)),
        profile('안전 마개', line('potionPctDmg', 10), line('energyShieldPct', 10)),
        profile('깨지는 유리조각', line('potionPctDmg', 10), line('bleedChance', 4)),
        profile('과농축', line('potionPctDmg', 10), line('critDmg', 10), line('aspd', -8, { majorOnly: true, fixed: true }))
    ]),
    shield: Object.freeze([
        profile('방패 강타', line('shieldPctDmg', 10), line('armorPct', 10)),
        profile('반격 방벽', line('shieldPctDmg', 10), line('blockChance', 2)),
        profile('성역의 방패', line('shieldPctDmg', 10), line('resAll', 4)),
        profile('굳건한 진군', line('blockChance', 2), line('pctHp', 4)),
        profile('방패 밀치기', line('shieldPctDmg', 10), line('slamPctDmg', 10)),
        profile('튕겨내기', line('blockChance', 2), line('deflectChance', 2)),
        profile('막고 베기', line('blockChance', 2), line('meleePctDmg', 10)),
        profile('높이 든 방패', line('blockChance', 2), line('armorPct', 10), line('blockChanceMax', 2, { majorOnly: true, fixed: true }))
    ]),
    summon: Object.freeze([
        profile('사역 강화', line('summonPctDmg', 10), line('summonAspd', 4)),
        profile('사역 보호', line('summonHpPct', 10), line('summonPctDmg', 10)),
        profile('사역의 눈', line('summonCrit', 1), line('summonPctDmg', 10)),
        profile('상위 사역술', line('summonPctDmg', 10), line('summonGemLevel', 1, { majorOnly: true, fixed: true })),
        profile('사슬 풀기', line('summonPctDmg', 10), line('summonResPen', 2)),
        profile('부리는 눈빛', line('summonEfficiency', 4), line('summonPctDmg', 10)),
        profile('수액 먹이기', line('summonHpPct', 10), line('regen', 0.4)),
        profile('빠른 명령', line('summonAspd', 4), line('summonCrit', 1)),
        profile('앞세운 권속', line('summonGuardRedirectPct', 4), line('summonHpPct', 10))
    ]),
    mystique: Object.freeze([
        profile('감긴 눈', line('mystique', 1, { fixed: true })),
        profile('깊은 응시', line('mystique', 1, { fixed: true }), line('dotPctDmg', 10)),
        profile('병증의 비의', line('mystique', 1, { fixed: true }), line('poisonChance', 4)),
        profile('금단의 관측', line('mystique', 1, { fixed: true }), line('crit', 1)),
        profile('닫힌 문의 틈', line('mystique', 1, { fixed: true }), line('ailmentPotencyPct', 4)),
        profile('어두운 지식', line('mystique', 1, { fixed: true }), line('chaosPctDmg', 10))
    ]),
    devotion: Object.freeze([
        profile('작은 헌신', line('devotion', 1, { fixed: true })),
        profile('전투의 헌신', line('devotion', 1, { fixed: true }), line('pctDmg', 10)),
        profile('수호의 헌신', line('devotion', 1, { fixed: true }), line('resAll', 4)),
        profile('생명의 헌신', line('devotion', 1, { fixed: true }), line('pctHp', 4)),
        profile('빛의 헌신', line('devotion', 1, { fixed: true }), line('energyShieldPct', 10)),
        profile('원소의 헌신', line('devotion', 1, { fixed: true }), line('elementalPctDmg', 10))
    ]),
    cycle: Object.freeze([
        profile('잔잔한 물결', line('cycle', 1, { fixed: true })),
        profile('빠른 회귀', line('cycle', 1, { fixed: true }), line('move', 2)),
        profile('되찾는 숨', line('cycle', 1, { fixed: true }), line('regen', 0.4)),
        profile('반복되는 충격', line('cycle', 1, { fixed: true }), line('aspd', 4)),
        profile('돌아오는 시간', line('cycle', 1, { fixed: true }), line('cooldownRecovery', 4)),
        profile('맴도는 발걸음', line('cycle', 1, { fixed: true }), line('evasionPct', 10))
    ]),
    // ---------------- 아이콘에 맞춘 꾸러미 (v5 아이콘과 그 전부터 있던 그림 중 꾸러미가 없던 것)
    critical: Object.freeze([
        profile('날카로운 눈', line('crit', 1), line('critDmg', 10)),
        profile('급소 찌르기', line('crit', 1), line('meleePctDmg', 10)),
        profile('숨통 노리기', line('crit', 1), line('aspd', 4)),
        profile('단 한 번의 틈', line('critDmg', 10), line('aspd', 4)),
        profile('치명의 여유', line('crit', 1), line('move', 2)),
        profile('뼈를 보는 눈', line('crit', 1), line('physIgnore', 2)),
        profile('확실한 마무리', line('critDmg', 10), line('minDmgRoll', 2)),
        profile('목숨 건 일격', line('crit', 1), line('critDmg', 10), line('pctHp', -6, { majorOnly: true, fixed: true })),
        profile('심장 겨누기', line('crit', 1), line('projectilePctDmg', 10)),
        profile('주문의 약점', line('crit', 1), line('spellPctDmg', 10)),
        profile('두 배의 행운', line('doubleDamageChance', 1), line('crit', 1)),
        profile('서늘한 집중', line('crit', 1), line('accuracy', 40)),
        profile('피하며 노리기', line('crit', 1), line('evasionPct', 10)),
        profile('다친 자의 눈', line('crit', 1), line('pctHp', 4)),
        profile('독의 틈', line('crit', 1), line('poisonChance', 4)),
        profile('핏줄 가르기', line('crit', 1), line('bleedChance', 4)),
        profile('치명의 값', line('critDmg', 10), line('meleePctDmg', 10)),
        profile('무거운 마무리', line('critDmg', 10), line('physPctDmg', 10))
    ]),
    cooldown: Object.freeze([
        profile('짧아진 기다림', line('cooldownRecovery', 4), line('aspd', 4)),
        profile('되감는 손', line('cooldownRecovery', 4), line('pctDmg', 10)),
        profile('되돌린 모래', line('cooldownReduction', 5, { fixed: true }), line('cooldownRecovery', 4)),
        profile('이어지는 기술', line('cooldownRecovery', 4), line('move', 2)),
        profile('숨 돌릴 틈', line('cooldownRecovery', 4), line('regen', 0.4)),
        profile('준비된 칼', line('cooldownRecovery', 4), line('critDmg', 10))
    ]),
    ignite: Object.freeze([
        profile('옮겨붙는 불', line('igniteChance', 4), line('firePctDmg', 10)),
        profile('끈질긴 불길', line('igniteChance', 4), line('dotPctDmg', 10)),
        profile('고온 점화', line('igniteDamageMultiplierPct', 6), line('igniteChance', 4)),
        profile('불쏘시개', line('igniteChance', 4), line('aspd', 4)),
        profile('재 뒤집기', line('igniteChance', 4), line('ailmentPotencyPct', 4)),
        profile('뜨거운 고통', line('igniteDamageMultiplierPct', 6), line('firePctDmg', 10))
    ]),
    chill: Object.freeze([
        profile('움츠러드는 손', line('chillChance', 4), line('coldPctDmg', 10)),
        profile('느려진 심장', line('chillEffect', 6), line('chillChance', 4)),
        profile('시린 바람', line('chillChance', 4), line('move', 2)),
        profile('식어 가는 적', line('chillEffect', 6), line('coldPctDmg', 10)),
        profile('입김 막기', line('chillChance', 4), line('energyShieldPct', 10)),
        profile('추위의 틈', line('chillChance', 4), line('crit', 1))
    ]),
    freeze: Object.freeze([
        profile('얼어붙는 순간', line('freezeChance', 2), line('coldPctDmg', 10)),
        profile('깨지는 조각상', line('freezeChance', 2), line('critDmg', 10)),
        profile('멈춘 숨', line('freezeChance', 2), line('chillChance', 4)),
        profile('얼음 감옥', line('freezeChance', 2), line('aoePctDmg', 10)),
        profile('결빙의 손', line('freezeChance', 2), line('aspd', 4)),
        profile('동상의 벽', line('freezeChance', 2), line('energyShieldPct', 10))
    ]),
    shock: Object.freeze([
        profile('찌릿한 손끝', line('shockChance', 4), line('lightPctDmg', 10)),
        profile('저린 근육', line('shockEffect', 4), line('shockChance', 4)),
        profile('전류 타기', line('shockChance', 4), line('aspd', 4)),
        profile('감전된 표적', line('shockedEnemyHitDamagePct', 10), line('shockChance', 4)),
        profile('과전류', line('shockEffect', 4), line('lightPctDmg', 10)),
        profile('번지는 떨림', line('shockChance', 4), line('aoePctDmg', 10)),
        profile('증폭 회로', line('shockChance', 4), line('lightPctDmg', 10), line('shockedEnemyHitDamageMorePct', 8, { majorOnly: true, fixed: true }))
    ]),
    bleed: Object.freeze([
        profile('베인 자리', line('bleedChance', 4), line('physPctDmg', 10)),
        profile('멎지 않는 피', line('bleedChance', 4), line('dotPctDmg', 10)),
        profile('핏자국 따라가기', line('bleedChance', 4), line('move', 2)),
        profile('벌어진 틈', line('bleedChance', 4), line('aspd', 4)),
        profile('피비린내', line('bleedChance', 4), line('ailmentDamagePct', 10)),
        profile('피로 씻기', line('bleedChance', 4), line('leech', 0.2)),
        profile('찢는 톱니', line('bleedChance', 4), line('critDmg', 10))
    ]),
    poison: Object.freeze([
        profile('독니', line('poisonChance', 4), line('chaosPctDmg', 10)),
        profile('퍼지는 독', line('poisonChance', 4), line('poisonDamageMultiplierPct', 10)),
        profile('진한 독액', line('poisonDamageMultiplierPct', 10), line('dotPctDmg', 10)),
        profile('독 바르는 손', line('poisonChance', 4), line('aspd', 4)),
        profile('독에 익은 몸', line('poisonChance', 4), line('resChaos', 6)),
        profile('소리 없는 독', line('poisonChance', 4), line('evasionPct', 10)),
        profile('독 항아리', line('poisonChance', 4), line('potionPctDmg', 10))
    ]),
    wisp: Object.freeze([
        profile('불씨 위습', line('summonPctDmg', 10), line('firePctDmg', 10)),
        profile('서리 위습', line('summonPctDmg', 10), line('coldPctDmg', 10)),
        profile('뇌광 위습', line('summonPctDmg', 10), line('lightPctDmg', 10)),
        profile('검은 위습', line('summonPctDmg', 10), line('chaosPctDmg', 10)),
        profile('빠른 날갯짓', line('summonAspd', 4), line('summonPctDmg', 10)),
        profile('위습의 급소', line('summonCrit', 1), line('summonAspd', 4)),
        profile('꺼지지 않는 등불', line('summonHpPct', 10), line('summonEfficiency', 4)),
        profile('떠도는 불빛', line('summonEfficiency', 4), line('summonResPen', 2))
    ]),
    blessing: Object.freeze([
        profile('따뜻한 가호', line('summonEfficiency', 4), line('pctHp', 4)),
        profile('지켜 주는 빛', line('resAll', 4), line('summonEfficiency', 4)),
        profile('가호의 손길', line('regen', 0.4), line('resAll', 4)),
        profile('축복받은 날', line('pctDmg', 10), line('summonEfficiency', 4)),
        profile('내려앉은 빛', line('energyShieldPct', 10), line('summonEfficiency', 4)),
        profile('은총의 걸음', line('resAll', 4), line('move', 2))
    ]),
    mobility: Object.freeze([
        profile('박차고 나가기', line('mobilityPctDmg', 10), line('crit', 1)),
        profile('돌진의 기세', line('mobilityPctDmg', 10), line('physPctDmg', 10)),
        profile('다시 뛰기', line('mobilityCooldownRecovery', 6), line('move', 2)),
        profile('착지 충격', line('mobilityPctDmg', 10), line('aoePctDmg', 10)),
        profile('공중제비', line('mobilityPctDmg', 10), line('evasionPct', 10)),
        profile('짧은 도움닫기', line('mobilityCooldownRecovery', 6), line('mobilityPctDmg', 10)),
        profile('재빠른 빠져나가기', line('mobilityCooldownReduction', 5, { fixed: true }), line('evasionPct', 10))
    ]),
    area: Object.freeze([
        profile('넓어지는 원', line('aoePctDmg', 10), line('crit', 1)),
        profile('퍼지는 파문', line('aoePctDmg', 10), line('aspd', 4)),
        profile('둘러싸인 전장', line('aoePctDmg', 10), line('takenDamageReduceWhen2EnemiesPct', 4)),
        profile('밀려오는 여파', line('aoePctDmg', 10), line('physIgnore', 2)),
        profile('사방 베기', line('aoePctDmg', 10), line('meleePctDmg', 10)),
        profile('터지는 주문진', line('aoePctDmg', 10), line('spellPctDmg', 10)),
        profile('무리 사냥', line('aoePctDmg', 10), line('pctHp', 4))
    ]),
    damageOverTime: Object.freeze([
        profile('천천히 스미기', line('dotPctDmg', 10), line('ailmentPotencyPct', 4)),
        profile('끝나지 않는 고통', line('dotPctDmg', 10), line('ailmentDamagePct', 10)),
        profile('번지는 열병', line('dotPctDmg', 10), line('igniteChance', 4)),
        profile('인내심 싸움', line('dotPctDmg', 10), line('pctHp', 4)),
        profile('기다리는 자', line('dotPctDmg', 10), line('energyShieldPct', 10)),
        profile('곪아 터지기', line('dotPctDmg', 10), line('aoePctDmg', 10))
    ]),
    censer: Object.freeze([
        profile('흔들리는 향로', line('meleePctDmg', 10), line('aoePctDmg', 10)),
        profile('타오르는 향', line('aoePctDmg', 10), line('firePctDmg', 10)),
        profile('정화의 연기', line('elementalPctDmg', 10), line('regen', 0.4)),
        profile('재의 축복', line('meleePctDmg', 10), line('igniteChance', 4)),
        profile('성스러운 쇠사슬', line('meleePctDmg', 10), line('resAll', 4)),
        profile('기도하는 손', line('elementalPctDmg', 10), line('crit', 1)),
        profile('무거운 향로', line('meleePctDmg', 10), line('physPctDmg', 10)),
        profile('번개 맞은 향로', line('meleePctDmg', 10), line('lightPctDmg', 10))
    ]),
    greatsword: Object.freeze([
        profile('크게 휘두르기', line('meleePctDmg', 10), line('critDmg', 10)),
        profile('대검의 무게', line('physPctDmg', 10), line('meleePctDmg', 10)),
        profile('어깨에 멘 칼', line('meleePctDmg', 10), line('pctHp', 4)),
        profile('쇠를 가르는 날', line('meleePctDmg', 10), line('resPen', 2)),
        profile('거침없는 휘두름', line('aspd', 4), line('physPctDmg', 10)),
        profile('내리찍는 대검', line('slamPctDmg', 10), line('meleePctDmg', 10)),
        profile('두 손의 힘', line('meleePctDmg', 10), line('strength', 10)),
        profile('느리고 무겁게', line('meleePctDmg', 10), line('minDmgRoll', 2), line('aspd', -8, { majorOnly: true, fixed: true })),
        profile('대검 방패', line('meleePctDmg', 10), line('blockChance', 2))
    ]),
    bow: Object.freeze([
        profile('활시위 당기기', line('projectilePctDmg', 10), line('critDmg', 10)),
        profile('빠른 화살집', line('aspd', 4), line('projectilePctDmg', 10)),
        profile('먼 사냥꾼', line('projectilePctDmg', 10), line('resPen', 2)),
        profile('물러서며 쏘기', line('projectilePctDmg', 10), line('deflectChance', 2)),
        profile('깃 달린 독', line('projectilePctDmg', 10), line('poisonChance', 4)),
        profile('살촉 벼리기', line('projectilePctDmg', 10), line('physPctDmg', 10)),
        profile('세 발 메기기', line('projectilePctDmg', 10), line('crit', 1), line('targetProjectile', 1, { majorOnly: true, fixed: true })),
        profile('숨 멈춘 조준', line('crit', 1), line('accuracy', 40), line('projectilePctDmg', 10, { majorOnly: true, fixed: true }))
    ]),
    orb: Object.freeze([
        profile('떠도는 구슬', line('spellPctDmg', 10), line('energyShield', 10)),
        profile('구슬 속 불빛', line('spellPctDmg', 10), line('elementalPctDmg', 10)),
        profile('맑은 수정', line('energyShieldPct', 10), line('intelligence', 10)),
        profile('비어 있는 구체', line('chaosPctDmg', 10), line('spellPctDmg', 10)),
        profile('공명하는 구슬', line('spellPctDmg', 10), line('runeResonancePower', 1, { fixed: true })),
        profile('회전하는 구슬', line('spellFlatPct', 10), line('aspd', 4)),
        profile('구체의 보호', line('energyShieldPct', 10), line('elementalPctDmg', 10))
    ]),
    life: Object.freeze([
        profile('뛰는 심장', line('pctHp', 4), line('regen', 0.4)),
        profile('두꺼운 혈관', line('pctHp', 4), line('flatHp', 20)),
        profile('붉은 수액', line('pctHp', 4), line('leech', 0.2)),
        profile('끈질긴 목숨', line('pctHp', 4), line('resAll', 4)),
        profile('피로 버티기', line('pctHp', 4), line('dr', 1)),
        profile('숨 쉬는 몸', line('regen', 0.4), line('evasionPct', 10)),
        profile('생명의 칼날', line('pctHp', 4), line('meleePctDmg', 10)),
        profile('살아 있는 대가', line('pctHp', 4), line('pctDmg', 10)),
        profile('씩씩한 걸음', line('pctHp', 4), line('crit', 1))
    ]),
    wind: Object.freeze([
        profile('바람 타기', line('move', 2), line('evasionPct', 10)),
        profile('멈추지 않는 발', line('move', 2), line('aspd', 4)),
        profile('앞서 가는 걸음', line('move', 2), line('crit', 1)),
        profile('돌풍', line('move', 2), line('projectilePctDmg', 10)),
        profile('가벼운 짐', line('move', 2), line('regen', 0.4)),
        profile('순풍', line('move', 2), line('cooldownRecovery', 4))
    ]),
    precision: Object.freeze([
        profile('흔들리지 않는 손', line('accuracyBonusPct', 5), line('crit', 1)),
        profile('정확한 계산', line('accuracyBonusPct', 4), line('minDmgRoll', 2)),
        profile('한 치의 오차', line('minDmgRoll', 2), line('crit', 1)),
        profile('고른 칼날', line('minDmgRoll', 2), line('accuracy', 40)),
        profile('최고의 한 방', line('maxDmgRoll', 4), line('critDmg', 10)),
        profile('두 번의 행운', line('crit', 1), line('accuracy', 40))
    ]),
    deflect: Object.freeze([
        profile('칼날 흘리기', line('deflectChance', 2), line('meleePctDmg', 10)),
        profile('옆으로 비켜서기', line('deflectChance', 2), line('pctHp', 4)),
        profile('받아넘기기', line('deflectChance', 2), line('crit', 1)),
        profile('가벼운 손목', line('deflectChance', 2), line('aspd', 4)),
        profile('피할 틈', line('deflectChance', 2), line('move', 2)),
        profile('기울인 방패', line('deflectChance', 2), line('blockChance', 2))
    ]),
    // ---------------- 배경 문양에 맞춘 꾸러미 (js 그림이 아니라 트리 바닥에 깔리는 문양의 뜻을 따른다)
    bgFlame: Object.freeze([
        profile('마른 장작', line('firePctDmg', 10), line('ds', 2)),
        profile('불꽃 춤', line('firePctDmg', 10), line('move', 2)),
        profile('타오르는 눈', line('firePctDmg', 10), line('critDmg', 10)),
        profile('꺼지지 않는 심지', line('firePctDmg', 10), line('regen', 0.4)),
        profile('불길 속 걸음', line('resF', 6), line('firePctDmg', 10)),
        profile('재 밑의 열기', line('igniteChance', 4), line('ailmentDamagePct', 10))
    ]),
    bgIce: Object.freeze([
        profile('쌓인 얼음', line('coldPctDmg', 10), line('armorPct', 10)),
        profile('얼음 거울', line('coldPctDmg', 10), line('deflectChance', 2)),
        profile('고드름', line('coldPctDmg', 10), line('critDmg', 10)),
        profile('빙벽', line('resC', 6), line('armorPct', 10)),
        profile('얼음 밑의 물', line('coldPctDmg', 10), line('regen', 0.4)),
        profile('미끄러운 바닥', line('chillChance', 4), line('evasionPct', 10))
    ]),
    bgIceStorm: Object.freeze([
        profile('휘몰아치는 눈', line('coldPctDmg', 10), line('aoePctDmg', 10)),
        profile('칼바람', line('coldPctDmg', 10), line('ds', 2)),
        profile('눈보라 사냥', line('coldPctDmg', 10), line('projectilePctDmg', 10)),
        profile('하얗게 덮기', line('chillChance', 4), line('aoePctDmg', 10)),
        profile('폭풍의 눈', line('coldPctDmg', 10), line('move', 2))
    ]),
    bgLightning: Object.freeze([
        profile('벼락치기', line('lightPctDmg', 10), line('critDmg', 10)),
        profile('먹구름', line('lightPctDmg', 10), line('aoePctDmg', 10)),
        profile('피뢰침', line('resL', 6), line('pctHp', 4)),
        profile('번쩍이는 발', line('lightPctDmg', 10), line('evasionPct', 10)),
        profile('갈라지는 하늘', line('lightPctDmg', 10), line('ds', 2)),
        profile('들쭉날쭉한 전류', line('lightPctDmg', 10), line('maxDmgRoll', 4))
    ]),
    bgEarthquake: Object.freeze([
        profile('땅울림', line('slamEchoChance', 4), line('aoePctDmg', 10)),
        profile('뿌리째 흔들기', line('aoePctDmg', 10), line('physPctDmg', 10)),
        profile('꺼지는 땅', line('slamPctDmg', 10), line('pctHp', 4)),
        profile('거듭되는 진동', line('slamPctDmg', 10), line('ds', 2)),
        profile('지축의 힘', line('slamPctDmg', 10), line('strength', 10))
    ]),
    bgChaos: Object.freeze([
        profile('빨려드는 소용돌이', line('chaosPctDmg', 10), line('aoePctDmg', 10)),
        profile('뒤틀린 공간', line('chaosPctDmg', 10), line('move', 2)),
        profile('보랏빛 장막', line('chaosPctDmg', 10), line('energyShieldPct', 10)),
        profile('혼돈의 맥박', line('chaosPctDmg', 10), line('ds', 2)),
        profile('경계 허물기', line('resChaos', 6), line('energyShieldPct', 10)),
        profile('소용돌이 눈', line('chaosPctDmg', 10), line('critDmg', 10))
    ]),
    bgDevotionStar: Object.freeze([
        profile('별을 향한 맹세', line('elementalPctDmg', 10), line('devotion', 1, { fixed: true })),
        profile('별빛 순례', line('elementalPctDmg', 10), line('move', 2)),
        profile('다섯 갈래 빛', line('elementalPctDmg', 10), line('crit', 1)),
        profile('밤하늘의 서약', line('resAll', 4), line('spellPctDmg', 10)),
        profile('별빛 세례', line('elementalPctDmg', 10), line('regen', 0.4)),
        profile('떨어지는 별', line('elementalPctDmg', 10), line('aoePctDmg', 10))
    ]),
    bgSword: Object.freeze([
        profile('곧은 칼날', line('meleePctDmg', 10), line('accuracy', 40)),
        profile('칼끝 세우기', line('meleePctDmg', 10), line('critDmg', 10)),
        profile('한 손의 여유', line('meleePctDmg', 10), line('evasionPct', 10)),
        profile('검사의 호흡', line('meleePctDmg', 10), line('regen', 0.4)),
        profile('이어 베기', line('aspd', 4), line('meleePctDmg', 10)),
        profile('검의 길', line('meleePctDmg', 10), line('pctHp', 4))
    ]),
    bgDagger: Object.freeze([
        profile('그림자 칼날', line('crit', 1), line('evasionPct', 10), line('meleePctDmg', 10, { majorOnly: true, fixed: true })),
        profile('등 뒤의 칼', line('critDmg', 10), line('meleePctDmg', 10), line('evasionPct', 10, { majorOnly: true, fixed: true })),
        profile('독 묻은 끝', line('poisonChance', 4), line('meleePctDmg', 10)),
        profile('빠른 찌르기', line('aspd', 4), line('crit', 1)),
        profile('얇게 베기', line('bleedChance', 4), line('crit', 1)),
        profile('발목 긋기', line('dotPctDmg', 10), line('aspd', 4)),
        profile('칼 돌려 쥐기', line('ds', 2), line('crit', 1)),
        profile('숨은 독침', line('poisonChance', 4), line('crit', 1)),
        profile('암습', line('critDmg', 10), line('evasionPct', 10)),
        profile('단칼 마무리', line('meleePctDmg', 10), line('crit', 1)),
        profile('소매 속 칼', line('meleePctDmg', 10), line('dexterity', 10)),
        profile('칼끝의 독기', line('poisonDamageMultiplierPct', 10), line('aspd', 4)),
        profile('핏줄 찾기', line('bleedChance', 4), line('meleePctDmg', 10)),
        profile('뒤에서 찌르기', line('physIgnore', 2), line('critDmg', 10))
    ]),
    bgShield: Object.freeze([
        profile('들어 올린 방패', line('blockChance', 2), line('resAll', 4)),
        profile('방패 벽', line('blockChance', 2), line('takenDamageReduceWhen2EnemiesPct', 4)),
        profile('방패 끝 타격', line('shieldPctDmg', 10), line('meleePctDmg', 10)),
        profile('막아 낸 힘', line('blockChance', 2), line('regen', 0.4)),
        profile('앞으로 미는 방패', line('shieldPctDmg', 10), line('move', 2))
    ]),
    bgArmour: Object.freeze([
        profile('사슬 갑옷', line('armorPct', 10), line('evasionPct', 10)),
        profile('판금 조임', line('armorPct', 10), line('resAll', 4)),
        profile('녹슨 훈장', line('armorPct', 10), line('physPctDmg', 10)),
        profile('무거운 투구', line('dr', 1), line('pctHp', 4)),
        profile('달군 갑옷', line('armorPct', 10), line('physTakenAsFire', 4)),
        profile('전쟁 장비', line('armorPct', 10), line('strength', 10))
    ]),
    bgProtectionCircle: Object.freeze([
        profile('둘러친 원', line('energyShieldPct', 10), line('armorPct', 10)),
        profile('결계의 끝', line('resAll', 4), line('energyShieldPct', 10), line('maxResAll', 1, { majorOnly: true, fixed: true })),
        profile('안쪽에 머물기', line('energyShieldPct', 10), line('takenDamageReduceWhen1EnemyPct', 4)),
        profile('원 밖으로 밀기', line('energyShieldPct', 10), line('aoePctDmg', 10)),
        profile('결계 기술자', line('energyShieldRegen', 10), line('resAll', 4))
    ]),
    bgArcaneCircle: Object.freeze([
        profile('그어 놓은 원', line('spellFlatPct', 10), line('aoePctDmg', 10)),
        profile('룬 새김', line('spellPctDmg', 10), line('runeResonancePower', 1, { fixed: true })),
        profile('걷는 마법진', line('spellPctDmg', 10), line('move', 2)),
        profile('겹쳐 그린 문양', line('spellPctDmg', 10), line('crit', 1)),
        profile('마력의 통로', line('spellFlatPct', 10), line('crit', 1)),
        profile('식지 않는 잉크', line('spellPctDmg', 10), line('cooldownRecovery', 4))
    ]),
    bgHolyConstellation: Object.freeze([
        profile('성좌의 보호', line('energyShieldPct', 10), line('blockChance', 2)),
        profile('별자리 잇기', line('elementalPctDmg', 10), line('energyShieldPct', 10)),
        profile('빛의 계단', line('pctHp', 4), line('energyShieldPct', 10)),
        profile('새벽 기도', line('regen', 0.4), line('energyShieldRegen', 10)),
        profile('성스러운 표식', line('pctDmg', 10), line('energyShieldPct', 10))
    ]),
    bgTree: Object.freeze([
        profile('세계수의 수액', line('pctHp', 4), line('pctDmg', 10)),
        profile('뿌리 내리기', line('flatHp', 20), line('resAll', 4)),
        profile('잎맥 따라', line('regen', 0.4), line('move', 2)),
        profile('가지 뻗기', line('pctDmg', 10), line('aoePctDmg', 10)),
        profile('오래된 나이테', line('pctDmg', 10), line('crit', 1)),
        profile('마른 가지의 힘', line('pctDmg', 10), line('aspd', 4)),
        profile('수관의 그늘', line('evasionPct', 10), line('pctDmg', 10)),
        profile('뿌리의 무게', line('pctDmg', 10), line('armorPct', 10))
    ]),
    bgShockwave: Object.freeze([
        profile('퍼져 나가는 힘', line('aoePctDmg', 10), line('flatDmg', 2)),
        profile('귀 먹먹한 울림', line('aoePctDmg', 10), line('shockChance', 4)),
        profile('한가운데 서기', line('aoePctDmg', 10), line('armorPct', 10)),
        profile('돌아오는 충격', line('aoePctDmg', 10), line('ds', 2)),
        profile('부서지는 앞줄', line('aoePctDmg', 10), line('critDmg', 10))
    ]),
    bgBlood: Object.freeze([
        profile('한 방울의 대가', line('leech', 0.2), line('physPctDmg', 10)),
        profile('붉은 손', line('bleedChance', 4), line('flatDmg', 2)),
        profile('피 마시기', line('leech', 0.2), line('leechTotalCap', 2)),
        profile('피가 끓는 전사', line('pctHp', 4), line('bleedChance', 4)),
        profile('굳지 않는 피', line('dotPctDmg', 10), line('leech', 0.2)),
        profile('핏방울 튀기기', line('bleedChance', 4), line('aoePctDmg', 10))
    ]),
    bgPoisonSkull: Object.freeze([
        profile('해골 속 독', line('poisonDamageMultiplierPct', 10), line('chaosPctDmg', 10)),
        profile('입에서 입으로', line('poisonChance', 4), line('aoePctDmg', 10)),
        profile('죽음의 입김', line('poisonDamageMultiplierPct', 10), line('ailmentPotencyPct', 4)),
        profile('해독된 몸', line('resChaos', 6), line('regen', 0.4)),
        profile('굶주린 독', line('poisonChance', 4), line('critDmg', 10)),
        profile('뼛속까지', line('poisonChance', 4), line('physIgnore', 2))
    ]),
    bgCenser: Object.freeze([
        profile('연기 피우기', line('aoePctDmg', 10), line('elementalPctDmg', 10)),
        profile('향로 돌리기', line('meleePctDmg', 10), line('elementalPctDmg', 10)),
        profile('향 내음', line('regen', 0.4), line('aoePctDmg', 10)),
        profile('재 뿌리기', line('igniteChance', 4), line('aoePctDmg', 10)),
        profile('울리는 사슬', line('meleePctDmg', 10), line('shockChance', 4)),
        profile('기도문 외우기', line('meleePctDmg', 10), line('devotion', 1, { fixed: true }))
    ]),
    bgBow: Object.freeze([
        profile('과녁 뚫기', line('projectilePctDmg', 10), line('crit', 1)),
        profile('활 쥔 손', line('projectilePctDmg', 10), line('dexterity', 10)),
        profile('휘어지는 활대', line('projectilePctDmg', 10), line('minDmgRoll', 2)),
        profile('화살비', line('projectilePctDmg', 10), line('aoePctDmg', 10)),
        profile('시위 소리', line('projectilePctDmg', 10), line('ds', 2))
    ]),
    bgFlask: Object.freeze([
        profile('약병 흔들기', line('potionPctDmg', 10), line('ds', 2)),
        profile('끓는 플라스크', line('potionPctDmg', 10), line('igniteChance', 4)),
        profile('깨끗한 증류', line('potionPctDmg', 10), line('regen', 0.4)),
        profile('뚜껑 열기', line('potionPctDmg', 10), line('shockChance', 4)),
        profile('두꺼운 유리벽', line('potionPctDmg', 10), line('armorPct', 10))
    ]),
    bgFist: Object.freeze([
        profile('맨손 버릇', line('flatDmg', 2), line('aspd', 4)),
        profile('뼈 치기', line('flatDmg', 2), line('crit', 1)),
        profile('앞으로 나선 주먹', line('physPctDmg', 10), line('pctHp', 4)),
        profile('단단한 손마디', line('flatDmg', 2), line('armorPct', 10)),
        profile('치고 빠지기', line('physPctDmg', 10), line('move', 2))
    ]),
    bgRunner: Object.freeze([
        profile('숨찬 달리기', line('move', 2), line('pctHp', 4)),
        profile('앞지르기', line('move', 2), line('meleePctDmg', 10)),
        profile('발자국 지우기', line('move', 2), line('deflectChance', 2)),
        profile('도망자의 여유', line('move', 2), line('resAll', 4)),
        profile('긴 호흡', line('move', 2), line('energyShieldPct', 10))
    ]),
    bgScales: Object.freeze([
        profile('기울지 않는 저울', line('resAll', 4), line('pctHp', 4)),
        profile('맞바꾼 피', line('pctDmg', 10), line('crit', 1), line('pctHp', -6, { majorOnly: true, fixed: true })),
        profile('불과 얼음의 저울', line('resF', 6), line('resC', 6)),
        profile('세 접시', line('resL', 6), line('resChaos', 6)),
        profile('균형 잡힌 손', line('resAll', 4), line('crit', 1)),
        profile('무게 달기', line('resAll', 4), line('pctDmg', 10))
    ]),
    bgAlchemyFlask: Object.freeze([
        profile('변성의 불씨', line('potionPctDmg', 10), line('chaosPctDmg', 10)),
        profile('녹이는 약', line('potionPctDmg', 10), line('resPen', 2)),
        profile('현자의 찌꺼기', line('potionPctDmg', 10), line('ailmentPotencyPct', 4)),
        profile('증류 순서', line('potionPctDmg', 10), line('cooldownRecovery', 4)),
        profile('뒤집힌 플라스크', line('potionPctDmg', 10), line('evasionPct', 10))
    ]),
    bgRock: Object.freeze([
        profile('바위 피부', line('armorPct', 10), line('regen', 0.4)),
        profile('굴러오는 돌', line('slamPctDmg', 10), line('move', 2)),
        profile('돌 던지기', line('physPctDmg', 10), line('projectilePctDmg', 10)),
        profile('부서지지 않는', line('dr', 1), line('regen', 0.4)),
        profile('깎인 돌', line('armorPct', 10), line('physIgnore', 2))
    ]),
    bgPalm: Object.freeze([
        profile('내미는 손', line('regen', 0.4), line('energyShieldPct', 10)),
        profile('따뜻한 손', line('flatHp', 20), line('regen', 0.4)),
        profile('밀어내는 손', line('regen', 0.4), line('deflectChance', 2)),
        profile('손금 읽기', line('regen', 0.4), line('crit', 1)),
        profile('맞잡은 손', line('regen', 0.4), line('summonEfficiency', 4))
    ]),
    bgEye: Object.freeze([
        profile('꿰뚫어 보기', line('accuracyBonusPct', 5), line('critDmg', 10)),
        profile('약점 찾기', line('crit', 1), line('resPen', 2)),
        profile('감기지 않는 눈', line('crit', 1), line('energyShieldPct', 10)),
        profile('먼저 본 사람', line('accuracyBonusPct', 5), line('evasionPct', 10)),
        profile('눈앞의 진실', line('accuracyBonusPct', 5), line('mystique', 1, { fixed: true })),
        profile('보이는 길', line('accuracyBonusPct', 4), line('crit', 1))
    ]),
    bgCrown: Object.freeze([
        profile('왕의 위엄', line('strength', 10), line('intelligence', 10)),
        profile('두 왕국', line('dexterity', 10), line('intelligence', 10)),
        profile('세 갈래 혈통', line('strength', 10), line('dexterity', 10)),
        profile('왕관의 무게', line('pctDmg', 10), line('resAll', 4)),
        profile('내리는 명령', line('pctDmg', 10), line('summonPctDmg', 10)),
        profile('권좌의 룬', line('pctDmg', 10), line('gemLevel', 1, { majorOnly: true, fixed: true }))
    ]),
    bgChains: Object.freeze([
        profile('끊기지 않는 사슬', line('summonPctDmg', 10), line('armorPct', 10)),
        profile('묶인 권속', line('summonHpPct', 10), line('summonGuardRedirectPct', 4)),
        profile('끌어당기는 쇠', line('meleePctDmg', 10), line('takenDamageReduceWhen1EnemyPct', 4)),
        profile('쇠사슬 채찍', line('bleedChance', 4), line('armorPct', 10)),
        profile('족쇄 찬 적', line('chillChance', 4), line('physPctDmg', 10)),
        profile('묶어 두기', line('takenDamageReduceWhen1EnemyPct', 4), line('bleedChance', 4))
    ]),
    bgWings: Object.freeze([
        profile('활짝 편 날개', line('mobilityPctDmg', 10), line('move', 2)),
        profile('높이 날기', line('evasionPct', 10), line('mobilityCooldownRecovery', 6)),
        profile('깃털 떨어뜨리기', line('evasionPct', 10), line('projectilePctDmg', 10)),
        profile('하강', line('mobilityPctDmg', 10), line('critDmg', 10)),
        profile('날갯바람', line('move', 2), line('aoePctDmg', 10)),
        profile('가벼운 깃', line('evasionPct', 10), line('resAll', 4))
    ]),
    bgEnergyShield: Object.freeze([
        profile('한 겹 더', line('energyShieldPct', 10), line('resAll', 4)),
        profile('보호막 고치기', line('energyShieldRegen', 10), line('regen', 0.4)),
        profile('쪼개진 빛', line('energyShieldPct', 10), line('ds', 2)),
        profile('푸른 고리', line('energyShieldPct', 10), line('evasionPct', 10)),
        profile('튕겨 나는 빛', line('energyShieldPct', 10), line('crit', 1)),
        profile('장막의 칼날', line('energyShieldPct', 10), line('meleePctDmg', 10))
    ]),
    bgHourglass: Object.freeze([
        profile('흘러내린 모래', line('cooldownReduction', 5, { fixed: true }), line('aspd', 4)),
        profile('뒤집은 모래시계', line('cooldownRecovery', 4), line('cycle', 1, { fixed: true })),
        profile('느려지는 시간', line('cooldownRecovery', 4), line('chillChance', 4)),
        profile('남은 모래', line('cooldownRecovery', 4), line('pctHp', 4)),
        profile('한 알의 시간', line('cooldownRecovery', 4), line('crit', 1)),
        profile('기다림의 보상', line('cooldownReduction', 5, { fixed: true }), line('critDmg', 10))
    ]),
    bgChalice: Object.freeze([
        profile('넘치는 잔', line('flatHp', 20), line('leech', 0.2)),
        profile('성배의 피', line('leech', 0.2), line('resAll', 4)),
        profile('나눠 마시기', line('pctHp', 4), line('summonHpPct', 10)),
        profile('마른 잔', line('leech', 0.2), line('crit', 1)),
        profile('축복의 술', line('regen', 0.4), line('devotion', 1, { fixed: true })),
        profile('잔을 든 손', line('pctHp', 4), line('spellFlatPct', 10))
    ]),
    bgKnotTriangle: Object.freeze([
        profile('세 꼭짓점', line('pctDmg', 10), line('armorPct', 10), line('aspd', 4, { majorOnly: true, fixed: true })),
        profile('세모 방패', line('armorPct', 10), line('energyShieldPct', 10)),
        profile('세 갈래 매듭', line('pctHp', 4), line('aspd', 4)),
        profile('모서리 세우기', line('critDmg', 10), line('armorPct', 10)),
        profile('세 번째 꼭짓점', line('meleePctDmg', 10), line('spellPctDmg', 10))
    ]),
    bgKnotSquare: Object.freeze([
        profile('네 귀퉁이', line('evasionPct', 10), line('resAll', 4), line('pctHp', 4, { majorOnly: true, fixed: true })),
        profile('단단한 사각', line('armorPct', 10), line('evasion', 20)),
        profile('반듯한 손', line('accuracyBonusPct', 5), line('armorPct', 10)),
        profile('네모 방벽', line('dr', 1), line('blockChance', 2)),
        profile('곧은 매듭', line('flatDmg', 2), line('accuracy', 40))
    ]),
    bgKnotDiamond: Object.freeze([
        profile('단단한 결정', line('armorPct', 10), line('critDmg', 10)),
        profile('빛나는 결', line('crit', 1), line('armorPct', 10)),
        profile('마름모 베기', line('physPctDmg', 10), line('crit', 1)),
        profile('뾰족한 끝', line('physIgnore', 2), line('critDmg', 10)),
        profile('깎인 모서리', line('armorPct', 10), line('crit', 1))
    ]),
    bgKnotCross: Object.freeze([
        profile('엇갈린 칼', line('physPctDmg', 10), line('ds', 2)),
        profile('십자 베기', line('physPctDmg', 10), line('crit', 1)),
        profile('교차점', line('physIgnore', 2), line('aspd', 4)),
        profile('십자 매듭 방패', line('physPctDmg', 10), line('armorPct', 10)),
        profile('엇갈린 발', line('physPctDmg', 10), line('evasionPct', 10))
    ]),
    bgKnotDoubleBraid: Object.freeze([
        profile('두 번 엮기', line('ds', 2), line('aspd', 4)),
        profile('쌍둥이 매듭', line('crit', 1), line('ds', 2)),
        profile('겹친 실', line('ds', 2), line('pctDmg', 10)),
        profile('이중 고리', line('ds', 2), line('armorPct', 10)),
        profile('한 번 더', line('ds', 2), line('critDmg', 10))
    ]),
    bgKnotTripleBraid: Object.freeze([
        profile('세 가닥 원소', line('elementalPctDmg', 10), line('ds', 2)),
        profile('세 가닥 힘', line('firePctDmg', 10), line('coldPctDmg', 10), line('lightPctDmg', 10, { majorOnly: true, fixed: true })),
        profile('삼색 실', line('resF', 6), line('resL', 6)),
        profile('세 겹 실', line('addedFireDamagePct', 2), line('addedColdDamagePct', 2)),
        profile('땋은 번개', line('lightPctDmg', 10), line('coldPctDmg', 10))
    ]),
    bgKnotHeart: Object.freeze([
        profile('뛰는 매듭', line('pctHp', 4), line('physPctDmg', 10)),
        profile('심장 묶기', line('pctHp', 4), line('armorPct', 10)),
        profile('뜨거운 고동', line('pctHp', 4), line('firePctDmg', 10)),
        profile('붉은 실', line('pctHp', 4), line('bleedChance', 4)),
        profile('심장 소리', line('pctHp', 4), line('move', 2))
    ]),
    bgKnotSerpent: Object.freeze([
        profile('똬리 튼 독', line('poisonChance', 4), line('dotPctDmg', 10)),
        profile('허물 벗기', line('regen', 0.4), line('resChaos', 6)),
        profile('뱀의 머리', line('chaosPctDmg', 10), line('evasionPct', 10)),
        profile('미끄러지는 몸', line('evasionPct', 10), line('poisonDamageMultiplierPct', 10)),
        profile('조여 오는 매듭', line('dotPctDmg', 10), line('takenDamageReduceWhen1EnemyPct', 4)),
        profile('독니 세우기', line('poisonChance', 4), line('move', 2))
    ]),
    bgKnotStar: Object.freeze([
        profile('별 엮기', line('spellPctDmg', 10), line('critDmg', 10)),
        profile('다섯 실', line('spellFlatPct', 10), line('aspd', 4)),
        profile('직조된 주문', line('spellPctDmg', 10), line('minDmgRoll', 2)),
        profile('빛나는 매듭', line('spellPctDmg', 10), line('energyShieldRegen', 10)),
        profile('별 끝의 바늘', line('spellFlatPct', 10), line('resAll', 4))
    ]),
    bgKnotShield: Object.freeze([
        profile('지키는 고리', line('deflectChance', 2), line('armorPct', 10)),
        profile('감싸는 실', line('takenDamageReduceWhen2EnemiesPct', 4), line('pctHp', 4)),
        profile('단단한 고리', line('takenDamageReduceWhen1EnemyPct', 4), line('armorPct', 10)),
        profile('지키는 손', line('blockChance', 2), line('evasionPct', 10)),
        profile('막아 선 매듭', line('deflectChance', 2), line('resAll', 4))
    ]),
    bgKnotLife: Object.freeze([
        profile('돋아나는 실', line('regen', 0.4), line('aspd', 4)),
        profile('살아남은 자', line('pctHp', 4), line('critDmg', 10)),
        profile('이어지는 숨', line('regen', 0.4), line('cooldownRecovery', 4)),
        profile('푸른 잎', line('pctHp', 4), line('energyShieldRegen', 10)),
        profile('생기 잇기', line('leech', 0.2), line('regen', 0.4))
    ]),
    bgKnotLinked: Object.freeze([
        profile('이어진 고리', line('aspd', 4), line('pctHp', 4)),
        profile('고리 돌리기', line('aspd', 4), line('ds', 2)),
        profile('맞물린 고리', line('aspd', 4), line('armorPct', 10)),
        profile('세 번의 손놀림', line('aspd', 4), line('critDmg', 10)),
        profile('사슬 같은 연격', line('aspd', 4), line('physPctDmg', 10))
    ])
});

/** 노드에 고른 아이콘이 뜻하는 꾸러미 주제. 비공허 아이콘만 있다. */
const ICON_ARCHETYPES = Object.freeze({
    blade: 'melee', greatsword: 'weaponGreatsword', projectile: 'projectile', bow: 'weaponBow', shield: 'shield', potion: 'potion', strength: 'strength', dexterity: 'dexterity', intelligence: 'intelligence',
    mystique: 'mystique', devotion: 'devotion', cycle: 'cycle', elemental: 'elemental', chaos: 'chaos', life: 'life', arcane: 'spell', spell: 'spell', summon: 'summon', precision: 'precision',
    wind: 'wind', constellation: 'bgHolyConstellation', fire: 'fire', cold: 'cold', lightning: 'lightning', cooldown: 'cooldown', critical: 'critical', armor: 'armor', evasion: 'evasion',
    energyShield: 'energyShield', ignite: 'ignite', chill: 'chill', freeze: 'freeze', shock: 'shock', bleed: 'bleed', poison: 'poison', wisp: 'wisp', blessing: 'blessing', mobility: 'mobility',
    area: 'area', slam: 'slam', damageOverTime: 'damageOverTime', censer: 'weaponCenser', orb: 'weaponOrb'
});
/** 배경 문양(passive-tree-background-motifs.js)마다 어울리는 꾸러미 주제. 앞의 주제일수록 그 문양의 뜻에 가깝다. */
const MOTIF_ARCHETYPES = Object.freeze({
    flame: ['bgFlame', 'fire', 'ignite'], ice: ['bgIce', 'cold', 'freeze'], 'ice-storm': ['bgIceStorm', 'chill', 'cold'], lightning: ['bgLightning', 'lightning', 'shock'],
    earthquake: ['bgEarthquake', 'slam', 'area'], chaos: ['bgChaos', 'chaos', 'damageOverTime'], 'devotion-star': ['bgDevotionStar', 'elemental', 'devotion'], sword: ['bgSword', 'melee', 'critical'],
    dagger: ['bgDagger', 'critical', 'bleed', 'poison'], shield: ['bgShield', 'shield', 'deflect'], armour: ['bgArmour', 'armor'], 'protection-circle': ['bgProtectionCircle', 'energyShield'],
    'arcane-circle': ['bgArcaneCircle', 'spell', 'area'], 'holy-constellation': ['bgHolyConstellation', 'blessing', 'energyShield'], tree: ['bgTree', 'life'], shockwave: ['bgShockwave', 'area', 'slam'],
    blood: ['bgBlood', 'bleed'], 'poison-skull': ['bgPoisonSkull', 'poison'], censer: ['weaponCenser', 'bgCenser', 'censer'], bow: ['weaponBow', 'bgBow', 'bow', 'projectile'], flask: ['weaponFlask', 'bgFlask', 'potion', 'damageOverTime'],
    fist: ['bgFist', 'physical'], runner: ['bgRunner', 'wind', 'mobility'], scales: ['bgScales', 'elemental'], 'alchemy-flask': ['bgAlchemyFlask', 'potion', 'ailment'], rock: ['bgRock', 'armor', 'slam'],
    palm: ['bgPalm', 'life', 'blessing'], eye: ['bgEye', 'precision', 'critical'], crown: ['bgCrown', 'strength', 'intelligence', 'dexterity'], chains: ['bgChains', 'summon', 'bleed'],
    wings: ['bgWings', 'mobility', 'wind'], 'energy-shield': ['bgEnergyShield', 'energyShield'], hourglass: ['bgHourglass', 'cooldown'], chalice: ['bgChalice', 'life', 'devotion'],
    'knot-triangle': ['bgKnotTriangle', 'life'], 'knot-square': ['bgKnotSquare', 'armor'], 'knot-diamond': ['bgKnotDiamond', 'armor'], 'knot-cross': ['bgKnotCross', 'physical'],
    'knot-double-braid': ['bgKnotDoubleBraid', 'melee'], 'knot-triple-braid': ['bgKnotTripleBraid', 'elemental'], 'knot-heart': ['bgKnotHeart', 'life'], 'knot-serpent': ['bgKnotSerpent', 'poison'],
    'knot-star': ['bgKnotStar', 'spell'], 'knot-shield': ['bgKnotShield', 'deflect', 'shield'], 'knot-life': ['bgKnotLife', 'life'], 'knot-linked': ['bgKnotLinked', 'melee']
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
    ARCHETYPE_PROFILES, ICON_ARCHETYPES, MOTIF_ARCHETYPES, CATEGORY_NOUNS, PASSIVE_TYPE_MULTIPLIER, ASSIST_DAMAGE_MULTIPLIER, STAT_META, ZONE_ADJECTIVES, ZONE_PALETTES,
    isAllAttributesEffects, isReadablePassiveValue, normalizePassiveValue, passiveValueStep, scalePassiveLine
};
