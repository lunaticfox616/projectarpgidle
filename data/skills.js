if (typeof safeExposeData !== 'function') throw new Error('data/constants.js must load before data/skills.js');

// 투사체 '추가 발사'(장비/패시브/유니크/부적으로 얻는 보너스 샷)의 기본 피해 비율(%).
// 과거에는 보너스 샷이 100% 피해로 반복되어 추가 발사 +5 = DPS ×6이라는 천장 뚫는 곱연산이 됐다.
// 이제 보너스 샷은 기본적으로 기본 타격의 이 비율만큼만 피해를 준다(추가 발사 +5 = ×3.0).
// 스킬이 extraProjectileDamagePct를 직접 정의하면(예: 연발 사격 45) 그 값이 우선한다.
const PROJECTILE_BONUS_SHOT_DAMAGE_PCT = 40;

// 투사체의 기본/변경 발사 방식. 실제 판정과 툴팁이 함께 소비하는 단일 정의다.
const PROJECTILE_PATTERN_MODE_DB = Object.freeze({
    pierce: { label: '직선 관통' },
    chain: { label: '연쇄 투척' },
    fan: { label: '부채꼴 연사' },
    delayedBlast: { label: '관통 후 지연 폭발' },
    split: { label: '삼갈래 분산', kind: 'fan', rays: 3, targetMode: 'spread', minTargets: 3, damageMultiplier: 0.72, extraProjectileDamagePct: 45 },
    focus: { label: '단일 집속', kind: 'line', targetMode: 'single', targetLimit: 1, damageMultiplier: 1.55, extraProjectileDamagePct: 40 },
    return: { label: '귀환 궤도', kind: 'line', targetMode: 'pierce', damageMultiplier: 0.9, combatPattern: { kind: 'boomerang', returnDelayMs: 160 } }
});

// Phase-1 extracted data (global compatibility).
const SKILL_DB = {
    '기본 공격': { isGem: false, levelable: true, baseDmg: 1.0, baseSpd: 1.0, dmgScale: 0.05, spdScale: 0.01, leech: 0, crit: 0, ele: 'phys', targetMode: 'single', targets: 1, desc: '가장 가까운 적 하나를 가격합니다. 레벨업당 피해 배율 +5%, 공격 속도 +1%가 적용됩니다.', tags: ['attack', 'melee', 'physical'] },
    '연속 베기': { isGem: true, baseDmg: 0.45, baseSpd: 1.8, leech: 0, crit: 0, dmgScale: 0.03, spdScale: 0.04, ele: 'phys', multiHit: 2, repeatHitDamagePct: 45, targetMode: 'cleave', targets: 2, desc: '빠르게 두 번 벱니다. 두 번째 베기는 첫 타격 피해의 45%를 줍니다.', tags: ['attack', 'melee', 'physical'] },
    '묵직한 강타': { isGem: true, baseDmg: 2.5, baseSpd: 0.5, leech: 0, crit: 5, dmgScale: 0.15, spdScale: 0, ele: 'phys', targetMode: 'single', targets: 1, aftershockDamagePct: 38, aftershockDelayMs: 420, desc: '총 피해의 62%를 본 타격으로 주고, 0.42초 후 나머지 38%를 여진으로 가합니다.', tags: ['attack', 'melee', 'physical', 'slam'] },
    '흡혈 타격': { isGem: true, baseDmg: 0.95, baseSpd: 1.0, leech: 0.5, instantLeech: true, crit: 0, dmgScale: 0.04, spdScale: 0, ele: 'chaos', targetMode: 'single', targets: 1, desc: '카오스 피해와 흡혈이 붙은 일격입니다. 이 젬을 사용해서 주는 피해에는 흡혈이 즉시 적용됩니다.', tags: ['attack', 'melee', 'chaos'] },
    '암살자의 일격': { isGem: true, baseDmg: 1.35, baseSpd: 0.9, leech: 0, crit: 15, dmgScale: 0.05, spdScale: 0.01, ele: 'phys', fullLifeDamageMorePct: 35, targetMode: 'single', targets: 1, desc: '생명력이 가득 찬 적에게 35% 증폭된 피해를 주는 선제 처형기입니다.', tags: ['attack', 'melee', 'physical'] },
    '회오리바람': { isGem: true, baseDmg: 0.34, baseSpd: 1.65, leech: 0, crit: 0, dmgScale: 0.014, spdScale: 0.04, ele: 'phys', crowdDamageMorePerEnemyPct: 4, crowdDamageMoreCapPct: 28, targetMode: 'whirl', targets: 8, desc: '주변을 순차 타격하며, 자신을 포위한 적 한 기당 피해가 4%씩 최대 28% 증폭됩니다.', tags: ['attack', 'melee', 'physical', 'aoe'] },
    '번개 타격': { isGem: true, baseDmg: 1.15, baseSpd: 1.15, leech: 0, crit: 5, dmgScale: 0.06, spdScale: 0.03, ele: 'light', chainStepDamagePct: -12, ailmentChanceBonus: { shock: 25 }, targetMode: 'chain', targets: 3, desc: '첫 대상을 강하게 타격한 뒤 연쇄됩니다. 도약마다 피해가 12% 감소하고 감전 확률이 25% 증가합니다.', tags: ['attack', 'melee', 'elemental', 'lightning', 'chain'] },
    '얼음 창': { isGem: true, baseDmg: 1.7, baseSpd: 0.75, leech: 0, crit: 8, critScale: 0.5, dmgScale: 0.1, spdScale: 0, ele: 'cold', projectileTravelTimeMultiplier: 0.28, projectilePattern: { mode: 'pierce', kind: 'line' }, targetMode: 'pierce', targets: 2, desc: '매우 빠른 빙창이 적 둘을 꿰뚫습니다. 추가 치명타는 젬 레벨에 따라 성장합니다.', tags: ['attack', 'projectile', 'elemental', 'cold'] },
    '화염 참격': { isGem: true, baseDmg: 1.16, baseSpd: 1.05, leech: 0, crit: 5, dmgScale: 0.065, spdScale: 0.02, ele: 'fire', targetMode: 'cleave', targets: 2, ailmentChanceBonus: { ignite: 25 }, activeAilmentDamageMore: { type: 'ignite', pct: 15 }, desc: '점화 확률 +25%. 점화 중인 적에게 주는 적중 피해가 15% 증폭됩니다.', tags: ['attack', 'melee', 'elemental', 'fire'] },
    '독창 투척': { isGem: true, baseDmg: 0.92, baseSpd: 1.15, leech: 0, crit: 8, dmgScale: 0.045, spdScale: 0.03, ele: 'chaos', projectilePattern: { mode: 'chain', kind: 'chain' }, targetMode: 'chain', targets: 2, ailmentChanceBonus: { poison: 30 }, ailmentSpreadOnHit: { type: 'poison', chance: 0.65, targets: 1 }, desc: '중독 확률 +30%. 중독된 적을 적중하면 65% 확률로 다른 적 하나에게 중독을 전파합니다.', tags: ['attack', 'projectile', 'chaos'] },
    '서리 폭발': { isGem: true, baseDmg: 1.45, baseSpd: 0.8, leech: 0, crit: 12, dmgScale: 0.09, spdScale: 0.01, ele: 'cold', ailmentChanceBonus: { chill: 100, freeze: 25 }, activeAilmentDamageMore: { type: 'freeze', pct: 20 }, targetMode: 'all', targets: 99, desc: '전장을 냉각시키고 동결 확률이 25% 증가합니다. 이미 동결된 적에게 주는 피해가 20% 증폭됩니다.', tags: ['attack', 'aoe', 'elemental', 'cold'] },
    '번개 창': { isGem: true, baseDmg: 1.4, baseSpd: 0.95, leech: 0, crit: 10, dmgScale: 0.08, spdScale: 0.02, ele: 'light', projectilePattern: { mode: 'pierce', kind: 'line' }, distanceDamageMorePerCellPct: 6, distanceDamageMoreCapPct: 30, ailmentChanceBonus: { shock: 20 }, targetMode: 'pierce', targets: 3, desc: '거리가 한 칸 멀어질 때마다 피해가 6%씩 최대 30% 증폭되는 관통 번개 창입니다.', tags: ['attack', 'projectile', 'elemental', 'lightning'] },
    '지진 파쇄': { isGem: true, baseDmg: 1.9, baseSpd: 0.6, leech: 0, crit: 0, dmgScale: 0.11, spdScale: 0.01, ele: 'phys', targetMode: 'all', targets: 99, aftershockDamagePct: 42, aftershockDelayMs: 460, desc: '총 피해의 58%로 지면을 깨뜨리고, 0.46초 후 나머지 42%를 범위 여진으로 가합니다.', tags: ['attack', 'melee', 'physical', 'aoe', 'slam'] },
    '용암 강타': { isGem: true, baseDmg: 1.55, baseSpd: 0.82, leech: 0, crit: 4, dmgScale: 0.08, spdScale: 0.02, ele: 'fire', targetMode: 'cleave', targets: 3, aftershockDamagePct: 30, aftershockDelayMs: 340, desc: '총 피해의 70%로 전방을 휩쓴 뒤 0.34초 후 나머지 30%가 용암 여진으로 폭발합니다.', tags: ['attack', 'melee', 'elemental', 'fire', 'aoe', 'slam'] },
    '관통 사격': { isGem: true, baseDmg: 1.25, baseSpd: 1.08, leech: 0, crit: 7, dmgScale: 0.07, spdScale: 0.03, ele: 'phys', projectilePattern: { mode: 'pierce', kind: 'line' }, targetMode: 'pierce', targets: 4, pierceOverkillCarry: true, desc: '각 원본 타겟의 처치 후 남은 피해가 다른 적에게 이어지고, 전달 피해가 다시 초과되면 연속 관통합니다. 전이될 때마다 전달 피해가 80%로 감쇄합니다.', tags: ['attack', 'projectile', 'physical'] },
    '연쇄 폭풍': { isGem: true, baseDmg: 1.3, baseSpd: 1.0, leech: 0, crit: 9, dmgScale: 0.08, spdScale: 0.02, ele: 'light', chainStepDamagePct: 12, ailmentChanceBonus: { shock: 15 }, targetMode: 'chain', targets: 4, desc: '연쇄될수록 폭풍이 거세져 도약마다 피해가 12% 증가합니다. 감전 확률도 15% 증가합니다.', tags: ['attack', 'elemental', 'lightning', 'chain'] },
    '공허 베기': { isGem: true, baseDmg: 1.5, baseSpd: 0.92, leech: 0.4, crit: 6, dmgScale: 0.08, spdScale: 0.01, ele: 'chaos', ailmentChanceBonus: { poison: 25 }, activeAilmentDamageMore: { type: 'poison', pct: 18 }, targetMode: 'cleave', targets: 3, desc: '중독 확률이 25% 증가하며, 중독된 적에게 주는 피해가 18% 증폭되는 공허의 참격입니다.', tags: ['attack', 'melee', 'chaos', 'aoe'] },
    '혈기 폭쇄': { isGem: true, baseDmg: 1.1, baseSpd: 0.95, leech: 0.2, crit: 4, dmgScale: 0.06, spdScale: 0.02, ele: 'phys', targetMode: 'single', targets: 1, hpDmgScale: 0.000175, desc: '최대 생명력이 높을수록 추가 피해를 주는 일격입니다.', tags: ['attack', 'melee', 'physical', 'blood'] },
    '불멸의 진동': { isGem: true, baseDmg: 1.0, baseSpd: 0.9, leech: 0, crit: 3, dmgScale: 0.05, spdScale: 0.02, hpDmgScale: 0.000125, regenDmgScale: 4.2, desc: '생명력과 재생력을 피해로 전환하는 충격파입니다.', ele: 'phys', targetMode: 'cleave', targets: 4, tags: ['attack', 'aoe', 'physical'] },
    '화염 부패': { isGem: true, baseDmg: 0.42, baseSpd: 0.78, leech: 0, crit: 0, dmgScale: 0.03, spdScale: 0.01, ele: 'fire', targetMode: 'all', targets: 99, hpDmgScale: 0.00009, fireResOvercapMulPerPct: 0.1, fireResOvercapCap: 75, flameDecayDebuff: true, igniteTakenHpScalePer100: 0.08, igniteTakenMaxMultiplier: 5, dotMultiplier: 1.45, spellFlatBase: 7, spellFlatScale: 1.5, desc: '공격력 없이 생명력/초과 화염 저항 계수로 화염 지속 피해를 퍼뜨립니다.', hideCombatScales: ['regen', 'fireRes'], tags: ['spell', 'dot', 'aoe', 'fire'] },
    '빙결 침식': { isGem: true, baseDmg: 0.31, baseSpd: 0.84, leech: 0, crit: 0, dmgScale: 0.022, spdScale: 0.01, ele: 'cold', targetMode: 'all', targets: 99, dotMultiplier: 1.3, spellFlatBase: 22, spellFlatScale: 4.8, dotStackDamagePct: 14, dotStackSlowPct: 4, dotStackCap: 5, desc: '반복 적용할 때마다 최대 5중첩까지 냉기 지속 피해가 14%, 둔화가 4%씩 누적됩니다.', tags: ['spell', 'dot', 'aoe', 'cold'] },
    '서리 파동': { isGem: true, baseDmg: 1.08, baseSpd: 0.95, leech: 0, crit: 8, dmgScale: 0.05, spdScale: 0.02, ele: 'cold', targetMode: 'cleave', targets: 3, spellFlatBase: 20, spellFlatScale: 4.5, combatPattern: { kind: 'moving', intervalMs: 160 }, desc: '전방의 칸을 0.16초 간격으로 천천히 훑는 냉기 파동 주문입니다.', tags: ['spell', 'cold', 'aoe'] },
    '뇌운 낙뢰': { isGem: true, baseDmg: 0.88, baseSpd: 1.02, leech: 0, crit: 10, dmgScale: 0.044, spdScale: 0.02, ele: 'light', targetMode: 'chain', targets: 4, spellFlatBase: 20, spellFlatScale: 4.4, periodicOnHit: { chance: 0.4, hits: 4, interval: 0.6, damagePct: 22, ele: 'light' }, desc: '적중 시 40% 확률로 뇌운을 적용해 0.6초마다 적중 피해의 22%를 4회 가합니다.', tags: ['spell', 'lightning', 'chain'] },
    '심연 전염': { isGem: true, baseDmg: 0.28, baseSpd: 0.88, leech: 0, crit: 0, dmgScale: 0.018, spdScale: 0.01, ele: 'chaos', targetMode: 'all', targets: 99, dotMultiplier: 1.42, spellFlatBase: 21, spellFlatScale: 4.9, dotTransferOnDeath: { targets: 1, remainingDamagePct: 100 }, desc: '감염된 적이 처치되면 남은 지속 피해를 다른 적 하나에게 이전합니다.', tags: ['spell', 'dot', 'chaos', 'aoe'] },
    '독니 사출': { isGem: true, baseDmg: 1.18, baseSpd: 1.18, leech: 0, crit: 7, dmgScale: 0.06, spdScale: 0.03, ele: 'chaos', projectilePattern: { mode: 'return', kind: 'line' }, targetMode: 'pierce', targets: 3, combatPattern: { kind: 'boomerang', returnDelayMs: 160 }, desc: '독니가 적을 관통한 뒤 되돌아오며, 왕복 타격이 각각 기존 피해의 50%를 줍니다.', tags: ['attack', 'projectile', 'chaos'] },
    '연발 사격': { isGem: true, baseDmg: 0.36, baseSpd: 1.18, leech: 0, crit: 5, dmgScale: 0.018, spdScale: 0.025, ele: 'phys', extraProjectileDamagePct: 34, projectilePattern: { mode: 'fan', kind: 'fan', rays: 5 }, targetMode: 'spread', targets: 5, desc: '전방 5방향으로 산탄을 발사합니다. 보조 투사체는 각각 기본 타격 피해의 34%를 줍니다.', tags: ['attack', 'projectile', 'physical'] },
    '폭열 창탄': { isGem: true, baseDmg: 1.0, baseSpd: 1.02, leech: 0, crit: 8, dmgScale: 0.06, spdScale: 0.03, ele: 'fire', projectilePattern: { mode: 'delayedBlast', kind: 'line' }, targetMode: 'pierce', targets: 4, ailmentChanceBonus: { ignite: 25 }, periodicOnHit: { chance: 1, hits: 1, interval: 0.25, damagePct: 25, ele: 'fire' }, desc: '관통 후 0.25초 뒤 타격 피해의 25%로 폭발하며 점화 확률이 25% 증가합니다.', tags: ['attack', 'projectile', 'fire', 'elemental'] },
    '암흑 파열': { isGem: true, baseDmg: 1.12, baseSpd: 0.98, leech: 0, crit: 9, dmgScale: 0.055, spdScale: 0.02, ele: 'chaos', targetMode: 'single', targets: 1, spellFlatBase: 27, spellFlatScale: 5.1, missingLifeDamagePct: 30, executeThreshold: 0.15, desc: '적이 잃은 생명력 비율만큼 최대 30% 피해가 증가하며, 생명력 15% 미만인 일반 적을 처형합니다.', tags: ['spell', 'chaos'] },
    '중력 붕괴': { isGem: true, baseDmg: 1.1, baseSpd: 0.9, leech: 0, crit: 6, dmgScale: 0.05, spdScale: 0.02, ele: 'phys', targetMode: 'cleave', targets: 3, spellFlatBase: 27, spellFlatScale: 5.3, pullTowardPlayerCells: 1, desc: '범위 내 적들을 타격하고 플레이어 방향으로 1칸 끌어당깁니다.', tags: ['spell', 'physical', 'aoe'] },
    '화염 폭풍핵': { isGem: true, baseDmg: 1.12, baseSpd: 0.96, leech: 0, crit: 8, dmgScale: 0.055, spdScale: 0.02, ele: 'fire', targetMode: 'cleave', targets: 3, spellFlatBase: 24, spellFlatScale: 5.1, combatPattern: { kind: 'field', hits: 3, intervalMs: 260, damagePct: 34 }, desc: '목표 지역에 폭풍핵을 남겨 0.26초 간격으로 타격 피해의 34%를 3회 줍니다.', tags: ['spell', 'fire', 'aoe'] },
    '빙결 파열창': { isGem: true, baseDmg: 1.16, baseSpd: 0.93, leech: 0, crit: 9, dmgScale: 0.058, spdScale: 0.018, ele: 'cold', targetMode: 'pierce', targets: 3, spellFlatBase: 25, spellFlatScale: 5.3, consumeAilmentDamageMore: [{ type: 'freeze', pct: 40 }, { type: 'chill', pct: 20 }], desc: '빙결 파편 창을 꿰뚫어 쏘는 냉기 주문입니다. 냉각된 적에게 적중 시 냉각을 소모해 20% 증폭된 피해를 주고, 동결된 적에게 적중 시 동결을 소모해 40% 증폭된 피해를 줍니다.', tags: ['spell', 'cold'] },
    '천뢰 분기': { isGem: true, baseDmg: 1.08, baseSpd: 1.0, leech: 0, crit: 10, dmgScale: 0.052, spdScale: 0.022, ele: 'light', targetMode: 'chain', targets: 4, spellFlatBase: 23, spellFlatScale: 4.9, ailmentChanceBonus: { shock: 20 }, periodicOnHit: { chance: 0.5, hits: 1, interval: 0.18, damagePct: 25, ele: 'light' }, desc: '감전 확률이 20% 증가하며, 적중 시 50% 확률로 0.18초 뒤 타격 피해의 25%인 낙뢰가 떨어집니다.', tags: ['spell', 'lightning', 'chain'] },
    '삼원 파동': { isGem: true, baseDmg: 1.1, baseSpd: 0.98, leech: 0, crit: 7, dmgScale: 0.055, spdScale: 0.02, ele: 'fire', randomElementPool: ['fire', 'cold', 'light'], targetMode: 'cleave', targets: 3, spellFlatBase: 24, spellFlatScale: 5.0, desc: '시전할 때마다 화염/냉기/번개 중 무작위 속성으로 폭발하는 주문입니다.', tags: ['spell', 'fire', 'cold', 'lightning', 'elemental'] },
    '뇌격 삼연타': { isGem: true, baseDmg: 0.56, baseSpd: 1.06, leech: 0, crit: 6, dmgScale: 0.032, spdScale: 0.03, ele: 'light', multiHit: 3, targetMode: 'single', targets: 1, desc: '한 번의 공격으로 번개 타격 3연격을 가합니다.', tags: ['attack', 'melee', 'lightning'] },
    '유성 낙화': { isGem: true, baseDmg: 2.85, baseSpd: 0.52, leech: 0, crit: 12, dmgScale: 0.12, spdScale: 0.006, ele: 'fire', targetMode: 'all', targets: 6, combatPattern: { kind: 'meteor', groundHits: 3, groundIntervalMs: 600, groundDamagePct: 8 }, desc: '작은 유성을 빠르게 떨어뜨려 충돌 범위에 큰 피해를 주고, 1.8초간 불길 지대를 남겨 타격 피해의 8%를 3회 줍니다. 첫 불길은 점화 확률이 100%입니다.', tags: ['attack', 'aoe', 'fire', 'slam'] },
    '난타 눈보라': { isGem: true, baseDmg: 0.52, baseSpd: 0.88, leech: 0, crit: 5, dmgScale: 0.026, spdScale: 0.016, ele: 'cold', multiHit: 4, randomTargetEachHit: true, targetMode: 'all', targets: 7, spellFlatBase: 22, spellFlatScale: 4.7, combatPattern: { kind: 'field', hits: 4, intervalMs: 300 }, desc: '목표 지역에 눈보라를 유지해 0.3초 간격으로 무작위 적을 4회 타격합니다.', tags: ['spell', 'cold', 'aoe'] },
    '방패 투척': { isGem: true, baseDmg: 1.22, baseSpd: 0.92, leech: 0, crit: 7, dmgScale: 0.065, spdScale: 0.015, ele: 'phys', projectilePattern: { mode: 'return', kind: 'line' }, targetMode: 'pierce', targets: 3, combatPattern: { kind: 'boomerang', returnDelayMs: 180 }, shieldDamageBonusPct: 28, desc: '방패를 직선으로 던져 왕복 타격합니다. 방패 장착 시 피해가 28% 증폭되며, 왕복 타격은 각각 피해의 50%를 줍니다.', tags: ['attack', 'projectile', 'physical', 'shield'] },
    '룬 지뢰': { isGem: true, baseDmg: 1.46, baseSpd: 0.72, leech: 0, crit: 8, dmgScale: 0.075, spdScale: 0.012, ele: 'light', targetMode: 'cleave', targets: 4, spellFlatBase: 28, spellFlatScale: 5.4, combatPattern: { kind: 'mine', armDelayMs: 460 }, ailmentChanceBonus: { shock: 20 }, desc: '가장 밀집된 목표 지역에 룬 지뢰를 설치합니다. 0.46초 뒤 십자 범위가 폭발하며 감전 확률이 20% 증가합니다.', tags: ['spell', 'lightning', 'aoe', 'mine'] },
    '원소 포션 투척': { isGem: true, baseDmg: 0.84, baseSpd: 1.04, leech: 0, crit: 6, dmgScale: 0.045, spdScale: 0.025, ele: 'fire', randomElementPool: ['fire', 'cold', 'light'], projectilePattern: { mode: 'delayedBlast', kind: 'line' }, targetMode: 'cleave', targets: 4, spellFlatBase: 22, spellFlatScale: 4.8, combatPattern: { kind: 'field', hits: 3, intervalMs: 240, damagePct: 34 }, desc: '연금술 포션을 투척해 화염·냉기·번개 중 하나의 웅덩이를 만듭니다. 0.24초 간격으로 3회 타격합니다.', tags: ['spell', 'projectile', 'elemental', 'aoe', 'potion'] },
    '방패 돌진': { isGem: true, baseDmg: 1.42, baseSpd: 0.74, leech: 0, crit: 4, dmgScale: 0.075, spdScale: 0.012, ele: 'phys', targetMode: 'cleave', targets: 3, mobilityPattern: { kind: 'charge', maxCells: 3 }, requiresShield: true, shieldArmorDamageRatio: 0.8, desc: '방패 장착 시에만 사용 가능합니다. 최대 3칸 안의 적에게 돌진하며, 방패 방어도의 80%를 기본 물리 피해로 사용합니다. 방패의 회피·에너지 보호막은 피해에 적용되지 않습니다.', tags: ['attack', 'melee', 'physical', 'aoe', 'mobility', 'shield'] },
    '그림자 점멸': { isGem: true, baseDmg: 1.68, baseSpd: 0.56, leech: 0, crit: 14, dmgScale: 0.085, spdScale: 0.008, ele: 'chaos', targetMode: 'single', targets: 1, mobilityPattern: { kind: 'blink', maxCells: 6 }, desc: '최대 6칸 안의 적 옆으로 점멸해 베어냅니다. 같은 칸을 반복 왕복하지 않으며 낮은 공격 속도로 재사용을 제한합니다.', tags: ['attack', 'melee', 'chaos', 'mobility'] },
    '집중 광선': { isGem: true, baseDmg: 0.54, baseSpd: 0.64, leech: 0, crit: 9, dmgScale: 0.03, spdScale: 0.01, ele: 'light', targetMode: 'pierce', targets: 4, spellFlatBase: 20, spellFlatScale: 4.6, combatPattern: { kind: 'channel', hits: 5, intervalMs: 180, damagePct: 22 }, desc: '이동을 멈추고 직선 광선을 0.18초 간격으로 5회 집중합니다. 동결·기절·속박에 걸리면 남은 집중이 취소됩니다.', tags: ['spell', 'lightning', 'channeling'] },
    '용화 숨결': { isGem: true, baseDmg: 0.5, baseSpd: 0.68, leech: 0, crit: 5, dmgScale: 0.027, spdScale: 0.012, ele: 'fire', targetMode: 'spread', targets: 5, spellFlatBase: 19, spellFlatScale: 4.4, combatPattern: { kind: 'channel', hits: 4, intervalMs: 220, damagePct: 27 }, ailmentChanceBonus: { ignite: 25 }, desc: '이동을 멈추고 전방 부채꼴에 불길을 4회 내뿜습니다. 군중 제어에 걸리면 남은 숨결이 취소됩니다.', tags: ['spell', 'fire', 'aoe', 'channeling'] },
    '공허 절삭광': { isGem: true, baseDmg: 0.62, baseSpd: 0.6, leech: 0.2, crit: 7, dmgScale: 0.034, spdScale: 0.008, ele: 'chaos', targetMode: 'pierce', targets: 3, spellFlatBase: 23, spellFlatScale: 5.0, combatPattern: { kind: 'channel', hits: 4, intervalMs: 240, damagePct: 29 }, desc: '이동을 멈추고 천천히 회전하는 공허 칼날을 4회 유지합니다. 군중 제어에 걸리면 남은 집중이 취소됩니다.', tags: ['spell', 'chaos', 'channeling'] }
    ,
    '서리늑대 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'cold', targetMode: 'single', targets: 1, desc: '공격형 소환수 젬. 빠른 공격 속도를 가진 서리늑대를 소환합니다. 소환수가 냉기 피해로 공격합니다. 소환수 전용 스탯과 일반 피해 증가 및 젬 태그에 맞는 피해 증가가 적용됩니다.', tags: ['summon', 'summon_attack', 'cold', 'elemental'] },
    '불곰 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'fire', targetMode: 'single', targets: 1, desc: '공격형 소환수 젬. 공격은 느리지만 1타 피해가 강한 불곰을 소환합니다. 소환수가 화염 피해로 공격합니다.', tags: ['summon', 'summon_attack', 'fire', 'elemental'] },
    '벼락멧돼지 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'light', targetMode: 'single', targets: 1, desc: '공격형 소환수 젬. 자체 저항 관통이 높은 벼락멧돼지를 소환합니다. 소환수가 번개 피해로 공격합니다.', tags: ['summon', 'summon_attack', 'lightning', 'elemental'] },
    '칼날까마귀 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'phys', targetMode: 'single', targets: 1, desc: '공격형 소환수 젬. 치명타 확률과 치명타 피해가 높은 칼날까마귀를 소환합니다. 소환수가 물리 피해로 공격합니다.', tags: ['summon', 'summon_attack', 'physical'] },
    '공허 유충 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'chaos', targetMode: 'single', targets: 1, desc: '공격형 소환수 젬. 카오스 저항 관통에 특화된 공허 유충을 소환합니다. 소환수가 카오스 피해로 공격합니다.', tags: ['summon', 'summon_attack', 'chaos'] },
    '벌떼 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'chaos', targetMode: 'single', targets: 1, desc: '공격형 소환수 젬. 매우 빠르게 공격하는 벌떼를 소환합니다. 소환수가 카오스 피해로 공격합니다.', tags: ['summon', 'summon_attack', 'chaos'] },
    '폭풍 정령 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'light', targetMode: 'single', targets: 1, desc: '공격형 소환수 젬. 먼 거리에서 빠른 번개를 발사하는 폭풍 정령을 소환합니다.', tags: ['summon', 'summon_attack', 'lightning', 'elemental'] },
    '철갑 거북 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'phys', targetMode: 'single', targets: 1, desc: '공격형 소환수 젬. 느리지만 생명력과 방어도가 높은 철갑 거북을 소환합니다.', tags: ['summon', 'summon_attack', 'physical'] }
};

// 루프 시작 후 첫 처치에 재능(시작 캐릭터)별로 확정 지급되는 스킬 젬.
// 매 루프 "기본 공격"만 들고 시작하는 공백을 메우는 용도라, 각 재능의 주력 태그 안에서
// 일부러 하위권 화력의 젬을 골랐다(강한 젬은 그대로 드랍/보상으로 찾는 재미를 유지).
const LOOP_STARTER_GEM_BY_HERO = {
    hero1: '연발 사격',    // 궁수 (투사체) — 투사체 태그 중 하위권 화력
    hero2: '연속 베기',    // 전사 (근접·물리) — 근접/물리 태그 중 하위권 화력
    hero3: '서리 폭발',    // 드루이드 (원소) — 원소 태그 중 하위권 화력
    hero4: '흡혈 타격',    // 블레이드 (카오스) — 카오스 태그 중 하위권 화력, 컨셉(흡혈)은 유지
    hero5: '번개 타격',    // 성기사 (물리+번개) — 전사/수호자와 겹치지 않게 번개 계열로 차별화
    hero6: '독니 사출',    // 저격수 (투사체) — 궁수와 다른 투사체 젬
    hero7: '칼날까마귀 소환', // 소환사 (소환) — 물리 속성 소환수로 변경
    hero8: '중력 붕괴',    // 수호자 (근접·물리) — 전사와 다른 물리 젬(주문형)
    hero9: '서리 폭발',    // 원소술사 (원소) — 원소 태그 중 하위권 화력
    hero10: '빙결 침식'    // 연금술사 (지속피해) — 지속피해 태그 중 하위권 화력
};

safeExposeData({ SKILL_DB, LOOP_STARTER_GEM_BY_HERO, PROJECTILE_PATTERN_MODE_DB });

// 전투 이펙트는 젬마다 별도 대형 이미지를 적재하는 대신 형태 계열, 속성 색, 고유 문양을
// 조합한다. 모든 액티브 젬을 명시적으로 적어 신규 젬 추가 시 누락 검사가 가능하다.
const SKILL_GEM_VFX_PROFILES = Object.freeze({
    '기본 공격': { family: 'slash', scale: 0.82 },
    '연속 베기': { family: 'slash', scale: 0.84, repeats: 2, sigil: 1 },
    '묵직한 강타': { family: 'slam', scale: 0.92, sigil: 2 },
    '흡혈 타격': { family: 'slash', scale: 0.78, accent: 'blood', sigil: 3 },
    '암살자의 일격': { family: 'iai', scale: 0.92, sharp: true, sigil: 4 },
    '회오리바람': { family: 'whirlwind', scale: 1.02, sigil: 5 },
    '번개 타격': { family: 'chain', primaryFamily: 'slash', scale: 0.86, sigil: 6 },
    '얼음 창': { family: 'projectile', scale: 0.92, sigil: 7 },
    '화염 참격': { family: 'slash', scale: 0.9, sigil: 8 },
    '독창 투척': { family: 'projectile', scale: 0.82, sigil: 9 },
    '서리 폭발': { family: 'burst', scale: 1.04, aggregateImpact: true, impactVfx: false, sigil: 10 },
    '번개 창': { family: 'projectile', scale: 0.9, aggregateImpact: true, impactVfx: false, sigilVfx: false, sigil: 11 },
    '지진 파쇄': { family: 'slam', scale: 1.08, sigil: 12 },
    '용암 강타': { family: 'slam', scale: 1.0, sigil: 13 },
    '관통 사격': { family: 'projectile', scale: 0.86, sigil: 14 },
    '연쇄 폭풍': { family: 'chain', scale: 1.0, sigil: 15 },
    '공허 베기': { family: 'slash', scale: 0.94, sigil: 16 },
    '혈기 폭쇄': { family: 'burst', scale: 0.82, accent: 'blood', sigil: 17 },
    '불멸의 진동': { family: 'burst', scale: 0.98, sigil: 18 },
    '화염 부패': { family: 'dot', scale: 1.04, sigil: 19 },
    '빙결 침식': { family: 'dot', scale: 0.98, sigil: 20 },
    '서리 파동': { family: 'burst', scale: 0.92, sigil: 21 },
    '뇌운 낙뢰': { family: 'stormStrike', scale: 0.96, impactParticles: false, impactAccentVfx: false, maxActiveImpacts: 4, sigilVfx: false, sigil: 22 },
    '심연 전염': { family: 'dot', scale: 1.02, sigil: 23 },
    '독니 사출': { family: 'projectile', scale: 0.78, projectileAsset: 'venomFang', projectileWidth: 88, projectileHeight: 28, impactVfx: false, sigilVfx: false, sigil: 24 },
    '연발 사격': { family: 'projectile', scale: 0.7, sigil: 25 },
    '폭열 창탄': { family: 'projectile', scale: 0.9, sigil: 26 },
    '암흑 파열': { family: 'burst', scale: 0.84, sigil: 27 },
    '중력 붕괴': { family: 'burst', scale: 0.96, sigil: 28 },
    '화염 폭풍핵': { family: 'fireCore', scale: 0.74, impactVfx: false, sigil: 29 },
    '빙결 파열창': { family: 'projectile', scale: 0.94, sigil: 30 },
    '천뢰 분기': { family: 'chain', scale: 0.98, sigil: 31 },
    '삼원 파동': { family: 'burst', scale: 0.98, aggregateImpact: true, impactVfx: false, sigil: 32 },
    '뇌격 삼연타': { family: 'slash', scale: 0.72, repeats: 3, sigil: 33 },
    '유성 낙화': { family: 'slam', scale: 1.18, sigil: 34 },
    '난타 눈보라': { family: 'blizzard', scale: 0.84, repeats: 1, impactVfx: false, sigil: 35 },
    '방패 투척': { family: 'projectile', projectileStyle: 'shield', scale: 0.9, sigil: 42 },
    '룬 지뢰': { family: 'mine', scale: 0.98, impactVfx: false, sigil: 43 },
    '원소 포션 투척': { family: 'projectile', projectileStyle: 'potion', scale: 0.86, sigil: 44 },
    '방패 돌진': { family: 'charge', scale: 1.0, sigil: 45, sigilVfx: false, impactAccentVfx: false },
    '그림자 점멸': { family: 'iai', scale: 1.0, accent: 'chaos', sigil: 46 },
    '집중 광선': { family: 'beam', scale: 1.0, sigil: 47 },
    '용화 숨결': { family: 'breath', scale: 1.02, sigil: 48 },
    '공허 절삭광': { family: 'voidBlade', scale: 0.96, sigil: 49 },
    '서리늑대 소환': { family: 'summon', scale: 0.74, sigil: 36 },
    '불곰 소환': { family: 'summon', scale: 0.98, sigil: 37 },
    '벼락멧돼지 소환': { family: 'summon', scale: 0.9, sigil: 38 },
    '칼날까마귀 소환': { family: 'summon', scale: 0.72, sharp: true, sigil: 39 },
    '공허 유충 소환': { family: 'summon', scale: 0.8, sigil: 40 },
    '벌떼 소환': { family: 'summon', scale: 0.62, repeats: 3, sigil: 41 },
    '폭풍 정령 소환': { family: 'summon', scale: 0.8, sigil: 50 },
    '철갑 거북 소환': { family: 'summon', scale: 0.96, sigil: 51 }
});

safeExposeData({ SKILL_GEM_VFX_PROFILES });

// 전투 젬 카드와 각인 공방에서 사용하는 고유 젬 초상화.
// 경로를 한 곳에서 관리해 카드, 툴팁, 각인 오버레이가 같은 이미지를 공유한다.
const SKILL_GEM_ART_PATHS = Object.freeze({
    '연속 베기': 'assets/gems/active/continuous-slash-v1.png',
    '묵직한 강타': 'assets/gems/active/heavy-slam-v1.png',
    '흡혈 타격': 'assets/gems/active/vampiric-strike-v1.png',
    '암살자의 일격': 'assets/gems/active/assassin-strike-v1.png',
    '회오리바람': 'assets/gems/active/whirlwind-v1.png',
    '번개 타격': 'assets/gems/active/lightning-strike-v1.png',
    '얼음 창': 'assets/gems/active/ice-spear-v1.png',
    '화염 참격': 'assets/gems/active/flame-slash-v1.png',
    '독창 투척': 'assets/gems/active/poison-spear-v1.png',
    '서리 폭발': 'assets/gems/active/frost-burst-v1.png',
    '번개 창': 'assets/gems/active/lightning-spear-v1.png',
    '지진 파쇄': 'assets/gems/active/earthquake-shatter-v1.png',
    '용암 강타': 'assets/gems/active/molten-slam-v1.png',
    '관통 사격': 'assets/gems/active/piercing-shot-v1.png',
    '연쇄 폭풍': 'assets/gems/active/chain-storm-v1.png',
    '공허 베기': 'assets/gems/active/void-slash-v1.png',
    '혈기 폭쇄': 'assets/gems/active/blood-crush-v1.png',
    '불멸의 진동': 'assets/gems/active/immortal-vibration-v1.png',
    '화염 부패': 'assets/gems/active/flame-decay-v1.png',
    '빙결 침식': 'assets/gems/active/frost-erosion-v1.png',
    '서리 파동': 'assets/gems/active/frost-wave-v1.png',
    '뇌운 낙뢰': 'assets/gems/active/thundercloud-strike-v1.png',
    '심연 전염': 'assets/gems/active/abyss-contagion-v1.png',
    '독니 사출': 'assets/gems/active/venom-fang-v1.png',
    '연발 사격': 'assets/gems/active/rapid-shot-v1.png',
    '폭열 창탄': 'assets/gems/active/explosive-lance-v1.png',
    '암흑 파열': 'assets/gems/active/dark-rupture-v1.png',
    '중력 붕괴': 'assets/gems/active/gravity-collapse-v1.png',
    '화염 폭풍핵': 'assets/gems/active/firestorm-core-v1.png',
    '빙결 파열창': 'assets/gems/active/frozen-rift-spear-v1.png',
    '천뢰 분기': 'assets/gems/active/heavenly-branch-v1.png',
    '삼원 파동': 'assets/gems/active/tri-element-wave-v1.png',
    '뇌격 삼연타': 'assets/gems/active/triple-thunder-strike-v1.png',
    '유성 낙화': 'assets/gems/active/meteor-fall-v1.png',
    '난타 눈보라': 'assets/gems/active/bludgeoning-blizzard-v1.png',
    '방패 투척': 'assets/gems/active/shield-throw-v1.png',
    '룬 지뢰': 'assets/gems/active/rune-mine-v1.png',
    '원소 포션 투척': 'assets/gems/active/elemental-potion-throw-v1.png',
    '방패 돌진': 'assets/gems/active/shield-charge-v1.png',
    '그림자 점멸': 'assets/gems/active/shadow-blink-v1.png',
    '집중 광선': 'assets/gems/active/focus-beam-v1.png',
    '용화 숨결': 'assets/gems/active/dragon-breath-v1.png',
    '공허 절삭광': 'assets/gems/active/void-cutter-v1.png',
    '서리늑대 소환': 'assets/gems/active/summon-frost-wolf-v1.png',
    '불곰 소환': 'assets/gems/active/summon-fire-bear-v1.png',
    '벼락멧돼지 소환': 'assets/gems/active/summon-thunder-boar-v1.png',
    '칼날까마귀 소환': 'assets/gems/active/summon-blade-raven-v1.png',
    '공허 유충 소환': 'assets/gems/active/summon-void-larva-v1.png',
    '벌떼 소환': 'assets/gems/active/summon-swarm-v1.png',
    '폭풍 정령 소환': 'assets/gems/active/summon-storm-spirit-v1.png',
    '철갑 거북 소환': 'assets/gems/active/summon-armored-turtle-v1.png'
});

safeExposeData({ SKILL_GEM_ART_PATHS });

// 스킬 젬별 8x8 그리드 공격 범위 프로필.
// kind:
//  - melee: 플레이어 인접(range) 칸의 단일 대상만 타격
//  - arc:   플레이어 기준 대상 방향 전방 부채꼴(대상 칸 + 플레이어·대상 모두에 인접한 칸)
//  - nova:  플레이어 자신 중심 radius칸 이내 전부
//  - line:  플레이어에서 대상 방향 직선을 range칸까지 관통
//  - chain: range칸 이내 첫 대상 적중 후 jump칸 이내 다른 적으로 연쇄
//  - blast: range칸 이내 대상 칸 중심 radius칸 폭발(0이면 원거리 단일)
//  - fan:   대상 방향을 중심으로 rays개의 직선 투사체를 부채꼴로 발사
// range/jump는 체비셰프 거리다. radius는 shape로 diamond/square/cross/diagonal/ring을 선택한다.
const SKILL_GRID_DB = {
    '기본 공격':     { kind: 'melee', range: 1 },
    '연속 베기':     { kind: 'arc',   range: 1 },
    '묵직한 강타':   { kind: 'melee', range: 1 },
    '흡혈 타격':     { kind: 'melee', range: 1 },
    '암살자의 일격': { kind: 'melee', range: 1 },
    '회오리바람':    { kind: 'nova',  range: 1, radius: 1, shape: 'square' },
    '번개 타격':     { kind: 'chain', range: 1, jump: 3 },
    '얼음 창':       { kind: 'line',  range: 7 },
    '화염 참격':     { kind: 'arc',   range: 1 },
    '독창 투척':     { kind: 'chain', range: 5, jump: 3 },
    '서리 폭발':     { kind: 'blast', range: 5, radius: 2, shape: 'square' },
    '번개 창':       { kind: 'line',  range: 7 },
    '지진 파쇄':     { kind: 'nova',  range: 3, radius: 3, shape: 'cross' },
    '용암 강타':     { kind: 'arc',   range: 1 },
    '관통 사격':     { kind: 'line',  range: 7 },
    '연쇄 폭풍':     { kind: 'chain', range: 5, jump: 3 },
    '공허 베기':     { kind: 'nova',  range: 2, radius: 2, shape: 'diagonal' },
    '혈기 폭쇄':     { kind: 'melee', range: 1 },
    '불멸의 진동':   { kind: 'nova',  range: 2, radius: 2, shape: 'ring' },
    '화염 부패':     { kind: 'blast', range: 6, radius: 3, shape: 'cross' },
    '빙결 침식':     { kind: 'blast', range: 6, radius: 3, shape: 'ring' },
    '서리 파동':     { kind: 'line',  range: 5 },
    '뇌운 낙뢰':     { kind: 'chain', range: 6, jump: 3 },
    '심연 전염':     { kind: 'blast', range: 5, radius: 2, shape: 'diamond' },
    '독니 사출':     { kind: 'line',  range: 7 },
    '연발 사격':     { kind: 'fan',   range: 6, rays: 5 },
    '폭열 창탄':     { kind: 'line',  range: 7 },
    '암흑 파열':     { kind: 'blast', range: 6, radius: 0 },
    '중력 붕괴':     { kind: 'blast', range: 5, radius: 2, shape: 'cross' },
    '화염 폭풍핵':   { kind: 'blast', range: 5, radius: 2, shape: 'square' },
    '빙결 파열창':   { kind: 'line',  range: 6 },
    '천뢰 분기':     { kind: 'chain', range: 6, jump: 4 },
    '삼원 파동':     { kind: 'blast', range: 5, radius: 2, shape: 'ring' },
    '뇌격 삼연타':   { kind: 'melee', range: 1 },
    '유성 낙화':     { kind: 'blast', range: 6, radius: 3, shape: 'diamond' },
    '난타 눈보라':   { kind: 'blast', range: 5, radius: 2, shape: 'square' },
    '방패 투척':     { kind: 'line',  range: 6 },
    '룬 지뢰':       { kind: 'blast', range: 5, radius: 2, shape: 'cross' },
    '원소 포션 투척': { kind: 'blast', range: 5, radius: 2, shape: 'diamond' },
    '방패 돌진':     { kind: 'arc',   range: 3 },
    '그림자 점멸':   { kind: 'melee', range: 6 },
    '집중 광선':     { kind: 'line',  range: 7 },
    '용화 숨결':     { kind: 'fan',   range: 4, rays: 5 },
    '공허 절삭광':   { kind: 'line',  range: 6 },
    // 소환 젬 카드에는 소환수 본체가 실제로 사용하는 공격 사거리를 표시한다.
    '서리늑대 소환':   { kind: 'summon', range: 1 },
    '불곰 소환':       { kind: 'summon', range: 1 },
    '벼락멧돼지 소환': { kind: 'summon', range: 1 },
    '칼날까마귀 소환': { kind: 'summon', range: 2 },
    '공허 유충 소환':  { kind: 'summon', range: 3 },
    '벌떼 소환':       { kind: 'summon', range: 2 },
    '폭풍 정령 소환':  { kind: 'summon', range: 4 },
    '철갑 거북 소환':  { kind: 'summon', range: 1 }
};

safeExposeData({ SKILL_GRID_DB });


const CONDITION_GEM_DB = {
  curse: [
    { name:'재의 표식', type:'curse', castTime:1.1, duration:6, tags:['fire','curse'], desc:'화염 취약 저주.' },
    { name:'빙결의 낙인', type:'curse', castTime:1.1, duration:6, tags:['cold','curse'], desc:'냉기 취약 저주.' },
    { name:'감전 문양', type:'curse', castTime:1.1, duration:6, tags:['lightning','curse'], desc:'번개 취약 저주.' },
    { name:'부패 각인', type:'curse', castTime:1.1, duration:6, tags:['chaos','curse'], desc:'카오스 취약 저주.' },
    { name:'균열 저주', type:'curse', castTime:1.2, duration:7, tags:['physical','curse'], desc:'방어 약화 저주.' },
    { name:'취약의 낙인', type:'curse', castTime:1.1, duration:7, tags:['physical','curse'], desc:'받는 피해 증가.' },
    { name:'파멸 징표', type:'curse', castTime:1.3, duration:5, tags:['chaos','curse'], desc:'후반 폭증 저주.' },
    { name:'쇠약의 기도', type:'curse', castTime:1.0, duration:8, tags:['cold','curse'], desc:'적 공세 둔화.' },
    { name:'타오른 죄책', type:'curse', castTime:1.0, duration:7, tags:['fire','curse'], desc:'점화 증폭.' },
    { name:'천둥 포박', type:'curse', castTime:1.2, duration:6, tags:['lightning','curse'], desc:'감전 확률 증가.' },
    { name:'절단의 맹세', type:'curse', castTime:1.2, duration:6, tags:['physical','curse'], desc:'물리 취약.' },
    { name:'심연 고리', type:'curse', castTime:1.2, duration:7, tags:['chaos','curse'], desc:'저항 침식.' },
    { name:'상처 악화', type:'curse', castTime:1.0, duration:7, tags:['physical','curse'], desc:'생명력 재생 약화.' },
    { name:'약점 조준', type:'curse', castTime:1.1, duration:6, tags:['projectile','curse'], desc:'투사체 취약 유발.' }
  ],
  warcry: [
    { name:'전장의 함성', type:'warcry', castTime:1.8, duration:5, tags:['physical','warcry'], desc:'치명 버프.' },
    { name:'피의 함성', type:'warcry', castTime:2.0, duration:6, tags:['chaos','warcry'], desc:'흡혈 버프.' },
    { name:'추적자의 함성', type:'warcry', castTime:1.7, duration:4, tags:['lightning','warcry'], desc:'추적 강화.' },
    { name:'용광의 외침', type:'warcry', castTime:1.9, duration:5, tags:['fire','warcry'], desc:'화염 강화.' },
    { name:'빙하의 포효', type:'warcry', castTime:1.9, duration:5, tags:['cold','warcry'], desc:'냉기 강화.' },
    { name:'폭풍의 고함', type:'warcry', castTime:1.8, duration:5, tags:['lightning','warcry'], desc:'번개 강화.' },
    { name:'공허의 외침', type:'warcry', castTime:2.1, duration:5, tags:['chaos','warcry'], desc:'카오스 강화.' },
    { name:'결전 신호', type:'warcry', castTime:2.2, duration:4, tags:['physical','warcry'], desc:'보스전 버프.' },
    { name:'지진의 함성', type:'warcry', castTime:2.0, duration:5, tags:['physical','warcry','slam'], desc:'강타 후속 타격.' }
  ],
  guard: [
    { name:'원소 장막', type:'guard', castTime:0.6, duration:2.2, tags:['elemental','guard'], desc:'원소 저항 보호막.' },
    { name:'가시 방패', type:'guard', castTime:0.7, duration:3, tags:['physical','guard'], desc:'가시 반격 보호막.' },
    { name:'현무 장막', type:'guard', castTime:0.6, duration:2.2, tags:['elemental','guard'], desc:'(구) 원소 장막.' },
    { name:'응보 방패', type:'guard', castTime:0.7, duration:3, tags:['physical','guard'], desc:'(구) 가시 방패.' },
    { name:'철의 맹세', type:'guard', castTime:0.6, duration:4, tags:['physical','guard'], desc:'물리 피해 감소.' },
    { name:'서리 장벽', type:'guard', castTime:0.6, duration:2.5, tags:['cold','guard'], desc:'냉기 보호막.' },
    { name:'폭풍 장벽', type:'guard', castTime:0.6, duration:2.5, tags:['lightning','guard'], desc:'번개 보호막.' },
    { name:'심연 껍질', type:'guard', castTime:0.7, duration:2.8, tags:['chaos','guard'], desc:'카오스 보호막.' },
    { name:'용암 벽', type:'guard', castTime:0.6, duration:2.6, tags:['fire','guard'], desc:'점화 대응 보호막.' },
    { name:'이독제독', type:'guard', castTime:0.7, duration:3.2, tags:['chaos','guard'], desc:'중독 반전 보호막.' },
    { name:'불멸의 힘', type:'guard', castTime:0.8, duration:4.0, tags:['physical','guard'], desc:'지연 재생 보호막.' },
    { name:'에너지 과다', type:'guard', castTime:0.7, duration:3.5, tags:['lightning','guard'], desc:'에너지 보호막 과충전.' },
    { name:'무혈', type:'guard', castTime:0.7, duration:3.0, tags:['physical','guard'], desc:'출혈 차단 보호막.' }
  ],
  utility: [
    { name:'귀환 젬', type:'utility', castTime:1.6, duration:0, tags:['utility'], desc:'귀환 버튼과 동일하게 거점으로 돌아갑니다.' }
  ]
};

safeExposeData({ CONDITION_GEM_DB });
