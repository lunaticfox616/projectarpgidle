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
const GAME_VERSION = 'v0.9.0';
// 패치 노트: 최신 항목이 맨 위에 오도록 정렬합니다. (설정 탭 / 시작 화면에 표시)
const PATCH_NOTES = [
    {
        version: 'v0.9.0',
        date: '2026-06-10',
        items: [
            '전투 화면에서 플레이어 또는 몬스터가 회피하면 "회피!" 텍스트가 표시됩니다.',
            '빗겨낸 피해는 대미지 숫자 색상(연녹색)과 전투 로그로 구분해 표시합니다.',
            '설정 탭과 시작 화면에 패치 노트를 추가했습니다.'
        ]
    }
];

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

safeExposeData({
  PASSIVE_LAYOUT_VERSION, LOCAL_SAVE_KEY, LEGACY_SAVE_KEYS, CLOUD_SESSION_STORAGE_KEY,
  CLOUD_SYNC_MIN_INTERVAL_MS, CLOUD_REMOTE_TIME_SKEW_MS, CLOUD_STALE_OVERWRITE_GUARD_MS, DAMAGE_ELEMENT_LABELS, DEATH_REASON_TEXT
});
