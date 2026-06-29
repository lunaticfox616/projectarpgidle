// ============================================================================
// 소셜 기능: 채팅 + 접속자 목록 + 다른 플레이어 프로필(장비/주얼/부적/스탯) 구경
// ----------------------------------------------------------------------------
// 백엔드는 Supabase(player_profiles / chat_messages). 스키마는 db/social.sql.
// ui.js 이후 로드되며 cloudState / cloudJsonRequest / getPlayerStats / getJewelStats
// / getTalismanDisplayName 등 전역 함수를 재사용한다.
// ============================================================================

const SOCIAL_NICK_KEY = 'arpg_social_nickname';
const SOCIAL_CHAT_LIMIT = 50;
const SOCIAL_CHAT_POLL_MS = 4000;
const SOCIAL_MSG_MAX = 300;            // 채팅 본문 최대 글자수
const SOCIAL_NICK_MIN = 2;
const SOCIAL_NICK_MAX = 16;
const SOCIAL_SEND_MIN_INTERVAL_MS = 1500;  // 연속 전송 최소 간격(스팸방지)
const SOCIAL_SEND_MAX_PER_MIN = 12;        // 분당 최대 전송 수(스팸방지)
const SOCIAL_MAX_ITEMS_PER_MSG = 3;        // 메시지당 아이템 링크 최대 개수
const SOCIAL_HEARTBEAT_MS = 30000;         // 접속 표시 하트비트 주기
const SOCIAL_ONLINE_WINDOW_S = 75;         // 이 시간(초) 안에 활동하면 "접속 중"
// 아이템 링크 토큰: 본문에 ⟦0⟧ 형태로 삽입되고 payload.items[N] 스냅샷과 매칭된다.
const SOCIAL_ITEM_TOKEN_RE = /⟦(\d+)⟧/g;
// 닉네임 허용 문자: 한글/영문/숫자/일부 기호. 공백·제어문자 차단.
const SOCIAL_NICK_RE = /^[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ_\-]+$/;

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
    onlineSupported: true,       // last_seen 컬럼 미적용 시 false로 내려 패널 숨김
    pendingChatItems: [],        // 입력에 첨부 대기 중인 아이템 스냅샷
    sendTimestamps: [],          // 최근 전송 시각(클라이언트 속도 제한)
    lastSentBody: '',            // 직전 전송 본문(중복 방지)
    chatTips: {},                // 채팅 아이템 링크 툴팁 HTML 맵
    profileTips: {},             // 프로필 카드 툴팁 HTML 맵
    currentProfile: null,        // 현재 열람 중인 프로필
    profileTab: 'equipment'      // 프로필 내 탭(equipment/jewels/talismans)
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

// 천 단위 쉼표
function socialComma(n) {
    let v = Math.floor(Number(n) || 0);
    return v.toLocaleString('en-US');
}

function getMyNickname() {
    if (socialState.nickname) return socialState.nickname;
    try {
        let stored = localStorage.getItem(SOCIAL_NICK_KEY);
        if (stored) socialState.nickname = stored;
    } catch (e) { /* localStorage 차단 환경 무시 */ }
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

// ============================================================================
// 스냅샷 빌드(장비/주얼/부적)
// ============================================================================
function buildItemSnapshot(item, slotOverride) {
    if (!item) return null;
    return {
        slot: slotOverride || item.slot || '',
        name: item.name || '',
        rarity: item.rarity || 'normal',
        baseName: item.baseName || '',
        uniqueEffect: item.uniqueEffect || '',
        corrupted: !!item.corrupted,
        baseStats: (item.baseStats || []).map(st => ({ id: st.id || st.stat, val: st.val, statName: st.statName })),
        stats: (item.stats || []).map(st => ({
            id: st.id || st.stat, val: st.val, statName: st.statName,
            extraStats: Array.isArray(st.extraStats) ? st.extraStats.map(ex => ({ id: ex.id || ex.stat, val: ex.val, statName: ex.statName })) : undefined
        }))
    };
}

function buildJewelSnapshot(jewel) {
    if (!jewel) return null;
    let lines = [];
    try {
        if (typeof getJewelStats === 'function') {
            getJewelStats(jewel).forEach(st => {
                let name = (typeof getStatName === 'function' ? getStatName(st.id) : st.id) || st.id;
                let val = (typeof formatJewelStatValue === 'function') ? formatJewelStatValue(st.id, st.val) : st.val;
                lines.push(`${name} +${val}`);
            });
        }
    } catch (e) { /* 무시 */ }
    return { kind: 'simple', name: jewel.name || '주얼', rarity: jewel.rarity || 'normal', lines };
}

function buildTalismanSnapshot(t) {
    if (!t) return null;
    let lines = [];
    if (t.stat) {
        let name = t.statName || (typeof getStatName === 'function' ? getStatName(t.stat) : t.stat);
        let val = (typeof formatValue === 'function') ? formatValue(t.stat, t.value) : t.value;
        lines.push(`${name} +${val}`);
    }
    if (t.special && typeof getTalismanSpecialDescription === 'function') {
        let d = getTalismanSpecialDescription(t);
        if (d) lines.push(`효과: ${d}`);
    }
    let name = (typeof getTalismanDisplayName === 'function') ? getTalismanDisplayName(t) : (t.name || '부적');
    return { kind: 'simple', name, rarity: t.rarity || 'normal', lines };
}

function buildProfileSnapshot() {
    let stats = [];
    let power = 0;
    let loop = (typeof getSaveLoopNumber === 'function' && typeof game !== 'undefined') ? getSaveLoopNumber(game) : 0;
    try {
        let s = typeof getPlayerStats === 'function' ? getPlayerStats() : null;
        if (s) {
            power = Math.floor(Number(s.dps) || Number(s.hitDps) || 0);
            let pct = v => `${(Number(v) || 0).toFixed(1)}%`;
            stats = [
                { label: '🔁 루프 횟수', value: socialComma(loop) },
                { label: '❤️ 최대 생명력', value: socialComma(s.maxHp) },
                { label: '⚔️ DPS', value: socialComma(s.dps || s.hitDps) },
                { label: '💥 기본 공격력', value: socialComma(s.baseDmg) },
                { label: '🎯 치명타 확률', value: pct(s.crit) },
                { label: '🔥 치명타 피해', value: `${socialComma(s.critDmg)}%` },
                { label: '⚡ 공격 속도', value: `${(Number(s.aspd) || 0).toFixed(2)}` },
                { label: '🛡️ 방어도', value: socialComma(s.armor) },
                { label: '💨 회피', value: socialComma(s.evasion) },
                { label: '🔵 에너지 보호막', value: socialComma(s.energyShield) },
                { label: '🩹 재생', value: `${(Number(s.regen) || 0).toFixed(1)}%` },
                { label: '🧱 받는 피해 감소', value: pct(s.dr) },
                { label: '🛑 막기', value: pct(s.blockChance) },
                { label: '🔥 화염 저항', value: `${socialComma(s.resF)}%` },
                { label: '❄️ 냉기 저항', value: `${socialComma(s.resC)}%` },
                { label: '⚡ 번개 저항', value: `${socialComma(s.resL)}%` },
                { label: '☠️ 카오스 저항', value: `${socialComma(s.resChaos)}%` }
            ];
        }
    } catch (e) {
        console.warn('프로필 스탯 계산 실패:', e);
    }

    let equipment = [];
    let eq = (typeof game !== 'undefined' && game.equipment) ? game.equipment : {};
    Object.keys(eq).forEach(slot => {
        let snap = buildItemSnapshot(eq[slot], slot);
        if (snap) equipment.push(snap);
    });

    let jewels = [];
    let jslots = (typeof game !== 'undefined' && Array.isArray(game.jewelSlots)) ? game.jewelSlots : [];
    jslots.forEach(j => { let s = buildJewelSnapshot(j); if (s) jewels.push(s); });

    let talismans = [];
    let placements = (typeof game !== 'undefined' && game.talismanPlacements) ? game.talismanPlacements : {};
    Object.keys(placements).forEach(id => {
        let t = placements[id] && placements[id].talisman;
        let s = buildTalismanSnapshot(t);
        if (s) talismans.push(s);
    });

    return {
        version: 2,
        nickname: getMyNickname(),
        level: (typeof game !== 'undefined' && game.level) ? game.level : 1,
        ascendClass: (typeof game !== 'undefined') ? (game.ascendClass || '') : '',
        className: socialClassLabel(typeof game !== 'undefined' ? game.ascendClass : ''),
        loop,
        power,
        stats,
        equipment,
        jewels,
        talismans,
        updatedAt: Date.now()
    };
}

async function uploadPlayerProfile(options = {}) {
    if (!socialCloudReady()) return false;
    let nickname = getMyNickname();
    if (!nickname) return false;
    if (socialState.profileUploadInFlight) return false;
    socialState.profileUploadInFlight = true;
    try {
        let snapshot = buildProfileSnapshot();
        await cloudJsonRequest('/rest/v1/player_profiles', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            // last_seen 은 DB 기본값/하트비트(PATCH)가 관리한다. 여기서 보내면
            // 컬럼 미적용(구 스키마) 사용자의 업로드가 깨지므로 포함하지 않는다.
            body: { user_id: socialLoggedInUserId(), nickname, profile_data: snapshot }
        });
        socialState.lastProfileUploadAt = Date.now();
        return true;
    } catch (e) {
        let msg = String(e && e.message || e);
        if (/duplicate|unique|nickname/i.test(msg) && options.fromNicknameChange) {
            throw new Error('이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.');
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
// 닉네임
// ============================================================================
async function promptAndSetNickname() {
    if (!socialCloudReady()) {
        alert('채팅/프로필 기능을 쓰려면 먼저 클라우드 로그인이 필요합니다. (설정 탭)');
        return;
    }
    let current = getMyNickname();
    let input = prompt(`사용할 닉네임을 입력하세요 (${SOCIAL_NICK_MIN}~${SOCIAL_NICK_MAX}자, 한글/영문/숫자/-/_).`, current || '');
    if (input == null) return;
    let name = String(input).trim();
    if (name.length < SOCIAL_NICK_MIN || name.length > SOCIAL_NICK_MAX) {
        alert(`닉네임은 ${SOCIAL_NICK_MIN}~${SOCIAL_NICK_MAX}자여야 합니다.`);
        return;
    }
    if (!SOCIAL_NICK_RE.test(name)) {
        alert('닉네임에는 한글, 영문, 숫자, - , _ 만 사용할 수 있습니다.');
        return;
    }
    let prev = getMyNickname();
    setMyNicknameLocal(name);
    try {
        await uploadPlayerProfile({ fromNicknameChange: true });
        if (typeof addLog === 'function') addLog(`🪪 닉네임이 "${name}"(으)로 설정되었습니다.`, 'season-up');
        renderSocialTab();
    } catch (e) {
        setMyNicknameLocal(prev);
        alert(String(e && e.message || e));
        renderSocialTab();
    }
}

async function restoreNicknameFromServer() {
    if (!socialCloudReady()) return;
    if (getMyNickname()) return;
    try {
        let rows = await cloudJsonRequest(`/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(socialLoggedInUserId())}&select=nickname`, {});
        if (Array.isArray(rows) && rows[0] && rows[0].nickname) setMyNicknameLocal(rows[0].nickname);
    } catch (e) { /* 무시 */ }
}

// ============================================================================
// 접속자(프레즌스) — last_seen 하트비트 + 접속 중 목록
// ============================================================================
async function sendPresenceHeartbeat() {
    if (!socialCloudReady() || !getMyNickname() || !socialState.onlineSupported) return;
    try {
        await cloudJsonRequest(`/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(socialLoggedInUserId())}`, {
            method: 'PATCH', headers: { Prefer: 'return=minimal' },
            body: { last_seen: new Date().toISOString() }
        });
    } catch (e) {
        if (/last_seen/i.test(String(e && e.message || e))) socialState.onlineSupported = false;
    }
}

function ensureHeartbeat() {
    if (socialState.heartbeatTimer) return;
    socialState.heartbeatTimer = setInterval(() => {
        if (socialCloudReady() && getMyNickname()) sendPresenceHeartbeat();
    }, SOCIAL_HEARTBEAT_MS);
    sendPresenceHeartbeat();
}

async function loadOnlineUsers() {
    if (!socialCloudReady() || !socialState.onlineSupported) return [];
    let cutoff = new Date(Date.now() - SOCIAL_ONLINE_WINDOW_S * 1000).toISOString();
    try {
        let rows = await cloudJsonRequest(
            `/rest/v1/player_profiles?select=user_id,nickname,last_seen&last_seen=gte.${encodeURIComponent(cutoff)}&order=last_seen.desc&limit=80`,
            {}
        );
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
            return `<span class="social-online-chip${me ? ' me' : ''}" onclick="openPlayerProfile('${socialEscape(u.user_id)}')" title="프로필 보기">🟢 ${socialEscape(u.nickname || '익명')}${me ? ' (나)' : ''}</span>`;
        }).join('')
        : `<span class="social-online-empty">접속 중인 플레이어가 없습니다.</span>`;
    host.innerHTML = `<div class="social-online-title">🟢 접속 중 (${users.length})</div><div class="social-online-list">${chips}</div>`;
}

async function refreshOnlineUsers() {
    if (socialState.onlineLoading || !socialState.onlineSupported) return;
    socialState.onlineLoading = true;
    try {
        renderOnlineUsers(await loadOnlineUsers());
    } catch (e) { /* 무시 */ } finally {
        socialState.onlineLoading = false;
    }
}

// ============================================================================
// 채팅
// ============================================================================
async function loadChatMessages() {
    if (!socialCloudReady()) return [];
    let rows = await cloudJsonRequest(
        `/rest/v1/chat_messages?select=id,user_id,nickname,body,payload,created_at&order=created_at.desc&limit=${SOCIAL_CHAT_LIMIT}`,
        {}
    );
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
            method: 'POST',
            headers: { Prefer: 'return=minimal' },
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
    if (source === 'equip') {
        let eq = (typeof game !== 'undefined' && game.equipment) ? game.equipment : {};
        item = eq[idx];
    } else {
        let inv = (typeof game !== 'undefined' && Array.isArray(game.inventory)) ? game.inventory : [];
        item = inv[idx];
    }
    let snap = buildItemSnapshot(item, source === 'equip' ? idx : (item && item.slot));
    if (!snap) return;
    if (socialState.pendingChatItems.length >= SOCIAL_MAX_ITEMS_PER_MSG) {
        alert(`메시지당 최대 ${SOCIAL_MAX_ITEMS_PER_MSG}개의 아이템만 첨부할 수 있습니다.`);
        return;
    }
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
        let color = (typeof getRarityColor === 'function') ? getRarityColor(it.rarity) : '#ddd';
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
    let slotLabel = (typeof getItemSlotDisplayLabel === 'function') ? (it => getItemSlotDisplayLabel(it)) : (it => (it && it.slot) || '');
    let eq = (typeof game !== 'undefined' && game.equipment) ? game.equipment : {};
    let equipCards = Object.keys(eq).filter(s => eq[s]).map(slot => {
        let it = eq[slot];
        let color = (typeof getRarityColor === 'function') ? getRarityColor(it.rarity) : '#ddd';
        return `<div class="social-pick-item" style="border-color:${color};" onclick="attachChatItem('equip','${socialEscape(slot)}')"><span style="color:${color};">[${socialEscape(slot)}] ${socialEscape(it.name)}</span></div>`;
    }).join('') || `<div class="social-profile-empty">장착한 장비 없음</div>`;
    let inv = (typeof game !== 'undefined' && Array.isArray(game.inventory)) ? game.inventory : [];
    let invCards = inv.slice(0, 300).map((it, i) => {
        if (!it) return '';
        let color = (typeof getRarityColor === 'function') ? getRarityColor(it.rarity) : '#ddd';
        return `<div class="social-pick-item" style="border-color:${color};" onclick="attachChatItem('inv',${i})"><span style="color:${color};">[${socialEscape(slotLabel(it))}] ${socialEscape(it.name)}</span></div>`;
    }).join('') || `<div class="social-profile-empty">인벤토리 비어 있음</div>`;
    modal.innerHTML = `<div class="social-modal-box"><button class="social-modal-close" onclick="closeItemPicker()">✕</button>
        <h3 style="color:#cfe0f5;margin-top:0;">🔗 첨부할 아이템 선택 (최대 ${SOCIAL_MAX_ITEMS_PER_MSG}개)</h3>
        <h4 class="social-pick-sub">장착 중</h4><div class="social-pick-grid">${equipCards}</div>
        <h4 class="social-pick-sub">인벤토리${inv.length > 300 ? ' (상위 300개)' : ''}</h4><div class="social-pick-grid">${invCards}</div></div>`;
    modal.style.display = 'flex';
}

function closeItemPicker() {
    let modal = document.getElementById('social-item-picker-modal');
    if (modal) modal.style.display = 'none';
}

// 본문의 ⟦N⟧ 토큰을 아이템 칩으로 치환(호버 툴팁 + 클릭 모달). 텍스트는 이스케이프.
function renderChatBody(m) {
    let body = String(m.body || '');
    let items = (m.payload && Array.isArray(m.payload.items)) ? m.payload.items : [];
    if (!items.length || body.indexOf('⟦') === -1) return socialEscape(body);
    let out = '';
    let lastIndex = 0;
    let re = new RegExp(SOCIAL_ITEM_TOKEN_RE.source, 'g');
    let match;
    while ((match = re.exec(body)) !== null) {
        out += socialEscape(body.slice(lastIndex, match.index));
        let n = parseInt(match[1], 10);
        let snap = items[n];
        if (snap) {
            let key = `${m.id}:${n}`;
            socialState.chatTips[key] = renderProfileItemCard(snap);
            let color = (typeof getRarityColor === 'function') ? getRarityColor(snap.rarity) : '#ddd';
            out += `<span class="social-item-link" style="border-color:${color};color:${color};" onmouseenter="showSocialTip(event,'chat','${socialEscape(key)}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('chat','${socialEscape(key)}')" title="아이템 상세">🔗 ${socialEscape(snap.name)}</span>`;
        } else {
            out += socialEscape(match[0]);
        }
        lastIndex = match.index + match[0].length;
    }
    out += socialEscape(body.slice(lastIndex));
    return out;
}

function formatChatTime(iso) {
    try {
        let d = new Date(iso);
        let mm = String(d.getMonth() + 1).padStart(2, '0');
        let dd = String(d.getDate()).padStart(2, '0');
        let hh = String(d.getHours()).padStart(2, '0');
        let mi = String(d.getMinutes()).padStart(2, '0');
        return `${mm}/${dd} ${hh}:${mi}`;
    } catch (e) { return ''; }
}

function renderChatMessages(messages) {
    let listEl = document.getElementById('social-chat-list');
    if (!listEl) return;
    let myId = socialLoggedInUserId();
    let key = messages.map(m => m.id).join(',');
    if (key === socialState.lastChatRenderKey) return;
    socialState.lastChatRenderKey = key;

    if (!messages.length) {
        listEl.innerHTML = `<div class="social-chat-empty">아직 메시지가 없습니다. 첫 메시지를 남겨보세요!</div>`;
        return;
    }
    let nearBottom = (listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight) < 60;
    socialState.chatTips = {};
    listEl.innerHTML = messages.map(m => {
        let mine = m.user_id === myId;
        let nick = socialEscape(m.nickname || '익명');
        return `<div class="social-chat-msg${mine ? ' mine' : ''}">`
            + `<span class="social-chat-nick" onclick="openPlayerProfile('${socialEscape(m.user_id)}')" title="프로필 보기">${nick}</span>`
            + `<span class="social-chat-time">${formatChatTime(m.created_at)}</span>`
            + `<div class="social-chat-body">${renderChatBody(m)}</div>`
            + `</div>`;
    }).join('');
    if (nearBottom) listEl.scrollTop = listEl.scrollHeight;
}

async function refreshChatPanel(forceScroll) {
    if (socialState.chatLoading) return;
    socialState.chatLoading = true;
    try {
        renderChatMessages(await loadChatMessages());
        if (forceScroll) {
            let listEl = document.getElementById('social-chat-list');
            if (listEl) listEl.scrollTop = listEl.scrollHeight;
        }
    } catch (e) {
        console.warn('채팅 로드 실패:', e);
    } finally {
        socialState.chatLoading = false;
    }
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

function stopChatPolling() {
    if (socialState.chatPollTimer) { clearInterval(socialState.chatPollTimer); socialState.chatPollTimer = null; }
}

function onSocialChatKeydown(event) {
    if (event && event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendChatMessage(); }
}

// ============================================================================
// 커스텀 툴팁(아이템/주얼/부적 옵션)
// ============================================================================
function ensureSocialTooltip() {
    let tip = document.getElementById('social-tooltip');
    if (tip) return tip;
    tip = document.createElement('div');
    tip.id = 'social-tooltip';
    tip.className = 'social-tooltip';
    tip.style.display = 'none';
    document.body.appendChild(tip);
    return tip;
}

function showSocialTip(event, scope, key) {
    let map = scope === 'chat' ? socialState.chatTips : socialState.profileTips;
    let html = map && map[key];
    if (!html) return;
    let tip = ensureSocialTooltip();
    tip.innerHTML = html;
    tip.style.display = 'block';
    moveSocialTip(event);
}

function moveSocialTip(event) {
    let tip = document.getElementById('social-tooltip');
    if (!tip || tip.style.display === 'none') return;
    let pad = 16;
    let w = tip.offsetWidth, h = tip.offsetHeight;
    let x = event.clientX + pad, y = event.clientY + pad;
    if (x + w > window.innerWidth - 8) x = event.clientX - w - pad;
    if (x < 8) x = 8;
    if (y + h > window.innerHeight - 8) y = window.innerHeight - h - 8;
    if (y < 8) y = 8;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
}

function hideSocialTip() {
    let tip = document.getElementById('social-tooltip');
    if (tip) tip.style.display = 'none';
}

// 모바일/클릭용: 툴팁 내용을 모달로 표시
function openTipModal(scope, key) {
    let map = scope === 'chat' ? socialState.chatTips : socialState.profileTips;
    let html = map && map[key];
    if (!html) return;
    let modal = ensureProfileModal();
    modal.style.display = 'flex';
    let body = document.getElementById('social-profile-body');
    if (body) body.innerHTML = `<div class="social-equip-grid">${html}</div>`;
}

// ============================================================================
// 카드 렌더러
// ============================================================================
function renderProfileItemCard(item) {
    if (item && item.kind === 'simple') return renderSimpleCard(item);
    let color = (typeof getRarityColor === 'function') ? getRarityColor(item.rarity) : '#ddd';
    let statName = id => (typeof getStatName === 'function' ? (getStatName(id) || id) : id);
    let fmt = (id, val) => (typeof formatValue === 'function' ? formatValue(id, val) : val);
    let lines = '';
    (item.baseStats || []).forEach(st => {
        if (!st || st.id == null) return;
        lines += `<div class="social-item-stat base">${socialEscape(st.statName || statName(st.id))} +${socialEscape(fmt(st.id, st.val))}</div>`;
    });
    (item.stats || []).forEach(st => {
        if (!st || st.id == null) return;
        lines += `<div class="social-item-stat">${socialEscape(st.statName || statName(st.id))} +${socialEscape(fmt(st.id, st.val))}</div>`;
        (st.extraStats || []).forEach(ex => {
            if (!ex || ex.id == null) return;
            lines += `<div class="social-item-stat">${socialEscape(ex.statName || statName(ex.id))} +${socialEscape(fmt(ex.id, ex.val))}</div>`;
        });
    });
    let unique = item.uniqueEffect ? `<div class="social-item-unique">✨ ${socialEscape(item.uniqueEffect)}</div>` : '';
    let corrupt = item.corrupted ? ` <span style="color:#e74c3c;">(타락)</span>` : '';
    return `<div class="social-item-card" style="border-color:${color};">`
        + `<div class="social-item-title" style="color:${color};">${item.slot ? `[${socialEscape(item.slot)}] ` : ''}${socialEscape(item.name)}${corrupt}</div>`
        + (item.baseName ? `<div class="social-item-base">${socialEscape(item.baseName)}</div>` : '')
        + unique + lines
        + `</div>`;
}

function renderSimpleCard(snap) {
    let color = (typeof getRarityColor === 'function') ? getRarityColor(snap.rarity) : '#ddd';
    let lines = (snap.lines || []).map(l => `<div class="social-item-stat">${socialEscape(l)}</div>`).join('');
    return `<div class="social-item-card" style="border-color:${color};">`
        + `<div class="social-item-title" style="color:${color};">${socialEscape(snap.name)}</div>`
        + (lines || `<div class="social-item-stat" style="color:#7c90ab;">옵션 없음</div>`)
        + `</div>`;
}

// ============================================================================
// 프로필 모달
// ============================================================================
function ensureProfileModal() {
    let modal = document.getElementById('social-profile-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'social-profile-modal';
    modal.className = 'social-modal-overlay';
    modal.style.display = 'none';
    modal.onclick = function (e) { if (e.target === modal) closePlayerProfile(); };
    modal.innerHTML = `<div class="social-modal-box"><button class="social-modal-close" onclick="closePlayerProfile()">✕</button><div id="social-profile-body"></div></div>`;
    document.body.appendChild(modal);
    return modal;
}

function closePlayerProfile() {
    hideSocialTip();
    let modal = document.getElementById('social-profile-modal');
    if (modal) modal.style.display = 'none';
}

// 카테고리별 미니 카드(이름만 + 호버 툴팁)
function renderProfileItemsArea() {
    let p = socialState.currentProfile;
    if (!p) return '';
    let cat = socialState.profileTab;
    let entries = [];
    if (cat === 'equipment') entries = (p.equipment || []).map(it => ({ snap: it, label: `${it.slot ? `[${it.slot}] ` : ''}${it.name}` }));
    else if (cat === 'jewels') entries = (p.jewels || []).map(it => ({ snap: it, label: it.name }));
    else if (cat === 'talismans') entries = (p.talismans || []).map(it => ({ snap: it, label: it.name }));

    socialState.profileTips = {};
    if (!entries.length) {
        let emptyLabel = cat === 'jewels' ? '장착한 주얼 없음' : (cat === 'talismans' ? '장착한 부적 없음' : '장착한 장비 없음');
        return `<div class="social-profile-empty">${emptyLabel}</div>`;
    }
    return `<div class="social-mini-grid">` + entries.map((e, i) => {
        let key = `${cat}:${i}`;
        socialState.profileTips[key] = renderProfileItemCard(e.snap);
        let color = (typeof getRarityColor === 'function') ? getRarityColor(e.snap.rarity) : '#ddd';
        return `<div class="social-mini-card" style="border-color:${color};color:${color};" `
            + `onmouseenter="showSocialTip(event,'profile','${key}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" `
            + `onclick="openTipModal('profile','${key}')" title="옵션 보기">${socialEscape(e.label)}</div>`;
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
    if (!profile) {
        body.innerHTML = `<div class="social-profile-empty">프로필을 찾을 수 없습니다.<br>상대가 아직 게임을 클라우드에 저장하지 않았을 수 있어요.</div>`;
        return;
    }
    socialState.currentProfile = profile;
    socialState.profileTab = 'equipment';
    let p = profile;
    let stats = Array.isArray(p.stats) ? p.stats : [];
    let statsHtml = stats.length
        ? stats.map(s => `<div class="social-stat-item"><span class="social-stat-label">${socialEscape(s.label)}</span><span class="social-stat-value">${socialEscape(s.value)}</span></div>`).join('')
        : `<div class="social-profile-empty">스탯 정보 없음</div>`;
    let updated = '';
    try { if (p.updatedAt) updated = new Date(p.updatedAt).toLocaleString('ko-KR'); } catch (e) { /* 무시 */ }

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
        host.innerHTML = `<h2>💬 커뮤니티</h2>
            <div class="social-notice">채팅·접속자·프로필 구경 기능은 <strong>클라우드 로그인</strong>이 필요합니다.<br>설정 탭에서 로그인 후 다시 열어주세요.</div>`;
        stopChatPolling();
        return;
    }

    host.innerHTML = `
        <h2>💬 커뮤니티</h2>
        <div class="social-toolbar">
            <span class="social-mynick">내 닉네임: <strong>${nickname ? socialEscape(nickname) : '<span style="color:#e88;">미설정</span>'}</strong></span>
            <button onclick="promptAndSetNickname()">${nickname ? '닉네임 변경' : '닉네임 설정'}</button>
            <button onclick="openPlayerProfile(socialLoggedInUserId())">내 프로필 미리보기</button>
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
            <div class="social-hint">닉네임 클릭 → 그 플레이어의 장비/주얼/부적·스탯, 🔗 링크에 마우스를 올리면 아이템 옵션을 볼 수 있습니다.</div>
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
    .social-modal-box{position:relative;width:min(760px,96vw);max-height:90vh;overflow-y:auto;background:linear-gradient(170deg,#101a2a,#0c1421);border:1px solid #2c4063;border-radius:14px;padding:20px;}
    .social-modal-close{position:absolute;top:10px;right:12px;background:#1c2c44;border:1px solid #34507a;color:#cfe0f5;border-radius:8px;padding:4px 10px;cursor:pointer;}
    .social-profile-empty{color:#8094ad;text-align:center;padding:24px;}
    .social-profile-header{border-bottom:1px solid #233a59;padding-bottom:12px;margin-bottom:14px;}
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
    .social-stat-value{color:#eaf2ff;font-weight:700;font-size:0.9em;}
    .social-mini-grid{display:flex;flex-direction:column;gap:6px;}
    .social-mini-card{background:#0f1a28;border:1px solid;border-left-width:3px;border-radius:7px;padding:8px 10px;font-size:0.86em;font-weight:600;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .social-mini-card:hover{background:#16243a;}
    .social-equip-grid{display:flex;flex-direction:column;gap:8px;}
    .social-item-card{background:#0f1a28;border:1px solid #2c4063;border-left-width:3px;border-radius:8px;padding:8px 10px;}
    .social-item-title{font-weight:700;font-size:0.92em;}
    .social-item-base{color:#95a5a6;font-size:0.78em;margin:2px 0 4px;}
    .social-item-unique{color:#d7b8ff;font-size:0.82em;margin:3px 0;}
    .social-item-stat{color:#cfe0f5;font-size:0.82em;line-height:1.4;}
    .social-item-stat.base{color:#f1c40f;}
    .social-tooltip{position:fixed;z-index:10001;max-width:320px;pointer-events:none;display:none;filter:drop-shadow(0 6px 18px rgba(0,0,0,0.6));}
    .social-tooltip .social-item-card{background:#0c1421;border-width:1px;border-left-width:3px;}
    `;
    document.head.appendChild(style);
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { injectSocialStyles(); ensureSocialTooltip(); });
    else { injectSocialStyles(); ensureSocialTooltip(); }
    // 소셜 탭을 열지 않아도 접속 표시가 되도록 전역 하트비트를 가동.
    setInterval(() => { if (socialCloudReady() && getMyNickname()) ensureHeartbeat(); }, SOCIAL_HEARTBEAT_MS);
}

if (typeof safeExposeGlobals === 'function') {
    safeExposeGlobals({
        socialState, getMyNickname, promptAndSetNickname, uploadPlayerProfile, syncPlayerProfileQuiet,
        sendChatMessage, onSocialChatKeydown, refreshChatPanel, startChatPolling, stopChatPolling,
        openPlayerProfile, closePlayerProfile, renderSocialTab, socialLoggedInUserId, restoreNicknameFromServer,
        attachChatItem, removePendingChatItem, openItemPicker, closeItemPicker, openTipModal, updateChatCounter,
        showSocialTip, moveSocialTip, hideSocialTip, switchProfileTab, sendPresenceHeartbeat, refreshOnlineUsers
    });
}
