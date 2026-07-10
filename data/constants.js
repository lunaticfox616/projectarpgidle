function safeExposeData(map) {
  Object.keys(map || {}).forEach(function (key) {
    if (typeof window[key] === "undefined") window[key] = map[key];
  });
}

// Phase-1 extracted runtime constants (kept global for backward compatibility).
const PASSIVE_LAYOUT_VERSION = 16;
const LOCAL_SAVE_KEY = 'poeIdleSaveData_v9';
const LEGACY_SAVE_KEYS = ['poeIdleSaveData_v8', 'poeIdleSaveData_v7'];
const CLOUD_SESSION_STORAGE_KEY = 'poeIdleCloudSession_v1';
const CLOUD_SYNC_MIN_INTERVAL_MS = 300000;
const CLOUD_REMOTE_TIME_SKEW_MS = 60 * 1000;
const CLOUD_STALE_OVERWRITE_GUARD_MS = 5000;
const DAMAGE_ELEMENT_LABELS = {
    phys: '물리',
    fire: '화염',
    cold: '냉기',
    light: '번개',
    chaos: '카오스',
    other: '기타'
};
const DEATH_REASON_TEXT = {
    fire: '불길을 이겨내지 못하고 사망하였습니다.',
    cold: '서서히 얼어붙어 생을 마감했습니다.',
    light: '순식간에 몸을 관통한 전류를 버티지 못했습니다.',
    chaos: '혼돈이 끝내 당신의 정신을 집어삼켰습니다.',
    phys: '극심한 충격 끝에 목숨을 잃었습니다.',
    other: '예기치 못한 피해가 한꺼번에 몰아쳤습니다.'
};

// 8x8 아이소메트릭 전장 그리드 설정.
// 좌표계: gx(0~7), gy(0~7). 아이소 투영에서 (gx - gy)가 화면 가로, (gx + gy)가 화면 세로.
// playerSpawn/bossSpawn은 대각 방향으로 좌/우 끝에 가깝고 화면상 같은 높이(gx+gy 동일)에 놓인다.
const COMBAT_GRID_CONFIG = {
    size: 8,
    playerSpawn: { gx: 1, gy: 6 },
    bossSpawn: { gx: 6, gy: 1 },
    meleeEnemyChance: 0.3,          // 일반/정예 스폰 시 근접형 확률(나머지는 원거리형)
    meleeAttackRange: 1,            // 근접 공격 사거리(체비셰프 거리, 대각 포함)
    rangedEnemyMinRange: 3,         // 원거리형 최소 사거리(칸)
    rangedEnemyMaxRange: 5,         // 원거리형 최대 사거리(칸)
    bossAttackRange: 99,            // 보스는 특수 케이스 제외 항상 원거리(사실상 무제한)
    enemyMoveIntervalSec: 0.5,      // 적이 1칸 이동하는 데 걸리는 기본 시간(초)
    playerMoveIntervalSec: 0.35,    // 플레이어 기본 1칸 이동 시간(초, 이동 속도 100 기준)
    summonMoveIntervalSec: 0.4,     // 소환수 1칸 이동 시간(초)
    chainJumpRange: 2               // 연쇄 계열 스킬이 다음 적으로 튈 수 있는 최대 거리(칸)
};

safeExposeData({
  PASSIVE_LAYOUT_VERSION, LOCAL_SAVE_KEY, LEGACY_SAVE_KEYS, CLOUD_SESSION_STORAGE_KEY,
  CLOUD_SYNC_MIN_INTERVAL_MS, CLOUD_REMOTE_TIME_SKEW_MS, CLOUD_STALE_OVERWRITE_GUARD_MS, DAMAGE_ELEMENT_LABELS, DEATH_REASON_TEXT,
  COMBAT_GRID_CONFIG
});
