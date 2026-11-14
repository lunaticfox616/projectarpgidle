/** Authored definitions formerly owned by state.js. Shared once by the runtime entry. */
const TUTORIAL_SEEN_ALIASES = Object.freeze({
    unlock_items: 'tutorial_first_gear', unlock_char: 'tutorial_first_passive',
    unlock_chaos_realm: 'unlock_content_chaosRealm', unlock_sky_tower: 'unlock_content_sky',
    unlock_underworld: 'unlock_content_underworld', unlock_cosmos: 'unlock_content_cosmos',
    unlock_ocean_fishing: 'unlock_content_ocean', unlock_time_rift: 'unlock_content_timerift',
    meteor_unlocked: 'unlock_content_meteorSite', unlock_beyond_boundary: 'unlock_content_beyond'
});

const OUTSIDE_CHAOS_ZONE_ID = 'outside_chaos_woodsman';

const CHAOS_REALM_ZONE_ID = 'chaos_realm';

const SKY_TOWER_ZONE_ID = 'sky_tower';

const WOODSMAN_ECHO_ZONE_ID = 'woodsman_echo_challenge';

const UNDERWORLD_ZONE_ID = 'underworld_core';

const abyssTiers = [8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 16, 16, 17, 18, 19, 20];

const CHAOS_REALM_DEFAULT_BONUSES = { pctDmg: 0, move: 0, pctHp: 0, resChaos: 0, resPen: 0, crit: 0, armorPct: 0, evasionPct: 0, energyShieldPct: 0, critDmg: 0, aspd: 0 };

const ABYSS_ENDLESS_STEEP_FLOOR_HP_MUL = 1.198;

const ABYSS_ENDLESS_STEEP_PLAYER_TAKEN_PER_FLOOR = 0.0385;

const CHAOS_REALM_AFFIX_POOL = [
    { id: 'elemental_wall', name: '원소 장벽', desc: '화염/냉기/번개 저항 대폭 증가' },
    { id: 'iron_bark', name: '철갑 껍질', desc: '방어도와 물리 피해 감소 증가' },
    { id: 'mirage_step', name: '환영 보법', desc: '회피 대폭 증가' },
    { id: 'soul_shell', name: '혼백 보호막', desc: '생명력 100%만큼 에너지 보호막 보유' },
    { id: 'projectile_dampening', name: '투사체 굴절', desc: '투사체 피해 반감' },
    { id: 'spell_dampening', name: '주문 왜곡', desc: '주문 피해 반감' },
    { id: 'blood_drinker', name: '흡혈', desc: '적 공격 시 생명력 흡수' },
    { id: 'bloodless', name: '무혈', desc: '플레이어 흡혈 효율 대폭 감소' },
    { id: 'curse_blade', name: '저주의 검', desc: '공격력과 관통 증가' },
    { id: 'curse_immune', name: '저주 면역', desc: '저주 적용 불가' },
    { id: 'phys_dampening', name: '물리 반감', desc: '물리 최종 피해 반감' },
    { id: 'deadly_crit', name: '치명적 본능', desc: '치명타 확률/피해 증가' },
    { id: 'multi_strike', name: '연속타격', desc: '추가 타격 확률' },
    { id: 'deep_penetration', name: '심층 관통', desc: '저항 관통 증가' }
];

const OCEAN_PERMANENT_UPGRADE_DEFS = {
    oxygenMax: { label: '산소 최대치', maxLevel: 20, valuePerLevel: 10, unit: '' },
    oxygenSaving: { label: '산소 소모 감소', maxLevel: 20, valuePerLevel: 3, unit: '%' },
    pressureResist: { label: '수압 패널티 감소', maxLevel: 20, valuePerLevel: 4, unit: '%' }
};

const OCEAN_PERMANENT_UPGRADE_KEYS = Object.keys(OCEAN_PERMANENT_UPGRADE_DEFS);

const OCEAN_CURRENT_POOL = [
    { id: 'cold_current', name: '냉수층', desc: '냉기 적 출현, 냉기 저항 -12' },
    { id: 'warm_current', name: '온수층', desc: '화염 적 출현, 화염 저항 -12' },
    { id: 'riptide', name: '역류', desc: '이동 속도 15% 감폭' },
    { id: 'bioluminescence', name: '발광 생물군', desc: '정확도 18% 감폭' },
    { id: 'still_water', name: '정체수', desc: '산소 시간 소모 35% 증가' },
    { id: 'school_of_fish', name: '물고기 떼', desc: '낚시 게이지 획득 50% 증가' }
];

const ENDLESS_CONTENT_DROP_MULTIPLIER_CAP = 2.25;

const UNDERWORLD_DROP_RATE_MULTIPLIER = 0.5;

const COMBAT_TACTIC_TARGET_PRIORITIES = Object.freeze(['nearest', 'weakest', 'dangerous', 'dense']);

const COMBAT_TACTIC_POSITION_MODES = Object.freeze(['auto', 'pressure', 'keepRange']);

export function createProgressionDefinitions({ STORY_ACTS, OCEAN_FISH_DB, OCEAN_FISH_COLLECTION_MILESTONES, HERO_SELECTION_DEFS, PLAYER_CLASS_DEFS }) {
const ACT_ZONE_COUNT = STORY_ACTS.length;

const LAST_STORY_ZONE_ID = ACT_ZONE_COUNT - 1;

const ABYSS_START_ZONE_ID = ACT_ZONE_COUNT;

const OCEAN_STATE_FISH_KEYS = Object.freeze(Object.keys(OCEAN_FISH_DB));

const OCEAN_COLLECTION_REQUIRED_COUNTS = Object.freeze(OCEAN_FISH_COLLECTION_MILESTONES.map(row => row.required));

const HERO_SELECTION_ORDER = Object.keys(HERO_SELECTION_DEFS);

const PLAYER_CLASS_ORDER = Object.keys(PLAYER_CLASS_DEFS);
return { TUTORIAL_SEEN_ALIASES, ACT_ZONE_COUNT, LAST_STORY_ZONE_ID, ABYSS_START_ZONE_ID, OUTSIDE_CHAOS_ZONE_ID, CHAOS_REALM_ZONE_ID, SKY_TOWER_ZONE_ID, WOODSMAN_ECHO_ZONE_ID, UNDERWORLD_ZONE_ID, abyssTiers, CHAOS_REALM_DEFAULT_BONUSES, ABYSS_ENDLESS_STEEP_FLOOR_HP_MUL, ABYSS_ENDLESS_STEEP_PLAYER_TAKEN_PER_FLOOR, CHAOS_REALM_AFFIX_POOL, OCEAN_PERMANENT_UPGRADE_DEFS, OCEAN_PERMANENT_UPGRADE_KEYS, OCEAN_STATE_FISH_KEYS, OCEAN_COLLECTION_REQUIRED_COUNTS, OCEAN_CURRENT_POOL, ENDLESS_CONTENT_DROP_MULTIPLIER_CAP, UNDERWORLD_DROP_RATE_MULTIPLIER, HERO_SELECTION_ORDER, PLAYER_CLASS_ORDER, COMBAT_TACTIC_TARGET_PRIORITIES, COMBAT_TACTIC_POSITION_MODES };
}
