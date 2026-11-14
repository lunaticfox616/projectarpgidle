// GENERATED from modules/state*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/data/world-progression-definitions.mjs
  var TUTORIAL_SEEN_ALIASES = Object.freeze({
    unlock_items: "tutorial_first_gear",
    unlock_char: "tutorial_first_passive",
    unlock_chaos_realm: "unlock_content_chaosRealm",
    unlock_sky_tower: "unlock_content_sky",
    unlock_underworld: "unlock_content_underworld",
    unlock_cosmos: "unlock_content_cosmos",
    unlock_ocean_fishing: "unlock_content_ocean",
    unlock_time_rift: "unlock_content_timerift",
    meteor_unlocked: "unlock_content_meteorSite",
    unlock_beyond_boundary: "unlock_content_beyond"
  });
  var OUTSIDE_CHAOS_ZONE_ID = "outside_chaos_woodsman";
  var CHAOS_REALM_ZONE_ID = "chaos_realm";
  var SKY_TOWER_ZONE_ID = "sky_tower";
  var WOODSMAN_ECHO_ZONE_ID = "woodsman_echo_challenge";
  var UNDERWORLD_ZONE_ID = "underworld_core";
  var abyssTiers = [8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 16, 16, 17, 18, 19, 20];
  var CHAOS_REALM_DEFAULT_BONUSES = { pctDmg: 0, move: 0, pctHp: 0, resChaos: 0, resPen: 0, crit: 0, armorPct: 0, evasionPct: 0, energyShieldPct: 0, critDmg: 0, aspd: 0 };
  var ABYSS_ENDLESS_STEEP_FLOOR_HP_MUL = 1.198;
  var ABYSS_ENDLESS_STEEP_PLAYER_TAKEN_PER_FLOOR = 0.0385;
  var CHAOS_REALM_AFFIX_POOL = [
    { id: "elemental_wall", name: "원소 장벽", desc: "화염/냉기/번개 저항 대폭 증가" },
    { id: "iron_bark", name: "철갑 껍질", desc: "방어도와 물리 피해 감소 증가" },
    { id: "mirage_step", name: "환영 보법", desc: "회피 대폭 증가" },
    { id: "soul_shell", name: "혼백 보호막", desc: "생명력 100%만큼 에너지 보호막 보유" },
    { id: "projectile_dampening", name: "투사체 굴절", desc: "투사체 피해 반감" },
    { id: "spell_dampening", name: "주문 왜곡", desc: "주문 피해 반감" },
    { id: "blood_drinker", name: "흡혈", desc: "적 공격 시 생명력 흡수" },
    { id: "bloodless", name: "무혈", desc: "플레이어 흡혈 효율 대폭 감소" },
    { id: "curse_blade", name: "저주의 검", desc: "공격력과 관통 증가" },
    { id: "curse_immune", name: "저주 면역", desc: "저주 적용 불가" },
    { id: "phys_dampening", name: "물리 반감", desc: "물리 최종 피해 반감" },
    { id: "deadly_crit", name: "치명적 본능", desc: "치명타 확률/피해 증가" },
    { id: "multi_strike", name: "연속타격", desc: "추가 타격 확률" },
    { id: "deep_penetration", name: "심층 관통", desc: "저항 관통 증가" }
  ];
  var OCEAN_PERMANENT_UPGRADE_DEFS = {
    oxygenMax: { label: "산소 최대치", maxLevel: 20, valuePerLevel: 10, unit: "" },
    oxygenSaving: { label: "산소 소모 감소", maxLevel: 20, valuePerLevel: 3, unit: "%" },
    pressureResist: { label: "수압 패널티 감소", maxLevel: 20, valuePerLevel: 4, unit: "%" }
  };
  var OCEAN_PERMANENT_UPGRADE_KEYS = Object.keys(OCEAN_PERMANENT_UPGRADE_DEFS);
  var OCEAN_CURRENT_POOL = [
    { id: "cold_current", name: "냉수층", desc: "냉기 적 출현, 냉기 저항 -12" },
    { id: "warm_current", name: "온수층", desc: "화염 적 출현, 화염 저항 -12" },
    { id: "riptide", name: "역류", desc: "이동 속도 15% 감폭" },
    { id: "bioluminescence", name: "발광 생물군", desc: "정확도 18% 감폭" },
    { id: "still_water", name: "정체수", desc: "산소 시간 소모 35% 증가" },
    { id: "school_of_fish", name: "물고기 떼", desc: "낚시 게이지 획득 50% 증가" }
  ];
  var ENDLESS_CONTENT_DROP_MULTIPLIER_CAP = 2.25;
  var UNDERWORLD_DROP_RATE_MULTIPLIER = 0.5;
  var COMBAT_TACTIC_TARGET_PRIORITIES = Object.freeze(["nearest", "weakest", "dangerous", "dense"]);
  var COMBAT_TACTIC_POSITION_MODES = Object.freeze(["auto", "pressure", "keepRange"]);
  function createProgressionDefinitions({ STORY_ACTS: STORY_ACTS2, OCEAN_FISH_DB: OCEAN_FISH_DB2, OCEAN_FISH_COLLECTION_MILESTONES: OCEAN_FISH_COLLECTION_MILESTONES2, HERO_SELECTION_DEFS: HERO_SELECTION_DEFS2, PLAYER_CLASS_DEFS: PLAYER_CLASS_DEFS2 }) {
    const ACT_ZONE_COUNT = STORY_ACTS2.length;
    const LAST_STORY_ZONE_ID = ACT_ZONE_COUNT - 1;
    const ABYSS_START_ZONE_ID = ACT_ZONE_COUNT;
    const OCEAN_STATE_FISH_KEYS = Object.freeze(Object.keys(OCEAN_FISH_DB2));
    const OCEAN_COLLECTION_REQUIRED_COUNTS = Object.freeze(OCEAN_FISH_COLLECTION_MILESTONES2.map((row) => row.required));
    const HERO_SELECTION_ORDER = Object.keys(HERO_SELECTION_DEFS2);
    const PLAYER_CLASS_ORDER = Object.keys(PLAYER_CLASS_DEFS2);
    return { TUTORIAL_SEEN_ALIASES, ACT_ZONE_COUNT, LAST_STORY_ZONE_ID, ABYSS_START_ZONE_ID, OUTSIDE_CHAOS_ZONE_ID, CHAOS_REALM_ZONE_ID, SKY_TOWER_ZONE_ID, WOODSMAN_ECHO_ZONE_ID, UNDERWORLD_ZONE_ID, abyssTiers, CHAOS_REALM_DEFAULT_BONUSES, ABYSS_ENDLESS_STEEP_FLOOR_HP_MUL, ABYSS_ENDLESS_STEEP_PLAYER_TAKEN_PER_FLOOR, CHAOS_REALM_AFFIX_POOL, OCEAN_PERMANENT_UPGRADE_DEFS, OCEAN_PERMANENT_UPGRADE_KEYS, OCEAN_STATE_FISH_KEYS, OCEAN_COLLECTION_REQUIRED_COUNTS, OCEAN_CURRENT_POOL, ENDLESS_CONTENT_DROP_MULTIPLIER_CAP, UNDERWORLD_DROP_RATE_MULTIPLIER, HERO_SELECTION_ORDER, PLAYER_CLASS_ORDER, COMBAT_TACTIC_TARGET_PRIORITIES, COMBAT_TACTIC_POSITION_MODES };
  }

  // modules/data/season-passive-definitions.mjs
  var SEASON_NODES = {
    s_root: { name: "시작의 축복", desc: "경험치 +20%", stat: "expGain", val: 20, req: null },
    s_dmg: { name: "전사의 혼", desc: "피해 +30%", stat: "pctDmg", val: 30, req: "s_root" },
    s_hp: { name: "거인의 혼", desc: "생명력 +30%", stat: "pctHp", val: 30, req: "s_root" },
    s_crit: { name: "정밀 타격", desc: "치명타 +10%", stat: "crit", val: 10, req: "s_dmg" },
    s_dot: { name: "부패 확장", desc: "지속 피해 배율 +12%", stat: "dotPctDmg", val: 12, req: "s_dmg" },
    s_leech: { name: "질주의 피", desc: "이동 속도 +8%", stat: "move", val: 8, req: "s_hp" },
    s_guard: { name: "철벽 맥", desc: "물리 피해 감소 +8%", stat: "dr", val: 8, req: "s_hp" },
    s_speed: { name: "가속 박동", desc: "공격 속도 +8%", stat: "aspd", val: 8, req: "s_dmg" },
    s_rend: { name: "갑주 균열", desc: "물리 피해 감소 무시 +5%", stat: "physIgnore", val: 5, req: "s_crit" },
    s_breach: { name: "저항 균열", desc: "저항 관통 +5%", stat: "resPen", val: 5, req: "s_crit" },
    s_momentum: { name: "전투 탄성", desc: "연속 타격 +10%", stat: "ds", val: 10, req: ["s_speed", "s_leech"] },
    s_focus: { name: "살의 응축", desc: "치명타 피해 +35%", stat: "critDmg", val: 35, req: ["s_speed", "s_leech"] },
    s_vital: { name: "생명의 잔향", desc: "최대 생명력 +80", stat: "flatHp", val: 80, req: "s_guard" },
    s_blood: { name: "혈류 순환", desc: "초당 재생 +1.2%", stat: "regen", val: 1.2, req: "s_guard" },
    s_skirmish: { name: "기동 사수", desc: "투사체 피해 +22%", stat: "projectilePctDmg", val: 22, req: "s_leech" },
    s_fury: { name: "난전 갈증", desc: "근접 피해 +22%", stat: "meleePctDmg", val: 22, req: "s_leech" },
    s_bruise: { name: "골절 충격", desc: "물리 피해 +24%", stat: "physPctDmg", val: 24, req: "s_rend" },
    s_prism: { name: "분광 붕괴", desc: "원소 피해 +24%", stat: "elementalPctDmg", val: 24, req: "s_breach" },
    s_ruin: { name: "공허 침식", desc: "카오스 피해 +24%", stat: "chaosPctDmg", val: 24, req: "s_breach" },
    s_king: { name: "군주의 압제", desc: "물리 피해 감소 무시 +10%", stat: "physIgnore", val: 10, req: ["s_fury", "s_bruise"] },
    s_cataclysm: { name: "대균열의 끝", desc: "저항 관통 +10%", stat: "resPen", val: 10, req: ["s_prism", "s_ruin"] },
    s_floor: { name: "확정 타격", desc: "최소 피해 보정 +8%", stat: "minDmgRoll", val: 8, req: "s_focus" },
    s_ceil: { name: "극한 상한", desc: "최대 피해 보정 +8%", stat: "maxDmgRoll", val: 8, req: "s_cataclysm" }
  };
  var SEASON_NODE_ROWS = [
    ["s_root"],
    ["s_dmg", "s_hp"],
    ["s_crit", "s_dot", "s_speed"],
    ["s_guard", "s_leech"],
    ["s_rend", "s_breach", "s_momentum", "s_focus"],
    ["s_vital", "s_blood", "s_skirmish", "s_fury"],
    ["s_bruise", "s_prism", "s_ruin"],
    ["s_king", "s_cataclysm"],
    ["s_floor", "s_ceil"]
  ];
  var SEASON_OUROBOROS_RING_NODES = [
    "s_root",
    "s_hp",
    "s_guard",
    "s_vital",
    "s_blood",
    "s_leech",
    "s_skirmish",
    "s_fury",
    "s_momentum",
    "s_focus",
    "s_floor",
    "s_ceil",
    "s_cataclysm",
    "s_ruin",
    "s_prism",
    "s_breach",
    "s_king",
    "s_bruise",
    "s_rend",
    "s_crit",
    "s_dot",
    "s_speed",
    "s_dmg"
  ];
  var SEASON_INNER_NODES = {
    si_worldheart: { name: "세계심장", desc: "완성된 순환이 생명력을 증폭합니다.", stat: "pctHp", val: 36, req: null, inner: true },
    si_cataclysm: { name: "내면의 대격변", desc: "마법진의 힘이 모든 피해를 증폭합니다.", stat: "pctDmg", val: 45, req: null, inner: true },
    si_aegis: { name: "영원의 방벽", desc: "순환의 비늘이 받는 충격을 줄입니다.", stat: "dr", val: 10, req: null, inner: true },
    si_convergence: { name: "운명의 수렴", desc: "되풀이된 전투가 치명타를 완성합니다.", stat: "critDmg", val: 50, req: null, inner: true },
    si_quicksilver: { name: "끝없는 박동", desc: "우로보로스의 맥동이 공격을 가속합니다.", stat: "aspd", val: 14, req: null, inner: true },
    si_origin: { name: "기원의 기억", desc: "모든 순환의 기억에서 경험을 얻습니다.", stat: "expGain", val: 30, req: null, inner: true }
  };
  var JEWEL_RARITY_ORDER = ["normal", "magic", "rare", "unique"];
  var P_STATS = {
    // 범용 스탯: 힘(생명력/물리), 민첩(회피/정확도), 지능(ES/원소), 정확도(적 회피 수치 상쇄).
    strength: { name: "힘", tiers: [1, 2, 3], s: 6, m: 14, k: 26 },
    dexterity: { name: "민첩", tiers: [1, 2, 3], s: 6, m: 14, k: 26 },
    intelligence: { name: "지능", tiers: [1, 2, 3], s: 6, m: 14, k: 26 },
    accuracy: { name: "정확도", tiers: [1, 2, 3], s: 40, m: 90, k: 180 },
    flatHp: { name: "최대 생명력", tiers: [1, 2], s: 15, m: 45 },
    pctHp: { name: "생명력(%)", tiers: [2, 3], m: 2, k: 5, isPct: true },
    regen: { name: "초당 재생(%)", tiers: [1, 2], s: 0.1, m: 0.3, isPct: true },
    regenSuppress: { name: "재생 억제(%)", tiers: [3], k: 0.5, isPct: true },
    flatDmg: { name: "기본 피해", tiers: [1, 2], s: 2, m: 8 },
    pctDmg: { name: "피해(%)", tiers: [2, 3], m: 5, k: 15, isPct: true },
    meleePctDmg: { name: "근접 피해(%)", tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    slamPctDmg: { name: "강타 피해(%)", tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    projectilePctDmg: { name: "투사체 피해(%)", tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    physPctDmg: { name: "물리 피해(%)", tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    elementalPctDmg: { name: "원소 피해(%)", tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    firePctDmg: { name: "화염 피해(%)", tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    coldPctDmg: { name: "냉기 피해(%)", tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    lightPctDmg: { name: "번개 피해(%)", tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    chaosPctDmg: { name: "카오스 피해(%)", tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    aoePctDmg: { name: "범위 피해(%)", tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    dotPctDmg: { name: "지속 피해 배율(%)", tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    spellPctDmg: { name: "주문 피해(%)", tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    shieldPctDmg: { name: "완갑 착용 근접 피해(%)", tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    minePctDmg: { name: "지뢰 피해(%)", tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    potionPctDmg: { name: "포션 스킬 피해(%)", tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    mobilityPctDmg: { name: "기동 스킬 피해(%)", tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    channelingPctDmg: { name: "채널링 피해(%)", tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    mystique: { name: "신비", tiers: [1, 2, 3], s: 1, m: 2, k: 3 },
    devotion: { name: "헌신", tiers: [1, 2, 3], s: 1, m: 2, k: 3 },
    cycle: { name: "순환", tiers: [1, 2, 3], s: 1, m: 2, k: 3 },
    ailmentDamagePct: { name: "상태이상 피해(%)", tiers: [1, 2, 3], s: 2, m: 5, k: 10, isPct: true },
    ailmentPotencyPct: { name: "상태이상 위력(%)", tiers: [1, 2, 3], s: 2, m: 5, k: 10, isPct: true },
    igniteChance: { name: "점화 확률(%)", tiers: [1, 2, 3], s: 3, m: 7, k: 14, isPct: true },
    chillChance: { name: "냉각 확률(%)", tiers: [1, 2, 3], s: 3, m: 7, k: 14, isPct: true },
    freezeChance: { name: "동결 확률(%)", tiers: [2, 3], m: 5, k: 10, isPct: true },
    shockChance: { name: "감전 확률(%)", tiers: [1, 2, 3], s: 3, m: 7, k: 14, isPct: true },
    poisonChance: { name: "중독 확률(%)", tiers: [1, 2, 3], s: 3, m: 7, k: 14, isPct: true },
    bleedChance: { name: "출혈 확률(%)", tiers: [1, 2, 3], s: 3, m: 7, k: 14, isPct: true },
    spellFlatDmg: { name: "주문 내장 피해", tiers: [1, 2, 3], s: 5, m: 12, k: 22 },
    spellFlatPct: { name: "주문 내장 피해 증가(%)", tiers: [2, 3], m: 6, k: 14, isPct: true },
    projectileExtraShots: { name: "투사체 추가 발사", tiers: [2, 3], m: 1, k: 3 },
    targetProjectile: { name: "투사체 스킬 타겟 수", tiers: [3], k: 1 },
    aspd: { name: "공격 속도(%)", tiers: [1, 2, 3], s: 1.5, m: 4, k: 8, isPct: true },
    move: { name: "이동 속도(%)", tiers: [1, 2], s: 1.5, m: 4, isPct: true },
    // 재사용 대기시간(2026-10-21, js/skills.js getSkillCooldownMs): 스킬트리 편집기(scripts/passive-tree-editor-server.js)도 이 표로 효과를 받는다.
    cooldownRecovery: { name: "재사용 대기시간 회복 속도(%)", tiers: [1, 2], s: 3, m: 6, isPct: true },
    cooldownReduction: { name: "재사용 대기시간 감소(%)", tiers: [1, 2], s: 1, m: 3, isPct: true },
    mobilityCooldownRecovery: { name: "이동 스킬 재사용 대기시간 회복 속도(%)", tiers: [1, 2], s: 4, m: 6, isPct: true },
    mobilityCooldownReduction: { name: "이동 스킬 재사용 대기시간 감소(%)", tiers: [1, 2], s: 2, m: 4, isPct: true },
    crit: { name: "치명타 확률(%)", tiers: [2, 3], m: 1.5, k: 4, isPct: true },
    critDmg: { name: "치명타 피해 배율(%)", tiers: [3], s: 12.5, m: 12.5, k: 25, isPct: true },
    leech: { name: "생명력 흡수(%)", tiers: [2, 3], m: 0.3, k: 1, isPct: true },
    leechRateCap: { name: "흡혈 회복 속도 캡(%)", tiers: [2, 3], m: 0.4, k: 1, isPct: true },
    leechTotalCap: { name: "흡혈 총 회복량 캡(%)", tiers: [2, 3], m: 2, k: 5, isPct: true },
    leechInstanceCap: { name: "흡혈 관통당 회복량 캡(%)", tiers: [2, 3], m: 1, k: 3, isPct: true },
    gemLevel: { name: "스킬룬 레벨", tiers: [3], k: 1 },
    elementalGemLevel: { name: "원소 스킬룬 레벨", tiers: [3], k: 1 },
    fireGemLevel: { name: "화염 스킬룬 레벨", tiers: [3], k: 1 },
    coldGemLevel: { name: "냉기 스킬룬 레벨", tiers: [3], k: 1 },
    lightGemLevel: { name: "번개 스킬룬 레벨", tiers: [3], k: 1 },
    chaosGemLevel: { name: "카오스 스킬룬 레벨", tiers: [3], k: 1 },
    physGemLevel: { name: "물리 스킬룬 레벨", tiers: [3], k: 1 },
    projectileGemLevel: { name: "투사체 스킬룬 레벨", tiers: [3], k: 1 },
    meleeGemLevel: { name: "근접 스킬룬 레벨", tiers: [3], k: 1 },
    slamGemLevel: { name: "강타 스킬룬 레벨", tiers: [3], k: 1 },
    spellGemLevel: { name: "주문 스킬룬 레벨", tiers: [3], k: 1 },
    blockChance: { name: "막기 확률(+%p)", tiers: [2, 3], m: 1, k: 4, isPct: true },
    blockChancePct: { name: "막기 확률(%) 증가", tiers: [2, 3], m: 12, k: 36, isPct: true },
    baseBlockChance: { name: "베이스 막기 확률(+%p)", tiers: [3], k: 1, isPct: true },
    maxResChaos: { name: "최대 카오스 저항(%)", tiers: [3], k: 1, isPct: true },
    maxResAll: { name: "모든 원소 최대 저항(%)", tiers: [3], k: 1, isPct: true },
    dotGemLevel: { name: "지속 피해 스킬룬 레벨", tiers: [3], k: 1 },
    aoeGemLevel: { name: "범위 스킬룬 레벨", tiers: [3], k: 1 },
    dr: { name: "물리 피해 감소(%)", tiers: [3], k: 4, isPct: true },
    armor: { name: "방어도", tiers: [1, 2, 3], s: 12, m: 28, k: 56 },
    evasion: { name: "회피", tiers: [1, 2, 3], s: 12, m: 28, k: 56 },
    energyShield: { name: "에너지 보호막", tiers: [1, 2, 3], s: 10, m: 24, k: 48 },
    armorPct: { name: "방어도(%)", tiers: [2, 3], m: 5, k: 12, isPct: true },
    evasionPct: { name: "회피(%)", tiers: [2, 3], m: 5, k: 12, isPct: true },
    deflectChance: { name: "비껴내기 확률(%)", tiers: [1, 2, 3], s: 4, m: 6, k: 8, isPct: true },
    deflectMajor: { name: "비껴내기 확률 + 피해 감소", tiers: [3], k: 6, isPct: true },
    deflectDamageReduce: { name: "비껴내기 피해 감소(%)", tiers: [3], k: 3, isPct: true },
    ailResIgnite: { name: "점화 저항 확률(%)", tiers: [1, 2, 3], s: 2, m: 4, k: 6, isPct: true },
    ailResShock: { name: "감전 저항 확률(%)", tiers: [1, 2, 3], s: 2, m: 4, k: 6, isPct: true },
    ailResFreeze: { name: "냉기 저항 확률(%)", tiers: [1, 2, 3], s: 2, m: 4, k: 6, isPct: true },
    ailResPoison: { name: "중독 저항 확률(%)", tiers: [1, 2, 3], s: 2, m: 4, k: 6, isPct: true },
    ailResBleed: { name: "출혈 저항 확률(%)", tiers: [1, 2, 3], s: 2, m: 4, k: 6, isPct: true },
    energyShieldPct: { name: "에너지 보호막(%)", tiers: [2, 3], m: 5, k: 12, isPct: true },
    energyShieldRegen: { name: "에너지 보호막 회복속도(%)", tiers: [3], k: 8, isPct: true },
    moveEvasion: { name: "이동 속도 + 회피(%)", tiers: [1, 2, 3], s: 2, m: 5, k: 10, isPct: true },
    hpArmor: { name: "생명력 + 방어도", tiers: [1, 2, 3], s: 18, m: 48, k: 96 },
    aspdMove: { name: "공격 속도 + 이동 속도(%)", tiers: [1, 2, 3], s: 2, m: 5, k: 9, isPct: true },
    chaosResElemPenalty: { name: "카오스 저항 + 모든 원소 저항 감소(%)", tiers: [2, 3], m: 6, k: 12, isPct: true },
    maxResF: { name: "최대 화염 저항(%)", tiers: [3], k: 1, isPct: true },
    maxResC: { name: "최대 냉기 저항(%)", tiers: [3], k: 1, isPct: true },
    maxResL: { name: "최대 번개 저항(%)", tiers: [3], k: 1, isPct: true },
    physIgnore: { name: "물리 피해 감소 무시(%)", tiers: [2, 3], m: 3, k: 6, isPct: true },
    slamEchoChance: { name: "강타 여진 발생 확률(%)", tiers: [3], k: 8, isPct: true },
    ds: { name: "연속 타격(%)", tiers: [3], k: 8, isPct: true },
    suppCap: { name: "보조스킬룬 한도", tiers: [3], k: 1 },
    resPen: { name: "저항 관통(%)", tiers: [2, 3], m: 2, k: 5, isPct: true },
    resF: { name: "화염 저항(%)", tiers: [2], m: 5, isPct: true },
    resC: { name: "냉기 저항(%)", tiers: [2], m: 5, isPct: true },
    resL: { name: "번개 저항(%)", tiers: [2], m: 5, isPct: true },
    resAll: { name: "모든 원소 저항(%)", tiers: [3], k: 4, isPct: true },
    resChaos: { name: "카오스 저항(%)", tiers: [3], k: 4, isPct: true },
    expGain: { name: "경험치 획득(%)", tiers: [2, 3], m: 5, k: 12, isPct: true },
    minDmgRoll: { name: "최소 피해 보정(%)", tiers: [1, 2, 3], s: 1, m: 2, k: 4, isPct: true },
    maxDmgRoll: { name: "최대 피해 보정(%)", tiers: [1, 2, 3], s: 1, m: 2, k: 4, isPct: true },
    summonFlatDmg: { name: "소환수 기본 피해", tiers: [1, 2, 3], s: 3, m: 7, k: 14 },
    summonPctDmg: { name: "소환수 피해(%)", tiers: [1, 2, 3], s: 5, m: 10, k: 18, isPct: true },
    summonAspd: { name: "소환수 공격 속도(%)", tiers: [1, 2, 3], s: 4, m: 8, k: 14, isPct: true },
    summonHpPct: { name: "소환수 생명력(%)", tiers: [1, 2, 3], s: 4, m: 9, k: 16, isPct: true },
    summonCrit: { name: "소환수 치명타 확률(%)", tiers: [2, 3], m: 2, k: 5, isPct: true },
    summonCritDmg: { name: "소환수 치명타 피해 배율(%)", tiers: [2, 3], m: 6, k: 15, isPct: true },
    summonCap: { name: "소환수 최대 한도", tiers: [3], k: 1 },
    summonEfficiency: { name: "소환수 효율(%)", tiers: [2, 3], m: 4, k: 10, isPct: true },
    summonGuardRedirectPct: { name: "방어형 소환수 피해 대리(%)", tiers: [3], k: 4, isPct: true },
    summonResPen: { name: "소환수 저항 관통(%)", tiers: [2, 3], m: 2, k: 5, isPct: true },
    summonGemLevel: { name: "소환수 공격 스킬룬 레벨", tiers: [3], k: 1 },
    igniteDamageMultiplierPct: { name: "점화 피해 증가(%)", tiers: [2, 3], m: 4, k: 10, isPct: true },
    poisonDamageMultiplierPct: { name: "중독 피해 증가(%)", tiers: [2, 3], m: 4, k: 10, isPct: true },
    accuracyBonusPct: { name: "정확도 보정(%)", isPct: true },
    doubleDamageChance: { name: "두 배 피해 확률(%)", isPct: true },
    blockChanceMax: { name: "막기 확률 최대치(+%p)", isPct: true },
    takenDamageReduceWhen1EnemyPct: { name: "주변 적이 1명일 때 받는 피해 감소(%)", isPct: true },
    takenDamageReduceWhen2EnemiesPct: { name: "주변 적이 2명 이상일 때 받는 피해 감소(%)", isPct: true },
    physTakenAsFire: { name: "받는 물리 피해의 화염 전환(%)", isPct: true },
    physTakenAsCold: { name: "받는 물리 피해의 냉기 전환(%)", isPct: true },
    physTakenAsLight: { name: "받는 물리 피해의 번개 전환(%)", isPct: true },
    physTakenAsChaos: { name: "받는 물리 피해의 카오스 전환(%)", isPct: true },
    addedFireDamagePct: { name: "추가 화염 피해(%)", isPct: true },
    addedColdDamagePct: { name: "추가 냉기 피해(%)", isPct: true },
    addedLightDamagePct: { name: "추가 번개 피해(%)", isPct: true },
    addedChaosDamagePct: { name: "추가 카오스 피해(%)", isPct: true },
    addedPhysDamagePct: { name: "추가 물리 피해(%)", isPct: true },
    shockedEnemyHitDamageMorePct: { name: "감전된 적 명중 피해 증폭(%)", isPct: true },
    energyShieldRechargeFaster: { name: "에너지 보호막 재충전 대기시간 감소(초)" }
  };
  var PASSIVE_TIER_SIZE_ORDER = Object.freeze({ 1: ["s", "m", "k"], 2: ["m", "s", "k"], 3: ["k", "m", "s"] });
  var PASSIVE_TIER_FALLBACK = Object.freeze({ 1: 2, 2: 4, 3: 8 });
  function createPassivesDefinitions() {
    return { SEASON_NODES, SEASON_NODE_ROWS, SEASON_OUROBOROS_RING_NODES, SEASON_INNER_NODES, JEWEL_RARITY_ORDER, P_STATS, PASSIVE_TIER_SIZE_ORDER, PASSIVE_TIER_FALLBACK };
  }

  // modules/data/support-gem-definitions.mjs
  var SUPPORT_GEM_DB = {
    "가속": { kind: "common", requireTags: [], baseVal: 1, scale: 0.5, stat: "aspd", name: "공격 속도", isPct: true, resonanceCosts: [6, 12, 21], desc: "공격 속도를 올립니다." },
    "날카로움": { kind: "common", requireTags: [], baseVal: 0.2, scale: 0.3, stat: "crit", name: "치명타 확률", isPct: true, resonanceCosts: [6, 12, 21], desc: "치명타 확률을 올립니다." },
    "근접 물리 피해": { kind: "tag", requireTags: ["melee"], baseVal: 5, scale: 2, stat: "meleePctDmg", name: "근접 피해", isPct: true, resonanceCosts: [6, 12, 21], desc: "근접 태그가 달린 스킬의 피해를 높입니다." },
    "투사체 강화": { kind: "tag", requireTags: ["projectile"], baseVal: 5, scale: 2, stat: "projectilePctDmg", name: "투사체 피해", isPct: true, resonanceCosts: [6, 12, 21], desc: "투사체 태그 스킬을 강화합니다." },
    "원소 집중": { kind: "tag", requireTags: ["elemental"], baseVal: 5, scale: 2, stat: "elementalPctDmg", name: "원소 피해", isPct: true, resonanceCosts: [6, 12, 21], desc: "원소 태그 스킬을 강화합니다." },
    "범위 피해": { kind: "tag", requireTags: ["aoe"], baseVal: 5, scale: 2, stat: "aoePctDmg", name: "범위 피해", isPct: true, resonanceCosts: [3, 9, 18], desc: "범위 태그 스킬의 피해를 높입니다." },
    "지속 확산": { kind: "tag", requireTags: ["dot"], baseVal: 6, scale: 2.2, stat: "dotPctDmg", name: "지속 피해 배율", isPct: true, resonanceCosts: [6, 12, 21], desc: "지속 피해 태그 스킬의 지속 피해 배율을 올립니다." },
    "무자비": { kind: "common", requireTags: [], baseVal: 10, scale: 3, stat: "critDmg", name: "치명타 피해", isPct: true, resonanceCosts: [9, 21, 33], desc: "치명타 배율을 높입니다." },
    "생명력 흡수": { nonDps: true, kind: "common", requireTags: [], baseVal: 0.5, scale: 0.1, stat: "leech", name: "생명력 흡수", isPct: true, resonanceCosts: [3, 9, 18], desc: "공격 시 흡혈을 부여합니다." },
    "연속타격": { kind: "common", requireTags: [], baseVal: 5, scale: 1, stat: "ds", name: "연속 타격 확률", isPct: true, resonanceCosts: [9, 21, 33], desc: "한 번 더 타격할 확률을 부여합니다." },
    "갑주 파쇄": { kind: "common", requireTags: [], nonDps: true, baseVal: 3, scale: 0.8, stat: "physIgnore", name: "물피감 무시", isPct: true, resonanceCosts: [9, 21, 33], desc: "물리 공격이 적의 물리 피해 감소를 더 깊게 파고듭니다." },
    "저항 침식": { kind: "common", requireTags: [], nonDps: true, baseVal: 3, scale: 0.8, stat: "resPen", name: "저항 관통", isPct: true, resonanceCosts: [9, 21, 33], desc: "원소/카오스 공격이 적의 저항을 꿰뚫습니다." },
    "재생 억제": { kind: "common", requireTags: [], nonDps: true, baseVal: 0.1, scale: 0.03, stat: "regenSuppress", name: "재생 억제", isPct: true, resonanceCosts: [3, 9, 18], desc: "공격 시 적의 생명력 재생을 해당 수치(%)만큼 감소시킵니다." },
    "정밀 하한": { kind: "common", requireTags: [], baseVal: 2, scale: 0.8, stat: "minDmgRoll", name: "최소 피해 보정", isPct: true, resonanceCosts: [3, 9, 18], desc: "무기 피해 하한을 올려 딜 편차를 줄입니다." },
    "과충전 상한": { kind: "common", requireTags: [], baseVal: 2, scale: 0.8, stat: "maxDmgRoll", name: "최대 피해 보정", isPct: true, resonanceCosts: [3, 9, 18], desc: "무기 피해 상한을 올려 고점 피해를 확장합니다." },
    "소환수 피해 증폭": { kind: "summonOnly", requireTags: ["summon"], baseVal: 6, scale: 2.4, stat: "summonPctDmg", name: "소환수 피해", isPct: true, resonanceCosts: [6, 12, 21], desc: "소환수의 공격 피해를 높입니다." },
    "소환수 가속": { kind: "summonOnly", requireTags: ["summon"], baseVal: 4, scale: 1.6, stat: "summonAspd", name: "소환수 공격 속도", isPct: true, resonanceCosts: [6, 12, 21], desc: "소환수의 공격 속도를 높입니다." },
    "소환수 예리함": { kind: "summonOnly", requireTags: ["summon"], baseVal: 1, scale: 0.45, stat: "summonCrit", name: "소환수 치명타 확률", isPct: true, resonanceCosts: [6, 12, 21], desc: "소환수의 치명타 확률을 올립니다." },
    "소환수 무자비": { kind: "summonOnly", requireTags: ["summon"], baseVal: 12, scale: 4, stat: "summonCritDmg", name: "소환수 치명타 피해 배율", isPct: true, resonanceCosts: [9, 21, 33], desc: "소환수의 치명타 피해 배율을 올립니다." },
    "소환수 생명력": { nonDps: true, kind: "summonOnly", requireTags: ["summon"], baseVal: 8, scale: 2.8, stat: "summonHpPct", name: "소환수 생명력", isPct: true, resonanceCosts: [3, 9, 18], desc: "소환수의 최대 생명력을 높입니다." },
    "잔향": { kind: "common", requireTags: [], nonDps: true, baseVal: 8, scale: 3, stat: "echoPower", name: "잔향", isPct: false, resonanceCosts: [9, 21, 33], desc: "적중 시 일정 확률로 잔향을 남겨 추가 피해를 입힙니다. 같은 적에게 여러 번 중첩될 수 있지만, 적 1기에 걸린 잔향의 남은 타격 수 합계는 최대 12회로 제한됩니다." },
    "화염 주입": { kind: "tag", requireTags: ["fire"], baseVal: 5, scale: 2, stat: "firePctDmg", name: "화염 피해", isPct: true, resonanceCosts: [3, 9, 18], desc: "화염 스킬의 피해를 높입니다." },
    "냉기 증폭": { kind: "tag", requireTags: ["cold"], baseVal: 5, scale: 2, stat: "coldPctDmg", name: "냉기 피해", isPct: true, resonanceCosts: [3, 9, 18], desc: "냉기 스킬의 피해를 높입니다." },
    "번개 전도": { kind: "tag", requireTags: ["lightning"], baseVal: 5, scale: 2, stat: "lightPctDmg", name: "번개 피해", isPct: true, resonanceCosts: [3, 9, 18], desc: "번개 스킬의 피해를 높입니다." },
    "혼돈 전환": { kind: "tag", requireTags: ["chaos"], baseVal: 5, scale: 2, stat: "chaosPctDmg", name: "카오스 피해", isPct: true, resonanceCosts: [3, 9, 18], desc: "카오스 스킬의 피해를 높입니다." },
    "화염 공명": { kind: "tag", requireTags: ["fire"], baseVal: 8, scale: 1.5, stat: "firePctDmg", name: "화염 피해", isPct: true, resonanceCosts: [4, 11, 21], scaleWithOwnStat: "firePctDmg", desc: "자신의 화염 피해 증가 수치에 비례해 화염 피해를 추가로 증폭합니다." },
    "냉기 공명": { kind: "tag", requireTags: ["cold"], baseVal: 8, scale: 1.5, stat: "coldPctDmg", name: "냉기 피해", isPct: true, resonanceCosts: [4, 11, 21], scaleWithOwnStat: "coldPctDmg", desc: "자신의 냉기 피해 증가 수치에 비례해 냉기 피해를 추가로 증폭합니다." },
    "번개 공명": { kind: "tag", requireTags: ["lightning"], baseVal: 8, scale: 1.5, stat: "lightPctDmg", name: "번개 피해", isPct: true, resonanceCosts: [4, 11, 21], scaleWithOwnStat: "lightPctDmg", desc: "자신의 번개 피해 증가 수치에 비례해 번개 피해를 추가로 증폭합니다." },
    "혼돈 공명": { kind: "tag", requireTags: ["chaos"], baseVal: 8, scale: 1.5, stat: "chaosPctDmg", name: "카오스 피해", isPct: true, resonanceCosts: [4, 11, 21], scaleWithOwnStat: "chaosPctDmg", desc: "자신의 카오스 피해 증가 수치에 비례해 카오스 피해를 추가로 증폭합니다." },
    "카오스 잠식": { kind: "tag", requireTags: ["chaos"], nonDps: true, baseVal: 1, scale: 0.05, stat: "chaosErosion", name: "카오스 잠식", isPct: false, resonanceCosts: [9, 21, 33], capStat: "chaosErosionCap", capBase: 20, capGrowAfterLevel: 20, capPerLevel: 1, desc: "카오스 피해로 적중할 때마다 적의 카오스 저항을 깎아 잠식시킵니다(중첩). 잠식 한도는 기본 20이며, 20레벨을 넘기면 레벨당 1.1씩 한도가 늘어납니다. 적이 죽거나 교체되면 잠식은 초기화됩니다." },
    "분쇄의 일격": { kind: "tag", requireTags: ["slam"], baseVal: 9, scale: 2.8, stat: "slamPctDmg", name: "강타 피해", isPct: true, resonanceCosts: [9, 21, 33], desc: "강타 태그 스킬의 피해를 강하게 증폭하는 상급 보조스킬룬입니다." },
    "비전 증폭": { kind: "tag", requireTags: ["spell"], baseVal: 9, scale: 2.6, stat: "spellFlatPct", name: "주문 내장 피해 증가", isPct: true, resonanceCosts: [9, 21, 33], desc: "주문 태그 스킬의 내장 피해 증가를 강하게 끌어올리는 상급 보조스킬룬입니다." },
    "지뢰 증폭": { kind: "tag", requireTags: ["mine"], baseVal: 8, scale: 2.5, stat: "minePctDmg", name: "지뢰 피해", isPct: true, resonanceCosts: [6, 12, 21], desc: "지뢰 태그 스킬의 피해를 높입니다." },
    "연금 촉매": { kind: "tag", requireTags: ["potion"], baseVal: 7, scale: 2.3, stat: "potionPctDmg", name: "포션 투척 피해", isPct: true, resonanceCosts: [6, 12, 21], desc: "포션 태그 스킬의 피해를 높입니다." },
    "기동 타격": { kind: "tag", requireTags: ["mobility"], baseVal: 6, scale: 2, stat: "mobilityPctDmg", name: "기동 스킬 피해", isPct: true, resonanceCosts: [6, 12, 21], desc: "기동 태그 스킬의 피해를 높입니다." },
    "집중 유지": { kind: "tag", requireTags: ["channeling"], baseVal: 9, scale: 2.8, stat: "channelingPctDmg", name: "채널링 피해", isPct: true, resonanceCosts: [9, 21, 33], desc: "이동을 포기하고 유지하는 채널링 스킬의 피해를 높입니다." },
    // 행동형은 레벨 배율 대신 아래 등급별 수치를 쓴다. 전투와 미리보기는 skills.supports가 함께 판정한다.
    "화염 변환": { kind: "conversion", requireTags: [], grantTags: ["fire", "elemental"], stripTags: ["physical", "cold", "lightning", "chaos"], element: "fire", tierValues: [50, 75, 100], baseVal: 50, scale: 0, stat: "supportConversion", name: "화염 변환", isPct: true, resonanceCosts: [6, 12, 21], tradeoff: "완전 변환하면 원래 속성 보조가 풀립니다.", desc: "피해의 50/75/100%를 화염으로 바꾸고 화염 태그를 얻습니다." },
    "냉기 변환": { kind: "conversion", requireTags: [], grantTags: ["cold", "elemental"], stripTags: ["physical", "fire", "lightning", "chaos"], element: "cold", tierValues: [50, 75, 100], baseVal: 50, scale: 0, stat: "supportConversion", name: "냉기 변환", isPct: true, resonanceCosts: [6, 12, 21], tradeoff: "완전 변환하면 원래 속성 보조가 풀립니다.", desc: "피해의 50/75/100%를 냉기로 바꾸고 냉기 태그를 얻습니다." },
    "번개 변환": { kind: "conversion", requireTags: [], grantTags: ["lightning", "elemental"], stripTags: ["physical", "fire", "cold", "chaos"], element: "light", tierValues: [50, 75, 100], baseVal: 50, scale: 0, stat: "supportConversion", name: "번개 변환", isPct: true, resonanceCosts: [6, 12, 21], tradeoff: "완전 변환하면 원래 속성 보조가 풀립니다.", desc: "피해의 50/75/100%를 번개로 바꾸고 번개 태그를 얻습니다." },
    "카오스 변환": { kind: "conversion", requireTags: [], grantTags: ["chaos"], stripTags: ["physical", "fire", "cold", "lightning", "elemental"], element: "chaos", tierValues: [50, 75, 100], baseVal: 50, scale: 0, stat: "supportConversion", name: "카오스 변환", isPct: true, resonanceCosts: [6, 12, 21], tradeoff: "완전 변환하면 원래 속성 보조가 풀립니다.", desc: "피해의 50/75/100%를 카오스로 바꾸고 카오스 태그를 얻습니다." },
    "이중 발동": { kind: "repeat", requireTags: ["attack"], tierValues: [50, 65, 80], baseVal: 50, scale: 0, stat: "supportRepeat", name: "두 번째 공격 피해", isPct: true, resonanceCosts: [9, 21, 33], tradeoff: "공격 속도 10% 감소", desc: "공격 스킬을 한 번 더 발동합니다. 두 번째 피해는 50/65/80%입니다." },
    "이중 시전": { kind: "repeat", requireTags: ["spell"], tierValues: [50, 65, 80], baseVal: 50, scale: 0, stat: "supportRepeat", name: "두 번째 주문 피해", isPct: true, resonanceCosts: [9, 21, 33], tradeoff: "시전 속도 10% 감소", desc: "주문을 한 번 더 시전합니다. 두 번째 피해는 50/65/80%입니다." },
    "갈래 투사체": { kind: "projectiles", requireTags: ["projectile"], tierValues: [1, 2, 3], baseVal: 1, scale: 0, stat: "supportProjectiles", name: "추가 투사체", isPct: false, resonanceCosts: [9, 21, 33], tradeoff: "투사체마다 피해 20% 감소", desc: "투사체를 1/2/3발 더 발사합니다. 가까운 다른 적을 하나씩 겨누고, 적이 모자라면 같은 적에게 이어서 발사합니다." },
    "연쇄 투사체": { kind: "chain", requireTags: ["projectile"], tierValues: [1, 2, 3], baseVal: 1, scale: 0, stat: "supportChain", name: "추가 연쇄", isPct: false, resonanceCosts: [9, 21, 33], tradeoff: "연쇄할 때마다 피해 25% 감소", desc: "맞은 적에게서 주변 적으로 1/2/3회 연쇄합니다." },
    "휩쓸기": { kind: "sweep", requireTags: ["melee"], tierValues: [1, 2, 3], baseVal: 1, scale: 0, stat: "supportSweep", name: "주변 추가 타격", isPct: false, resonanceCosts: [6, 12, 21], tradeoff: "추가 타격 피해 30% 감소", desc: "주변 적 1/2/3기를 추가 타격합니다. 추가 타격은 원래 피해의 70%입니다." },
    "꿰뚫기": { kind: "pierce", requireTags: ["projectile"], noTiers: true, tierValues: [2], baseVal: 2, scale: 0, stat: "supportPierce", name: "관통 수", isPct: false, resonanceCosts: [9], nonDps: true, tradeoff: "피해 15% 감소", desc: "투사체가 적 2명을 관통합니다." },
    "넓은 판정": { kind: "expansion", requireTags: ["aoe"], noTiers: true, tierValues: [1], baseVal: 1, scale: 0, stat: "supportExpansion", name: "효과 확장", isPct: false, resonanceCosts: [12], nonDps: true, tradeoff: "피해 15% 감소. 다른 효과 확장 +1과 중복되지 않습니다.", desc: "범위 판정을 1칸 넓힙니다." },
    "밀어내기": { kind: "push", requireTags: ["slam", "aoe"], noTiers: true, tierValues: [1], baseVal: 1, scale: 0, stat: "supportPush", name: "밀침 거리", isPct: false, resonanceCosts: [9], nonDps: true, tradeoff: "피해 10% 감소", desc: "적중한 적을 1칸 밀어냅니다." },
    "투척": { kind: "transform", transform: "throw", requireTags: ["melee"], grantTags: ["projectile"], stripTags: ["melee"], tierValues: [3, 4, 5], baseVal: 3, scale: 0, stat: "supportThrow", name: "투척 사거리", isPct: false, resonanceCosts: [6, 12, 21], nonDps: true, tradeoff: "피해 20% 감소", desc: "근접 스킬을 사거리 3/4/5칸 투사체로 바꿉니다." },
    "지뢰 설치": { kind: "transform", transform: "mine", requireTags: ["spell", "projectile"], grantTags: ["mine"], stripTags: [], tierValues: [20, 35, 50], baseVal: 20, scale: 0, stat: "supportMine", name: "지뢰 피해 증폭", isPct: true, resonanceCosts: [6, 12, 21], tradeoff: "설치 후 0.6초 뒤 발동", desc: "지뢰로 설치하고 폭발 피해를 20/35/50% 증폭합니다." },
    "강타화": { kind: "transform", transform: "slam", requireTags: ["melee"], grantTags: ["slam"], stripTags: [], tierValues: [25, 35, 45], baseVal: 25, scale: 0, stat: "supportSlam", name: "강타 피해 증폭", isPct: true, resonanceCosts: [6, 12, 21], tradeoff: "공격 속도 20% 감소", desc: "강타 태그를 얻고 피해가 25/35/45% 증폭됩니다." },
    "잔불": { kind: "transform", transform: "embers", requireTags: [], grantTags: ["dot"], stripTags: [], tierValues: [30, 45, 60], baseVal: 30, scale: 0, stat: "supportEmbers", name: "추가 지속 피해", isPct: true, resonanceCosts: [6, 12, 21], tradeoff: "즉시 피해 15% 감소", desc: "적중 피해의 30/45/60%를 3초 동안 추가 지속 피해로 줍니다." },
    "유지 시전": { kind: "transform", transform: "channel", requireTags: ["spell"], grantTags: ["channeling"], stripTags: [], tierValues: [30, 45, 60], baseVal: 30, scale: 0, stat: "supportChannel", name: "유지 피해 증폭", isPct: true, resonanceCosts: [9, 21, 33], tradeoff: "유지 중 이동 불가", desc: "채널링 주문으로 바뀌고 유지하는 동안 피해가 30/45/60% 증폭됩니다." },
    "분산": { kind: "transform", transform: "spread", requireTags: ["single"], grantTags: ["aoe"], stripTags: ["single"], tierValues: [-30, -20, -10], baseVal: -30, scale: 0, stat: "supportSpread", name: "분산 피해 보정", isPct: true, resonanceCosts: [6, 12, 21], tradeoff: "피해 30/20/10% 감소", desc: "단일 대상 스킬을 반경 1칸 범위 공격으로 바꿉니다." },
    "집속": { kind: "transform", transform: "focus", requireTags: ["aoe"], grantTags: ["single"], stripTags: ["aoe"], tierValues: [40, 55, 70], baseVal: 40, scale: 0, stat: "supportFocus", name: "집속 피해 증폭", isPct: true, resonanceCosts: [6, 12, 21], tradeoff: "범위 태그를 잃어 범위 보조가 풀립니다.", desc: "범위 스킬을 단일 대상 공격으로 바꾸고 피해가 40/55/70% 증폭됩니다." },
    "불붙이기": { kind: "ignite", requireTags: ["fire"], noTiers: true, tierValues: [40], baseVal: 40, scale: 0, stat: "supportIgnite", name: "점화 확률", isPct: true, resonanceCosts: [9], nonDps: true, tradeoff: "", desc: "점화 확률 +40%, 점화 지속 시간 +1초." },
    "터지는 시체": { kind: "corpse", requireTags: [], noTiers: true, tierValues: [25], baseVal: 25, scale: 0, stat: "supportCorpse", name: "시체 폭발 확률", isPct: true, resonanceCosts: [12], nonDps: true, tradeoff: "", desc: "처치 시 25% 확률로 적 최대 생명력의 10%를 주는 시체 폭발을 일으킵니다." },
    "처형": { kind: "execute", requireTags: [], noTiers: true, tierValues: [60], baseVal: 60, scale: 0, stat: "supportExecute", name: "처형 피해 증폭", isPct: true, resonanceCosts: [12], tradeoff: "생명력이 30%를 넘는 적에게 피해 10% 감소", desc: "생명력 30% 이하인 적에게 피해가 60% 증폭됩니다." },
    "증원": { kind: "reinforcement", requireTags: ["summon"], noTiers: true, tierValues: [1], baseVal: 1, scale: 0, stat: "supportReinforcement", name: "추가 소환수", isPct: false, resonanceCosts: [15], tradeoff: "소환수 생명력 30% 감소", desc: "각 공격형 소환 룬의 소환수가 1기 늘어납니다." }
  };
  function createSupportsDefinitions() {
    return { SUPPORT_GEM_DB };
  }

  // modules/data/equipment-affix-definitions.mjs
  var FOSSIL_EXCLUSIVE_MODS = [
    { id: "fossilVoidHeart", statId: "chaosPctDmg", type: "special", statName: "심연 맥동 (카오스 피해%)", slots: ["무기", "목걸이", "반지"], base: 6, step: 2.5, fixedVal: 55, fossilExclusive: true },
    { id: "fossilWarMarch", statId: "move", type: "special", statName: "군단 진군 (이동 속도%)", slots: ["신발", "허리띠"], base: 4, step: 1.5, fixedVal: 35, fossilExclusive: true },
    { id: "fossilSoulWard", statId: "resAll", type: "special", statName: "영혼 수호 (모든 원소 저항%)", slots: ["갑옷", "투구", "허리띠"], base: 4, step: 1.5, fixedVal: 35, fossilExclusive: true },
    { id: "fossilGemPulse", statId: "gemLevel", type: "special", statName: "룬 맥동 (스킬룬 레벨)", slots: ["목걸이"], base: 1, step: 0, fixedVal: 1, fixedValue: true, fossilExclusive: true },
    { id: "fossilSupportLink", statId: "suppCap", type: "special", statName: "결속 잔향 (보조스킬룬 한도)", slots: ["목걸이"], base: 1, step: 0, fixedVal: 1, fixedValue: true, fossilExclusive: true },
    { id: "fossilArmorRift", statId: "physIgnore", type: "special", statName: "전쟁 균열 (물피감 무시%)", slots: ["무기", "장갑", "목걸이"], base: 2, step: 0.8, fixedVal: 18.4, fossilExclusive: true },
    { id: "fossilPrismNeedle", statId: "resPen", type: "special", statName: "프리즘 송곳 (저항 관통%)", slots: ["무기", "목걸이", "반지"], base: 2, step: 0.7, fixedVal: 16.6, fossilExclusive: true },
    { id: "fossilBoundFloor", statId: "minDmgRoll", type: "special", statName: "결속 하한 (최소 피해 보정%)", slots: ["무기", "장갑"], base: 2, step: 0.6, fixedVal: 13.8, fossilExclusive: true },
    { id: "fossilSkyCeil", statId: "maxDmgRoll", type: "special", statName: "천공 상한 (최대 피해 보정%)", slots: ["무기", "장갑"], base: 2, step: 0.6, fixedVal: 13.8, fossilExclusive: true }
  ];
  var AUTHORED_MOD_DB = [
    { "id": "flatDmg", "type": "prefix", "statName": "기본 피해", "slots": ["무기"], "affixBalanceVersion": 2, "tierValues": [[7, 8], [9, 11], [12, 15], [16, 20], [21, 25], [26, 32], [33, 38], [39, 45], [46, 52], [53, 60], [61, 68], [69, 77], [78, 86], [87, 95], [96, 104], [105, 114], [115, 124], [125, 134], [135, 144], [145, 155]], "valueStep": 1 },
    { "id": "weaponFlatDmgPct", "type": "prefix", "statName": "무기의 기본 피해 증가(%)", "slots": ["무기"], "affixBalanceVersion": 2, "tierValues": [[10, 12], [13, 16], [17, 20], [21, 24], [25, 28], [29, 32], [33, 36], [37, 40], [41, 44], [45, 48], [49, 52], [53, 56], [57, 60], [61, 64], [65, 68], [69, 72], [73, 76], [77, 80], [81, 84], [85, 88]], "valueStep": 1 },
    { "id": "pctDmg", "type": "prefix", "statName": "피해 증가(%)", "slots": ["무기", "반지", "목걸이"], "affixBalanceVersion": 2, "tierValues": [[9, 11], [12, 15], [16, 19], [20, 24], [25, 28], [29, 32], [33, 36], [37, 40], [41, 45], [46, 49], [50, 53], [54, 57], [58, 62], [63, 66], [67, 70], [71, 74], [75, 78], [79, 83], [84, 87], [88, 91]], "valueStep": 1 },
    { "id": "meleePctDmg", "type": "prefix", "statName": "근접 피해(%)", "slots": ["무기", "장갑", "목걸이", "허리띠"], "affixBalanceVersion": 2, "tierValues": [[10, 12], [13, 17], [18, 23], [24, 28], [29, 34], [35, 39], [40, 45], [46, 50], [51, 55], [56, 61], [62, 66], [67, 72], [73, 77], [78, 82], [83, 88], [89, 93], [94, 98], [99, 104], [105, 109], [110, 115]], "valueStep": 1 },
    { "id": "projectilePctDmg", "type": "prefix", "statName": "투사체 피해(%)", "slots": ["무기", "반지", "장갑", "목걸이", "허리띠"], "affixBalanceVersion": 2, "tierValues": [[10, 12], [13, 17], [18, 23], [24, 28], [29, 34], [35, 39], [40, 45], [46, 50], [51, 55], [56, 61], [62, 66], [67, 72], [73, 77], [78, 82], [83, 88], [89, 93], [94, 98], [99, 104], [105, 109], [110, 115]], "valueStep": 1 },
    { "id": "physPctDmg", "type": "prefix", "statName": "물리 피해(%)", "slots": ["무기", "허리띠", "반지", "방패"], "affixBalanceVersion": 2, "tierValues": [[11, 13], [14, 19], [20, 24], [25, 30], [31, 36], [37, 41], [42, 47], [48, 52], [53, 58], [59, 64], [65, 69], [70, 75], [76, 81], [82, 86], [87, 92], [93, 97], [98, 103], [104, 109], [110, 114], [115, 120]], "valueStep": 1 },
    { "id": "elementalPctDmg", "type": "prefix", "statName": "원소 피해(%)", "slots": ["무기", "반지", "목걸이", "허리띠"], "affixBalanceVersion": 2, "tierValues": [[10, 12], [13, 17], [18, 22], [23, 27], [28, 33], [34, 38], [39, 43], [44, 48], [49, 53], [54, 58], [59, 64], [65, 69], [70, 74], [75, 79], [80, 84], [85, 89], [90, 94], [95, 99], [100, 104], [105, 110]], "valueStep": 1 },
    { "id": "firePctDmg", "type": "prefix", "statName": "화염 피해(%)", "slots": ["무기", "반지", "목걸이", "방패"], "affixBalanceVersion": 2, "tierValues": [[12, 14], [15, 20], [21, 26], [27, 32], [33, 38], [39, 45], [46, 51], [52, 57], [58, 63], [64, 69], [70, 75], [76, 81], [82, 87], [88, 93], [94, 99], [100, 106], [107, 112], [113, 118], [119, 124], [125, 130]], "valueStep": 1 },
    { "id": "coldPctDmg", "type": "prefix", "statName": "냉기 피해(%)", "slots": ["무기", "반지", "목걸이", "방패"], "affixBalanceVersion": 2, "tierValues": [[12, 14], [15, 20], [21, 26], [27, 32], [33, 38], [39, 45], [46, 51], [52, 57], [58, 63], [64, 69], [70, 75], [76, 81], [82, 87], [88, 93], [94, 99], [100, 106], [107, 112], [113, 118], [119, 124], [125, 130]], "valueStep": 1 },
    { "id": "lightPctDmg", "type": "prefix", "statName": "번개 피해(%)", "slots": ["무기", "반지", "목걸이", "방패"], "affixBalanceVersion": 2, "tierValues": [[12, 14], [15, 20], [21, 26], [27, 32], [33, 38], [39, 45], [46, 51], [52, 57], [58, 63], [64, 69], [70, 75], [76, 81], [82, 87], [88, 93], [94, 99], [100, 106], [107, 112], [113, 118], [119, 124], [125, 130]], "valueStep": 1 },
    { "id": "chaosPctDmg", "type": "prefix", "statName": "카오스 피해(%)", "slots": ["무기", "반지", "목걸이", "장갑", "방패"], "affixBalanceVersion": 2, "tierValues": [[12, 14], [15, 20], [21, 26], [27, 32], [33, 38], [39, 45], [46, 51], [52, 57], [58, 63], [64, 69], [70, 75], [76, 81], [82, 87], [88, 93], [94, 99], [100, 106], [107, 112], [113, 118], [119, 124], [125, 130]], "valueStep": 1 },
    { "id": "aoePctDmg", "type": "prefix", "statName": "범위 피해(%)", "slots": ["무기", "투구", "목걸이"], "retiredSlots": ["갑옷"], "affixBalanceVersion": 2, "tierValues": [[11, 13], [14, 19], [20, 24], [25, 30], [31, 36], [37, 41], [42, 47], [48, 52], [53, 58], [59, 64], [65, 69], [70, 75], [76, 81], [82, 86], [87, 92], [93, 97], [98, 103], [104, 109], [110, 114], [115, 120]], "valueStep": 1 },
    { "id": "dotPctDmg", "type": "prefix", "statName": "지속 피해 배율(%)", "slots": ["무기", "반지", "목걸이"], "affixBalanceVersion": 2, "tierValues": [[7, 8], [9, 11], [12, 14], [15, 17], [18, 20], [21, 23], [24, 26], [27, 29], [30, 32], [33, 35], [36, 38], [39, 41], [42, 44], [45, 47], [48, 50], [51, 53], [54, 56], [57, 59], [60, 62], [63, 65]], "valueStep": 1 },
    { "id": "summonFlatDmg", "type": "prefix", "statName": "소환수 기본 피해", "slots": ["무기"], "affixBalanceVersion": 2, "tierValues": [[8, 10], [11, 14], [15, 18], [19, 22], [23, 26], [27, 30], [31, 34], [35, 38], [39, 42], [43, 46], [47, 50], [51, 54], [55, 58], [59, 62], [63, 66], [67, 70], [71, 74], [75, 78], [79, 82], [83, 86]], "valueStep": 1 },
    { "id": "summonPctDmg", "type": "prefix", "statName": "소환수 피해(%)", "slots": ["무기", "반지"], "affixBalanceVersion": 2, "tierValues": [[10, 12], [13, 16], [17, 20], [21, 24], [25, 28], [29, 32], [33, 36], [37, 40], [41, 44], [45, 48], [49, 52], [53, 56], [57, 60], [61, 64], [65, 68], [69, 72], [73, 76], [77, 80], [81, 84], [85, 88]], "valueStep": 1 },
    { "id": "summonHpPct", "type": "prefix", "statName": "소환수 생명력(%)", "slots": ["무기", "반지"], "affixBalanceVersion": 2, "tierValues": [[10, 12], [13, 16], [17, 20], [21, 24], [25, 28], [29, 32], [33, 36], [37, 40], [41, 44], [45, 48], [49, 52], [53, 56], [57, 60], [61, 64], [65, 68], [69, 72], [73, 76], [77, 80], [81, 84], [85, 88]], "valueStep": 1 },
    { "id": "summonAspd", "type": "suffix", "statName": "소환수 공격 속도(%)", "slots": ["무기"], "affixBalanceVersion": 2, "tierValues": [[5, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15, 16], [17, 18], [19, 20], [21, 22], [23, 24], [25, 26], [27, 28], [29, 30], [31, 32], [33, 34], [35, 36], [37, 38], [39, 40], [41, 42], [43, 44]], "valueStep": 1 },
    { "id": "summonCrit", "type": "suffix", "statName": "소환수 치명타 확률(%)", "slots": ["무기", "반지"], "affixBalanceVersion": 2, "tierValues": [[2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10], [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18], [19, 19], [20, 20], [21, 21]], "valueStep": 1 },
    { "id": "summonCritDmg", "type": "suffix", "statName": "소환수 치명타 피해 배율(%)", "slots": ["무기", "반지"], "affixBalanceVersion": 2, "tierValues": [[12, 14], [15, 18], [19, 22], [23, 26], [27, 30], [31, 34], [35, 38], [39, 42], [43, 46], [47, 50], [51, 54], [55, 58], [59, 62], [63, 66], [67, 70], [71, 74], [75, 78], [79, 82], [83, 86], [87, 90]], "valueStep": 1 },
    { "id": "summonEfficiency", "type": "suffix", "statName": "소환수 효율(%)", "slots": ["무기", "반지"], "affixBalanceVersion": 2, "tierValues": [[7, 8], [9, 11], [12, 14], [15, 17], [18, 20], [21, 23], [24, 26], [27, 29], [30, 32], [33, 35], [36, 38], [39, 41], [42, 44], [45, 47], [48, 50], [51, 53], [54, 56], [57, 59], [60, 62], [63, 65]], "valueStep": 1 },
    { "id": "summonCap", "type": "suffix", "statName": "소환수 최대 한도", "slots": ["반지"], "weight": 0.35, "affixBalanceVersion": 2, "tierValues": [[1, 1]], "fixedValue": true, "valueStep": 1 },
    { "id": "summonResPen", "type": "suffix", "statName": "소환수 저항 관통(%)", "slots": ["무기"], "weight": 0.7, "affixBalanceVersion": 2, "tierValues": [[4, 5], [6, 7], [8, 9], [10, 11], [12, 13], [14, 15], [16, 17], [18, 19], [20, 21], [22, 23], [24, 25], [26, 27], [28, 29], [30, 31], [32, 33], [34, 35], [36, 37], [38, 39], [40, 41], [42, 43]], "valueStep": 1 },
    { "id": "summonWeaponGemLevel", "statId": "summonGemLevel", "type": "prefix", "statName": "소환수 공격 스킬룬 레벨", "slots": ["무기"], "tierValues": [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [3, 3], [3, 3], [3, 3], [3, 3], [4, 4]], "weight": 0.15, "affixBalanceVersion": 3, "valueStep": 1 },
    { "id": "summonRingGemLevel", "statId": "summonGemLevel", "type": "prefix", "statName": "소환수 공격 스킬룬 레벨", "slots": ["반지"], "tierValues": [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [3, 3], [3, 3], [3, 3], [3, 3], [4, 4]], "weight": 0.15, "affixBalanceVersion": 3, "valueStep": 1 },
    { "id": "spellFlatDmg", "type": "prefix", "statName": "주문 내장 피해", "slots": ["무기", "목걸이"], "affixBalanceVersion": 2, "tierValues": [[16, 20], [21, 25], [26, 34], [35, 44], [45, 56], [57, 69], [70, 84], [85, 99], [100, 115], [116, 132], [133, 150], [151, 169], [170, 188], [189, 208], [209, 229], [230, 250], [251, 272], [273, 294], [295, 317], [318, 340]], "valueStep": 1 },
    { "id": "spellFlatPct", "type": "prefix", "statName": "주문 내장 피해 증가(%)", "slots": ["무기", "목걸이", "방패"], "affixBalanceVersion": 2, "tierValues": [[10, 12], [13, 16], [17, 20], [21, 24], [25, 28], [29, 32], [33, 36], [37, 40], [41, 44], [45, 48], [49, 52], [53, 56], [57, 60], [61, 64], [65, 68], [69, 72], [73, 76], [77, 80], [81, 84], [85, 88]], "valueStep": 1 },
    { "id": "flatHp", "type": "prefix", "statName": "최대 생명력", "slots": ["무기", "투구", "갑옷", "장갑", "신발", "목걸이", "반지", "허리띠", "방패"], "affixBalanceVersion": 2, "tierValues": [[25, 31], [32, 41], [42, 51], [52, 61], [62, 71], [72, 81], [82, 91], [92, 101], [102, 111], [112, 121], [122, 131], [132, 141], [142, 151], [152, 161], [162, 171], [172, 181], [182, 191], [192, 201], [202, 211], [212, 221]], "valueStep": 1 },
    { "id": "strength", "type": "suffix", "statName": "힘", "slots": ["무기", "투구", "갑옷", "장갑", "신발", "목걸이", "반지", "허리띠", "방패"], "affixBalanceVersion": 2, "tierValues": [[14, 17], [18, 23], [24, 29], [30, 35], [36, 41], [42, 47], [48, 53], [54, 59], [60, 65], [66, 71], [72, 77], [78, 83], [84, 89], [90, 95], [96, 101], [102, 107], [108, 113], [114, 119], [120, 125], [126, 131]], "valueStep": 1 },
    { "id": "dexterity", "type": "suffix", "statName": "민첩", "slots": ["무기", "투구", "갑옷", "장갑", "신발", "목걸이", "반지", "허리띠", "방패"], "affixBalanceVersion": 2, "tierValues": [[14, 17], [18, 23], [24, 29], [30, 35], [36, 41], [42, 47], [48, 53], [54, 59], [60, 65], [66, 71], [72, 77], [78, 83], [84, 89], [90, 95], [96, 101], [102, 107], [108, 113], [114, 119], [120, 125], [126, 131]], "valueStep": 1 },
    { "id": "intelligence", "type": "suffix", "statName": "지능", "slots": ["무기", "투구", "갑옷", "장갑", "신발", "목걸이", "반지", "허리띠", "방패"], "affixBalanceVersion": 2, "tierValues": [[14, 17], [18, 23], [24, 29], [30, 35], [36, 41], [42, 47], [48, 53], [54, 59], [60, 65], [66, 71], [72, 77], [78, 83], [84, 89], [90, 95], [96, 101], [102, 107], [108, 113], [114, 119], [120, 125], [126, 131]], "valueStep": 1 },
    { "id": "accuracy", "type": "suffix", "statName": "정확도", "slots": ["무기", "장갑", "반지", "목걸이"], "affixBalanceVersion": 2, "tierValues": [[150, 186], [187, 246], [247, 306], [307, 366], [367, 426], [427, 486], [487, 546], [547, 606], [607, 666], [667, 726], [727, 786], [787, 846], [847, 906], [907, 966], [967, 1026], [1027, 1086], [1087, 1146], [1147, 1206], [1207, 1266], [1267, 1326]], "valueStep": 1 },
    { "id": "armor", "type": "prefix", "statName": "방어도", "slots": ["투구", "갑옷", "장갑", "신발", "목걸이", "반지", "허리띠", "방패"], "affixBalanceVersion": 2, "tierValues": [[22, 28], [29, 38], [39, 48], [49, 58], [59, 68], [69, 78], [79, 88], [89, 98], [99, 108], [109, 118], [119, 128], [129, 138], [139, 148], [149, 158], [159, 168], [169, 178], [179, 188], [189, 198], [199, 208], [209, 218]], "valueStep": 1 },
    { "id": "evasion", "type": "prefix", "statName": "회피", "slots": ["투구", "갑옷", "장갑", "신발", "목걸이", "반지", "허리띠", "방패"], "affixBalanceVersion": 2, "tierValues": [[22, 28], [29, 38], [39, 48], [49, 58], [59, 68], [69, 78], [79, 88], [89, 98], [99, 108], [109, 118], [119, 128], [129, 138], [139, 148], [149, 158], [159, 168], [169, 178], [179, 188], [189, 198], [199, 208], [209, 218]], "valueStep": 1 },
    { "id": "energyShield", "type": "prefix", "statName": "에너지 보호막", "slots": ["투구", "갑옷", "장갑", "신발", "방패", "허리띠"], "affixBalanceVersion": 2, "tierValues": [[17, 21], [22, 29], [30, 37], [38, 45], [46, 53], [54, 61], [62, 69], [70, 77], [78, 85], [86, 93], [94, 101], [102, 109], [110, 117], [118, 125], [126, 133], [134, 141], [142, 149], [150, 157], [158, 165], [166, 173]], "valueStep": 1 },
    { "id": "armorPct", "type": "suffix", "statName": "방어도 증가(%)", "slots": ["투구", "갑옷", "장갑", "신발", "방패"], "affixBalanceVersion": 2, "tierValues": [[10, 12], [13, 16], [17, 20], [21, 24], [25, 28], [29, 32], [33, 36], [37, 40], [41, 44], [45, 48], [49, 52], [53, 56], [57, 60], [61, 64], [65, 68], [69, 72], [73, 76], [77, 80], [81, 84], [85, 88]], "valueStep": 1 },
    { "id": "evasionPct", "type": "suffix", "statName": "회피 증가(%)", "slots": ["투구", "갑옷", "장갑", "신발", "방패"], "affixBalanceVersion": 2, "tierValues": [[10, 12], [13, 16], [17, 20], [21, 24], [25, 28], [29, 32], [33, 36], [37, 40], [41, 44], [45, 48], [49, 52], [53, 56], [57, 60], [61, 64], [65, 68], [69, 72], [73, 76], [77, 80], [81, 84], [85, 88]], "valueStep": 1 },
    { "id": "deflectChance", "type": "suffix", "statName": "비껴내기 확률(%)", "slots": ["투구", "갑옷", "장갑", "신발", "방패"], "affixBalanceVersion": 2, "tierValues": [[2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10], [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18], [19, 19], [20, 20], [21, 21]], "valueStep": 1 },
    { "id": "energyShieldPct", "type": "suffix", "statName": "에너지 보호막 증가(%)", "slots": ["투구", "갑옷", "장갑", "신발", "방패"], "affixBalanceVersion": 2, "tierValues": [[10, 12], [13, 16], [17, 20], [21, 24], [25, 28], [29, 32], [33, 36], [37, 40], [41, 44], [45, 48], [49, 52], [53, 56], [57, 60], [61, 64], [65, 68], [69, 72], [73, 76], [77, 80], [81, 84], [85, 88]], "valueStep": 1 },
    { "id": "pctHp", "type": "suffix", "statName": "생명력 증가(%)", "slots": ["갑옷", "허리띠"], "affixBalanceVersion": 2, "tierValues": [[7, 8], [9, 11], [12, 14], [15, 17], [18, 20], [21, 23], [24, 26], [27, 29], [30, 32], [33, 35], [36, 38], [39, 41], [42, 44], [45, 47], [48, 50], [51, 53], [54, 56], [57, 59], [60, 62], [63, 65]], "valueStep": 1 },
    { "id": "aspd", "type": "suffix", "statName": "공격 속도(%)", "slots": ["무기", "반지", "목걸이", "허리띠", "장갑"], "affixBalanceVersion": 2, "tierValues": [[4, 5], [6, 7], [8, 9], [10, 11], [12, 13], [14, 15], [16, 17], [18, 19], [20, 21], [22, 23], [24, 25], [26, 27], [28, 29], [30, 31], [32, 33], [34, 35], [36, 37], [38, 39], [40, 41], [42, 43]], "valueStep": 1 },
    { "id": "crit", "type": "suffix", "statName": "치명타 확률(%)", "slots": ["무기", "투구", "장갑", "신발", "목걸이", "반지", "허리띠"], "retiredSlots": ["갑옷"], "affixBalanceVersion": 2, "tierValues": [[1, 1.3], [1.31, 1.8], [1.81, 2.2], [2.21, 2.7], [2.71, 3.2], [3.21, 3.7], [3.71, 4.2], [4.21, 4.7], [4.71, 5.2], [5.21, 5.7], [5.71, 6.2], [6.21, 6.8], [6.81, 7.3], [7.31, 7.8], [7.81, 8.3], [8.31, 8.8], [8.81, 9.3], [9.31, 9.8], [9.81, 10.3], [10.31, 10.8]], "valueStep": 0.01 },
    { "id": "move", "type": "prefix", "statName": "이동 속도(%)", "slots": ["신발"], "affixBalanceVersion": 2, "tierValues": [[6, 7], [8, 9], [10, 11], [12, 13], [14, 15], [16, 17], [18, 19], [20, 21], [22, 23], [24, 25], [26, 27], [28, 29], [30, 31], [32, 33], [34, 35], [36, 37], [38, 39], [40, 41], [42, 43], [44, 45]], "valueStep": 1 },
    { "id": "sight", "type": "suffix", "statName": "시야(칸)", "slots": ["투구"], "weight": 0.4, "affixBalanceVersion": 2, "tierValues": [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [3, 3], [3, 3], [3, 3], [3, 3], [3, 3], [3, 3], [3, 3], [3, 3], [3, 3]], "valueStep": 1 },
    { "id": "gemLevel", "type": "prefix", "statName": "모든 스킬룬 레벨", "slots": ["목걸이"], "affixBalanceVersion": 2, "tierValues": [[1, 1]], "fixedValue": true, "valueStep": 1 },
    { "id": "physIgnore", "type": "suffix", "statName": "물리 피해 감소 무시(%)", "slots": ["무기", "장갑", "목걸이"], "affixBalanceVersion": 2, "tierValues": [[1.9, 2.4], [2.41, 3.3], [3.31, 4.2], [4.21, 5.1], [5.11, 6], [6.01, 6.9], [6.91, 7.8], [7.81, 8.7], [8.71, 9.6], [9.61, 10.5], [10.51, 11.4], [11.41, 12.3], [12.31, 13.2], [13.21, 14.1], [14.11, 15], [15.01, 15.9], [15.91, 16.8], [16.81, 17.7], [17.71, 18.6], [18.61, 19.5]], "valueStep": 0.01 },
    { "id": "resF", "type": "suffix", "statName": "화염 저항(%)", "slots": ["반지", "목걸이", "갑옷", "투구", "신발", "장갑", "허리띠", "방패"], "affixBalanceVersion": 2, "tierValues": [[3, 4], [5, 6], [7, 9], [10, 11], [12, 13], [14, 16], [17, 18], [19, 20], [21, 22], [23, 25], [26, 27], [28, 29], [30, 31], [32, 34], [35, 36], [37, 38], [39, 40], [41, 43], [44, 45], [46, 48]], "valueStep": 1 },
    { "id": "resC", "type": "suffix", "statName": "냉기 저항(%)", "slots": ["반지", "목걸이", "갑옷", "투구", "신발", "장갑", "허리띠", "방패"], "affixBalanceVersion": 2, "tierValues": [[3, 4], [5, 6], [7, 9], [10, 11], [12, 13], [14, 16], [17, 18], [19, 20], [21, 22], [23, 25], [26, 27], [28, 29], [30, 31], [32, 34], [35, 36], [37, 38], [39, 40], [41, 43], [44, 45], [46, 48]], "valueStep": 1 },
    { "id": "resL", "type": "suffix", "statName": "번개 저항(%)", "slots": ["반지", "목걸이", "갑옷", "투구", "신발", "장갑", "허리띠", "방패"], "affixBalanceVersion": 2, "tierValues": [[3, 4], [5, 6], [7, 9], [10, 11], [12, 13], [14, 16], [17, 18], [19, 20], [21, 22], [23, 25], [26, 27], [28, 29], [30, 31], [32, 34], [35, 36], [37, 38], [39, 40], [41, 43], [44, 45], [46, 48]], "valueStep": 1 },
    { "id": "resAll", "type": "suffix", "statName": "모든 원소 저항(%)", "slots": ["반지", "목걸이", "갑옷", "방패"], "affixBalanceVersion": 2, "tierValues": [[1, 1], [2, 3], [4, 4], [5, 6], [7, 8], [9, 9], [10, 11], [12, 12], [13, 14], [15, 15], [16, 17], [18, 18], [19, 20], [21, 21], [22, 23], [24, 24], [25, 26], [27, 27], [28, 29], [30, 32]], "valueStep": 1 },
    { "id": "resChaos", "type": "suffix", "statName": "카오스 저항(%)", "slots": ["반지", "방패", "갑옷"], "affixBalanceVersion": 2, "tierValues": [[1, 1], [2, 3], [4, 4], [5, 6], [7, 7], [8, 9], [10, 10], [11, 11], [12, 13], [14, 14], [15, 16], [17, 17], [18, 18], [19, 20], [21, 21], [22, 23], [24, 24], [25, 26], [27, 27], [28, 30]], "valueStep": 1 },
    { "id": "resPen", "type": "suffix", "statName": "저항 관통(%)", "slots": ["무기", "반지", "목걸이"], "affixBalanceVersion": 2, "tierValues": [[0.8, 1.2], [1.21, 2], [2.01, 2.8], [2.81, 3.6], [3.61, 4.4], [4.41, 5.2], [5.21, 6], [6.01, 6.8], [6.81, 7.6], [7.61, 8.4], [8.41, 9.2], [9.21, 10], [10.01, 10.8], [10.81, 11.6], [11.61, 12.4], [12.41, 13.2], [13.21, 14], [14.01, 14.8], [14.81, 15.6], [15.61, 16.4]], "valueStep": 0.01 },
    { "id": "regen", "type": "suffix", "statName": "초당 재생(%)", "slots": ["갑옷", "허리띠", "목걸이", "방패"], "affixBalanceVersion": 2, "tierValues": [[0.3, 0.3], [0.31, 0.4], [0.41, 0.5], [0.51, 0.6], [0.61, 0.7], [0.71, 0.8], [0.81, 0.9], [0.91, 1], [1.01, 1.1], [1.11, 1.2], [1.21, 1.3], [1.31, 1.4], [1.41, 1.5], [1.51, 1.6], [1.61, 1.7], [1.71, 1.8], [1.81, 1.9], [1.91, 2], [2.01, 2.1], [2.11, 2.2]], "valueStep": 0.01 },
    { "id": "regenFlat", "type": "suffix", "statName": "생명력 재생(고정)", "slots": ["갑옷", "목걸이", "반지", "허리띠", "방패"], "affixBalanceVersion": 2, "tierValues": [[32, 39], [40, 51], [52, 63], [64, 75], [76, 87], [88, 99], [100, 111], [112, 123], [124, 135], [136, 147], [148, 159], [160, 171], [172, 183], [184, 195], [196, 207], [208, 219], [220, 231], [232, 243], [244, 255], [256, 267]], "valueStep": 1 },
    { "id": "regenSuppress", "type": "suffix", "statName": "재생 억제(%)", "slots": ["허리띠"], "affixBalanceVersion": 2, "tierValues": [[0.36, 0.39], [0.4, 0.45], [0.46, 0.51], [0.52, 0.57], [0.58, 0.63], [0.64, 0.69], [0.7, 0.75], [0.76, 0.81], [0.82, 0.87], [0.88, 0.93], [0.94, 0.99], [1, 1.05], [1.06, 1.11], [1.12, 1.17], [1.18, 1.23], [1.24, 1.29], [1.3, 1.35], [1.36, 1.41], [1.42, 1.47], [1.48, 1.53]], "valueStep": 0.01 },
    { "id": "regenSuppressGloves", "statId": "regenSuppress", "type": "suffix", "statName": "재생 억제(%)", "slots": ["장갑"], "affixBalanceVersion": 2, "tierValues": [[0.12, 0.16], [0.17, 0.23], [0.24, 0.3], [0.31, 0.37], [0.38, 0.44], [0.45, 0.51], [0.52, 0.58], [0.59, 0.65], [0.66, 0.72], [0.73, 0.79], [0.8, 0.86], [0.87, 0.93], [0.94, 1], [1.01, 1.07], [1.08, 1.14], [1.15, 1.21], [1.22, 1.28], [1.29, 1.35], [1.36, 1.42], [1.43, 1.49]], "valueStep": 0.01 },
    { "id": "regenSuppressAmulet", "statId": "regenSuppress", "type": "suffix", "statName": "재생 억제(%)", "slots": ["목걸이"], "affixBalanceVersion": 2, "tierValues": [[0.1, 0.1]], "fixedValue": true, "valueStep": 0.01 },
    { "id": "targetAny", "type": "suffix", "statName": "스킬 타겟 수", "slots": ["장갑"], "weight": 0.45, "affixBalanceVersion": 2, "tierValues": [[1, 1]], "fixedValue": true, "valueStep": 1 },
    { "id": "targetProjectile", "type": "suffix", "statName": "투사체 스킬 타겟 수", "slots": ["무기"], "weight": 0.45, "affixBalanceVersion": 2, "tierValues": [[1, 1]], "fixedValue": true, "valueStep": 1 },
    { "id": "projectileExtraShots", "type": "suffix", "statName": "투사체 추가 발사 확률(%)", "slots": ["무기"], "weight": 0.4, "affixBalanceVersion": 2, "tierValues": [[100, 125], [126, 175], [176, 225], [226, 275], [276, 325], [326, 375], [376, 425], [426, 475], [476, 525], [526, 575], [576, 625], [626, 675], [676, 725], [726, 775], [776, 825], [826, 875], [876, 925], [926, 975], [976, 1025], [1026, 1100]], "statId": "projectileExtraChance", "valueStep": 1 },
    { "id": "targetSlam", "type": "suffix", "statName": "강타 스킬 타겟 수", "slots": ["무기"], "weight": 0.45, "affixBalanceVersion": 2, "tierValues": [[1, 1]], "fixedValue": true, "valueStep": 1 },
    { "id": "leech", "type": "suffix", "statName": "공격 피해의 생명력 흡수(%)", "slots": ["무기", "장갑", "반지"], "affixBalanceVersion": 2, "tierValues": [[0.16, 0.2], [0.21, 0.28], [0.29, 0.36], [0.37, 0.44], [0.45, 0.52], [0.53, 0.6], [0.61, 0.68], [0.69, 0.76], [0.77, 0.84], [0.85, 0.92], [0.93, 1], [1.01, 1.08], [1.09, 1.16], [1.17, 1.24], [1.25, 1.32], [1.33, 1.4], [1.41, 1.48], [1.49, 1.56], [1.57, 1.64], [1.65, 1.72]], "valueStep": 0.01 },
    { "id": "leechRateCap", "type": "suffix", "statName": "흡혈 회복 속도 캡(%)", "slots": ["무기", "장갑", "목걸이"], "affixBalanceVersion": 2, "tierValues": [[0.6, 0.7], [0.71, 0.9], [0.91, 1.1], [1.11, 1.3], [1.31, 1.5], [1.51, 1.7], [1.71, 1.9], [1.91, 2.1], [2.11, 2.3], [2.31, 2.5], [2.51, 2.7], [2.71, 2.9], [2.91, 3.1], [3.11, 3.3], [3.31, 3.5], [3.51, 3.7], [3.71, 3.9], [3.91, 4.1], [4.11, 4.3], [4.31, 4.5]], "valueStep": 0.01 },
    { "id": "leechTotalCap", "type": "suffix", "statName": "흡혈 총 회복량 캡(%)", "slots": ["갑옷", "허리띠", "목걸이"], "affixBalanceVersion": 2, "tierValues": [[3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10], [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18], [19, 19], [20, 20], [21, 21], [22, 22]], "valueStep": 1 },
    { "id": "leechInstanceCap", "type": "suffix", "statName": "흡혈 관통당 회복량 캡(%)", "slots": ["무기", "반지", "장갑"], "affixBalanceVersion": 2, "tierValues": [[1.5, 1.8], [1.81, 2.2], [2.21, 2.7], [2.71, 3.2], [3.21, 3.7], [3.71, 4.2], [4.21, 4.7], [4.71, 5.2], [5.21, 5.7], [5.71, 6.2], [6.21, 6.8], [6.81, 7.3], [7.31, 7.8], [7.81, 8.3], [8.31, 8.8], [8.81, 9.3], [9.31, 9.8], [9.81, 10.3], [10.31, 10.8], [10.81, 11.3]], "valueStep": 0.01 },
    { "id": "dr", "type": "suffix", "statName": "물리 피해 감소(%)", "slots": ["갑옷", "허리띠", "투구"], "affixBalanceVersion": 2, "tierValues": [[4, 5], [6, 7], [8, 9], [10, 11], [12, 13], [14, 15], [16, 17], [18, 19], [20, 21], [22, 23], [24, 25], [26, 27], [28, 29], [30, 31], [32, 33], [34, 35], [36, 37], [38, 39], [40, 41], [42, 43]], "valueStep": 1 },
    { "id": "critDmg", "type": "suffix", "statName": "치명타 피해 배율(%)", "slots": ["무기", "목걸이", "투구"], "affixBalanceVersion": 2, "tierValues": [[16, 19], [20, 25], [26, 31], [32, 37], [38, 43], [44, 49], [50, 55], [56, 61], [62, 67], [68, 73], [74, 79], [80, 85], [86, 91], [92, 97], [98, 103], [104, 109], [110, 115], [116, 121], [122, 127], [128, 133]], "valueStep": 1 },
    { "id": "ds", "type": "suffix", "statName": "연속 타격(%)", "slots": ["장갑", "무기"], "affixBalanceVersion": 2, "tierValues": [[8, 9], [10, 12], [13, 15], [16, 18], [19, 21], [22, 24], [25, 27], [28, 30], [31, 33], [34, 36], [37, 39], [40, 42], [43, 45], [46, 48], [49, 51], [52, 54], [55, 57], [58, 60], [61, 63], [64, 66]], "valueStep": 1 },
    { "id": "minDmgRollWeapon", "statId": "minDmgRoll", "type": "suffix", "statName": "최소 피해 보정(%)", "slots": ["무기"], "affixBalanceVersion": 2, "tierValues": [[6, 7], [8, 9], [10, 11], [12, 13], [14, 15], [16, 17], [18, 19], [20, 21], [22, 23], [24, 25], [26, 27], [28, 29], [30, 31], [32, 33], [34, 35], [36, 37], [38, 39], [40, 41], [42, 43], [44, 45]], "valueStep": 1 },
    { "id": "maxDmgRollWeapon", "statId": "maxDmgRoll", "type": "suffix", "statName": "최대 피해 보정(%)", "slots": ["무기"], "affixBalanceVersion": 2, "tierValues": [[6, 7], [8, 9], [10, 11], [12, 13], [14, 15], [16, 17], [18, 19], [20, 21], [22, 23], [24, 25], [26, 27], [28, 29], [30, 31], [32, 33], [34, 35], [36, 37], [38, 39], [40, 41], [42, 43], [44, 45]], "valueStep": 1 },
    { "id": "suppCap", "type": "prefix", "statName": "보조스킬룬 한도", "slots": ["목걸이"], "affixBalanceVersion": 2, "tierValues": [[1, 1]], "fixedValue": true, "valueStep": 1 },
    { "id": "shieldBlockPct", "statId": "blockChancePct", "type": "suffix", "statName": "막기 확률(%) 증가", "slots": ["방패"], "affixBalanceVersion": 2, "tierValues": [[20, 24], [25, 32], [33, 40], [41, 48], [49, 56], [57, 64], [65, 72], [73, 80], [81, 88], [89, 96], [97, 104], [105, 112], [113, 120], [121, 128], [129, 136], [137, 144], [145, 152], [153, 160], [161, 168], [169, 176]], "valueStep": 1 },
    { "id": "shieldBlockFlat", "statId": "blockChance", "type": "suffix", "statName": "막기 확률(+%p)", "slots": ["방패"], "affixBalanceVersion": 2, "tierValues": [[1.8, 2.2], [2.21, 3], [3.01, 3.8], [3.81, 4.6], [4.61, 5.4], [5.41, 6.2], [6.21, 7], [7.01, 7.8], [7.81, 8.6], [8.61, 9.4], [9.41, 10.2], [10.21, 11], [11.01, 11.8], [11.81, 12.6], [12.61, 13.4], [13.41, 14.2], [14.21, 15], [15.01, 15.8], [15.81, 16.6], [16.61, 17.4]], "valueStep": 0.01 },
    { "id": "shieldMaxResF", "statId": "maxResF", "type": "suffix", "statName": "최대 화염 저항(%)", "slots": ["방패"], "weight": 0.35, "affixBalanceVersion": 2, "tierValues": [[1.3, 1.4], [1.41, 1.7], [1.71, 2], [2.01, 2.3], [2.31, 2.6], [2.61, 2.9], [2.91, 3.2], [3.21, 3.5], [3.51, 3.8], [3.81, 4.1], [4.11, 4.4], [4.41, 4.7], [4.71, 5], [5.01, 5.3], [5.31, 5.6], [5.61, 5.9], [5.91, 6.2], [6.21, 6.5], [6.51, 6.8], [6.81, 7.1]], "valueStep": 0.01 },
    { "id": "shieldMaxResC", "statId": "maxResC", "type": "suffix", "statName": "최대 냉기 저항(%)", "slots": ["방패"], "weight": 0.35, "affixBalanceVersion": 2, "tierValues": [[1.3, 1.4], [1.41, 1.7], [1.71, 2], [2.01, 2.3], [2.31, 2.6], [2.61, 2.9], [2.91, 3.2], [3.21, 3.5], [3.51, 3.8], [3.81, 4.1], [4.11, 4.4], [4.41, 4.7], [4.71, 5], [5.01, 5.3], [5.31, 5.6], [5.61, 5.9], [5.91, 6.2], [6.21, 6.5], [6.51, 6.8], [6.81, 7.1]], "valueStep": 0.01 },
    { "id": "shieldMaxResL", "statId": "maxResL", "type": "suffix", "statName": "최대 번개 저항(%)", "slots": ["방패"], "weight": 0.35, "affixBalanceVersion": 2, "tierValues": [[1.3, 1.4], [1.41, 1.7], [1.71, 2], [2.01, 2.3], [2.31, 2.6], [2.61, 2.9], [2.91, 3.2], [3.21, 3.5], [3.51, 3.8], [3.81, 4.1], [4.11, 4.4], [4.41, 4.7], [4.71, 5], [5.01, 5.3], [5.31, 5.6], [5.61, 5.9], [5.91, 6.2], [6.21, 6.5], [6.51, 6.8], [6.81, 7.1]], "valueStep": 0.01 },
    { "id": "shieldMaxResChaos", "statId": "maxResChaos", "type": "suffix", "statName": "최대 카오스 저항(%)", "slots": ["방패"], "weight": 0.25, "affixBalanceVersion": 2, "tierValues": [[1.1, 1.1], [1.11, 1.3], [1.31, 1.4], [1.41, 1.6], [1.61, 1.8], [1.81, 1.9], [1.91, 2], [2.01, 2.2], [2.21, 2.3], [2.31, 2.5], [2.51, 2.6], [2.61, 2.8], [2.81, 3], [3.01, 3.1], [3.11, 3.3], [3.31, 3.4], [3.41, 3.5], [3.51, 3.7], [3.71, 3.9], [3.91, 4]], "valueStep": 0.01 },
    { "id": "shieldMaxResAll", "statId": "maxResAll", "type": "suffix", "statName": "모든 원소 최대 저항(%)", "slots": ["방패"], "tierValues": [[1, 1.12], [1.13, 1.25], [1.26, 1.38], [1.39, 1.51], [1.52, 1.64], [1.65, 1.77], [1.78, 1.9], [1.91, 2.03], [2.04, 2.16], [2.17, 2.29], [2.3, 2.42], [2.43, 2.55], [2.56, 2.68], [2.69, 2.81], [2.82, 2.94], [2.95, 3.07], [3.08, 3.2], [3.21, 3.33], [3.34, 3.46], [3.47, 3.59]], "weight": 0.15, "affixBalanceVersion": 2 },
    { "id": "shieldSpellGemLevel", "statId": "spellGemLevel", "type": "prefix", "statName": "모든 주문 스킬룬 레벨", "slots": ["방패"], "weight": 0.3, "affixBalanceVersion": 3, "tierValues": [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [3, 3], [3, 3], [3, 3], [3, 3], [4, 4]], "valueStep": 0.01, "valueStep": 1 },
    { "id": "weaponPhysFlatDmg", "statId": "physFlatDmg", "type": "prefix", "statName": "물리 기본 피해", "slots": ["무기"], "affixBalanceVersion": 2, "tierValues": [[8, 9], [10, 13], [14, 17], [18, 22], [23, 27], [28, 34], [35, 41], [42, 48], [49, 56], [57, 64], [65, 73], [74, 82], [83, 91], [92, 101], [102, 111], [112, 121], [122, 132], [133, 143], [144, 154], [155, 165]], "valueStep": 1 },
    { "id": "weaponFireFlatDmg", "statId": "fireFlatDmg", "type": "prefix", "statName": "화염 기본 피해", "slots": ["무기"], "affixBalanceVersion": 2, "tierValues": [[14, 18], [19, 23], [24, 31], [32, 41], [42, 52], [53, 65], [66, 78], [79, 93], [94, 108], [109, 124], [125, 141], [142, 159], [160, 177], [178, 196], [197, 215], [216, 235], [236, 255], [256, 276], [277, 298], [299, 320]], "valueStep": 1 },
    { "id": "weaponColdFlatDmg", "statId": "coldFlatDmg", "type": "prefix", "statName": "냉기 기본 피해", "slots": ["무기"], "affixBalanceVersion": 2, "tierValues": [[14, 18], [19, 23], [24, 31], [32, 41], [42, 52], [53, 65], [66, 78], [79, 93], [94, 108], [109, 124], [125, 141], [142, 159], [160, 177], [178, 196], [197, 215], [216, 235], [236, 255], [256, 276], [277, 298], [299, 320]], "valueStep": 1 },
    { "id": "weaponLightFlatDmg", "statId": "lightFlatDmg", "type": "prefix", "statName": "번개 기본 피해", "slots": ["무기"], "affixBalanceVersion": 2, "tierValues": [[14, 18], [19, 23], [24, 31], [32, 41], [42, 52], [53, 65], [66, 78], [79, 93], [94, 108], [109, 124], [125, 141], [142, 159], [160, 177], [178, 196], [197, 215], [216, 235], [236, 255], [256, 276], [277, 298], [299, 320]], "valueStep": 1 },
    { "id": "weaponChaosFlatDmg", "statId": "chaosFlatDmg", "type": "prefix", "statName": "카오스 기본 피해", "slots": ["무기"], "affixBalanceVersion": 2, "tierValues": [[14, 18], [19, 23], [24, 31], [32, 41], [42, 52], [53, 65], [66, 78], [79, 93], [94, 108], [109, 124], [125, 141], [142, 159], [160, 177], [178, 196], [197, 215], [216, 235], [236, 255], [256, 276], [277, 298], [299, 320]], "valueStep": 1 },
    { "id": "ringPhysFlatDmg", "statId": "physFlatDmg", "type": "prefix", "statName": "물리 기본 피해", "slots": ["반지"], "affixBalanceVersion": 2, "tierValues": [[7, 7], [8, 9], [10, 11], [12, 14], [15, 17], [18, 20], [21, 23], [24, 27], [28, 31], [32, 35], [36, 39], [40, 44], [45, 48], [49, 53], [54, 58], [59, 63], [64, 68], [69, 74], [75, 79], [80, 85]], "valueStep": 1 },
    { "id": "ringFireFlatDmg", "statId": "fireFlatDmg", "type": "prefix", "statName": "화염 기본 피해", "slots": ["반지"], "affixBalanceVersion": 2, "tierValues": [[10, 11], [12, 13], [14, 17], [18, 20], [21, 24], [25, 29], [30, 34], [35, 39], [40, 44], [45, 50], [51, 56], [57, 62], [63, 68], [69, 74], [75, 81], [82, 88], [89, 95], [96, 102], [103, 109], [110, 120]], "valueStep": 1 },
    { "id": "ringColdFlatDmg", "statId": "coldFlatDmg", "type": "prefix", "statName": "냉기 기본 피해", "slots": ["반지"], "affixBalanceVersion": 2, "tierValues": [[10, 11], [12, 13], [14, 17], [18, 20], [21, 24], [25, 29], [30, 34], [35, 39], [40, 44], [45, 50], [51, 56], [57, 62], [63, 68], [69, 74], [75, 81], [82, 88], [89, 95], [96, 102], [103, 109], [110, 120]], "valueStep": 1 },
    { "id": "ringLightFlatDmg", "statId": "lightFlatDmg", "type": "prefix", "statName": "번개 기본 피해", "slots": ["반지"], "affixBalanceVersion": 2, "tierValues": [[10, 11], [12, 13], [14, 17], [18, 20], [21, 24], [25, 29], [30, 34], [35, 39], [40, 44], [45, 50], [51, 56], [57, 62], [63, 68], [69, 74], [75, 81], [82, 88], [89, 95], [96, 102], [103, 109], [110, 120]], "valueStep": 1 },
    { "id": "ringChaosFlatDmg", "statId": "chaosFlatDmg", "type": "prefix", "statName": "카오스 기본 피해", "slots": ["반지"], "affixBalanceVersion": 2, "tierValues": [[10, 11], [12, 13], [14, 17], [18, 20], [21, 24], [25, 29], [30, 34], [35, 39], [40, 44], [45, 50], [51, 56], [57, 62], [63, 68], [69, 74], [75, 81], [82, 88], [89, 95], [96, 102], [103, 109], [110, 120]], "valueStep": 1 },
    { "id": "glovePhysFlatDmg", "statId": "physFlatDmg", "type": "prefix", "statName": "물리 기본 피해", "slots": ["장갑"], "affixBalanceVersion": 2, "tierValues": [[8, 8], [9, 11], [12, 13], [14, 16], [17, 20], [21, 24], [25, 28], [29, 33], [34, 38], [39, 43], [44, 48], [49, 54], [55, 59], [60, 65], [66, 72], [73, 78], [79, 84], [85, 91], [92, 98], [99, 105]], "valueStep": 1 },
    { "id": "gloveFireFlatDmg", "statId": "fireFlatDmg", "type": "prefix", "statName": "화염 기본 피해", "slots": ["장갑"], "affixBalanceVersion": 2, "tierValues": [[12, 13], [14, 16], [17, 20], [21, 25], [26, 30], [31, 37], [38, 43], [44, 50], [51, 57], [58, 65], [66, 73], [74, 82], [83, 91], [92, 100], [101, 109], [110, 119], [120, 129], [130, 139], [140, 149], [150, 160]], "valueStep": 1 },
    { "id": "gloveColdFlatDmg", "statId": "coldFlatDmg", "type": "prefix", "statName": "냉기 기본 피해", "slots": ["장갑"], "affixBalanceVersion": 2, "tierValues": [[12, 13], [14, 16], [17, 20], [21, 25], [26, 30], [31, 37], [38, 43], [44, 50], [51, 57], [58, 65], [66, 73], [74, 82], [83, 91], [92, 100], [101, 109], [110, 119], [120, 129], [130, 139], [140, 149], [150, 160]], "valueStep": 1 },
    { "id": "gloveLightFlatDmg", "statId": "lightFlatDmg", "type": "prefix", "statName": "번개 기본 피해", "slots": ["장갑"], "affixBalanceVersion": 2, "tierValues": [[12, 13], [14, 16], [17, 20], [21, 25], [26, 30], [31, 37], [38, 43], [44, 50], [51, 57], [58, 65], [66, 73], [74, 82], [83, 91], [92, 100], [101, 109], [110, 119], [120, 129], [130, 139], [140, 149], [150, 160]], "valueStep": 1 },
    { "id": "gloveChaosFlatDmg", "statId": "chaosFlatDmg", "type": "prefix", "statName": "카오스 기본 피해", "slots": ["장갑"], "affixBalanceVersion": 2, "tierValues": [[12, 13], [14, 16], [17, 20], [21, 25], [26, 30], [31, 37], [38, 43], [44, 50], [51, 57], [58, 65], [66, 73], [74, 82], [83, 91], [92, 100], [101, 109], [110, 119], [120, 129], [130, 139], [140, 149], [150, 160]], "valueStep": 1 },
    { "id": "compoundArmor", "statId": "armor", "type": "prefix", "statName": "방어도 + 방어도 증가(%)", "slots": ["투구", "갑옷", "장갑", "신발", "방패"], "compound": [{ "statId": "armorPct", "statName": "방어도 증가(%)", "tierValues": [[3, 3.7], [3.71, 4.9], [4.91, 6.1], [6.11, 7.3], [7.31, 8.5], [8.51, 9.7], [9.71, 10.9], [10.91, 12.1], [12.11, 13.3], [13.31, 14.5], [14.51, 15.7], [15.71, 16.9], [16.91, 18.1], [18.11, 19.3], [19.31, 20.5], [20.51, 21.7], [21.71, 22.9], [22.91, 24.1], [24.11, 25.3], [25.31, 26.5]], "affixBalanceVersion": 2, "valueStep": 0.01 }], "affixBalanceVersion": 2, "tierValues": [[7, 8], [9, 11], [12, 14], [15, 17], [18, 20], [21, 23], [24, 26], [27, 29], [30, 32], [33, 35], [36, 38], [39, 41], [42, 44], [45, 47], [48, 50], [51, 53], [54, 56], [57, 59], [60, 62], [63, 65]], "valueStep": 1 },
    { "id": "compoundEvasion", "statId": "evasion", "type": "prefix", "statName": "회피 + 회피 증가(%)", "slots": ["투구", "갑옷", "장갑", "신발", "방패"], "compound": [{ "statId": "evasionPct", "statName": "회피 증가(%)", "tierValues": [[3, 3.7], [3.71, 4.9], [4.91, 6.1], [6.11, 7.3], [7.31, 8.5], [8.51, 9.7], [9.71, 10.9], [10.91, 12.1], [12.11, 13.3], [13.31, 14.5], [14.51, 15.7], [15.71, 16.9], [16.91, 18.1], [18.11, 19.3], [19.31, 20.5], [20.51, 21.7], [21.71, 22.9], [22.91, 24.1], [24.11, 25.3], [25.31, 26.5]], "affixBalanceVersion": 2, "valueStep": 0.01 }], "affixBalanceVersion": 2, "tierValues": [[7, 8], [9, 11], [12, 14], [15, 17], [18, 20], [21, 23], [24, 26], [27, 29], [30, 32], [33, 35], [36, 38], [39, 41], [42, 44], [45, 47], [48, 50], [51, 53], [54, 56], [57, 59], [60, 62], [63, 65]], "valueStep": 1 },
    { "id": "compoundEnergyShield", "statId": "energyShield", "type": "prefix", "statName": "에너지 보호막 + 보호막 증가(%)", "slots": ["투구", "갑옷", "장갑", "신발", "방패"], "compound": [{ "statId": "energyShieldPct", "statName": "에너지 보호막 증가(%)", "tierValues": [[3, 3.7], [3.71, 4.9], [4.91, 6.1], [6.11, 7.3], [7.31, 8.5], [8.51, 9.7], [9.71, 10.9], [10.91, 12.1], [12.11, 13.3], [13.31, 14.5], [14.51, 15.7], [15.71, 16.9], [16.91, 18.1], [18.11, 19.3], [19.31, 20.5], [20.51, 21.7], [21.71, 22.9], [22.91, 24.1], [24.11, 25.3], [25.31, 26.5]], "affixBalanceVersion": 2, "valueStep": 0.01 }], "affixBalanceVersion": 2, "tierValues": [[5.1, 6.5], [6.51, 8.9], [8.91, 11.3], [11.31, 13.7], [13.71, 16.1], [16.11, 18.5], [18.51, 20.9], [20.91, 23.3], [23.31, 25.7], [25.71, 28.1], [28.11, 30.5], [30.51, 32.9], [32.91, 35.3], [35.31, 37.7], [37.71, 40.1], [40.11, 42.5], [42.51, 44.9], [44.91, 47.3], [47.31, 49.7], [49.71, 52.1]], "valueStep": 0.01 },
    { "id": "compoundWeaponDmg", "statId": "flatDmg", "type": "prefix", "statName": "기본 피해 + 무기의 기본 피해 증가(%)", "slots": ["무기"], "compound": [{ "statId": "weaponFlatDmgPct", "statName": "무기의 기본 피해 증가(%)", "tierValues": [[3, 3.7], [3.71, 4.9], [4.91, 6.1], [6.11, 7.3], [7.31, 8.5], [8.51, 9.7], [9.71, 10.9], [10.91, 12.1], [12.11, 13.3], [13.31, 14.5], [14.51, 15.7], [15.71, 16.9], [16.91, 18.1], [18.11, 19.3], [19.31, 20.5], [20.51, 21.7], [21.71, 22.9], [22.91, 24.1], [24.11, 25.3], [25.31, 26.5]], "affixBalanceVersion": 2, "valueStep": 0.01 }], "affixBalanceVersion": 2, "tierValues": [[4, 4], [5, 6], [7, 9], [10, 12], [13, 15], [16, 19], [20, 22], [23, 27], [28, 31], [32, 36], [37, 40], [41, 46], [47, 51], [52, 57], [58, 62], [63, 68], [69, 74], [75, 80], [81, 86], [87, 93]], "valueStep": 1 },
    { "id": "ringFlatDmg", "statId": "flatDmg", "type": "prefix", "statName": "기본 피해", "slots": ["반지"], "tierValues": [[6, 6], [7, 8], [9, 10], [11, 13], [14, 16], [17, 19], [20, 22], [23, 26], [27, 29], [30, 33], [34, 37], [38, 41], [42, 46], [47, 50], [51, 55], [56, 59], [60, 64], [65, 69], [70, 74], [75, 80]], "affixBalanceVersion": 2, "valueStep": 1 },
    { "id": "gloveFlatDmg", "statId": "flatDmg", "type": "prefix", "statName": "기본 피해", "slots": ["장갑"], "tierValues": [[6, 6], [7, 9], [10, 12], [13, 15], [16, 18], [19, 22], [23, 26], [27, 31], [32, 35], [36, 40], [41, 45], [46, 51], [52, 56], [57, 62], [63, 68], [69, 74], [75, 80], [81, 87], [88, 93], [94, 100]], "affixBalanceVersion": 2, "valueStep": 1 },
    { "id": "accessoryFlatDmg", "statId": "flatDmg", "type": "prefix", "statName": "기본 피해", "slots": ["목걸이", "허리띠"], "tierValues": [[6, 6], [7, 8], [9, 11], [12, 14], [15, 17], [18, 21], [22, 24], [25, 28], [29, 32], [33, 37], [38, 41], [42, 46], [47, 51], [52, 56], [57, 61], [62, 67], [68, 72], [73, 78], [79, 84], [85, 90]], "affixBalanceVersion": 2, "valueStep": 1 },
    { "id": "attackPctDmg", "type": "prefix", "statName": "공격 피해 증가(%)", "slots": ["무기", "장갑", "목걸이"], "tierValues": [[10, 12], [13, 17], [18, 23], [24, 28], [29, 34], [35, 39], [40, 45], [46, 50], [51, 55], [56, 61], [62, 66], [67, 72], [73, 77], [78, 82], [83, 88], [89, 93], [94, 98], [99, 104], [105, 109], [110, 115]], "affixBalanceVersion": 2, "valueStep": 1 },
    { "id": "spellPctDmg", "type": "prefix", "statName": "주문 피해 증가(%)", "slots": ["무기", "목걸이", "방패", "허리띠"], "tierValues": [[10, 12], [13, 17], [18, 23], [24, 28], [29, 34], [35, 39], [40, 45], [46, 50], [51, 55], [56, 61], [62, 66], [67, 72], [73, 77], [78, 82], [83, 88], [89, 93], [94, 98], [99, 104], [105, 109], [110, 115]], "affixBalanceVersion": 2, "valueStep": 1 },
    { "id": "spellLeech", "type": "suffix", "statName": "주문 피해의 생명력 흡수(%)", "slots": ["무기", "목걸이", "방패"], "affixBalanceVersion": 2, "tierValues": [[0.16, 0.16], [0.17, 0.24], [0.25, 0.32], [0.33, 0.4], [0.41, 0.48], [0.49, 0.56], [0.57, 0.64], [0.65, 0.72], [0.73, 0.8], [0.81, 0.88], [0.89, 0.96], [0.97, 1.04], [1.05, 1.12], [1.13, 1.2], [1.21, 1.28], [1.29, 1.36], [1.37, 1.44], [1.45, 1.52], [1.53, 1.6], [1.61, 1.72]], "valueStep": 0.01 },
    { "id": "greatswordSlamPctDmg", "statId": "slamPctDmg", "type": "prefix", "statName": "강타 피해(%)", "slots": ["무기"], "weaponCategories": ["greatsword"], "affixBalanceVersion": 2, "tierValues": [[10, 12], [13, 17], [18, 23], [24, 28], [29, 34], [35, 39], [40, 45], [46, 50], [51, 55], [56, 61], [62, 66], [67, 72], [73, 77], [78, 82], [83, 88], [89, 93], [94, 98], [99, 104], [105, 109], [110, 115]], "valueStep": 1 },
    { "id": "greatswordSlamGemLevel", "statId": "slamGemLevel", "type": "prefix", "statName": "강타 스킬룬 레벨", "slots": ["무기"], "weaponCategories": ["greatsword"], "weight": 0.2, "affixBalanceVersion": 3, "tierValues": [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [3, 3], [3, 3], [3, 3], [3, 3], [4, 4]], "valueStep": 1 },
    { "id": "scimitarBleedChance", "statId": "bleedChance", "type": "suffix", "statName": "출혈 확률(%)", "slots": ["무기"], "weaponCategories": ["scimitar"], "affixBalanceVersion": 2, "tierValues": [[3, 4], [5, 6], [7, 7], [8, 9], [10, 10], [11, 12], [13, 13], [14, 15], [16, 16], [17, 18], [19, 19], [20, 21], [22, 22], [23, 24], [25, 25], [26, 27], [28, 28], [29, 30], [31, 31], [32, 33]], "valueStep": 1 },
    { "id": "scimitarMeleeGemLevel", "statId": "meleeGemLevel", "type": "prefix", "statName": "근접 스킬룬 레벨", "slots": ["무기"], "weaponCategories": ["scimitar"], "weight": 0.2, "affixBalanceVersion": 3, "tierValues": [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [3, 3], [3, 3], [3, 3], [3, 3], [4, 4]], "valueStep": 1 },
    { "id": "shortbowProjectileGemLevel", "statId": "projectileGemLevel", "type": "prefix", "statName": "투사체 스킬룬 레벨", "slots": ["무기"], "weaponCategories": ["shortbow"], "weight": 0.2, "affixBalanceVersion": 3, "tierValues": [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [3, 3], [3, 3], [3, 3], [3, 3], [4, 4]], "valueStep": 1 },
    { "id": "shortbowAccuracyPct", "statId": "accuracyBonusPct", "type": "suffix", "statName": "정확도 보정(%)", "slots": ["무기"], "weaponCategories": ["shortbow"], "affixBalanceVersion": 2, "tierValues": [[4, 5], [6, 7], [8, 9], [10, 11], [12, 13], [14, 15], [16, 17], [18, 19], [20, 21], [22, 23], [24, 25], [26, 27], [28, 29], [30, 31], [32, 33], [34, 35], [36, 37], [38, 39], [40, 41], [42, 43]], "valueStep": 1 },
    { "id": "orbElementalGemLevel", "statId": "elementalGemLevel", "type": "prefix", "statName": "원소 스킬룬 레벨", "slots": ["무기"], "weaponCategories": ["orb"], "weight": 0.15, "affixBalanceVersion": 3, "tierValues": [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [3, 3], [3, 3], [3, 3], [3, 3], [4, 4]], "valueStep": 1 },
    { "id": "orbSpellCritDmg", "statId": "spellCritDmg", "type": "suffix", "statName": "주문 치명타 피해 배율(%)", "slots": ["무기"], "weaponCategories": ["orb"], "affixBalanceVersion": 2, "tierValues": [[16, 19], [20, 25], [26, 31], [32, 37], [38, 43], [44, 49], [50, 55], [56, 61], [62, 67], [68, 73], [74, 79], [80, 85], [86, 91], [92, 97], [98, 103], [104, 109], [110, 115], [116, 121], [122, 127], [128, 133]], "valueStep": 1 },
    { "id": "flaskPotionPctDmg", "statId": "potionPctDmg", "type": "prefix", "statName": "포션 투척 피해(%)", "slots": ["무기"], "weaponCategories": ["flask"], "affixBalanceVersion": 2, "tierValues": [[10, 12], [13, 17], [18, 23], [24, 28], [29, 34], [35, 39], [40, 45], [46, 50], [51, 55], [56, 61], [62, 66], [67, 72], [73, 77], [78, 82], [83, 88], [89, 93], [94, 98], [99, 104], [105, 109], [110, 115]], "valueStep": 1 },
    { "id": "flaskPoisonChance", "statId": "poisonChance", "type": "suffix", "statName": "중독 확률(%)", "slots": ["무기"], "weaponCategories": ["flask"], "affixBalanceVersion": 2, "tierValues": [[3, 4], [5, 6], [7, 7], [8, 9], [10, 10], [11, 12], [13, 13], [14, 15], [16, 16], [17, 18], [19, 19], [20, 21], [22, 22], [23, 24], [25, 25], [26, 27], [28, 28], [29, 30], [31, 31], [32, 33]], "valueStep": 1 },
    { "id": "censerLightGemLevel", "statId": "lightGemLevel", "type": "prefix", "statName": "번개 스킬룬 레벨", "slots": ["무기"], "weaponCategories": ["censer"], "baseElements": ["light"], "weight": 0.2, "affixBalanceVersion": 3, "tierValues": [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [3, 3], [3, 3], [3, 3], [3, 3], [4, 4]], "valueStep": 1 },
    { "id": "censerFireGemLevel", "statId": "fireGemLevel", "type": "prefix", "statName": "화염 스킬룬 레벨", "slots": ["무기"], "weaponCategories": ["censer"], "baseElements": ["fire"], "weight": 0.2, "affixBalanceVersion": 3, "tierValues": [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [3, 3], [3, 3], [3, 3], [3, 3], [4, 4]], "valueStep": 1 },
    { "id": "censerPhysGemLevel", "statId": "physGemLevel", "type": "prefix", "statName": "물리 스킬룬 레벨", "slots": ["무기"], "weaponCategories": ["censer"], "baseElements": ["phys"], "weight": 0.2, "affixBalanceVersion": 3, "tierValues": [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [2, 2], [3, 3], [3, 3], [3, 3], [3, 3], [4, 4]], "valueStep": 1 },
    { "id": "censerRegen", "statId": "regen", "type": "suffix", "statName": "초당 재생(%)", "slots": ["무기"], "weaponCategories": ["censer"], "affixBalanceVersion": 2, "tierValues": [[0.3, 0.3], [0.31, 0.4], [0.41, 0.5], [0.51, 0.6], [0.61, 0.7], [0.71, 0.8], [0.81, 0.9], [0.91, 1], [1.01, 1.1], [1.11, 1.2], [1.21, 1.3], [1.31, 1.4], [1.41, 1.5], [1.51, 1.6], [1.61, 1.7], [1.71, 1.8], [1.81, 1.9], [1.91, 2], [2.01, 2.1], [2.11, 2.2]], "valueStep": 0.01 },
    { "id": "armorResonance", "statId": "runeResonancePower", "type": "prefix", "statName": "공명력", "slots": ["갑옷"], "weight": 0.15, "affixBalanceVersion": 2, "tierValues": [[1, 1], [1, 1], [1, 2], [2, 2], [2, 3], [3, 3], [3, 4], [4, 4], [4, 5], [5, 5], [5, 6], [6, 6], [6, 7], [7, 7], [7, 8], [8, 8], [8, 9], [9, 9], [9, 10], [10, 10]] },
    { "id": "armorTakenReduce", "statId": "genericTakenDamageReducePct", "type": "prefix", "statName": "받는 피해 감소(%)", "slots": ["갑옷"], "weight": 0.3, "affixBalanceVersion": 2, "tierValues": [[1, 1], [1, 1], [1, 1], [1, 1], [1, 2], [1, 2], [1, 2], [1, 2], [2, 3], [2, 3], [2, 3], [2, 3], [3, 4], [3, 4], [3, 4], [3, 4], [4, 5], [4, 5], [4, 5], [5, 6]] },
    { "id": "armorTakenCrowd", "statId": "takenDamageReduceWhen2EnemiesPct", "type": "prefix", "statName": "적 2명 이상일 때 받는 피해 감소(%)", "slots": ["갑옷"], "weight": 0.6, "affixBalanceVersion": 2, "tierValues": [[2, 2], [2, 3], [3, 3], [3, 4], [4, 4], [4, 5], [5, 5], [5, 6], [6, 6], [6, 7], [7, 7], [7, 8], [8, 8], [8, 9], [9, 9], [9, 10], [10, 10], [10, 11], [11, 11], [12, 12]] },
    { "id": "armorTakenDuel", "statId": "takenDamageReduceWhen1EnemyPct", "type": "prefix", "statName": "적 1명일 때 받는 피해 감소(%)", "slots": ["갑옷"], "weight": 0.6, "affixBalanceVersion": 2, "tierValues": [[1, 1], [1, 2], [2, 2], [2, 2], [2, 3], [3, 3], [3, 3], [3, 4], [4, 4], [4, 4], [4, 5], [5, 5], [5, 5], [5, 6], [6, 6], [6, 6], [6, 7], [7, 7], [7, 7], [8, 8]] },
    { "id": "armorAilResIgnite", "statId": "ailResIgnite", "type": "suffix", "statName": "점화 저항 확률(%)", "slots": ["갑옷"], "weight": 0.5, "affixBalanceVersion": 2, "tierValues": [[3, 4], [4, 5], [5, 6], [6, 7], [8, 9], [9, 10], [10, 11], [12, 13], [13, 14], [14, 15], [16, 17], [17, 18], [18, 19], [20, 21], [21, 22], [22, 23], [24, 25], [25, 26], [26, 27], [28, 30]] },
    { "id": "armorAilResShock", "statId": "ailResShock", "type": "suffix", "statName": "감전 저항 확률(%)", "slots": ["갑옷"], "weight": 0.5, "affixBalanceVersion": 2, "tierValues": [[3, 4], [4, 5], [5, 6], [6, 7], [8, 9], [9, 10], [10, 11], [12, 13], [13, 14], [14, 15], [16, 17], [17, 18], [18, 19], [20, 21], [21, 22], [22, 23], [24, 25], [25, 26], [26, 27], [28, 30]] },
    { "id": "armorAilResFreeze", "statId": "ailResFreeze", "type": "suffix", "statName": "냉기 저항 확률(%)", "slots": ["갑옷"], "weight": 0.5, "affixBalanceVersion": 2, "tierValues": [[3, 4], [4, 5], [5, 6], [6, 7], [8, 9], [9, 10], [10, 11], [12, 13], [13, 14], [14, 15], [16, 17], [17, 18], [18, 19], [20, 21], [21, 22], [22, 23], [24, 25], [25, 26], [26, 27], [28, 30]] },
    { "id": "armorAilResPoison", "statId": "ailResPoison", "type": "suffix", "statName": "중독 저항 확률(%)", "slots": ["갑옷"], "weight": 0.5, "affixBalanceVersion": 2, "tierValues": [[3, 4], [4, 5], [5, 6], [6, 7], [8, 9], [9, 10], [10, 11], [12, 13], [13, 14], [14, 15], [16, 17], [17, 18], [18, 19], [20, 21], [21, 22], [22, 23], [24, 25], [25, 26], [26, 27], [28, 30]] },
    { "id": "armorAilResBleed", "statId": "ailResBleed", "type": "suffix", "statName": "출혈 저항 확률(%)", "slots": ["갑옷"], "weight": 0.5, "affixBalanceVersion": 2, "tierValues": [[3, 4], [4, 5], [5, 6], [6, 7], [8, 9], [9, 10], [10, 11], [12, 13], [13, 14], [14, 15], [16, 17], [17, 18], [18, 19], [20, 21], [21, 22], [22, 23], [24, 25], [25, 26], [26, 27], [28, 30]] },
    { "id": "armorDeflectReduce", "statId": "deflectDamageReduce", "type": "suffix", "statName": "비껴내기 피해 감소(%)", "slots": ["갑옷"], "weight": 0.5, "affixBalanceVersion": 2, "tierValues": [[2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 18], [18, 19], [19, 20], [20, 21], [21, 23]] },
    { "id": "armorCritTaken", "statId": "critTakenDamageReducePct", "type": "suffix", "statName": "받는 치명타 피해 감소(%)", "slots": ["갑옷"], "weight": 0.5, "affixBalanceVersion": 2, "tierValues": [[4, 5], [5, 7], [7, 9], [9, 11], [11, 13], [13, 15], [15, 17], [17, 19], [19, 21], [21, 23], [23, 25], [25, 27], [27, 29], [29, 31], [31, 33], [33, 35], [35, 36], [36, 37], [37, 38], [38, 40]] },
    { "id": "armorIgniteDuration", "statId": "igniteTakenDurationReducePct", "type": "suffix", "statName": "점화 지속 시간 감소(%)", "slots": ["갑옷"], "weight": 0.4, "affixBalanceVersion": 2, "tierValues": [[3, 4], [4, 5], [5, 6], [6, 7], [8, 9], [9, 10], [10, 11], [12, 13], [13, 14], [14, 15], [16, 17], [17, 18], [18, 19], [20, 21], [21, 22], [22, 23], [24, 25], [25, 26], [26, 27], [28, 30]] },
    { "id": "armorShockDuration", "statId": "shockTakenDurationReducePct", "type": "suffix", "statName": "감전 지속 시간 감소(%)", "slots": ["갑옷"], "weight": 0.4, "affixBalanceVersion": 2, "tierValues": [[3, 4], [4, 5], [5, 6], [6, 7], [8, 9], [9, 10], [10, 11], [12, 13], [13, 14], [14, 15], [16, 17], [17, 18], [18, 19], [20, 21], [21, 22], [22, 23], [24, 25], [25, 26], [26, 27], [28, 30]] },
    { "id": "armorColdDuration", "statId": "coldTakenDurationReducePct", "type": "suffix", "statName": "냉기 지속 시간 감소(%)", "slots": ["갑옷"], "weight": 0.4, "affixBalanceVersion": 2, "tierValues": [[3, 4], [4, 5], [5, 6], [6, 7], [8, 9], [9, 10], [10, 11], [12, 13], [13, 14], [14, 15], [16, 17], [17, 18], [18, 19], [20, 21], [21, 22], [22, 23], [24, 25], [25, 26], [26, 27], [28, 30]] },
    { "id": "armorPoisonDuration", "statId": "poisonTakenDurationReducePct", "type": "suffix", "statName": "중독 지속 시간 감소(%)", "slots": ["갑옷"], "weight": 0.4, "affixBalanceVersion": 2, "tierValues": [[3, 4], [4, 5], [5, 6], [6, 7], [8, 9], [9, 10], [10, 11], [12, 13], [13, 14], [14, 15], [16, 17], [17, 18], [18, 19], [20, 21], [21, 22], [22, 23], [24, 25], [25, 26], [26, 27], [28, 30]] },
    { "id": "armorBleedDuration", "statId": "bleedTakenDurationReducePct", "type": "suffix", "statName": "출혈 지속 시간 감소(%)", "slots": ["갑옷"], "weight": 0.4, "affixBalanceVersion": 2, "tierValues": [[3, 4], [4, 5], [5, 6], [6, 7], [8, 9], [9, 10], [10, 11], [12, 13], [13, 14], [14, 15], [16, 17], [17, 18], [18, 19], [20, 21], [21, 22], [22, 23], [24, 25], [25, 26], [26, 27], [28, 30]] }
  ];
  function createAffixesDefinitions({ REGION_AFFIX_MODS: REGION_AFFIX_MODS2, INFLUENCE_AFFIX_MODS: INFLUENCE_AFFIX_MODS2, AFFIX_TAG_LISTS: AFFIX_TAG_LISTS2, resolveAffixTagList: resolveAffixTagList2 }) {
    const MOD_DB = [...AUTHORED_MOD_DB, ...REGION_AFFIX_MODS2, ...INFLUENCE_AFFIX_MODS2];
    const FOSSIL_DB = [
      { key: "fossilJagged", name: "톱니 화석", desc: "물리/근접 계열 옵션 하나를 확정하여 희귀 아이템의 옵션을 다시 굴립니다." },
      { key: "fossilBound", name: "속박 화석", desc: "생명/방어 계열 옵션 하나를 확정하여 희귀 아이템의 옵션을 다시 굴립니다." },
      { key: "fossilGale", name: "돌풍 화석", desc: "속도/치명 계열 옵션 하나를 확정하여 희귀 아이템의 옵션을 다시 굴립니다." },
      { key: "fossilPrismatic", name: "프리즘 화석", desc: "저항/원소 계열 옵션 하나를 확정하여 희귀 아이템의 옵션을 다시 굴립니다." },
      { key: "fossilAbyssal", name: "심연 화석", desc: "카오스/흡혈/재생 계열 옵션 하나를 확정하여 희귀 아이템의 옵션을 다시 굴립니다." },
      { key: "fossilPrimordial", name: "태고 화석", desc: "원시 고대 화석 복원으로 얻습니다. 관통/카오스 계열 옵션 하나를 확정하여 희귀 아이템의 옵션을 다시 굴립니다.", ancientPrimalOnly: true },
      { key: "fossilBulwark", name: "방패 화석", desc: "최대 화염/냉기/번개 저항 계열 옵션 하나를 확정하여 희귀 아이템의 옵션을 다시 굴립니다. 방어구 전용: 투구/갑옷/장갑/신발/완갑." },
      { key: "fossilWedge", name: "쐐기 화석", desc: "투사체/치명 계열 옵션 하나를 확정하여 희귀 아이템의 옵션을 다시 굴립니다." },
      { key: "fossilOld", name: "오래된 화석", desc: "화석 전용 옵션 하나를 확정하여 희귀 아이템의 옵션을 다시 굴립니다." },
      { key: "fossilRift", name: "균열 화석", desc: "희귀 아이템의 옵션을 다시 굴리고, 제거할 수 없는 균열 표식과 나머지 추가 옵션 50% 증폭 효과를 부여합니다." }
      // The line each fossil guarantees comes from its tag rule (data/affix-tags.js AFFIX_TAG_LISTS.fossil); old and rift fossils have none.
    ].map((fossil) => ({ ...fossil, guaranteedStats: AFFIX_TAG_LISTS2.fossil[fossil.key] ? resolveAffixTagList2(AFFIX_TAG_LISTS2.fossil[fossil.key], MOD_DB) : [] }));
    return { MOD_DB, FOSSIL_DB, FOSSIL_EXCLUSIVE_MODS };
  }

  // modules/data/underworld-rune-definitions.mjs
  var UNDERWORLD_RUNE_DB = [
    { no: 1, id: "uw_rune_1", name: "초생", stat: "flatHp", val: 30 },
    { no: 2, id: "uw_rune_2", name: "절단", stat: "flatDmg", val: 8 },
    { no: 3, id: "uw_rune_3", name: "강벽", stat: "armor", val: 30 },
    { no: 4, id: "uw_rune_4", name: "경풍", stat: "evasion", val: 30 },
    { no: 5, id: "uw_rune_5", name: "영갑", stat: "energyShield", val: 30 },
    { no: 6, id: "uw_rune_6", name: "화관", stat: "resF", val: 3 },
    { no: 7, id: "uw_rune_7", name: "설관", stat: "resC", val: 3 },
    { no: 8, id: "uw_rune_8", name: "뢰관", stat: "resL", val: 3 },
    { no: 9, id: "uw_rune_9", name: "공식", stat: "resChaos", val: 1.5 },
    { no: 10, id: "uw_rune_10", name: "균결", stat: "resAll", val: 1 },
    { no: 11, id: "uw_rune_11", name: "혈전", stat: "physPctDmg", val: 12 },
    { no: 12, id: "uw_rune_12", name: "염전", stat: "firePctDmg", val: 12 },
    { no: 13, id: "uw_rune_13", name: "빙전", stat: "coldPctDmg", val: 12 },
    { no: 14, id: "uw_rune_14", name: "뢰전", stat: "lightPctDmg", val: 12 },
    { no: 15, id: "uw_rune_15", name: "허전", stat: "chaosPctDmg", val: 12 },
    { no: 16, id: "uw_rune_16", name: "비화", stat: "corpseExplodeChance", val: 5 },
    { no: 17, id: "uw_rune_17", name: "분화", stat: "corpseExplodeLifePct", val: 8 },
    { no: 18, id: "uw_rune_18", name: "극염", stat: "maxResF", val: 1 },
    { no: 19, id: "uw_rune_19", name: "극한", stat: "maxResC", val: 1 },
    { no: 20, id: "uw_rune_20", name: "극뢰", stat: "maxResL", val: 1 },
    { no: 21, id: "uw_rune_21", name: "천공", stat: "resPen", val: 5 },
    { no: 22, id: "uw_rune_22", name: "심절", stat: "physIgnore", val: 5 },
    { no: 23, id: "uw_rune_23", name: "공율", stat: "resonancePower", val: 10 },
    { no: 24, id: "uw_rune_24", name: "추동", stat: "move", val: 3 },
    { no: 25, id: "uw_rune_25", name: "속결", stat: "aspd", val: 3 },
    { no: 26, id: "uw_rune_26", name: "예각", stat: "crit", val: 1 },
    { no: 27, id: "uw_rune_27", name: "쇄광", stat: "critDmg", val: 3 },
    { no: 28, id: "uw_rune_28", name: "연격", stat: "ds", val: 2 },
    { no: 29, id: "uw_rune_29", name: "저류", stat: "minDmgRoll", val: 2 },
    { no: 30, id: "uw_rune_30", name: "고조", stat: "maxDmgRoll", val: 2 }
  ];
  function createRunesDefinitions() {
    return { UNDERWORLD_RUNE_DB };
  }

  // modules/data/equipment-base-definitions.mjs
  var BASE_ITEM_DB = [
    { id: "rusted_blade", slot: "무기", name: "녹슨 한손검", reqTier: 1, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: "flatDmg", base: 5, legacyDamageBase: 4 }] },
    { id: "apprentice_familiar_wand", slot: "무기", name: "견습 사역 오브", reqTier: 1, requirementWeights: { intelligence: 1 }, baseStats: [{ id: "flatDmg", base: 6, legacyDamageBase: 5 }, { id: "summonPctDmg", base: 10 }, { id: "summonEfficiency", base: 4 }] },
    { id: "hunter_axe", slot: "무기", name: "사냥꾼의 한손검", reqTier: 3, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: "flatDmg", base: 11, legacyDamageBase: 9 }, { id: "crit", base: 3 }] },
    { id: "pact_familiar_wand", slot: "무기", name: "계약 사역 오브", reqTier: 4, requirementWeights: { intelligence: 1 }, baseStats: [{ id: "flatDmg", base: 11, legacyDamageBase: 9 }, { id: "summonPctDmg", base: 14 }, { id: "summonEfficiency", base: 6 }] },
    { id: "abyss_spear", slot: "무기", name: "심연의 대검", reqTier: 7, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: "flatDmg", base: 20, legacyDamageBase: 14 }, { id: "aspd", base: 6 }, { id: "baseBlockChance", base: 5, baseMin: 5, baseMax: 5 }] },
    { id: "bloodletter_blade", slot: "무기", name: "혈각 한손검", reqTier: 10, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: "flatDmg", base: 38, legacyDamageBase: 24 }, { id: "crit", base: 5 }] },
    { id: "gale_fang_spear", slot: "무기", name: "질풍 대검", reqTier: 10, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: "flatDmg", base: 38, legacyDamageBase: 24 }, { id: "aspd", base: 8 }, { id: "baseBlockChance", base: 5, baseMin: 5, baseMax: 5 }] },
    { id: "executioner_blade", slot: "무기", name: "처형자의 대검", reqTier: 14, requirementWeights: { strength: 1 }, baseStats: [{ id: "flatDmg", base: 71, legacyDamageBase: 38 }, { id: "crit", base: 8 }, { id: "baseBlockChance", base: 5, baseMin: 5, baseMax: 5 }] },
    { id: "tempest_pike", slot: "무기", name: "폭풍 대검", reqTier: 15, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: "flatDmg", base: 82, legacyDamageBase: 42 }, { id: "aspd", base: 10 }, { id: "baseBlockChance", base: 5, baseMin: 5, baseMax: 5 }] },
    { id: "windlash_bow", slot: "무기", name: "돌풍 단궁", reqTier: 5, requirementWeights: { dexterity: 1 }, baseStats: [{ id: "flatDmg", base: 14, legacyDamageBase: 11 }, { id: "projectilePctDmg", base: 10 }] },
    { id: "stormbolt_launcher", slot: "무기", name: "폭전 단궁", reqTier: 10, requirementWeights: { dexterity: 1 }, baseStats: [{ id: "flatDmg", base: 35, legacyDamageBase: 22 }, { id: "projectilePctDmg", base: 18 }, { id: "projectileExtraChance", base: 50 }] },
    { id: "starfall_ballista", slot: "무기", name: "유성 단궁", reqTier: 15, requirementWeights: { dexterity: 1 }, baseStats: [{ id: "flatDmg", base: 72, legacyDamageBase: 37 }, { id: "projectilePctDmg", base: 26 }, { id: "projectileExtraChance", base: 100 }] },
    { id: "needle_recurve", slot: "무기", name: "바늘 단궁", reqTier: 8, requirementWeights: { dexterity: 1 }, baseStats: [{ id: "flatDmg", base: 26, legacyDamageBase: 18 }, { id: "projectilePctDmg", base: 14 }] },
    { id: "spiritbound_wand", slot: "무기", name: "영혼 결속 오브", reqTier: 8, requirementWeights: { intelligence: 1 }, baseStats: [{ id: "flatDmg", base: 23, legacyDamageBase: 16 }, { id: "summonPctDmg", base: 22 }, { id: "summonEfficiency", base: 10 }] },
    { id: "seeker_railgun", slot: "무기", name: "추적 단궁", reqTier: 12, requirementWeights: { dexterity: 1 }, baseStats: [{ id: "flatDmg", base: 48, legacyDamageBase: 28 }, { id: "projectilePctDmg", base: 22 }, { id: "projectileExtraChance", base: 100 }] },
    { id: "tempest_volley", slot: "무기", name: "폭풍 연사 단궁", reqTier: 15, requirementWeights: { dexterity: 1 }, baseStats: [{ id: "flatDmg", base: 69, legacyDamageBase: 35 }, { id: "projectilePctDmg", base: 30 }, { id: "projectileExtraChance", base: 150 }] },
    { id: "nova_rod", slot: "무기", name: "노바 오브", reqTier: 5, requirementWeights: { intelligence: 1 }, baseStats: [{ id: "flatDmg", base: 9, legacyDamageBase: 7 }, { id: "spellFlatDmg", base: 26, legacyDamageBase: 20 }] },
    { id: "rift_scepter", slot: "무기", name: "균열 오브", reqTier: 10, requirementWeights: { intelligence: 1 }, baseStats: [{ id: "flatDmg", base: 22, legacyDamageBase: 14 }, { id: "spellFlatDmg", base: 60, legacyDamageBase: 38 }, { id: "spellFlatPct", base: 12 }] },
    { id: "void_archon_staff", slot: "무기", name: "공허 대현자 오브", reqTier: 15, requirementWeights: { intelligence: 1 }, baseStats: [{ id: "flatDmg", base: 47, legacyDamageBase: 24 }, { id: "spellFlatDmg", base: 114, legacyDamageBase: 58 }, { id: "spellFlatPct", base: 22 }] },
    { id: "ember_wand", slot: "무기", name: "잿불 오브", reqTier: 8, requirementWeights: { intelligence: 1 }, baseStats: [{ id: "flatDmg", base: 16, legacyDamageBase: 11 }, { id: "spellFlatDmg", base: 44, legacyDamageBase: 30 }] },
    { id: "echo_focus", slot: "무기", name: "메아리 수정 오브", reqTier: 12, requirementWeights: { intelligence: 1 }, baseStats: [{ id: "flatDmg", base: 29, legacyDamageBase: 17 }, { id: "spellFlatDmg", base: 80, legacyDamageBase: 46 }, { id: "spellFlatPct", base: 16 }] },
    { id: "ritual_familiar_staff", slot: "무기", name: "의식 사역마 오브", reqTier: 12, requirementWeights: { intelligence: 1 }, baseStats: [{ id: "flatDmg", base: 41, legacyDamageBase: 24 }, { id: "summonPctDmg", base: 30 }, { id: "summonEfficiency", base: 14 }] },
    { id: "abyss_chant_staff", slot: "무기", name: "심연 창가 오브", reqTier: 15, requirementWeights: { intelligence: 1 }, baseStats: [{ id: "flatDmg", base: 39, legacyDamageBase: 20 }, { id: "spellFlatDmg", base: 125, legacyDamageBase: 64 }, { id: "spellFlatPct", base: 26 }] },
    { id: "archon_familiar_staff", slot: "무기", name: "아콘 사역마 오브", reqTier: 20, requirementWeights: { intelligence: 1 }, baseStats: [{ id: "flatDmg", base: 101, legacyDamageBase: 42 }, { id: "summonPctDmg", base: 40 }, { id: "summonEfficiency", base: 18 }] },
    { id: "doomcleaver_blade", slot: "무기", name: "파멸 대검", reqTier: 17, requirementWeights: { strength: 1 }, baseStats: [{ id: "flatDmg", base: 113, legacyDamageBase: 53 }, { id: "crit", base: 11 }, { id: "baseBlockChance", base: 5, baseMin: 5, baseMax: 5 }] },
    { id: "apocalypse_greatblade", slot: "무기", name: "멸세 대검", reqTier: 20, requirementWeights: { strength: 1 }, baseStats: [{ id: "flatDmg", base: 154, legacyDamageBase: 64 }, { id: "crit", base: 14 }, { id: "baseBlockChance", base: 5, baseMin: 5, baseMax: 5 }] },
    { id: "cyclone_glaive", slot: "무기", name: "회오리 대검", reqTier: 17, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: "flatDmg", base: 117, legacyDamageBase: 55 }, { id: "aspd", base: 13 }, { id: "baseBlockChance", base: 5, baseMin: 5, baseMax: 5 }] },
    { id: "tempestlord_lance", slot: "무기", name: "태풍군주 대검", reqTier: 20, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: "flatDmg", base: 158, legacyDamageBase: 66 }, { id: "aspd", base: 16 }, { id: "baseBlockChance", base: 5, baseMin: 5, baseMax: 5 }] },
    { id: "meteor_repeater", slot: "무기", name: "유성 연사 단궁", reqTier: 20, requirementWeights: { dexterity: 1 }, baseStats: [{ id: "flatDmg", base: 132, legacyDamageBase: 55 }, { id: "projectilePctDmg", base: 34 }, { id: "projectileExtraChance", base: 150 }] },
    { id: "genesis_void_staff", slot: "무기", name: "창세 공허 오브", reqTier: 20, requirementWeights: { intelligence: 1 }, baseStats: [{ id: "flatDmg", base: 82, legacyDamageBase: 34 }, { id: "spellFlatDmg", base: 187, legacyDamageBase: 78 }, { id: "spellFlatPct", base: 30 }] },
    // 플라스크(연금술사가 던지는 병): 포션 스킬 · 범위 피해. 향로(사제가 휘두르는 사슬 향로): 번개(신성) 피해 · 초당 재생.
    { id: "cracked_flask", slot: "무기", name: "금 간 플라스크", reqTier: 1, requirementWeights: { dexterity: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 6, legacyDamageBase: 5 }, { id: "potionPctDmg", base: 10 }] },
    { id: "catalyst_flask", slot: "무기", name: "촉매 플라스크", reqTier: 5, requirementWeights: { dexterity: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 14, legacyDamageBase: 11 }, { id: "potionPctDmg", base: 14 }, { id: "poisonChance", base: 5 }] },
    { id: "volatile_flask", slot: "무기", name: "휘발 플라스크", reqTier: 10, requirementWeights: { dexterity: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 35, legacyDamageBase: 22 }, { id: "potionPctDmg", base: 20 }, { id: "aoePctDmg", base: 10 }] },
    { id: "alchemist_retort", slot: "무기", name: "연금 증류병", reqTier: 15, requirementWeights: { dexterity: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 66, legacyDamageBase: 34 }, { id: "potionPctDmg", base: 28 }, { id: "aoePctDmg", base: 14 }] },
    { id: "philosopher_flask", slot: "무기", name: "현자의 플라스크", reqTier: 20, requirementWeights: { dexterity: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 127, legacyDamageBase: 53 }, { id: "potionPctDmg", base: 36 }, { id: "aoePctDmg", base: 18 }] },
    { id: "tin_censer", slot: "무기", name: "양철 향로", reqTier: 1, requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 5, legacyDamageBase: 4 }, { id: "regen", base: 0.2 }] },
    { id: "incense_censer", slot: "무기", name: "분향 향로", reqTier: 5, requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 14, legacyDamageBase: 11 }, { id: "lightPctDmg", base: 8 }, { id: "regen", base: 0.3 }] },
    { id: "ember_censer", slot: "무기", name: "섬광 향로", reqTier: 10, requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 36, legacyDamageBase: 23 }, { id: "lightPctDmg", base: 14 }, { id: "regen", base: 0.4 }] },
    { id: "thundercloud_censer", slot: "무기", name: "뇌운 향로", reqTier: 12, requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 46 }, { id: "lightPctDmg", base: 16 }, { id: "regen", base: 0.4 }] },
    { id: "chapel_censer", slot: "무기", name: "성당 향로", reqTier: 15, requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 70, legacyDamageBase: 36 }, { id: "lightPctDmg", base: 20 }, { id: "regen", base: 0.5 }] },
    { id: "thunder_censer", slot: "무기", name: "천둥 향로", reqTier: 17, requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 98 }, { id: "lightPctDmg", base: 24 }, { id: "regen", base: 0.5 }] },
    { id: "sunrise_censer", slot: "무기", name: "해돋이 향로", reqTier: 20, requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 140, legacyDamageBase: 58 }, { id: "lightPctDmg", base: 28 }, { id: "regen", base: 0.6 }] },
    // 무기 대분류 구멍 메우기(2026-10-03): 한손검 14 · 17 · 20단계(힘과 민첩, 치명타 · 공격 속도), 대검 1 · 4 · 10단계(힘, 치명타),
    // 단궁 1단계(민첩, 투사체). 액트 1부터 여섯 대분류가 다 떨어지고, 한손검도 20단계까지 제 대분류 안에서 승급한다.
    { id: "crescent_scimitar", slot: "무기", name: "초승 한손검", reqTier: 14, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: "flatDmg", base: 62, legacyDamageBase: 33 }, { id: "crit", base: 8 }, { id: "aspd", base: 5 }] },
    { id: "blackiron_scimitar", slot: "무기", name: "흑철 한손검", reqTier: 17, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: "flatDmg", base: 100, legacyDamageBase: 47 }, { id: "crit", base: 11 }, { id: "aspd", base: 7 }] },
    { id: "eclipse_scimitar", slot: "무기", name: "월식 한손검", reqTier: 20, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: "flatDmg", base: 134, legacyDamageBase: 56 }, { id: "crit", base: 14 }, { id: "aspd", base: 9 }] },
    { id: "dull_greatsword", slot: "무기", name: "무딘 대검", reqTier: 1, requirementWeights: { strength: 1 }, baseStats: [{ id: "flatDmg", base: 6, legacyDamageBase: 5 }, { id: "crit", base: 2 }, { id: "baseBlockChance", base: 5, baseMin: 5, baseMax: 5 }] },
    { id: "iron_greatsword", slot: "무기", name: "무쇠 대검", reqTier: 4, requirementWeights: { strength: 1 }, baseStats: [{ id: "flatDmg", base: 12, legacyDamageBase: 10 }, { id: "crit", base: 4 }, { id: "baseBlockChance", base: 5, baseMin: 5, baseMax: 5 }] },
    { id: "warden_greatsword", slot: "무기", name: "파수꾼 대검", reqTier: 10, requirementWeights: { strength: 1 }, baseStats: [{ id: "flatDmg", base: 38, legacyDamageBase: 24 }, { id: "crit", base: 6 }, { id: "baseBlockChance", base: 5, baseMin: 5, baseMax: 5 }] },
    { id: "hunting_shortbow", slot: "무기", name: "사냥 단궁", reqTier: 1, requirementWeights: { dexterity: 1 }, baseStats: [{ id: "flatDmg", base: 6, legacyDamageBase: 5 }, { id: "projectilePctDmg", base: 6 }] },
    { id: "cloth_hood", slot: "투구", name: "천 후드", reqTier: 1, baseStats: [{ id: "flatHp", base: 12 }, { id: "energyShield", base: 36 }] },
    { id: "war_helm", slot: "투구", name: "전투 투구", reqTier: 4, baseStats: [{ id: "flatHp", base: 28 }, { id: "armor", base: 105 }, { id: "dr", base: 2 }] },
    { id: "bastion_helm", slot: "투구", name: "보루 투구", reqTier: 8, baseStats: [{ id: "flatHp", base: 44 }, { id: "armor", base: 170 }, { id: "dr", base: 3 }] },
    { id: "void_crown", slot: "투구", name: "공허 왕관", reqTier: 8, baseStats: [{ id: "flatHp", base: 50 }, { id: "energyShield", base: 170 }, { id: "resChaos", base: 6 }] },
    { id: "gilded_barbute", slot: "투구", name: "도금 바르부트", reqTier: 8, baseStats: [{ id: "flatHp", base: 30 }, { id: "armor", base: 58 }, { id: "energyShield", base: 58 }] },
    { id: "warded_sallet", slot: "투구", name: "수호 살렛", reqTier: 8, baseStats: [{ id: "flatHp", base: 52 }, { id: "armor", base: 94 }, { id: "energyShield", base: 92 }] },
    { id: "leather_vest", slot: "갑옷", name: "가죽 갑옷", reqTier: 1, baseStats: [{ id: "flatHp", base: 20 }, { id: "evasion", base: 74 }] },
    { id: "plate_mail", slot: "갑옷", name: "판금 갑옷", reqTier: 4, baseStats: [{ id: "flatHp", base: 42 }, { id: "armor", base: 220 }, { id: "dr", base: 3 }] },
    { id: "fortress_plate", slot: "갑옷", name: "요새 판갑", reqTier: 8, baseStats: [{ id: "flatHp", base: 60 }, { id: "armor", base: 285 }, { id: "dr", base: 4 }] },
    { id: "astral_plate", slot: "갑옷", name: "별빛 흉갑", reqTier: 8, baseStats: [{ id: "flatHp", base: 70 }, { id: "armor", base: 120 }, { id: "evasion", base: 120 }, { id: "resAll", base: 6 }] },
    { id: "templar_mail", slot: "갑옷", name: "성전사 판금", reqTier: 8, baseStats: [{ id: "flatHp", base: 46 }, { id: "armor", base: 120 }, { id: "energyShield", base: 96 }] },
    { id: "consecrated_cuirass", slot: "갑옷", name: "축성 흉갑", reqTier: 8, baseStats: [{ id: "flatHp", base: 66 }, { id: "armor", base: 158 }, { id: "energyShield", base: 138 }] },
    { id: "hide_gloves", slot: "장갑", name: "가죽 장갑", reqTier: 1, baseStats: [{ id: "aspd", base: 2 }, { id: "evasion", base: 18 }] },
    { id: "grip_gauntlets", slot: "장갑", name: "강철 건틀릿", reqTier: 4, baseStats: [{ id: "aspd", base: 4 }, { id: "flatHp", base: 16 }, { id: "armor", base: 55 }] },
    { id: "storm_touch", slot: "장갑", name: "폭풍 장갑", reqTier: 8, baseStats: [{ id: "aspd", base: 7 }, { id: "crit", base: 5 }, { id: "evasion", base: 53 }, { id: "energyShield", base: 53 }] },
    { id: "ward_gauntlets", slot: "장갑", name: "보호 건틀릿", reqTier: 8, baseStats: [{ id: "aspd", base: 4 }, { id: "armor", base: 30 }, { id: "energyShield", base: 28 }] },
    { id: "bastion_grips", slot: "장갑", name: "보루 장갑", reqTier: 8, baseStats: [{ id: "aspd", base: 6 }, { id: "armor", base: 52 }, { id: "energyShield", base: 50 }] },
    { id: "rag_boots", slot: "신발", name: "헝겊 장화", reqTier: 1, baseStats: [{ id: "move", base: 5 }, { id: "energyShield", base: 27 }] },
    { id: "ranger_boots", slot: "신발", name: "추적자 장화", reqTier: 4, baseStats: [{ id: "move", base: 10 }, { id: "flatHp", base: 14 }, { id: "evasion", base: 65 }] },
    { id: "deadeye_boots", slot: "신발", name: "명사수 장화", reqTier: 8, baseStats: [{ id: "move", base: 14 }, { id: "evasion", base: 105 }, { id: "crit", base: 4 }] },
    { id: "phase_boots", slot: "신발", name: "위상 장화", reqTier: 8, baseStats: [{ id: "move", base: 16 }, { id: "energyShield", base: 120 }, { id: "resC", base: 8 }] },
    { id: "ranger_guard_helm", slot: "투구", name: "유격 수호 투구", reqTier: 8, baseStats: [{ id: "flatHp", base: 28 }, { id: "armor", base: 42 }, { id: "evasion", base: 42 }] },
    { id: "mistwatch_hood", slot: "투구", name: "안개감시 두건", reqTier: 8, baseStats: [{ id: "flatHp", base: 44 }, { id: "armor", base: 68 }, { id: "evasion", base: 70 }] },
    { id: "phantom_guard_helm", slot: "투구", name: "환영 수호투구", reqTier: 12, baseStats: [{ id: "flatHp", base: 62 }, { id: "armor", base: 96 }, { id: "evasion", base: 98 }, { id: "resC", base: 8 }] },
    { id: "nightward_crown", slot: "투구", name: "밤수호 관", reqTier: 16, baseStats: [{ id: "flatHp", base: 78 }, { id: "armor", base: 124 }, { id: "evasion", base: 128 }, { id: "resAll", base: 5 }] },
    { id: "phase_sentinel_helm", slot: "투구", name: "위상 감시 투구", reqTier: 8, baseStats: [{ id: "flatHp", base: 24 }, { id: "evasion", base: 38 }, { id: "energyShield", base: 38 }] },
    { id: "mistweave_circlet", slot: "투구", name: "안개서린 서클릿", reqTier: 8, baseStats: [{ id: "flatHp", base: 40 }, { id: "evasion", base: 64 }, { id: "energyShield", base: 66 }] },
    { id: "moonphase_visor", slot: "투구", name: "월상 바이저", reqTier: 12, baseStats: [{ id: "flatHp", base: 56 }, { id: "evasion", base: 90 }, { id: "energyShield", base: 94 }, { id: "resL", base: 8 }] },
    { id: "starlit_mask", slot: "투구", name: "성광 가면", reqTier: 16, baseStats: [{ id: "flatHp", base: 74 }, { id: "evasion", base: 118 }, { id: "energyShield", base: 122 }, { id: "resAll", base: 5 }] },
    { id: "warded_greaves", slot: "신발", name: "수호 경갑", reqTier: 8, baseStats: [{ id: "move", base: 10 }, { id: "armor", base: 46 }, { id: "energyShield", base: 42 }] },
    { id: "bastion_striders", slot: "신발", name: "보루 보행화", reqTier: 8, baseStats: [{ id: "move", base: 14 }, { id: "armor", base: 72 }, { id: "energyShield", base: 66 }] },
    { id: "obsidian_helm", slot: "투구", name: "흑요 투구", reqTier: 12, baseStats: [{ id: "flatHp", base: 62 }, { id: "armor", base: 230 }, { id: "resF", base: 10 }] },
    { id: "guardian_helm", slot: "투구", name: "수호 투구", reqTier: 12, baseStats: [{ id: "flatHp", base: 58 }, { id: "armor", base: 230 }, { id: "dr", base: 4 }] },
    { id: "moonveil_hood", slot: "투구", name: "월광 두건", reqTier: 12, baseStats: [{ id: "flatHp", base: 54 }, { id: "evasion", base: 180 }, { id: "resC", base: 10 }] },
    { id: "oracle_circlet", slot: "투구", name: "예언자 서클릿", reqTier: 12, baseStats: [{ id: "flatHp", base: 48 }, { id: "energyShield", base: 240 }, { id: "resL", base: 10 }] },
    { id: "saint_circlet", slot: "투구", name: "성자 서클릿", reqTier: 12, baseStats: [{ id: "flatHp", base: 70 }, { id: "armor", base: 126 }, { id: "energyShield", base: 132 }, { id: "resL", base: 8 }] },
    { id: "dread_plate", slot: "갑옷", name: "공포 판갑", reqTier: 16, baseStats: [{ id: "flatHp", base: 92 }, { id: "armor", base: 430 }, { id: "dr", base: 4 }] },
    { id: "windrunner_coat", slot: "갑옷", name: "질풍 외투", reqTier: 16, baseStats: [{ id: "flatHp", base: 84 }, { id: "evasion", base: 365 }, { id: "move", base: 12 }] },
    { id: "astral_robe", slot: "갑옷", name: "성운 로브", reqTier: 16, baseStats: [{ id: "flatHp", base: 76 }, { id: "energyShield", base: 420 }, { id: "resChaos", base: 10 }] },
    { id: "cathedral_plate", slot: "갑옷", name: "대성당 판갑", reqTier: 12, baseStats: [{ id: "flatHp", base: 84 }, { id: "armor", base: 196 }, { id: "energyShield", base: 186 }, { id: "resC", base: 10 }] },
    { id: "seraphim_aegis", slot: "갑옷", name: "세라핌 수호갑", reqTier: 16, baseStats: [{ id: "flatHp", base: 102 }, { id: "armor", base: 238 }, { id: "energyShield", base: 232 }, { id: "resAll", base: 8 }] },
    { id: "warhands", slot: "장갑", name: "전쟁장갑", reqTier: 12, baseStats: [{ id: "aspd", base: 6 }, { id: "armor", base: 145 }, { id: "flatHp", base: 24 }] },
    { id: "shadewrap_grips", slot: "장갑", name: "그림자 장갑", reqTier: 12, baseStats: [{ id: "aspd", base: 6 }, { id: "evasion", base: 105 }, { id: "crit", base: 6 }] },
    { id: "arcane_mitts", slot: "장갑", name: "비전 장갑", reqTier: 12, baseStats: [{ id: "aspd", base: 5 }, { id: "energyShield", base: 135 }, { id: "resL", base: 8 }] },
    { id: "saint_mitts", slot: "장갑", name: "성자 장갑", reqTier: 12, baseStats: [{ id: "aspd", base: 7 }, { id: "armor", base: 78 }, { id: "energyShield", base: 74 }, { id: "resL", base: 6 }] },
    { id: "iron_tread", slot: "신발", name: "강철 발걸음", reqTier: 16, baseStats: [{ id: "move", base: 18 }, { id: "armor", base: 230 }, { id: "flatHp", base: 36 }] },
    { id: "hawkstride_boots", slot: "신발", name: "매걸음 장화", reqTier: 12, baseStats: [{ id: "move", base: 16 }, { id: "evasion", base: 145 }, { id: "crit", base: 5 }] },
    { id: "ghost_stride", slot: "신발", name: "유령 걸음", reqTier: 16, baseStats: [{ id: "move", base: 18 }, { id: "evasion", base: 185 }, { id: "crit", base: 6 }] },
    { id: "ether_steps", slot: "신발", name: "에테르 스텝", reqTier: 16, baseStats: [{ id: "move", base: 18 }, { id: "energyShield", base: 220 }, { id: "resAll", base: 8 }] },
    { id: "skirmish_mail", slot: "갑옷", name: "척후 갑피", reqTier: 8, baseStats: [{ id: "flatHp", base: 44 }, { id: "armor", base: 88 }, { id: "evasion", base: 90 }] },
    { id: "windplate_coat", slot: "갑옷", name: "풍갑 외투", reqTier: 8, baseStats: [{ id: "flatHp", base: 62 }, { id: "armor", base: 122 }, { id: "evasion", base: 124 }] },
    { id: "sentinel_scale", slot: "갑옷", name: "감시자 비늘갑", reqTier: 12, baseStats: [{ id: "flatHp", base: 80 }, { id: "armor", base: 156 }, { id: "evasion", base: 162 }, { id: "resF", base: 10 }] },
    { id: "nightwatch_harness", slot: "갑옷", name: "야경 흉갑", reqTier: 16, baseStats: [{ id: "flatHp", base: 98 }, { id: "armor", base: 194 }, { id: "evasion", base: 202 }, { id: "resAll", base: 7 }] },
    { id: "veilwoven_vest", slot: "갑옷", name: "장막 직조 조끼", reqTier: 8, baseStats: [{ id: "flatHp", base: 38 }, { id: "evasion", base: 84 }, { id: "energyShield", base: 70 }] },
    { id: "mirage_link_robe", slot: "갑옷", name: "신기루 결속 로브", reqTier: 8, baseStats: [{ id: "flatHp", base: 56 }, { id: "evasion", base: 116 }, { id: "energyShield", base: 104 }] },
    { id: "moonlace_raiment", slot: "갑옷", name: "월영 예복", reqTier: 12, baseStats: [{ id: "flatHp", base: 72 }, { id: "evasion", base: 148 }, { id: "energyShield", base: 142 }, { id: "resC", base: 10 }] },
    { id: "starseam_dress", slot: "갑옷", name: "성봉 의장", reqTier: 16, baseStats: [{ id: "flatHp", base: 90 }, { id: "evasion", base: 182 }, { id: "energyShield", base: 178 }, { id: "resAll", base: 7 }] },
    { id: "ranger_bulwark_gloves", slot: "장갑", name: "유격 방벽 장갑", reqTier: 8, baseStats: [{ id: "aspd", base: 4 }, { id: "armor", base: 22 }, { id: "evasion", base: 24 }] },
    { id: "windguard_grips", slot: "장갑", name: "풍수 장갑", reqTier: 8, baseStats: [{ id: "aspd", base: 6 }, { id: "armor", base: 38 }, { id: "evasion", base: 40 }] },
    { id: "sentinel_claws", slot: "장갑", name: "감시자 갈퀴장갑", reqTier: 12, baseStats: [{ id: "aspd", base: 7 }, { id: "armor", base: 56 }, { id: "evasion", base: 58 }, { id: "crit", base: 5 }] },
    { id: "nightwatch_grasps", slot: "장갑", name: "야경 장악장갑", reqTier: 16, baseStats: [{ id: "aspd", base: 8 }, { id: "armor", base: 74 }, { id: "evasion", base: 78 }, { id: "crit", base: 6 }] },
    { id: "phasebound_gloves", slot: "장갑", name: "위상 결속 장갑", reqTier: 8, baseStats: [{ id: "aspd", base: 4 }, { id: "evasion", base: 24 }, { id: "energyShield", base: 20 }] },
    { id: "mist_bind_mitts", slot: "장갑", name: "안개결속 장갑", reqTier: 8, baseStats: [{ id: "aspd", base: 6 }, { id: "evasion", base: 40 }, { id: "energyShield", base: 36 }] },
    { id: "moonphase_mitts", slot: "장갑", name: "월상 장갑", reqTier: 12, baseStats: [{ id: "aspd", base: 7 }, { id: "evasion", base: 58 }, { id: "energyShield", base: 54 }, { id: "resL", base: 6 }] },
    { id: "starlight_grips", slot: "장갑", name: "성광 장갑", reqTier: 16, baseStats: [{ id: "aspd", base: 8 }, { id: "evasion", base: 76 }, { id: "energyShield", base: 72 }, { id: "resAll", base: 4 }] },
    { id: "skirmish_greaves", slot: "신발", name: "척후 각반", reqTier: 8, baseStats: [{ id: "move", base: 10 }, { id: "armor", base: 34 }, { id: "evasion", base: 36 }] },
    { id: "windguard_boots", slot: "신발", name: "풍수 장화", reqTier: 8, baseStats: [{ id: "move", base: 14 }, { id: "armor", base: 54 }, { id: "evasion", base: 56 }] },
    { id: "sentinel_stride", slot: "신발", name: "감시자 장화", reqTier: 12, baseStats: [{ id: "move", base: 17 }, { id: "armor", base: 74 }, { id: "evasion", base: 78 }, { id: "resF", base: 8 }] },
    { id: "nightwatch_steps", slot: "신발", name: "야경 보행화", reqTier: 16, baseStats: [{ id: "move", base: 19 }, { id: "armor", base: 96 }, { id: "evasion", base: 102 }, { id: "resAll", base: 5 }] },
    { id: "phase_treader", slot: "신발", name: "위상 추적화", reqTier: 8, baseStats: [{ id: "move", base: 10 }, { id: "evasion", base: 34 }, { id: "energyShield", base: 30 }] },
    { id: "mistwalk_boots", slot: "신발", name: "안개걸음 장화", reqTier: 8, baseStats: [{ id: "move", base: 14 }, { id: "evasion", base: 56 }, { id: "energyShield", base: 52 }] },
    { id: "moonstride_boots", slot: "신발", name: "월영 보행화", reqTier: 12, baseStats: [{ id: "move", base: 17 }, { id: "evasion", base: 78 }, { id: "energyShield", base: 74 }, { id: "resC", base: 8 }] },
    { id: "starseeker_steps", slot: "신발", name: "성추적 보행화", reqTier: 16, baseStats: [{ id: "move", base: 19 }, { id: "evasion", base: 102 }, { id: "energyShield", base: 98 }, { id: "resAll", base: 5 }] },
    { id: "saint_steps", slot: "신발", name: "성자 보행화", reqTier: 12, baseStats: [{ id: "move", base: 17 }, { id: "armor", base: 98 }, { id: "energyShield", base: 94 }, { id: "resF", base: 8 }] },
    { id: "archon_barbute", slot: "투구", name: "아콘 바르부트", reqTier: 16, baseStats: [{ id: "flatHp", base: 86 }, { id: "armor", base: 162 }, { id: "energyShield", base: 172 }, { id: "resAll", base: 6 }] },
    { id: "archon_fists", slot: "장갑", name: "아콘 장갑", reqTier: 16, baseStats: [{ id: "aspd", base: 8 }, { id: "armor", base: 104 }, { id: "energyShield", base: 102 }, { id: "resAll", base: 4 }] },
    { id: "archon_strides", slot: "신발", name: "아콘 스텝", reqTier: 16, baseStats: [{ id: "move", base: 19 }, { id: "armor", base: 126 }, { id: "energyShield", base: 122 }, { id: "resAll", base: 5 }] },
    { id: "bone_amulet", slot: "목걸이", name: "뼈 목걸이", reqTier: 1, baseStats: [{ id: "flatDmg", base: 1 }, { id: "flatHp", base: 8 }] },
    { id: "sage_amulet", slot: "목걸이", name: "현자의 목걸이", reqTier: 5, baseStats: [{ id: "crit", base: 4 }, { id: "resAll", base: 4 }] },
    { id: "star_pendant", slot: "목걸이", name: "성좌 펜던트", reqTier: 9, baseStats: [{ id: "gemLevel", base: 1 }, { id: "pctDmg", base: 8 }] },
    { id: "valor_amulet", slot: "목걸이", name: "용맹의 목걸이", reqTier: 8, baseStats: [{ id: "flatDmg", base: 2 }, { id: "flatHp", base: 24 }, { id: "crit", base: 5 }] },
    { id: "sageking_charm", slot: "목걸이", name: "현왕의 부적", reqTier: 11, baseStats: [{ id: "crit", base: 5 }, { id: "resAll", base: 6 }, { id: "pctDmg", base: 8 }] },
    { id: "constellation_core", slot: "목걸이", name: "성좌핵 목걸이", reqTier: 14, baseStats: [{ id: "gemLevel", base: 1 }, { id: "pctDmg", base: 12 }, { id: "resAll", base: 6 }] },
    { id: "copper_ring", slot: "반지", name: "구리 반지", reqTier: 1, baseStats: [{ id: "flatDmg", base: 1 }] },
    { id: "summoner_loop", slot: "반지", name: "소환사의 고리", reqTier: 4, baseStats: [{ id: "summonPctDmg", base: 10 }, { id: "summonEfficiency", base: 5 }] },
    { id: "opal_ring", slot: "반지", name: "오팔 반지", reqTier: 5, baseStats: [{ id: "pctDmg", base: 6 }] },
    { id: "sapphire_band", slot: "반지", name: "푸른 띠 반지", reqTier: 9, baseStats: [{ id: "resAll", base: 6 }, { id: "crit", base: 3 }] },
    { id: "void_loop_ring", slot: "반지", name: "공허 고리", reqTier: 12, baseStats: [{ id: "resChaos", base: 4 }, { id: "chaosPctDmg", base: 7 }] },
    { id: "eclipse_ring", slot: "반지", name: "식월 반지", reqTier: 15, baseStats: [{ id: "resAll", base: 8 }, { id: "resChaos", base: 5 }, { id: "crit", base: 5 }] },
    { id: "mirror_ring", slot: "반지", name: "거울 반지", reqTier: 20, dropOnly: { id: "mirror_ring_unique" }, baseStats: [] },
    { id: "engraved_ring", slot: "반지", name: "각인 반지", reqTier: 7, baseStats: [{ id: "flatDmg", base: 3 }, { id: "pctDmg", base: 9 }] },
    { id: "judgment_signet", slot: "반지", name: "심판 인장 반지", reqTier: 13, baseStats: [{ id: "flatDmg", base: 5 }, { id: "pctDmg", base: 13 }, { id: "critDmg", base: 12 }] },
    { id: "beastlord_ring", slot: "반지", name: "야수왕 반지", reqTier: 15, baseStats: [{ id: "summonEfficiency", base: 16 }, { id: "summonCrit", base: 6 }, { id: "summonCap", base: 1 }] },
    { id: "rope_belt", slot: "허리띠", name: "로프 허리띠", reqTier: 1, baseStats: [{ id: "flatHp", base: 16 }] },
    { id: "war_belt", slot: "허리띠", name: "전사의 허리띠", reqTier: 5, baseStats: [{ id: "flatHp", base: 32 }, { id: "dr", base: 2 }] },
    { id: "stygian_vise", slot: "허리띠", name: "심연의 혁대", reqTier: 9, baseStats: [{ id: "flatHp", base: 55 }, { id: "resChaos", base: 8 }] },
    { id: "blood_girdle", slot: "허리띠", name: "혈석 허리띠", reqTier: 12, baseStats: [{ id: "flatHp", base: 72 }, { id: "dr", base: 3 }, { id: "resChaos", base: 10 }] },
    { id: "warlord_girdle", slot: "허리띠", name: "장군의 허리띠", reqTier: 15, baseStats: [{ id: "flatHp", base: 88 }, { id: "dr", base: 4 }, { id: "resChaos", base: 12 }] },
    { id: "nightmare_bind", slot: "허리띠", name: "악몽 결속대", reqTier: 15, baseStats: [{ id: "flatHp", base: 92 }, { id: "resAll", base: 7 }, { id: "resChaos", base: 12 }] },
    // 장신구 베이스 14개(2026-10-07 드랍 풀 1단계). 따로 그린 그림 없이 부위 그림을 쓴다(js/items.js pickEquipmentGridVisualAsset).
    { id: "amber_amulet", slot: "목걸이", name: "호박 목걸이", reqTier: 3, baseStats: [{ id: "strength", base: 12 }] },
    { id: "jade_amulet", slot: "목걸이", name: "비취 목걸이", reqTier: 3, baseStats: [{ id: "dexterity", base: 12 }] },
    { id: "lapis_amulet", slot: "목걸이", name: "청금 목걸이", reqTier: 3, baseStats: [{ id: "intelligence", base: 12 }] },
    { id: "tree_ring_amulet", slot: "목걸이", name: "나이테 목걸이", reqTier: 12, baseStats: [{ id: "strength", base: 16 }, { id: "dexterity", base: 16 }, { id: "intelligence", base: 16 }] },
    { id: "resin_amulet", slot: "목걸이", name: "송진 목걸이", reqTier: 16, baseStats: [{ id: "resChaos", base: 13 }, { id: "flatHp", base: 45 }] },
    { id: "world_tree_leaf_amulet", slot: "목걸이", name: "세계수 잎 목걸이", reqTier: 20, baseStats: [{ id: "resAll", base: 10 }, { id: "pctDmg", base: 18 }] },
    { id: "leather_knot_belt", slot: "허리띠", name: "가죽 매듭띠", reqTier: 7, baseStats: [{ id: "flatHp", base: 44 }, { id: "pctHp", base: 4 }] },
    { id: "root_knot_sash", slot: "허리띠", name: "뿌리 매듭띠", reqTier: 8, baseStats: [{ id: "flatHp", base: 40 }, { id: "physPctDmg", base: 10 }] },
    { id: "vine_chain_belt", slot: "허리띠", name: "덩굴 사슬띠", reqTier: 13, baseStats: [{ id: "flatHp", base: 66 }, { id: "energyShield", base: 40 }] },
    { id: "knot_ornament_belt", slot: "허리띠", name: "옹이 장식띠", reqTier: 18, baseStats: [{ id: "flatHp", base: 100 }, { id: "pctHp", base: 6 }, { id: "physPctDmg", base: 14 }] },
    { id: "ruby_ring", slot: "반지", name: "홍옥 반지", reqTier: 3, baseStats: [{ id: "resF", base: 8 }] },
    { id: "topaz_ring", slot: "반지", name: "황옥 반지", reqTier: 8, baseStats: [{ id: "resL", base: 12 }] },
    { id: "twin_stone_ring", slot: "반지", name: "쌍석 반지", reqTier: 14, baseStats: [{ id: "resF", base: 12 }, { id: "resL", base: 12 }] },
    { id: "diamond_ring", slot: "반지", name: "금강석 반지", reqTier: 18, baseStats: [{ id: "crit", base: 7 }, { id: "critDmg", base: 18 }] },
    { id: "root_blade_fang", slot: "무기", name: "뿌리 한손검", reqTier: 6, dropOnly: { type: "act" }, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: "flatDmg", base: 27, legacyDamageBase: 20 }, { id: "physIgnore", base: 4 }, { id: "leech", base: 0.8 }] },
    { id: "beehive_stinger_mail", slot: "갑옷", name: "벌침 갑피", reqTier: 12, dropOnly: { type: "beehive" }, baseStats: [{ id: "flatHp", base: 88 }, { id: "resChaos", base: 10 }, { id: "evasion", base: 295 }, { id: "poisonDamageMultiplierPct", base: 10 }] },
    // 재사용 대기시간 세팅(2026-10-21): 대균열 파편투구와 시련 감시자 장화의 저항 관통 줄을 재사용 대기시간 줄로 바꿨다. 장비는 베이스 줄을
    // 떨어질 때 제 몸에 적으므로(js/item-rolls.js rollBaseStat) 이미 가진 장비는 그대로다.
    { id: "grand_breach_shard_helm", slot: "투구", name: "대균열 파편투구", reqTier: 16, dropOnly: { id: "grand_breach_run" }, baseStats: [{ id: "flatHp", base: 95 }, { id: "resAll", base: 9 }, { id: "dr", base: 4 }, { id: "energyShield", base: 96 }, { id: "cooldownRecovery", base: 8 }] },
    { id: "laby_1_greaves", slot: "신발", name: "미궁 수호 각반", reqTier: 8, dropOnly: { type: "labyrinth", minFloor: 1, minTier: 7 }, baseStats: [{ id: "move", base: 14 }, { id: "armor", base: 130 }, { id: "dr", base: 2 }] },
    { id: "laby_10_crown", slot: "투구", name: "미궁 심층 관", reqTier: 12, dropOnly: { type: "labyrinth", minFloor: 10, minTier: 10 }, baseStats: [{ id: "flatHp", base: 76 }, { id: "resAll", base: 8 }, { id: "armor", base: 230 }, { id: "regen", base: 0.8 }] },
    { id: "laby_20_robe", slot: "갑옷", name: "미궁 절정 로브", reqTier: 16, dropOnly: { type: "labyrinth", minFloor: 20, minTier: 13 }, baseStats: [{ id: "energyShield", base: 180 }, { id: "resChaos", base: 10 }, { id: "spellFlatPct", base: 10 }] },
    { id: "laby_30_ring", slot: "반지", name: "미궁 군주의 반지", reqTier: 20, dropOnly: { type: "labyrinth", minFloor: 30, minTier: 15 }, baseStats: [{ id: "resAll", base: 10 }, { id: "crit", base: 8 }, { id: "resPen", base: 6 }] },
    { id: "trial_emblem_gloves", slot: "장갑", name: "시련 문양 건틀릿", reqTier: 15, dropOnly: { type: "trial" }, baseStats: [{ id: "aspd", base: 9 }, { id: "dr", base: 3 }, { id: "armor", base: 190 }, { id: "critDmg", base: 20 }] },
    { id: "beehive_queen_veil", slot: "투구", name: "여왕벌 면사포", reqTier: 14, dropOnly: { type: "beehive" }, baseStats: [{ id: "flatHp", base: 82 }, { id: "evasion", base: 138 }, { id: "resChaos", base: 12 }, { id: "poisonDamageMultiplierPct", base: 12 }] },
    { id: "trial_warden_boots", slot: "신발", name: "시련 감시자 장화", reqTier: 17, dropOnly: { type: "trial" }, baseStats: [{ id: "move", base: 20 }, { id: "armor", base: 128 }, { id: "dr", base: 4 }, { id: "mobilityCooldownRecovery", base: 10 }] },
    { id: "riftglass_robe", slot: "갑옷", name: "균열유리 로브", reqTier: 18, dropOnly: { id: "grand_breach_run" }, baseStats: [{ id: "energyShield", base: 256 }, { id: "resChaos", base: 14 }, { id: "spellFlatPct", base: 14 }, { id: "flatHp", base: -40 }] },
    { id: "meteor_trace_greaves", slot: "신발", name: "운석 자취 경갑", reqTier: 19, dropOnly: { type: "meteor" }, baseStats: [{ id: "move", base: 22 }, { id: "evasion", base: 150 }, { id: "crit", base: 8 }, { id: "resL", base: 14 }] },
    { id: "runic_bastion_helm", slot: "투구", name: "룬 철벽투구", reqTier: 8, baseStats: [{ id: "flatHp", base: 46 }, { id: "armor", base: 92 }] },
    { id: "thornweave_coat", slot: "갑옷", name: "가시결 외투", reqTier: 8, baseStats: [{ id: "flatHp", base: 58 }, { id: "evasion", base: 116 }] },
    { id: "stormbind_mitts", slot: "장갑", name: "뇌격 결속 장갑", reqTier: 12, baseStats: [{ id: "aspd", base: 7 }, { id: "resL", base: 9 }, { id: "energyShield", base: 112 }] },
    { id: "sunstride_boots", slot: "신발", name: "태양 질주화", reqTier: 12, baseStats: [{ id: "move", base: 15 }, { id: "resF", base: 9 }, { id: "evasion", base: 120 }] },
    { id: "moonbound_ring", slot: "반지", name: "월인 반지", reqTier: 10, baseStats: [{ id: "resC", base: 9 }, { id: "crit", base: 4 }] },
    { id: "nightveil_hood", slot: "투구", name: "야행 두건", reqTier: 8, baseStats: [{ id: "flatHp", base: 42 }, { id: "evasion", base: 132 }] },
    { id: "spirit_weave_robe", slot: "갑옷", name: "정수 직조 로브", reqTier: 12, baseStats: [{ id: "flatHp", base: 64 }, { id: "energyShield", base: 300 }] },
    { id: "ironclad_treads", slot: "신발", name: "강철 보행화", reqTier: 12, baseStats: [{ id: "move", base: 15 }, { id: "armor", base: 150 }, { id: "flatHp", base: 26 }] },
    { id: "warding_sash", slot: "허리띠", name: "수호의 띠", reqTier: 11, baseStats: [{ id: "flatHp", base: 62 }, { id: "resAll", base: 6 }] },
    { id: "familiar_loop", slot: "반지", name: "사역마 고리", reqTier: 6, baseStats: [{ id: "summonPctDmg", base: 12 }, { id: "summonHpPct", base: 10 }] },
    { id: "beastcall_band", slot: "반지", name: "야수 부름 반지", reqTier: 11, baseStats: [{ id: "summonEfficiency", base: 12 }, { id: "summonCrit", base: 4 }] },
    { id: "overlord_ring", slot: "반지", name: "군주 반지", reqTier: 15, baseStats: [{ id: "summonPctDmg", base: 18 }, { id: "summonCap", base: 1 }] },
    { id: "graveknot_belt", slot: "허리띠", name: "묘결 속박대", reqTier: 10, baseStats: [{ id: "flatHp", base: 60 }, { id: "resChaos", base: 9 }] },
    { id: "echo_lance", slot: "무기", name: "메아리 대검", reqTier: 11, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: "flatDmg", base: 46, legacyDamageBase: 28 }, { id: "aspd", base: 7 }, { id: "baseBlockChance", base: 5, baseMin: 5, baseMax: 5 }] },
    { id: "spirit_call_wand", slot: "무기", name: "정령 소환 오브", reqTier: 6, requirementWeights: { intelligence: 1 }, baseStats: [{ id: "flatDmg", base: 16, legacyDamageBase: 12 }, { id: "summonPctDmg", base: 18 }, { id: "summonEfficiency", base: 8 }] },
    { id: "gravebind_scepter", slot: "무기", name: "묘지 결속 오브", reqTier: 10, requirementWeights: { intelligence: 1 }, baseStats: [{ id: "flatDmg", base: 25, legacyDamageBase: 16 }, { id: "summonPctDmg", base: 26 }, { id: "summonHpPct", base: 18 }] },
    { id: "astral_familiar_staff", slot: "무기", name: "성운 사역마 오브", reqTier: 15, requirementWeights: { intelligence: 1 }, baseStats: [{ id: "flatDmg", base: 43, legacyDamageBase: 22 }, { id: "summonPctDmg", base: 36 }, { id: "summonCritDmg", base: 24 }] },
    { id: "ember_circlet", slot: "투구", name: "잿불 서클릿", reqTier: 12, baseStats: [{ id: "energyShield", base: 126 }, { id: "resF", base: 10 }] },
    { id: "tidal_vest", slot: "갑옷", name: "조류의 흉갑", reqTier: 12, baseStats: [{ id: "flatHp", base: 66 }, { id: "resC", base: 10 }, { id: "armor", base: 145 }, { id: "evasion", base: 150 }] },
    { id: "gale_treads", slot: "신발", name: "질풍 발굽", reqTier: 12, baseStats: [{ id: "move", base: 16 }, { id: "evasion", base: 94 }] },
    { id: "buckler_scrap", slot: "방패", name: "고철 완갑", reqTier: 1, baseStats: [{ id: "armor", base: 46 }] },
    { id: "iron_buckler", slot: "방패", name: "철제 완갑", reqTier: 4, baseStats: [{ id: "armor", base: 78 }] },
    { id: "woven_guard", slot: "방패", name: "직조 완갑", reqTier: 4, baseStats: [{ id: "evasion", base: 78 }] },
    { id: "aegis_focus", slot: "방패", name: "마력 집중 완갑", reqTier: 4, baseStats: [{ id: "energyShield", base: 82 }, { id: "baseBlockChance", base: 6.5 }] },
    { id: "scale_guard", slot: "방패", name: "비늘 완갑", reqTier: 8, baseStats: [{ id: "armor", base: 70 }, { id: "evasion", base: 68 }] },
    { id: "ward_kite", slot: "방패", name: "수호 완갑", reqTier: 8, baseStats: [{ id: "armor", base: 68 }, { id: "energyShield", base: 66 }] },
    { id: "mist_guard", slot: "방패", name: "안개 완갑", reqTier: 8, baseStats: [{ id: "evasion", base: 66 }, { id: "energyShield", base: 64 }] },
    { id: "tower_wall", slot: "방패", name: "중갑 완갑", reqTier: 8, baseStats: [{ id: "armor", base: 124 }] },
    { id: "mirage_guard", slot: "방패", name: "신기루 완갑", reqTier: 8, baseStats: [{ id: "evasion", base: 122 }] },
    { id: "ether_focus", slot: "방패", name: "에테르 완갑", reqTier: 8, baseStats: [{ id: "energyShield", base: 132 }, { id: "baseBlockChance", base: 6.5 }] },
    { id: "drake_scale_guard", slot: "방패", name: "용비늘 완갑", reqTier: 8, baseStats: [{ id: "armor", base: 102 }, { id: "evasion", base: 100 }] },
    { id: "temple_kite", slot: "방패", name: "사원 완갑", reqTier: 8, baseStats: [{ id: "armor", base: 100 }, { id: "energyShield", base: 98 }] },
    { id: "veil_guard", slot: "방패", name: "장막 완갑", reqTier: 8, baseStats: [{ id: "evasion", base: 98 }, { id: "energyShield", base: 96 }] },
    { id: "citadel_wall", slot: "방패", name: "성채 완갑", reqTier: 12, baseStats: [{ id: "armor", base: 168 }] },
    { id: "phase_bulwark", slot: "방패", name: "위상 완갑", reqTier: 12, baseStats: [{ id: "evasion", base: 165 }] },
    { id: "starlit_focus", slot: "방패", name: "성광 완갑", reqTier: 12, baseStats: [{ id: "energyShield", base: 178 }, { id: "baseBlockChance", base: 6.5 }] },
    { id: "runic_scale_guard", slot: "방패", name: "룬비늘 완갑", reqTier: 12, baseStats: [{ id: "armor", base: 132 }, { id: "evasion", base: 128 }] },
    { id: "relic_kite", slot: "방패", name: "유물 완갑", reqTier: 12, baseStats: [{ id: "armor", base: 130 }, { id: "energyShield", base: 126 }] },
    { id: "moon_barrier", slot: "방패", name: "월영 완갑", reqTier: 12, baseStats: [{ id: "evasion", base: 128 }, { id: "energyShield", base: 124 }] },
    { id: "adamant_wall", slot: "방패", name: "금강 완갑", reqTier: 16, baseStats: [{ id: "armor", base: 225 }] },
    { id: "nightveil_guard", slot: "방패", name: "밤장막 완갑", reqTier: 16, baseStats: [{ id: "evasion", base: 220 }] },
    { id: "archon_focus", slot: "방패", name: "집정관의 완갑", reqTier: 16, baseStats: [{ id: "energyShield", base: 238 }, { id: "baseBlockChance", base: 6.5 }] },
    { id: "bastion_aegis", slot: "방패", name: "보루 완갑", reqTier: 16, baseStats: [{ id: "armor", base: 168 }, { id: "evasion", base: 162 }] },
    { id: "sanctum_aegis", slot: "방패", name: "성소 완갑", reqTier: 16, baseStats: [{ id: "armor", base: 166 }, { id: "energyShield", base: 160 }] },
    { id: "astral_barrier", slot: "방패", name: "성운 완갑", reqTier: 16, baseStats: [{ id: "evasion", base: 162 }, { id: "energyShield", base: 158 }] },
    { id: "parry_round_t1", slot: "방패", name: "결투 완갑", reqTier: 1, shieldStyle: "parry", baseStats: [{ id: "armor", base: 14 }, { id: "baseBlockChance", base: 10 }] },
    { id: "parry_iron_t4", slot: "방패", name: "응수 철제 완갑", reqTier: 4, shieldStyle: "parry", baseStats: [{ id: "armor", base: 30 }, { id: "baseBlockChance", base: 11 }] },
    { id: "parry_rune_t8", slot: "방패", name: "파수 룬 완갑", reqTier: 8, shieldStyle: "parry", baseStats: [{ id: "armor", base: 52 }, { id: "baseBlockChance", base: 12 }] },
    { id: "parry_sentinel_t12", slot: "방패", name: "감시자의 완갑", reqTier: 12, shieldStyle: "parry", baseStats: [{ id: "armor", base: 76 }, { id: "baseBlockChance", base: 13 }] },
    { id: "parry_seraph_t16", slot: "방패", name: "세라프 완갑", reqTier: 16, shieldStyle: "parry", baseStats: [{ id: "armor", base: 102 }, { id: "baseBlockChance", base: 14 }] },
    { id: "parry_astral_t20", slot: "방패", name: "성계 응수 완갑", reqTier: 20, shieldStyle: "parry", baseStats: [{ id: "armor", base: 132 }, { id: "baseBlockChance", base: 15 }, { id: "resAll", base: 3 }] },
    // 수평 베이스(2026-10-09 목표 "다양한 수평 베이스"): 같은 등급의 다른 베이스보다 세지 않고, 방어나 생명을 덜어 그 대신 다른 기본
    // 옵션을 준다. family가 같은 것끼리만 승급하고(js/items.js getBaseUpgradeCandidates), 기존 사슬의 승급 대상이 되지 않는다.
    // 이 자리(각 부위의 첫 베이스 뒤, 마지막 베이스 앞)에 둬서 부위별 첫 베이스와 마지막 베이스를 읽는 검사 고정 데이터가 그대로다.
    // 11~12등급 단계: 장비가 15등급까지 떨어지는 혼돈에서도 수평 베이스를 만난다. 같은 family로 16~17등급, 20등급까지 오른다.
    { id: "outpost_helm", slot: "투구", name: "초소 투구", reqTier: 11, family: "watch", baseStats: [{ id: "flatHp", base: 50 }, { id: "armor", base: 88 }, { id: "evasion", base: 90 }, { id: "sight", base: 1, baseMin: 1, baseMax: 1 }] },
    { id: "scholar_circlet", slot: "투구", name: "학자의 관", reqTier: 11, family: "sage", baseStats: [{ id: "energyShield", base: 190 }, { id: "spellPctDmg", base: 10 }, { id: "intelligence", base: 12 }] },
    { id: "centurion_helm", slot: "투구", name: "백부장 투구", reqTier: 11, family: "warlord", baseStats: [{ id: "flatHp", base: 50 }, { id: "armor", base: 190 }, { id: "critDmg", base: 10 }] },
    { id: "vow_mail", slot: "갑옷", name: "서약 사슬갑옷", reqTier: 12, family: "oath", baseStats: [{ id: "flatHp", base: 66 }, { id: "armor", base: 260 }, { id: "maxResAll", base: 1, baseMin: 1, baseMax: 1 }] },
    { id: "sap_vest", slot: "갑옷", name: "수액 조끼", reqTier: 11, family: "sapweave", baseStats: [{ id: "flatHp", base: 62 }, { id: "evasion", base: 200 }, { id: "pctHp", base: 4 }] },
    { id: "hunting_gauntlets", slot: "장갑", name: "사냥 건틀릿", reqTier: 11, family: "slayer", baseStats: [{ id: "armor", base: 110 }, { id: "crit", base: 3 }, { id: "attackPctDmg", base: 6 }] },
    { id: "swift_wraps", slot: "장갑", name: "날랜 붕대", reqTier: 11, family: "flurry", baseStats: [{ id: "evasion", base: 80 }, { id: "aspd", base: 4 }, { id: "ds", base: 6 }] },
    { id: "leech_grips", slot: "장갑", name: "거머리 손아귀", reqTier: 11, family: "vampire", baseStats: [{ id: "armor", base: 70 }, { id: "energyShield", base: 66 }, { id: "leech", base: 0.25 }] },
    { id: "rune_gloves", slot: "장갑", name: "룬 장갑", reqTier: 11, family: "runebound", baseStats: [{ id: "energyShield", base: 105 }, { id: "fireFlatDmg", base: 12 }, { id: "lightFlatDmg", base: 12 }] },
    { id: "sentry_greaves", slot: "신발", name: "초병 각반", reqTier: 11, family: "warden", baseStats: [{ id: "move", base: 13 }, { id: "armor", base: 120 }, { id: "resF", base: 7 }, { id: "resC", base: 7 }] },
    { id: "shade_treads", slot: "신발", name: "그림자 걸음", reqTier: 11, family: "phantom", baseStats: [{ id: "move", base: 14 }, { id: "evasion", base: 110 }, { id: "deflectChance", base: 3 }] },
    { id: "sprout_boots", slot: "신발", name: "새싹 장화", reqTier: 11, family: "vigor", baseStats: [{ id: "move", base: 13 }, { id: "flatHp", base: 40 }, { id: "regenFlat", base: 30 }] },
    { id: "spellbook_shield", slot: "방패", name: "주문 각인 완갑", reqTier: 11, family: "spellward", baseStats: [{ id: "energyShield", base: 140 }, { id: "spellPctDmg", base: 9 }] },
    { id: "vow_shield", slot: "방패", name: "서약 완갑", reqTier: 12, family: "oathshield", baseStats: [{ id: "armor", base: 150 }, { id: "maxResAll", base: 1, baseMin: 1, baseMax: 1 }] },
    { id: "moss_shield", slot: "방패", name: "이끼 완갑", reqTier: 11, family: "lifewall", baseStats: [{ id: "armor", base: 110 }, { id: "flatHp", base: 40 }, { id: "regenFlat", base: 24 }] },
    { id: "strongman_amulet", slot: "목걸이", name: "장사 목걸이", reqTier: 11, family: "giant", baseStats: [{ id: "strength", base: 15 }, { id: "meleePctDmg", base: 6 }] },
    { id: "breeze_amulet", slot: "목걸이", name: "산들 목걸이", reqTier: 11, family: "gale", baseStats: [{ id: "dexterity", base: 15 }, { id: "projectilePctDmg", base: 6 }] },
    { id: "lore_amulet", slot: "목걸이", name: "학식 목걸이", reqTier: 11, family: "wisdom", baseStats: [{ id: "intelligence", base: 15 }, { id: "spellPctDmg", base: 6 }] },
    { id: "summoning_amulet", slot: "목걸이", name: "부름 목걸이", reqTier: 11, family: "pact", baseStats: [{ id: "summonPctDmg", base: 7 }, { id: "summonAspd", base: 4 }] },
    { id: "hawkeye_amulet", slot: "목걸이", name: "매눈 목걸이", reqTier: 11, family: "eagle", baseStats: [{ id: "crit", base: 2 }, { id: "critDmg", base: 10 }] },
    { id: "fireice_ring", slot: "반지", name: "불얼음 반지", reqTier: 11, family: "flamefrost", baseStats: [{ id: "resF", base: 9 }, { id: "resC", base: 9 }] },
    { id: "snowbolt_ring", slot: "반지", name: "눈번개 반지", reqTier: 11, family: "froststorm", baseStats: [{ id: "resC", base: 9 }, { id: "resL", base: 9 }] },
    { id: "shade_ring", slot: "반지", name: "그늘 반지", reqTier: 11, family: "void", baseStats: [{ id: "resChaos", base: 7 }, { id: "chaosPctDmg", base: 6 }] },
    { id: "bloodstone_ring", slot: "반지", name: "혈석 반지", reqTier: 11, family: "blood", baseStats: [{ id: "leech", base: 0.2 }, { id: "flatHp", base: 18 }] },
    { id: "hide_rampart_belt", slot: "허리띠", name: "가죽 방벽띠", reqTier: 11, family: "rampart", baseStats: [{ id: "flatHp", base: 48 }, { id: "armor", base: 130 }, { id: "resAll", base: 4 }] },
    { id: "guard_sash", slot: "허리띠", name: "보호 띠", reqTier: 11, family: "warded", baseStats: [{ id: "flatHp", base: 36 }, { id: "energyShield", base: 110 }, { id: "resAll", base: 4 }] },
    { id: "strongman_belt", slot: "허리띠", name: "역사의 허리띠", reqTier: 12, family: "champion", baseStats: [{ id: "flatHp", base: 60 }, { id: "strength", base: 12 }, { id: "meleePctDmg", base: 8 }] },
    { id: "herbalist_sash", slot: "허리띠", name: "약초꾼 띠", reqTier: 12, family: "alchemist", baseStats: [{ id: "flatHp", base: 55 }, { id: "potionPctDmg", base: 9 }, { id: "dotPctDmg", base: 5 }] },
    { id: "tracker_baldric", slot: "허리띠", name: "추적자의 띠", reqTier: 12, family: "hunter", baseStats: [{ id: "flatHp", base: 55 }, { id: "dexterity", base: 12 }, { id: "projectilePctDmg", base: 8 }] },
    { id: "scholar_sash", slot: "허리띠", name: "학자의 띠", reqTier: 12, family: "scholar", baseStats: [{ id: "flatHp", base: 55 }, { id: "intelligence", base: 12 }, { id: "spellPctDmg", base: 8 }] },
    { id: "bigtree_maul", slot: "무기", name: "거목 대검", reqTier: 12, family: "maul", requirementWeights: { strength: 1 }, baseStats: [{ id: "flatDmg", base: 52 }, { id: "physPctDmg", base: 9 }, { id: "baseBlockChance", base: 5, baseMin: 5, baseMax: 5 }] },
    { id: "fang_kris", slot: "무기", name: "뱀이빨 한손검", reqTier: 12, family: "kris", requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: "flatDmg", base: 46 }, { id: "chaosPctDmg", base: 10 }, { id: "aspd", base: 4 }] },
    { id: "hunting_longbow", slot: "무기", name: "숲사냥꾼 단궁", reqTier: 12, family: "longbow", requirementWeights: { dexterity: 1 }, baseStats: [{ id: "flatDmg", base: 44 }, { id: "projectilePctDmg", base: 12 }, { id: "crit", base: 4 }] },
    { id: "spark_rod", slot: "무기", name: "번개 오브", reqTier: 12, family: "stormrod", requirementWeights: { intelligence: 1 }, baseStats: [{ id: "flatDmg", base: 26 }, { id: "spellFlatDmg", base: 72 }, { id: "lightPctDmg", base: 12 }] },
    { id: "herb_toxin_flask", slot: "무기", name: "독초 플라스크", reqTier: 12, family: "toxin", requirementWeights: { dexterity: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 44 }, { id: "potionPctDmg", base: 16 }, { id: "dotPctDmg", base: 9 }] },
    { id: "coal_censer", slot: "무기", name: "숯불 향로", reqTier: 12, family: "pyre", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 46 }, { id: "firePctDmg", base: 13 }, { id: "regen", base: 0.3 }] },
    { id: "watchtower_helm", slot: "투구", name: "망루 투구", reqTier: 16, family: "watch", baseStats: [{ id: "flatHp", base: 66 }, { id: "armor", base: 150 }, { id: "evasion", base: 154 }, { id: "sight", base: 1, baseMin: 1, baseMax: 1 }] },
    { id: "skywatch_helm", slot: "투구", name: "천망루 투구", reqTier: 20, family: "watch", baseStats: [{ id: "flatHp", base: 84 }, { id: "armor", base: 190 }, { id: "evasion", base: 196 }, { id: "sight", base: 2, baseMin: 2, baseMax: 2 }] },
    { id: "sage_circlet", slot: "투구", name: "현자의 관", reqTier: 16, family: "sage", baseStats: [{ id: "energyShield", base: 250 }, { id: "spellPctDmg", base: 16 }, { id: "intelligence", base: 20 }] },
    { id: "archsage_circlet", slot: "투구", name: "대현자의 관", reqTier: 20, family: "sage", baseStats: [{ id: "energyShield", base: 312 }, { id: "spellPctDmg", base: 22 }, { id: "intelligence", base: 28 }] },
    { id: "warlord_helm", slot: "투구", name: "전쟁군주 투구", reqTier: 16, family: "warlord", baseStats: [{ id: "flatHp", base: 62 }, { id: "armor", base: 245 }, { id: "critDmg", base: 16 }] },
    { id: "conqueror_helm", slot: "투구", name: "정복자 투구", reqTier: 20, family: "warlord", baseStats: [{ id: "flatHp", base: 78 }, { id: "armor", base: 306 }, { id: "critDmg", base: 22 }] },
    { id: "oath_plate", slot: "갑옷", name: "맹세 판금", reqTier: 16, family: "oath", baseStats: [{ id: "flatHp", base: 80 }, { id: "armor", base: 320 }, { id: "maxResAll", base: 1, baseMin: 1, baseMax: 1 }] },
    { id: "covenant_plate", slot: "갑옷", name: "성약 판금", reqTier: 20, family: "oath", baseStats: [{ id: "flatHp", base: 100 }, { id: "armor", base: 400 }, { id: "maxResAll", base: 2, baseMin: 2, baseMax: 2 }] },
    { id: "sapweave_jerkin", slot: "갑옷", name: "수액 가죽옷", reqTier: 16, family: "sapweave", baseStats: [{ id: "flatHp", base: 82 }, { id: "evasion", base: 270 }, { id: "pctHp", base: 6 }] },
    { id: "heartwood_jerkin", slot: "갑옷", name: "심재 가죽옷", reqTier: 20, family: "sapweave", baseStats: [{ id: "flatHp", base: 104 }, { id: "evasion", base: 340 }, { id: "pctHp", base: 9 }, { id: "regenFlat", base: 80 }] },
    { id: "doom_plate", slot: "갑옷", name: "멸망 판갑", reqTier: 20, family: "doom", baseStats: [{ id: "flatHp", base: 116 }, { id: "armor", base: 540 }, { id: "dr", base: 6 }] },
    { id: "stormrunner_coat", slot: "갑옷", name: "폭풍주자 외투", reqTier: 20, family: "stormrunner", baseStats: [{ id: "flatHp", base: 106 }, { id: "evasion", base: 460 }, { id: "move", base: 16 }] },
    { id: "galaxy_robe", slot: "갑옷", name: "은하 로브", reqTier: 20, family: "galaxy", baseStats: [{ id: "flatHp", base: 96 }, { id: "energyShield", base: 530 }, { id: "resChaos", base: 15 }] },
    { id: "slayer_gauntlets", slot: "장갑", name: "학살자 건틀릿", reqTier: 16, family: "slayer", baseStats: [{ id: "armor", base: 150 }, { id: "crit", base: 5 }, { id: "attackPctDmg", base: 10 }] },
    { id: "executioner_gauntlets", slot: "장갑", name: "처단자 건틀릿", reqTier: 20, family: "slayer", baseStats: [{ id: "armor", base: 190 }, { id: "crit", base: 7 }, { id: "attackPctDmg", base: 14 }] },
    { id: "flurry_wraps", slot: "장갑", name: "연타 붕대", reqTier: 16, family: "flurry", baseStats: [{ id: "evasion", base: 110 }, { id: "aspd", base: 6 }, { id: "ds", base: 10 }] },
    { id: "tempest_wraps", slot: "장갑", name: "질풍 붕대", reqTier: 20, family: "flurry", baseStats: [{ id: "evasion", base: 140 }, { id: "aspd", base: 7 }, { id: "ds", base: 14 }] },
    { id: "vampire_grips", slot: "장갑", name: "흡혈 손아귀", reqTier: 16, family: "vampire", baseStats: [{ id: "armor", base: 120 }, { id: "energyShield", base: 110 }, { id: "leech", base: 0.4 }] },
    { id: "nightfang_grips", slot: "장갑", name: "밤송곳니 손아귀", reqTier: 20, family: "vampire", baseStats: [{ id: "armor", base: 150 }, { id: "energyShield", base: 140 }, { id: "leech", base: 0.6 }] },
    { id: "runebound_gloves", slot: "장갑", name: "룬각인 장갑", reqTier: 16, family: "runebound", baseStats: [{ id: "energyShield", base: 150 }, { id: "fireFlatDmg", base: 20 }, { id: "lightFlatDmg", base: 20 }] },
    { id: "runeseared_gloves", slot: "장갑", name: "룬낙인 장갑", reqTier: 20, family: "runebound", baseStats: [{ id: "energyShield", base: 190 }, { id: "fireFlatDmg", base: 30 }, { id: "lightFlatDmg", base: 30 }] },
    { id: "warden_greaves", slot: "신발", name: "파수 각반", reqTier: 16, family: "warden", baseStats: [{ id: "move", base: 16 }, { id: "armor", base: 180 }, { id: "resF", base: 10 }, { id: "resC", base: 10 }] },
    { id: "bastion_greaves", slot: "신발", name: "보루 각반", reqTier: 20, family: "warden", baseStats: [{ id: "move", base: 20 }, { id: "armor", base: 230 }, { id: "resF", base: 14 }, { id: "resC", base: 14 }] },
    { id: "phantom_treads", slot: "신발", name: "망령 걸음", reqTier: 16, family: "phantom", baseStats: [{ id: "move", base: 17 }, { id: "evasion", base: 160 }, { id: "deflectChance", base: 4 }] },
    { id: "wraith_treads", slot: "신발", name: "원령 걸음", reqTier: 20, family: "phantom", baseStats: [{ id: "move", base: 21 }, { id: "evasion", base: 200 }, { id: "deflectChance", base: 6 }] },
    { id: "vigor_boots", slot: "신발", name: "활력 장화", reqTier: 16, family: "vigor", baseStats: [{ id: "move", base: 16 }, { id: "flatHp", base: 60 }, { id: "regenFlat", base: 50 }] },
    { id: "lifebloom_boots", slot: "신발", name: "생명꽃 장화", reqTier: 20, family: "vigor", baseStats: [{ id: "move", base: 20 }, { id: "flatHp", base: 80 }, { id: "regenFlat", base: 70 }] },
    { id: "spellward_tome", slot: "방패", name: "주문 수호 완갑", reqTier: 16, family: "spellward", baseStats: [{ id: "energyShield", base: 200 }, { id: "spellPctDmg", base: 14 }] },
    { id: "arcane_bulwark_tome", slot: "방패", name: "비전 완갑", reqTier: 20, family: "spellward", baseStats: [{ id: "energyShield", base: 250 }, { id: "spellPctDmg", base: 20 }] },
    { id: "oath_shield", slot: "방패", name: "맹세 완갑", reqTier: 16, family: "oathshield", baseStats: [{ id: "armor", base: 190 }, { id: "maxResAll", base: 1, baseMin: 1, baseMax: 1 }] },
    { id: "covenant_shield", slot: "방패", name: "성약 완갑", reqTier: 20, family: "oathshield", baseStats: [{ id: "armor", base: 240 }, { id: "maxResAll", base: 1, baseMin: 1, baseMax: 2 }] },
    { id: "lifewall_shield", slot: "방패", name: "생명의 완갑", reqTier: 16, family: "lifewall", baseStats: [{ id: "armor", base: 150 }, { id: "flatHp", base: 60 }, { id: "regenFlat", base: 40 }] },
    { id: "lifecitadel_shield", slot: "방패", name: "생명결속 완갑", reqTier: 20, family: "lifewall", baseStats: [{ id: "armor", base: 190 }, { id: "flatHp", base: 80 }, { id: "regenFlat", base: 60 }] },
    { id: "giant_amulet", slot: "목걸이", name: "거인 목걸이", reqTier: 16, family: "giant", baseStats: [{ id: "strength", base: 24 }, { id: "meleePctDmg", base: 10 }] },
    { id: "titan_amulet", slot: "목걸이", name: "거신 목걸이", reqTier: 20, family: "giant", baseStats: [{ id: "strength", base: 32 }, { id: "meleePctDmg", base: 14 }] },
    { id: "gale_amulet", slot: "목걸이", name: "바람 목걸이", reqTier: 16, family: "gale", baseStats: [{ id: "dexterity", base: 24 }, { id: "projectilePctDmg", base: 10 }] },
    { id: "tempest_amulet", slot: "목걸이", name: "폭풍 목걸이", reqTier: 20, family: "gale", baseStats: [{ id: "dexterity", base: 32 }, { id: "projectilePctDmg", base: 14 }] },
    { id: "wisdom_amulet", slot: "목걸이", name: "지혜 목걸이", reqTier: 16, family: "wisdom", baseStats: [{ id: "intelligence", base: 24 }, { id: "spellPctDmg", base: 10 }] },
    { id: "abyss_wisdom_amulet", slot: "목걸이", name: "심연 지혜 목걸이", reqTier: 20, family: "wisdom", baseStats: [{ id: "intelligence", base: 32 }, { id: "spellPctDmg", base: 14 }] },
    { id: "pact_amulet", slot: "목걸이", name: "사역 목걸이", reqTier: 16, family: "pact", baseStats: [{ id: "summonPctDmg", base: 12 }, { id: "summonAspd", base: 6 }] },
    { id: "covenant_pact_amulet", slot: "목걸이", name: "맹약 목걸이", reqTier: 20, family: "pact", baseStats: [{ id: "summonPctDmg", base: 16 }, { id: "summonAspd", base: 8 }] },
    { id: "eagle_amulet", slot: "목걸이", name: "독수리 목걸이", reqTier: 18, family: "eagle", baseStats: [{ id: "crit", base: 4 }, { id: "critDmg", base: 18 }] },
    { id: "flame_frost_ring", slot: "반지", name: "홍청 반지", reqTier: 18, family: "flamefrost", baseStats: [{ id: "resF", base: 14 }, { id: "resC", base: 14 }] },
    { id: "frost_storm_ring", slot: "반지", name: "청뇌 반지", reqTier: 18, family: "froststorm", baseStats: [{ id: "resC", base: 14 }, { id: "resL", base: 14 }] },
    { id: "tricolor_ring", slot: "반지", name: "삼색 반지", reqTier: 20, family: "tricolor", baseStats: [{ id: "resF", base: 10 }, { id: "resC", base: 10 }, { id: "resL", base: 10 }] },
    { id: "void_ring", slot: "반지", name: "공허 반지", reqTier: 18, family: "void", baseStats: [{ id: "resChaos", base: 12 }, { id: "chaosPctDmg", base: 10 }] },
    { id: "blood_ring", slot: "반지", name: "피의 반지", reqTier: 18, family: "blood", baseStats: [{ id: "leech", base: 0.35 }, { id: "flatHp", base: 30 }] },
    { id: "prism_ring", slot: "반지", name: "분광 반지", reqTier: 20, family: "prism", baseStats: [{ id: "fireFlatDmg", base: 14 }, { id: "coldFlatDmg", base: 14 }, { id: "lightFlatDmg", base: 14 }] },
    { id: "rampart_belt", slot: "허리띠", name: "방벽 허리띠", reqTier: 18, family: "rampart", baseStats: [{ id: "flatHp", base: 70 }, { id: "armor", base: 220 }, { id: "resAll", base: 6 }] },
    { id: "warded_sash", slot: "허리띠", name: "수호 띠", reqTier: 18, family: "warded", baseStats: [{ id: "flatHp", base: 50 }, { id: "energyShield", base: 180 }, { id: "resAll", base: 6 }] },
    { id: "champion_belt", slot: "허리띠", name: "투사의 허리띠", reqTier: 20, family: "champion", baseStats: [{ id: "flatHp", base: 90 }, { id: "strength", base: 20 }, { id: "meleePctDmg", base: 12 }] },
    { id: "alchemist_sash", slot: "허리띠", name: "연금술사의 띠", reqTier: 20, family: "alchemist", baseStats: [{ id: "flatHp", base: 80 }, { id: "potionPctDmg", base: 14 }, { id: "dotPctDmg", base: 8 }] },
    { id: "hunter_baldric", slot: "허리띠", name: "사냥꾼의 띠", reqTier: 20, family: "hunter", baseStats: [{ id: "flatHp", base: 80 }, { id: "dexterity", base: 20 }, { id: "projectilePctDmg", base: 12 }] },
    { id: "archsage_sash", slot: "허리띠", name: "대현자의 띠", reqTier: 20, family: "scholar", baseStats: [{ id: "flatHp", base: 80 }, { id: "intelligence", base: 20 }, { id: "spellPctDmg", base: 12 }] },
    { id: "oak_maul", slot: "무기", name: "고목 대검", reqTier: 17, family: "maul", requirementWeights: { strength: 1 }, baseStats: [{ id: "flatDmg", base: 112 }, { id: "physPctDmg", base: 14 }, { id: "baseBlockChance", base: 5, baseMin: 5, baseMax: 5 }] },
    { id: "worldbreaker_maul", slot: "무기", name: "세계파쇄 대검", reqTier: 20, family: "maul", requirementWeights: { strength: 1 }, baseStats: [{ id: "flatDmg", base: 150 }, { id: "physPctDmg", base: 20 }, { id: "baseBlockChance", base: 5, baseMin: 5, baseMax: 5 }] },
    { id: "venom_kris", slot: "무기", name: "독니 한손검", reqTier: 17, family: "kris", requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: "flatDmg", base: 98 }, { id: "chaosPctDmg", base: 16 }, { id: "aspd", base: 6 }] },
    { id: "serpent_kris", slot: "무기", name: "왕뱀 한손검", reqTier: 20, family: "kris", requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: "flatDmg", base: 130 }, { id: "chaosPctDmg", base: 22 }, { id: "aspd", base: 8 }] },
    { id: "hawk_longbow", slot: "무기", name: "매의 단궁", reqTier: 17, family: "longbow", requirementWeights: { dexterity: 1 }, baseStats: [{ id: "flatDmg", base: 98 }, { id: "projectilePctDmg", base: 18 }, { id: "crit", base: 6 }] },
    { id: "skyhunter_longbow", slot: "무기", name: "하늘사냥 단궁", reqTier: 20, family: "longbow", requirementWeights: { dexterity: 1 }, baseStats: [{ id: "flatDmg", base: 126 }, { id: "projectilePctDmg", base: 24 }, { id: "crit", base: 8 }] },
    { id: "storm_rod", slot: "무기", name: "폭풍 오브", reqTier: 17, family: "stormrod", requirementWeights: { intelligence: 1 }, baseStats: [{ id: "flatDmg", base: 50 }, { id: "spellFlatDmg", base: 150 }, { id: "lightPctDmg", base: 18 }] },
    { id: "tempest_scepter", slot: "무기", name: "뇌우 오브", reqTier: 20, family: "stormrod", requirementWeights: { intelligence: 1 }, baseStats: [{ id: "flatDmg", base: 70 }, { id: "spellFlatDmg", base: 180 }, { id: "lightPctDmg", base: 26 }] },
    { id: "toxin_flask", slot: "무기", name: "독액 플라스크", reqTier: 17, family: "toxin", requirementWeights: { dexterity: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 100 }, { id: "potionPctDmg", base: 24 }, { id: "dotPctDmg", base: 14 }] },
    { id: "plague_flask", slot: "무기", name: "역병 플라스크", reqTier: 20, family: "toxin", requirementWeights: { dexterity: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 125 }, { id: "potionPctDmg", base: 32 }, { id: "dotPctDmg", base: 20 }] },
    { id: "pyre_censer", slot: "무기", name: "화장 향로", reqTier: 17, family: "pyre", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 110 }, { id: "firePctDmg", base: 20 }, { id: "regen", base: 0.4 }] },
    { id: "phoenix_censer", slot: "무기", name: "불사조 향로", reqTier: 20, family: "pyre", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 138 }, { id: "firePctDmg", base: 26 }, { id: "regen", base: 0.5 }] },
    // 향로 속성 줄(2026-11-11 사용자: 번개, 화염, 물리는 6단계, 물리+화염, 물리+번개, 화염+번개는 3단계). 번개는 바탕 체인(양철부터), 화염은 pyre,
    // 물리는 ironbell, 둘씩 묶은 줄은 candlelight(물리+화염), lightningrod(물리+번개), skyfire(화염+번개). 단계는 5, 10, 12, 15, 17, 20(복합은 12, 17, 20).
    { id: "kindling_censer", slot: "무기", name: "불씨 향로", reqTier: 5, family: "pyre", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 14 }, { id: "firePctDmg", base: 7 }, { id: "regen", base: 0.2 }] },
    { id: "bonfire_censer", slot: "무기", name: "화톳불 향로", reqTier: 10, family: "pyre", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 34 }, { id: "firePctDmg", base: 11 }, { id: "regen", base: 0.3 }] },
    { id: "beacon_censer", slot: "무기", name: "봉화 향로", reqTier: 15, family: "pyre", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 80 }, { id: "firePctDmg", base: 17 }, { id: "regen", base: 0.3 }] },
    { id: "stone_censer", slot: "무기", name: "돌 향로", reqTier: 5, family: "ironbell", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 14 }, { id: "physPctDmg", base: 7 }, { id: "regen", base: 0.2 }] },
    { id: "bronze_censer", slot: "무기", name: "청동 향로", reqTier: 10, family: "ironbell", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 34 }, { id: "physPctDmg", base: 11 }, { id: "regen", base: 0.3 }] },
    { id: "iron_censer", slot: "무기", name: "무쇠 향로", reqTier: 12, family: "ironbell", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 46 }, { id: "physPctDmg", base: 13 }, { id: "regen", base: 0.3 }] },
    { id: "steel_censer", slot: "무기", name: "강철 향로", reqTier: 15, family: "ironbell", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 80 }, { id: "physPctDmg", base: 17 }, { id: "regen", base: 0.3 }] },
    { id: "flail_censer", slot: "무기", name: "철퇴 향로", reqTier: 17, family: "ironbell", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 110 }, { id: "physPctDmg", base: 20 }, { id: "regen", base: 0.4 }] },
    { id: "bellringer_censer", slot: "무기", name: "종지기 향로", reqTier: 20, family: "ironbell", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 138 }, { id: "physPctDmg", base: 26 }, { id: "regen", base: 0.5 }] },
    { id: "candle_censer", slot: "무기", name: "촛대 향로", reqTier: 12, family: "candlelight", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 46 }, { id: "physPctDmg", base: 8 }, { id: "firePctDmg", base: 8 }, { id: "regen", base: 0.2 }] },
    { id: "chandelier_censer", slot: "무기", name: "샹들리에 향로", reqTier: 17, family: "candlelight", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 110 }, { id: "physPctDmg", base: 12 }, { id: "firePctDmg", base: 12 }, { id: "regen", base: 0.3 }] },
    { id: "relic_censer", slot: "무기", name: "금빛 성물 향로", reqTier: 20, family: "candlelight", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 138 }, { id: "physPctDmg", base: 16 }, { id: "firePctDmg", base: 16 }, { id: "regen", base: 0.4 }] },
    { id: "rod_censer", slot: "무기", name: "피뢰 향로", reqTier: 12, family: "lightningrod", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 46 }, { id: "physPctDmg", base: 8 }, { id: "lightPctDmg", base: 8 }, { id: "regen", base: 0.2 }] },
    { id: "ironbolt_censer", slot: "무기", name: "쇠벼락 향로", reqTier: 17, family: "lightningrod", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 110 }, { id: "physPctDmg", base: 12 }, { id: "lightPctDmg", base: 12 }, { id: "regen", base: 0.3 }] },
    { id: "thunderiron_censer", slot: "무기", name: "뇌철 향로", reqTier: 20, family: "lightningrod", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 138 }, { id: "physPctDmg", base: 16 }, { id: "lightPctDmg", base: 16 }, { id: "regen", base: 0.4 }] },
    { id: "firebolt_censer", slot: "무기", name: "불벼락 향로", reqTier: 12, family: "skyfire", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 46 }, { id: "firePctDmg", base: 8 }, { id: "lightPctDmg", base: 8 }, { id: "regen", base: 0.2 }] },
    { id: "firestorm_censer", slot: "무기", name: "폭풍불 향로", reqTier: 17, family: "skyfire", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 110 }, { id: "firePctDmg", base: 12 }, { id: "lightPctDmg", base: 12 }, { id: "regen", base: 0.3 }] },
    { id: "skyfire_censer", slot: "무기", name: "천화 향로", reqTier: 20, family: "skyfire", requirementWeights: { strength: 0.6, intelligence: 0.6 }, baseStats: [{ id: "flatDmg", base: 138 }, { id: "firePctDmg", base: 16 }, { id: "lightPctDmg", base: 16 }, { id: "regen", base: 0.4 }] },
    { id: "chaos_realm_fang", slot: "무기", name: "혼돈계 균열 한손검", reqTier: 18, realmBase: "chaos", dropOnly: { minTier: 15 }, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: "flatDmg", base: 93, legacyDamageBase: 42 }, { id: "chaosPctDmg", base: 24 }, { id: "resChaos", base: 8 }] },
    { id: "chaos_realm_coil", slot: "반지", name: "혼돈계 소용돌이 반지", reqTier: 18, realmBase: "chaos", dropOnly: { minTier: 15 }, baseStats: [{ id: "chaosPctDmg", base: 18 }, { id: "resChaos", base: 10 }] },
    { id: "underworld_bastion", slot: "갑옷", name: "지하계 철벽 흉갑", reqTier: 20, realmBase: "underworld", dropOnly: { minTier: 15 }, baseStats: [{ id: "flatHp", base: 120 }, { id: "armor", base: 260 }, { id: "dr", base: 8 }] },
    { id: "underworld_chain", slot: "허리띠", name: "지하계 결속 허리띠", reqTier: 20, realmBase: "underworld", dropOnly: { minTier: 15 }, baseStats: [{ id: "flatHp", base: 110 }, { id: "resAll", base: 10 }, { id: "resChaos", base: 12 }] },
    { id: "cosmos_prism_lance", slot: "무기", name: "우주계 프리즘 대검", reqTier: 22, realmBase: "cosmos", dropOnly: { minTier: 20 }, requirementWeights: { strength: 0.6, dexterity: 0.6 }, baseStats: [{ id: "flatDmg", base: 125, legacyDamageBase: 52 }, { id: "elementalPctDmg", base: 28 }, { id: "resPen", base: 9 }, { id: "baseBlockChance", base: 5, baseMin: 5, baseMax: 5 }] },
    { id: "cosmos_core_amulet", slot: "목걸이", name: "우주계 핵성 목걸이", reqTier: 22, realmBase: "cosmos", dropOnly: { minTier: 20 }, baseStats: [{ id: "gemLevel", base: 1 }, { id: "suppCap", base: 1 }, { id: "resAll", base: 10 }] },
    { id: "gen__armor_t1", slot: "투구", name: "무쇠 투구", reqTier: 1, baseStats: [{ id: "flatHp", base: 7 }, { id: "armor", base: 26 }] },
    { id: "gen__armor_t16", slot: "투구", name: "금강 투구", reqTier: 16, baseStats: [{ id: "flatHp", base: 83 }, { id: "armor", base: 307 }, { id: "resAll", base: 6 }] },
    { id: "gen__armor_t20", slot: "투구", name: "불멸 투구", reqTier: 20, baseStats: [{ id: "flatHp", base: 103 }, { id: "armor", base: 383 }, { id: "resAll", base: 9 }] },
    { id: "gen__evasion_t1", slot: "투구", name: "들바람 투구", reqTier: 1, baseStats: [{ id: "flatHp", base: 5 }, { id: "evasion", base: 17 }] },
    { id: "gen__evasion_t4", slot: "투구", name: "질풍 투구", reqTier: 4, baseStats: [{ id: "flatHp", base: 21 }, { id: "evasion", base: 66 }] },
    { id: "gen__evasion_t16", slot: "투구", name: "광풍 투구", reqTier: 16, baseStats: [{ id: "flatHp", base: 72 }, { id: "evasion", base: 240 }, { id: "resAll", base: 6 }] },
    { id: "gen__evasion_t20", slot: "투구", name: "표풍 투구", reqTier: 20, baseStats: [{ id: "flatHp", base: 90 }, { id: "evasion", base: 300 }, { id: "resAll", base: 9 }] },
    { id: "gen__energyShield_t4", slot: "투구", name: "마정 투구", reqTier: 4, baseStats: [{ id: "flatHp", base: 28 }, { id: "energyShield", base: 93 }] },
    { id: "gen__energyShield_t16", slot: "투구", name: "성휘 투구", reqTier: 16, baseStats: [{ id: "flatHp", base: 64 }, { id: "energyShield", base: 320 }, { id: "resAll", base: 6 }] },
    { id: "gen__energyShield_t20", slot: "투구", name: "천상 투구", reqTier: 20, baseStats: [{ id: "flatHp", base: 80 }, { id: "energyShield", base: 400 }, { id: "resAll", base: 9 }] },
    { id: "gen__armor_evasion_t20", slot: "투구", name: "신월 투구", reqTier: 20, baseStats: [{ id: "flatHp", base: 104 }, { id: "armor", base: 165 }, { id: "evasion", base: 171 }, { id: "resAll", base: 9 }] },
    { id: "gen__armor_energyShield_t20", slot: "투구", name: "성왕 투구", reqTier: 20, baseStats: [{ id: "flatHp", base: 115 }, { id: "armor", base: 216 }, { id: "energyShield", base: 229 }, { id: "resAll", base: 9 }] },
    { id: "gen__evasion_energyShield_t20", slot: "투구", name: "월식 투구", reqTier: 20, baseStats: [{ id: "flatHp", base: 99 }, { id: "evasion", base: 157 }, { id: "energyShield", base: 163 }, { id: "resAll", base: 9 }] },
    { id: "gen__armor_t1_1", slot: "갑옷", name: "무쇠 갑옷", reqTier: 1, baseStats: [{ id: "flatHp", base: 11 }, { id: "armor", base: 55 }] },
    { id: "gen__armor_t12", slot: "갑옷", name: "흑요 갑옷", reqTier: 12, baseStats: [{ id: "flatHp", base: 78 }, { id: "armor", base: 368 }] },
    { id: "gen__armor_t20_1", slot: "갑옷", name: "불멸 갑옷", reqTier: 20, baseStats: [{ id: "flatHp", base: 123 }, { id: "armor", base: 573 }, { id: "resAll", base: 9 }] },
    { id: "gen__evasion_t4_1", slot: "갑옷", name: "질풍 갑옷", reqTier: 4, baseStats: [{ id: "flatHp", base: 34 }, { id: "evasion", base: 90 }] },
    { id: "gen__evasion_t12", slot: "갑옷", name: "월광 갑옷", reqTier: 12, baseStats: [{ id: "flatHp", base: 71 }, { id: "evasion", base: 241 }] },
    { id: "gen__evasion_t20_1", slot: "갑옷", name: "표풍 갑옷", reqTier: 20, baseStats: [{ id: "flatHp", base: 112 }, { id: "evasion", base: 487 }, { id: "resAll", base: 9 }] },
    { id: "gen__energyShield_t1", slot: "갑옷", name: "수정 갑옷", reqTier: 1, baseStats: [{ id: "flatHp", base: 6 }, { id: "energyShield", base: 27 }] },
    { id: "gen__energyShield_t4_1", slot: "갑옷", name: "마정 갑옷", reqTier: 4, baseStats: [{ id: "flatHp", base: 23 }, { id: "energyShield", base: 109 }] },
    { id: "gen__energyShield_t8", slot: "갑옷", name: "공명 갑옷", reqTier: 8, baseStats: [{ id: "flatHp", base: 47 }, { id: "energyShield", base: 218 }] },
    { id: "gen__energyShield_t20_1", slot: "갑옷", name: "천상 갑옷", reqTier: 20, baseStats: [{ id: "flatHp", base: 101 }, { id: "energyShield", base: 560 }, { id: "resAll", base: 9 }] },
    { id: "gen__armor_evasion_t20_1", slot: "갑옷", name: "신월 갑옷", reqTier: 20, baseStats: [{ id: "flatHp", base: 131 }, { id: "armor", base: 259 }, { id: "evasion", base: 269 }, { id: "resAll", base: 9 }] },
    { id: "gen__armor_energyShield_t20_1", slot: "갑옷", name: "성왕 갑옷", reqTier: 20, baseStats: [{ id: "flatHp", base: 136 }, { id: "armor", base: 317 }, { id: "energyShield", base: 309 }, { id: "resAll", base: 9 }] },
    { id: "gen__evasion_energyShield_t20_1", slot: "갑옷", name: "월식 갑옷", reqTier: 20, baseStats: [{ id: "flatHp", base: 120 }, { id: "evasion", base: 243 }, { id: "energyShield", base: 237 }, { id: "resAll", base: 9 }] },
    { id: "gen__armor_t1_2", slot: "장갑", name: "무쇠 장갑", reqTier: 1, baseStats: [{ id: "aspd", base: 2 }, { id: "flatHp", base: 4 }, { id: "armor", base: 14 }] },
    { id: "gen__armor_t8", slot: "장갑", name: "흑철 장갑", reqTier: 8, baseStats: [{ id: "aspd", base: 6 }, { id: "flatHp", base: 20 }, { id: "armor", base: 100 }] },
    { id: "gen__armor_t16_1", slot: "장갑", name: "금강 장갑", reqTier: 16, baseStats: [{ id: "aspd", base: 8 }, { id: "flatHp", base: 32 }, { id: "armor", base: 193 }, { id: "resAll", base: 6 }] },
    { id: "gen__armor_t20_2", slot: "장갑", name: "불멸 장갑", reqTier: 20, baseStats: [{ id: "aspd", base: 9 }, { id: "flatHp", base: 40 }, { id: "armor", base: 242 }, { id: "resAll", base: 9 }] },
    { id: "gen__evasion_t4_2", slot: "장갑", name: "질풍 장갑", reqTier: 4, baseStats: [{ id: "aspd", base: 4 }, { id: "evasion", base: 42 }] },
    { id: "gen__evasion_t8", slot: "장갑", name: "야행 장갑", reqTier: 8, baseStats: [{ id: "aspd", base: 6 }, { id: "evasion", base: 73 }] },
    { id: "gen__evasion_t16_1", slot: "장갑", name: "광풍 장갑", reqTier: 16, baseStats: [{ id: "aspd", base: 8 }, { id: "evasion", base: 140 }, { id: "resAll", base: 6 }] },
    { id: "gen__evasion_t20_2", slot: "장갑", name: "표풍 장갑", reqTier: 20, baseStats: [{ id: "aspd", base: 9 }, { id: "evasion", base: 175 }, { id: "resAll", base: 9 }] },
    { id: "gen__energyShield_t1_1", slot: "장갑", name: "수정 장갑", reqTier: 1, baseStats: [{ id: "aspd", base: 2 }, { id: "energyShield", base: 11 }] },
    { id: "gen__energyShield_t4_2", slot: "장갑", name: "마정 장갑", reqTier: 4, baseStats: [{ id: "aspd", base: 4 }, { id: "energyShield", base: 45 }] },
    { id: "gen__energyShield_t8_1", slot: "장갑", name: "공명 장갑", reqTier: 8, baseStats: [{ id: "aspd", base: 6 }, { id: "energyShield", base: 90 }] },
    { id: "gen__energyShield_t16_1", slot: "장갑", name: "성휘 장갑", reqTier: 16, baseStats: [{ id: "aspd", base: 8 }, { id: "energyShield", base: 180 }, { id: "resAll", base: 6 }] },
    { id: "gen__energyShield_t20_2", slot: "장갑", name: "천상 장갑", reqTier: 20, baseStats: [{ id: "aspd", base: 9 }, { id: "energyShield", base: 225 }, { id: "resAll", base: 9 }] },
    { id: "gen__armor_evasion_t20_2", slot: "장갑", name: "신월 장갑", reqTier: 20, baseStats: [{ id: "aspd", base: 9 }, { id: "armor", base: 99 }, { id: "evasion", base: 104 }, { id: "resAll", base: 9 }] },
    { id: "gen__armor_energyShield_t20_2", slot: "장갑", name: "성왕 장갑", reqTier: 20, baseStats: [{ id: "aspd", base: 9 }, { id: "armor", base: 139 }, { id: "energyShield", base: 136 }, { id: "resAll", base: 9 }] },
    { id: "gen__evasion_energyShield_t20_2", slot: "장갑", name: "월식 장갑", reqTier: 20, baseStats: [{ id: "aspd", base: 9 }, { id: "evasion", base: 101 }, { id: "energyShield", base: 96 }, { id: "resAll", base: 9 }] },
    { id: "gen__armor_t1_3", slot: "신발", name: "무쇠 장화", reqTier: 1, baseStats: [{ id: "move", base: 6 }, { id: "flatHp", base: 2 }, { id: "armor", base: 14 }] },
    { id: "gen__armor_t4", slot: "신발", name: "강철 장화", reqTier: 4, baseStats: [{ id: "move", base: 10 }, { id: "flatHp", base: 9 }, { id: "armor", base: 55 }] },
    { id: "gen__armor_t8_1", slot: "신발", name: "흑철 장화", reqTier: 8, baseStats: [{ id: "move", base: 14 }, { id: "flatHp", base: 19 }, { id: "armor", base: 109 }] },
    { id: "gen__armor_t20_3", slot: "신발", name: "불멸 장화", reqTier: 20, baseStats: [{ id: "move", base: 23 }, { id: "flatHp", base: 48 }, { id: "armor", base: 307 }, { id: "resAll", base: 9 }] },
    { id: "gen__evasion_t1_1", slot: "신발", name: "들바람 장화", reqTier: 1, baseStats: [{ id: "move", base: 6 }, { id: "flatHp", base: 4 }, { id: "evasion", base: 16 }] },
    { id: "gen__evasion_t20_3", slot: "신발", name: "표풍 장화", reqTier: 20, baseStats: [{ id: "move", base: 23 }, { id: "flatHp", base: 70 }, { id: "evasion", base: 247 }, { id: "resAll", base: 9 }] },
    { id: "gen__energyShield_t4_3", slot: "신발", name: "마정 장화", reqTier: 4, baseStats: [{ id: "move", base: 10 }, { id: "energyShield", base: 67 }] },
    { id: "gen__energyShield_t12", slot: "신발", name: "예지 장화", reqTier: 12, baseStats: [{ id: "move", base: 17 }, { id: "energyShield", base: 177 }] },
    { id: "gen__energyShield_t20_3", slot: "신발", name: "천상 장화", reqTier: 20, baseStats: [{ id: "move", base: 23 }, { id: "energyShield", base: 293 }, { id: "resAll", base: 9 }] },
    { id: "gen__armor_evasion_t20_3", slot: "신발", name: "신월 장화", reqTier: 20, baseStats: [{ id: "move", base: 23 }, { id: "armor", base: 128 }, { id: "evasion", base: 136 }, { id: "resAll", base: 9 }] },
    { id: "gen__armor_energyShield_t20_3", slot: "신발", name: "성왕 장화", reqTier: 20, baseStats: [{ id: "move", base: 23 }, { id: "armor", base: 168 }, { id: "energyShield", base: 163 }, { id: "resAll", base: 9 }] },
    { id: "gen__evasion_energyShield_t20_3", slot: "신발", name: "월식 장화", reqTier: 20, baseStats: [{ id: "move", base: 23 }, { id: "evasion", base: 136 }, { id: "energyShield", base: 131 }, { id: "resAll", base: 9 }] },
    { id: "gen__armor_t20_4", slot: "방패", name: "불멸 완갑", reqTier: 20, baseStats: [{ id: "armor", base: 300 }, { id: "resAll", base: 9 }] },
    { id: "gen__evasion_t1_2", slot: "방패", name: "들바람 완갑", reqTier: 1, baseStats: [{ id: "evasion", base: 24 }] },
    { id: "gen__evasion_t20_4", slot: "방패", name: "표풍 완갑", reqTier: 20, baseStats: [{ id: "evasion", base: 292 }, { id: "resAll", base: 9 }] },
    { id: "gen__energyShield_t1_2", slot: "방패", name: "수정 완갑", reqTier: 1, baseStats: [{ id: "baseBlockChance", base: 6.5 }, { id: "energyShield", base: 25 }] },
    { id: "gen__energyShield_t20_4", slot: "방패", name: "천상 완갑", reqTier: 20, baseStats: [{ id: "baseBlockChance", base: 6.5 }, { id: "energyShield", base: 315 }, { id: "resAll", base: 9 }] },
    { id: "gen__armor_evasion_t20_4", slot: "방패", name: "신월 완갑", reqTier: 20, baseStats: [{ id: "armor", base: 220 }, { id: "evasion", base: 212 }, { id: "resAll", base: 9 }] },
    { id: "gen__armor_energyShield_t20_4", slot: "방패", name: "성왕 완갑", reqTier: 20, baseStats: [{ id: "armor", base: 218 }, { id: "energyShield", base: 210 }, { id: "resAll", base: 9 }] },
    { id: "gen__evasion_energyShield_t20_4", slot: "방패", name: "월식 완갑", reqTier: 20, baseStats: [{ id: "evasion", base: 212 }, { id: "energyShield", base: 206 }, { id: "resAll", base: 9 }] }
  ];
  function createBasesDefinitions() {
    return { BASE_ITEM_DB };
  }

  // modules/data/skill-defaults.mjs
  function initializeSkillDefaults(SKILL_DB2) {
    Object.keys(SKILL_DB2).forEach((name) => {
      let skill = SKILL_DB2[name];
      if (!skill || !skill.isGem) return;
      if (Number.isFinite(skill.baseDmg)) skill.baseDmg = Number((skill.baseDmg * 1.62).toFixed(3));
      if (Number.isFinite(skill.dmgScale) && skill.dmgScale > 0) skill.dmgScale = Number((skill.dmgScale * 1.9).toFixed(4));
    });
  }

  // modules/domain/passive-equipment-rules.mjs
  var PassiveEquipmentRules = class {
    constructor(deps, data2) {
      this.deps = deps;
      this.data = data2;
      this.getPassiveEquipmentRestriction = this.getPassiveEquipmentRestriction.bind(this);
      this.enforcePassiveEquipmentRestrictions = this.enforcePassiveEquipmentRestrictions.bind(this);
    }
    getPassiveEquipmentRestriction(item, state = this.deps.game) {
      if (!item) return "";
      const rule = this.deps.PASSIVE_EQUIPMENT_RESTRICTIONS.find((entry) => entry.slot === item.slot && (state.passives || []).includes(entry.nodeId));
      return rule ? rule.reason : "";
    }
    enforcePassiveEquipmentRestrictions(state = this.deps.game) {
      let moved = 0;
      Object.entries(state.equipment).forEach(([slot, item]) => {
        if (!this.getPassiveEquipmentRestriction(item, state)) return;
        if (!state.inventory.includes(item)) state.inventory.push(item);
        state.equipment[slot] = null;
        moved++;
      });
      return moved;
    }
  };

  // modules/application/world-notices.mjs
  var WorldNotices = class {
    constructor(deps, data2) {
      this.deps = deps;
      this.data = data2;
      this.queueContentNotice = this.queueContentNotice.bind(this);
      this.queueTutorialNotice = this.queueTutorialNotice.bind(this);
      this.isTransientGameState = this.isTransientGameState.bind(this);
    }
    queueContentNotice(key, title, contentId, bodies, route) {
      const opened = typeof this.deps.contentProgression !== "object" || this.deps.contentProgression.isUnlocked(contentId);
      if (opened) {
        this.queueTutorialNotice(key, title, bodies.open, route);
        return;
      }
      this.queueTutorialNotice(key, title, bodies.locked, "tab-unlocks");
    }
    queueTutorialNotice(key, title, body, tabId, target) {
      if (this.isTransientGameState(this.deps.game)) return;
      const opening = typeof this.deps.contentProgression === "object" ? this.deps.contentProgression.opening : null;
      const extra = target && typeof target === "object" ? target : { subtabId: target };
      const inline = extra.inline || opening?.inlineNotice(this.deps.game, key);
      if (inline && !opening.canOpen(this.deps.game, tabId)) return;
      const notice = { ...extra, key, title, body, tabId };
      this.deps.tutorialHistory.enqueue(this.deps.game, notice);
      if (inline) {
        this.deps.tutorialHistory.archivePending(this.deps.game, key);
      }
    }
    isTransientGameState(owner) {
      return !!(owner?.isBackgroundCalculation || owner?.isGuideReplay);
    }
  };

  // modules/domain/story-act-labels.mjs
  var StoryActLabels = class {
    constructor(deps, data2) {
      this.deps = deps;
      this.data = data2;
      this.formatStoryActLabel = this.formatStoryActLabel.bind(this);
      this.getStoryActByZoneId = this.getStoryActByZoneId.bind(this);
      this.getStoryActByOrder = this.getStoryActByOrder.bind(this);
      this.getActZoneDisplayName = this.getActZoneDisplayName.bind(this);
    }
    formatStoryActLabel(storyAct) {
      if (!storyAct) return this.deps._t("액트 ?");
      return storyAct.displayAct === "엔드게임" ? this.deps._t("엔드게임") : this.deps._t("액트 {n}", { n: storyAct.displayAct });
    }
    getStoryActByZoneId(zoneId) {
      if (!Number.isFinite(zoneId)) return null;
      return this.deps.STORY_ACTS[zoneId] || null;
    }
    getStoryActByOrder(order) {
      return this.deps.STORY_ACTS.find((act) => act.order === order) || null;
    }
    getActZoneDisplayName(zoneId) {
      let act = this.getStoryActByZoneId(zoneId);
      if (!act) return `액트 ${zoneId + 1}`;
      return `${this.formatStoryActLabel(act)}: ${act.title}`;
    }
  };

  // modules/state/chaos-realm.mjs
  var ChaosRealmState = class {
    constructor(deps, data2) {
      this.deps = deps;
      this.data = data2;
      this.createDefaultChaosRealmState = this.createDefaultChaosRealmState.bind(this);
      this.ensureChaosRealmState = this.ensureChaosRealmState.bind(this);
    }
    createDefaultChaosRealmState() {
      return {
        unlocked: false,
        highestFloor: 0,
        currentFloor: 1,
        clearedFloors: [],
        woodsmanBestDamagePct: 0,
        permanentBonuses: { ...this.data.CHAOS_REALM_DEFAULT_BONUSES }
      };
    }
    ensureChaosRealmState() {
      let st = this.deps.game && this.deps.game.chaosRealm && typeof this.deps.game.chaosRealm === "object" ? this.deps.game.chaosRealm : this.deps.game.chaosRealm = this.createDefaultChaosRealmState();
      st.unlocked = !!st.unlocked;
      st.highestFloor = Math.max(0, Math.floor(st.highestFloor || 0));
      st.currentFloor = Math.max(1, Math.floor(st.currentFloor || 1));
      st.clearedFloors = Array.isArray(st.clearedFloors) ? Array.from(new Set(st.clearedFloors.map((v) => Math.floor(v || 0)).filter((v) => v >= 1))).sort((a, b) => a - b) : [];
      st.woodsmanBestDamagePct = Math.max(0, Math.min(100, Number(st.woodsmanBestDamagePct) || 0));
      this.normalizePermanentBonuses(st);
      if (st.unlocked && st.highestFloor < 1) st.highestFloor = 1;
      return st;
    }
    normalizePermanentBonuses(st) {
      st.permanentBonuses = { ...this.data.CHAOS_REALM_DEFAULT_BONUSES, ...st.permanentBonuses || {} };
      Object.keys(this.data.CHAOS_REALM_DEFAULT_BONUSES).forEach((key) => {
        st.permanentBonuses[key] = Math.max(0, Number(st.permanentBonuses[key]) || 0);
      });
    }
  };

  // modules/common/realm-difficulty.mjs
  var RealmDifficulty = class {
    constructor(deps, data2) {
      this.deps = deps;
      this.data = data2;
      this.getChaosRealmTier = this.getChaosRealmTier.bind(this);
      this.getUnderworldTier = this.getUnderworldTier.bind(this);
      this.getUnderworldGravityActionMultiplier = this.getUnderworldGravityActionMultiplier.bind(this);
      this.getUnderworldLifeDrainPerTick = this.getUnderworldLifeDrainPerTick.bind(this);
      this.getChaosRealmAffixCount = this.getChaosRealmAffixCount.bind(this);
      this.getChaosRealmAffixScale = this.getChaosRealmAffixScale.bind(this);
      this.getChaosRealmAffixes = this.getChaosRealmAffixes.bind(this);
      this.getOceanCurrentAffixes = this.getOceanCurrentAffixes.bind(this);
      this.hasOceanCurrent = this.hasOceanCurrent.bind(this);
      this.getColonyWaveEnemyCount = this.getColonyWaveEnemyCount.bind(this);
      this.getAbyssDepthFromZoneId = this.getAbyssDepthFromZoneId.bind(this);
      this.getAbyssZoneIdForDepth = this.getAbyssZoneIdForDepth.bind(this);
      this.getAbyssZoneTier = this.getAbyssZoneTier.bind(this);
      this.getTimeRiftEquivalentChaosDepth = this.getTimeRiftEquivalentChaosDepth.bind(this);
      this.getTimeRiftFixedSeason = this.getTimeRiftFixedSeason.bind(this);
      this.getChaosDepthScales = this.getChaosDepthScales.bind(this);
      this.getAbyssMonsterScales = this.getAbyssMonsterScales.bind(this);
      this.getContentDropRateMultiplier = this.getContentDropRateMultiplier.bind(this);
      this.capEndlessContentDropMultiplier = this.capEndlessContentDropMultiplier.bind(this);
      this.underworldMilestoneReward = this.underworldMilestoneReward.bind(this);
    }
    getChaosRealmTier(floor) {
      let safeFloor = Math.max(1, Math.floor(floor || 1));
      return 30 + Math.floor((safeFloor - 1) * 0.85) + Math.floor(Math.max(0, safeFloor - 10) * 0.18);
    }
    getUnderworldTier(floor) {
      let safeFloor = Math.max(1, Math.floor(Number(floor) || 1));
      let deepFloor = this.deps.UNDERWORLD_DIFFICULTY_CONFIG.deepDamageThroughFloor;
      let tierGain = Math.max(0, safeFloor - deepFloor) * this.deps.UNDERWORLD_DIFFICULTY_CONFIG.tierGainPerFloorAfterDeep;
      return this.getChaosRealmTier(30) + tierGain;
    }
    getUnderworldGravityActionMultiplier(floor, reductionPct) {
      let safeFloor = Math.max(1, Math.floor(Number(floor) || 1));
      let reduction = Math.max(0, Math.min(75, Number(reductionPct) || 0)) / 100;
      let baseSlow = Math.min(0.75, 0.12 + Math.max(0, safeFloor - 1) * 0.018) * (1 - reduction);
      let deepFloors = Math.max(0, safeFloor - this.deps.UNDERWORLD_DIFFICULTY_CONFIG.deepDamageThroughFloor);
      let deepMultiplier = Math.pow(1 - this.deps.UNDERWORLD_DIFFICULTY_CONFIG.gravityActionLossPerFloorAfterDeep, deepFloors);
      return Math.max(1e-4, (1 - baseSlow) * deepMultiplier);
    }
    getUnderworldLifeDrainPerTick(maxHp, floor, reductionPct) {
      if (floor < 15) return 0;
      const fraction = floor >= 40 ? 0.02 : floor >= 30 ? 0.015 : 0.01;
      const mitigation = 1 - Math.max(0, Math.min(75, Number(reductionPct) || 0)) / 100;
      return Math.max(1, Math.floor((maxHp || 1) * fraction * mitigation));
    }
    getChaosRealmAffixCount(floor) {
      let safeFloor = Math.max(1, Math.floor(floor || 1));
      if (safeFloor >= 35) return 5 + Math.floor((safeFloor - 35) / 20);
      if (safeFloor >= 20) return 4;
      if (safeFloor >= 10) return 3;
      if (safeFloor >= 5) return 2;
      return 1;
    }
    getChaosRealmAffixScale(floor) {
      return 1 + Math.floor(Math.max(1, Math.floor(floor || 1)) / 10) * 0.25;
    }
    getChaosRealmAffixes(floor) {
      let safeFloor = Math.max(1, Math.floor(floor || 1));
      let count = Math.min(this.data.CHAOS_REALM_AFFIX_POOL.length, this.getChaosRealmAffixCount(safeFloor));
      let start = Math.abs(this.deps.hashSeed("chaosRealm:" + safeFloor)) % this.data.CHAOS_REALM_AFFIX_POOL.length;
      let out = [];
      for (let i = 0; i < this.data.CHAOS_REALM_AFFIX_POOL.length && out.length < count; i++) {
        let affix = this.data.CHAOS_REALM_AFFIX_POOL[(start + i * 5) % this.data.CHAOS_REALM_AFFIX_POOL.length];
        if (!out.some((row) => row.id === affix.id)) out.push({ ...affix, scale: this.getChaosRealmAffixScale(safeFloor) });
      }
      return out;
    }
    getOceanCurrentAffixes(depthTier) {
      let safeTier = Math.max(0, Math.floor(depthTier || 0));
      let count = Math.min(this.data.OCEAN_CURRENT_POOL.length, 1 + Math.floor(safeTier / 3));
      let start = Math.abs(this.deps.hashSeed("oceanCurrent:" + safeTier)) % this.data.OCEAN_CURRENT_POOL.length;
      let out = [];
      for (let i = 0; i < this.data.OCEAN_CURRENT_POOL.length && out.length < count; i++) {
        let affix = this.data.OCEAN_CURRENT_POOL[(start + i * 5) % this.data.OCEAN_CURRENT_POOL.length];
        if (!out.some((row) => row.id === affix.id)) out.push({ ...affix });
      }
      return out;
    }
    hasOceanCurrent(zone, currentId) {
      return !!(zone && Array.isArray(zone.currents) && zone.currents.some((current) => current && current.id === currentId));
    }
    getColonyWaveEnemyCount(wave) {
      return Math.max(12, Math.min(36, 10 + Math.max(1, Math.floor(wave || 1)) * 2));
    }
    getAbyssDepthFromZoneId(id) {
      if (!Number.isFinite(id) || id < this.data.ABYSS_START_ZONE_ID) return 0;
      return Math.max(1, Math.floor(id - this.data.ABYSS_START_ZONE_ID + 1));
    }
    getAbyssZoneIdForDepth(depth) {
      return this.data.ABYSS_START_ZONE_ID + Math.max(1, Math.floor(depth || 1)) - 1;
    }
    getAbyssZoneTier(depth) {
      let safeDepth = Math.max(1, Math.floor(depth || 1));
      return this.data.abyssTiers[Math.min(20, safeDepth) - 1] || this.data.abyssTiers[this.data.abyssTiers.length - 1] || 20;
    }
    getTimeRiftEquivalentChaosDepth(pressure) {
      let safePressure = Math.max(1, Math.min(this.deps.TIME_RIFT_MAX_PRESSURE, Math.floor(Number(pressure) || 1)));
      return this.deps.TIME_RIFT_EQUIVALENT_CHAOS_DEPTHS[safePressure - 1];
    }
    getTimeRiftFixedSeason(pressure) {
      return this.getTimeRiftEquivalentChaosDepth(pressure) - this.deps.TIME_RIFT_LOOP_BEHIND_DEPTH;
    }
    getChaosDepthScales(endlessDepth) {
      let endlessOver = Math.max(0, endlessDepth - 20);
      let endlessMul = 1;
      if (endlessOver > 0) {
        let steepBand = Math.min(10, endlessOver);
        let smoothBand = Math.max(0, endlessOver - 10);
        endlessMul = Math.pow(this.data.ABYSS_ENDLESS_STEEP_FLOOR_HP_MUL, steepBand) * Math.pow(1.06, smoothBand);
      }
      return {
        dmgMul: 1 + endlessOver * 0.022,
        hpMul: endlessMul,
        hordeMul: 1,
        dropMul: 1,
        expMul: 1,
        playerTakenMul: 1 + Math.min(10, endlessOver) * this.data.ABYSS_ENDLESS_STEEP_PLAYER_TAKEN_PER_FLOOR + Math.max(0, endlessOver - 10) * 0.012,
        playerDamageMul: 1,
        resistBonus: 0,
        eliteBonus: 0,
        bossMul: 1,
        bossExtraCurrencyChance: 0,
        mapProgressMul: 1,
        mapLengthMul: 1
      };
    }
    getAbyssMonsterScales(zone) {
      if (zone && (zone.type === "atlasMap" || zone.type === "timeRift")) return this.getChaosDepthScales(zone.equivalentDepth);
      if (!zone || zone.type !== "abyss") return { dmgMul: 1, hpMul: 1, hordeMul: 1, dropMul: 1, expMul: 1, playerTakenMul: 1, playerDamageMul: 1, resistBonus: 0, eliteBonus: 0, bossMul: 1, bossExtraCurrencyChance: 0, mapProgressMul: 1, mapLengthMul: 1 };
      let depth = Math.max(1, Math.floor(zone.depth || this.getAbyssDepthFromZoneId(zone.id) || 1));
      return this.getChaosDepthScales(depth);
    }
    getContentDropRateMultiplier(zone) {
      return zone && zone.type === "underworld" ? this.data.UNDERWORLD_DROP_RATE_MULTIPLIER : 1;
    }
    capEndlessContentDropMultiplier(zone, multiplier) {
      let value = Math.max(0, Number(multiplier) || 0);
      if (!zone || !["abyss", "chaosRealm", "labyrinth", "underworld", "beyondBoundary"].includes(zone.type)) return value;
      return Math.min(this.data.ENDLESS_CONTENT_DROP_MULTIPLIER_CAP, value);
    }
    underworldMilestoneReward(floor) {
      const rule = this.deps.UNDERWORLD_DEEP_FLOOR_REWARD;
      if (!Number.isSafeInteger(floor) || floor < 10) return null;
      if (floor <= rule.fromFloor) {
        if (floor % 10 !== 0) return null;
        return { floor, slots: Math.min(6, floor / 10), rune: this.data.UNDERWORLD_RUNE_DB.find((row) => row.no === floor / 10), currencies: {} };
      }
      const depth = floor - rule.fromFloor;
      if (depth % rule.every !== 0) return null;
      return { floor, slots: 0, rune: null, currencies: {
        runeShard: Math.floor(rule.runeShard[0] + rule.runeShard[1] * depth),
        underGold: Math.floor(rule.underGold[0] + rule.underGold[1] * depth)
      } };
    }
  };

  // modules/state/realm-progress.mjs
  var RealmProgress = class {
    constructor(deps, data2, { difficulty: difficulty2 }) {
      this.deps = deps;
      this.data = data2;
      this.difficulty = difficulty2;
      this.hasCurrentLoopChaos20Clear = this.hasCurrentLoopChaos20Clear.bind(this);
      this.hasCurrentLoopChaosAccess = this.hasCurrentLoopChaosAccess.bind(this);
      this.getHighestUnlockedEndlessChaosDepth = this.getHighestUnlockedEndlessChaosDepth.bind(this);
      this.getLoopDeepChaosFrontierDepth = this.getLoopDeepChaosFrontierDepth.bind(this);
      this.getMeteorSiteUnlockReady = this.getMeteorSiteUnlockReady.bind(this);
      this.getClearedSkyTowerFloor = this.getClearedSkyTowerFloor.bind(this);
    }
    hasCurrentLoopChaos20Clear(source) {
      let state = source || this.deps.game;
      return !!(state && state.loopProgressCurrent && state.loopProgressCurrent.chaos20Cleared) || Array.isArray(state && state.abyssClearedDepths) && state.abyssClearedDepths.map((v) => Math.floor(v || 0)).includes(20);
    }
    hasCurrentLoopChaosAccess(source) {
      let state = source || this.deps.game;
      if (this.hasCurrentLoopChaos20Clear(state)) return true;
      if (!state) return false;
      let maxZone = Number.isFinite(state.maxZoneId) ? state.maxZoneId : 0;
      if (maxZone >= this.data.ABYSS_START_ZONE_ID) return true;
      if (Array.isArray(state.abyssClearedDepths) && state.abyssClearedDepths.length > 0) return true;
      let currentDepth = typeof state.currentZoneId !== "string" ? this.difficulty.getAbyssDepthFromZoneId(state.currentZoneId) : 0;
      return currentDepth >= 1;
    }
    getHighestUnlockedEndlessChaosDepth(source) {
      let state = source || this.deps.game;
      let depths = [];
      if (Array.isArray(state && state.abyssUnlockedDepths)) {
        depths = state.abyssUnlockedDepths.map((v) => Math.floor(v || 0)).filter((v) => v >= 21);
      }
      let currentDepth = Math.floor(state && state.abyssEndlessDepth || 0);
      if (currentDepth >= 21) depths.push(currentDepth);
      return depths.length > 0 ? Math.max(...depths) : 0;
    }
    getLoopDeepChaosFrontierDepth(source) {
      let state = source || this.deps.game;
      let best = Math.floor(state && state.loopProgressCurrent && state.loopProgressCurrent.bestAbyssDepth || 0);
      return Math.max(21, best + 1);
    }
    getMeteorSiteUnlockReady(owner = this.deps.game) {
      return (owner.season || 1) >= this.deps.METEOR_SITE_UNLOCK_LOOP && (owner.maxZoneId || 0) >= this.deps.METEOR_SITE_UNLOCK_ACT;
    }
    getClearedSkyTowerFloor(source) {
      const tower = source && source.skyTower && typeof source.skyTower === "object" ? source.skyTower : {};
      const cleared = Array.isArray(tower.clearedFloors) ? tower.clearedFloors : [];
      const recorded = cleared.reduce((highest, floor) => Math.max(highest, Math.floor(Number(floor) || 0)), 0);
      return Math.max(recorded, Math.max(0, Math.floor(Number(tower.highestFloor) || 1) - 1));
    }
  };

  // modules/domain/realm-unlocks.mjs
  var RealmUnlockRules = class {
    constructor(deps, data2, { chaos: chaos2, progress: progress2 }) {
      this.deps = deps;
      this.data = data2;
      this.chaos = chaos2;
      this.progress = progress2;
      this.canEnterChaosRealm = this.canEnterChaosRealm.bind(this);
      this.underworldGateFacts = this.underworldGateFacts.bind(this);
      this.getUnderworldEntryBlock = this.getUnderworldEntryBlock.bind(this);
      this.getUnderworldEntryLockReason = this.getUnderworldEntryLockReason.bind(this);
      this.canEnterUnderworld = this.canEnterUnderworld.bind(this);
      this.underworldHasProgress = this.underworldHasProgress.bind(this);
      this.getUnderworldUnlockChecks = this.getUnderworldUnlockChecks.bind(this);
      this.isUnderworldUnlockReady = this.isUnderworldUnlockReady.bind(this);
      this.getCosmosUnlockChecks = this.getCosmosUnlockChecks.bind(this);
      this.isCosmosContentUnlockReady = this.isCosmosContentUnlockReady.bind(this);
      this.isMapPrimaryContentUnlockReady = this.isMapPrimaryContentUnlockReady.bind(this);
      this.isMapPrimaryContentUnlocked = this.isMapPrimaryContentUnlocked.bind(this);
      this.reconcileMapPrimaryContentUnlocks = this.reconcileMapPrimaryContentUnlocks.bind(this);
      this.getMapPrimaryContentEntryCondition = this.getMapPrimaryContentEntryCondition.bind(this);
      this.getPinnacleRequirementProgress = this.getPinnacleRequirementProgress.bind(this);
      this.getSeasonBossProgressGate = this.getSeasonBossProgressGate.bind(this);
    }
    canEnterChaosRealm() {
      return !!this.chaos.ensureChaosRealmState().unlocked && this.progress.hasCurrentLoopChaos20Clear();
    }
    underworldGateFacts(state) {
      const rootBosses = Array.isArray(state.clearedRootBosses) ? state.clearedRootBosses : [];
      return {
        chaosRealm: !!state.chaosRealm?.unlocked,
        cerberus: rootBosses.includes("s6_beast_cerberus"),
        deep: this.progress.getHighestUnlockedEndlessChaosDepth(state),
        labyrinth: Math.max(1, Math.floor(state.labyrinthUnlockedMaxFloor || state.labyrinthFloor || 1))
      };
    }
    getUnderworldEntryBlock(source) {
      const state = source || this.deps.game, { chaosRealm, cerberus, deep, labyrinth } = this.underworldGateFacts(state);
      if (!chaosRealm) return { label: this.deps._t("혼돈계 해금 필요"), route: "outside-chaos" };
      if (!this.progress.hasCurrentLoopChaos20Clear(state)) return { label: this.deps._t("이번 루프 혼돈 20 클리어 필요"), route: "map-explore-chaos" };
      if (!cerberus) return { label: this.deps._t("케르베로스 처치 필요"), route: "map-explore-root-boss" };
      if (deep < 30) return { label: this.deps._t("혼돈 심화 30층 필요 (현재 {floor})", { floor: deep }), route: "map-explore-chaos" };
      if (labyrinth < 100) return { label: this.deps._t("고대 미궁 100층 필요 (현재 {floor})", { floor: labyrinth }), route: "map-explore-labyrinth" };
      return null;
    }
    getUnderworldEntryLockReason(source) {
      return this.getUnderworldEntryBlock(source)?.label || "";
    }
    canEnterUnderworld() {
      return this.getUnderworldEntryLockReason(this.deps.game) === "";
    }
    underworldHasProgress(state) {
      const progress2 = state.underworldProgress;
      return Math.floor(progress2?.highestFloor || 1) > 1 || !!progress2?.floor10Cleared || Math.floor(state.underworldRunes?.unlockedSlots || 0) > 0;
    }
    getUnderworldUnlockChecks(state) {
      const { chaosRealm, cerberus, deep, labyrinth } = this.underworldGateFacts(state);
      const inherited = this.underworldHasProgress(state);
      return [
        ["혼돈계 개방 기록", inherited || chaosRealm, "outside-chaos"],
        ["케르베로스 처치", inherited || cerberus, "map-explore-root-boss"],
        ["혼돈 심화 30층 도달", inherited || deep >= 30, "map-explore-chaos"],
        ["고대 미궁 100층 도달", inherited || labyrinth >= 100, "map-explore-labyrinth"]
      ];
    }
    isUnderworldUnlockReady(source) {
      return this.getUnderworldUnlockChecks(source || this.deps.game).every((row) => row[1]);
    }
    getCosmosUnlockChecks(state) {
      const { unlocked, cleared, bossClears } = state.cosmosAtlas || {};
      const inherited = !!unlocked || [cleared, bossClears].some((rows) => Array.isArray(rows) && rows.length > 0);
      const journal = Array.isArray(state.journalEntries) ? state.journalEntries : [];
      const highest = Math.floor(state.underworldProgress?.highestFloor || 1);
      return [["혼돈 밖의 나무꾼 처치", inherited || journal.includes("woodsman"), "outside-chaos"], ["지하계 30층 도달", inherited || highest >= 30, "map-tab-underworld"]];
    }
    isCosmosContentUnlockReady(source) {
      return this.getCosmosUnlockChecks(source || this.deps.game).every((row) => row[1]);
    }
    isMapPrimaryContentUnlockReady(contentId, source) {
      let state = source || this.deps.game;
      if (contentId === "map-tab-zones") return true;
      if (contentId === "map-tab-pvp") return state.season >= this.deps.MAP_PRIMARY_CONTENTS.find((entry) => entry.id === contentId).unlockLoop;
      if (contentId === "map-tab-chaos-realm") return this.savedRealmUnlocked(state, "chaosRealm");
      if (contentId === "map-tab-sky") return this.savedRealmUnlocked(state, "skyTower");
      if (contentId === "map-tab-underworld") return this.isUnderworldUnlockReady(state);
      if (contentId === "map-tab-cosmos") return this.isCosmosContentUnlockReady(state);
      if (contentId === "map-tab-ocean" || contentId === "map-tab-fishing") {
        return this.oceanUnlockReady(state);
      }
      return false;
    }
    isMapPrimaryContentUnlocked(source, contentId) {
      let unlocked = Array.isArray(source && source.unlockedMapContents) ? source.unlockedMapContents : [];
      if (contentId === "map-tab-pvp" && !this.isMapPrimaryContentUnlockReady(contentId, source)) return false;
      return unlocked.includes(contentId);
    }
    reconcileMapPrimaryContentUnlocks(source) {
      if (!source || typeof source !== "object") return [];
      let validIds = new Set(this.deps.MAP_PRIMARY_CONTENTS.map((def) => def.id));
      let savedIds = Array.isArray(source.unlockedMapContents) ? source.unlockedMapContents : [];
      let unlocked = new Set(savedIds.filter((id) => validIds.has(id)));
      if (!this.isMapPrimaryContentUnlockReady("map-tab-pvp", source)) unlocked.delete("map-tab-pvp");
      let newlyUnlocked = [];
      this.deps.MAP_PRIMARY_CONTENTS.forEach((def) => {
        if (unlocked.has(def.id) || !this.isMapPrimaryContentUnlockReady(def.id, source)) return;
        unlocked.add(def.id);
        newlyUnlocked.push(def.id);
      });
      source.unlockedMapContents = this.deps.MAP_PRIMARY_CONTENTS.map((def) => def.id).filter((id) => unlocked.has(id));
      return newlyUnlocked;
    }
    getMapPrimaryContentEntryCondition(contentId, source) {
      let state = source || this.deps.game;
      if (!this.isMapPrimaryContentUnlocked(state, contentId)) return "";
      if (contentId === "map-tab-chaos-realm" && !this.progress.hasCurrentLoopChaos20Clear(state)) return this.deps._t("이번 루프 혼돈 20 클리어 필요");
      if (contentId === "map-tab-sky" && !this.progress.hasCurrentLoopChaosAccess(state)) return this.deps._t("혼돈 진입 필요");
      if (contentId === "map-tab-underworld") return this.getUnderworldEntryLockReason(state);
      return "";
    }
    getPinnacleRequirementProgress(requirement, source) {
      const target = Math.max(1, Math.floor(Number(requirement && requirement.target) || 1));
      if (!source || !requirement) return { met: false, current: 0, target, label: "진행 정보 없음" };
      if (requirement.kind === "underworldFloor") {
        return this.underworldRequirementProgress(source, target);
      }
      if (requirement.kind === "oceanDepth") {
        return this.oceanRequirementProgress(source, target);
      }
      if (requirement.kind === "skyFloor") {
        const current = this.progress.getClearedSkyTowerFloor(source);
        return { met: current >= target, current, target, label: `창공의 탑 ${current}/${target}층` };
      }
      return { met: false, current: 0, target, label: "알 수 없는 선행 조건" };
    }
    getSeasonBossProgressGate(zone, source) {
      const state = source || this.deps.game;
      if (!zone || !state) return { met: false, label: "진행 정보 없음" };
      if (Array.isArray(zone.requiresRivals)) {
        return this.rivalProgressGate(zone, state);
      }
      if (Array.isArray(zone.requiresCosmosBosses)) {
        return this.cosmosBossProgressGate(zone, state);
      }
      if (zone.pinnacleRequirement) return this.getPinnacleRequirementProgress(zone.pinnacleRequirement, state);
      if (Array.isArray(zone.requiresPinnacles)) {
        const cleared = new Set(Array.isArray(state.clearedRootBosses) ? state.clearedRootBosses : []);
        const current = zone.requiresPinnacles.filter((id) => cleared.has(id)).length;
        return { met: current >= zone.requiresPinnacles.length, current, target: zone.requiresPinnacles.length, label: `수호자 격파 ${current}/${zone.requiresPinnacles.length}` };
      }
      return { met: true, label: "" };
    }
    savedRealmUnlocked(state, key) {
      return !!(state && state[key] && state[key].unlocked);
    }
    oceanUnlockReady(state) {
      return this.savedRealmUnlocked(state, "ocean") || Math.max(1, Math.floor(state && state.season || 1)) >= this.deps.OCEAN_UNLOCK_LOOP;
    }
    underworldRequirementProgress(source, target) {
      const progress2 = source.underworldProgress && typeof source.underworldProgress === "object" ? source.underworldProgress : {};
      const current = Math.max(0, Math.floor(Number(progress2.highestFloor) || 1) - 1);
      return { met: current >= target, current, target, label: `지하계 ${current}/${target}층` };
    }
    oceanRequirementProgress(source, target) {
      const ocean2 = source.ocean && typeof source.ocean === "object" ? source.ocean : {};
      const current = Math.max(0, Math.floor(Number(ocean2.bossClearM) || 0));
      return { met: current >= target, current, target, label: `심해 가디언 ${current}/${target}m` };
    }
    rivalProgressGate(zone, state) {
      const progress2 = state.loopProgressCurrent && typeof state.loopProgressCurrent === "object" ? state.loopProgressCurrent : {};
      const cleared = new Set(Array.isArray(progress2.specialBosses) ? progress2.specialBosses : []);
      const current = zone.requiresRivals.filter((id) => cleared.has(id)).length;
      return { met: current >= zone.requiresRivals.length, current, target: zone.requiresRivals.length, label: `이번 루프 선행 결투 ${current}/${zone.requiresRivals.length}` };
    }
    cosmosBossProgressGate(zone, state) {
      const atlas2 = state.cosmosAtlas && typeof state.cosmosAtlas === "object" ? state.cosmosAtlas : {};
      const cleared = new Set(Array.isArray(atlas2.bossClears) ? atlas2.bossClears : []);
      const current = zone.requiresCosmosBosses.filter((id) => cleared.has(id)).length;
      return { met: current >= zone.requiresCosmosBosses.length, current, target: zone.requiresCosmosBosses.length, label: `이번 루프 은하 보스 ${current}/${zone.requiresCosmosBosses.length}` };
    }
  };

  // modules/state/ocean-progress.mjs
  var OceanProgressState = class {
    constructor(deps, data2) {
      this.deps = deps;
      this.data = data2;
      this.normalizedFishingStates = /* @__PURE__ */ new WeakSet();
      this.createDefaultOceanState = this.createDefaultOceanState.bind(this);
      this.getOceanPermanentUpgradeLevel = this.getOceanPermanentUpgradeLevel.bind(this);
      this.getOceanPermanentUpgradeEffect = this.getOceanPermanentUpgradeEffect.bind(this);
      this.ensureOceanPermanentUpgrades = this.ensureOceanPermanentUpgrades.bind(this);
      this.mergeOceanState = this.mergeOceanState.bind(this);
      this.ensureOceanState = this.ensureOceanState.bind(this);
      this.normalizeOceanDiveRecord = this.normalizeOceanDiveRecord.bind(this);
      this.getOceanOxygenMax = this.getOceanOxygenMax.bind(this);
      this.normalizeOceanFishingProgress = this.normalizeOceanFishingProgress.bind(this);
    }
    createDefaultOceanState() {
      return {
        unlocked: false,
        depthM: 0,
        checkpointM: 0,
        oxygenMax: 100,
        oxygenCur: 100,
        pressureLevel: 0,
        fishingGauge: 0,
        fishingStrategy: "balanced",
        rareFishPity: 0,
        reefInstalled: 0,
        fishStock: {},
        fishCaughtTotal: {},
        claimedCollectionMilestones: [],
        lastCatch: null,
        diving: false,
        lastTickAt: 0,
        bossClearM: 0,
        // 쓰러뜨린 몬스터가 쌓았지만 아직 내려가지 않은 거리(m, js/passives.js tickOceanDepth)
        descentPendingM: 0,
        // 자동 재잠수(js/combat-kill-rewards.js autoRediveOceanAfterClear): 마지막으로 떠오른 까닭('oxygen' | 'guardian' | 'defeat' | 'manual' | ''),
        // 잠수를 시작할 때의 소득 기록(getOceanDiveRecord), 소득 없이 떠오른 잠수가 이어진 수. 떠오르면 돌아갈 사냥터(잠수를
        // 시작한 액트나 혼돈 구역 id, 없으면 null)와 이 잠수가 자동 재잠수로 들어왔는지
        lastSurfaceReason: "",
        diveStartProgress: 0,
        fruitlessDives: 0,
        returnZoneId: null,
        autoDive: false,
        permanentUpgrades: { oxygenMax: 0, oxygenSaving: 0, pressureResist: 0 }
      };
    }
    getOceanPermanentUpgradeLevel(key, owner = this.deps.game) {
      let upgrades = owner && owner.ocean && owner.ocean.permanentUpgrades && typeof owner.ocean.permanentUpgrades === "object" ? owner.ocean.permanentUpgrades : {};
      let def = this.data.OCEAN_PERMANENT_UPGRADE_DEFS[key];
      if (!def) return 0;
      return Math.max(0, Math.min(def.maxLevel, Math.floor(upgrades[key] || 0)));
    }
    getOceanPermanentUpgradeEffect(key, owner = this.deps.game) {
      let def = this.data.OCEAN_PERMANENT_UPGRADE_DEFS[key];
      if (!def) return 0;
      return this.getOceanPermanentUpgradeLevel(key, owner) * def.valuePerLevel;
    }
    ensureOceanPermanentUpgrades(st) {
      st.permanentUpgrades = st.permanentUpgrades && typeof st.permanentUpgrades === "object" ? st.permanentUpgrades : {};
      this.data.OCEAN_PERMANENT_UPGRADE_KEYS.forEach((key) => {
        st.permanentUpgrades[key] = Math.max(0, Math.min(this.data.OCEAN_PERMANENT_UPGRADE_DEFS[key].maxLevel, Math.floor(st.permanentUpgrades[key] || 0)));
      });
    }
    mergeOceanState(savedOcean) {
      let source = savedOcean && typeof savedOcean === "object" && !Array.isArray(savedOcean) ? savedOcean : {};
      let merged = { ...this.createDefaultOceanState(), ...source };
      merged.permanentUpgrades = { ...this.createDefaultOceanState().permanentUpgrades, ...source.permanentUpgrades || {} };
      this.ensureOceanPermanentUpgrades(merged);
      if (!Object.prototype.hasOwnProperty.call(source, "fishCaughtTotal")) merged.fishCaughtTotal = null;
      this.normalizeOceanFishingProgress(merged);
      return merged;
    }
    ensureOceanState(owner = this.deps.game) {
      let st = owner.ocean && typeof owner.ocean === "object" ? owner.ocean : owner.ocean = this.createDefaultOceanState();
      st.unlocked = !!st.unlocked;
      this.normalizeDiveVitals(st, owner);
      this.normalizeFishingRuntime(st);
      st.diving = !!st.diving;
      st.drowning = !!st.drowning;
      st.drownSec = Math.max(0, Number(st.drownSec) || 0);
      this.normalizeOceanDiveRecord(st);
      if (!st.unlocked && (owner.season || 1) >= this.deps.OCEAN_UNLOCK_LOOP) st.unlocked = true;
      return st;
    }
    normalizeOceanDiveRecord(st) {
      const pending = Number(st.descentPendingM);
      st.descentPendingM = st.diving && Number.isFinite(pending) ? Math.max(0, pending) : 0;
      st.lastSurfaceReason = ["oxygen", "guardian", "defeat", "manual"].includes(st.lastSurfaceReason) ? st.lastSurfaceReason : "";
      st.diveStartProgress = Math.max(0, Math.floor(Number(st.diveStartProgress) || 0));
      st.fruitlessDives = Math.max(0, Math.min(this.deps.OCEAN_AUTO_REDIVE.missLimit, Math.floor(Number(st.fruitlessDives) || 0)));
      const back = st.returnZoneId;
      st.returnZoneId = Number.isInteger(back) || typeof back === "string" && back !== "" ? back : null;
      st.autoDive = st.autoDive === true;
    }
    getOceanOxygenMax(owner = this.deps.game) {
      return 100 + this.getOceanPermanentUpgradeEffect("oxygenMax", owner);
    }
    normalizeOceanFishingProgress(st) {
      st.fishStock = st.fishStock && typeof st.fishStock === "object" && !Array.isArray(st.fishStock) ? st.fishStock : {};
      let hasCaughtHistory = !!(st.fishCaughtTotal && typeof st.fishCaughtTotal === "object" && !Array.isArray(st.fishCaughtTotal));
      let caught = hasCaughtHistory ? st.fishCaughtTotal : st.fishStock;
      if (!hasCaughtHistory) st.fishCaughtTotal = {};
      this.data.OCEAN_STATE_FISH_KEYS.forEach((key) => {
        let stock = Math.max(0, Math.floor(Number(st.fishStock[key]) || 0));
        let total = Math.max(0, Math.floor(Number(caught[key]) || 0));
        st.fishStock[key] = stock;
        st.fishCaughtTotal[key] = Math.max(stock, total);
      });
      this.normalizeCollectionClaims(st);
      this.normalizeLastCatch(st);
      this.normalizedFishingStates.add(st);
    }
    normalizeLastCatch(st) {
      if (!st.lastCatch || !this.deps.OCEAN_FISH_DB[st.lastCatch.key]) st.lastCatch = null;
      else {
        st.lastCatch.at = Math.max(0, Math.floor(st.lastCatch.at || 0));
        st.lastCatch.guaranteed = !!st.lastCatch.guaranteed;
      }
    }
    normalizeFishingRuntime(st) {
      st.fishingGauge = Math.max(0, Math.min(100, Number(st.fishingGauge) || 0));
      st.fishingStrategy = this.deps.OCEAN_FISHING_STRATEGIES[st.fishingStrategy] ? st.fishingStrategy : "balanced";
      st.rareFishPity = Math.max(0, Math.min(100, Number(st.rareFishPity) || 0));
      st.reefInstalled = Math.max(0, Math.min(10, Math.floor(st.reefInstalled || 0)));
      if (!this.normalizedFishingStates.has(st)) this.normalizeOceanFishingProgress(st);
    }
    normalizeDiveVitals(st, owner) {
      st.depthM = Math.max(0, Number(st.depthM) || 0);
      st.checkpointM = Math.max(0, Math.floor(st.checkpointM || 0));
      st.bossClearM = Math.max(0, Math.floor(st.bossClearM || 0));
      this.ensureOceanPermanentUpgrades(st);
      st.oxygenMax = Math.max(1, Math.floor(this.getOceanOxygenMax(owner)));
      st.oxygenCur = Math.max(0, Math.min(st.oxygenMax, Number.isFinite(st.oxygenCur) ? st.oxygenCur : st.oxygenMax));
      st.pressureLevel = Math.max(0, Math.floor(st.pressureLevel || 0));
    }
    normalizeCollectionClaims(st) {
      let claims = st.claimedCollectionMilestones;
      let validClaims = Array.isArray(claims) && claims.every((value, index) => Number.isInteger(value) && this.data.OCEAN_COLLECTION_REQUIRED_COUNTS.includes(value) && claims.indexOf(value) === index);
      if (!validClaims) {
        let sourceClaims = Array.isArray(claims) ? claims : [];
        st.claimedCollectionMilestones = Array.from(new Set(sourceClaims.map((value) => Math.floor(value || 0)))).filter((value) => this.data.OCEAN_COLLECTION_REQUIRED_COUNTS.includes(value));
      }
    }
  };

  // modules/domain/ocean-environment.mjs
  var OceanEnvironment = class {
    constructor(deps, data2, { ocean: ocean2, difficulty: difficulty2 }) {
      this.deps = deps;
      this.data = data2;
      this.ocean = ocean2;
      this.difficulty = difficulty2;
      this.canEnterOceanDepth = this.canEnterOceanDepth.bind(this);
      this.getOceanOxygenSavingPct = this.getOceanOxygenSavingPct.bind(this);
      this.getOceanPressureResistUpgradePct = this.getOceanPressureResistUpgradePct.bind(this);
      this.getOceanOxygenDrainPerSec = this.getOceanOxygenDrainPerSec.bind(this);
      this.getOceanOxygenPerAttackCost = this.getOceanOxygenPerAttackCost.bind(this);
      this.getOceanDepthTier = this.getOceanDepthTier.bind(this);
      this.getOceanBossBoundaryInterval = this.getOceanBossBoundaryInterval.bind(this);
      this.getOceanPendingBossBoundary = this.getOceanPendingBossBoundary.bind(this);
      this.getOceanDiveRecord = this.getOceanDiveRecord.bind(this);
      this.getOceanFishingGaugeGainMul = this.getOceanFishingGaugeGainMul.bind(this);
    }
    canEnterOceanDepth() {
      return !!this.ocean.ensureOceanState().unlocked;
    }
    getOceanOxygenSavingPct(owner = this.deps.game) {
      return Math.max(0, Math.min(60, this.ocean.getOceanPermanentUpgradeEffect("oxygenSaving", owner)));
    }
    getOceanPressureResistUpgradePct(owner = this.deps.game) {
      return Math.max(0, Math.min(80, this.ocean.getOceanPermanentUpgradeEffect("pressureResist", owner)));
    }
    getOceanOxygenDrainPerSec(owner = this.deps.game) {
      let base = 0.5 * (1 - this.getOceanOxygenSavingPct(owner) / 100);
      let depthTier = this.getOceanDepthTier(owner && owner.ocean && owner.ocean.depthM || 0);
      let pressureResistPct = Math.max(0, Math.min(80, this.getOceanPressureResistUpgradePct(owner)));
      let pressureDrainMul = 1 + Math.min(1, depthTier * 0.07) * (1 - pressureResistPct / 100);
      if (this.difficulty.getOceanCurrentAffixes(depthTier).some((current) => current.id === "still_water")) pressureDrainMul *= 1.35;
      return Math.max(0.1, base * pressureDrainMul);
    }
    getOceanOxygenPerAttackCost() {
      return 0;
    }
    getOceanDepthTier(depthM) {
      return Math.floor(Math.max(0, Math.floor(depthM || 0)) / 100);
    }
    getOceanBossBoundaryInterval() {
      return 500;
    }
    getOceanPendingBossBoundary(st) {
      if (!st) return 0;
      let interval = this.getOceanBossBoundaryInterval();
      let cleared = Math.max(0, Math.floor(st.bossClearM || 0));
      let nextBoundary = Math.floor(cleared / interval) * interval + interval;
      return Math.floor(Math.max(0, Number(st.depthM) || 0)) >= nextBoundary ? nextBoundary : 0;
    }
    getOceanDiveRecord(st) {
      const caught = Object.values(st.fishCaughtTotal || {}).reduce((sum, count) => sum + Math.max(0, Math.floor(Number(count) || 0)), 0);
      return Math.max(0, Math.floor(st.checkpointM || 0)) + Math.max(0, Math.floor(st.bossClearM || 0)) + caught;
    }
    getOceanFishingGaugeGainMul(owner = this.deps.game) {
      let st = this.ocean.ensureOceanState(owner);
      return 1 + Math.max(0, Math.min(10, st.reefInstalled || 0)) * 0.15;
    }
  };

  // modules/state/sky-tower-progress.mjs
  var SkyTowerProgressState = class {
    constructor(deps, data2, { progress: progress2 }) {
      this.deps = deps;
      this.data = data2;
      this.progress = progress2;
      this.createDefaultSkyTowerState = this.createDefaultSkyTowerState.bind(this);
      this.ensureSkyTowerState = this.ensureSkyTowerState.bind(this);
      this.normalizeSkyTowerGemBoosts = this.normalizeSkyTowerGemBoosts.bind(this);
      this.getSkyTowerLoopClearLimit = this.getSkyTowerLoopClearLimit.bind(this);
      this.normalizeSkyTowerResult = this.normalizeSkyTowerResult.bind(this);
      this.getSkyStoneMaxLevel = this.getSkyStoneMaxLevel.bind(this);
      this.getSkyTowerGemBoostMaxLevel = this.getSkyTowerGemBoostMaxLevel.bind(this);
    }
    createDefaultSkyTowerState() {
      return {
        unlocked: false,
        highestFloor: 1,
        currentFloor: 1,
        clearedThisLoop: 0,
        clearedFloors: [],
        loopSeason: 1,
        lastResult: null,
        condensedPower: 0,
        skyStone: { crafted: false, level: 0 },
        gemBoosts: {}
      };
    }
    ensureSkyTowerState(owner = this.deps.game) {
      let st = owner && owner.skyTower && typeof owner.skyTower === "object" ? owner.skyTower : owner.skyTower = this.createDefaultSkyTowerState();
      let currentSeason = Math.max(1, Math.floor(owner && owner.season || 1));
      st.unlocked = !!st.unlocked;
      this.normalizeFloorProgress(st, currentSeason);
      this.normalizeSkyStone(st);
      this.normalizeSkyTowerGemBoosts(st);
      if (!st.unlocked && this.skyUnlockReached(owner, currentSeason)) st.unlocked = true;
      return st;
    }
    skyUnlockReached(owner, currentSeason) {
      return currentSeason > 15 || currentSeason >= 15 && this.progress.hasCurrentLoopChaos20Clear(owner);
    }
    normalizeSkyTowerGemBoosts(st) {
      st.gemBoosts = st.gemBoosts && typeof st.gemBoosts === "object" ? st.gemBoosts : {};
      Object.keys(st.gemBoosts).forEach((name) => {
        let lv = Math.max(0, Math.min(this.getSkyTowerGemBoostMaxLevel(), Math.floor(st.gemBoosts[name] || 0)));
        if (lv > 0) st.gemBoosts[name] = lv;
        else delete st.gemBoosts[name];
      });
    }
    getSkyTowerLoopClearLimit() {
      return 25;
    }
    normalizeSkyTowerResult(result, season) {
      if (!result || result.season !== season || !Number.isSafeInteger(result.floor) || result.floor < 1 || !Number.isSafeInteger(result.condensedPower) || result.condensedPower < 0 || !["first", "repeat", "practice"].includes(result.kind)) return null;
      return { season, floor: result.floor, kind: result.kind, condensedPower: result.condensedPower };
    }
    getSkyStoneMaxLevel() {
      return 15;
    }
    getSkyTowerGemBoostMaxLevel() {
      return 3;
    }
    normalizeFloorProgress(st, currentSeason) {
      st.highestFloor = Math.max(1, Math.floor(st.highestFloor || 1));
      st.currentFloor = Math.max(1, Math.min(st.highestFloor, Math.floor(st.currentFloor || 1)));
      st.loopSeason = Math.max(1, Math.floor(st.loopSeason || currentSeason));
      if (st.loopSeason !== currentSeason) {
        st.loopSeason = currentSeason;
        st.clearedThisLoop = 0;
      }
      st.lastResult = this.normalizeSkyTowerResult(st.lastResult, currentSeason);
      st.clearedThisLoop = Math.max(0, Math.min(this.getSkyTowerLoopClearLimit(), Math.floor(st.clearedThisLoop || 0)));
      st.clearedFloors = Array.isArray(st.clearedFloors) ? Array.from(new Set(st.clearedFloors.map((v) => Math.floor(v || 0)).filter((v) => v >= 1))).sort((a, b) => a - b) : [];
      st.condensedPower = Math.max(0, Math.floor(st.condensedPower || 0));
    }
    normalizeSkyStone(st) {
      st.skyStone = st.skyStone && typeof st.skyStone === "object" ? st.skyStone : { crafted: false, level: 0 };
      st.skyStone.level = Math.max(0, Math.min(this.getSkyStoneMaxLevel(), Math.floor(st.skyStone.level || 0)));
      st.skyStone.crafted = !!st.skyStone.crafted || st.skyStone.level > 0;
    }
  };

  // modules/domain/sky-tower-rules.mjs
  var SkyTowerRules = class {
    constructor(deps, data2, { sky: sky2, progress: progress2 }) {
      this.deps = deps;
      this.data = data2;
      this.sky = sky2;
      this.progress = progress2;
      this.getSkyTowerRemainingClears = this.getSkyTowerRemainingClears.bind(this);
      this.isSkyTowerAtRewardLimit = this.isSkyTowerAtRewardLimit.bind(this);
      this.maybeUnlockSkyTowerFromChaos20 = this.maybeUnlockSkyTowerFromChaos20.bind(this);
      this.canEnterSkyTower = this.canEnterSkyTower.bind(this);
      this.getSkyTowerTier = this.getSkyTowerTier.bind(this);
      this.getSkyTowerRewardAmount = this.getSkyTowerRewardAmount.bind(this);
      this.getSkyStoneReductionPct = this.getSkyStoneReductionPct.bind(this);
      this.getSkyStoneNextCost = this.getSkyStoneNextCost.bind(this);
      this.getSkyTowerGemBoostLevel = this.getSkyTowerGemBoostLevel.bind(this);
      this.getSkyTowerGemBoostCost = this.getSkyTowerGemBoostCost.bind(this);
    }
    getSkyTowerRemainingClears() {
      let st = this.sky.ensureSkyTowerState();
      return Math.max(0, this.sky.getSkyTowerLoopClearLimit() - Math.max(0, Math.floor(st.clearedThisLoop || 0)));
    }
    isSkyTowerAtRewardLimit(zone) {
      return zone?.type === "skyTower" && this.getSkyTowerRemainingClears() === 0;
    }
    *maybeUnlockSkyTowerFromChaos20() {
      let st = this.sky.ensureSkyTowerState();
      if (!st.unlocked && (this.deps.game.season || 1) >= 15 && this.progress.hasCurrentLoopChaos20Clear()) {
        st.unlocked = true;
        if ((this.deps.canAddLog ? "function" : "undefined") === "function") yield { kind: "addLog", args: [this.deps._t("☁️ 창공의 탑이 열렸습니다. 이후 루프에서는 혼돈 입성부터 도전할 수 있습니다."), "loot-unique"] };
        return true;
      }
      return false;
    }
    canEnterSkyTower() {
      let st = this.sky.ensureSkyTowerState();
      return !!st.unlocked && this.progress.hasCurrentLoopChaosAccess();
    }
    getSkyTowerTier(floor) {
      let safeFloor = Math.max(1, Math.floor(floor || 1));
      return 48 + Math.floor((safeFloor - 1) * 0.38);
    }
    getSkyTowerRewardAmount(floor) {
      let safeFloor = Math.max(1, Math.floor(floor || 1));
      return 3 + Math.floor(safeFloor / 5);
    }
    getSkyStoneReductionPct() {
      let st = this.sky.ensureSkyTowerState();
      return Math.max(0, Math.min(75, Math.floor(((st.skyStone || {}).level || 0) * 5)));
    }
    getSkyStoneNextCost() {
      let st = this.sky.ensureSkyTowerState();
      let lv = Math.max(0, Math.floor((st.skyStone || {}).level || 0));
      return 20 + lv * 10 + Math.floor(lv * lv * 2);
    }
    getSkyTowerGemBoostLevel(skillName) {
      let st = this.sky.ensureSkyTowerState();
      return Math.max(0, Math.min(this.sky.getSkyTowerGemBoostMaxLevel(), Math.floor((st.gemBoosts || {})[skillName] || 0)));
    }
    getSkyTowerGemBoostCost(skillName) {
      let lv = this.getSkyTowerGemBoostLevel(skillName);
      return [60, 120, 240][lv] || 999999;
    }
  };

  // modules/domain/challenge-zone-definitions.mjs
  var ChallengeZoneDefinitions = class {
    constructor(deps, data2, { difficulty: difficulty2 }) {
      this.deps = deps;
      this.data = data2;
      this.difficulty = difficulty2;
      this.normalizeCosmosDirectiveSnapshot = this.normalizeCosmosDirectiveSnapshot.bind(this);
      this.createCosmosChallengeZone = this.createCosmosChallengeZone.bind(this);
      this.getBeyondBoundaryTierProfile = this.getBeyondBoundaryTierProfile.bind(this);
      this.createBeyondBoundaryZone = this.createBeyondBoundaryZone.bind(this);
      this.createBeehiveZone = this.createBeehiveZone.bind(this);
      this.getGrandBreachProgress = this.getGrandBreachProgress.bind(this);
      this.createColonyZone = this.createColonyZone.bind(this);
      this.getUnderworldZone = this.getUnderworldZone.bind(this);
    }
    normalizeCosmosDirectiveSnapshot(source) {
      if (!source || typeof source !== "object") return null;
      const directive = this.canonicalCosmosDirective(source);
      return {
        id: String(directive.id || "survey"),
        name: String(directive.name || "안정 관측").slice(0, 40),
        ...this.cosmosDirectiveEffects(directive),
        rare: directive.rare === true
      };
    }
    createCosmosChallengeZone(state) {
      const challenge = this.activeCosmosChallenge(state);
      if (!challenge) return null;
      const galaxy = Math.max(0, Math.min(5, Math.floor(Number(challenge.galaxy) || 0)));
      return {
        id: "cosmos_challenge",
        name: `우주계 ${challenge.name || "행성"}`,
        type: "cosmos",
        tier: Math.max(1, Math.floor(challenge.tier || 1)),
        lootTier: Math.max(1, Math.floor(Number(challenge.lootTier) || (Math.max(1, galaxy) - 1) * 5 + 1)),
        maxKills: 1,
        ele: challenge.ele || "chaos",
        cosmosNodeId: challenge.nodeId || null,
        cosmosGalaxy: galaxy,
        cosmosTag: challenge.tag || "",
        cosmosMechanicId: challenge.mechanicId || "",
        ...this.cosmosChallengeMechanics(challenge)
      };
    }
    getBeyondBoundaryTierProfile(tierValue) {
      const tier = this.deps.clampNumber(Math.floor(Number(tierValue) || 1), 1, this.deps.BEYOND_BOUNDARY_TIER_CAP);
      const difficultyTier = tier + this.deps.BEYOND_BOUNDARY_DIFFICULTY_OFFSET;
      const mutatorIds = this.deps.BEYOND_BOUNDARY_MUTATOR_DB.filter((row) => tier >= row.tier).map((row) => row.id);
      let hpMul = Math.pow(this.deps.BEYOND_BOUNDARY_HP_GROWTH, difficultyTier - 1);
      let damageMul = Math.pow(this.deps.BEYOND_BOUNDARY_DAMAGE_GROWTH, difficultyTier - 1);
      let attackSpeedMul = 1;
      if (mutatorIds.includes("hardened")) hpMul *= 1.2;
      if (mutatorIds.includes("onslaught")) {
        damageMul *= 1.15;
        attackSpeedMul = 1.1;
      }
      return {
        tier,
        difficultyTier,
        hpMul,
        damageMul,
        attackSpeedMul,
        mutatorIds,
        drBonus: mutatorIds.includes("iron") ? 10 : 0,
        penetrationBonus: mutatorIds.includes("piercing") ? 10 : 0,
        regenRate: mutatorIds.includes("renewal") ? 25e-4 : 0
      };
    }
    createBeyondBoundaryZone(state) {
      const { run, profile, focus, intensity } = this.boundarySelection(state);
      const wave = run ? this.deps.clampNumber(Math.floor(Number(run.wave) || 1), 1, this.deps.BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER) : 1;
      return {
        id: this.deps.BEYOND_BOUNDARY_ZONE_ID,
        name: `경계 너머 ${profile.tier}단계, ${wave}/${this.deps.BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER}`,
        type: "beyondBoundary",
        tier: this.difficulty.getUnderworldTier(30) + Math.floor((profile.difficultyTier - 1) / 2),
        maxKills: 1,
        ele: "chaos",
        difficultyBenchmark: "underworld30",
        boundaryTier: profile.tier,
        boundaryWave: wave,
        boundaryDifficultyTier: profile.difficultyTier,
        boundaryFinalWave: wave === this.deps.BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER,
        boundaryHpMul: profile.hpMul * (focus.hpMul || 1) * intensity.hpMul,
        boundaryDamageMul: profile.damageMul * (focus.damageMul || 1) * intensity.damageMul,
        boundaryAttackSpeedMul: profile.attackSpeedMul * (focus.attackSpeedMul || 1) * intensity.attackSpeedMul,
        boundaryDrBonus: profile.drBonus,
        boundaryPenetrationBonus: profile.penetrationBonus + (focus.penetrationBonus || 0),
        boundaryRegenRate: profile.regenRate,
        boundaryRewardMul: this.deps.getBeyondBoundaryRewardMul(profile.tier),
        boundaryRewardFocusId: focus.id,
        boundaryIntensityId: intensity.id,
        boundaryCompletionRewardMul: intensity.rewardMul,
        boundaryMutatorIds: profile.mutatorIds
      };
    }
    createBeehiveZone(state) {
      const hive = state.beehive;
      const step = Math.max(1, Math.min(10, Math.floor(hive.branchStep || 1)));
      const entryDepth = Math.max(21, Math.floor(hive.entryDeepChaosDepth || 21));
      const empower = Math.max(0, Math.min(30, Math.floor(hive.enemyEmpower || 0)));
      const waveHpMul = 1.4 + (step - 1) * 0.16 + empower * 0.16;
      const waveAttackRateMul = 1.1 + empower * 0.025;
      const waveDamageMul = 1.2 + empower * 0.02;
      const queenHpMul = (1 + 9 * 0.16 + empower * 0.22) * 2.6;
      const rooms = typeof this.deps.actExplorationDoors === "object" && this.deps.actExplorationDoors.session();
      return {
        id: "beehive_run",
        name: `벌집 심층 ${step}갈래`,
        type: "beehive",
        tier: entryDepth,
        maxKills: 1,
        ele: "chaos",
        entryDeepChaosDepth: entryDepth,
        waveHpMul,
        waveAttackRateMul,
        waveDamageMul,
        bossMods: {
          hpMul: queenHpMul,
          atkMul: 1.35 + empower * 0.02,
          damageMul: 1.35 + empower * 0.025,
          critChanceBonus: 6,
          penetration: 8,
          patternMode: "burst"
        },
        ...rooms ? { exploration: this.deps.contentMaps.hive(state) } : null
      };
    }
    getGrandBreachProgress(value) {
      const number = Number(value);
      const requiredGauge = this.deps.GRAND_BREACH_ENCOUNTER.requiredGauge;
      const gauge = Number.isFinite(number) ? Math.min(requiredGauge, Math.max(0, Math.floor(number))) : 0;
      return {
        gauge,
        requiredGauge,
        percent: gauge * 100 / requiredGauge,
        stage: Number(gauge * 3 >= requiredGauge) + Number(gauge * 3 >= requiredGauge * 2),
        complete: gauge >= requiredGauge
      };
    }
    createColonyZone(state) {
      const colony = state.colony;
      const wave = colony.inRun ? Math.max(1, Math.floor(colony.wave || 1)) : 1;
      const depth = colony.inRun ? Math.max(21, Math.floor(colony.entryDeepChaosDepth || 21)) : Math.max(21, Math.min(state.abyssEndlessDepth || 21, state.loopProgressCurrent.bestAbyssDepth || 21));
      const wavePattern = ["charge", "sharpshooters", "carapace", "mixed", "overlord"][(wave - 1) % 5];
      const name = colony.inRun && colony.lootPending ? `군락지 ${wave - 1}웨이브 전리품 수거` : `군락지 방어 ${wave}웨이브`;
      return {
        id: "colony_run",
        name,
        type: "colony",
        tier: depth + Math.floor(wave / 2),
        maxKills: 1,
        ele: "chaos",
        entryDeepChaosDepth: depth,
        wavePattern,
        bossMods: { patternMode: "slam" }
      };
    }
    getUnderworldZone(floor) {
      return { id: this.data.UNDERWORLD_ZONE_ID, name: `지하계 ${floor}층`, type: "underworld", tier: this.difficulty.getUnderworldTier(floor), maxKills: 1, ele: "chaos", floor, ...this.deps.contentMaps.underworld(floor) };
    }
    canonicalCosmosDirective(source) {
      const definitions = Array.isArray(this.deps.COSMOS_EXPEDITION_DIRECTIVE_DB) ? this.deps.COSMOS_EXPEDITION_DIRECTIVE_DB : [];
      const requestedId = String(source.id || "survey");
      const canonical = definitions.find((row) => row && row.id === requestedId) || definitions.find((row) => row && row.id === "survey");
      return canonical || source;
    }
    cosmosDirectiveEffects(directive) {
      return {
        enemyHpMul: Math.max(0.5, Math.min(3, Number(directive.enemyHpMul) || 1)),
        enemyDamageMul: Math.max(0.5, Math.min(3, Number(directive.enemyDamageMul) || 1)),
        enemyAttackSpeedMul: Math.max(0.5, Math.min(2, Number(directive.enemyAttackSpeedMul) || 1)),
        rewardMul: Math.max(0.1, Math.min(5, Number(directive.rewardMul) || 1)),
        jackpotChance: Math.max(0, Math.min(0.5, Number(directive.jackpotChance) || 0)),
        jackpotBonusMul: Math.max(0, Math.min(5, Number(directive.jackpotBonusMul) || 0))
      };
    }
    activeCosmosChallenge(state) {
      const cosmos = state && state.cosmosAtlas && typeof state.cosmosAtlas === "object" ? state.cosmosAtlas : {};
      return cosmos.activeChallenge && typeof cosmos.activeChallenge === "object" ? cosmos.activeChallenge : null;
    }
    cosmosChallengeMechanics(challenge) {
      return {
        recommendedDps: Math.max(0, Math.floor(Number(challenge.recommendedDps) || 0)),
        recommendedEhp: Math.max(0, Math.floor(Number(challenge.recommendedEhp) || 0)),
        gravity: Math.max(1, Number(challenge.gravity || 1)),
        sizeClass: Math.max(1, Math.floor(challenge.sizeClass || 1)),
        theme: challenge.theme || "",
        cosmosDirective: this.normalizeCosmosDirectiveSnapshot(challenge.directive),
        cosmosHabitat: challenge.habitat
      };
    }
    boundarySelection(state) {
      const boundary = this.boundaryState(state);
      const run = boundary.activeRun && typeof boundary.activeRun === "object" ? boundary.activeRun : null;
      const selectedTier = run ? run.tier : boundary.selectedTier;
      const profile = this.getBeyondBoundaryTierProfile(selectedTier);
      const focusId = run ? run.rewardFocusId : boundary.selectedRewardFocusId;
      const intensityId = run ? run.intensityId : boundary.selectedIntensityId;
      const focus = this.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB.find((row) => row.id === focusId) || this.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB[0];
      const intensity = this.deps.BEYOND_BOUNDARY_INTENSITY_DB.find((row) => row.id === intensityId) || this.deps.BEYOND_BOUNDARY_INTENSITY_DB[0];
      return { run, profile, focus, intensity };
    }
    boundaryState(state) {
      return state && state.beyondBoundary && typeof state.beyondBoundary === "object" ? state.beyondBoundary : {};
    }
  };

  // modules/domain/world-zone-catalog.mjs
  var WorldZoneCatalog = class {
    constructor(deps, data2, { challenges: challenges2, difficulty: difficulty2, chaos: chaos2, sky: sky2, skyRules: skyRules2, rift: rift2, ocean: ocean2, oceanRules: oceanRules2 }) {
      this.deps = deps;
      this.data = data2;
      this.challenges = challenges2;
      this.difficulty = difficulty2;
      this.chaos = chaos2;
      this.sky = sky2;
      this.skyRules = skyRules2;
      this.rift = rift2;
      this.ocean = ocean2;
      this.oceanRules = oceanRules2;
      this.getRunZone = this.getRunZone.bind(this);
      this.getFloorZone = this.getFloorZone.bind(this);
      this.getUnderworldZoneNow = this.getUnderworldZoneNow.bind(this);
      this.getChaosRealmZoneNow = this.getChaosRealmZoneNow.bind(this);
      this.getSkyTowerZoneNow = this.getSkyTowerZoneNow.bind(this);
      this.getTimeRiftZone = this.getTimeRiftZone.bind(this);
      this.meteorSiteKind = this.meteorSiteKind.bind(this);
      this.getMeteorSiteZone = this.getMeteorSiteZone.bind(this);
      this.getOceanZoneNow = this.getOceanZoneNow.bind(this);
      this.getLabyrinthZoneNow = this.getLabyrinthZoneNow.bind(this);
      this.getChaosDepthZone = this.getChaosDepthZone.bind(this);
      this.getZone = this.getZone.bind(this);
    }
    getRunZone(id) {
      if (id === this.deps.ATLAS.zoneId) return this.deps.atlas.zone(this.deps.game);
      if (id === "cosmos_challenge") {
        const challengeZone = this.challenges.createCosmosChallengeZone(this.deps.game);
        return challengeZone ? this.deps.contentMaps.withRooms(challengeZone) : void 0;
      }
      if (id === this.deps.BEYOND_BOUNDARY_ZONE_ID) return this.deps.contentMaps.withRooms(this.challenges.createBeyondBoundaryZone(this.deps.game));
      if (id === "beehive_run") return this.challenges.createBeehiveZone(this.deps.game);
      if (id === "colony_run") return this.deps.contentMaps.withRooms(this.challenges.createColonyZone(this.deps.game));
      if (id === "grand_breach_run") {
        return this.deps.contentMaps.withRooms({
          id: "grand_breach_run",
          name: "대균열",
          type: "grandBreach",
          tier: 14,
          maxKills: 9999,
          ele: "chaos",
          bossMods: { hpMul: 4, atkMul: 1.25, damageMul: 1.5, patternMode: "intro" }
        });
      }
      if (id === this.data.OUTSIDE_CHAOS_ZONE_ID) return this.deps.contentMaps.withRooms({ id: this.data.OUTSIDE_CHAOS_ZONE_ID, name: "혼돈 밖", type: "outsideChaos", bossVisualId: "woodsman", tier: 25, maxKills: 1, ele: "chaos", fixedDifficultyMul: 1 });
      if (id === this.data.WOODSMAN_ECHO_ZONE_ID) return this.deps.contentMaps.withRooms({ id: this.data.WOODSMAN_ECHO_ZONE_ID, name: "나무꾼의 잔상", type: "woodsmanEcho", bossVisualId: "woodsman_echo", tier: this.difficulty.getChaosRealmTier(30), maxKills: 1, ele: "chaos" });
      return void 0;
    }
    getFloorZone(id) {
      if (id === this.data.CHAOS_REALM_ZONE_ID) return this.getChaosRealmZoneNow();
      if (id === this.data.SKY_TOWER_ZONE_ID) return this.getSkyTowerZoneNow();
      if (id === this.deps.TIME_RIFT_PAST_ZONE_ID || id === this.deps.TIME_RIFT_FUTURE_ZONE_ID) return this.getTimeRiftZone(id);
      if (id === this.data.UNDERWORLD_ZONE_ID) return this.getUnderworldZoneNow();
      if (id === this.deps.METEOR_FALL_ZONE_ID) return this.getMeteorSiteZone();
      if (id === this.deps.OCEAN_ZONE_ID) return this.getOceanZoneNow();
      if (id === this.deps.LABYRINTH_ZONE_ID) return this.getLabyrinthZoneNow();
      return void 0;
    }
    getUnderworldZoneNow() {
      let uw = this.deps.game && this.deps.game.underworldProgress || {};
      let floor = Math.max(1, Math.floor(uw.currentFloor || 1));
      return this.challenges.getUnderworldZone(floor);
    }
    getChaosRealmZoneNow() {
      let realm = this.chaos.ensureChaosRealmState();
      let floor = Math.max(1, Math.floor(realm.currentFloor || 1));
      return { id: this.data.CHAOS_REALM_ZONE_ID, name: `혼돈계 ${floor}층`, type: "chaosRealm", tier: this.difficulty.getChaosRealmTier(floor), maxKills: 1, ele: "chaos", floor, affixes: this.difficulty.getChaosRealmAffixes(floor), ...this.deps.contentMaps.chaosRealm(floor) };
    }
    getSkyTowerZoneNow() {
      let st = this.sky.ensureSkyTowerState();
      let floor = Math.max(1, Math.floor(st.currentFloor || 1));
      return { id: this.data.SKY_TOWER_ZONE_ID, name: `창공의 탑 ${floor}층`, type: "skyTower", tier: this.skyRules.getSkyTowerTier(floor), maxKills: 1, ele: "chaos", floor, ...this.deps.contentMaps.skyTower(floor) };
    }
    getTimeRiftZone(id) {
      let rift2 = this.rift.ensureTimeRiftState();
      let phase = id === this.deps.TIME_RIFT_PAST_ZONE_ID ? "past" : "future";
      let activePressure = this.deps.game.currentZoneId === id && rift2.activePressure ? rift2.activePressure : rift2.pressure;
      let depth = this.difficulty.getTimeRiftEquivalentChaosDepth(activePressure);
      let areaLevel = Math.round(this.deps.ATLAS.areaLevel.base + (depth - this.deps.ATLAS.difficulty.baseDepth) * this.deps.ATLAS.areaLevel.perTier / this.deps.ATLAS.difficulty.depthPerTier);
      return {
        id,
        name: `시간의 균열, ${phase === "past" ? "과거" : "미래"} (시간압 ${activePressure})`,
        type: "timeRift",
        riftPhase: phase,
        tier: this.difficulty.getAbyssZoneTier(depth),
        maxKills: 1,
        ele: "chaos",
        fixedSeason: this.difficulty.getTimeRiftFixedSeason(activePressure),
        equivalentDepth: depth,
        equivalentChaosDepth: depth,
        areaLevel,
        mapHpMul: phase === "past" ? 1 : 1.18,
        pressure: activePressure,
        ...this.deps.contentMaps.timeRift(phase, activePressure)
      };
    }
    meteorSiteKind(star) {
      const decided = this.deps.METEOR_KINDS.find((row) => row.id === star.kind), kind = decided || this.deps.METEOR_KINDS[0];
      return {
        id: kind.id,
        ele: kind.ele,
        bossHpMul: kind.bossHpMul || 1,
        extraEquipment: kind.extraEquipment || 0,
        zoneName: decided ? `운석 낙하 지점 (${decided.name})` : "운석 낙하 지점"
      };
    }
    getMeteorSiteZone() {
      let star = this.deps.game && this.deps.game.meteorSite || {};
      let allowBeyond20 = !!star.skyRiftAllCosmos;
      let tierCap = allowBeyond20 ? 40 : 20;
      let tier = star.activeMeteorTier || Math.max(8, Math.min(tierCap, Math.floor(star.skyRiftMinTier || 13)));
      const rooms = typeof this.deps.actExplorationDoors === "object" && this.deps.actExplorationDoors.session();
      const kind = this.meteorSiteKind(star);
      return {
        id: this.deps.METEOR_FALL_ZONE_ID,
        name: kind.zoneName,
        type: "meteor",
        meteorKind: kind.id,
        tier,
        rewardEquipmentCount: 1 + Math.min(2, Math.floor(tier / 20)) + kind.extraEquipment,
        maxKills: 1,
        ele: kind.ele,
        bossVisualId: "meteor-heart",
        bossMods: { hpMul: 2.2 * kind.bossHpMul, atkMul: 1.1, damageMul: 1.4, patternMode: "slam" },
        // 파편 무리 → 정예 호위 → 핵. 기존 운석 투기장은 핵만 세워 앞의 조우가 생략되었다.
        exploration: rooms ? { style: "act", act: this.deps.contentMaps.actForBiome("ruins"), seed: `meteor:${tier}`, chain: 2 } : this.deps.contentMaps.arena("meteor", "ruins")
      };
    }
    getOceanZoneNow() {
      let ocean2 = this.ocean.ensureOceanState();
      let depthM = Math.max(0, Math.floor(ocean2.depthM || 0));
      let depthTier = this.oceanRules.getOceanDepthTier(depthM);
      return this.deps.contentMaps.withRooms({ id: this.deps.OCEAN_ZONE_ID, name: `심해 ${depthM}m`, type: "oceanDepth", tier: this.difficulty.getChaosRealmTier(21) + depthTier, maxKills: 1, ele: "chaos", depthM, depthTier, currents: this.difficulty.getOceanCurrentAffixes(depthTier) });
    }
    getLabyrinthZoneNow(requestedFloor = this.deps.game.labyrinthFloor) {
      let floor = Math.max(1, Math.floor(requestedFloor || 1));
      let baseTier = Math.min(20, 7 + Math.floor(floor / 3));
      let over50 = Math.max(0, floor - 50);
      let over100 = Math.max(0, floor - 100);
      let extraTier = Math.floor(over50 / 5) + Math.floor(over100 / 3);
      return { id: this.deps.LABYRINTH_ZONE_ID, name: `고대 미궁 ${floor}층`, type: "labyrinth", bossVisualId: "labyrinth_guardian", tier: baseTier + extraTier, maxKills: 1, ele: "chaos", floor, exploration: this.deps.contentMaps.labyrinth(floor) };
    }
    getChaosDepthZone(id) {
      let depth = this.difficulty.getAbyssDepthFromZoneId(id);
      let displayDepth = depth;
      let baseZone = this.data.MAP_ZONES[Math.min(id, this.difficulty.getAbyssZoneIdForDepth(20))];
      return {
        ...baseZone || {},
        id,
        name: displayDepth > 20 ? `혼돈 심화 ${displayDepth}` : `혼돈 ${displayDepth}`,
        type: "abyss",
        tier: this.difficulty.getAbyssZoneTier(displayDepth),
        maxKills: 1,
        ele: "chaos",
        depth: displayDepth,
        baseDepth: Math.min(20, depth),
        isEndlessDepth: displayDepth > 20,
        ...this.deps.contentMaps.chaos(displayDepth)
      };
    }
    getZone(id) {
      let zone = this.getRunZone(id);
      if (zone === void 0) zone = this.getFloorZone(id);
      if (zone !== void 0) return zone;
      if (typeof id === "string") {
        if (id.startsWith("trial_")) return this.deps.contentMaps.trialCorridor(this.deps.TRIAL_ZONES.find((t) => t.id === id));
        let seasonBossZone = this.deps.SEASON_BOSS_ZONES.find((t) => t.id === id);
        if (seasonBossZone) return this.deps.contentMaps.withArena(seasonBossZone, this.deps.contentMaps.bossBiome(seasonBossZone));
      }
      if (Number.isFinite(id) && id >= this.data.ABYSS_START_ZONE_ID) return this.getChaosDepthZone(id);
      return this.data.MAP_ZONES[id];
    }
  };

  // modules/state/time-rift-progress.mjs
  var TimeRiftState = class {
    constructor(deps, data2) {
      this.deps = deps;
      this.data = data2;
      this.ensureTimeRiftState = this.ensureTimeRiftState.bind(this);
      this.normalizeTimeRiftResult = this.normalizeTimeRiftResult.bind(this);
    }
    ensureTimeRiftState() {
      if (!this.deps.game.timeRift || typeof this.deps.game.timeRift !== "object") this.deps.game.timeRift = {};
      let st = this.deps.game.timeRift;
      st.pressure = Math.max(1, Math.min(this.deps.TIME_RIFT_MAX_PRESSURE, Math.floor(st.pressure || 1)));
      st.activePressure = Number.isFinite(st.activePressure) ? Math.max(1, Math.min(this.deps.TIME_RIFT_MAX_PRESSURE, Math.floor(st.activePressure))) : null;
      st.altarOpen = !!st.altarOpen;
      st.altarUnique = st.altarUnique && typeof st.altarUnique === "object" ? st.altarUnique : null;
      st.altarRare = st.altarRare && typeof st.altarRare === "object" ? st.altarRare : null;
      st.fusionCount = Math.max(0, Math.floor(st.fusionCount || 0));
      return st;
    }
    normalizeTimeRiftResult(value) {
      if (!value || typeof value !== "object") return null;
      const numbers = ["id", "pressure", "inherited", "lost", "season"];
      if (!numbers.every((key) => Number.isSafeInteger(value[key]) && value[key] >= 0)) return null;
      if (![value.id, value.season, value.pressure].every((number) => number > 0)) return null;
      if (value.pressure > this.deps.TIME_RIFT_MAX_PRESSURE) return null;
      if (!Number.isSafeInteger(value.inherited + value.lost)) return null;
      if (typeof value.name !== "string" || typeof value.instanceId !== "string" || !value.instanceId.trim()) return null;
      return {
        id: value.id,
        name: value.name.slice(0, 100),
        instanceId: value.instanceId.trim().slice(0, 96),
        pressure: value.pressure,
        inherited: value.inherited,
        lost: value.lost,
        season: value.season
      };
    }
  };

  // modules/domain/time-rift-inheritance.mjs
  var TimeRiftInheritance = class {
    constructor(deps, data2) {
      this.deps = deps;
      this.data = data2;
      this.getTimeRiftOptionKeepChance = this.getTimeRiftOptionKeepChance.bind(this);
      this.getTimeRiftLossOdds = this.getTimeRiftLossOdds.bind(this);
      this.getTimeRiftFusionGrade = this.getTimeRiftFusionGrade.bind(this);
    }
    getTimeRiftOptionKeepChance(pressure, keptSoFar = 0) {
      let p = Math.max(1, Math.min(this.deps.TIME_RIFT_MAX_PRESSURE, Math.floor(pressure || 1)));
      return (keptSoFar < this.deps.TIME_RIFT_KEEP_CAP ? this.deps.TIME_RIFT_OPTION_KEEP : this.deps.TIME_RIFT_OPTION_KEEP_PAST_CAP)[p - 1];
    }
    getTimeRiftLossOdds(pressure, count = 6) {
      let n = Math.max(0, Math.floor(count)), kept = [1];
      for (let i = 0; i < n; i++) {
        let next = Array(kept.length + 1).fill(0);
        kept.forEach((chance, k) => {
          let keep = this.getTimeRiftOptionKeepChance(pressure, k);
          next[k + 1] += chance * keep;
          next[k] += chance * (1 - keep);
        });
        kept = next;
      }
      return kept.map((_, lost) => kept[n - lost]);
    }
    getTimeRiftFusionGrade(lost, count) {
      if (lost <= 0) return "perfect";
      return lost * 2 <= count ? "normal" : "unstable";
    }
  };

  // modules/domain/loop-entry-progress.mjs
  var LoopEntryProgress = class {
    constructor(deps, data2, { progress: progress2, difficulty: difficulty2 }) {
      this.deps = deps;
      this.data = data2;
      this.progress = progress2;
      this.difficulty = difficulty2;
      this.getSeasonAbyssDepthCap = this.getSeasonAbyssDepthCap.bind(this);
      this.getLoopAbyssRequirementText = this.getLoopAbyssRequirementText.bind(this);
      this.getLoopAbyssRequirementPrompt = this.getLoopAbyssRequirementPrompt.bind(this);
      this.hasCurrentLoopChaosRequirementClear = this.hasCurrentLoopChaosRequirementClear.bind(this);
      this.hasCurrentLoopCosmosRequirementClear = this.hasCurrentLoopCosmosRequirementClear.bind(this);
      this.hasCurrentLoopAbyssRequirementClear = this.hasCurrentLoopAbyssRequirementClear.bind(this);
      this.getAvailableLoopAdvancePaths = this.getAvailableLoopAdvancePaths.bind(this);
      this.markLoopCosmosPlanetClear = this.markLoopCosmosPlanetClear.bind(this);
      this.getSeasonFinalZoneId = this.getSeasonFinalZoneId.bind(this);
      this.getCurrentSeasonFinalZoneId = this.getCurrentSeasonFinalZoneId.bind(this);
      this.getVisibleHuntingMapCapZoneId = this.getVisibleHuntingMapCapZoneId.bind(this);
      this.applySeasonContentProgression = this.applySeasonContentProgression.bind(this);
      this.loopGateDepthName = this.loopGateDepthName.bind(this);
      this.hasLoopGateCosmosPath = this.hasLoopGateCosmosPath.bind(this);
    }
    getSeasonAbyssDepthCap(seasonValue) {
      let season = Math.max(1, Math.floor(seasonValue || 1));
      if (season > 30) return this.deps.LOOP_GATE_ABYSS_DEPTH_CAP + (season - 30);
      let uncapped = season <= 9 ? 10 + (season - 1) : 20 + (season - 10);
      return Math.min(this.deps.LOOP_GATE_ABYSS_DEPTH_CAP, uncapped);
    }
    getLoopAbyssRequirementText(seasonValue) {
      let depth = this.loopGateDepthName(this.getSeasonAbyssDepthCap(seasonValue));
      if (!this.hasLoopGateCosmosPath(seasonValue)) return `루프 조건: ${depth} 클리어`;
      return `루프 조건(이번 루프 안): ${depth} 클리어는 혼돈 루프, 우주계 ${this.deps.LOOP_GATE_ALT_COSMOS_PLANET_NAME} 행성 돌파는 우주계 루프`;
    }
    getLoopAbyssRequirementPrompt(seasonValue) {
      const cap = this.getSeasonAbyssDepthCap(seasonValue);
      const depth = `${this.deps._t(cap > 20 ? "혼돈 심화" : "혼돈")} ${cap}`;
      return this.hasLoopGateCosmosPath(seasonValue) ? this.deps._t("이번 루프에 {depth} 클리어나 우주계 {planet} 행성 돌파가 먼저 필요합니다.", { depth, planet: this.deps._t(this.deps.LOOP_GATE_ALT_COSMOS_PLANET_NAME) }) : this.deps._t("이번 루프에 {depth} 클리어가 먼저 필요합니다.", { depth });
    }
    hasCurrentLoopChaosRequirementClear(seasonValue) {
      let season = Math.max(1, Math.floor(seasonValue || this.deps.game && this.deps.game.season || 1));
      let cap = this.getSeasonAbyssDepthCap(season);
      let progress2 = this.deps.game && this.deps.game.loopProgressCurrent || {};
      if (cap < 20) return (this.deps.game.abyssClearedDepths || []).some((depth) => depth >= cap);
      return cap === 20 ? this.progress.hasCurrentLoopChaos20Clear() : Math.max(0, Math.floor(progress2.bestAbyssDepth || 0)) >= cap;
    }
    hasCurrentLoopCosmosRequirementClear(seasonValue) {
      let season = Math.max(1, Math.floor(seasonValue || this.deps.game && this.deps.game.season || 1));
      if (season < this.deps.LOOP_GATE_ALT_START_SEASON) return false;
      let progress2 = this.deps.game && this.deps.game.loopProgressCurrent || {};
      return Array.isArray(progress2.cosmosPlanets) && progress2.cosmosPlanets.includes(this.deps.LOOP_GATE_ALT_COSMOS_PLANET_ID);
    }
    hasCurrentLoopAbyssRequirementClear(seasonValue) {
      return this.hasCurrentLoopChaosRequirementClear(seasonValue) || this.hasCurrentLoopCosmosRequirementClear(seasonValue);
    }
    getAvailableLoopAdvancePaths(seasonValue) {
      let paths = [];
      if (this.hasCurrentLoopChaosRequirementClear(seasonValue)) paths.push("chaos");
      if (this.hasCurrentLoopCosmosRequirementClear(seasonValue)) paths.push("cosmos");
      return paths;
    }
    markLoopCosmosPlanetClear(nodeId) {
      if (!nodeId || !this.deps.game || (this.deps.game.season || 1) < this.deps.LOOP_GATE_ALT_START_SEASON) return false;
      this.deps.game.loopProgressCurrent = this.deps.game.loopProgressCurrent || {};
      let planets = Array.isArray(this.deps.game.loopProgressCurrent.cosmosPlanets) ? this.deps.game.loopProgressCurrent.cosmosPlanets : [];
      let fresh = !planets.includes(nodeId);
      if (fresh) planets.push(nodeId);
      this.deps.game.loopProgressCurrent.cosmosPlanets = planets;
      return fresh && nodeId === this.deps.LOOP_GATE_ALT_COSMOS_PLANET_ID;
    }
    getSeasonFinalZoneId(seasonValue) {
      return this.data.LAST_STORY_ZONE_ID + this.getSeasonAbyssDepthCap(seasonValue);
    }
    getCurrentSeasonFinalZoneId() {
      return this.getSeasonFinalZoneId(this.deps.game.season || 1);
    }
    getVisibleHuntingMapCapZoneId() {
      return Math.min(this.getCurrentSeasonFinalZoneId(), this.difficulty.getAbyssZoneIdForDepth(20));
    }
    *applySeasonContentProgression(options) {
      const opts = options;
      this.deps.game.unlockedSeasonContents = Array.isArray(this.deps.game.unlockedSeasonContents) ? this.deps.game.unlockedSeasonContents : [];
      this.deps.game.seenSeasonContentNotices = Array.isArray(this.deps.game.seenSeasonContentNotices) ? this.deps.game.seenSeasonContentNotices : [];
      let roadmapMaxLoop = Math.max(...Object.keys(this.deps.SEASON_CONTENT_ROADMAP).map(Number));
      let maxSeason = Math.max(1, Math.min(roadmapMaxLoop, this.deps.game.season || 1));
      for (let s = 1; s <= maxSeason; s++) {
        yield* this.recordSeasonUnlock(s, opts);
      }
      this.clampSeasonZoneProgress();
    }
    loopGateDepthName(cap) {
      return `${cap > 20 ? "혼돈 심화" : "혼돈"} ${cap}`;
    }
    hasLoopGateCosmosPath(seasonValue) {
      return Math.max(1, Math.floor(seasonValue || 1)) >= this.deps.LOOP_GATE_ALT_START_SEASON;
    }
    *recordSeasonUnlock(s, opts) {
      let key = `season_${s}`;
      if (!this.deps.game.unlockedSeasonContents.includes(key)) this.deps.game.unlockedSeasonContents.push(key);
      if (!opts.silent && !this.deps.game.contentProgression && !this.deps.game.seenSeasonContentNotices.includes(key) && this.deps.SEASON_CONTENT_ROADMAP[s]) {
        let def = this.deps.SEASON_CONTENT_ROADMAP[s];
        yield { kind: "addLog", args: [this.deps._t("🧩 루프 {s} [{title}] 이정표 개방", { s, title: this.deps._t(def.title) }), "season-up"] };
        for (const line of (def.features || []).slice(0, 2)) yield { kind: "addLog", args: [`   - ${line}`, "loot-magic"] };
        this.deps.game.seenSeasonContentNotices.push(key);
      }
    }
    clampSeasonZoneProgress() {
      let finalZone = this.getCurrentSeasonFinalZoneId();
      this.deps.game.maxZoneId = this.deps.clampNumber(Number.isFinite(this.deps.game.maxZoneId) ? this.deps.game.maxZoneId : 0, 0, finalZone);
      if (typeof this.deps.game.currentZoneId !== "string") {
        let currentZone = Number.isFinite(this.deps.game.currentZoneId) ? this.deps.game.currentZoneId : 0;
        let deepChaosZone = (this.deps.game.season || 1) >= 10 && this.difficulty.getAbyssDepthFromZoneId(currentZone) > 20;
        this.deps.game.currentZoneId = deepChaosZone ? currentZone : this.deps.clampNumber(currentZone, 0, finalZone);
      }
    }
  };

  // modules/combat/chaos-navigation.mjs
  var ChaosNavigation = class {
    constructor(deps, data2, { zones: zones2, progress: progress2, difficulty: difficulty2 }) {
      this.deps = deps;
      this.data = data2;
      this.zones = zones2;
      this.progress = progress2;
      this.difficulty = difficulty2;
      this.getContentReturnZoneId = this.getContentReturnZoneId.bind(this);
      this.getAutoProgressZoneId = this.getAutoProgressZoneId.bind(this);
      this.enterNextEndlessChaosDepth = this.enterNextEndlessChaosDepth.bind(this);
      this.enterUnlockedEndlessDepth = this.enterUnlockedEndlessDepth.bind(this);
    }
    getContentReturnZoneId(state = this.deps.game) {
      const id = state.currentZoneId;
      return typeof id !== "string" || this.zones.getFloorZone(id) !== void 0 ? id : this.getAutoProgressZoneId(state.maxZoneId);
    }
    getAutoProgressZoneId(fallbackZoneId) {
      if ((this.deps.game.season || 1) < 10 || !this.progress.hasCurrentLoopChaos20Clear()) return fallbackZoneId;
      let depth = this.progress.getLoopDeepChaosFrontierDepth();
      this.deps.game.abyssEndlessDepth = depth;
      this.deps.ensureNextEndlessChaosDepthUnlocked(depth - 1);
      return this.difficulty.getAbyssZoneIdForDepth(depth);
    }
    *enterNextEndlessChaosDepth(clearedZone) {
      if (this.isMapTravelLocked()) {
        if ((this.deps.canWarnBeehiveMapTravelBlocked ? "function" : "undefined") === "function") return yield { kind: "warnBeehiveMapTravelBlocked", args: [] };
        return;
      }
      if ((this.deps.game.season || 1) < 10) return;
      this.deps.game.abyssEndlessDepth = Math.max(20, Math.floor(this.deps.game.abyssEndlessDepth || 20) + 1);
      this.deps.game.abyssUnlockedDepths = Array.isArray(this.deps.game.abyssUnlockedDepths) ? this.deps.game.abyssUnlockedDepths : [20];
      if (!this.deps.game.abyssUnlockedDepths.includes(this.deps.game.abyssEndlessDepth)) this.deps.game.abyssUnlockedDepths.push(this.deps.game.abyssEndlessDepth);
      this.deps.game.currentZoneId = this.difficulty.getAbyssZoneIdForDepth(this.deps.game.abyssEndlessDepth);
      this.deps.game.killsInZone = 0;
      this.deps.game.combatHalted = false;
      this.deps.game.runProgress = 0;
      yield { kind: "addLog", args: [this.deps._t("♾️ 혼돈 심화 {abyssEndlessDepth}층 진입", { abyssEndlessDepth: this.deps.game.abyssEndlessDepth }), "season-up"] };
      yield { kind: "enterAutomaticMapInterruptionAfterClear", args: [clearedZone] };
      yield { kind: "startMoving", args: [true] };
      yield { kind: "updateStaticUI", args: [] };
    }
    *enterUnlockedEndlessDepth(depth) {
      if (this.isMapTravelLocked()) {
        if ((this.deps.canWarnBeehiveMapTravelBlocked ? "function" : "undefined") === "function") return yield { kind: "warnBeehiveMapTravelBlocked", args: [] };
        return;
      }
      if ((this.deps.game.season || 1) < 10) return;
      this.deps.game.abyssUnlockedDepths = Array.isArray(this.deps.game.abyssUnlockedDepths) ? this.deps.game.abyssUnlockedDepths : [20];
      depth = Math.max(20, Math.floor(depth || 20));
      if (!this.deps.game.abyssUnlockedDepths.includes(depth)) return yield { kind: "addLog", args: [this.deps._t("아직 도달하지 않은 심화 층수입니다."), "attack-monster"] };
      this.deps.game.abyssEndlessDepth = depth;
      this.deps.game.currentZoneId = this.difficulty.getAbyssZoneIdForDepth(depth);
      this.deps.game.killsInZone = 0;
      this.deps.game.combatHalted = false;
      this.deps.game.runProgress = 0;
      yield { kind: "addLog", args: [this.deps._t("🧭 기록된 혼돈 심화 {depth}층으로 이동", { depth }), "season-up"] };
      yield { kind: "startMoving", args: [true] };
      yield { kind: "updateStaticUI", args: [] };
    }
    isMapTravelLocked() {
      return typeof this.deps.isBeehiveRunLockedForMapTravel === "function" ? this.deps.isBeehiveRunLockedForMapTravel() : !!(this.deps.game.beehive && this.deps.game.beehive.inRun);
    }
  };

  // modules/domain/loop-permanent-bonuses.mjs
  var LoopPermanentBonuses = class {
    constructor(deps, data2) {
      this.deps = deps;
      this.data = data2;
      this.getLoop10StatCost = this.getLoop10StatCost.bind(this);
      this.allocateLoop10BonusStat = this.allocateLoop10BonusStat.bind(this);
      this.getWorldTreeBarkLayers = this.getWorldTreeBarkLayers.bind(this);
      this.getWorldTreeBarkReach = this.getWorldTreeBarkReach.bind(this);
      this.getWorldTreeBarkEarned = this.getWorldTreeBarkEarned.bind(this);
      this.normalizeWorldTreeBark = this.normalizeWorldTreeBark.bind(this);
      this.getLoopDeepStatCost = this.getLoopDeepStatCost.bind(this);
      this.allocateLoopDeepStat = this.allocateLoopDeepStat.bind(this);
    }
    getLoop10StatCost(statKey, owner = this.deps.game) {
      owner.loop10BonusStats = owner.loop10BonusStats || { flatHp: 0, flatDmg: 0, aspd: 0, move: 0 };
      let lv = Math.max(0, Math.floor(owner.loop10BonusStats[statKey] || 0));
      return 1 + Math.floor(lv / 3);
    }
    *allocateLoop10BonusStat(statKey) {
      if ((this.deps.game.season || 1) < 10) return;
      if (this.deps.game.woodsmanBuildLock) return yield { kind: "addLog", args: [this.deps._t("☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다."), "attack-monster"] };
      let cost = this.getLoop10StatCost(statKey);
      if ((this.deps.game.seasonPoints || 0) < cost) return yield { kind: "addLog", args: [this.deps._t("루프 포인트가 부족합니다. (필요: {cost})", { cost }), "attack-monster"] };
      this.deps.game.loop10BonusStats = this.deps.game.loop10BonusStats || { flatHp: 0, flatDmg: 0, aspd: 0, move: 0 };
      this.deps.game.loop10BonusStats[statKey] = Math.max(0, Math.floor(this.deps.game.loop10BonusStats[statKey] || 0)) + 1;
      this.deps.game.seasonPoints -= cost;
      yield { kind: "addLog", args: [this.deps._t("🧬 루프10 강화: {statKey} 투자 +1 (비용 {cost})", { statKey: this.deps.getStatName(statKey), cost }), "season-up"] };
      yield { kind: "updateStaticUI", args: [] };
    }
    getWorldTreeBarkLayers(season) {
      const loop2 = Math.max(1, Math.floor(Number(season) || 1));
      return this.deps.WORLD_TREE_BARK.loops.filter((at) => loop2 >= at).length;
    }
    getWorldTreeBarkReach(owner) {
      return Math.min(this.deps.WORLD_TREE_BARK.maxZones, this.deps.WORLD_TREE_BARK.baseZones + Math.max(0, Math.floor(Number((owner.worldTreeBark || {}).reach) || 0)));
    }
    getWorldTreeBarkEarned(owner) {
      const rule = this.deps.WORLD_TREE_BARK.points, loop2 = Math.max(1, Math.floor(Number(owner.season) || 1));
      if (loop2 < rule.startLoop) return 0;
      const journal = Array.isArray(owner.journalEntries) ? owner.journalEntries : [], goals = (owner.worldTreeBark || {}).timeGoals;
      return rule.start + (loop2 - rule.startLoop) * rule.perLoop + this.deps.PINNACLE_FIRST_KILL_JOURNALS.filter((id) => journal.includes(id)).length * rule.pinnacle + (Array.isArray(goals) ? goals.length : 0) * rule.actTenGoal;
    }
    normalizeWorldTreeBark(raw, owner) {
      const bark = raw && typeof raw === "object" ? raw : {}, rule = this.deps.WORLD_TREE_BARK.points;
      const best = Math.floor(Number(((owner.records || {}).actBest || {})[rule.actTenZoneId]) || 0);
      const timeGoals = Array.isArray(bark.timeGoals) ? rule.actTenMinutes.filter((goal) => bark.timeGoals.includes(goal)) : rule.actTenMinutes.filter((goal) => best > 0 && best <= goal * 6e4);
      const clean = { timeGoals };
      let room = this.getWorldTreeBarkEarned({ ...owner, worldTreeBark: clean });
      this.deps.WORLD_TREE_BARK.stats.forEach((def) => {
        const points = Math.max(0, Math.floor(Number(bark[def.key]) || 0));
        clean[def.key] = Math.min(points, room, def.max === null ? Infinity : def.max);
        room -= clean[def.key];
      });
      return clean;
    }
    getLoopDeepStatCost(statKey) {
      this.deps.game.loopDeepStats = this.deps.game.loopDeepStats || { flatHp: 0, flatDmg: 0, resChaos: 0, aspd: 0, move: 0, dr: 0, crit: 0 };
      let lv = Math.max(0, Math.floor(this.deps.game.loopDeepStats[statKey] || 0));
      return 1 + Math.floor(lv / 2);
    }
    *allocateLoopDeepStat(statKey) {
      if (!this.deps.contentProgression.isUnlocked("deepTree") || !this.deps.LOOP_DEEP_STATS.some((def) => def.key === statKey)) return;
      if ((this.deps.game.season || 1) < 10) return;
      let cost = this.getLoopDeepStatCost(statKey);
      if ((this.deps.game.loopDeepPoints || 0) < cost) return yield { kind: "addLog", args: [this.deps._t("심화 루프 포인트가 부족합니다. (필요: {cost})", { cost }), "attack-monster"] };
      this.deps.game.loopDeepStats = this.deps.game.loopDeepStats || { flatHp: 0, flatDmg: 0, resChaos: 0, aspd: 0, move: 0, dr: 0, crit: 0 };
      this.deps.game.loopDeepStats[statKey] = Math.max(0, Math.floor(this.deps.game.loopDeepStats[statKey] || 0)) + 1;
      this.deps.game.loopDeepPoints -= cost;
      yield { kind: "addLog", args: [this.deps._t("🧬 심화 루프 강화: {label} Lv.{level} (비용 {cost})", { label: this.deps._t(this.deps.LOOP_DEEP_STATS.find((def) => def.key === statKey).label), level: this.deps.game.loopDeepStats[statKey], cost }), "season-up"] };
      yield { kind: "updateStaticUI", args: [] };
    }
  };

  // modules/domain/passive-progression.mjs
  var PassiveProgression = class {
    constructor(deps, data2) {
      this.deps = deps;
      this.data = data2;
      this.getAscendanciesForClass = this.getAscendanciesForClass.bind(this);
      this.getAscendancyOrder = this.getAscendancyOrder.bind(this);
      this.isAscendancyOfClass = this.isAscendancyOfClass.bind(this);
      this.getAllAscendKeystoneDefs = this.getAllAscendKeystoneDefs.bind(this);
      this.pickRandomAscendKeystoneId = this.pickRandomAscendKeystoneId.bind(this);
      this.rememberLoopAscendancyPlan = this.rememberLoopAscendancyPlan.bind(this);
      this.getAscendKeystoneName = this.getAscendKeystoneName.bind(this);
      this.getSeasonPassiveNodeDef = this.getSeasonPassiveNodeDef.bind(this);
      this.getAllSeasonPassiveNodeIds = this.getAllSeasonPassiveNodeIds.bind(this);
      this.getSeasonPassiveUnlockLoop = this.getSeasonPassiveUnlockLoop.bind(this);
      this.getPassiveStatTierValue = this.getPassiveStatTierValue.bind(this);
      this.hasPermanentTalentTabUnlock = this.hasPermanentTalentTabUnlock.bind(this);
      this.syncPermanentTalentTabUnlock = this.syncPermanentTalentTabUnlock.bind(this);
      this.normalizeCombatTacticsSettings = this.normalizeCombatTacticsSettings.bind(this);
      this.hasCombatTacticsUnlockProgress = this.hasCombatTacticsUnlockProgress.bind(this);
      this.isFreePassiveStartNodeId = this.isFreePassiveStartNodeId.bind(this);
      this.getPaidPassiveNodeIds = this.getPaidPassiveNodeIds.bind(this);
    }
    getAscendanciesForClass(classId) {
      const list = this.deps.ASCENDANCIES_BY_PLAYER_CLASS[classId];
      return list ? list.slice() : Object.keys(this.deps.CLASS_TEMPLATES);
    }
    getAscendancyOrder() {
      return Object.values(this.deps.ASCENDANCIES_BY_PLAYER_CLASS).flat();
    }
    isAscendancyOfClass(ascendId, classId) {
      return this.getAscendanciesForClass(classId).includes(ascendId);
    }
    getAllAscendKeystoneDefs() {
      let out = [];
      Object.keys(this.deps.CLASS_KEYSTONE_DEFS || {}).forEach((cls) => {
        (this.deps.CLASS_KEYSTONE_DEFS[cls] || []).forEach((node) => {
          if (node && node.id) out.push(node);
        });
      });
      return out;
    }
    pickRandomAscendKeystoneId(classId = this.deps.game.selectedClassId) {
      const allowed = new Set(this.getAscendanciesForClass(classId));
      let defs = Object.keys(this.deps.CLASS_KEYSTONE_DEFS).filter((cls) => allowed.has(cls)).flatMap((cls) => this.deps.CLASS_KEYSTONE_DEFS[cls] || []);
      if (!defs.length) defs = this.getAllAscendKeystoneDefs();
      if (!defs.length) return null;
      return defs[Math.floor(Math.random() * defs.length)].id;
    }
    rememberLoopAscendancyPlan(state = this.deps.game) {
      const keystones = Array.isArray(state.ascendKeystones) ? state.ascendKeystones.slice() : [];
      if (state.ascendClass && this.deps.CLASS_TEMPLATES[state.ascendClass]) {
        state.lastLoopAscendPlan = { ascendClass: state.ascendClass, nodes: (state.ascendNodes || []).slice(), keystones: keystones.slice() };
      }
      return keystones;
    }
    getAscendKeystoneName(id) {
      if (!id) return "";
      let node = this.getAllAscendKeystoneDefs().find((n) => n && n.id === id);
      return node ? node.name : id;
    }
    getSeasonPassiveNodeDef(id) {
      return this.data.SEASON_NODES[id] || this.data.SEASON_INNER_NODES[id] || null;
    }
    getAllSeasonPassiveNodeIds() {
      return Object.keys(this.data.SEASON_NODES).concat(Object.keys(this.data.SEASON_INNER_NODES));
    }
    getSeasonPassiveUnlockLoop(id) {
      if (this.data.SEASON_INNER_NODES[id]) return 1;
      const rowIndex = this.data.SEASON_NODE_ROWS.findIndex((row) => row.includes(id));
      return rowIndex >= 4 ? 5 : 1;
    }
    getPassiveStatTierValue(statKey, tier) {
      const statDef = this.data.P_STATS[statKey];
      if (!statDef) return tier === 3 ? 8 : tier === 2 ? 4 : 2;
      if (tier === 0) return 10;
      const size = tier === 1 || tier === 2 ? tier : 3;
      const key = this.data.PASSIVE_TIER_SIZE_ORDER[size].find((name) => statDef[name] !== void 0);
      return key ? statDef[key] : this.data.PASSIVE_TIER_FALLBACK[size];
    }
    hasPermanentTalentTabUnlock(state) {
      if (!state || typeof state !== "object") return false;
      if (Math.max(0, Math.floor(Number(state.talentBloomClears) || 0)) > 0) return true;
      if (["talentBloomCombos", "bloomedClasses"].some((key) => Array.isArray(state[key]) && state[key].length > 0)) return true;
      if (state.talentCards && typeof state.talentCards === "object" && Object.keys(state.talentCards).length > 0) return true;
      return false;
    }
    syncPermanentTalentTabUnlock(state) {
      if (!state || typeof state !== "object") return state;
      state.unlocks = state.unlocks && typeof state.unlocks === "object" ? state.unlocks : {};
      if (this.hasPermanentTalentTabUnlock(state)) state.unlocks.talent = true;
      if (state.npcMet && Object.keys(state.npcMet).length) state.unlocks.npcs = true;
      return state;
    }
    normalizeCombatTacticsSettings(settings) {
      let target = settings && this.data.COMBAT_TACTIC_TARGET_PRIORITIES.includes(settings.combatTargetPriority) ? settings.combatTargetPriority : "nearest";
      let position = settings && this.data.COMBAT_TACTIC_POSITION_MODES.includes(settings.combatPositionMode) ? settings.combatPositionMode : "auto";
      return { targetPriority: target, positionMode: position };
    }
    hasCombatTacticsUnlockProgress(state) {
      if (!state || typeof state !== "object") return false;
      let journal = [
        ...Array.isArray(state.journalUnlocked) ? state.journalUnlocked : [],
        ...Array.isArray(state.journalEntries) ? state.journalEntries : []
      ];
      let claimed = Array.isArray(state.claimedActRewards) ? state.claimedActRewards : [];
      return journal.includes("act_3") || claimed.includes(2) || Math.floor(Number(state.maxZoneId) || 0) >= 3;
    }
    isFreePassiveStartNodeId(nodeId) {
      if (String(nodeId) === "n0") return true;
      const authoredNodes = typeof this.deps.PASSIVE_TREE_V22 !== "undefined" && this.deps.PASSIVE_TREE_V22 ? this.deps.PASSIVE_TREE_V22.nodes : null;
      const node = authoredNodes && authoredNodes[String(nodeId)];
      return !!(node && node.kind === "start");
    }
    getPaidPassiveNodeIds(nodeIds) {
      return (Array.isArray(nodeIds) ? nodeIds : []).filter((nodeId) => !this.isFreePassiveStartNodeId(nodeId));
    }
  };

  // modules/state/default-game.mjs
  var DEFAULT_GAME_BLUEPRINT = {
    // 세계수 아틀라스 (js/atlas.js normalize): unlocked/completed/bonus/autoMap survive loops; stash/run reset each loop.
    // stash: map items {uid,node,tier,rarity,mods:[{id,roll}],quality,corrupted}; run: the open map {map,portals,drops,returnZoneId}.
    // passives: atlas passive ids (js/atlas-passives.js); fragments: {id: count} per loop; loadout: fragment ids the device uses.
    // seeds: world-tree seeds 0..4 (pinnacle); epoch: {count, essence, perks} of the atlas rebirth layer (js/atlas-epoch.js).
    // endgame: the awakened late atlas (js/atlas-endgame.js) — kills, materials, blight, witness; survives loops, not the epoch.
    atlas: {
      version: 1,
      unlocked: false,
      completed: [],
      bonus: [],
      passives: [],
      seeds: 0,
      stash: [],
      fragments: {},
      loadout: [],
      nextUid: 1,
      run: null,
      lastResult: null,
      autoMap: false,
      autoGuardians: true,
      starterSeason: 0,
      epoch: { count: 0, essence: 0, perks: {} },
      endgame: { kills: {}, items: {}, blight: {}, witness: 0, witnessed: [] },
      leaves: { counts: {}, seen: [], woven: {} },
      tally: { maps: 0, treasure: 0, golden: 0 }
    },
    // Last map's committed combat receipts; display only, never a claimable reward.
    explorationLoot: null,
    cosmosRoute: null,
    // Transient gravity pulse: {nextPulseAt: combat ms, steps: 0..2}; reset at load/exit.
    cosmosGravity: null,
    cosmosRouteBoard: { seed: 1, selected: 0, goal: "dust", decisions: { 1: "survey", 3: "survey" }, habitats: ["swarm", "guard", "storm"], retryAt: 0 },
    combatTimeMs: 0,
    // Permanent across loops (docs/late-game-review-20261008.md): weapon mastery experience per weapon category
    // (js/weapon-mastery.js) and the chronicle's claimed rings (js/chronicle.js).
    weaponMastery: { xp: {} },
    chronicle: { rings: 0 },
    saveVersion: 21,
    // 20(2026-10-30): 장비 줄의 다시 만들 수 있는 칸을 빼고 저장한다(js/item-save-slim.js). 21(2026-11-09): resonancePower에서 봉인 몫을 뺐다(js/save-migrations.js removeOldSealResonanceSave)
    // Permanent ledger: income follows CONTENT_UNLOCK_POINT_AWARDS (contentProgression.earnedBy), starting at loop two. carry: points a
    // save from before 2026-10-21 keeps beyond those awards (the earlier table's), 0 for a new game. The default stays version 9: a save
    // without a ledger takes it during the load, and the bag counts its pages by loop until contentProgression.restore makes the ledger
    // (version 10 with graftFloor, js/content-progression.js) and turns those pages into owned 가방 쪽 steps.
    knitting: { season: 1, counts: {}, seen: [], knitted: {}, once: [] },
    contentProgression: { version: null, highestLoop: 1, carry: 0, unlocked: [], paidCosts: {}, inherited: [], automatic: [], grandfathered: [], plannedUnlockId: "" },
    loopChallenge: null,
    loopChallengeHistory: [],
    level: 1,
    exp: 0,
    season: 1,
    loopCount: 0,
    combatTacticsUnlocked: false,
    woodsmanDefeatAttempts: 0,
    woodsmanSimulatorSeenLoop: false,
    woodsmanEntrancePending: false,
    woodsmanCurseActive: false,
    woodsmanCurseDamageTakenStacks: 0,
    woodsmanCurseLastTickAt: 0,
    woodsmanCurseNextLogStack: 0,
    currentZoneId: 0,
    maxZoneId: 0,
    killsInZone: 0,
    loopDeaths: 0,
    loopKills: 0,
    // 루프의 첫 처치가 직업 무기를 떨어뜨렸는가(js/combat-kill-rewards.js grantLoopStarterWeaponOnFirstKill), 첫 루프의 그 무기가 장착 안내를 기다리는 동안 그 아이템 id
    loopStarterWeaponGranted: false,
    starterWeaponTutorialPending: null,
    // 기초 스킬(js/basic-skills.js): 이번 루프의 속성 선택지({ loop, elements }, 고를 때까지)와 지난번 고른 속성(자동 루프가 쓴다)
    basicSkillOffer: null,
    basicSkillElement: "",
    // 변이시간선(js/loop-mutation.js): 규칙이 걸린 루프 번호(0이면 없음)
    loopMutationSeason: 0,
    settings: {
      effectIntensity: "system",
      // PC와 모바일 메뉴 편집은 서로의 순서·배치를 덮어쓰지 않는다.
      tabLayouts: {
        desktop: { tabOrder: [], tabPlacement: {}, tabGroupOrder: [] },
        mobile: { tabOrder: [], tabPlacement: {}, tabGroupOrder: [] }
      },
      cameraShake: true,
      runeTimingOff: false,
      // 룬 강화의 담금질을 건너뛴다
      hitEmphasis: "normal",
      // normal | mild; presentation only
      bgm: true,
      // 배경음(js/bgm-ui.js)
      bgmVolume: 70,
      // 0..100 percent; 효과음과 따로
      uiSounds: true,
      soundVolume: 100,
      // 0..100 percent of the existing sound mix; independent of mute
      showCombatLog: true,
      showDetailedDamageLog: false,
      combatLogAggregate: true,
      combatLogRateLimit: true,
      showSpawnLog: true,
      showStoryLog: true,
      // the hero's, NPCs' and bosses' lines in the combat log (js/canvas-act-title-card.js logStoryLine)
      showExpLog: true,
      showLootLog: true,
      showCrowdPauseLog: true,
      showDeathNotice: true,
      showActJournal: true,
      showMobileBattlePip: true,
      pauseGameOnOverlay: true,
      twoRowTabs: false,
      damageNumberFormat: "comma",
      showExpComma: true,
      showHpComma: true,
      showEnemyHpComma: true,
      showCharacterComma: true,
      uiScale: 100,
      uiScaleChosen: null,
      // 사용자가 배율을 고른 적이 있는가(null: 모름 → 100이면 화면에 맞춰 고른다, js/ui-display.js applySaved)
      language: "ko",
      // 글과 숫자 표기 언어(data/locales, js/i18n.js). 주소의 ?lang=은 저장을 바꾸지 않고 그 판에서만 덮는다.
      uiSkin: "rift",
      highContrast: false,
      /** PC 단축키 중 기본값과 다른 것만: { 동작 id: KeyboardEvent.code | '' } (data/hotkeys.js) */
      hotkeyOverrides: {},
      heroAppearanceMode: "loop",
      leftPaneCollapsed: false,
      combatLogCollapsed: false,
      mobileCombatLogExpanded: false,
      autoEquipEmptySlots: true,
      collapsePastLoopMilestones: true,
      autoSalvageEnabled: false,
      autoSalvageRarities: { normal: true, magic: true, rare: false, unique: false },
      inventoryViewRarities: { normal: true, magic: true, rare: true, unique: true },
      bagArrangeOrder: "recent",
      // 가방 정리 기준(js/equipment-inventory-grid.js ARRANGE_ORDERS): 정리 단추를 두 번 누르면 이 기준
      equipmentMobilePane: "inventory",
      itemFilterEnabled: false,
      itemFilterRarities: { normal: true, magic: true, rare: true, unique: true },
      itemFilterTierThreshold: 10,
      itemFilterMinTierCount: 0,
      itemFilterMinHiddenTier: 1,
      itemFilterOnlyNewCodexUnique: false,
      // 줍기 필터 세분화(2026-10-10 사용자): 희귀도마다 최소 티어, 부위, 무기 종류, 항상 줍는 예외(js/item-rolls.js passesItemPickupFilter).
      itemFilterMinTiers: { normal: 1, magic: 1, rare: 1, unique: 1 },
      itemFilterSlots: { 무기: true, 투구: true, 갑옷: true, 장갑: true, 신발: true, 목걸이: true, 반지: true, 허리띠: true, 방패: true },
      itemFilterWeaponCategories: { greatsword: true, scimitar: true, shortbow: true, orb: true, flask: true, censer: true },
      itemFilterAlways: { exceptional: true, fineRare: true, socket: true, corrupted: false, newUnique: true, influenced: true, ward: true },
      // 발견 연출(js/battle-ground-loot-ui.js 빛기둥, 알림창): 플레이어가 고른다.
      lootFx: { beams: { jackpot: true, great: true, good: true }, notices: { chase: true, goldenRule: true, treasure: true, codex: true, leaf: true } },
      equipmentTargets: { enabled: false, slot: "any", scope: "explicit", minMatches: 1, rules: [] },
      autoEnterMeteor: false,
      autoEnterGrandBreach: false,
      autoRediveOcean: false,
      // 자동 환생(js/loop-automation-ui.js): 관문을 채우면 몇 초 뒤 다음 루프로, 다음 직업은 'ask' | 'keep'.
      autoLoop: false,
      autoLoopClass: "ask",
      mapCompleteAction: "nextZone",
      actExplorationMode: "direct",
      // 탐험 자동 이동(미니맵 단추 · 단축키). 끄면 이동 명령으로만 움직이고 새 탐험도 직접 이동으로 시작한다.
      autoMove: true,
      disableItemAutomationAfterLoop: true,
      postLoopMapCompleteAction: "nextLoopBestPlusOne",
      townReturnAction: "retry",
      combatTargetPriority: "nearest",
      combatPositionMode: "auto",
      passiveTreeShowLabels: false,
      passiveTreeVisualStyleVersion: 2,
      passiveInvestmentSummaryCollapsed: true,
      passiveTreePlanner: { layoutVersion: null, activeSlot: 0, autoInvest: false, presets: [null, null, null] },
      tabNotiEnabled: true,
      socialChatNotifications: true,
      chatMessageSize: "medium",
      notiFilters: { char: true, season: true, items: true, skills: true, map: true, codex: true, traits: true, cube: true, jewel: true, journal: true, currency: true, fossil: true, ascend: true, loop: true, social: true }
    },
    selectedHeroId: "hero1",
    selectedClassId: "archer",
    classTalentAlignmentVersion: 1,
    talentSelectionInitialized: false,
    appearanceClassId: null,
    discoveredClassIds: [],
    heroSelectionInitialized: false,
    classFreeSwitchUnlocked: false,
    talentBloomClears: 0,
    talentBloomCombos: [],
    bloomedClasses: [],
    bloomLoopSpecGranted: null,
    bloomedClassThisLoop: null,
    bloomedTalentThisLoop: null,
    pendingTalentBloomHeroId: null,
    bloomBossDefeated: false,
    talentCards: {},
    talentCardLoadout: [null, null, null, null, null, null],
    bloomTrialRegenSuppress: 0,
    pendingLoopHeroSelection: false,
    unlockedMonsterSkins: {},
    passivePoints: 0,
    playerHp: 100,
    playerEnergyShield: 0,
    moveTimer: 0,
    moveTotalTime: 0,
    isTownReturning: false,
    combatHalted: false,
    inTicketBossFight: false,
    runProgress: 0,
    encounterIndex: 0,
    encounterPlan: [],
    actExploration: null,
    enemies: [],
    playerAilments: [],
    playerLeechInstances: [],
    realmDeathWard: null,
    realmInvulnerableBarrierUntil: 0,
    nextEnemyId: 1,
    summons: [],
    summonSeq: 1,
    passives: [],
    passiveAttributePreference: "strength",
    passiveAttributeChoices: {},
    passiveSpecialization: {
      revelation: "combat",
      keystoneChoices: { wisdom_leap_element: "fire" },
      cycleBuffs: [],
      fanaticism: { skillName: "", stacks: 0 },
      karma: { byEnemy: {}, buff: null }
    },
    voidPassives: {},
    retiredVoidPassives: {},
    discoveredPassives: [],
    passiveLayoutVersion: null,
    passiveStarEvolution: false,
    passiveStarEvolutionSource: null,
    skills: ["기본 공격"],
    activeSkill: "기본 공격",
    weaponBlockedSkill: "",
    // 지금 무기로 못 써 기본 공격으로 바꿔 둔 주 공격 룬(js/skills.js fitActiveSkillToWeapon)
    mobilitySkill: "",
    // 이동 스킬 칸 (js/mobility-skill.js): a gem tagged 'mobility', worn next to the main gem
    equippedSummonSkills: [],
    summonSkillCounts: {},
    summonLoadoutInitialized: false,
    gemData: { "기본 공격": { level: 1, exp: 0 } },
    supports: [],
    sealedSkills: [],
    sealedSupports: [],
    resonancePower: 10,
    equippedSupports: [],
    supportGemData: {},
    itemSubtab: "item-tab-equip",
    skillSubtab: "skill-tab-equip",
    skillAutoRules: [],
    beyondBoundary: {
      version: null,
      unlocked: false,
      unlockNoticeSeen: false,
      highestTier: 1,
      selectedTier: 1,
      selectedSealId: "edge",
      completions: 0,
      bestTier: 0,
      selectedRewardFocusId: "armory",
      selectedIntensityId: "plain",
      seals: { edge: { level: 0, xp: 0 }, ward: { level: 0, xp: 0 }, stride: { level: 0, xp: 0 } },
      activeRun: null
    },
    clearedRootBosses: [],
    timeRift: { pressure: 1, activePressure: null, altarOpen: false, altarUnique: null, altarRare: null, fusionCount: 0, lastFusion: null },
    mapSubtab: "map-tab-zones",
    unlockedMapContents: ["map-tab-zones"],
    // 지도 탭의 처음 화면은 세계 지도다(2026-11-09 사용자: 지도 안내가 구버전 맵으로 이동시킴). 액트 목록은 그 안의 세부 지역.
    mapExploreSubtab: "map-explore-atlas",
    gemFoldInactiveAttack: false,
    gemFoldInactiveSupport: false,
    autoRepeatSeasonBoss: false,
    // 액막이1~5: 액막이 칸(2026-10-10, js/colony-wards.js). 열린 칸 수는 허리띠, 초월 공허, 가디언, 고유가 정한다.
    // 코어: 코어 칸(2026-10-10, js/bag-items.js). 코어는 가방에 들어가고 이 칸에 하나를 낀다.
    equipment: {
      "무기": null,
      "투구": null,
      "갑옷": null,
      "방패": null,
      "장갑1": null,
      "장갑2": null,
      "신발": null,
      "목걸이": null,
      "반지1": null,
      "반지2": null,
      "반지3": null,
      "허리띠": null,
      "액막이1": null,
      "액막이2": null,
      "액막이3": null,
      "액막이4": null,
      "액막이5": null,
      "코어": null
    },
    equipmentLoadouts: { identityVersion: 1, selectedSlot: 0, presets: [null, null, null] },
    equipmentInventoryPlacements: {},
    // 그루터기 함 5×5 조합창: 재료를 가리키기만 한다(js/stump-cube.js).
    stumpCube: { slots: [], known: null },
    equipmentTemporaryStorage: [],
    inventory: [],
    jewelInventoryExpandLevel: 0,
    chaosInfuserUnlocked: false,
    abyssClearedDepths: [],
    craftingWorkspace: { discovered: [], goal: { statId: "", minTier: 0 } },
    // 한 번이라도 가진 재화(js/currency-exchange.js): 오르가에게서 살 수 있는 재화. 루프가 지나도 남는다.
    currencySeen: [],
    currencies: { magicBud: 0, sapBud: 0, formlessDew: 0, goldenRule: 0, emberBranch: 0, burningEmberBranch: 0, catalystPhys: 0, catalystFire: 0, catalystCold: 0, catalystLight: 0, catalystChaos: 0, catalystCrit: 0, catalystSummon: 0, oilFire: 0, oilCold: 0, oilLight: 0, oilChaos: 0, ouroboros: 0, blightSpore: 0, pruningShears: 0, fairyRing: 0, blessing: 0, bossKeyFlame: 0, bossKeyFrost: 0, bossKeyStorm: 0, beastKeyCerberus: 0, bossCore: 0, fossil: 0, fossilPrimal: 0, fossilAncientPrimal: 0, fossilPrimordial: 0, fossilJagged: 0, fossilBound: 0, fossilGale: 0, fossilPrismatic: 0, fossilAbyssal: 0, fossilBulwark: 0, fossilWedge: 0, fossilOld: 0, fossilRift: 0, deepWhetstone: 0, rootIron: 0, jewelPolish: 0, abyssCatalyst: 0, uberRootTicketFlame: 0, uberRootTicketFrost: 0, uberRootTicketStorm: 0, uberRootTicketChaos: 0, runeShard: 0, skyEssence: 0, jewelCore: 0, jewelShard: 0, sealShard: 0, strongSealShard: 0, radiantSealShard: 0, hiveKey: 0, colonyTrace: 0, colonyShard: 0, enchantedHoney: 0, venomStinger: 0, pollen: 0, beeswax: 0, starDust: 0, awakenedEcho: 0, voidChisel: 0, underCopper: 0, underSilver: 0, underGold: 0 },
    ascendClass: null,
    lastLoopAscendPlan: null,
    ascendPoints: 0,
    ascendKeystonePoints: 0,
    ascendRank: 0,
    ascendNodes: [],
    ascendKeystones: [],
    completedTrials: [],
    unlockedTrials: [],
    seasonPoints: 0,
    loopDeepPoints: 0,
    woodsmanPendingScore: 0,
    woodsmanLifetimeScore: 0,
    woodsmanSettledScore: 0,
    woodsmanEchoRun: { active: false, timeLeft: 0, duration: 30, lastTickAt: 0, totalDamage: 0, bestDps: 0 },
    seasonNodes: [],
    seasonNodeLevels: {},
    labyrinthFloor: 1,
    /** @type {{season:number,floor:number,currencies:Record<string,number>}|null} Display-only completion receipt; never paid on load. */
    labyrinthLastResult: null,
    jewelInventory: [],
    // 가방의 새 아이템(빨간 점): id가 이보다 크면 새 것. 가방을 열었다가 닫으면 그때의 itemIdCounter가 된다(js/equipment-window-ui.js).
    bagSeenId: null,
    // waveExtra: 0..2 extra normal enemies for the selected wave only; cleared before the next choice or queen.
    beehive: { unlockedPermanent: false, inRun: false, branchStep: 0, cleared: false, routeSeed: 0, waveExtra: 0 },
    // Core durability is an integer. A zero maximum means a new/legacy run needs initialization.
    // returnAfterWave: 0 or a boss-wave integer (multiple of 5). lastResult: null or {kind, wave, completed, lostHeld} integer counts.
    colony: {
      inRun: false,
      wave: 0,
      highestWave: 0,
      kills: 0,
      requiredKills: 0,
      coreMaxHp: 0,
      coreHp: 0,
      failedWave: 0,
      rewardPending: false,
      returnAfterWave: 0,
      lastResult: null,
      pendingLoot: [],
      lootPending: false,
      bossLootCell: null,
      wardInventory: [],
      wardEquipped: [null, null, null, null],
      wardSlots: 1,
      wardSlotVersion: 1
    },
    // grandRun is created on entry; kills fills the gauge, phase bossPending queues the one-time boss spawn.
    // rewardVoidChisel/rewardJewelShard: number|null are the actual paid integers,
    // null before settlement or for legacy receipts; retained until the next entry/loop reset.
    voidRift: { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, grandBreachCleared: false, activeKills: 0, requiredKills: 0 },
    sporeCraftModes: {},
    craftOmen: null,
    // 걸어 둔 제작 뿌리 { key, side }(data/items.js CRAFT_OMENS): 다음 맞는 제작 한 번에 쓰인다
    craftChoice: null,
    // 성화의 뿌리로 굴린 결과 { itemId, options }: 고를 때까지 남는다(js/equipment-crafting.js craftBasic)
    salvageRecovery: { entries: [], sequence: 0 },
    blackMarket: { nextRefreshAt: 0, extraSlots: 0, offers: [], lockedOffers: {}, preferredSlot: "any", insight: 0, manualRefreshes: 0 },
    // NPC escrow: UTC millisecond clocks and independent visitors, with integer proceeds per currency.
    // listings: {id, item, price: integer currency units, currency, slot, listedAt: UTC ms}[]; escrow owns listed gear.
    // proceeds/budProceeds/goldProceeds: unclaimed integer dew/buds/gold; rng: saved uint32; sequence: increasing listing ID.
    playerStall: { version: 8, sequence: 0, offerSequence: 0, eventSequence: 0, saleSequence: 0, nextOfferAt: 0, lastAt: 0, nextVisitAt: 0, rng: 1357911, proceeds: 0, budProceeds: 0, goldProceeds: 0, listings: [], history: [], sales: [] },
    loop10ChaosStayEnabled: false,
    loop10BonusStats: { flatHp: 0, flatDmg: 0, aspd: 0, move: 0 },
    abyssEndlessDepth: 20,
    abyssUnlockedDepths: [20],
    loopDeepStats: { flatHp: 0, flatDmg: 0, resChaos: 0, aspd: 0, move: 0, dr: 0, crit: 0 },
    worldTreeBark: { damage: 0, taken: 0, move: 0, reach: 0, timeGoals: null },
    loopProgressBase: { abyssEndlessDepth: 20, labyrinthUnlockedMaxFloor: 1, specialBosses: [] },
    // Floor records count cleared floors; null in migrated saves means this loop was not recorded.
    loopProgressCurrent: { specialBosses: [], chaos20Cleared: false, bestAbyssDepth: 0, bestLabyrinthFloor: 0, bestChaosRealmFloor: 0, bestSkyFloor: 0, bestUnderworldFloor: 0, cosmosPlanets: [] },
    cosmosLoopCount: 0,
    lastLoopAdvancePath: null,
    chaosRealm: null,
    skyTower: null,
    underworldRunes: { unlockedSlots: 0, unlockedRunesMaxNumber: 0, obtainedRunes: [], equippedRunes: [null, null, null, null, null, null], enhanceLvByNo: {}, bonusLinesByNo: {} },
    underworldProgress: { highestFloor: 1, currentFloor: 1, deepRewardFloor: 0 },
    ocean: null,
    /** @type {StumpBoxState} */
    stumpBox: {
      version: 1,
      acquired: false,
      via: null,
      starter: { seed: false, sap: false },
      nextId: 1,
      items: [],
      board: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      graft: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      harvest: { grown: [], gifts: { flower: false, fruit: false, amber: false } },
      sealed: [],
      pouches: { opened: [], offers: {} },
      codex: [],
      scarGift: false,
      wallet: {},
      nursery: Array(25).fill(null)
    },
    cores: { equipped: null, owned: [] },
    pendingLoopDecision: false,
    pendingLoopReady: false,
    // The pending loop gate was reached in offline/background replay (js/loop-automation-ui.js does not auto-advance it).
    loopGateOffline: false,
    skyGemEnhancements: {},
    recentDamageEvents: [],
    // fatalElement is the last attack's dominant element, distinct from recent primaryElement.
    // Older logs have no fatalElement; save migration keeps that uncertainty as null.
    lastDeathLog: null,
    // Auto progression retreated after a defeat in story act frontierZoneId at this level (null = not retreating).
    // Cleared once the level rose by ACT_RETREAT_LEVELS or a map outside the retreat act finishes (js/combat-enemy-turn.js holdActRetreat).
    actRetreat: null,
    unlockedSeasonContents: ["season_1"],
    seenSeasonContentNotices: ["season_1"],
    seenTutorials: [],
    // Durable notice lifecycle. Millisecond timestamps; shown notices interrupted by reload resume once.
    tutorialHistory: [],
    // Unlock rows the player has picked in the unlock tab; the others that are open or within reach wear a ! (js/unlock-tab-ui.js unseenIds).
    seenUnlocks: [],
    // The NPC window's keywords already heard, "npcId:keyword" (js/content-progression-ui.js npcHeard): kept across loops.
    npcHeard: [],
    // NPCs met on the maps, { npcId: { count, loop, zoneId, tone } } (js/npc-shop.js meet), kept across loops: the NPC tab lists them.
    npcMet: {},
    // Each NPC's shop stock, rolled at each meeting: { npcId: { loop, zoneId, offers } } (js/npc-shop.js); an earlier loop's is gone.
    npcShops: {},
    journalEntries: ["prologue"],
    journalBonuses: [],
    journalBonusClaims: {},
    hiddenJournalBossRun: null,
    claimableActRewards: [],
    claimedActRewards: [],
    actRewardBonuses: [],
    seasonChaseUniqueDropped: false,
    seasonChaseUniqueDrops: [],
    gemEnhanceUnlocked: false,
    gemEnhanceTargetSkill: null,
    gemEngraveSelectedSlot: 0,
    runeSpares: {},
    // 공격 룬 이름 → 쓰는 하나 말고 더 가진 개수. 루프가 비운다(js/gem-drop-rewards.js).
    uniqueCodex: {},
    uniqueHuntTargets: [],
    equipmentDropProgress: 0,
    // Drought credit; normal 1 / elite 4 / boss 16, reset on an equipment drop.
    codexNewlyRegistered: {},
    codexCollapsedSlots: {},
    codexSubtab: "main",
    codexSelectedSlot: "무기",
    uniqueCodexCompletedRewardClaimed: false,
    // 운석 낙하 지점(2026-10-01 별쐐기 저장에서 분리): 하늘 균열 게이지 · 들어갈 단계 · 돌아갈 사냥터 · 별자리 관측.
    meteorSite: {
      unlocked: false,
      skyRiftGauge: 0,
      skyRiftReady: false,
      skyRiftMinTier: null,
      skyRiftAllCosmos: false,
      activeMeteorTier: null,
      // 떨어질 운석의 종류(data/maps.js METEOR_KINDS id): 하늘 균열이 다 차면 정해지고 원정이 끝나면 비운다.
      kind: null,
      meteorReturnZoneId: null,
      lastAnomalyAt: 0,
      skyRiftCarryGauge: 0,
      constellationBuff: null,
      entriesCleared: 0
    },
    // cloudPending: this account slot was written since its last commit to the server (js/save.js persistLocalSave); never true in the guest slot.
    // gameBuild: the release that last wrote this save (its commit time, ISO; null before 2026-10-28 and on an unbuilt page), js/save.js.
    saveMeta: { lastModifiedAt: 0, playedUntil: 0, lastCloudSyncAt: 0, lastCloudUploadProfile: null, cloudUserId: null, cloudRevision: 0, cloudPending: false, maxSeenAt: 0, gameBuild: null },
    unlocks: { char: false, season: false, items: false, map: false, skills: false, codex: false, traits: false, talent: false, jewel: false, stump: false, npcs: false },
    noti: { char: false, season: false, items: false, skills: false, map: false, codex: false, traits: false, jewel: false, journal: false, currency: false, fossil: false, ascend: false, loop: false, social: false, stump: false, npcs: false },
    mapAlarmSeen: {},
    mapAlarmMainSeen: {}
  };
  function createDefaultGame({ CONTENT_UNLOCK_RECORD_VERSION: CONTENT_UNLOCK_RECORD_VERSION2, PASSIVE_LAYOUT_VERSION: PASSIVE_LAYOUT_VERSION2, BEYOND_BOUNDARY_STATE_VERSION: BEYOND_BOUNDARY_STATE_VERSION2, createDefaultChaosRealmState, createDefaultSkyTowerState, createDefaultOceanState }) {
    const result = JSON.parse(JSON.stringify(DEFAULT_GAME_BLUEPRINT));
    result.contentProgression.version = CONTENT_UNLOCK_RECORD_VERSION2;
    result.settings.passiveTreePlanner.layoutVersion = PASSIVE_LAYOUT_VERSION2;
    result.passiveLayoutVersion = PASSIVE_LAYOUT_VERSION2;
    result.beyondBoundary.version = BEYOND_BOUNDARY_STATE_VERSION2;
    result.chaosRealm = createDefaultChaosRealmState();
    result.skyTower = createDefaultSkyTowerState();
    result.ocean = createDefaultOceanState();
    return result;
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects2) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects2[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/state-classic.mjs
  var progressionData = createProgressionDefinitions({ STORY_ACTS, OCEAN_FISH_DB, OCEAN_FISH_COLLECTION_MILESTONES, HERO_SELECTION_DEFS, PLAYER_CLASS_DEFS });
  var passivesData = createPassivesDefinitions();
  initializeSkillDefaults(SKILL_DB);
  var supportsData = createSupportsDefinitions();
  var affixesData = createAffixesDefinitions({ REGION_AFFIX_MODS, INFLUENCE_AFFIX_MODS, AFFIX_TAG_LISTS, resolveAffixTagList });
  var runesData = createRunesDefinitions();
  var basesData = createBasesDefinitions();
  var data = { ...progressionData, ...passivesData, ...supportsData, ...affixesData, ...runesData, ...basesData };
  var effects = {
    get addLog() {
      return addLog;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get warnBeehiveMapTravelBlocked() {
      return warnBeehiveMapTravelBlocked;
    },
    get startMoving() {
      return startMoving;
    },
    get enterAutomaticMapInterruptionAfterClear() {
      return enterAutomaticMapInterruptionAfterClear;
    }
  };
  var equipmentDeps = {
    get PASSIVE_EQUIPMENT_RESTRICTIONS() {
      return PASSIVE_EQUIPMENT_RESTRICTIONS;
    },
    get game() {
      return window.GameModules.state.game;
    }
  };
  var equipment = new PassiveEquipmentRules(equipmentDeps, data);
  var noticesDeps = {
    get contentProgression() {
      return typeof contentProgression === "undefined" ? void 0 : contentProgression;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get tutorialHistory() {
      return window.GameModules.state.tutorials;
    }
  };
  var notices = new WorldNotices(noticesDeps, data);
  var storyDeps = {
    get STORY_ACTS() {
      return STORY_ACTS;
    },
    get _t() {
      return _t;
    }
  };
  var story = new StoryActLabels(storyDeps, data);
  var chaosDeps = {
    get game() {
      return window.GameModules.state.game;
    }
  };
  var chaos = new ChaosRealmState(chaosDeps, data);
  var difficultyDeps = {
    get TIME_RIFT_EQUIVALENT_CHAOS_DEPTHS() {
      return TIME_RIFT_EQUIVALENT_CHAOS_DEPTHS;
    },
    get TIME_RIFT_LOOP_BEHIND_DEPTH() {
      return TIME_RIFT_LOOP_BEHIND_DEPTH;
    },
    get TIME_RIFT_MAX_PRESSURE() {
      return TIME_RIFT_MAX_PRESSURE;
    },
    get UNDERWORLD_DEEP_FLOOR_REWARD() {
      return UNDERWORLD_DEEP_FLOOR_REWARD;
    },
    get UNDERWORLD_DIFFICULTY_CONFIG() {
      return UNDERWORLD_DIFFICULTY_CONFIG;
    },
    get hashSeed() {
      return hashSeed;
    }
  };
  var difficulty = new RealmDifficulty(difficultyDeps, data);
  var progressDeps = {
    get METEOR_SITE_UNLOCK_ACT() {
      return METEOR_SITE_UNLOCK_ACT;
    },
    get METEOR_SITE_UNLOCK_LOOP() {
      return METEOR_SITE_UNLOCK_LOOP;
    },
    get game() {
      return window.GameModules.state.game;
    }
  };
  var progress = new RealmProgress(progressDeps, data, { difficulty });
  var unlocksDeps = {
    get MAP_PRIMARY_CONTENTS() {
      return MAP_PRIMARY_CONTENTS;
    },
    get OCEAN_UNLOCK_LOOP() {
      return OCEAN_UNLOCK_LOOP;
    },
    get _t() {
      return _t;
    },
    get game() {
      return window.GameModules.state.game;
    }
  };
  var unlocks = new RealmUnlockRules(unlocksDeps, data, { chaos, progress });
  var oceanDeps = {
    get OCEAN_AUTO_REDIVE() {
      return OCEAN_AUTO_REDIVE;
    },
    get OCEAN_FISHING_STRATEGIES() {
      return OCEAN_FISHING_STRATEGIES;
    },
    get OCEAN_FISH_DB() {
      return OCEAN_FISH_DB;
    },
    get OCEAN_UNLOCK_LOOP() {
      return OCEAN_UNLOCK_LOOP;
    },
    get game() {
      return window.GameModules.state.game;
    }
  };
  var ocean = new OceanProgressState(oceanDeps, data);
  var oceanRulesDeps = {
    get game() {
      return window.GameModules.state.game;
    }
  };
  var oceanRules = new OceanEnvironment(oceanRulesDeps, data, { ocean, difficulty });
  var skyDeps = {
    get game() {
      return window.GameModules.state.game;
    }
  };
  var sky = new SkyTowerProgressState(skyDeps, data, { progress });
  var skyRulesDeps = {
    get _t() {
      return _t;
    },
    get canAddLog() {
      return typeof addLog === "function";
    },
    get game() {
      return window.GameModules.state.game;
    }
  };
  var skyRules = new SkyTowerRules(skyRulesDeps, data, { sky, progress });
  var challengesDeps = {
    get BEYOND_BOUNDARY_DAMAGE_GROWTH() {
      return BEYOND_BOUNDARY_DAMAGE_GROWTH;
    },
    get BEYOND_BOUNDARY_DIFFICULTY_OFFSET() {
      return BEYOND_BOUNDARY_DIFFICULTY_OFFSET;
    },
    get BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER() {
      return BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER;
    },
    get BEYOND_BOUNDARY_HP_GROWTH() {
      return BEYOND_BOUNDARY_HP_GROWTH;
    },
    get BEYOND_BOUNDARY_INTENSITY_DB() {
      return BEYOND_BOUNDARY_INTENSITY_DB;
    },
    get BEYOND_BOUNDARY_MUTATOR_DB() {
      return BEYOND_BOUNDARY_MUTATOR_DB;
    },
    get BEYOND_BOUNDARY_REWARD_FOCUS_DB() {
      return BEYOND_BOUNDARY_REWARD_FOCUS_DB;
    },
    get BEYOND_BOUNDARY_TIER_CAP() {
      return BEYOND_BOUNDARY_TIER_CAP;
    },
    get BEYOND_BOUNDARY_ZONE_ID() {
      return BEYOND_BOUNDARY_ZONE_ID;
    },
    get COSMOS_EXPEDITION_DIRECTIVE_DB() {
      return typeof COSMOS_EXPEDITION_DIRECTIVE_DB === "undefined" ? void 0 : COSMOS_EXPEDITION_DIRECTIVE_DB;
    },
    get GRAND_BREACH_ENCOUNTER() {
      return GRAND_BREACH_ENCOUNTER;
    },
    get actExplorationDoors() {
      return typeof actExplorationDoors === "undefined" ? void 0 : actExplorationDoors;
    },
    get clampNumber() {
      return clampNumber;
    },
    get contentMaps() {
      return contentMaps;
    },
    get getBeyondBoundaryRewardMul() {
      return getBeyondBoundaryRewardMul;
    }
  };
  var challenges = new ChallengeZoneDefinitions(challengesDeps, data, { difficulty });
  var riftDeps = {
    get TIME_RIFT_MAX_PRESSURE() {
      return TIME_RIFT_MAX_PRESSURE;
    },
    get game() {
      return window.GameModules.state.game;
    }
  };
  var rift = new TimeRiftState(riftDeps, data);
  var zonesDeps = {
    get ATLAS() {
      return ATLAS;
    },
    get BEYOND_BOUNDARY_ZONE_ID() {
      return BEYOND_BOUNDARY_ZONE_ID;
    },
    get LABYRINTH_ZONE_ID() {
      return LABYRINTH_ZONE_ID;
    },
    get METEOR_FALL_ZONE_ID() {
      return METEOR_FALL_ZONE_ID;
    },
    get METEOR_KINDS() {
      return METEOR_KINDS;
    },
    get OCEAN_ZONE_ID() {
      return OCEAN_ZONE_ID;
    },
    get SEASON_BOSS_ZONES() {
      return SEASON_BOSS_ZONES;
    },
    get TIME_RIFT_FUTURE_ZONE_ID() {
      return TIME_RIFT_FUTURE_ZONE_ID;
    },
    get TIME_RIFT_PAST_ZONE_ID() {
      return TIME_RIFT_PAST_ZONE_ID;
    },
    get TRIAL_ZONES() {
      return TRIAL_ZONES;
    },
    get actExplorationDoors() {
      return typeof actExplorationDoors === "undefined" ? void 0 : actExplorationDoors;
    },
    get atlas() {
      return atlas;
    },
    get contentMaps() {
      return contentMaps;
    },
    get game() {
      return window.GameModules.state.game;
    }
  };
  var zones = new WorldZoneCatalog(zonesDeps, data, { challenges, difficulty, chaos, sky, skyRules, rift, ocean, oceanRules });
  var riftRulesDeps = {
    get TIME_RIFT_KEEP_CAP() {
      return TIME_RIFT_KEEP_CAP;
    },
    get TIME_RIFT_MAX_PRESSURE() {
      return TIME_RIFT_MAX_PRESSURE;
    },
    get TIME_RIFT_OPTION_KEEP() {
      return TIME_RIFT_OPTION_KEEP;
    },
    get TIME_RIFT_OPTION_KEEP_PAST_CAP() {
      return TIME_RIFT_OPTION_KEEP_PAST_CAP;
    }
  };
  var riftRules = new TimeRiftInheritance(riftRulesDeps, data);
  var loopDeps = {
    get LOOP_GATE_ABYSS_DEPTH_CAP() {
      return LOOP_GATE_ABYSS_DEPTH_CAP;
    },
    get LOOP_GATE_ALT_COSMOS_PLANET_ID() {
      return LOOP_GATE_ALT_COSMOS_PLANET_ID;
    },
    get LOOP_GATE_ALT_COSMOS_PLANET_NAME() {
      return LOOP_GATE_ALT_COSMOS_PLANET_NAME;
    },
    get LOOP_GATE_ALT_START_SEASON() {
      return LOOP_GATE_ALT_START_SEASON;
    },
    get SEASON_CONTENT_ROADMAP() {
      return SEASON_CONTENT_ROADMAP;
    },
    get _t() {
      return _t;
    },
    get clampNumber() {
      return clampNumber;
    },
    get game() {
      return window.GameModules.state.game;
    }
  };
  var loop = new LoopEntryProgress(loopDeps, data, { progress, difficulty });
  var navigationDeps = {
    get _t() {
      return _t;
    },
    get canWarnBeehiveMapTravelBlocked() {
      return typeof warnBeehiveMapTravelBlocked === "function";
    },
    get ensureNextEndlessChaosDepthUnlocked() {
      return ensureNextEndlessChaosDepthUnlocked;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get isBeehiveRunLockedForMapTravel() {
      return typeof isBeehiveRunLockedForMapTravel === "undefined" ? void 0 : isBeehiveRunLockedForMapTravel;
    }
  };
  var navigation = new ChaosNavigation(navigationDeps, data, { zones, progress, difficulty });
  var bonusesDeps = {
    get LOOP_DEEP_STATS() {
      return LOOP_DEEP_STATS;
    },
    get PINNACLE_FIRST_KILL_JOURNALS() {
      return PINNACLE_FIRST_KILL_JOURNALS;
    },
    get WORLD_TREE_BARK() {
      return WORLD_TREE_BARK;
    },
    get _t() {
      return _t;
    },
    get contentProgression() {
      return typeof contentProgression === "undefined" ? void 0 : contentProgression;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getStatName() {
      return getStatName;
    }
  };
  var bonuses = new LoopPermanentBonuses(bonusesDeps, data);
  var passivesDeps = {
    get ASCENDANCIES_BY_PLAYER_CLASS() {
      return ASCENDANCIES_BY_PLAYER_CLASS;
    },
    get CLASS_KEYSTONE_DEFS() {
      return CLASS_KEYSTONE_DEFS;
    },
    get CLASS_TEMPLATES() {
      return CLASS_TEMPLATES;
    },
    get PASSIVE_TREE_V22() {
      return typeof PASSIVE_TREE_V22 === "undefined" ? void 0 : PASSIVE_TREE_V22;
    },
    get game() {
      return window.GameModules.state.game;
    }
  };
  var passives = new PassiveProgression(passivesDeps, data);
  data.MAP_ZONES = STORY_ACTS.map((act, idx) => ({
    id: idx,
    name: story.getActZoneDisplayName(idx),
    type: "act",
    tier: act.tier,
    maxKills: act.maxKills,
    ele: act.ele,
    storyActId: act.id,
    storyOrder: act.order
  }));
  for (let i = 1; i <= 20; i++) data.MAP_ZONES.push({ id: data.ABYSS_START_ZONE_ID + (i - 1), name: "혼돈 " + i, type: "abyss", tier: data.abyssTiers[i - 1], maxKills: 1, ele: "chaos", depth: i });
  var defaultGame = createDefaultGame({ CONTENT_UNLOCK_RECORD_VERSION, PASSIVE_LAYOUT_VERSION, BEYOND_BOUNDARY_STATE_VERSION, createDefaultChaosRealmState: chaos.createDefaultChaosRealmState, createDefaultSkyTowerState: sky.createDefaultSkyTowerState, createDefaultOceanState: ocean.createDefaultOceanState });
  var runtime = window.GameModules.state;
  runtime.defaultDefinitions = defaultGame;
  runtime.normalizeTimeRiftResult = rift.normalizeTimeRiftResult;
  runtime.underworldMilestoneReward = difficulty.underworldMilestoneReward;
  var classicStateAccessors = {
    startupOverlayActive: { configurable: true, get() {
      return runtime.controls.startupOverlayActive;
    }, set(value) {
      runtime.controls.startupOverlayActive = value;
    } },
    gameplayStarted: { configurable: true, get() {
      return runtime.controls.gameplayStarted;
    }, set(value) {
      runtime.controls.gameplayStarted = value;
    } },
    gameEntryRunning: { configurable: true, get() {
      return runtime.controls.gameEntryRunning;
    }, set(value) {
      runtime.controls.gameEntryRunning = value;
    } },
    pendingMapRevealZoneId: { configurable: true, get() {
      return runtime.controls.pendingMapRevealZoneId;
    }, set(value) {
      runtime.controls.pendingMapRevealZoneId = value;
    } },
    pendingMapRevealToken: { configurable: true, get() {
      return runtime.controls.pendingMapRevealToken;
    }, set(value) {
      runtime.controls.pendingMapRevealToken = value;
    } },
    backgroundCombatRuntime: { configurable: true, get() {
      return runtime.controls.backgroundCombatRuntime;
    }, set(value) {
      runtime.controls.backgroundCombatRuntime = value;
    } },
    tutorialQueue: { configurable: true, get() {
      return runtime.tutorialQueue;
    }, set(value) {
      runtime.tutorialQueue = value;
    } },
    cloudState: { configurable: true, get() {
      return window.GameModules.cloudAccountState.current;
    }, set(value) {
      window.GameModules.cloudAccountState.current = value;
    } }
  };
  Object.defineProperties(window, classicStateAccessors);
  if (globalThis !== window) Object.defineProperties(globalThis, classicStateAccessors);
  var classicNames = {
    TUTORIAL_SEEN_ALIASES: data.TUTORIAL_SEEN_ALIASES,
    ACT_ZONE_COUNT: data.ACT_ZONE_COUNT,
    LAST_STORY_ZONE_ID: data.LAST_STORY_ZONE_ID,
    ABYSS_START_ZONE_ID: data.ABYSS_START_ZONE_ID,
    OUTSIDE_CHAOS_ZONE_ID: data.OUTSIDE_CHAOS_ZONE_ID,
    CHAOS_REALM_ZONE_ID: data.CHAOS_REALM_ZONE_ID,
    SKY_TOWER_ZONE_ID: data.SKY_TOWER_ZONE_ID,
    WOODSMAN_ECHO_ZONE_ID: data.WOODSMAN_ECHO_ZONE_ID,
    UNDERWORLD_ZONE_ID: data.UNDERWORLD_ZONE_ID,
    abyssTiers: data.abyssTiers,
    CHAOS_REALM_DEFAULT_BONUSES: data.CHAOS_REALM_DEFAULT_BONUSES,
    ABYSS_ENDLESS_STEEP_FLOOR_HP_MUL: data.ABYSS_ENDLESS_STEEP_FLOOR_HP_MUL,
    ABYSS_ENDLESS_STEEP_PLAYER_TAKEN_PER_FLOOR: data.ABYSS_ENDLESS_STEEP_PLAYER_TAKEN_PER_FLOOR,
    CHAOS_REALM_AFFIX_POOL: data.CHAOS_REALM_AFFIX_POOL,
    OCEAN_PERMANENT_UPGRADE_DEFS: data.OCEAN_PERMANENT_UPGRADE_DEFS,
    OCEAN_PERMANENT_UPGRADE_KEYS: data.OCEAN_PERMANENT_UPGRADE_KEYS,
    OCEAN_STATE_FISH_KEYS: data.OCEAN_STATE_FISH_KEYS,
    OCEAN_COLLECTION_REQUIRED_COUNTS: data.OCEAN_COLLECTION_REQUIRED_COUNTS,
    OCEAN_CURRENT_POOL: data.OCEAN_CURRENT_POOL,
    ENDLESS_CONTENT_DROP_MULTIPLIER_CAP: data.ENDLESS_CONTENT_DROP_MULTIPLIER_CAP,
    UNDERWORLD_DROP_RATE_MULTIPLIER: data.UNDERWORLD_DROP_RATE_MULTIPLIER,
    HERO_SELECTION_ORDER: data.HERO_SELECTION_ORDER,
    PLAYER_CLASS_ORDER: data.PLAYER_CLASS_ORDER,
    COMBAT_TACTIC_TARGET_PRIORITIES: data.COMBAT_TACTIC_TARGET_PRIORITIES,
    COMBAT_TACTIC_POSITION_MODES: data.COMBAT_TACTIC_POSITION_MODES,
    SEASON_NODES: data.SEASON_NODES,
    SEASON_NODE_ROWS: data.SEASON_NODE_ROWS,
    SEASON_OUROBOROS_RING_NODES: data.SEASON_OUROBOROS_RING_NODES,
    SEASON_INNER_NODES: data.SEASON_INNER_NODES,
    JEWEL_RARITY_ORDER: data.JEWEL_RARITY_ORDER,
    P_STATS: data.P_STATS,
    PASSIVE_TIER_SIZE_ORDER: data.PASSIVE_TIER_SIZE_ORDER,
    PASSIVE_TIER_FALLBACK: data.PASSIVE_TIER_FALLBACK,
    SUPPORT_GEM_DB: data.SUPPORT_GEM_DB,
    MOD_DB: data.MOD_DB,
    FOSSIL_DB: data.FOSSIL_DB,
    FOSSIL_EXCLUSIVE_MODS: data.FOSSIL_EXCLUSIVE_MODS,
    UNDERWORLD_RUNE_DB: data.UNDERWORLD_RUNE_DB,
    BASE_ITEM_DB: data.BASE_ITEM_DB,
    MAP_ZONES: data.MAP_ZONES,
    get startupOverlayActive() {
      return runtime.controls.startupOverlayActive;
    },
    get gameplayStarted() {
      return runtime.controls.gameplayStarted;
    },
    get gameEntryRunning() {
      return runtime.controls.gameEntryRunning;
    },
    get pendingMapRevealZoneId() {
      return runtime.controls.pendingMapRevealZoneId;
    },
    get pendingMapRevealToken() {
      return runtime.controls.pendingMapRevealToken;
    },
    get backgroundCombatRuntime() {
      return runtime.controls.backgroundCombatRuntime;
    },
    get tutorialQueue() {
      return runtime.tutorialQueue;
    },
    get cloudState() {
      return window.GameModules.cloudAccountState.current;
    },
    defaultGame,
    queueTutorialNotice: notices.queueTutorialNotice,
    isTransientGameState: notices.isTransientGameState,
    normalizeOceanFishingProgress: ocean.normalizeOceanFishingProgress,
    loopGateDepthName: loop.loopGateDepthName,
    hasLoopGateCosmosPath: loop.hasLoopGateCosmosPath,
    getPassiveEquipmentRestriction: equipment.getPassiveEquipmentRestriction,
    enforcePassiveEquipmentRestrictions: equipment.enforcePassiveEquipmentRestrictions,
    queueContentNotice: notices.queueContentNotice,
    formatStoryActLabel: story.formatStoryActLabel,
    getStoryActByZoneId: story.getStoryActByZoneId,
    getStoryActByOrder: story.getStoryActByOrder,
    getActZoneDisplayName: story.getActZoneDisplayName,
    createDefaultChaosRealmState: chaos.createDefaultChaosRealmState,
    ensureChaosRealmState: chaos.ensureChaosRealmState,
    getChaosRealmTier: difficulty.getChaosRealmTier,
    getUnderworldTier: difficulty.getUnderworldTier,
    getUnderworldGravityActionMultiplier: difficulty.getUnderworldGravityActionMultiplier,
    getUnderworldLifeDrainPerTick: difficulty.getUnderworldLifeDrainPerTick,
    getChaosRealmAffixScale: difficulty.getChaosRealmAffixScale,
    getChaosRealmAffixes: difficulty.getChaosRealmAffixes,
    hasCurrentLoopChaos20Clear: progress.hasCurrentLoopChaos20Clear,
    canEnterChaosRealm: unlocks.canEnterChaosRealm,
    getUnderworldEntryLockReason: unlocks.getUnderworldEntryLockReason,
    getUnderworldEntryBlock: unlocks.getUnderworldEntryBlock,
    getUnderworldUnlockChecks: unlocks.getUnderworldUnlockChecks,
    canEnterUnderworld: unlocks.canEnterUnderworld,
    isUnderworldUnlockReady: unlocks.isUnderworldUnlockReady,
    isCosmosContentUnlockReady: unlocks.isCosmosContentUnlockReady,
    getCosmosUnlockChecks: unlocks.getCosmosUnlockChecks,
    isMapPrimaryContentUnlockReady: unlocks.isMapPrimaryContentUnlockReady,
    isMapPrimaryContentUnlocked: unlocks.isMapPrimaryContentUnlocked,
    reconcileMapPrimaryContentUnlocks: unlocks.reconcileMapPrimaryContentUnlocks,
    getMapPrimaryContentEntryCondition: unlocks.getMapPrimaryContentEntryCondition,
    getOceanCurrentAffixes: difficulty.getOceanCurrentAffixes,
    hasOceanCurrent: difficulty.hasOceanCurrent,
    getColonyWaveEnemyCount: difficulty.getColonyWaveEnemyCount,
    createDefaultOceanState: ocean.createDefaultOceanState,
    getOceanPermanentUpgradeLevel: ocean.getOceanPermanentUpgradeLevel,
    getOceanPermanentUpgradeEffect: ocean.getOceanPermanentUpgradeEffect,
    mergeOceanState: ocean.mergeOceanState,
    ensureOceanState: ocean.ensureOceanState,
    canEnterOceanDepth: oceanRules.canEnterOceanDepth,
    getOceanOxygenMax: ocean.getOceanOxygenMax,
    getOceanOxygenSavingPct: oceanRules.getOceanOxygenSavingPct,
    getOceanPressureResistUpgradePct: oceanRules.getOceanPressureResistUpgradePct,
    getOceanOxygenDrainPerSec: oceanRules.getOceanOxygenDrainPerSec,
    getOceanOxygenPerAttackCost: oceanRules.getOceanOxygenPerAttackCost,
    getOceanDepthTier: oceanRules.getOceanDepthTier,
    getOceanBossBoundaryInterval: oceanRules.getOceanBossBoundaryInterval,
    getOceanPendingBossBoundary: oceanRules.getOceanPendingBossBoundary,
    getOceanDiveRecord: oceanRules.getOceanDiveRecord,
    getOceanFishingGaugeGainMul: oceanRules.getOceanFishingGaugeGainMul,
    createDefaultSkyTowerState: sky.createDefaultSkyTowerState,
    ensureSkyTowerState: sky.ensureSkyTowerState,
    getSkyTowerLoopClearLimit: sky.getSkyTowerLoopClearLimit,
    normalizeSkyTowerResult: sky.normalizeSkyTowerResult,
    getSkyTowerRemainingClears: skyRules.getSkyTowerRemainingClears,
    isSkyTowerAtRewardLimit: skyRules.isSkyTowerAtRewardLimit,
    hasCurrentLoopChaosAccess: progress.hasCurrentLoopChaosAccess,
    maybeUnlockSkyTowerFromChaos20: (...args) => consumeDomainCommands(skyRules.maybeUnlockSkyTowerFromChaos20(...args), effects),
    canEnterSkyTower: skyRules.canEnterSkyTower,
    getSkyTowerTier: skyRules.getSkyTowerTier,
    getSkyTowerRewardAmount: skyRules.getSkyTowerRewardAmount,
    getSkyStoneMaxLevel: sky.getSkyStoneMaxLevel,
    getSkyStoneReductionPct: skyRules.getSkyStoneReductionPct,
    getSkyStoneNextCost: skyRules.getSkyStoneNextCost,
    getSkyTowerGemBoostMaxLevel: sky.getSkyTowerGemBoostMaxLevel,
    getSkyTowerGemBoostLevel: skyRules.getSkyTowerGemBoostLevel,
    getSkyTowerGemBoostCost: skyRules.getSkyTowerGemBoostCost,
    getAbyssDepthFromZoneId: difficulty.getAbyssDepthFromZoneId,
    getAbyssZoneIdForDepth: difficulty.getAbyssZoneIdForDepth,
    getAbyssZoneTier: difficulty.getAbyssZoneTier,
    getTimeRiftEquivalentChaosDepth: difficulty.getTimeRiftEquivalentChaosDepth,
    getTimeRiftFixedSeason: difficulty.getTimeRiftFixedSeason,
    getMeteorSiteUnlockReady: progress.getMeteorSiteUnlockReady,
    getClearedSkyTowerFloor: progress.getClearedSkyTowerFloor,
    getSeasonBossProgressGate: unlocks.getSeasonBossProgressGate,
    createCosmosChallengeZone: challenges.createCosmosChallengeZone,
    getBeyondBoundaryTierProfile: challenges.getBeyondBoundaryTierProfile,
    createBeehiveZone: challenges.createBeehiveZone,
    getGrandBreachProgress: challenges.getGrandBreachProgress,
    getUnderworldZone: challenges.getUnderworldZone,
    getRunZone: zones.getRunZone,
    getFloorZone: zones.getFloorZone,
    getTimeRiftZone: zones.getTimeRiftZone,
    getLabyrinthZoneNow: zones.getLabyrinthZoneNow,
    getChaosDepthZone: zones.getChaosDepthZone,
    ensureTimeRiftState: rift.ensureTimeRiftState,
    getTimeRiftOptionKeepChance: riftRules.getTimeRiftOptionKeepChance,
    getTimeRiftLossOdds: riftRules.getTimeRiftLossOdds,
    getTimeRiftFusionGrade: riftRules.getTimeRiftFusionGrade,
    getSeasonAbyssDepthCap: loop.getSeasonAbyssDepthCap,
    getLoopAbyssRequirementText: loop.getLoopAbyssRequirementText,
    getLoopAbyssRequirementPrompt: loop.getLoopAbyssRequirementPrompt,
    hasCurrentLoopChaosRequirementClear: loop.hasCurrentLoopChaosRequirementClear,
    hasCurrentLoopCosmosRequirementClear: loop.hasCurrentLoopCosmosRequirementClear,
    hasCurrentLoopAbyssRequirementClear: loop.hasCurrentLoopAbyssRequirementClear,
    getAvailableLoopAdvancePaths: loop.getAvailableLoopAdvancePaths,
    markLoopCosmosPlanetClear: loop.markLoopCosmosPlanetClear,
    getSeasonFinalZoneId: loop.getSeasonFinalZoneId,
    getCurrentSeasonFinalZoneId: loop.getCurrentSeasonFinalZoneId,
    getVisibleHuntingMapCapZoneId: loop.getVisibleHuntingMapCapZoneId,
    getHighestUnlockedEndlessChaosDepth: progress.getHighestUnlockedEndlessChaosDepth,
    getContentReturnZoneId: navigation.getContentReturnZoneId,
    getAutoProgressZoneId: navigation.getAutoProgressZoneId,
    getAbyssMonsterScales: difficulty.getAbyssMonsterScales,
    getContentDropRateMultiplier: difficulty.getContentDropRateMultiplier,
    capEndlessContentDropMultiplier: difficulty.capEndlessContentDropMultiplier,
    applySeasonContentProgression: (...args) => consumeDomainCommands(loop.applySeasonContentProgression(...args), effects),
    getLoop10StatCost: bonuses.getLoop10StatCost,
    allocateLoop10BonusStat: (...args) => consumeDomainCommands(bonuses.allocateLoop10BonusStat(...args), effects),
    enterNextEndlessChaosDepth: (...args) => consumeDomainCommands(navigation.enterNextEndlessChaosDepth(...args), effects),
    enterUnlockedEndlessDepth: (...args) => consumeDomainCommands(navigation.enterUnlockedEndlessDepth(...args), effects),
    getWorldTreeBarkLayers: bonuses.getWorldTreeBarkLayers,
    getWorldTreeBarkReach: bonuses.getWorldTreeBarkReach,
    getWorldTreeBarkEarned: bonuses.getWorldTreeBarkEarned,
    normalizeWorldTreeBark: bonuses.normalizeWorldTreeBark,
    getLoopDeepStatCost: bonuses.getLoopDeepStatCost,
    allocateLoopDeepStat: (...args) => consumeDomainCommands(bonuses.allocateLoopDeepStat(...args), effects),
    getAscendanciesForClass: passives.getAscendanciesForClass,
    getAscendancyOrder: passives.getAscendancyOrder,
    isAscendancyOfClass: passives.isAscendancyOfClass,
    getAllAscendKeystoneDefs: passives.getAllAscendKeystoneDefs,
    pickRandomAscendKeystoneId: passives.pickRandomAscendKeystoneId,
    rememberLoopAscendancyPlan: passives.rememberLoopAscendancyPlan,
    getAscendKeystoneName: passives.getAscendKeystoneName,
    getSeasonPassiveNodeDef: passives.getSeasonPassiveNodeDef,
    getAllSeasonPassiveNodeIds: passives.getAllSeasonPassiveNodeIds,
    getSeasonPassiveUnlockLoop: passives.getSeasonPassiveUnlockLoop,
    getPassiveStatTierValue: passives.getPassiveStatTierValue,
    hasPermanentTalentTabUnlock: passives.hasPermanentTalentTabUnlock,
    syncPermanentTalentTabUnlock: passives.syncPermanentTalentTabUnlock,
    normalizeCombatTacticsSettings: passives.normalizeCombatTacticsSettings,
    hasCombatTacticsUnlockProgress: passives.hasCombatTacticsUnlockProgress,
    isFreePassiveStartNodeId: passives.isFreePassiveStartNodeId,
    getPaidPassiveNodeIds: passives.getPaidPassiveNodeIds,
    getZone: zones.getZone
  };
  safeExposeGlobals(classicNames);
  if (globalThis !== window) Object.assign(globalThis, classicNames);
  window.GameModules.worldState = { equipment, notices, story, chaos, difficulty, progress, unlocks, ocean, oceanRules, sky, skyRules, challenges, zones, rift, riftRules, loop, navigation, bonuses, passives, data };
})();
