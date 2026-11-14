// GENERATED from modules/data/constants.mjs. Edit the ESM source; run npm run build:modules.
function safeExposeData(map) { Object.keys(map || {}).forEach(function (key) { if (typeof window[key] === "undefined") window[key] = map[key]; }); }
(() => {
  // modules/data/constants.mjs
  var PASSIVE_LAYOUT_VERSION = 23;
  var LOCAL_SAVE_KEY = "rigninSaveData_v9";
  var LEGACY_SAVE_KEY_PATTERN = /^[a-z]{3}IdleSaveData_v(\d+)$/;
  var ACCOUNT_SAVE_KEY_PREFIX = "rigninAccountSave_v1_";
  var CLOUD_SESSION_STORAGE_KEY = "rigninCloudSession_v1";
  var LEGACY_CLOUD_SESSION_KEY_PATTERN = /^[a-z]{3}IdleCloudSession_v1$/;
  var CLOUD_SYNC_MIN_INTERVAL_MS = 3e5;
  var CLOUD_KEEPALIVE_BODY_LIMIT = 60 * 1024;
  var HERO_SIZE_SCALE = 0.8;
  var HERO_RUN_RATE_MAX = 3;
  var PROJECTILE_FLIGHT_LIFT = 0.35;
  var PROJECTILE_HAND_REACH = 0.2;
  var PROJECTILE_SPRITE_SCALE = 0.8;
  var CLOUD_EXIT_UPLOAD_MIN_GAP_MS = 60 * 1e3;
  var GUEST_SAVE_CHECK = Object.freeze({
    currencyMax: 1e7,
    gemLevelMax: 30,
    gemQualityMax: 20,
    statRangeMul: 2,
    statValueMax: 1e7,
    statTierMax: 20,
    statLinesMax: 12,
    // 고유 효과 값과 품질(db/anti-cheat.sql hall_item_params_out_of_range와 같은 기준, 2026-10-27): 배율·룬 레벨 보너스 10, 그 밖의 숫자 값 100000, 품질 30.
    uniqueMultiplierMax: 10,
    uniqueParamMax: 1e5,
    itemQualityMax: 30,
    passivePerPaleVoid: 10,
    passiveSlack: 5,
    clockSlackMs: 10 * 60 * 1e3
  });
  var ENEMY_CRITICAL_DAMAGE_MULTIPLIER = 1.55;
  var BATTLE_SPRITE_OUTLINES = Object.freeze({
    hero: Object.freeze({ color: "#f0dca6", alpha: 0.72 }),
    // 앞의 몬스터에 가려진 주인공(2026-10-07 사용자 요청): 몬스터 위로 굵은 테(dots: 칸 64px 미만 2, 이상 3)와 반투명 몸(fill)이 비친다.
    heroOccluded: Object.freeze({ color: "#fff3c9", alpha: 0.95, fill: 0.32, dots: Object.freeze([2, 3]) }),
    enemy: Object.freeze({ color: "#cf5444", alpha: 0.72, thickness: 2 }),
    elite: Object.freeze({ color: "#e2b94f", alpha: 0.85, thickness: 2 }),
    boss: Object.freeze({ color: "#e8493b", alpha: 0.85, thickness: 2 })
  });
  var BOSS_DRAW_SCALE = 1.15;
  var EMPTY_TRAVEL_PROGRESS_MULTIPLIER = 2;
  var ACT_REST_RECOVERY_PCT_PER_SEC = 6;
  var ACT_RETREAT_LEVELS = 2;
  var CAMPAIGN_RESIST_PENALTY = Object.freeze({ zones: Object.freeze([5, 10]), each: 30 });
  var EQUIPMENT_INVENTORY_COLUMNS = 10;
  var EQUIPMENT_INVENTORY_ROWS_PER_PAGE = 10;
  var EQUIPMENT_INVENTORY_MAX_PAGES = 12;
  var EQUIPMENT_INVENTORY_CELLS_PER_PAGE = EQUIPMENT_INVENTORY_COLUMNS * EQUIPMENT_INVENTORY_ROWS_PER_PAGE;
  var UNDERWORLD_DIFFICULTY_CONFIG = Object.freeze({
    flatDamageThroughFloor: 100,
    mediumDamageThroughFloor: 200,
    deepDamageThroughFloor: 300,
    mediumDamagePerFloor: 25e-4,
    deepDamagePerFloor: 5e-3,
    tierGainPerFloorAfterDeep: 1,
    gravityActionLossPerFloorAfterDeep: 0.01
  });
  var UNDERWORLD_DEEP_FLOOR_REWARD = Object.freeze({ fromFloor: 300, every: 10, runeShard: Object.freeze([60, 1]), underGold: Object.freeze([20, 0.4]) });
  var UNDERWORLD_ENCHANT_POOLS = Object.freeze({
    "무기": [["pctDmg", 8, 24, 2], ["spellFlatPct", 6, 18, 2], ["projectileExtraChance", 50, 50, 3], ["resPen", 5, 14, 2], ["physIgnore", 5, 14, 2], ["flatDmg", 12, 38, 1]],
    "갑옷": [["pctHp", 4, 12, 1], ["flatHp", 45, 140, 1], ["armorPct", 8, 24, 1], ["evasionPct", 8, 24, 1], ["energyShieldPct", 8, 24, 1], ["maxResF", 1, 2, 3], ["maxResC", 1, 2, 3], ["maxResL", 1, 2, 3], ["resChaos", 4, 10, 2]],
    "투구": [["targetAny", 1, 1, 3], ["critDmg", 18, 25, 2], ["armor", 40, 120, 1], ["evasion", 40, 120, 1], ["energyShield", 35, 105, 1], ["crit", 2, 6, 2]]
  });
  var UNDERWORLD_LIMIT_BREAK = Object.freeze({
    quality: 20,
    swing: 10,
    cap: 30,
    costs: Object.freeze({ weapon: Object.freeze([30, 16, 6]), accessory: Object.freeze([24, 12, 4]), armour: Object.freeze([28, 14, 5]) })
  });
  var DAMAGE_ELEMENT_LABELS = {
    phys: "물리",
    fire: "화염",
    cold: "냉기",
    light: "번개",
    chaos: "카오스",
    other: "기타"
  };
  var DAMAGE_ELEMENT_ICONS = {
    phys: "🩸",
    fire: "🔥",
    cold: "❄️",
    light: "⚡",
    chaos: "☠️",
    other: "✦"
  };
  var DEATH_REASON_TEXT = {
    fire: "불길을 이겨내지 못하고 사망하였습니다.",
    cold: "서서히 얼어붙어 생을 마감했습니다.",
    light: "순식간에 몸을 관통한 전류를 버티지 못했습니다.",
    chaos: "혼돈이 끝내 당신의 정신을 집어삼켰습니다.",
    phys: "극심한 충격 끝에 목숨을 잃었습니다.",
    other: "예기치 못한 피해가 한꺼번에 몰아쳤습니다."
  };
  var COMBAT_GRID_CONFIG = {
    // 지속 장판: 시간은 전투 시계 ms. 같은 원소가 겹쳐도 한 번만 적용하며 최대 세 영역만 유지한다.
    ground: {
      durationMs: 5e3,
      tickMs: 500,
      maxAreas: 3,
      fire: { name: "용암 지대", color: "#e59355", damageShare: 0.22 },
      cold: { name: "빙결 지대", color: "#9cc8d2", ailment: "chill" },
      chaos: { name: "부식 지대", color: "#a7aa6c", damageShare: 0.18 },
      light: { name: "감전 지대", color: "#c9b9ec", ailment: "shock" }
    },
    columns: 9,
    rows: 8,
    playerSpawn: { gx: 1, gy: 4 },
    bossSpawn: { gx: 7, gy: 4 },
    bossFootprint: { columns: 2, rows: 2 },
    meleeEnemyChance: 0.3,
    // 일반/정예 스폰 시 근접형 확률(나머지는 원거리형)
    meleeAttackRange: 1,
    // 근접 공격 사거리(체비셰프 거리, 대각 포함)
    rangedEnemyMinRange: 3,
    // 원거리형 최소 사거리(칸)
    rangedEnemyMaxRange: 5,
    // 원거리형 최대 사거리(칸)
    bossAttackRange: 99,
    // 사거리 무한인 보스의 사거리(사실상 무제한). 보스마다의 거리는 data/bosses.js BOSS_REACH
    enemyMoveIntervalSec: 0.5,
    // 적이 1칸 이동하는 데 걸리는 기본 시간(초)
    enemyGlideRate: 20,
    // 걸음 뒤 그림이 새 칸으로 다가가는 비율(초당, js/canvas-battlefield.js). 파동 판정도 같은 값으로 그려진 위치를 셈
    waveContactSampleMs: 10,
    // 파동 판정이 두 전투 틱 사이를 훑는 간격(밀리초): 그 사이에 고리가 스친 몹도 맞는다
    playerMoveIntervalSec: 0.6,
    // 플레이어 기본 1칸 이동 시간(초, 이동 속도 100 기준 — 이속 스탯에 반비례)
    // 탐험 중 살아 있는 적이 없을 때 이 이동 속도(%) 이상이면 대각선으로도 한 걸음에 걷는다(같은 걸음 시간, 2026-11-04 사용자: 전투 밖에서만,
    // 전: 적이 없으면 누구나 0.75배 시간). 사용자 기준 150%는 쉽고 200%는 조금 신경 써야 하며 300% 이상은 특정 빌드만이라 200%로 둔다.
    explorationDiagonalMoveSpeed: 200,
    // 이 이동 속도(%) 이상이면 탐험 바닥 아이템을 둘레 8칸에서도 줍는다(2026-11-04 사용자, 그 아래는 그 칸을 밟아야).
    explorationWidePickupMoveSpeed: 150,
    summonMoveIntervalSec: 0.4,
    // 소환수 1칸 이동 시간(초)
    chainJumpRange: 2,
    // 연쇄 계열 스킬이 다음 적으로 튈 수 있는 최대 거리(칸)
    bossPatternWarningMs: 1500,
    // 기본 이속으로 두 칸을 벗어날 수 있는 최소 예고 시간
    bossPatternProfiles: {
      impact: { kind: "blast", range: 8, radius: 0 },
      fan: { kind: "fan", range: 8, rays: 3 },
      ring: { kind: "blast", range: 8, radius: 1, shape: "circle" },
      // 격앙 충격파와 후반 보스의 밑거름, 삼키기: 보스 둘레(nova)였을 때는 3칸 밖의 영웅에게 닿지 않아, 2단계부터(모든 공격이 충격파)
      // 관문이나 방 구석에 가만히 선 영웅에게 맞지 않는 경고만 되풀이했다(2026-10-07 사용자 제보). 다른 특수기처럼 영웅 칸을 중심으로 터진다.
      pulse: { kind: "blast", range: 8, radius: 2, shape: "diamond" },
      lane: { kind: "line", range: 8 },
      wave: { kind: "blast", range: 8, radius: 1, shape: "cross" },
      split: { kind: "fan", range: 8, rays: 3 },
      beam: { kind: "line", range: 8 },
      charge: { kind: "line", range: 8 },
      // 뿌리 절단자의 회전 톱날: 주인공 칸 둘레 3칸 네모를 여러 번 갈아 낸다(js/boss-moves.js grind)
      grind: { kind: "blast", range: 8, radius: 1, shape: "square" }
    }
  };

  // modules/data/constants.mjs:classic
  Object.assign(globalThis, { PASSIVE_LAYOUT_VERSION, LOCAL_SAVE_KEY, LEGACY_SAVE_KEY_PATTERN, ACCOUNT_SAVE_KEY_PREFIX, CLOUD_SESSION_STORAGE_KEY, LEGACY_CLOUD_SESSION_KEY_PATTERN, CLOUD_SYNC_MIN_INTERVAL_MS, CLOUD_KEEPALIVE_BODY_LIMIT, HERO_SIZE_SCALE, HERO_RUN_RATE_MAX, PROJECTILE_FLIGHT_LIFT, PROJECTILE_HAND_REACH, PROJECTILE_SPRITE_SCALE, CLOUD_EXIT_UPLOAD_MIN_GAP_MS, GUEST_SAVE_CHECK, ENEMY_CRITICAL_DAMAGE_MULTIPLIER, BATTLE_SPRITE_OUTLINES, BOSS_DRAW_SCALE, EMPTY_TRAVEL_PROGRESS_MULTIPLIER, ACT_REST_RECOVERY_PCT_PER_SEC, ACT_RETREAT_LEVELS, CAMPAIGN_RESIST_PENALTY, EQUIPMENT_INVENTORY_COLUMNS, EQUIPMENT_INVENTORY_ROWS_PER_PAGE, EQUIPMENT_INVENTORY_MAX_PAGES, EQUIPMENT_INVENTORY_CELLS_PER_PAGE, UNDERWORLD_DIFFICULTY_CONFIG, UNDERWORLD_DEEP_FLOOR_REWARD, UNDERWORLD_ENCHANT_POOLS, UNDERWORLD_LIMIT_BREAK, DAMAGE_ELEMENT_LABELS, DAMAGE_ELEMENT_ICONS, DEATH_REASON_TEXT, COMBAT_GRID_CONFIG });
  if (typeof safeExposeData === "function") safeExposeData({ PASSIVE_LAYOUT_VERSION, LOCAL_SAVE_KEY, LEGACY_SAVE_KEY_PATTERN, ACCOUNT_SAVE_KEY_PREFIX, CLOUD_SESSION_STORAGE_KEY, LEGACY_CLOUD_SESSION_KEY_PATTERN, CLOUD_SYNC_MIN_INTERVAL_MS, CLOUD_KEEPALIVE_BODY_LIMIT, HERO_SIZE_SCALE, HERO_RUN_RATE_MAX, PROJECTILE_FLIGHT_LIFT, PROJECTILE_HAND_REACH, PROJECTILE_SPRITE_SCALE, CLOUD_EXIT_UPLOAD_MIN_GAP_MS, GUEST_SAVE_CHECK, ENEMY_CRITICAL_DAMAGE_MULTIPLIER, BATTLE_SPRITE_OUTLINES, BOSS_DRAW_SCALE, EMPTY_TRAVEL_PROGRESS_MULTIPLIER, ACT_REST_RECOVERY_PCT_PER_SEC, ACT_RETREAT_LEVELS, CAMPAIGN_RESIST_PENALTY, EQUIPMENT_INVENTORY_COLUMNS, EQUIPMENT_INVENTORY_ROWS_PER_PAGE, EQUIPMENT_INVENTORY_MAX_PAGES, EQUIPMENT_INVENTORY_CELLS_PER_PAGE, UNDERWORLD_DIFFICULTY_CONFIG, UNDERWORLD_DEEP_FLOOR_REWARD, UNDERWORLD_ENCHANT_POOLS, UNDERWORLD_LIMIT_BREAK, DAMAGE_ELEMENT_LABELS, DAMAGE_ELEMENT_ICONS, DEATH_REASON_TEXT, COMBAT_GRID_CONFIG });
})();
