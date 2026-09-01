'use strict';

const CLASS_SECTORS = Object.freeze([
    { id: 'occultist', angle: -30, startId: 'pt_start_occultist', cat: 'int', icon: 'arcane', themes: [
        ['spell', '주문 각인', ['spellPctDmg', 'spellFlatDmg']],
        ['channel', '집중의 핵', ['channelingPctDmg', 'spellPctDmg']],
        ['chaos', '심연 침식', ['chaosPctDmg', 'resPen']],
        ['dot', '부패의 시간', ['dotPctDmg', 'ailmentDamagePct']],
        ['energy', '보호막 직조', ['energyShieldPct', 'energyShield']],
        ['recharge', '보호막 순환', ['energyShieldPct', 'energyShieldRegen']],
        ['spell_crit', '비전 급소', ['spellPctDmg', 'crit', 'critDmg']],
        ['spell_leech', '마력 흡수', ['spellPctDmg', 'leech']],
        ['erosion', '잠식의 흔적', ['chaosPctDmg', 'dotPctDmg', 'resPen']],
        ['summon', '심연의 사역', ['summonPctDmg', 'summonHpPct', 'summonEfficiency']]
    ] },
    { id: 'cleric', angle: 30, startId: 'pt_start_cleric', cat: 'devotion', icon: 'shield', themes: [
        ['shield', '성역의 방패', ['shieldPctDmg', 'blockChance']],
        ['block', '굳건한 막기', ['blockChance', 'armorPct']],
        ['armor', '성전 갑주', ['armorPct', 'armor']],
        ['energy', '성광 보호막', ['energyShieldPct', 'energyShield']],
        ['life', '회복의 기도', ['pctHp', 'regen']],
        ['resist', '정화의 장막', ['resAll', 'pctHp']],
        ['maximum_resist', '불변의 성역', ['resAll', 'maxResAll', 'pctHp']],
        ['devotion', '계시의 응답', ['devotion', 'pctHp', 'resAll', 'regen']],
        ['guard_summon', '수호 사역', ['summonHpPct', 'summonGuardRedirectPct', 'summonPctDmg']],
        ['summon_efficiency', '성스러운 지휘', ['summonEfficiency', 'summonPctDmg', 'summonGemLevel']]
    ] },
    { id: 'warrior', angle: 90, startId: 'pt_start_warrior', cat: 'str', icon: 'strength', themes: [
        ['physical', '철의 일격', ['physPctDmg', 'flatDmg']],
        ['melee', '근접 숙련', ['meleePctDmg', 'aspd']],
        ['slam', '대지 강타', ['slamPctDmg', 'maxDmgRoll']],
        ['armor', '중갑 훈련', ['armorPct', 'armor']],
        ['life', '거인의 체력', ['pctHp', 'flatHp']],
        ['shield', '방패 전투', ['shieldPctDmg', 'blockChance']],
        ['damage_roll', '확실한 타격', ['minDmgRoll', 'maxDmgRoll']],
        ['echo', '대지의 여진', ['slamPctDmg', 'slamEchoChance', 'armorPct']],
        ['leech', '전장의 갈증', ['physPctDmg', 'leech']],
        ['bleed', '깊은 상처', ['physPctDmg', 'bleedChance', 'dotPctDmg']]
    ] },
    { id: 'wanderer', angle: 150, startId: 'pt_start_wanderer', cat: 'dex', icon: 'blade', themes: [
        ['melee', '유랑 검술', ['meleePctDmg', 'aspd']],
        ['mobility', '그림자 기동', ['mobilityPctDmg', 'move']],
        ['critical', '치명적 빈틈', ['crit', 'critDmg']],
        ['evasion', '흐르는 회피', ['evasionPct', 'evasion']],
        ['deflect', '칼날 비껴내기', ['deflectChance', 'deflectDamageReduce']],
        ['speed', '바람 걸음', ['aspd', 'move']],
        ['leech', '붉은 추격', ['meleePctDmg', 'leech']],
        ['chaos', '공허의 칼끝', ['chaosPctDmg', 'meleePctDmg']],
        ['poison', '독 묻은 칼날', ['poisonChance', 'ailmentDamagePct']],
        ['duel', '고독한 결투', ['meleePctDmg', 'takenDamageReduceWhen1EnemyPct']]
    ] },
    { id: 'archer', angle: 210, startId: 'pt_start_archer', cat: 'dex', icon: 'projectile', themes: [
        ['projectile', '투사체 숙련', ['projectilePctDmg', 'aspd']],
        ['volley', '다중 사격', ['projectilePctDmg', 'projectileExtraShots', 'aspd']],
        ['targets', '표적 분배', ['projectilePctDmg', 'targetProjectile', 'accuracy']],
        ['accuracy', '정밀 사격', ['accuracy', 'crit']],
        ['critical', '급소 조준', ['crit', 'critDmg']],
        ['speed', '속사 훈련', ['aspd', 'projectilePctDmg']],
        ['damage_roll', '안정된 궤적', ['minDmgRoll', 'maxDmgRoll']],
        ['evasion', '사냥꾼의 회피', ['evasionPct', 'move']],
        ['cold', '서리 화살', ['coldPctDmg', 'projectilePctDmg']],
        ['physical', '중량 화살', ['physPctDmg', 'projectilePctDmg', 'physIgnore']]
    ] },
    { id: 'alchemist', angle: 270, startId: 'pt_start_alchemist', cat: 'int', icon: 'potion', themes: [
        ['potion', '연금 투척', ['potionPctDmg', 'aoePctDmg']],
        ['mine', '룬 지뢰', ['minePctDmg', 'aoePctDmg']],
        ['area', '확산 반응', ['aoePctDmg', 'elementalPctDmg']],
        ['elemental', '삼원 촉매', ['elementalPctDmg', 'ailmentPotencyPct']],
        ['fire', '발화 약제', ['firePctDmg', 'igniteChance']],
        ['cold', '빙결 약제', ['coldPctDmg', 'freezeChance', 'chillChance']],
        ['lightning', '전도 약제', ['lightPctDmg', 'shockChance']],
        ['chaos', '맹독 약제', ['chaosPctDmg', 'poisonChance']],
        ['ailment', '반응 증폭', ['ailmentDamagePct', 'ailmentPotencyPct']],
        ['resist', '내성 조제', ['resAll', 'ailmentPotencyPct']]
    ] }
]);

const HYBRID_SECTORS = Object.freeze([
    { id: 'occultist_cleric', angle: 0, cat: 'int', icon: 'arcane', themes: [
        ['sanctuary', '정신의 성소', ['energyShieldPct', 'spellPctDmg']],
        ['devotion_spell', '계시 주문', ['devotion', 'spellPctDmg', 'energyShieldPct', 'resAll']],
        ['guard_energy', '수호 방벽', ['energyShieldPct', 'summonHpPct']],
        ['resist_energy', '영혼 장막', ['resAll', 'energyShieldPct']],
        ['channel_guard', '불굴의 집중', ['channelingPctDmg', 'pctHp']]
    ] },
    { id: 'cleric_warrior', angle: 60, cat: 'str', icon: 'shield', themes: [
        ['shield_armor', '움직이는 성벽', ['shieldPctDmg', 'armorPct']],
        ['block_life', '철벽 생명', ['blockChance', 'pctHp']],
        ['slam_shield', '방패 강타', ['slamPctDmg', 'shieldPctDmg']],
        ['resist_armor', '불굴의 갑주', ['resAll', 'armorPct']],
        ['guard_regen', '수호 회복', ['regen', 'summonGuardRedirectPct', 'pctHp']]
    ] },
    { id: 'warrior_wanderer', angle: 120, cat: 'str', icon: 'blade', themes: [
        ['blood_speed', '피의 가속', ['leech', 'aspd']],
        ['mobile_melee', '돌진 검술', ['mobilityPctDmg', 'meleePctDmg']],
        ['bleed_crit', '절개', ['bleedChance', 'critDmg']],
        ['evasion_armor', '유연한 갑주', ['evasionPct', 'armorPct']],
        ['roll_speed', '빠른 중격', ['minDmgRoll', 'aspd']]
    ] },
    { id: 'wanderer_archer', angle: 180, cat: 'dex', icon: 'precision', themes: [
        ['critical_projectile', '정밀 투사체', ['projectilePctDmg', 'crit']],
        ['mobile_projectile', '기동 사격', ['mobilityPctDmg', 'projectilePctDmg']],
        ['speed_evasion', '사냥의 바람', ['aspd', 'evasionPct']],
        ['poison_projectile', '독 탄두', ['poisonChance', 'projectilePctDmg']],
        ['range_roll', '먼 거리 조준', ['maxDmgRoll', 'projectilePctDmg']]
    ] },
    { id: 'archer_alchemist', angle: 240, cat: 'dex', icon: 'projectile', themes: [
        ['elemental_projectile', '원소 탄두', ['elementalPctDmg', 'projectilePctDmg']],
        ['ailment_projectile', '오염된 탄두', ['ailmentDamagePct', 'projectilePctDmg']],
        ['potion_projectile', '분산 약제', ['potionPctDmg', 'projectilePctDmg']],
        ['cold_poison', '냉독 화살', ['coldPctDmg', 'poisonChance']],
        ['area_projectile', '폭발 화살', ['aoePctDmg', 'projectilePctDmg']]
    ] },
    { id: 'alchemist_occultist', angle: 300, cat: 'int', icon: 'chaos', themes: [
        ['black_distill', '검은 증류', ['chaosPctDmg', 'elementalPctDmg']],
        ['chaos_potion', '공허 약제', ['chaosPctDmg', 'potionPctDmg']],
        ['dot_spell', '부패 주문', ['dotPctDmg', 'spellPctDmg']],
        ['ailment_channel', '침식 광선', ['ailmentDamagePct', 'channelingPctDmg']],
        ['energy_poison', '독성 보호막', ['energyShieldPct', 'poisonChance']]
    ] }
]);

const SPECIAL_THEMES = Object.freeze([
    { id: 'devotion_triple', angle: 0, cat: 'devotion', icon: 'devotion', label: '세 갈래 계시', stats: ['devotion', 'pctHp', 'resAll', 'regen'] },
    { id: 'universal_summon', angle: 30, cat: 'none', icon: 'summon', label: '응축된 사역', stats: ['summonPctDmg', 'summonHpPct', 'summonEfficiency'] },
    { id: 'cycle_reverse', angle: 90, cat: 'cycle', icon: 'cycle', label: '거꾸로 흐르는 시간', stats: ['cycle', 'aspd', 'move', 'regen'] },
    { id: 'universal_flask', angle: 90, tangent: 300, cat: 'none', icon: 'potion', label: '고농도 투약', stats: ['potionPctDmg', 'regen'] },
    { id: 'universal_gem', angle: 150, cat: 'none', icon: 'constellation', label: '젬 공명', stats: ['pctDmg', 'suppCap', 'aspd'] },
    { id: 'mystique_single', angle: 180, cat: 'mystique', icon: 'mystique', label: '단일 관측', stats: ['mystique', 'ailmentPotencyPct', 'crit', 'resPen'] },
    { id: 'universal_defense', angle: 210, cat: 'none', icon: 'shield', label: '혼합 방어', stats: ['pctHp', 'resAll', 'evasionPct'] },
    { id: 'cycle_element', angle: 240, cat: 'cycle', icon: 'cycle', label: '원소 순환', stats: ['cycle', 'elementalPctDmg', 'aspd', 'resPen'] },
    { id: 'universal_damage', angle: 270, cat: 'none', icon: 'elemental', label: '추가 피해', stats: ['pctDmg', 'resPen'] },
    { id: 'devotion_guard', angle: 300, cat: 'devotion', icon: 'devotion', label: '수호 계시', stats: ['devotion', 'energyShieldPct', 'resAll', 'pctHp'] }
]);

const KEYSTONES = Object.freeze({
    occultist: { name: '남겨진 잠식', desc: '적 처치 시 해당 적의 카오스 잠식 중첩 50%를 다음 공격 대상으로 이전합니다.\n카오스 잠식 최대치가 20 증가합니다.\n카오스 명중 피해가 15% 감폭됩니다.', icon: 'chaos' },
    cleric: { name: '대리 성약', desc: '방어형 소환수의 피해 대리 비율이 50%p 증가하고 생명력이 100% 증폭됩니다.\n플레이어는 막기와 비껴내기를 사용할 수 없습니다.\n방어형 소환수의 부활 대기시간이 100% 증가합니다.', icon: 'devotion' },
    warrior: { name: '한 번의 중량', desc: '공격 피해 편차가 항상 최대 피해로 결정됩니다.\n공격 스킬 속도가 30% 감폭됩니다.', icon: 'strength' },
    wanderer: { name: '완전 회피', desc: '방어도와 막기 확률이 0이 됩니다.\n회피 확률이 15%p 증가합니다(최대 90%).\n공격을 회피하면 다음 근접 공격의 치명타가 확정됩니다.', icon: 'wind' },
    archer: { name: '관통 행렬', desc: '투사체 스킬 타겟 수가 2 증가합니다.\n두 번째 이후 대상에게 주는 투사체 피해가 40% 감폭됩니다.\n하나의 스킬 행동으로 같은 적을 중복 타격할 수 없습니다. 단, 회귀 타격은 예외입니다.', icon: 'projectile' },
    alchemist: { name: '폭발성 증류', desc: '포션 스킬은 치명타를 가할 수 없고 명중 피해가 25% 감폭됩니다.\n포션 스킬의 상태이상 유발 확률이 25%p 증가하고 상태이상 피해가 75% 증폭됩니다.', icon: 'potion' },
    occultist_cleric: { name: '혼의 성소', desc: '생명력 재생과 주문 흡혈이 에너지 보호막에 적용됩니다.\n생명력은 재생하거나 흡혈할 수 없습니다.', icon: 'arcane' },
    cleric_warrior: { name: '움직이는 성벽', desc: '모든 회피가 같은 수치의 방어도로 전환됩니다.\n막기 확률 최대치가 5%p 증가합니다.\n비껴내기를 사용할 수 없고 이동 속도가 10% 감폭됩니다.', icon: 'shield' },
    warrior_wanderer: { name: '피의 가속', desc: '생명력을 재생할 수 없습니다.\n생명력이 최대일 때도 생명력 흡수가 유지됩니다.\n흡혈 중 공격 속도와 이동 속도가 15% 증가합니다.', icon: 'blade' },
    wanderer_archer: { name: '선제 사냥', desc: '각 적에게 가하는 첫 공격의 피해가 100% 증폭됩니다.\n첫 공격 이후 해당 적에게 주는 피해가 20% 감폭됩니다.', icon: 'precision' },
    archer_alchemist: { name: '오염된 탄두', desc: '투사체 스킬은 치명타를 가할 수 없습니다.\n투사체로 유발하는 점화, 중독 및 출혈 확률이 20%p 증가하고 피해가 50% 증폭됩니다.', icon: 'projectile' },
    alchemist_occultist: { name: '검은 증류', desc: '원소 피해의 50%가 카오스 피해로 전환됩니다.\n원소 상태이상을 유발할 수 없습니다.\n중독 확률이 20%p 증가합니다.', icon: 'chaos' },
    mystique_single: { name: '단일 해석', desc: '가장 높은 피해 속성에 대응하는 상태이상만 유발할 수 있습니다.\n신비가 제공하는 상태이상 확률, 피해 및 위력 효과가 2배가 됩니다.', icon: 'mystique' },
    cycle_reverse: { name: '역행 순환', desc: '순환 효과가 상태이상 종료 시가 아니라 상태이상 시작 시 발동합니다.\n순환 효과는 한 종류만 유지되며 효과가 50% 감폭됩니다.', icon: 'cycle' },
    devotion_triple: { name: '삼중 계시', desc: '계시 방향을 선택할 수 없습니다.\n전투, 수호 및 생명 계시 효과를 각각 40%의 효과로 모두 받습니다.\n타락한 복음과 동시에 할당할 수 없습니다.', icon: 'devotion' },
    universal_summon: { name: '단 하나의 사역', desc: '공격형 소환수 최대 한도가 1이 됩니다.\n잃은 소환수 최대 한도 1당 남은 공격형 소환수의 피해가 75%, 생명력이 50% 증폭됩니다.\n해당 소환수의 부활 대기시간이 100% 증가합니다.', icon: 'summon' },
    universal_flask: { name: '과잉 투여', desc: '유틸리티 플라스크 효과가 50% 증폭됩니다.\n유틸리티 플라스크 최대 충전과 처치 시 획득 충전이 50% 감폭됩니다.', icon: 'potion' }
});

module.exports = { CLASS_SECTORS, HYBRID_SECTORS, KEYSTONES, SPECIAL_THEMES };
