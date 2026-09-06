function safeExposeData(map) {
  Object.keys(map || {}).forEach(function (key) {
    if (typeof window[key] === "undefined") window[key] = map[key];
  });
}

// Phase-1 extracted runtime constants (kept global for backward compatibility).
const PASSIVE_LAYOUT_VERSION = 22;
const LOCAL_SAVE_KEY = 'poeIdleSaveData_v9';
const LEGACY_SAVE_KEYS = ['poeIdleSaveData_v8', 'poeIdleSaveData_v7'];
const CLOUD_SESSION_STORAGE_KEY = 'poeIdleCloudSession_v1';
const CLOUD_SYNC_MIN_INTERVAL_MS = 300000;
const CLOUD_REMOTE_TIME_SKEW_MS = 60 * 1000;
const CLOUD_STALE_OVERWRITE_GUARD_MS = 5000;
const ENEMY_CRITICAL_DAMAGE_MULTIPLIER = 1.55;
const EMPTY_TRAVEL_PROGRESS_MULTIPLIER = 2;
const EQUIPMENT_INVENTORY_COLUMNS = 10;
const EQUIPMENT_INVENTORY_ROWS_PER_PAGE = 12;
const EQUIPMENT_INVENTORY_MAX_PAGES = 12;
const EQUIPMENT_INVENTORY_CELLS_PER_PAGE = EQUIPMENT_INVENTORY_COLUMNS * EQUIPMENT_INVENTORY_ROWS_PER_PAGE;
const UNDERWORLD_DIFFICULTY_CONFIG = Object.freeze({
    flatDamageThroughFloor: 100,
    mediumDamageThroughFloor: 200,
    deepDamageThroughFloor: 300,
    mediumDamagePerFloor: 0.0025,
    deepDamagePerFloor: 0.005,
    tierGainPerFloorAfterDeep: 1,
    gravityActionLossPerFloorAfterDeep: 0.01
});
const DAMAGE_ELEMENT_LABELS = {
    phys: '물리',
    fire: '화염',
    cold: '냉기',
    light: '번개',
    chaos: '카오스',
    other: '기타'
};
const DAMAGE_ELEMENT_ICONS = {
    phys: '🩸',
    fire: '🔥',
    cold: '❄️',
    light: '⚡',
    chaos: '☠️',
    other: '✦'
};
const DEATH_REASON_TEXT = {
    fire: '불길을 이겨내지 못하고 사망하였습니다.',
    cold: '서서히 얼어붙어 생을 마감했습니다.',
    light: '순식간에 몸을 관통한 전류를 버티지 못했습니다.',
    chaos: '혼돈이 끝내 당신의 정신을 집어삼켰습니다.',
    phys: '극심한 충격 끝에 목숨을 잃었습니다.',
    other: '예기치 못한 피해가 한꺼번에 몰아쳤습니다.'
};

// 9x8 직교 전장 그리드 설정. 첨부된 ACT 맵의 중앙 9x8 타일과 좌표·판정을 공유한다.
// 좌표계: gx(0~8)는 오른쪽, gy(0~7)는 아래쪽. 이동은 상하좌우 4방향만 허용한다.
const COMBAT_GRID_CONFIG = {
    columns: 9,
    rows: 8,
    playerSpawn: { gx: 1, gy: 4 },
    bossSpawn: { gx: 7, gy: 4 },
    bossFootprint: { columns: 2, rows: 2 },
    meleeEnemyChance: 0.3,          // 일반/정예 스폰 시 근접형 확률(나머지는 원거리형)
    meleeAttackRange: 1,            // 근접 공격 사거리(체비셰프 거리, 대각 포함)
    rangedEnemyMinRange: 3,         // 원거리형 최소 사거리(칸)
    rangedEnemyMaxRange: 5,         // 원거리형 최대 사거리(칸)
    bossAttackRange: 99,            // 보스는 특수 케이스 제외 항상 원거리(사실상 무제한)
    enemyMoveIntervalSec: 0.5,      // 적이 1칸 이동하는 데 걸리는 기본 시간(초)
    playerMoveIntervalSec: 0.6,     // 플레이어 기본 1칸 이동 시간(초, 이동 속도 100 기준 — 이속 스탯에 반비례)
    summonMoveIntervalSec: 0.4,     // 소환수 1칸 이동 시간(초)
    chainJumpRange: 2,              // 연쇄 계열 스킬이 다음 적으로 튈 수 있는 최대 거리(칸)
    bossPatternWarningMs: 1500,     // 기본 이속으로 두 칸을 벗어날 수 있는 최소 예고 시간
    bossPatternProfiles: {
        impact: { kind: 'blast', range: 8, radius: 0 },
        fan: { kind: 'fan', range: 8, rays: 3 },
        ring: { kind: 'blast', range: 8, radius: 1, shape: 'circle' },
        pulse: { kind: 'nova', range: 8, radius: 2, shape: 'diamond' },
        lane: { kind: 'line', range: 8 },
        wave: { kind: 'blast', range: 8, radius: 1, shape: 'cross' },
        split: { kind: 'fan', range: 8, rays: 3 },
        beam: { kind: 'line', range: 8 },
        charge: { kind: 'line', range: 8 }
    }
};

safeExposeData({
  PASSIVE_LAYOUT_VERSION, LOCAL_SAVE_KEY, LEGACY_SAVE_KEYS, CLOUD_SESSION_STORAGE_KEY,
  CLOUD_SYNC_MIN_INTERVAL_MS, CLOUD_REMOTE_TIME_SKEW_MS, CLOUD_STALE_OVERWRITE_GUARD_MS, DAMAGE_ELEMENT_LABELS, DAMAGE_ELEMENT_ICONS, DEATH_REASON_TEXT,
  COMBAT_GRID_CONFIG, ENEMY_CRITICAL_DAMAGE_MULTIPLIER, EMPTY_TRAVEL_PROGRESS_MULTIPLIER, UNDERWORLD_DIFFICULTY_CONFIG,
  EQUIPMENT_INVENTORY_COLUMNS, EQUIPMENT_INVENTORY_ROWS_PER_PAGE, EQUIPMENT_INVENTORY_MAX_PAGES,
  EQUIPMENT_INVENTORY_CELLS_PER_PAGE
});
