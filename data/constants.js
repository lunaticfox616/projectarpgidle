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
// 브라우저는 keepalive 요청 본문을 64KiB까지만 보낸다. 나가는 순간 업로드가 이보다 크면 보통 요청으로 보낸다.
const CLOUD_KEEPALIVE_BODY_LIMIT = 60 * 1024;
// 주인공 크기: 칸에 비해 0.8배(2026-10-03 사용자 요청). Hana 주인공은 칸 하나에 20도트(효과 도트는 16), 대체 그림도 같은 배율.
const HERO_SIZE_SCALE = 0.8;
// 나가는 순간 업로드는 마지막으로 올린 뒤 이만큼 지나야 다시 한다(앱을 자주 오가도 매번 올리지 않게).
const CLOUD_EXIT_UPLOAD_MIN_GAP_MS = 60 * 1000;
// 게스트 저장을 계정으로 옮기기 전의 간단한 조작 검사(js/guest-save-check.js, 2026-10-03). 정상 플레이로는 나올 수 없는 값만
// 잡도록 넉넉하게 둔다. 화폐는 한 번에 1~20개씩 쌓여 천만에 닿지 않는다. 젬 레벨은 경험치로 20, 숙련 가공으로 30까지, 품질은 20까지다.
// 장비 수치는 자기 굴림 범위 최댓값의 2배나 천만을 넘으면 걸린다. 패시브 포인트는 레벨 업마다 1에 일지, 액트 보상,
// 창백한 푸른 점(공허 하나에 10)과 여유 5를 더한 만큼까지다. 저장에 남은 가장 늦은 시각이 지금보다 10분 넘게 앞서면 기기 시간이 걸린다.
const GUEST_SAVE_CHECK = Object.freeze({
    currencyMax: 10000000,
    gemLevelMax: 30,
    gemQualityMax: 20,
    statRangeMul: 2,
    statValueMax: 10000000,
    statTierMax: 20,
    statLinesMax: 12,
    passivePerPaleVoid: 10,
    passiveSlack: 5,
    clockSlackMs: 10 * 60 * 1000
});
const ENEMY_CRITICAL_DAMAGE_MULTIPLIER = 1.55;
// Sprite rims so actors read on the dark maps (2026-10-02, the user picked coloured rims over dark ones): the hero a warm cream one
// sprite dot wide (js/canvas-hana-actors.js rim), monsters red, elites their trait colour, bosses a stronger red (canvas px,
// cached outline surfaces in js/passives.js).
const BATTLE_SPRITE_OUTLINES = Object.freeze({
    hero: Object.freeze({ color: '#f0dca6', alpha: 0.72 }),
    enemy: Object.freeze({ color: '#cf5444', alpha: 0.72, thickness: 2 }),
    elite: Object.freeze({ color: '#e2b94f', alpha: 0.85, thickness: 2 }),
    boss: Object.freeze({ color: '#e8493b', alpha: 0.85, thickness: 2 })
});
const EMPTY_TRAVEL_PROGRESS_MULTIPLIER = 2;
/** 스토리 액트에서 살아 있는 적이 없을 때(방과 방 사이) 초당 회복하는 최대 생명 비율(%, 0.1초 틱마다 1/10).
 * 초반 사망은 거의 모두 앞 전투에서 깎인 생명으로 다음 무리를 맞는 소모전이었다(측정 2026-10-01). */
const ACT_REST_RECOVERY_PCT_PER_SEC = 6;
/** 자동 진행 중 스토리 액트에서 쓰러져 한 액트 물러났을 때, 이만큼 레벨이 오른 뒤 다시 앞 액트에 도전한다.
 * 새 캐릭터 20분 측정(6직업 × 2시드, 패시브 미투자): 사망 175 → 33회(휴식 회복과 함께). */
const ACT_RETREAT_LEVELS = 2;
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
    enemyGlideRate: 20,             // 걸음 뒤 그림이 새 칸으로 다가가는 비율(초당, js/canvas-battlefield.js). 파동 판정도 같은 값으로 그려진 위치를 셈
    waveContactSampleMs: 10,        // 파동 판정이 두 전투 틱 사이를 훑는 간격(밀리초): 그 사이에 고리가 스친 몹도 맞는다
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
  CLOUD_SYNC_MIN_INTERVAL_MS, CLOUD_REMOTE_TIME_SKEW_MS, CLOUD_STALE_OVERWRITE_GUARD_MS, CLOUD_KEEPALIVE_BODY_LIMIT, CLOUD_EXIT_UPLOAD_MIN_GAP_MS, HERO_SIZE_SCALE, GUEST_SAVE_CHECK, DAMAGE_ELEMENT_LABELS, DAMAGE_ELEMENT_ICONS, DEATH_REASON_TEXT,
  COMBAT_GRID_CONFIG, ENEMY_CRITICAL_DAMAGE_MULTIPLIER, BATTLE_SPRITE_OUTLINES, EMPTY_TRAVEL_PROGRESS_MULTIPLIER, ACT_REST_RECOVERY_PCT_PER_SEC, ACT_RETREAT_LEVELS, UNDERWORLD_DIFFICULTY_CONFIG,
  EQUIPMENT_INVENTORY_COLUMNS, EQUIPMENT_INVENTORY_ROWS_PER_PAGE, EQUIPMENT_INVENTORY_MAX_PAGES,
  EQUIPMENT_INVENTORY_CELLS_PER_PAGE
});
