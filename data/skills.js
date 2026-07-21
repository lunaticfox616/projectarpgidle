if (typeof safeExposeData !== 'function') throw new Error('data/constants.js must load before data/skills.js');

// 투사체 '추가 발사'(장비/패시브/유니크/부적으로 얻는 보너스 샷)의 기본 피해 비율(%).
// 과거에는 보너스 샷이 100% 피해로 반복되어 추가 발사 +5 = DPS ×6이라는 천장 뚫는 곱연산이 됐다.
// 이제 보너스 샷은 기본적으로 기본 타격의 이 비율만큼만 피해를 준다(추가 발사 +5 = ×3.0).
// 스킬이 extraProjectileDamagePct를 직접 정의하면(예: 연발 사격 45) 그 값이 우선한다.
const PROJECTILE_BONUS_SHOT_DAMAGE_PCT = 40;

// Phase-1 extracted data (global compatibility).
const SKILL_DB = {
    '기본 공격': { isGem: false, levelable: true, baseDmg: 1.0, baseSpd: 1.0, dmgScale: 0.05, spdScale: 0.01, leech: 0, crit: 0, ele: 'phys', targetMode: 'single', targets: 1, desc: '가장 가까운 적 하나를 가격합니다. 레벨업당 피해 배율 +5%, 공격 속도 +1%가 적용됩니다.', tags: ['attack', 'melee', 'physical'] },
    '연속 베기': { isGem: true, baseDmg: 0.65, baseSpd: 1.8, leech: 0, crit: 0, dmgScale: 0.03, spdScale: 0.04, ele: 'phys', targetMode: 'cleave', targets: 2, desc: '전방 두 적을 빠르게 벱니다.', tags: ['attack', 'melee', 'physical'] },
    '묵직한 강타': { isGem: true, baseDmg: 2.5, baseSpd: 0.5, leech: 0, crit: 5, dmgScale: 0.15, spdScale: 0, ele: 'phys', targetMode: 'single', targets: 1, aftershockDamagePct: 38, aftershockDelayMs: 420, desc: '총 피해의 62%를 본 타격으로 주고, 0.42초 후 나머지 38%를 여진으로 가합니다.', tags: ['attack', 'melee', 'physical', 'slam'] },
    '흡혈 타격': { isGem: true, baseDmg: 0.95, baseSpd: 1.0, leech: 0.5, instantLeech: true, crit: 0, dmgScale: 0.04, spdScale: 0, ele: 'chaos', targetMode: 'single', targets: 1, desc: '카오스 피해와 흡혈이 붙은 일격입니다. 이 젬을 사용해서 주는 피해에는 흡혈이 즉시 적용됩니다.', tags: ['attack', 'melee', 'chaos'] },
    '암살자의 일격': { isGem: true, baseDmg: 1.35, baseSpd: 0.9, leech: 0, crit: 15, dmgScale: 0.05, spdScale: 0.01, ele: 'phys', targetMode: 'single', targets: 1, desc: '치명타 특화 단일 처형기입니다.', tags: ['attack', 'melee', 'physical'] },
    '회오리바람': { isGem: true, baseDmg: 0.34, baseSpd: 1.65, leech: 0, crit: 0, dmgScale: 0.014, spdScale: 0.04, ele: 'phys', targetMode: 'whirl', targets: 8, desc: '주변 8방향의 적을 회전 방향을 따라 0.08초 간격으로 순차 타격합니다.', tags: ['attack', 'melee', 'physical', 'aoe'] },
    '번개 타격': { isGem: true, baseDmg: 1.15, baseSpd: 1.15, leech: 0, crit: 5, dmgScale: 0.06, spdScale: 0.03, ele: 'light', targetMode: 'chain', targets: 3, desc: '첫 대상을 직접 타격한 뒤 0.11초 간격으로 주변 적에게 번개가 연쇄됩니다.', tags: ['attack', 'melee', 'elemental', 'lightning', 'chain'] },
    '얼음 창': { isGem: true, baseDmg: 1.7, baseSpd: 0.75, leech: 0, crit: 8, critScale: 0.5, dmgScale: 0.1, spdScale: 0, ele: 'cold', targetMode: 'pierce', targets: 2, desc: '적 둘을 꿰뚫는 고위력 빙창입니다. 추가 치명타는 젬 레벨에 따라 성장합니다.', tags: ['attack', 'projectile', 'elemental', 'cold'] },
    '화염 참격': { isGem: true, baseDmg: 1.16, baseSpd: 1.05, leech: 0, crit: 5, dmgScale: 0.065, spdScale: 0.02, ele: 'fire', targetMode: 'cleave', targets: 2, ailmentChanceBonus: { ignite: 25 }, activeAilmentDamageMore: { type: 'ignite', pct: 15 }, desc: '점화 확률 +25%. 점화 중인 적에게 주는 적중 피해가 15% 증폭됩니다.', tags: ['attack', 'melee', 'elemental', 'fire'] },
    '독창 투척': { isGem: true, baseDmg: 0.92, baseSpd: 1.15, leech: 0, crit: 8, dmgScale: 0.045, spdScale: 0.03, ele: 'chaos', targetMode: 'chain', targets: 2, ailmentChanceBonus: { poison: 30 }, ailmentSpreadOnHit: { type: 'poison', chance: 0.65, targets: 1 }, desc: '중독 확률 +30%. 중독된 적을 적중하면 65% 확률로 다른 적 하나에게 중독을 전파합니다.', tags: ['attack', 'projectile', 'chaos'] },
    '서리 폭발': { isGem: true, baseDmg: 1.45, baseSpd: 0.8, leech: 0, crit: 12, dmgScale: 0.09, spdScale: 0.01, ele: 'cold', targetMode: 'all', targets: 99, desc: '주변 전장을 얼리는 범위 폭발입니다.', tags: ['attack', 'aoe', 'elemental', 'cold'] },
    '번개 창': { isGem: true, baseDmg: 1.4, baseSpd: 0.95, leech: 0, crit: 10, dmgScale: 0.08, spdScale: 0.02, ele: 'light', targetMode: 'pierce', targets: 3, desc: '관통하는 번개 투사체를 발사합니다.', tags: ['attack', 'projectile', 'elemental', 'lightning'] },
    '지진 파쇄': { isGem: true, baseDmg: 1.9, baseSpd: 0.6, leech: 0, crit: 0, dmgScale: 0.11, spdScale: 0.01, ele: 'phys', targetMode: 'all', targets: 99, aftershockDamagePct: 42, aftershockDelayMs: 460, desc: '총 피해의 58%로 지면을 깨뜨리고, 0.46초 후 나머지 42%를 범위 여진으로 가합니다.', tags: ['attack', 'melee', 'physical', 'aoe', 'slam'] },
    '용암 강타': { isGem: true, baseDmg: 1.55, baseSpd: 0.82, leech: 0, crit: 4, dmgScale: 0.08, spdScale: 0.02, ele: 'fire', targetMode: 'cleave', targets: 3, aftershockDamagePct: 30, aftershockDelayMs: 340, desc: '총 피해의 70%로 전방을 휩쓴 뒤 0.34초 후 나머지 30%가 용암 여진으로 폭발합니다.', tags: ['attack', 'melee', 'elemental', 'fire', 'aoe', 'slam'] },
    '관통 사격': { isGem: true, baseDmg: 1.25, baseSpd: 1.08, leech: 0, crit: 7, dmgScale: 0.07, spdScale: 0.03, ele: 'phys', targetMode: 'pierce', targets: 4, pierceOverkillCarry: true, desc: '각 원본 타겟의 처치 후 남은 피해가 다른 적에게 이어지고, 전달 피해가 다시 초과되면 연속 관통합니다. 전이될 때마다 전달 피해가 80%로 감쇄합니다.', tags: ['attack', 'projectile', 'physical'] },
    '연쇄 폭풍': { isGem: true, baseDmg: 1.3, baseSpd: 1.0, leech: 0, crit: 9, dmgScale: 0.08, spdScale: 0.02, ele: 'light', targetMode: 'chain', targets: 4, desc: '첫 낙뢰 후 0.11초 간격으로 번개가 인접한 적 사이를 순차 연쇄합니다.', tags: ['attack', 'elemental', 'lightning', 'chain'] },
    '공허 베기': { isGem: true, baseDmg: 1.5, baseSpd: 0.92, leech: 0.4, crit: 6, dmgScale: 0.08, spdScale: 0.01, ele: 'chaos', targetMode: 'cleave', targets: 3, desc: '공허의 칼날로 전방 적을 갈라냅니다.', tags: ['attack', 'melee', 'chaos', 'aoe'] },
    '혈기 폭쇄': { isGem: true, baseDmg: 1.1, baseSpd: 0.95, leech: 0.2, crit: 4, dmgScale: 0.06, spdScale: 0.02, ele: 'phys', targetMode: 'single', targets: 1, hpDmgScale: 0.000175, desc: '최대 생명력이 높을수록 추가 피해를 주는 일격입니다.', tags: ['attack', 'melee', 'physical', 'blood'] },
    '불멸의 진동': { isGem: true, baseDmg: 1.0, baseSpd: 0.9, leech: 0, crit: 3, dmgScale: 0.05, spdScale: 0.02, hpDmgScale: 0.000125, regenDmgScale: 4.2, desc: '생명력과 재생력을 피해로 전환하는 충격파입니다.', ele: 'phys', targetMode: 'cleave', targets: 4, tags: ['attack', 'aoe', 'physical'] },
    '화염 부패': { isGem: true, baseDmg: 0.42, baseSpd: 0.78, leech: 0, crit: 0, dmgScale: 0.03, spdScale: 0.01, ele: 'fire', targetMode: 'all', targets: 99, hpDmgScale: 0.00009, fireResOvercapMulPerPct: 0.1, fireResOvercapCap: 75, flameDecayDebuff: true, igniteTakenHpScalePer100: 0.08, igniteTakenMaxMultiplier: 5, dotMultiplier: 1.45, spellFlatBase: 7, spellFlatScale: 1.5, desc: '공격력 없이 생명력/초과 화염 저항 계수로 화염 지속 피해를 퍼뜨립니다.', hideCombatScales: ['regen', 'fireRes'], tags: ['spell', 'dot', 'aoe', 'fire'] },
    '빙결 침식': { isGem: true, baseDmg: 0.31, baseSpd: 0.84, leech: 0, crit: 0, dmgScale: 0.022, spdScale: 0.01, ele: 'cold', targetMode: 'all', targets: 99, dotMultiplier: 1.3, spellFlatBase: 22, spellFlatScale: 4.8, dotStackDamagePct: 14, dotStackSlowPct: 4, dotStackCap: 5, desc: '반복 적용할 때마다 최대 5중첩까지 냉기 지속 피해가 14%, 둔화가 4%씩 누적됩니다.', tags: ['spell', 'dot', 'aoe', 'cold'] },
    '서리 파동': { isGem: true, baseDmg: 1.08, baseSpd: 0.95, leech: 0, crit: 8, dmgScale: 0.05, spdScale: 0.02, ele: 'cold', targetMode: 'cleave', targets: 3, spellFlatBase: 20, spellFlatScale: 4.5, desc: '전방으로 퍼지는 냉기 파동 주문입니다.', tags: ['spell', 'cold', 'aoe'] },
    '뇌운 낙뢰': { isGem: true, baseDmg: 0.88, baseSpd: 1.02, leech: 0, crit: 10, dmgScale: 0.044, spdScale: 0.02, ele: 'light', targetMode: 'chain', targets: 4, spellFlatBase: 20, spellFlatScale: 4.4, periodicOnHit: { chance: 0.4, hits: 4, interval: 0.6, damagePct: 22, ele: 'light' }, desc: '적중 시 40% 확률로 뇌운을 적용해 0.6초마다 적중 피해의 22%를 4회 가합니다.', tags: ['spell', 'lightning', 'chain'] },
    '심연 전염': { isGem: true, baseDmg: 0.28, baseSpd: 0.88, leech: 0, crit: 0, dmgScale: 0.018, spdScale: 0.01, ele: 'chaos', targetMode: 'all', targets: 99, dotMultiplier: 1.42, spellFlatBase: 21, spellFlatScale: 4.9, dotTransferOnDeath: { targets: 1, remainingDamagePct: 100 }, desc: '감염된 적이 처치되면 남은 지속 피해를 다른 적 하나에게 이전합니다.', tags: ['spell', 'dot', 'chaos', 'aoe'] },
    '독니 사출': { isGem: true, baseDmg: 1.18, baseSpd: 1.18, leech: 0, crit: 7, dmgScale: 0.06, spdScale: 0.03, ele: 'chaos', targetMode: 'pierce', targets: 3, desc: '독니 투사체를 발사하는 공격 스킬입니다.', tags: ['attack', 'projectile', 'chaos'] },
    '연발 사격': { isGem: true, baseDmg: 0.36, baseSpd: 1.18, leech: 0, crit: 5, dmgScale: 0.018, spdScale: 0.025, ele: 'phys', multiHit: 4, extraProjectileDamagePct: 45, targetMode: 'single', targets: 1, desc: '한 번의 공격으로 4회 타격합니다. 추가 투사체 타격은 각각 기본 타격 피해의 45%만 줍니다.', tags: ['attack', 'projectile', 'physical'] },
    '폭열 창탄': { isGem: true, baseDmg: 1.26, baseSpd: 1.02, leech: 0, crit: 8, dmgScale: 0.06, spdScale: 0.03, ele: 'fire', targetMode: 'pierce', targets: 4, desc: '화염 투사체가 적을 관통하는 공격 스킬입니다.', tags: ['attack', 'projectile', 'fire', 'elemental'] },
    '암흑 파열': { isGem: true, baseDmg: 1.12, baseSpd: 0.98, leech: 0, crit: 9, dmgScale: 0.055, spdScale: 0.02, ele: 'chaos', targetMode: 'single', targets: 1, spellFlatBase: 27, spellFlatScale: 5.1, missingLifeDamagePct: 30, executeThreshold: 0.15, desc: '적이 잃은 생명력 비율만큼 최대 30% 피해가 증가하며, 생명력 15% 미만인 일반 적을 처형합니다.', tags: ['spell', 'chaos'] },
    '중력 붕괴': { isGem: true, baseDmg: 1.1, baseSpd: 0.9, leech: 0, crit: 6, dmgScale: 0.05, spdScale: 0.02, ele: 'phys', targetMode: 'cleave', targets: 3, spellFlatBase: 27, spellFlatScale: 5.3, desc: '물리 충격을 일으키는 주문입니다.', tags: ['spell', 'physical', 'aoe'] },
    '화염 폭풍핵': { isGem: true, baseDmg: 1.12, baseSpd: 0.96, leech: 0, crit: 8, dmgScale: 0.055, spdScale: 0.02, ele: 'fire', targetMode: 'cleave', targets: 3, spellFlatBase: 24, spellFlatScale: 5.1, desc: '화염구를 분열시켜 전방을 태우는 주문입니다.', tags: ['spell', 'fire', 'aoe'] },
    '빙결 파열창': { isGem: true, baseDmg: 1.16, baseSpd: 0.93, leech: 0, crit: 9, dmgScale: 0.058, spdScale: 0.018, ele: 'cold', targetMode: 'pierce', targets: 3, spellFlatBase: 25, spellFlatScale: 5.3, consumeAilmentDamageMore: [{ type: 'freeze', pct: 40 }, { type: 'chill', pct: 20 }], desc: '빙결 파편 창을 꿰뚫어 쏘는 냉기 주문입니다. 냉각된 적에게 적중 시 냉각을 소모해 20% 증폭된 피해를 주고, 동결된 적에게 적중 시 동결을 소모해 40% 증폭된 피해를 줍니다.', tags: ['spell', 'cold'] },
    '천뢰 분기': { isGem: true, baseDmg: 1.08, baseSpd: 1.0, leech: 0, crit: 10, dmgScale: 0.052, spdScale: 0.022, ele: 'light', targetMode: 'chain', targets: 4, spellFlatBase: 23, spellFlatScale: 4.9, desc: '번개를 분기시켜 연쇄 타격하는 주문입니다.', tags: ['spell', 'lightning', 'chain'] },
    '삼원 파동': { isGem: true, baseDmg: 1.1, baseSpd: 0.98, leech: 0, crit: 7, dmgScale: 0.055, spdScale: 0.02, ele: 'fire', randomElementPool: ['fire', 'cold', 'light'], targetMode: 'cleave', targets: 3, spellFlatBase: 24, spellFlatScale: 5.0, desc: '시전할 때마다 화염/냉기/번개 중 무작위 속성으로 폭발하는 주문입니다.', tags: ['spell', 'fire', 'cold', 'lightning', 'elemental'] },
    '뇌격 삼연타': { isGem: true, baseDmg: 0.56, baseSpd: 1.06, leech: 0, crit: 6, dmgScale: 0.032, spdScale: 0.03, ele: 'light', multiHit: 3, targetMode: 'single', targets: 1, desc: '한 번의 공격으로 번개 타격 3연격을 가합니다.', tags: ['attack', 'melee', 'lightning'] },
    '유성 낙화': { isGem: true, baseDmg: 2.85, baseSpd: 0.52, leech: 0, crit: 12, dmgScale: 0.12, spdScale: 0.006, ele: 'fire', targetMode: 'all', targets: 6, aftershockDamagePct: 45, aftershockDelayMs: 520, desc: '총 피해의 55%로 유성을 충돌시키고 0.52초 후 나머지 45%를 붕괴 여진으로 가합니다.', tags: ['attack', 'aoe', 'fire', 'slam'] },
    '난타 눈보라': { isGem: true, baseDmg: 0.52, baseSpd: 0.88, leech: 0, crit: 5, dmgScale: 0.026, spdScale: 0.016, ele: 'cold', multiHit: 4, randomTargetEachHit: true, targetMode: 'all', targets: 7, spellFlatBase: 22, spellFlatScale: 4.7, desc: '광역에 눈보라를 일으켜 무작위 적을 연속 타격합니다.', tags: ['spell', 'cold', 'aoe'] }
    ,
    '서리늑대 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'cold', targetMode: 'single', targets: 1, desc: '공격형 소환수 젬. 빠른 공격 속도를 가진 서리늑대를 소환합니다. 소환수가 냉기 피해로 공격합니다. 소환수 전용 스탯과 일반 피해 증가 및 젬 태그에 맞는 피해 증가가 적용됩니다.', tags: ['summon', 'summon_attack', 'cold', 'elemental'] },
    '불곰 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'fire', targetMode: 'single', targets: 1, desc: '공격형 소환수 젬. 공격은 느리지만 1타 피해가 강한 불곰을 소환합니다. 소환수가 화염 피해로 공격합니다.', tags: ['summon', 'summon_attack', 'fire', 'elemental'] },
    '벼락멧돼지 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'light', targetMode: 'single', targets: 1, desc: '공격형 소환수 젬. 자체 저항 관통이 높은 벼락멧돼지를 소환합니다. 소환수가 번개 피해로 공격합니다.', tags: ['summon', 'summon_attack', 'lightning', 'elemental'] },
    '칼날까마귀 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'phys', targetMode: 'single', targets: 1, desc: '공격형 소환수 젬. 치명타 확률과 치명타 피해가 높은 칼날까마귀를 소환합니다. 소환수가 물리 피해로 공격합니다.', tags: ['summon', 'summon_attack', 'physical'] },
    '공허 유충 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'chaos', targetMode: 'single', targets: 1, desc: '공격형 소환수 젬. 카오스 저항 관통에 특화된 공허 유충을 소환합니다. 소환수가 카오스 피해로 공격합니다.', tags: ['summon', 'summon_attack', 'chaos'] },
    '벌떼 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'chaos', targetMode: 'single', targets: 1, desc: '공격형 소환수 젬. 매우 빠르게 공격하는 벌떼를 소환합니다. 소환수가 카오스 피해로 공격합니다.', tags: ['summon', 'summon_attack', 'chaos'] }
};

// 루프 시작 후 첫 처치에 재능(시작 캐릭터)별로 확정 지급되는 스킬 젬.
// 매 루프 "기본 공격"만 들고 시작하는 공백을 메우는 용도라, 각 재능의 주력 태그 안에서
// 일부러 하위권 화력의 젬을 골랐다(강한 젬은 그대로 드랍/보상으로 찾는 재미를 유지).
const LOOP_STARTER_GEM_BY_HERO = {
    hero1: '독창 투척',   // 궁수 (투사체) — 투사체 태그 중 하위권 화력
    hero2: '회오리바람',  // 전사 (근접) — 근접 태그 중 하위권 화력, 광역이라 완전 무력하진 않음
    hero3: '서리 폭발',   // 드루이드 (원소) — 원소 태그 중 하위권 화력
    hero4: '흡혈 타격',   // 블레이드 (카오스) — 카오스 태그 중 하위권 화력, 컨셉(흡혈)은 유지
    hero5: '회오리바람',  // 성기사 (물리) — 물리 태그 중 하위권 화력
    hero6: '독창 투척',   // 저격수 (투사체) — 투사체 태그 중 하위권 화력
    hero7: '서리늑대 소환', // 소환사 (소환) — 소환 젬은 화력 서열이 뚜렷하지 않아 기본형 선택
    hero8: '회오리바람',  // 수호자 (물리) — 물리 태그 중 하위권 화력
    hero9: '서리 폭발',   // 원소술사 (원소) — 원소 태그 중 하위권 화력
    hero10: '빙결 침식'   // 연금술사 (지속피해) — 지속피해 태그 중 하위권 화력
};

safeExposeData({ SKILL_DB, LOOP_STARTER_GEM_BY_HERO });

// 전투 이펙트는 젬마다 별도 대형 이미지를 적재하는 대신, 형태 계열과 속성 색을
// 조합한다. 모든 액티브 젬을 명시적으로 적어 신규 젬 추가 시 누락 검사가 가능하다.
const SKILL_GEM_VFX_PROFILES = Object.freeze({
    '기본 공격': { family: 'slash', scale: 0.82 },
    '연속 베기': { family: 'slash', scale: 0.84, repeats: 2 },
    '묵직한 강타': { family: 'slam', scale: 0.92 },
    '흡혈 타격': { family: 'slash', scale: 0.78, accent: 'blood' },
    '암살자의 일격': { family: 'slash', scale: 0.76, sharp: true },
    '회오리바람': { family: 'whirlwind', scale: 1.02 },
    '번개 타격': { family: 'chain', primaryFamily: 'slash', scale: 0.86 },
    '얼음 창': { family: 'projectile', scale: 0.92 },
    '화염 참격': { family: 'slash', scale: 0.9 },
    '독창 투척': { family: 'projectile', scale: 0.82 },
    '서리 폭발': { family: 'burst', scale: 1.04 },
    '번개 창': { family: 'projectile', scale: 0.9 },
    '지진 파쇄': { family: 'slam', scale: 1.08 },
    '용암 강타': { family: 'slam', scale: 1.0 },
    '관통 사격': { family: 'projectile', scale: 0.86 },
    '연쇄 폭풍': { family: 'chain', scale: 1.0 },
    '공허 베기': { family: 'slash', scale: 0.94 },
    '혈기 폭쇄': { family: 'burst', scale: 0.82, accent: 'blood' },
    '불멸의 진동': { family: 'burst', scale: 0.98 },
    '화염 부패': { family: 'dot', scale: 1.04 },
    '빙결 침식': { family: 'dot', scale: 0.98 },
    '서리 파동': { family: 'burst', scale: 0.92 },
    '뇌운 낙뢰': { family: 'chain', scale: 0.94 },
    '심연 전염': { family: 'dot', scale: 1.02 },
    '독니 사출': { family: 'projectile', scale: 0.78 },
    '연발 사격': { family: 'projectile', scale: 0.7, repeats: 4 },
    '폭열 창탄': { family: 'projectile', scale: 0.9 },
    '암흑 파열': { family: 'burst', scale: 0.84 },
    '중력 붕괴': { family: 'burst', scale: 0.96 },
    '화염 폭풍핵': { family: 'burst', scale: 0.98 },
    '빙결 파열창': { family: 'projectile', scale: 0.94 },
    '천뢰 분기': { family: 'chain', scale: 0.98 },
    '삼원 파동': { family: 'burst', scale: 0.98 },
    '뇌격 삼연타': { family: 'slash', scale: 0.72, repeats: 3 },
    '유성 낙화': { family: 'slam', scale: 1.18 },
    '난타 눈보라': { family: 'burst', scale: 0.78, repeats: 4 },
    '서리늑대 소환': { family: 'summon', scale: 0.74 },
    '불곰 소환': { family: 'summon', scale: 0.98 },
    '벼락멧돼지 소환': { family: 'summon', scale: 0.9 },
    '칼날까마귀 소환': { family: 'summon', scale: 0.72, sharp: true },
    '공허 유충 소환': { family: 'summon', scale: 0.8 },
    '벌떼 소환': { family: 'summon', scale: 0.62, repeats: 3 }
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
    '서리늑대 소환': 'assets/gems/active/summon-frost-wolf-v1.png',
    '불곰 소환': 'assets/gems/active/summon-fire-bear-v1.png',
    '벼락멧돼지 소환': 'assets/gems/active/summon-thunder-boar-v1.png',
    '칼날까마귀 소환': 'assets/gems/active/summon-blade-raven-v1.png',
    '공허 유충 소환': 'assets/gems/active/summon-void-larva-v1.png',
    '벌떼 소환': 'assets/gems/active/summon-swarm-v1.png'
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
// range/jump는 체비셰프 거리, radius는 맨해튼 거리(상하좌우 다이아몬드)다.
const SKILL_GRID_DB = {
    '기본 공격':     { kind: 'melee', range: 1 },
    '연속 베기':     { kind: 'arc',   range: 1 },
    '묵직한 강타':   { kind: 'melee', range: 1 },
    '흡혈 타격':     { kind: 'melee', range: 1 },
    '암살자의 일격': { kind: 'melee', range: 1 },
    '회오리바람':    { kind: 'nova',  range: 1, radius: 1 },
    '번개 타격':     { kind: 'chain', range: 1, jump: 2 },
    '얼음 창':       { kind: 'line',  range: 6 },
    '화염 참격':     { kind: 'arc',   range: 1 },
    '독창 투척':     { kind: 'chain', range: 4, jump: 2 },
    '서리 폭발':     { kind: 'blast', range: 4, radius: 2 },
    '번개 창':       { kind: 'line',  range: 6 },
    '지진 파쇄':     { kind: 'nova',  range: 2, radius: 2 },
    '용암 강타':     { kind: 'arc',   range: 1 },
    '관통 사격':     { kind: 'line',  range: 6 },
    '연쇄 폭풍':     { kind: 'chain', range: 4, jump: 2 },
    '공허 베기':     { kind: 'arc',   range: 1 },
    '혈기 폭쇄':     { kind: 'melee', range: 1 },
    '불멸의 진동':   { kind: 'nova',  range: 1, radius: 1 },
    '화염 부패':     { kind: 'blast', range: 5, radius: 2 },
    '빙결 침식':     { kind: 'blast', range: 5, radius: 2 },
    '서리 파동':     { kind: 'blast', range: 3, radius: 1 },
    '뇌운 낙뢰':     { kind: 'chain', range: 4, jump: 2 },
    '심연 전염':     { kind: 'blast', range: 5, radius: 2 },
    '독니 사출':     { kind: 'line',  range: 6 },
    '연발 사격':     { kind: 'blast', range: 5, radius: 0 },
    '폭열 창탄':     { kind: 'line',  range: 6 },
    '암흑 파열':     { kind: 'blast', range: 5, radius: 0 },
    '중력 붕괴':     { kind: 'blast', range: 4, radius: 1 },
    '화염 폭풍핵':   { kind: 'blast', range: 4, radius: 1 },
    '빙결 파열창':   { kind: 'line',  range: 5 },
    '천뢰 분기':     { kind: 'chain', range: 4, jump: 2 },
    '삼원 파동':     { kind: 'blast', range: 4, radius: 1 },
    '뇌격 삼연타':   { kind: 'melee', range: 1 },
    '유성 낙화':     { kind: 'blast', range: 5, radius: 2 },
    '난타 눈보라':   { kind: 'blast', range: 4, radius: 2 },
    // 소환수 젬을 액티브 스킬로 든 경우 본체는 원거리 견제(단일)로 취급한다.
    '서리늑대 소환':   { kind: 'blast', range: 5, radius: 0 },
    '불곰 소환':       { kind: 'blast', range: 5, radius: 0 },
    '벼락멧돼지 소환': { kind: 'blast', range: 5, radius: 0 },
    '칼날까마귀 소환': { kind: 'blast', range: 5, radius: 0 },
    '공허 유충 소환':  { kind: 'blast', range: 5, radius: 0 },
    '벌떼 소환':       { kind: 'blast', range: 5, radius: 0 }
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
