// ============================================================================
// 소셜 기능: 채팅 + 접속자 목록 + 다른 플레이어 프로필(장비창/주얼/부적 배치도/스탯)
// ----------------------------------------------------------------------------
// 백엔드는 Supabase(player_profiles / chat_messages). 스키마는 db/social.sql.
// ui.js 이후 로드되며 cloudState / cloudJsonRequest / getPlayerStats / getJewelStats
// / getItemStatToneColor / getTierBadgeHtml / getTalismanShapeStyle 등 전역을 재사용.
// 보안: 사용자/상대가 보낸 모든 문자열은 socialEscape 로 이스케이프한다.
// ============================================================================

const SOCIAL_NICK_KEY = 'arpg_social_nickname';
const SOCIAL_LAST_SEEN_CHAT_KEY = 'arpg_social_last_seen_chat_id';
const SOCIAL_CHAT_LIMIT = 50;
const SOCIAL_CHAT_POLL_MS = 4000;
// 커뮤니티 탭이 비활성일 때 새 채팅 여부만 가볍게 확인하는 주기(활성 탭 폴링보다 훨씬 느리게).
const SOCIAL_BG_NOTI_POLL_MS = 60000;
const SOCIAL_MSG_MAX = 300;
const SOCIAL_NICK_MIN = 2;
const SOCIAL_NICK_MAX = 16;
const SOCIAL_SEND_MIN_INTERVAL_MS = 1500;
const SOCIAL_SEND_MAX_PER_MIN = 12;
const SOCIAL_MAX_ITEMS_PER_MSG = 3;
const SOCIAL_HEARTBEAT_MS = 30000;
const SOCIAL_ONLINE_WINDOW_S = 75;
const SOCIAL_ITEM_TOKEN_RE = /⟦(\d+)⟧/g;
const SOCIAL_NICK_RE = /^[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ_\-]+$/;
const SOCIAL_EQUIP_SLOTS = ['무기', '투구', '목걸이', '장갑1', '갑옷', '방패', '반지1', '허리띠', '반지2', '신발', '장갑2'];

let socialState = {
    nickname: '',
    chatPollTimer: null,
    heartbeatTimer: null,
    chatLoading: false,
    onlineLoading: false,
    lastChatRenderKey: '',
    lastOnlineRenderKey: '',
    profileUploadInFlight: false,
    lastProfileUploadAt: 0,
    onlineSupported: true,
    pendingChatItems: [],
    sendTimestamps: [],
    lastSentBody: '',
    chatTips: {},
    profileTips: {},
    pickTips: {},
    currentProfile: null,
    profileTab: 'equipment',
    bgNotiLoading: false
};

// --- 공통 유틸 -------------------------------------------------------------
function socialLoggedInUserId() {
    return (typeof cloudState !== 'undefined' && cloudState && cloudState.user && cloudState.user.id) ? cloudState.user.id : null;
}
function socialCloudReady() {
    return !!socialLoggedInUserId() && typeof cloudJsonRequest === 'function';
}
function socialEscape(text) {
    if (typeof escapeHTML === 'function') return escapeHTML(String(text == null ? '' : text));
    return String(text == null ? '' : text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function socialComma(n) { return (Math.floor(Number(n) || 0)).toLocaleString('en-US'); }
function getMyNickname() {
    if (socialState.nickname) return socialState.nickname;
    try { let s = localStorage.getItem(SOCIAL_NICK_KEY); if (s) socialState.nickname = s; } catch (e) { /* 무시 */ }
    return socialState.nickname || '';
}
function setMyNicknameLocal(name) {
    socialState.nickname = name || '';
    try { localStorage.setItem(SOCIAL_NICK_KEY, socialState.nickname); } catch (e) { /* 무시 */ }
}
function socialClassLabel(ascendClass) {
    if (ascendClass && typeof CLASS_TEMPLATES !== 'undefined' && CLASS_TEMPLATES[ascendClass]) return CLASS_TEMPLATES[ascendClass].name;
    return '무직';
}
// 색상값이 안전한 hex/rgb 인지 확인(스타일 속성 주입 방지). 아니면 기본색.
function socialSafeColor(c, fallback) {
    fallback = fallback || '#cfe0f5';
    return (typeof c === 'string' && /^(#[0-9a-fA-F]{3,8}|rgba?\([0-9.,\s]+\))$/.test(c)) ? c : fallback;
}
function socialRarityColor(rarity) {
    return socialSafeColor(typeof getRarityColor === 'function' ? getRarityColor(rarity) : null, '#cfe0f5');
}

// ============================================================================
// 스냅샷 빌드(장비/주얼/부적) — 옵션에 티어·롤범위 포함
// ============================================================================
function snapStat(st) {
    let o = { id: st.id || st.stat, val: st.val, statName: st.statName, tier: st.tier, valMin: st.valMin, valMax: st.valMax };
    // 특수 표기 플래그도 보존한다: 특출 베이스(✦), 고정 옵션(벌꿀/균열 — 제작에서 제거 불가), 융합 계승 옵션.
    if (st.exceptional) o.exceptional = true;
    if (st.lockedByHoney || st.lockedByRift) o.locked = true;
    if (st.fusedFromRare) o.fusedFromRare = true;
    return o;
}
function buildItemSnapshot(item, slotOverride) {
    if (!item) return null;
    let snap = {
        slot: slotOverride || item.slot || '',
        name: item.name || '',
        rarity: item.rarity || 'normal',
        baseName: item.baseName || '',
        uniqueEffect: item.uniqueEffect || '',
        corrupted: !!item.corrupted,
        baseStats: (item.baseStats || []).slice(0, 8).map(snapStat),
        stats: (item.stats || []).slice(0, 8).map(st => {
            let o = snapStat(st);
            if (Array.isArray(st.extraStats)) o.extraStats = st.extraStats.slice(0, 4).map(snapStat);
            return o;
        })
    };
    // 특수 상태: 봉인(나무꾼의 손길), 고유 융합 유물, 혼돈 주입, 잠식 — 실제 툴팁과 동일하게 노출.
    if (item.loopSealed) snap.loopSealed = true;
    if (item.fusedRelic) {
        snap.fusedRelic = true;
        snap.fusionGrade = item.fusionGrade || '';
        snap.fusedRareName = item.fusedRareName || '';
    }
    if (item.chaosInfusion) snap.chaosInfusion = snapStat(item.chaosInfusion);
    if (item.encroached) {
        snap.encroached = {
            liberated: !!item.encroached.liberated,
            chosen: (item.encroached.liberated && item.encroached.chosen) ? snapStat(item.encroached.chosen) : null
        };
    }
    return snap;
}
function buildJewelSnapshot(jewel) {
    if (!jewel) return null;
    let stats = [];
    try {
        if (typeof getJewelStats === 'function') getJewelStats(jewel).forEach(st => stats.push(snapStat(st)));
    } catch (e) { /* 무시 */ }
    return { kind: 'jewel', name: jewel.name || '주얼', rarity: jewel.rarity || 'normal', stats: stats.slice(0, 8) };
}
function buildTalismanSnapshot(t) {
    if (!t) return null;
    let stats = [];
    if (t.stat) stats.push({ id: t.stat, val: t.value, statName: t.statName });
    let effects = [];
    if (t.special && typeof getTalismanSpecialDescription === 'function') {
        let d = getTalismanSpecialDescription(t); if (d) effects.push(d);
    }
    let name = (typeof getTalismanDisplayName === 'function') ? getTalismanDisplayName(t) : (t.name || '부적');
    let cells = Array.isArray(t.cells) ? t.cells.map(c => ({ x: c.x || 0, y: c.y || 0 })) : [];
    return { kind: 'talisman', name, rarity: t.rarity || 'normal', shape: t.shape || null, cells, stats, effects };
}

// 캐릭터 스탯 색상(타입별)
const SOCIAL_STAT_COLORS = {
    loop: '#c9a8ff', hp: '#7fd99a', regen: '#7fd99a', dps: '#ff8f6b', dmg: '#ff8f6b',
    crit: '#ffb36b', aspd: '#ffd27a', def: '#7fb5ff', resF: '#ff7a5c', resC: '#6fc6ff',
    resL: '#ffd24a', resChaos: '#c08bff'
};

function buildProfileSnapshot() {
    let stats = [];
    let power = 0;
    let loop = (typeof getSaveLoopNumber === 'function' && typeof game !== 'undefined') ? getSaveLoopNumber(game) : 0;
    try {
        let s = typeof getPlayerStats === 'function' ? getPlayerStats() : null;
        if (s) {
            power = Math.floor(Number(s.dps) || Number(s.hitDps) || 0);
            let C = SOCIAL_STAT_COLORS;
            let pct = v => `${(Number(v) || 0).toFixed(1)}%`;
            stats = [
                { label: '🔁 루프 횟수', value: socialComma(loop), color: C.loop },
                { label: '❤️ 최대 생명력', value: socialComma(s.maxHp), color: C.hp },
                { label: '⚔️ DPS', value: socialComma(s.dps || s.hitDps), color: C.dps },
                { label: '💥 기본 공격력', value: socialComma(s.baseDmg), color: C.dmg },
                { label: '🎯 치명타 확률', value: pct(s.crit), color: C.crit },
                { label: '🔥 치명타 피해', value: `${socialComma(s.critDmg)}%`, color: C.crit },
                { label: '⚡ 공격 속도', value: `${(Number(s.aspd) || 0).toFixed(2)}`, color: C.aspd },
                { label: '🛡️ 방어도', value: socialComma(s.armor), color: C.def },
                { label: '💨 회피', value: socialComma(s.evasion), color: C.def },
                { label: '🔵 에너지 보호막', value: socialComma(s.energyShield), color: C.def },
                { label: '🩹 재생', value: `${(Number(s.regen) || 0).toFixed(1)}%`, color: C.regen },
                { label: '🧱 받는 피해 감소', value: pct(s.dr), color: C.def },
                { label: '🛑 막기', value: pct(s.blockChance), color: C.def },
                { label: '🔥 화염 저항', value: `${socialComma(s.resF)}%`, color: C.resF },
                { label: '❄️ 냉기 저항', value: `${socialComma(s.resC)}%`, color: C.resC },
                { label: '⚡ 번개 저항', value: `${socialComma(s.resL)}%`, color: C.resL },
                { label: '☠️ 카오스 저항', value: `${socialComma(s.resChaos)}%`, color: C.resChaos }
            ];
        }
    } catch (e) { console.warn('프로필 스탯 계산 실패:', e); }

    let equipment = [];
    let eq = (typeof game !== 'undefined' && game.equipment) ? game.equipment : {};
    Object.keys(eq).forEach(slot => { let snap = buildItemSnapshot(eq[slot], slot); if (snap) equipment.push(snap); });

    let jewels = [];
    let jslots = (typeof game !== 'undefined' && Array.isArray(game.jewelSlots)) ? game.jewelSlots : [];
    jslots.forEach(j => { let s = buildJewelSnapshot(j); if (s) jewels.push(s); });

    // 부적: 배치도 형태로 보이도록 보드 셀→부적 인덱스 매핑까지 저장.
    let talismans = [];
    let talBoard = [];
    let placements = (typeof game !== 'undefined' && game.talismanPlacements) ? game.talismanPlacements : {};
    let board = (typeof game !== 'undefined' && Array.isArray(game.talismanBoard)) ? game.talismanBoard : [];
    let W = (typeof TALISMAN_BOARD_W !== 'undefined') ? TALISMAN_BOARD_W : 8;
    let H = (typeof TALISMAN_BOARD_H !== 'undefined') ? TALISMAN_BOARD_H : 8;
    let idToIndex = {};
    Object.keys(placements).forEach(id => {
        let t = placements[id] && placements[id].talisman;
        let s = buildTalismanSnapshot(t);
        if (s) { idToIndex[id] = talismans.length; talismans.push(s); }
    });
    talBoard = new Array(W * H).fill(-1);
    for (let i = 0; i < W * H; i++) { let id = board[i]; if (id != null && idToIndex[id] != null) talBoard[i] = idToIndex[id]; }

    return {
        version: 4,
        nickname: getMyNickname(),
        level: (typeof game !== 'undefined' && game.level) ? game.level : 1,
        ascendClass: (typeof game !== 'undefined') ? (game.ascendClass || '') : '',
        className: socialClassLabel(typeof game !== 'undefined' ? game.ascendClass : ''),
        loop, power, stats,
        equipment: equipment.slice(0, 16),
        jewels: jewels.slice(0, 8),
        talismans: talismans.slice(0, 60),
        talBoard,
        boardW: W, boardH: H,
        updatedAt: Date.now()
    };
}

async function uploadPlayerProfile(options = {}) {
    if (!socialCloudReady()) return false;
    let nickname = getMyNickname();
    if (!nickname) return false;
    if (socialState.profileUploadInFlight && !options.fromNicknameChange) return false;
    socialState.profileUploadInFlight = true;
    try {
        let snapshot = buildProfileSnapshot();
        await cloudJsonRequest('/rest/v1/player_profiles', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            // last_seen / nickname_updated_at 은 DB 기본값·트리거·하트비트가 관리한다.
            body: { user_id: socialLoggedInUserId(), nickname, profile_data: snapshot }
        });
        socialState.lastProfileUploadAt = Date.now();
        return true;
    } catch (e) {
        let msg = String(e && e.message || e);
        if (options.fromNicknameChange) {
            if (/NICK_COOLDOWN/.test(msg)) throw new Error('닉네임은 하루에 한 번만 변경할 수 있습니다.');
            if (/duplicate|unique|nickname/i.test(msg)) throw new Error('이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.');
            throw e;
        }
        if (!options.silent) console.warn('프로필 업로드 실패:', e);
        return false;
    } finally {
        socialState.profileUploadInFlight = false;
    }
}
function syncPlayerProfileQuiet() {
    if (!socialCloudReady() || !getMyNickname()) return;
    Promise.resolve(uploadPlayerProfile({ silent: true })).catch(() => {});
}

// ============================================================================
// 닉네임 (하루 1회 변경 + 과거 채팅 닉네임 일괄 갱신)
// ============================================================================
async function updatePastChatNicknames(name) {
    try {
        await cloudJsonRequest(`/rest/v1/chat_messages?user_id=eq.${encodeURIComponent(socialLoggedInUserId())}`, {
            method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { nickname: name }
        });
    } catch (e) { console.warn('과거 채팅 닉네임 갱신 실패:', e); }
}

async function promptAndSetNickname() {
    if (!socialCloudReady()) { alert('채팅/프로필 기능을 쓰려면 먼저 클라우드 로그인이 필요합니다. (설정 탭)'); return; }
    let current = getMyNickname();
    let input = prompt(`사용할 닉네임을 입력하세요 (${SOCIAL_NICK_MIN}~${SOCIAL_NICK_MAX}자, 한글/영문/숫자/-/_).\n※ 닉네임은 하루에 한 번만 변경할 수 있습니다.`, current || '');
    if (input == null) return;
    let name = String(input).trim();
    if (name === current) return;
    if (name.length < SOCIAL_NICK_MIN || name.length > SOCIAL_NICK_MAX) { alert(`닉네임은 ${SOCIAL_NICK_MIN}~${SOCIAL_NICK_MAX}자여야 합니다.`); return; }
    if (!SOCIAL_NICK_RE.test(name)) { alert('닉네임에는 한글, 영문, 숫자, - , _ 만 사용할 수 있습니다.'); return; }

    let prev = getMyNickname();
    setMyNicknameLocal(name);
    try {
        await uploadPlayerProfile({ fromNicknameChange: true });
        await updatePastChatNicknames(name);     // 과거 채팅도 새 닉네임으로
        if (typeof addLog === 'function') addLog(`🪪 닉네임이 "${name}"(으)로 설정되었습니다.`, 'season-up');
        socialState.lastChatRenderKey = '';
        renderSocialTab();
        refreshChatPanel(false);
    } catch (e) {
        setMyNicknameLocal(prev);
        alert(String(e && e.message || e));
        renderSocialTab();
    }
}
async function restoreNicknameFromServer() {
    if (!socialCloudReady() || getMyNickname()) return;
    try {
        let rows = await cloudJsonRequest(`/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(socialLoggedInUserId())}&select=nickname`, {});
        if (Array.isArray(rows) && rows[0] && rows[0].nickname) setMyNicknameLocal(rows[0].nickname);
    } catch (e) { /* 무시 */ }
}

// ============================================================================
// 접속자(프레즌스)
// ============================================================================
async function sendPresenceHeartbeat() {
    if (!socialCloudReady() || !getMyNickname() || !socialState.onlineSupported) return;
    try {
        await cloudJsonRequest(`/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(socialLoggedInUserId())}`, {
            method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { last_seen: new Date().toISOString() }
        });
    } catch (e) { if (/last_seen/i.test(String(e && e.message || e))) socialState.onlineSupported = false; }
}
function ensureHeartbeat() {
    if (socialState.heartbeatTimer) return;
    socialState.heartbeatTimer = setInterval(() => { if (socialCloudReady() && getMyNickname()) sendPresenceHeartbeat(); }, SOCIAL_HEARTBEAT_MS);
    sendPresenceHeartbeat();
}
async function loadOnlineUsers() {
    if (!socialCloudReady() || !socialState.onlineSupported) return [];
    let cutoff = new Date(Date.now() - SOCIAL_ONLINE_WINDOW_S * 1000).toISOString();
    try {
        let rows = await cloudJsonRequest(`/rest/v1/player_profiles?select=user_id,nickname,last_seen&last_seen=gte.${encodeURIComponent(cutoff)}&order=last_seen.desc&limit=80`, {});
        return Array.isArray(rows) ? rows : [];
    } catch (e) {
        if (/last_seen/i.test(String(e && e.message || e))) socialState.onlineSupported = false;
        return [];
    }
}
function renderOnlineUsers(users) {
    let host = document.getElementById('social-online');
    if (!host) return;
    if (!socialState.onlineSupported) { host.style.display = 'none'; return; }
    host.style.display = 'block';
    let myId = socialLoggedInUserId();
    let key = users.map(u => u.user_id).join(',');
    if (key === socialState.lastOnlineRenderKey) return;
    socialState.lastOnlineRenderKey = key;
    let chips = users.length
        ? users.map(u => {
            let me = u.user_id === myId;
            return `<span class="social-online-chip${me ? ' me' : ''}" onclick="openPlayerProfile('${socialEscape(u.user_id)}')">🟢 ${socialEscape(u.nickname || '익명')}${me ? ' (나)' : ''}</span>`;
        }).join('')
        : `<span class="social-online-empty">접속 중인 플레이어가 없습니다.</span>`;
    host.innerHTML = `<div class="social-online-title">🟢 접속 중 (${users.length})</div><div class="social-online-list">${chips}</div>`;
}
async function refreshOnlineUsers() {
    if (socialState.onlineLoading || !socialState.onlineSupported) return;
    socialState.onlineLoading = true;
    try { renderOnlineUsers(await loadOnlineUsers()); } catch (e) { /* 무시 */ } finally { socialState.onlineLoading = false; }
}

// ============================================================================
// 채팅
// ============================================================================
// --- 새 채팅 알림(커뮤니티 탭 빨간 점) --------------------------------------
// 마지막으로 확인한 채팅 id(bigint 증가형)를 기기별로 기억해, 그보다 큰 id의
// 남이 보낸 메시지가 있으면 game.noti.social 을 켠다. 탭을 열어 채팅이 렌더되면 갱신된다.
function getLastSeenChatId() {
    try {
        let v = localStorage.getItem(SOCIAL_LAST_SEEN_CHAT_KEY);
        if (v == null || v === '') return null;
        let n = Number(v);
        return Number.isFinite(n) ? n : null;
    } catch (e) { return null; }
}
function setLastSeenChatId(id) {
    let n = Number(id);
    if (!Number.isFinite(n)) return;
    let cur = getLastSeenChatId();
    if (cur != null && n <= cur) return;
    try { localStorage.setItem(SOCIAL_LAST_SEEN_CHAT_KEY, String(n)); } catch (e) { /* 무시 */ }
}
function isSocialTabActive() {
    let tabEl = document.getElementById('tab-social');
    return !!(tabEl && tabEl.classList.contains('active'));
}
async function checkSocialChatNotification() {
    if (!socialCloudReady() || socialState.bgNotiLoading) return;
    // 탭을 보고 있으면 활성 폴링이 채팅을 렌더하며 확인 처리하므로 알림이 필요 없다.
    if (isSocialTabActive()) return;
    if (typeof game === 'undefined' || !game || !game.noti) return;
    socialState.bgNotiLoading = true;
    try {
        let rows = await cloudJsonRequest(`/rest/v1/chat_messages?select=id,user_id&order=id.desc&limit=1`, {});
        let row = Array.isArray(rows) ? rows[0] : null;
        if (!row || row.id == null) return;
        let latest = Number(row.id);
        if (!Number.isFinite(latest)) return;
        let seen = getLastSeenChatId();
        // 첫 확인(이 기기에서 채팅을 한 번도 안 봄)에는 과거 메시지로 알림하지 않고 기준점만 잡는다.
        if (seen == null) { setLastSeenChatId(latest); return; }
        if (latest > seen && row.user_id !== socialLoggedInUserId()) game.noti.social = true;
    } catch (e) { /* 무시: 네트워크 실패 시 다음 주기에 재시도 */ } finally {
        socialState.bgNotiLoading = false;
    }
}

async function loadChatMessages() {
    if (!socialCloudReady()) return [];
    let rows = await cloudJsonRequest(`/rest/v1/chat_messages?select=id,user_id,nickname,body,payload,created_at&order=created_at.desc&limit=${SOCIAL_CHAT_LIMIT}`, {});
    return Array.isArray(rows) ? rows.slice().reverse() : [];
}
function checkSendRateLimit() {
    let now = Date.now();
    socialState.sendTimestamps = socialState.sendTimestamps.filter(t => now - t < 60000);
    let last = socialState.sendTimestamps[socialState.sendTimestamps.length - 1] || 0;
    if (now - last < SOCIAL_SEND_MIN_INTERVAL_MS) return '메시지를 너무 빠르게 보냈습니다. 잠시 후 다시 시도해주세요.';
    if (socialState.sendTimestamps.length >= SOCIAL_SEND_MAX_PER_MIN) return `1분에 최대 ${SOCIAL_SEND_MAX_PER_MIN}개까지 보낼 수 있습니다. 잠시 후 다시 시도해주세요.`;
    return true;
}
function translateSpamError(msg) {
    if (/SPAM_TOO_FAST/.test(msg)) return '메시지를 너무 빠르게 보냈습니다.';
    if (/SPAM_RATE_LIMIT/.test(msg)) return '너무 많이 보냈습니다. 잠시 후 다시 시도해주세요.';
    if (/SPAM_DUPLICATE/.test(msg)) return '같은 메시지를 연속으로 보낼 수 없습니다.';
    if (/char_length|_body_check|violates check/.test(msg)) return `메시지는 1~${SOCIAL_MSG_MAX}자여야 합니다.`;
    return msg;
}
async function sendChatMessage() {
    if (!socialCloudReady()) { alert('먼저 클라우드 로그인이 필요합니다.'); return; }
    let nickname = getMyNickname();
    if (!nickname) { await promptAndSetNickname(); if (!getMyNickname()) return; nickname = getMyNickname(); }
    let inputEl = document.getElementById('social-chat-input');
    if (!inputEl) return;
    let body = String(inputEl.value || '').trim();
    let items = socialState.pendingChatItems.slice(0, SOCIAL_MAX_ITEMS_PER_MSG);
    if (!body && !items.length) return;
    if (body.length > SOCIAL_MSG_MAX) { alert(`메시지는 최대 ${SOCIAL_MSG_MAX}자까지 입력할 수 있습니다.`); return; }
    if (body && body === socialState.lastSentBody && !items.length) { alert('같은 메시지를 연속으로 보낼 수 없습니다.'); return; }
    let rate = checkSendRateLimit();
    if (rate !== true) { alert(rate); return; }

    let payload = items.length ? { items } : null;
    let prevPending = socialState.pendingChatItems.slice();
    inputEl.value = '';
    socialState.pendingChatItems = [];
    renderPendingChatItems();
    updateChatCounter();
    try {
        syncPlayerProfileQuiet();
        await cloudJsonRequest('/rest/v1/chat_messages', {
            method: 'POST', headers: { Prefer: 'return=minimal' },
            body: { user_id: socialLoggedInUserId(), nickname, body: body || '🔗', payload }
        });
        socialState.sendTimestamps.push(Date.now());
        socialState.lastSentBody = body;
        await refreshChatPanel(true);
    } catch (e) {
        inputEl.value = body;
        socialState.pendingChatItems = prevPending;
        renderPendingChatItems();
        updateChatCounter();
        alert('메시지 전송 실패: ' + translateSpamError(String(e && e.message || e)));
    }
}

// --- 아이템 링크 첨부 ------------------------------------------------------
function attachChatItem(source, idx) {
    let item = null;
    if (source === 'equip') { let eq = (typeof game !== 'undefined' && game.equipment) ? game.equipment : {}; item = eq[idx]; }
    else { let inv = (typeof game !== 'undefined' && Array.isArray(game.inventory)) ? game.inventory : []; item = inv[idx]; }
    let snap = buildItemSnapshot(item, source === 'equip' ? idx : (item && item.slot));
    if (!snap) return;
    if (socialState.pendingChatItems.length >= SOCIAL_MAX_ITEMS_PER_MSG) { alert(`메시지당 최대 ${SOCIAL_MAX_ITEMS_PER_MSG}개의 아이템만 첨부할 수 있습니다.`); return; }
    let tokenIndex = socialState.pendingChatItems.length;
    socialState.pendingChatItems.push(snap);
    let inputEl = document.getElementById('social-chat-input');
    if (inputEl) { inputEl.value = (inputEl.value || '') + `⟦${tokenIndex}⟧`; inputEl.focus(); }
    renderPendingChatItems();
    updateChatCounter();
    closeItemPicker();
}
function removePendingChatItem(idx) {
    socialState.pendingChatItems.splice(idx, 1);
    let inputEl = document.getElementById('social-chat-input');
    if (inputEl) {
        let base = String(inputEl.value || '').replace(SOCIAL_ITEM_TOKEN_RE, '').trim();
        let tokens = socialState.pendingChatItems.map((_, i) => `⟦${i}⟧`).join('');
        inputEl.value = (base + (base && tokens ? ' ' : '') + tokens);
    }
    renderPendingChatItems();
    updateChatCounter();
}
function renderPendingChatItems() {
    let host = document.getElementById('social-pending-items');
    if (!host) return;
    if (!socialState.pendingChatItems.length) { host.innerHTML = ''; host.style.display = 'none'; return; }
    host.style.display = 'flex';
    host.innerHTML = socialState.pendingChatItems.map((it, i) => {
        let color = socialRarityColor(it.rarity);
        return `<span class="social-pending-chip" style="border-color:${color};color:${color};">⟦${i}⟧ ${socialEscape(it.name)}<button onclick="removePendingChatItem(${i})" title="첨부 취소">✕</button></span>`;
    }).join('');
}
function updateChatCounter() {
    let inputEl = document.getElementById('social-chat-input');
    let counterEl = document.getElementById('social-chat-counter');
    if (!inputEl || !counterEl) return;
    let len = String(inputEl.value || '').length;
    counterEl.textContent = `${len}/${SOCIAL_MSG_MAX}`;
    counterEl.style.color = len > SOCIAL_MSG_MAX ? '#e88' : '#67809c';
}
function openItemPicker() {
    if (!socialCloudReady()) { alert('먼저 클라우드 로그인이 필요합니다.'); return; }
    let modal = document.getElementById('social-item-picker-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'social-item-picker-modal';
        modal.className = 'social-modal-overlay';
        modal.onclick = function (e) { if (e.target === modal) closeItemPicker(); };
        document.body.appendChild(modal);
    }
    socialState.pickTips = {};
    let slotLabel = (typeof getItemSlotDisplayLabel === 'function') ? (it => getItemSlotDisplayLabel(it)) : (it => (it && it.slot) || '');
    let tipAttrs = key => `onmouseenter="showSocialTip(event,'pick','${key}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()"`;
    let eq = (typeof game !== 'undefined' && game.equipment) ? game.equipment : {};
    let equipCards = Object.keys(eq).filter(s => eq[s]).map(slot => {
        let it = eq[slot]; let color = socialRarityColor(it.rarity);
        let key = `eq:${socialEscape(slot)}`;
        socialState.pickTips[key] = renderProfileItemCard(buildItemSnapshot(it, slot));
        return `<div class="social-pick-item" style="border-color:${color};" onclick="attachChatItem('equip','${socialEscape(slot)}')" ${tipAttrs(key)}><span style="color:${color};">[${socialEscape(slot)}] ${socialEscape(it.name)}</span></div>`;
    }).join('') || `<div class="social-profile-empty">장착한 장비 없음</div>`;
    let inv = (typeof game !== 'undefined' && Array.isArray(game.inventory)) ? game.inventory : [];
    let invCards = inv.slice(0, 300).map((it, i) => {
        if (!it) return '';
        let color = socialRarityColor(it.rarity);
        let key = `inv:${i}`;
        socialState.pickTips[key] = renderProfileItemCard(buildItemSnapshot(it, it.slot));
        return `<div class="social-pick-item" style="border-color:${color};" onclick="attachChatItem('inv',${i})" ${tipAttrs(key)}><span style="color:${color};">[${socialEscape(slotLabel(it))}] ${socialEscape(it.name)}</span></div>`;
    }).join('') || `<div class="social-profile-empty">인벤토리 비어 있음</div>`;
    modal.innerHTML = `<div class="social-modal-box"><button class="social-modal-close" onclick="closeItemPicker()" aria-label="닫기">✕</button>
        <div class="social-modal-content">
        <h3 style="color:#cfe0f5;margin-top:0;">🔗 첨부할 아이템 선택 (최대 ${SOCIAL_MAX_ITEMS_PER_MSG}개) · 마우스를 올리면 옵션 표시</h3>
        <h4 class="social-pick-sub">장착 중</h4><div class="social-pick-grid">${equipCards}</div>
        <h4 class="social-pick-sub">인벤토리${inv.length > 300 ? ' (상위 300개)' : ''}</h4><div class="social-pick-grid">${invCards}</div>
        </div></div>`;
    modal.style.display = 'flex';
}
function closeItemPicker() { hideSocialTip(); let m = document.getElementById('social-item-picker-modal'); if (m) m.style.display = 'none'; }

function renderChatBody(m) {
    let body = String(m.body || '');
    let items = (m.payload && Array.isArray(m.payload.items)) ? m.payload.items.slice(0, SOCIAL_MAX_ITEMS_PER_MSG) : [];
    if (!items.length || body.indexOf('⟦') === -1) return socialEscape(body);
    let out = '', lastIndex = 0;
    let re = new RegExp(SOCIAL_ITEM_TOKEN_RE.source, 'g');
    let match;
    while ((match = re.exec(body)) !== null) {
        out += socialEscape(body.slice(lastIndex, match.index));
        let n = parseInt(match[1], 10);
        let snap = items[n];
        if (snap) {
            let key = `${m.id}:${n}`;
            socialState.chatTips[key] = renderProfileItemCard(snap);
            let color = socialRarityColor(snap.rarity);
            out += `<span class="social-item-link" style="border-color:${color};color:${color};" onmouseenter="showSocialTip(event,'chat','${socialEscape(key)}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('chat','${socialEscape(key)}')">🔗 ${socialEscape(snap.name)}</span>`;
        } else { out += socialEscape(match[0]); }
        lastIndex = match.index + match[0].length;
    }
    out += socialEscape(body.slice(lastIndex));
    return out;
}
function formatChatTime(iso) {
    let d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '';
    let mm = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    let hh = String(d.getHours()).padStart(2, '0'), mi = String(d.getMinutes()).padStart(2, '0');
    return `${mm}/${dd} ${hh}:${mi}`;
}
function renderChatMessages(messages) {
    let listEl = document.getElementById('social-chat-list');
    if (!listEl) return;
    let myId = socialLoggedInUserId();
    // 채팅 목록이 실제로 보이는 시점 = 확인한 것으로 간주. 마지막 확인 id를 갱신해
    // 백그라운드 새 채팅 알림의 기준점을 옮기고, 커뮤니티 탭 알림 점을 끈다.
    let maxId = messages.reduce((acc, m) => Math.max(acc, Number(m.id) || 0), 0);
    if (maxId > 0) setLastSeenChatId(maxId);
    if (typeof game !== 'undefined' && game && game.noti) game.noti.social = false;
    let key = messages.map(m => `${m.id}:${m.nickname}`).join(',');
    if (key === socialState.lastChatRenderKey) return;
    socialState.lastChatRenderKey = key;
    if (!messages.length) { listEl.innerHTML = `<div class="social-chat-empty">아직 메시지가 없습니다. 첫 메시지를 남겨보세요!</div>`; return; }
    let nearBottom = (listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight) < 60;
    socialState.chatTips = {};
    listEl.innerHTML = messages.map(m => {
        let mine = m.user_id === myId;
        return `<div class="social-chat-msg${mine ? ' mine' : ''}">`
            + `<span class="social-chat-nick" onclick="openPlayerProfile('${socialEscape(m.user_id)}')">${socialEscape(m.nickname || '익명')}</span>`
            + `<span class="social-chat-time">${formatChatTime(m.created_at)}</span>`
            + `<div class="social-chat-body">${renderChatBody(m)}</div></div>`;
    }).join('');
    if (nearBottom) listEl.scrollTop = listEl.scrollHeight;
}
async function refreshChatPanel(forceScroll) {
    if (socialState.chatLoading) return;
    socialState.chatLoading = true;
    try {
        renderChatMessages(await loadChatMessages());
        if (forceScroll) { let l = document.getElementById('social-chat-list'); if (l) l.scrollTop = l.scrollHeight; }
    } catch (e) { console.warn('채팅 로드 실패:', e); } finally { socialState.chatLoading = false; }
}
function startChatPolling() {
    stopChatPolling();
    if (!socialCloudReady()) return;
    refreshChatPanel(true);
    refreshOnlineUsers();
    socialState.chatPollTimer = setInterval(() => {
        let tabEl = document.getElementById('tab-social');
        if (!tabEl || !tabEl.classList.contains('active')) { stopChatPolling(); return; }
        refreshChatPanel(false);
        refreshOnlineUsers();
    }, SOCIAL_CHAT_POLL_MS);
}
function stopChatPolling() { if (socialState.chatPollTimer) { clearInterval(socialState.chatPollTimer); socialState.chatPollTimer = null; } }
function onSocialChatKeydown(event) { if (event && event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendChatMessage(); } }

// ============================================================================
// 커스텀 툴팁
// ============================================================================
function ensureSocialTooltip() {
    let tip = document.getElementById('social-tooltip');
    if (tip) return tip;
    tip = document.createElement('div');
    tip.id = 'social-tooltip'; tip.className = 'social-tooltip'; tip.style.display = 'none';
    document.body.appendChild(tip);
    return tip;
}
function tipMapByScope(scope) {
    return scope === 'chat' ? socialState.chatTips : (scope === 'pick' ? socialState.pickTips : socialState.profileTips);
}
function showSocialTip(event, scope, key) {
    let html = tipMapByScope(scope)[key];
    if (!html) return;
    let tip = ensureSocialTooltip();
    tip.innerHTML = html; tip.style.display = 'block';
    moveSocialTip(event);
}
function moveSocialTip(event) {
    let tip = document.getElementById('social-tooltip');
    if (!tip || tip.style.display === 'none') return;
    let pad = 16, w = tip.offsetWidth, h = tip.offsetHeight;
    let x = event.clientX + pad, y = event.clientY + pad;
    if (x + w > window.innerWidth - 8) x = event.clientX - w - pad;
    if (x < 8) x = 8;
    if (y + h > window.innerHeight - 8) y = window.innerHeight - h - 8;
    if (y < 8) y = 8;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
function hideSocialTip() { let t = document.getElementById('social-tooltip'); if (t) t.style.display = 'none'; }
// 부적 보드: 같은 부적의 모든 칸을 동시에 강조
function socialTalHighlight(idx, on) {
    document.querySelectorAll(`.social-tal-cell[data-tal="${idx}"]`).forEach(c => c.classList.toggle('hl', !!on));
}
function socialTalEnter(event, idx, key) { socialTalHighlight(idx, true); showSocialTip(event, 'profile', key); }
function socialTalLeave(idx) { socialTalHighlight(idx, false); hideSocialTip(); }
function openTipModal(scope, key) {
    let html = tipMapByScope(scope)[key];
    if (!html) return;
    let modal = ensureProfileModal();
    modal.style.display = 'flex';
    let body = document.getElementById('social-profile-body');
    if (body) body.innerHTML = `<div class="social-equip-grid">${html}</div>`;
}

// ============================================================================
// 카드 렌더러(티어·롤범위·색상 포함)
// ============================================================================
function socialStatLineHtml(st, opts) {
    opts = opts || {};
    if (!st || st.id == null) return '';
    let id = st.id;
    let name = st.statName || (typeof getStatName === 'function' ? getStatName(id) : id) || id;
    let val = (typeof formatValue === 'function') ? formatValue(id, st.val) : st.val;
    let toneFn = opts.jewel && typeof getJewelStatToneColor === 'function' ? getJewelStatToneColor : (typeof getItemStatToneColor === 'function' ? getItemStatToneColor : null);
    let tone = socialSafeColor(toneFn ? toneFn(id) : null, '#cfe0f5');
    // 베이스 옵션에는 티어를 표시하지 않는다(베이스도 tier:0 이라 [U]로 잘못 표기되는 것 방지).
    let tierHtml = (!opts.base && st.tier != null && typeof getTierBadgeHtml === 'function') ? ' ' + getTierBadgeHtml(Math.floor(st.tier), 'T') : '';
    let range = '';
    if (opts.range !== false) {
        let mn = st.valMin, mx = st.valMax;
        if ((mn == null || mx == null) && opts.estimate) { let c = Number(st.val || 0); mn = Number((c * 0.8).toFixed(2)); mx = Number((c * 1.2).toFixed(2)); }
        if (mn != null && mx != null) {
            let fmn = (typeof formatValue === 'function') ? formatValue(id, mn) : mn;
            let fmx = (typeof formatValue === 'function') ? formatValue(id, mx) : mx;
            range = ` <span class="social-roll">(${socialEscape(fmn)}~${socialEscape(fmx)})</span>`;
        }
    }
    let cls = opts.base ? 'social-item-stat base' : 'social-item-stat';
    let colorStyle = opts.base ? '' : `style="color:${tone};"`;
    // 특수 표기: 고정 옵션(제작 제거 불가), 융합 계승 옵션, 특출 베이스(✦+20%).
    let lockMark = st.locked ? `<span style="color:#ffd166;font-weight:700;">[고정] </span>` : '';
    let fusedMark = st.fusedFromRare ? `<span style="color:#8fd8ff;">⌛</span> ` : '';
    let exMark = st.exceptional ? ` <span style="color:#ffb454;font-weight:700;">✦+20%</span>` : '';
    return `<div class="${cls}" ${colorStyle}>${lockMark}${fusedMark}${socialEscape(name)} +${socialEscape(val)}${tierHtml}${range}${exMark}</div>`;
}
function renderProfileItemCard(item) {
    if (!item) return '';
    if (item.kind) return renderSimpleCard(item);
    let color = socialRarityColor(item.rarity);
    let lines = '';
    (item.baseStats || []).forEach(st => { lines += socialStatLineHtml(st, { base: true, estimate: true }); });
    (item.stats || []).forEach(st => {
        lines += socialStatLineHtml(st, {});
        (st.extraStats || []).forEach(ex => { lines += socialStatLineHtml(ex, {}); });
    });
    // 혼돈 주입 옵션(별도 필드) — 실제 툴팁처럼 [주입] 접두사로 표시.
    let statLabel = st => st.statName || (typeof getStatName === 'function' ? getStatName(st.id) : st.id) || st.id;
    if (item.chaosInfusion) {
        lines += socialStatLineHtml({ ...item.chaosInfusion, statName: `[주입] ${statLabel(item.chaosInfusion)}` }, {});
    }
    // 잠식 특수 옵션 — 해방 후에만 실제 옵션이 붙는다.
    if (item.encroached) {
        lines += item.encroached.chosen
            ? socialStatLineHtml({ ...item.encroached.chosen, statName: `[잠식] ${statLabel(item.encroached.chosen)}` }, {})
            : `<div class="social-item-stat" style="color:#8d7bb3;">[잠식] 해방 전 — 효과 없음</div>`;
    }
    let unique = item.uniqueEffect ? `<div class="social-item-unique">✨ ${socialEscape(item.uniqueEffect)}</div>` : '';
    let corrupt = item.corrupted ? ` <span style="color:#e74c3c;">(타락)</span>` : '';
    let encroachBadge = item.encroached ? ` <span style="color:#b084ff;">(잠식)</span>` : '';
    let sealBadge = item.loopSealed ? ` <span style="color:#7fd99a;">🌿봉인</span>` : '';
    // 고유 융합 유물(시간의 균열): 융합 등급 + 계승 원본 표시.
    let fusion = '';
    if (item.fusedRelic) {
        let gradeLabel = item.fusionGrade === 'perfect' ? '완벽한 융합' : (item.fusionGrade === 'unstable' ? '불안정한 융합' : '보통 융합');
        fusion = `<div class="social-item-stat" style="color:#8fd8ff;">⌛ ${gradeLabel}${item.fusedRareName ? ` · [${socialEscape(item.fusedRareName)}]의 기억` : ''}</div>`;
    }
    return `<div class="social-item-card" style="border-color:${color};">`
        + `<div class="social-item-title" style="color:${color};">${item.slot ? `[${socialEscape(item.slot)}] ` : ''}${socialEscape(item.name)}${encroachBadge}${corrupt}${sealBadge}</div>`
        + (item.baseName ? `<div class="social-item-base">${socialEscape(item.baseName)}</div>` : '')
        + fusion + unique + lines + `</div>`;
}
function renderSimpleCard(snap) {
    let color = socialRarityColor(snap.rarity);
    let lines = '';
    (snap.stats || []).forEach(st => { lines += socialStatLineHtml(st, { jewel: snap.kind === 'jewel', range: snap.kind === 'jewel' }); });
    (snap.effects || []).forEach(e => { lines += `<div class="social-item-stat" style="color:#d7b8ff;">${socialEscape(e)}</div>`; });
    return `<div class="social-item-card" style="border-color:${color};">`
        + `<div class="social-item-title" style="color:${color};">${socialEscape(snap.name)}</div>`
        + (lines || `<div class="social-item-stat" style="color:#7c90ab;">옵션 없음</div>`) + `</div>`;
}

// ============================================================================
// 프로필 모달
// ============================================================================
function ensureProfileModal() {
    let modal = document.getElementById('social-profile-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'social-profile-modal'; modal.className = 'social-modal-overlay'; modal.style.display = 'none';
    modal.onclick = function (e) { if (e.target === modal) closePlayerProfile(); };
    modal.innerHTML = `<div class="social-modal-box"><button class="social-modal-close" onclick="closePlayerProfile()" aria-label="닫기">✕</button><div class="social-modal-content"><div id="social-profile-body"></div></div></div>`;
    document.body.appendChild(modal);
    return modal;
}
function closePlayerProfile() { hideSocialTip(); let m = document.getElementById('social-profile-modal'); if (m) m.style.display = 'none'; }
// 내 프로필 미리보기: 프로필은 서버에 마지막으로 업로드된 스냅샷이므로, 그대로 열면
// 방금 장착한 주얼/부적/장비가 빠진 옛 데이터가 보인다. 미리보기 전에 현재 상태를
// 업로드해 남들이 보게 될 것과 동일한 최신 프로필을 보여준다.
async function openMyProfilePreview() {
    if (!socialCloudReady()) { alert('프로필을 보려면 먼저 클라우드 로그인이 필요합니다.'); return; }
    if (getMyNickname()) {
        try { await uploadPlayerProfile({ silent: true }); } catch (e) { /* 실패해도 기존 프로필로 열기 */ }
    }
    openPlayerProfile(socialLoggedInUserId());
}

// 장비: 실제 장비창(페이퍼돌) 형태
function renderProfileEquipPaperdoll(equipment) {
    let bySlot = {};
    (equipment || []).forEach(it => { if (it && it.slot) bySlot[it.slot] = it; });
    let slots = SOCIAL_EQUIP_SLOTS.slice();
    if (bySlot['반지3'] && slots.indexOf('반지3') === -1) slots.push('반지3');
    return `<div class="paperdoll social-paperdoll">` + slots.map(slot => {
        let it = bySlot[slot];
        let baseLabel = slot.replace(/[123]$/, '');
        if (!it) return `<div class="slot-box slot-${slot} social-slot empty"><div class="social-slot-tag">[${socialEscape(baseLabel)}]</div><div class="social-slot-name" style="color:#7f8c8d;">비어있음</div></div>`;
        let color = socialRarityColor(it.rarity);
        let key = `eq:${slot}`;
        socialState.profileTips[key] = renderProfileItemCard(it);
        return `<div class="slot-box slot-${slot} social-slot" style="border-color:${color};" onmouseenter="showSocialTip(event,'profile','${key}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('profile','${key}')"><div class="social-slot-tag">[${socialEscape(baseLabel)}]</div><div class="social-slot-name" style="color:${color};">${socialEscape(it.name)}</div></div>`;
    }).join('') + `</div>`;
}
// 부적: 실제 배치도(8x8 보드) 형태
function renderProfileTalismanBoard(profile) {
    let talismans = profile.talismans || [];
    let board = Array.isArray(profile.talBoard) ? profile.talBoard : [];
    let W = profile.boardW || (typeof TALISMAN_BOARD_W !== 'undefined' ? TALISMAN_BOARD_W : 8);
    let H = profile.boardH || (typeof TALISMAN_BOARD_H !== 'undefined' ? TALISMAN_BOARD_H : 8);
    let mask = (typeof TALISMAN_BOARD_MASK !== 'undefined') ? TALISMAN_BOARD_MASK : null;
    if (!board.length) {
        if (!talismans.length) return `<div class="social-profile-empty">장착한 부적 없음</div>`;
        // 구버전 스냅샷: 목록으로 대체
        return `<div class="social-mini-grid">` + talismans.map((t, i) => {
            let key = `tl:${i}`; socialState.profileTips[key] = renderSimpleCard(t);
            let color = socialRarityColor(t.rarity);
            return `<div class="social-mini-card" style="border-color:${color};color:${color};" onmouseenter="showSocialTip(event,'profile','${key}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('profile','${key}')">${socialEscape(t.name)}</div>`;
        }).join('') + `</div>`;
    }
    let cells = '';
    for (let i = 0; i < W * H; i++) {
        let x = i % W, y = Math.floor(i / W);
        let valid = mask ? mask.has(`${x},${y}`) : true;
        if (!valid) { cells += `<span class="social-tal-cell void"></span>`; continue; }
        let idx = board[i];
        if (idx != null && idx >= 0 && talismans[idx]) {
            let t = talismans[idx];
            let color = socialSafeColor(typeof getTalismanShapeStyle === 'function' ? getTalismanShapeStyle(t.shape).color : null, '#9fb3c7');
            let key = `tb:${i}`;
            socialState.profileTips[key] = renderSimpleCard(t);
            cells += `<span class="social-tal-cell filled" data-tal="${idx}" style="background:linear-gradient(145deg, rgba(255,255,255,0.28) 0%, ${color} 45%, rgba(8,12,18,0.25) 100%); border-color:${color};" onmouseenter="socialTalEnter(event, ${idx}, '${key}')" onmousemove="moveSocialTip(event)" onmouseleave="socialTalLeave(${idx})" onclick="openTipModal('profile','${key}')"></span>`;
        } else {
            cells += `<span class="social-tal-cell empty"></span>`;
        }
    }
    return `<div class="social-tal-board" style="grid-template-columns:repeat(${W}, 1fr);">${cells}</div>`;
}
function renderProfileItemsArea() {
    let p = socialState.currentProfile;
    if (!p) return '';
    socialState.profileTips = {};
    let cat = socialState.profileTab;
    if (cat === 'equipment') return renderProfileEquipPaperdoll(p.equipment);
    if (cat === 'talismans') return renderProfileTalismanBoard(p);
    // jewels
    let jewels = p.jewels || [];
    if (!jewels.length) return `<div class="social-profile-empty">장착한 주얼 없음</div>`;
    return `<div class="social-mini-grid">` + jewels.map((it, i) => {
        let key = `jw:${i}`; socialState.profileTips[key] = renderSimpleCard(it);
        let color = socialRarityColor(it.rarity);
        return `<div class="social-mini-card" style="border-color:${color};color:${color};" onmouseenter="showSocialTip(event,'profile','${key}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('profile','${key}')">${socialEscape(it.name)}</div>`;
    }).join('') + `</div>`;
}
function switchProfileTab(cat) {
    socialState.profileTab = cat;
    hideSocialTip();
    let tabsEl = document.getElementById('social-profile-tabs');
    if (tabsEl) Array.from(tabsEl.children).forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-cat') === cat));
    let areaEl = document.getElementById('social-profile-items');
    if (areaEl) areaEl.innerHTML = renderProfileItemsArea();
}
function renderProfileData(profile) {
    let body = document.getElementById('social-profile-body');
    if (!body) return;
    if (!profile) { body.innerHTML = `<div class="social-profile-empty">프로필을 찾을 수 없습니다.<br>상대가 아직 게임을 클라우드에 저장하지 않았을 수 있어요.</div>`; return; }
    socialState.currentProfile = profile;
    socialState.profileTab = 'equipment';
    let p = profile;
    let stats = Array.isArray(p.stats) ? p.stats : [];
    let statsHtml = stats.length
        ? stats.map(s => `<div class="social-stat-item"><span class="social-stat-label">${socialEscape(s.label)}</span><span class="social-stat-value" style="color:${socialSafeColor(s.color, '#eaf2ff')};">${socialEscape(s.value)}</span></div>`).join('')
        : `<div class="social-profile-empty">스탯 정보 없음</div>`;
    let updatedAt = p.updatedAt ? new Date(p.updatedAt) : null;
    let updated = (updatedAt && Number.isFinite(updatedAt.getTime())) ? updatedAt.toLocaleString('ko-KR') : '';
    body.innerHTML = `
        <div class="social-profile-header">
            <div class="social-profile-name">${socialEscape(p.nickname || '익명')}</div>
            <div class="social-profile-sub">Lv.${socialEscape(p.level || 1)} · ${socialEscape(p.className || '무직')} · 🔁 루프 ${socialEscape(socialComma(p.loop || 0))}${p.power ? ` · 전투력 ${socialEscape(socialComma(p.power))}` : ''}</div>
            ${updated ? `<div class="social-profile-updated">갱신: ${socialEscape(updated)}</div>` : ''}
        </div>
        <div class="social-profile-cols">
            <div class="social-profile-col">
                <h3>📊 스탯</h3>
                <div class="social-stat-grid">${statsHtml}</div>
            </div>
            <div class="social-profile-col">
                <h3>🎒 장착</h3>
                <div id="social-profile-tabs" class="social-profile-tabs">
                    <button data-cat="equipment" class="active" onclick="switchProfileTab('equipment')">장비</button>
                    <button data-cat="jewels" onclick="switchProfileTab('jewels')">주얼</button>
                    <button data-cat="talismans" onclick="switchProfileTab('talismans')">부적</button>
                </div>
                <div id="social-profile-items">${renderProfileItemsArea()}</div>
            </div>
        </div>`;
}
async function openPlayerProfile(userId) {
    if (!userId) return;
    if (!socialCloudReady()) { alert('프로필을 보려면 먼저 클라우드 로그인이 필요합니다.'); return; }
    let modal = ensureProfileModal();
    modal.style.display = 'flex';
    let body = document.getElementById('social-profile-body');
    if (body) body.innerHTML = `<div class="social-profile-empty">불러오는 중…</div>`;
    try {
        let rows = await cloudJsonRequest(`/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(userId)}&select=nickname,profile_data,updated_at`, {});
        let row = Array.isArray(rows) ? rows[0] : null;
        if (!row) { renderProfileData(null); return; }
        let profile = row.profile_data || {};
        if (!profile.nickname && row.nickname) profile.nickname = row.nickname;
        renderProfileData(profile);
    } catch (e) {
        if (body) body.innerHTML = `<div class="social-profile-empty">불러오기 실패: ${socialEscape(String(e && e.message || e))}</div>`;
    }
}

// ============================================================================
// 소셜 탭
// ============================================================================
function renderSocialTab() {
    let host = document.getElementById('tab-social');
    if (!host) return;
    let loggedIn = socialCloudReady();
    let nickname = getMyNickname();
    if (!loggedIn) {
        host.innerHTML = `<h2>💬 커뮤니티</h2><div class="social-notice">채팅·접속자·프로필 구경 기능은 <strong>클라우드 로그인</strong>이 필요합니다.<br>설정 탭에서 로그인 후 다시 열어주세요.</div>`;
        stopChatPolling();
        return;
    }
    host.innerHTML = `
        <h2>💬 커뮤니티</h2>
        <div class="social-toolbar">
            <span class="social-mynick">내 닉네임: <strong>${nickname ? socialEscape(nickname) : '<span style="color:#e88;">미설정</span>'}</strong></span>
            <button onclick="promptAndSetNickname()">${nickname ? '닉네임 변경' : '닉네임 설정'}</button>
            <button onclick="openMyProfilePreview()">내 프로필 미리보기</button>
            <button onclick="syncPlayerProfileQuiet()" title="현재 장비/스탯을 공개 프로필에 반영">프로필 갱신</button>
        </div>
        <div id="social-online" class="social-online" style="display:none;"></div>
        <div class="social-chat-wrap">
            <div id="social-chat-list" class="social-chat-list"><div class="social-chat-empty">불러오는 중…</div></div>
            <div id="social-pending-items" class="social-pending-items" style="display:none;"></div>
            <div class="social-chat-inputbar">
                <button class="social-attach-btn" onclick="openItemPicker()" title="아이템 첨부" ${nickname ? '' : 'disabled'}>🔗</button>
                <input id="social-chat-input" type="text" maxlength="${SOCIAL_MSG_MAX}" placeholder="${nickname ? '메시지를 입력하세요…' : '먼저 닉네임을 설정하세요'}" onkeydown="onSocialChatKeydown(event)" oninput="updateChatCounter()" ${nickname ? '' : 'disabled'}>
                <span id="social-chat-counter" class="social-chat-counter">0/${SOCIAL_MSG_MAX}</span>
                <button onclick="sendChatMessage()" ${nickname ? '' : 'disabled'}>전송</button>
            </div>
            <div class="social-hint">닉네임 클릭 → 장비/주얼/부적·스탯, 🔗 링크/아이템에 마우스를 올리면 옵션을 볼 수 있습니다. (닉네임은 하루 1회 변경)</div>
        </div>`;
    socialState.lastChatRenderKey = '';
    socialState.lastOnlineRenderKey = '';
    renderPendingChatItems();
    updateChatCounter();
    ensureHeartbeat();
    startChatPolling();
    if (!nickname) restoreNicknameFromServer().then(() => { if (getMyNickname()) renderSocialTab(); });
}

// ============================================================================
// 스타일
// ============================================================================
function injectSocialStyles() {
    if (document.getElementById('social-styles')) return;
    let style = document.createElement('style');
    style.id = 'social-styles';
    style.textContent = `
    .social-notice,.social-hint{color:#9fb4d1;font-size:0.86em;line-height:1.5;}
    .social-notice{background:rgba(20,34,56,0.6);border:1px solid #24344f;border-radius:8px;padding:12px;margin-top:8px;}
    .social-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0;}
    .social-toolbar .social-mynick{margin-right:auto;color:#cfe0f5;}
    .social-online{background:rgba(16,28,46,0.6);border:1px solid #24344f;border-radius:8px;padding:8px 10px;margin-bottom:8px;}
    .social-online-title{color:#7fd99a;font-size:0.82em;font-weight:700;margin-bottom:6px;}
    .social-online-list{display:flex;flex-wrap:wrap;gap:6px;}
    .social-online-chip{font-size:0.8em;background:#13202f;border:1px solid #285038;border-radius:14px;padding:2px 9px;color:#cfe0f5;cursor:pointer;}
    .social-online-chip:hover{background:#1b3327;}
    .social-online-chip.me{border-color:#3a6ea5;}
    .social-online-empty{color:#7c90ab;font-size:0.82em;}
    .social-chat-wrap{display:flex;flex-direction:column;gap:8px;}
    .social-chat-list{height:46vh;min-height:240px;overflow-y:auto;background:linear-gradient(170deg,#0d1420,#111c2c);border:1px solid #24344f;border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;}
    .social-chat-empty{color:#7c90ab;text-align:center;margin:auto;font-size:0.9em;}
    .social-chat-msg{max-width:82%;align-self:flex-start;background:#16243a;border:1px solid #233957;border-radius:10px;padding:6px 10px;}
    .social-chat-msg.mine{align-self:flex-end;background:#1d3350;border-color:#2f5180;}
    .social-chat-nick{color:#7fc1ff;font-weight:700;font-size:0.86em;cursor:pointer;}
    .social-chat-nick:hover{text-decoration:underline;}
    .social-chat-time{color:#6b7e98;font-size:0.72em;margin-left:6px;}
    .social-chat-body{color:#e4eefb;margin-top:3px;white-space:pre-wrap;word-break:break-word;}
    .social-chat-inputbar{display:flex;gap:8px;align-items:center;}
    .social-chat-inputbar input{flex:1;padding:9px 12px;background:#0e1726;border:1px solid #2a3e5c;border-radius:8px;color:#eaf2ff;}
    .social-attach-btn{padding:9px 11px;background:#16243a;border:1px solid #2f5180;border-radius:8px;color:#cfe0f5;cursor:pointer;}
    .social-chat-counter{font-size:0.74em;color:#67809c;min-width:46px;text-align:right;}
    .social-pending-items{display:flex;flex-wrap:wrap;gap:6px;}
    .social-pending-chip{display:inline-flex;align-items:center;gap:4px;font-size:0.78em;background:#0f1a28;border:1px solid;border-radius:14px;padding:2px 6px 2px 9px;}
    .social-pending-chip button{background:none;border:none;color:inherit;cursor:pointer;padding:0 2px;font-size:0.9em;}
    .social-item-link{display:inline-block;font-size:0.86em;font-weight:700;border:1px solid;border-radius:6px;padding:0 6px;margin:0 1px;cursor:pointer;}
    .social-item-link:hover{filter:brightness(1.2);}
    .social-modal-overlay{position:fixed;inset:0;background:rgba(4,8,14,0.78);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;}
    .social-modal-box{position:relative;width:min(760px,96vw);max-height:90vh;display:flex;flex-direction:column;overflow:hidden;background:linear-gradient(170deg,#101a2a,#0c1421);border:1px solid #2c4063;border-radius:14px;}
    .social-modal-content{flex:1 1 auto;overflow-y:auto;padding:18px 56px 20px 20px;}
    /* position 계열에 !important: ui-premium.css 의 고특이도 전역 버튼 규칙(position:relative)이
       덮어쓰면 X버튼이 왼쪽 위 일반 흐름으로 배치되어 한 줄을 차지하는 문제가 재발한다. */
    .social-modal-close{position:absolute !important;top:10px !important;right:12px !important;left:auto !important;z-index:3;box-sizing:border-box;width:30px;height:30px;min-height:0;padding:0;display:flex;align-items:center;justify-content:center;background:rgba(28,44,68,0.55);border:1px solid rgba(90,120,160,0.4);color:#cfe0f5;border-radius:50%;cursor:pointer;font-size:0.9em;line-height:1;}
    .social-modal-close:hover{background:rgba(44,64,96,0.9);}
    .social-profile-empty{color:#8094ad;text-align:center;padding:24px;}
    .social-profile-header{border-bottom:1px solid #233a59;padding-bottom:12px;margin-bottom:14px;padding-right:34px;}
    .social-profile-name{font-size:1.4em;font-weight:800;color:#f0d7a6;}
    .social-profile-sub{color:#a8c0da;margin-top:4px;}
    .social-profile-updated{color:#67809c;font-size:0.78em;margin-top:4px;}
    .social-profile-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
    @media(max-width:640px){.social-profile-cols{grid-template-columns:1fr;}}
    .social-profile-col h3{color:#cfe0f5;font-size:1em;margin:0 0 8px;}
    .social-profile-tabs{display:flex;gap:6px;margin-bottom:8px;}
    .social-profile-tabs button{flex:1;padding:6px 4px;background:#13202f;border:1px solid #20324b;border-radius:7px;color:#9fb4d1;cursor:pointer;font-size:0.84em;}
    .social-profile-tabs button.active{background:#1d3350;border-color:#3a6ea5;color:#eaf2ff;font-weight:700;}
    .social-stat-grid{display:grid;grid-template-columns:1fr;gap:4px;}
    .social-stat-item{display:flex;justify-content:space-between;gap:10px;background:#13202f;border:1px solid #20324b;border-radius:6px;padding:5px 9px;}
    .social-stat-label{color:#9fb4d1;font-size:0.86em;}
    .social-stat-value{font-weight:700;font-size:0.9em;}
    .social-mini-grid{display:flex;flex-direction:column;gap:6px;}
    .social-mini-card{background:#0f1a28;border:1px solid;border-left-width:3px;border-radius:7px;padding:8px 10px;font-size:0.86em;font-weight:600;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .social-mini-card:hover{background:#16243a;}
    .social-paperdoll{margin:0;}
    .social-paperdoll .social-slot{min-height:62px;display:flex;flex-direction:column;gap:2px;justify-content:center;align-items:center;text-align:center;padding:6px 5px;border-radius:8px;cursor:pointer;background:linear-gradient(170deg,#101722,#152238);}
    .social-paperdoll .social-slot.empty{cursor:default;border:1px dashed #3a4d6e;}
    .social-paperdoll .social-slot-tag{font-size:0.66em;color:#8aa0bd;font-weight:700;}
    .social-paperdoll .social-slot-name{font-size:0.74em;font-weight:700;line-height:1.15;word-break:break-all;}
    .social-tal-board{display:grid;gap:2px;justify-content:center;max-width:280px;margin:0 auto;}
    .social-tal-cell{width:100%;aspect-ratio:1/1;border-radius:3px;border:1px solid rgba(120,140,160,0.18);background:#0a0e14;}
    .social-tal-cell.void{border-color:transparent;background:transparent;}
    .social-tal-cell.empty{background:radial-gradient(circle at 30% 25%, #2a313c 0%, #1a1f27 70%);border-color:rgba(120,140,160,0.28);}
    .social-tal-cell.filled{cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,0.25);transition:filter .08s, box-shadow .08s;}
    .social-tal-cell.filled.hl{filter:brightness(1.35) saturate(1.2);box-shadow:0 0 0 2px rgba(255,230,140,.85), 0 0 10px rgba(255,210,110,.55), inset 0 1px 0 rgba(255,255,255,0.3);z-index:1;}
    .social-equip-grid{display:flex;flex-direction:column;gap:8px;}
    .social-item-card{background:#0f1a28;border:1px solid #2c4063;border-left-width:3px;border-radius:8px;padding:8px 10px;}
    .social-item-title{font-weight:700;font-size:0.92em;}
    .social-item-base{color:#95a5a6;font-size:0.78em;margin:2px 0 4px;}
    .social-item-unique{color:#d7b8ff;font-size:0.82em;margin:3px 0;}
    .social-item-stat{color:#cfe0f5;font-size:0.82em;line-height:1.4;}
    .social-item-stat.base{color:#f1c40f;}
    .social-roll{color:#7f93ad;font-size:0.92em;}
    .social-pick-sub{color:#9fb4d1;margin:14px 0 6px;font-size:0.9em;}
    .social-pick-grid{display:flex;flex-direction:column;gap:6px;max-height:30vh;overflow-y:auto;}
    .social-pick-item{background:#0f1a28;border:1px solid;border-left-width:3px;border-radius:7px;padding:7px 10px;cursor:pointer;font-size:0.86em;}
    .social-pick-item:hover{background:#16243a;}
    .social-tooltip{position:fixed;z-index:10001;max-width:320px;pointer-events:none;display:none;filter:drop-shadow(0 6px 18px rgba(0,0,0,0.6));}
    .social-tooltip .social-item-card{background:#0c1421;border-width:1px;border-left-width:3px;}
    `;
    document.head.appendChild(style);
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { injectSocialStyles(); ensureSocialTooltip(); });
    else { injectSocialStyles(); ensureSocialTooltip(); }
    setInterval(() => { if (socialCloudReady() && getMyNickname()) ensureHeartbeat(); }, SOCIAL_HEARTBEAT_MS);
    // 커뮤니티 탭이 비활성일 때도 새 채팅을 감지해 탭 알림 점을 켠다.
    setInterval(checkSocialChatNotification, SOCIAL_BG_NOTI_POLL_MS);
    // 접속 직후 한 번(클라우드 로그인 복원을 기다린 뒤). setTimeout 가드는 스모크 테스트 샌드박스용.
    if (typeof setTimeout === 'function') setTimeout(checkSocialChatNotification, 15000);
}

if (typeof safeExposeGlobals === 'function') {
    safeExposeGlobals({
        socialState, getMyNickname, promptAndSetNickname, uploadPlayerProfile, syncPlayerProfileQuiet,
        sendChatMessage, onSocialChatKeydown, refreshChatPanel, startChatPolling, stopChatPolling,
        openPlayerProfile, openMyProfilePreview, closePlayerProfile, renderSocialTab, socialLoggedInUserId, restoreNicknameFromServer,
        attachChatItem, removePendingChatItem, openItemPicker, closeItemPicker, openTipModal, updateChatCounter,
        showSocialTip, moveSocialTip, hideSocialTip, switchProfileTab, sendPresenceHeartbeat, refreshOnlineUsers,
        socialTalEnter, socialTalLeave, socialTalHighlight, checkSocialChatNotification
    });
}
