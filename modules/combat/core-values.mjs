// Combat tuning shared by native owners and the temporary classic bridge. No mutable encounter state.
export const LEECH_SOFTCAP_START = 1.2;

export const LEECH_SOFTCAP_MID = 2.5;

export const LEECH_SOFTCAP_MID_EFF = 0.6;

export const LEECH_SOFTCAP_HIGH_EFF = 0.3;

export const LEECH_BASE_INSTANCE_CAP_PCT = 20;

export const LEECH_BASE_TOTAL_CAP_PCT = 40;

export const LEECH_BASE_RATE_CAP_PCT = 4;

export const ARMOR_MITIGATION_SCALE = 24;

export const SKILL_DELAY_REDUCE_CAP = 50;

// 스킬 딜레이 감소(%)의 한도: 공격 간격이 절반 아래로 줄지 않는다
export const EVASION_ACCURACY_SCALE = 3.5;

export const EVASION_ENTROPY_RESET_MS = 3330;

export const SUMMON_EVASION_CAP_PCT = 85;
export const SUMMON_EVASION_POST_20_STEP_MULTIPLIER = 4;

export const SUMMON_EFFICIENCY_EVASION_RATIO = 0.5;

export const PLAYER_ACCURACY_BASE = 80;

export const PLAYER_ACCURACY_PER_LEVEL = 3;

export const PLAYER_ACCURACY_PER_DEXTERITY = 5;

export const MIN_PENETRATED_RESISTANCE = -200;

export const CRIT_DAMAGE_BASE_MULTIPLIER = 125;

export const PLAYER_PHYSICAL_REDUCTION_CAP_PCT = 75;

export const CONDITION_GUARD_PHYSICAL_REDUCTION_CAP_PCT = 90;

export const WARCRY_PHYSICAL_REDUCTION_CAP_BONUS_PCT = 3;

export const COMBAT_PROJECTILE_MIN_TRAVEL_MS = 120;

export const COMBAT_PROJECTILE_MS_PER_CELL = 55;

export const BOSS_ATTACK_IMPACT_DELAY_MS = 500;

// Keep the classic bridge's public names while the shared definitions live below combat.
export { ENTRY_BOSS_EASING, UNDERWORLD_ENTRY_BENCHMARK_HP_MULTIPLIER, UNDERWORLD_ENTRY_BENCHMARK_DAMAGE_MULTIPLIER } from '../data/enemy-entry-tuning.mjs';

/** 판(위에서 보는 전장)의 심해 가디언 판이 시작하는 진행도: 막대 끝 바로 앞이라 다음 틱에 가디언이 선다(beginOceanRunRules).
 * 정확히 100이면 advanceMapProgress가 무리를 부르기 전에 돌아가 가디언이 서지 않는다. */
export const OCEAN_GUARDIAN_BOARD_START_PROGRESS = 99.9;

export const COMBAT_TACTIC_TARGET_LOCK_MS = 750;

export const COMBAT_TACTIC_STALL_MS = 2000;

export const COMBAT_TACTIC_MAX_RETREATS = 2;

/** 공격 후딜(getPlayerAttackRecoveryMs): 공격 간격에서 차지하는 몫, 게임 프레임 하나(걸음 시계, ms), 가장 긴 프레임 수. */
export const PLAYER_ATTACK_RECOVERY = /* @__PURE__ */ Object.freeze({ share: 0.35, frameMs: 20, maxFrames: 20 });

/** 사거리 안에 적이 있는데 걷는 동안 공격 게이지가 차는 빠르기(배수, getWalkingChargeScale). */
export const PLAYER_WALKING_CHARGE = 0.5;

export const PLAYER_HIT_SCALE_LABELS = /* @__PURE__ */ Object.freeze([['regen', '재생'], ['fireRes', '화저']]);

export const WARRIOR_RAGE_STACK_MAX = 5;

// Matches ASCENDANCY_KEYSTONE_VALUES.w5.
export const WARRIOR_RAGE_STACK_DAMAGE_PCT = 6;

export const WARRIOR_RAGE_DURATION_MS = 5000;

export const ELEMENTALIST_OVERLOAD_STACK_MAX = 20;

/** The build fields the lock holds: [field, default]. The support lock state (sealed and summon gems) is read through lockState below. */
export const WOODSMAN_LOCKED_FIELDS = /* @__PURE__ */ Object.freeze([
    ['passives', []], ['passiveAttributeChoices', {}], ['ascendNodes', []], ['ascendKeystones', []], ['equipment', {}], ['inventory', []],
    ['skills', []], ['supports', []], ['equippedSupports', []], ['supportGemData', {}], ['playerLeechInstances', []],
    ['playerRecoupInstances', []], ['gemData', {}], ['jewelInventory', []]
]);

export const WOODSMAN_LOCKED_POINTS = /* @__PURE__ */ Object.freeze(['passivePoints', 'seasonPoints', 'ascendPoints', 'ascendKeystonePoints', 'scour']);

// Combat milliseconds before a manual colony run collects the overlord's waiting floor loot.
export const COLONY_MANUAL_LOOT_WAIT_MS = 20000;
