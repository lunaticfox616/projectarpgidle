export const DROPPED_AFFIX_TIER_WEIGHT_FALLOFF = 0.2;

export const EQUIPMENT_DROP_SLOTS = ['무기', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠', '방패'];

export const uniqueMeetsTier = (unique, tier) => !!unique && tier >= ((unique.dropOnly && unique.dropOnly.minTier) || unique.reqTier || 1);

export const UNIQUE_JEWEL_DB = [
    { id:'uj_crown_empty', name:'비어 있는 왕좌', ultra:true, uniqueEffect:'다른 고유 주얼이 없으면 피해 +25%, 룬 레벨 +1 추가', stats:[{id:'pctDmg',val:25},{id:'gemLevel',val:1}] },
    { id:'uj_mirror_heart', name:'거울 심장', ultra:true, uniqueEffect:'반지 소켓에 끼우면 반대쪽 반지 소켓의 주얼 복제', stats:[{id:'pctDmg',val:8},{id:'resAll',val:8}] },
    { id:'uj_old_box', name:'오래된 보석함', ultra:true, uniqueEffect:'가방의 마법 아이템 하나마다 공격 속도 +0.5%(최대 30%), 희귀 하나마다 피해 +1.2%(최대 60%), 고유 하나마다 물리 피해 감소 +1.5%(최대 12%)', stats:[{id:'aspd',val:6},{id:'resAll',val:10}] },
    { id:'uj_hurried_mind', name:'다급해지는 마음', ultra:true, uniqueEffect:'적이 없으면 이동속도 +50%', stats:[{id:'move',val:12},{id:'regen',val:1.2}] },
    { id:'uj_condensed_curse', name:'응축된 저주', ultra:true, uniqueEffect:'저주 최대치 +1, 대상 저주당 최종 피해 +10%', stats:[{id:'dotPctDmg',val:14},{id:'resPen',val:6}] },
    { id:'uj_burning_will', name:'불같은 의지', ultra:true, uniqueEffect:'최대치를 넘는 화염 저항 1%마다 기본 피해 +0.5%(최대 35%)', stats:[{id:'maxResF',val:2},{id:'firePctDmg',val:12}] },
    { id:'uj_closed_eyes', name:'질끈 감은 눈', ultra:true, uniqueEffect:'플레이어 상태이상 면역, 부적의 수호, 함성, 저주 줄 비활성', stats:[{id:'dr',val:6},{id:'resAll',val:12}] },
    { id:'uj_spark_ember', name:'불씨의 파편', stats:[{id:'firePctDmg',val:14},{id:'igniteChance',val:10}] },
    { id:'uj_frost_nail', name:'서리 못', stats:[{id:'coldPctDmg',val:14},{id:'chillChance',val:10}] },
    { id:'uj_storm_shard', name:'폭풍 조각', stats:[{id:'lightPctDmg',val:14},{id:'shockEffectReducePct',val:12}] },
    { id:'uj_venom_eye', name:'독안', stats:[{id:'chaosPctDmg',val:14},{id:'poisonChance',val:12}] },
    { id:'uj_blood_tine', name:'혈극', stats:[{id:'physPctDmg',val:14},{id:'bleedChance',val:12}] },
    { id:'uj_iron_husk', name:'강철 껍질', stats:[{id:'armorPct',val:16},{id:'dr',val:5}] },
    { id:'uj_windstep', name:'바람걸음', stats:[{id:'move',val:14},{id:'aspd',val:8}] },
    { id:'uj_null_seed', name:'영점 씨앗', stats:[{id:'resPen',val:7},{id:'crit',val:1.2}] },
    { id:'uj_root_charm', name:'뿌리 부적', stats:[{id:'flatHp',val:55},{id:'regen',val:1.5}] },
    { id:'uj_tide_mark', name:'조류 각인', stats:[{id:'dotPctDmg',val:12},{id:'dotTakenDamageReducePct',val:8}] },
    { id:'uj_ash_loop', name:'잿빛 고리', stats:[{id:'critDmg',val:18},{id:'crit',val:1}] },
    { id:'uj_horizon_pin', name:'지평 핀', stats:[{id:'projectilePctDmg',val:16},{id:'minDmgRoll',val:4}] },
    { id:'uj_stone_beat', name:'석맥 박동', stats:[{id:'slamPctDmg',val:16},{id:'maxDmgRoll',val:4}] },
    { id:'uj_lattice', name:'격자 파편', stats:[{id:'resAll',val:10},{id:'energyShieldPct',val:12}] },
    { id:'uj_bramble', name:'가시덩굴', stats:[{id:'evasionPct',val:12},{id:'takenDamageReduceWhen2EnemiesPct',val:6}] },
    { id:'uj_dawn_chip', name:'새벽 조각', stats:[{id:'pctDmg',val:12},{id:'takenDamageReduceWhen1EnemyPct',val:4}] },
    // 2026-10-02 재능 정리: 얻을 수 없게 된 옛 재능 카드의 효과(bloomMechanic, js/talent-cards.js getGrantedBloomMechanics).
    // 일반 고유 풀에 둔다(울트라 풀이면 고유 주얼 하나당 약 0.4%로 너무 드물다).
    { id:'uj_judgment_mark', name:'심판의 표식', bloomMechanic:'hero1__inquisitor', uniqueEffect:'공격하면 5초 동안 피해를 모으는 표식을 남기고, 5초 뒤 모은 피해의 12%로 터짐(재사용 6초)', stats:[{id:'pctDmg',val:8},{id:'crit',val:1}] },
    { id:'uj_hex_burst', name:'터지는 저주', bloomMechanic:'hero1__warlock', uniqueEffect:'저주에 걸린 적을 공격하면 그 저주를 터뜨려 적 모두에게 0.2배 피해', stats:[{id:'chaosPctDmg',val:10},{id:'dotPctDmg',val:10}] },
    { id:'uj_stinger', name:'독침의 끝', bloomMechanic:'hero1__catalyst', uniqueEffect:'남은 지속 피해가 적의 남은 생명력보다 많으면 그 적을 바로 마무리', stats:[{id:'dotPctDmg',val:14},{id:'poisonChance',val:8}] },
    { id:'uj_crowd_roar', name:'관중의 함성', bloomMechanic:'hero2__gladiator', uniqueEffect:'처치마다 관중의 함성 1중첩, 5중첩이면 다음 공격이 주변 적 다섯에게 120% 피해(적이 하나면 피해 20% 증폭)', stats:[{id:'meleePctDmg',val:12},{id:'aspd',val:5}] },
    { id:'uj_moon_shadow', name:'달그림자', bloomMechanic:'hero3__assassin', uniqueEffect:'치명타 피해의 20%가 모든 피해 감소를 무시하는 고정 피해로 바뀜', stats:[{id:'critDmg',val:15},{id:'crit',val:1}] },
    { id:'uj_forest_ring', name:'숲마당', bloomMechanic:'hero3__gladiator', uniqueEffect:'플레이어와 몬스터의 모든 공격이 반드시 명중함', stats:[{id:'flatHp',val:40},{id:'aspd',val:4}] },
    { id:'uj_defiant_bolt', name:'거역의 번개', bloomMechanic:'hero5__assassin', uniqueEffect:'번개 피해가 카오스 피해로 바뀌고, 카오스 피해를 준 적의 생명력 재생 50% 감소', stats:[{id:'chaosPctDmg',val:12},{id:'lightPctDmg',val:8}] },
    { id:'uj_pilgrim_spark', name:'순례자의 번개', bloomMechanic:'hero5__ranger', uniqueEffect:'물리 피해의 50%가 번개 피해로 바뀜', stats:[{id:'lightPctDmg',val:12},{id:'physPctDmg',val:8}] },
    { id:'uj_endless_night', name:'끝없는 밤', bloomMechanic:'hero5__warlock', uniqueEffect:'적에게 거는 저주가 끝나지 않음', stats:[{id:'dotPctDmg',val:10},{id:'resPen',val:4}] },
    { id:'uj_marksman_eye', name:'명사수의 눈', bloomMechanic:'hero6__ranger', uniqueEffect:'치명타 확률을 두 번 굴려 좋은 쪽을 쓰고, 치명타 확률이 100%를 넘으면 넘는 몫의 50%가 치명타 피해로 바뀜', stats:[{id:'crit',val:1.5},{id:'critDmg',val:12}] },
    { id:'uj_three_way', name:'삼갈래 화살', bloomMechanic:'hero6__gladiator', uniqueEffect:'투사체가 세 갈래로 나뉘어 날아감, 투사체 추가 발사 +1, 투사체 연속 타격 확률 +50%', stats:[{id:'projectilePctDmg',val:12},{id:'aspd',val:4}] },
    { id:'uj_elemental_oath', name:'원소 성전', bloomMechanic:'hero9__crusader', uniqueEffect:'생명력이 1로 고정되는 대신 받는 카오스 피해 50% 감소', stats:[{id:'energyShieldPct',val:20},{id:'resAll',val:10}] },
    { id:'uj_root_bond', name:'뿌리 결속', bloomMechanic:'hero3__soulbinder', uniqueEffect:'소환수의 공격 속도가 플레이어의 공격 속도와 같아지는 대신 플레이어는 공격하지 않음', stats:[{id:'summonPctDmg',val:15},{id:'summonHpPct',val:10}] },
    { id:'uj_blue_judgment', name:'푸른 심판', bloomMechanic:'hero3__inquisitor', uniqueEffect:'원소 공격의 15%가 적의 원소 저항을 반대로 셈', stats:[{id:'elementalPctDmg',val:12},{id:'resPen',val:3}] }
];

export const JEWEL_SUMMON_OPTION_IDS = new Set(['summonFlatDmg', 'summonPctDmg', 'summonAspd', 'summonHpPct', 'summonCrit', 'summonCritDmg', 'summonEfficiency', 'summonResPen']);

export const JEWEL_SUMMON_OPTION_GROUP = { id: '__summonOptionGroup', name: '소환수 옵션군' };

export const JEWEL_OPTION_POOL = [
    { id: 'pctDmg', name: '피해 증폭', min: 4, max: 10 },
    { id: 'physPctDmg', name: '물리 증폭', min: 6, max: 15 },
    { id: 'firePctDmg', name: '화염 증폭', min: 6, max: 15 },
    { id: 'coldPctDmg', name: '냉기 증폭', min: 6, max: 15 },
    { id: 'lightPctDmg', name: '번개 증폭', min: 6, max: 15 },
    { id: 'chaosPctDmg', name: '카오스 증폭', min: 6, max: 15 },
    { id: 'flatHp', name: '생명력 주입', min: 20, max: 45 },
    { id: 'crit', name: '치명 보석', min: 1, max: 3 },
    { id: 'aspd', name: '질주 보석', min: 3, max: 7 },
    // 재사용 대기시간 세팅(2026-10-21): 한 개로는 작고, 여러 개를 모아야 난사에 다가간다.
    { id: 'cooldownRecovery', name: '순환 수정', min: 2, max: 4 },
    { id: 'mobilityCooldownRecovery', name: '바람결 파편', min: 3, max: 6 },
    { id: 'resAll', name: '수호 보석', min: 4, max: 9 },
    { id: 'resF', name: '화염 수호', min: 8, max: 18 },
    { id: 'resC', name: '냉기 수호', min: 8, max: 18 },
    { id: 'resL', name: '번개 수호', min: 8, max: 18 },
    { id: 'resChaos', name: '공허 수호', min: 4, max: 8 },
    { id: 'physIgnore', name: '절개 파편', min: 2, max: 6 },
    { id: 'dr', name: '강인 파편', min: 3, max: 8 },
    { id: 'resPen', name: '관통 수정', min: 2, max: 6 },
    { id: 'dotPctDmg', name: '부패 수정', min: 4, max: 10 },
    { id: 'regenSuppress', name: '봉쇄 파편', min: 0.5, max: 0.5, step: 0.1 },
    { id: 'minDmgRoll', name: '하한 수정', min: 1, max: 3 },
    { id: 'maxDmgRoll', name: '상한 수정', min: 1, max: 3 },
    { id: 'armorPct', name: '강화 외피', min: 4, max: 10 },
    { id: 'evasionPct', name: '유동 보법', min: 4, max: 10 },
    { id: 'energyShieldPct', name: '보호막 기동', min: 4, max: 10 },
    { id: 'summonFlatDmg', name: '사역 피해 주입', min: 4, max: 12 },
    { id: 'summonPctDmg', name: '지배자의 파편', min: 6, max: 16 },
    { id: 'summonAspd', name: '무리의 가속', min: 3, max: 9, step: 0.5 },
    { id: 'summonHpPct', name: '사역 생명핵', min: 6, max: 16 },
    { id: 'summonCrit', name: '야수의 눈', min: 1, max: 4, step: 0.5 },
    { id: 'summonCritDmg', name: '포식의 송곳니', min: 10, max: 28 },
    { id: 'summonEfficiency', name: '영혼 결속정', min: 4, max: 12 },
    { id: 'summonResPen', name: '사역 관통석', min: 1, max: 5, step: 0.5 },
    { id: 'ailResIgnite', name: '소염 수정', min: 12.5, max: 50, step: 0.5 },
    { id: 'ailResShock', name: '절연 수정', min: 12.5, max: 50, step: 0.5 },
    { id: 'ailResFreeze', name: '방한 수정', min: 12.5, max: 50, step: 0.5 },
    { id: 'ailResPoison', name: '해독 수정', min: 12.5, max: 50, step: 0.5 },
    { id: 'ailResBleed', name: '지혈 수정', min: 12.5, max: 50, step: 0.5 },
];

export const JEWEL_HIDDEN_TIER_COUNT = 5;

export const JEWEL_PETITE_OPTION_POOL = [
    { id: 'pctDmg', name: '작은 피해결', magic: [1, 1], rare: [1, 2] },
    { id: 'flatHp', name: '작은 생명결', magic: [4, 6], rare: [6, 9] },
    { id: 'crit', name: '작은 치명결', magic: [0.5, 0.5], rare: [0.5, 1] },
    { id: 'aspd', name: '작은 가속결', magic: [1, 1], rare: [1, 2] },
    { id: 'resAll', name: '작은 수호결', magic: [1, 1], rare: [1, 2] },
    { id: 'resPen', name: '작은 관통결', magic: [1, 1], rare: [1, 2] },
    { id: 'regen', name: '작은 재생결', magic: [0.1, 0.1], rare: [0.1, 0.2], step: 0.1 }
];

export const QUALITY_ATTRIBUTE_MODES = ['base', 'fire', 'cold', 'light', 'chaos', 'physical', 'defense', 'speed'];

export const QUALITY_CATALYST_MODES = ['crit', 'summon'];

export const QUALITY_ATTRIBUTE_LABELS = { base: '기본', fire: '화염', cold: '냉기', light: '번개', chaos: '카오스', physical: '물리', defense: '방어', speed: '속도',
    crit: '치명', summon: '소환' };

export const BASE_ELEMENT_STATS = Object.freeze({ phys: 'physPctDmg', fire: 'firePctDmg', light: 'lightPctDmg' });
