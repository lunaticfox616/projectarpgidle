// Existing chat limits, item display caps and profile labels.
export const SOCIAL_NICK_KEY = 'arpg_social_nickname';

export const SOCIAL_LAST_SEEN_CHAT_KEY = 'arpg_social_last_seen_chat_id';

export const SOCIAL_CHAT_LIMIT = 50;

export const SOCIAL_CHAT_POLL_MS = 4000;

export const SOCIAL_ONLINE_POLL_MS = 30000;

export const SOCIAL_CHAT_FULL_SYNC_MS = 5 * 60 * 1000;

export const SOCIAL_CHAT_FORGET_MS = 60 * 1000;

export const SOCIAL_CHAT_LIVE_POLL_MS = 60000;

export const SOCIAL_CHAT_LIVE_HIDDEN_MS = 60000;

export const SOCIAL_CHAT_LIVE_MISSES = 2;

export const SOCIAL_CHAT_LIVE_SETTLE_MS = 10000;

export const SOCIAL_BG_NOTI_POLL_MS = 15000;

export const SOCIAL_CHAT_TOAST_MS = 3600;

export const SOCIAL_CHAT_TOAST_GAP_MS = 4000;

export const SOCIAL_MSG_MAX = 300;

export const SOCIAL_NICK_MIN = 2;

export const SOCIAL_NICK_MAX = 16;

export const SOCIAL_SEND_MIN_INTERVAL_MS = 1500;

export const SOCIAL_SEND_MAX_PER_MIN = 12;

export const SOCIAL_MAX_ITEMS_PER_MSG = 3;

export const SOCIAL_TALISMAN_LINE_LIMIT = 5;

export const SOCIAL_LEGACY_ITEM_LINE_LIMIT = 8;

export const SOCIAL_ITEM_ARRAY_LIMITS = Object.freeze({ baseStats: 8, stats: 12, extraStats: 4, jewelStats: 8, sockets: 8, anoint: 2, ember: 2 });

export const SOCIAL_PROFILE_SYNC_DELAY_MS = 700;

export const SOCIAL_HEARTBEAT_MS = 30000;

export const SOCIAL_ONLINE_WINDOW_S = 300;

export const SOCIAL_RECENT_WINDOW_S = 1800;

export const SOCIAL_CHAT_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;

export const SOCIAL_ITEM_TOKEN_RE = /⟦(\d+)⟧/g;

export const SOCIAL_NICK_RE = /^[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ_\-]+$/;

export const SOCIAL_EQUIP_SLOTS = ['무기', '투구', '목걸이', '장갑1', '갑옷', '방패', '반지1', '허리띠', '반지2', '신발', '장갑2'];

export const SOCIAL_BLOCKED_KEY = 'arpg_social_blocked_users';

export const PROFILE_STAT_KEYS = Object.freeze([
    ['dps', 'log:attack'], ['summonDps', 'log:attack'], ['baseDmg', 'log:attack'], ['aspd', 'tree:precision'], ['crit', 'tree:precision'],
    ['critDmg', 'log:attack'], ['maxHp', 'tree:life'], ['energyShield', 'tree:arcane'], ['armor', 'log:phys'], ['evasion', 'tree:wind'],
    ['deflectChance', 'tree:shield'], ['blockChance', 'tree:shield'], ['dr', 'log:phys'], ['regen', 'tree:life'],
    ['resF', 'log:fire'], ['resC', 'log:cold'], ['resL', 'log:light'], ['resChaos', 'log:chaos']
]);

export const PROFILE_STAT_ICONS = new Map(PROFILE_STAT_KEYS);

export const PROFILE_STAT_GROUPS = Object.freeze([
    ['공격', ['dps', 'summonDps', 'baseDmg', 'aspd', 'crit', 'critDmg']],
    ['방어', ['maxHp', 'energyShield', 'armor', 'evasion', 'deflectChance', 'blockChance', 'dr', 'regen']],
    ['저항', ['resF', 'resC', 'resL', 'resChaos']]
]);

export const PROFILE_STAT_TONES = Object.freeze({ dps: '#ffcf6e', summonDps: '#ffcf6e', baseDmg: '#ffcf9f', aspd: '#fff3a8', crit: '#ffd6f2', critDmg: '#ffd6f2',
    maxHp: '#ff6b6b', regen: '#ff9c9c', energyShield: '#7fd3ff', armor: '#d2b98c', dr: '#d2b98c', evasion: '#8fe08f', deflectChance: '#8fe08f',
    blockChance: '#b8c4cc', resF: '#ff8a50', resC: '#6cb8ff', resL: '#ffd54f', resChaos: '#c39bff' });

export const SOCIAL_CHAT_ERROR_TEXTS = [
    [/SPAM_TOO_FAST/, '메시지를 너무 빠르게 보냈습니다.'],
    [/SPAM_RATE_LIMIT/, '너무 많이 보냈습니다. 잠시 후 다시 시도해주세요.'],
    [/SPAM_DUPLICATE/, '같은 메시지를 연속으로 보낼 수 없습니다.'],
    [/SPAM_REPEAT/, '같은 메시지를 5분 안에 세 번 보낼 수 없습니다.'],
    [/SPAM_FLOOD/, '같은 글자를 너무 많이 반복했습니다.'],
    [/CHAT_ACCOUNT_HELD/, '운영 검토 중인 계정이라 채팅을 보낼 수 없습니다.'],   // 관리자 보류(db/anti-cheat.sql 5절)
    [/CHAT_MUTED/, msg => msg.replace(/^[\s\S]*?CHAT_MUTED:\s*/, '')],   // 서버 문구에 남은 시간이 있다: "채팅이 금지된 상태입니다. N분 뒤 풀립니다."
    [/CHAT_PROFANITY/, '비속어가 들어 있어 보낼 수 없습니다.'],
    [/CHAT_LINK/, '링크는 보낼 수 없습니다.'],
    [/CHAT_PAYLOAD_INVALID/, `아이템 링크는 메시지마다 ${SOCIAL_MAX_ITEMS_PER_MSG}개까지입니다.`],
    [/CHAT_NICKNAME_MISMATCH|CHAT_UPDATE_FORBIDDEN/, '채팅 닉네임은 프로필 닉네임과 같아야 합니다.'],
    [/char_length|_body_check|violates check/, `메시지는 1~${SOCIAL_MSG_MAX}자여야 합니다.`],
    [/row-level security/i, '닉네임 확인에 실패했습니다. 잠시 후 다시 보내 주세요.']
];

export const socialChatMaxId = rows => rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0);

export const PROFILE_TALISMAN_STATES = Object.freeze({
    awake: '', asleep: '', suppressed: '비활성화: 척력 인접', amplified: '척력으로 효과 +25%', stored: ''
});

export const PROFILE_OFF_STYLE = ' style="color:#8d867a;"';

export const PROFILE_TALISMAN_RARITY = Object.freeze({ magic: '마법', rare: '희귀', unique: '고유' });

export const profileOwn = (table, key) => (Object.prototype.hasOwnProperty.call(table, key) ? table[key] : '');

export const PROFILE_CORE_TONE = '#6d8fa8';

export const PROFILE_STUMP_CELLS = 25;

export const CHAT_SETTINGS_ID = 'chat-settings-overlay';
