// 코어(장비창 왼쪽 위 코어 칸, 2026-09-30에 코어 큐브를 대신함): 옵션 줄 풀과 보관 한도.
// 줄과 수치 범위는 예전 코어 큐브의 줄 그대로다. text의 {value} · {extra}는 굴린 값, 없으면 "이름 +값단위".
const CORE_OPTION_POOL = Object.freeze([
    { group: 'defense', id: 'phys_dr', stat: 'dr', label: '물리 피해 감소', unit: '%', min: 2, max: 6 },
    { group: 'defense', id: 'block', stat: 'blockChance', label: '막기 확률', unit: '%', min: 2, max: 6 },
    { group: 'defense', id: 'deflect', stat: 'deflectChance', label: '비껴내기 확률', unit: '%', min: 2, max: 7 },
    { group: 'defense', id: 'block_max', stat: 'blockChanceMax', label: '막기 확률 최대치', unit: '%', min: 2, max: 6 },
    { group: 'defense', id: 'deflect_reduce', stat: 'deflectDamageReduce', label: '비껴내기 피해 감소율', unit: '%', min: 3, max: 10 },
    { group: 'defense', id: 'armor_pct', stat: 'armorPct', label: '방어도', unit: '%', min: 12, max: 36 },
    { group: 'defense', id: 'evasion_pct', stat: 'evasionPct', label: '회피', unit: '%', min: 12, max: 36 },
    { group: 'defense', id: 'es_pct', stat: 'energyShieldPct', label: '에너지보호막', unit: '%', min: 12, max: 36 },
    { group: 'defense', id: 'life_pct', stat: 'pctHp', label: '생명력', unit: '%', min: 6, max: 18 },
    { group: 'defense', id: 'regen', stat: 'regen', label: '생명력 재생', unit: '%', min: 1, max: 4, decimals: 1 },
    { group: 'defense', id: 'es_recovery', stat: 'energyShieldRegen', label: '에너지 보호막 회복 속도', unit: '%', min: 8, max: 24 },

    { group: 'resist', id: 'fire_res', stat: 'resF', label: '화염 저항', unit: '%', min: 8, max: 24 },
    { group: 'resist', id: 'cold_res', stat: 'resC', label: '냉기 저항', unit: '%', min: 8, max: 24 },
    { group: 'resist', id: 'light_res', stat: 'resL', label: '번개 저항', unit: '%', min: 8, max: 24 },
    { group: 'resist', id: 'chaos_res', stat: 'resChaos', label: '카오스 저항', unit: '%', min: 8, max: 24 },
    { group: 'resist', id: 'max_fire', stat: 'maxResF', label: '화염 저항 최대치', unit: '%', min: 1, max: 3 },
    { group: 'resist', id: 'max_cold', stat: 'maxResC', label: '냉기 저항 최대치', unit: '%', min: 1, max: 3 },
    { group: 'resist', id: 'max_light', stat: 'maxResL', label: '번개 저항 최대치', unit: '%', min: 1, max: 3 },
    { group: 'resist', id: 'max_chaos', stat: 'maxResChaos', label: '카오스 저항 최대치', unit: '%', min: 1, max: 3 },
    { group: 'resist', id: 'pen', stat: 'resPen', label: '저항 관통', unit: '%', min: 3, max: 9 },

    { group: 'mitigation', id: 'flat_phys_reduce', stat: 'physFlatTakenReduce', label: '받는 물리 피해 감소', unit: '', min: 3, max: 14 },
    { group: 'mitigation', id: 'flat_fire_reduce', stat: 'fireFlatTakenReduce', label: '받는 화염 피해 감소', unit: '', min: 3, max: 14 },
    { group: 'mitigation', id: 'flat_cold_reduce', stat: 'coldFlatTakenReduce', label: '받는 냉기 피해 감소', unit: '', min: 3, max: 14 },
    { group: 'mitigation', id: 'flat_light_reduce', stat: 'lightFlatTakenReduce', label: '받는 번개 피해 감소', unit: '', min: 3, max: 14 },
    { group: 'mitigation', id: 'flat_chaos_reduce', stat: 'chaosFlatTakenReduce', label: '받는 카오스 피해 감소', unit: '', min: 3, max: 14 },
    { group: 'mitigation', id: 'flat_all_reduce', stat: 'allFlatTakenReduce', label: '받는 피해 감소', unit: '', min: 2, max: 8 },
    { group: 'mitigation', id: 'taken_as_fire', stat: 'physTakenAsFire', min: 3, max: 8, text: '받는 물리 피해의 {value}%를 화염 피해로 받음' },
    { group: 'mitigation', id: 'taken_as_cold', stat: 'physTakenAsCold', min: 3, max: 8, text: '받는 물리 피해의 {value}%를 냉기 피해로 받음' },
    { group: 'mitigation', id: 'taken_as_light', stat: 'physTakenAsLight', min: 3, max: 8, text: '받는 물리 피해의 {value}%를 번개 피해로 받음' },
    { group: 'mitigation', id: 'taken_as_chaos', stat: 'physTakenAsChaos', min: 3, max: 8, text: '받는 물리 피해의 {value}%를 카오스 피해로 받음' },

    { group: 'offense', id: 'added_fire', stat: 'addedFireDamagePct', min: 4, max: 12, text: '총 피해의 {value}%만큼 화염 추가 피해' },
    { group: 'offense', id: 'added_cold', stat: 'addedColdDamagePct', min: 4, max: 12, text: '총 피해의 {value}%만큼 냉기 추가 피해' },
    { group: 'offense', id: 'added_light', stat: 'addedLightDamagePct', min: 4, max: 12, text: '총 피해의 {value}%만큼 번개 추가 피해' },
    { group: 'offense', id: 'added_chaos', stat: 'addedChaosDamagePct', min: 4, max: 12, text: '총 피해의 {value}%만큼 카오스 추가 피해' },
    { group: 'offense', id: 'added_phys', stat: 'addedPhysDamagePct', min: 4, max: 12, text: '총 피해의 {value}%만큼 물리 추가 피해' },
    { group: 'offense', id: 'flat_dmg', stat: 'flatDmg', label: '기본 피해', unit: '', min: 8, max: 26 },
    { group: 'offense', id: 'fire_flat', stat: 'fireFlatDmg', label: '화염 기본 피해', unit: '', min: 8, max: 24 },
    { group: 'offense', id: 'cold_flat', stat: 'coldFlatDmg', label: '냉기 기본 피해', unit: '', min: 8, max: 24 },
    { group: 'offense', id: 'light_flat', stat: 'lightFlatDmg', label: '번개 기본 피해', unit: '', min: 8, max: 24 },
    { group: 'offense', id: 'chaos_flat', stat: 'chaosFlatDmg', label: '카오스 기본 피해', unit: '', min: 8, max: 24 },
    { group: 'offense', id: 'pct_dmg', stat: 'pctDmg', label: '피해 증가', unit: '%', min: 8, max: 24 },
    { group: 'offense', id: 'fire_dmg', stat: 'firePctDmg', label: '화염 피해', unit: '%', min: 10, max: 28 },
    { group: 'offense', id: 'cold_dmg', stat: 'coldPctDmg', label: '냉기 피해', unit: '%', min: 10, max: 28 },
    { group: 'offense', id: 'light_dmg', stat: 'lightPctDmg', label: '번개 피해', unit: '%', min: 10, max: 28 },
    { group: 'offense', id: 'chaos_dmg', stat: 'chaosPctDmg', label: '카오스 피해', unit: '%', min: 10, max: 28 },
    { group: 'offense', id: 'spell_dmg', stat: 'spellFlatPct', label: '주문 피해', unit: '%', min: 8, max: 22 },
    { group: 'offense', id: 'aoe_dmg', stat: 'aoePctDmg', label: '범위 피해', unit: '%', min: 10, max: 28 },
    { group: 'offense', id: 'projectile_dmg', stat: 'projectilePctDmg', label: '투사체 피해', unit: '%', min: 10, max: 28 },
    { group: 'offense', id: 'dot', stat: 'dotPctDmg', label: '지속 피해 배율', unit: '%', min: 10, max: 28 },

    { group: 'utility', id: 'crit', stat: 'crit', label: '치명타 확률', unit: '%', min: 2, max: 7 },
    { group: 'utility', id: 'crit_dmg', stat: 'critDmg', label: '치명타 피해 배율', unit: '%', min: 12, max: 36 },
    { group: 'utility', id: 'double_strike', stat: 'ds', label: '연속 타격', unit: '%', min: 3, max: 9 },
    { group: 'utility', id: 'leech', stat: 'leech', label: '흡혈', unit: '%', min: 1, max: 4, decimals: 1 },
    { group: 'utility', id: 'summon_dmg', stat: 'summonPctDmg', label: '소환수 피해', unit: '%', min: 10, max: 30 },
    { group: 'utility', id: 'summon_hp', stat: 'summonHpPct', label: '소환수 생명력', unit: '%', min: 10, max: 30 },
    { group: 'utility', id: 'summon_crit', stat: 'summonCrit', pairedStat: 'summonCritDmg', pairedMul: 4, min: 2, max: 7,
        text: '소환수 치명타 확률 +{value}%, 치명타 피해 배율 +{paired}%' },
    { group: 'utility', id: 'projectile_shots', stat: 'projectileExtraShots', label: '투사체 추가 발사', unit: '', min: 1, max: 1 },
    { group: 'utility', id: 'spell_flat_pct', stat: 'spellFlatPct', label: '주문 내장 피해 증가', unit: '%', min: 8, max: 22 },
    { group: 'utility', id: 'slam_aftershock', stat: 'slamEchoChance', pairedStat: 'slamEchoDamagePct', min: 4, max: 12, extraMin: 35, extraMax: 90,
        text: '강타 공격 시 {value}% 확률로 {extra}%만큼의 여진 피해 추가' },
    { group: 'utility', id: 'double_damage', stat: 'doubleDamageChance', min: 2, max: 6, text: '{value}% 확률로 2배의 피해를 줌' }
]);

// lines: 코어 한 개의 줄 수. savedLimit: 예전 코어 보관함(2026-10-10 전 저장)을 불러올 때 자르는 상한. 코어는 이제 가방에 들어간다.
const CORE_ITEM_RULES = Object.freeze({
    lines: 4,
    savedLimit: 60,
    underworldFloor: 11,
    groupNames: Object.freeze({ defense: '수호', resist: '저항', mitigation: '완화', offense: '파괴', utility: '기교' })
});

safeExposeData({ CORE_OPTION_POOL, CORE_ITEM_RULES });
