// ============================================================================
// 소셜 기능: 채팅 + 다른 플레이어 프로필(장비/스탯) 구경
// ----------------------------------------------------------------------------
// 백엔드는 Supabase(player_profiles / chat_messages 테이블). 스키마는 db/social.sql.
// 이 모듈은 ui.js 이후에 로드되며 cloudState / cloudJsonRequest / getPlayerStats
// 등 전역 함수를 재사용한다.
// ============================================================================

const SOCIAL_NICK_KEY = 'arpg_social_nickname';
const SOCIAL_CHAT_LIMIT = 50;
const SOCIAL_CHAT_POLL_MS = 4000;
const SOCIAL_MSG_MAX = 500;

let socialState = {
    nickname: '',
    chatPollTimer: null,
    chatLoading: false,
    lastChatRenderKey: '',
    profileUploadInFlight: false,
    lastProfileUploadAt: 0
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
// 프로필 스냅샷 빌드 / 업로드
// ============================================================================
function socialStatRow(label, value) {
    return { label, value };
}

function buildProfileSnapshot() {
    let stats = [];
    let power = 0;
    try {
        let s = typeof getPlayerStats === 'function' ? getPlayerStats() : null;
        if (s) {
            power = Math.floor(Number(s.dps) || Number(s.hitDps) || 0);
            let pct = v => `${(Number(v) || 0).toFixed(1)}%`;
            let intv = v => `${Math.floor(Number(v) || 0)}`;
            stats = [
                socialStatRow('❤️ 최대 생명력', intv(s.maxHp)),
                socialStatRow('⚔️ DPS', intv(s.dps || s.hitDps)),
                socialStatRow('💥 기본 공격력', intv(s.baseDmg)),
                socialStatRow('🎯 치명타 확률', pct(s.crit)),
                socialStatRow('🔥 치명타 피해', `${intv(s.critDmg)}%`),
                socialStatRow('⚡ 공격 속도', `${(Number(s.aspd) || 0).toFixed(2)}`),
                socialStatRow('🛡️ 방어도', intv(s.armor)),
                socialStatRow('💨 회피', intv(s.evasion)),
                socialStatRow('🔵 에너지 보호막', intv(s.energyShield)),
                socialStatRow('🩹 재생', `${(Number(s.regen) || 0).toFixed(1)}%`),
                socialStatRow('🧱 받는 피해 감소', pct(s.dr)),
                socialStatRow('🛑 막기', pct(s.blockChance)),
                socialStatRow('🔥 화염 저항', `${intv(s.resF)}%`),
                socialStatRow('❄️ 냉기 저항', `${intv(s.resC)}%`),
                socialStatRow('⚡ 번개 저항', `${intv(s.resL)}%`),
                socialStatRow('☠️ 카오스 저항', `${intv(s.resChaos)}%`)
            ];
        }
    } catch (e) {
        console.warn('프로필 스탯 계산 실패:', e);
    }

    let equipment = [];
    let eq = (typeof game !== 'undefined' && game.equipment) ? game.equipment : {};
    Object.keys(eq).forEach(slot => {
        let item = eq[slot];
        if (!item) return;
        equipment.push({
            slot,
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
        });
    });

    return {
        version: 1,
        nickname: getMyNickname(),
        level: (typeof game !== 'undefined' && game.level) ? game.level : 1,
        ascendClass: (typeof game !== 'undefined') ? (game.ascendClass || '') : '',
        className: socialClassLabel(typeof game !== 'undefined' ? game.ascendClass : ''),
        loop: (typeof getSaveLoopNumber === 'function' && typeof game !== 'undefined') ? getSaveLoopNumber(game) : 0,
        power,
        stats,
        equipment,
        updatedAt: Date.now()
    };
}

// 닉네임을 포함한 프로필을 서버에 upsert. 닉네임 중복이면 사용자에게 알린다.
async function uploadPlayerProfile(options = {}) {
    if (!socialCloudReady()) return false;
    let nickname = getMyNickname();
    if (!nickname) return false; // 닉네임 미설정 시 업로드하지 않음
    if (socialState.profileUploadInFlight) return false;
    socialState.profileUploadInFlight = true;
    try {
        let snapshot = buildProfileSnapshot();
        await cloudJsonRequest('/rest/v1/player_profiles', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
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

// pushCloudSave 등에서 호출되는 가벼운 백그라운드 동기화.
function syncPlayerProfileQuiet() {
    if (!socialCloudReady() || !getMyNickname()) return;
    Promise.resolve(uploadPlayerProfile({ silent: true })).catch(() => {});
}

// ============================================================================
// 닉네임 설정
// ============================================================================
async function promptAndSetNickname() {
    if (!socialCloudReady()) {
        alert('채팅/프로필 기능을 쓰려면 먼저 클라우드 로그인이 필요합니다. (설정 탭)');
        return;
    }
    let current = getMyNickname();
    let input = prompt('사용할 닉네임을 입력하세요 (2~16자).', current || '');
    if (input == null) return;
    let name = String(input).trim();
    if (name.length < 2 || name.length > 16) {
        alert('닉네임은 2~16자여야 합니다.');
        return;
    }
    let prev = getMyNickname();
    setMyNicknameLocal(name);
    try {
        await uploadPlayerProfile({ fromNicknameChange: true });
        if (typeof addLog === 'function') addLog(`🪪 닉네임이 "${name}"(으)로 설정되었습니다.`, 'season-up');
        renderSocialTab();
    } catch (e) {
        setMyNicknameLocal(prev); // 롤백
        alert(String(e && e.message || e));
        renderSocialTab();
    }
}

// 로그인 후 내 프로필에서 닉네임을 복원(다른 기기에서 설정한 경우).
async function restoreNicknameFromServer() {
    if (!socialCloudReady()) return;
    if (getMyNickname()) return;
    try {
        let rows = await cloudJsonRequest(`/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(socialLoggedInUserId())}&select=nickname`, {});
        if (Array.isArray(rows) && rows[0] && rows[0].nickname) setMyNicknameLocal(rows[0].nickname);
    } catch (e) { /* 무시 */ }
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

async function sendChatMessage() {
    if (!socialCloudReady()) { alert('먼저 클라우드 로그인이 필요합니다.'); return; }
    let nickname = getMyNickname();
    if (!nickname) { await promptAndSetNickname(); if (!getMyNickname()) return; nickname = getMyNickname(); }
    let inputEl = document.getElementById('social-chat-input');
    if (!inputEl) return;
    let body = String(inputEl.value || '').trim();
    if (!body) return;
    if (body.length > SOCIAL_MSG_MAX) body = body.slice(0, SOCIAL_MSG_MAX);
    inputEl.value = '';
    try {
        // 메시지마다 최신 프로필을 보장(구경 기능이 최신 장비를 보여주도록).
        syncPlayerProfileQuiet();
        await cloudJsonRequest('/rest/v1/chat_messages', {
            method: 'POST',
            headers: { Prefer: 'return=minimal' },
            body: { user_id: socialLoggedInUserId(), nickname, body }
        });
        await refreshChatPanel(true);
    } catch (e) {
        inputEl.value = body; // 실패 시 입력 복원
        alert('메시지 전송 실패: ' + String(e && e.message || e));
    }
}

function renderChatMessages(messages) {
    let listEl = document.getElementById('social-chat-list');
    if (!listEl) return;
    let myId = socialLoggedInUserId();
    let key = messages.map(m => m.id).join(',');
    if (key === socialState.lastChatRenderKey) return; // 변화 없으면 스킵
    socialState.lastChatRenderKey = key;

    if (!messages.length) {
        listEl.innerHTML = `<div class="social-chat-empty">아직 메시지가 없습니다. 첫 메시지를 남겨보세요!</div>`;
        return;
    }
    let nearBottom = (listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight) < 60;
    listEl.innerHTML = messages.map(m => {
        let mine = m.user_id === myId;
        let time = '';
        try { time = new Date(m.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { /* 무시 */ }
        let nick = socialEscape(m.nickname || '익명');
        return `<div class="social-chat-msg${mine ? ' mine' : ''}">`
            + `<span class="social-chat-nick" onclick="openPlayerProfile('${socialEscape(m.user_id)}')" title="프로필 보기">${nick}</span>`
            + `<span class="social-chat-time">${time}</span>`
            + `<div class="social-chat-body">${socialEscape(m.body)}</div>`
            + `</div>`;
    }).join('');
    if (nearBottom) listEl.scrollTop = listEl.scrollHeight;
}

async function refreshChatPanel(forceScroll) {
    if (socialState.chatLoading) return;
    socialState.chatLoading = true;
    try {
        let messages = await loadChatMessages();
        renderChatMessages(messages);
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
    socialState.chatPollTimer = setInterval(() => {
        let tabEl = document.getElementById('tab-social');
        if (!tabEl || !tabEl.classList.contains('active')) { stopChatPolling(); return; }
        refreshChatPanel(false);
    }, SOCIAL_CHAT_POLL_MS);
}

function stopChatPolling() {
    if (socialState.chatPollTimer) { clearInterval(socialState.chatPollTimer); socialState.chatPollTimer = null; }
}

function onSocialChatKeydown(event) {
    if (event && event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendChatMessage(); }
}

// ============================================================================
// 프로필 보기 모달
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
    let modal = document.getElementById('social-profile-modal');
    if (modal) modal.style.display = 'none';
}

function renderProfileItemCard(item) {
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
        + `<div class="social-item-title" style="color:${color};">[${socialEscape(item.slot)}] ${socialEscape(item.name)}${corrupt}</div>`
        + (item.baseName ? `<div class="social-item-base">${socialEscape(item.baseName)}</div>` : '')
        + unique
        + lines
        + `</div>`;
}

function renderProfileData(profile) {
    let body = document.getElementById('social-profile-body');
    if (!body) return;
    if (!profile) {
        body.innerHTML = `<div class="social-profile-empty">프로필을 찾을 수 없습니다.<br>상대가 아직 게임을 클라우드에 저장하지 않았을 수 있어요.</div>`;
        return;
    }
    let p = profile;
    let stats = Array.isArray(p.stats) ? p.stats : [];
    let equipment = Array.isArray(p.equipment) ? p.equipment : [];
    let statsHtml = stats.length
        ? stats.map(s => `<div class="social-stat-item"><span class="social-stat-label">${socialEscape(s.label)}</span><span class="social-stat-value">${socialEscape(s.value)}</span></div>`).join('')
        : `<div class="social-profile-empty">스탯 정보 없음</div>`;
    let equipHtml = equipment.length
        ? equipment.map(renderProfileItemCard).join('')
        : `<div class="social-profile-empty">장착한 장비 없음</div>`;
    let updated = '';
    try { if (p.updatedAt) updated = new Date(p.updatedAt).toLocaleString('ko-KR'); } catch (e) { /* 무시 */ }

    body.innerHTML = `
        <div class="social-profile-header">
            <div class="social-profile-name">${socialEscape(p.nickname || '익명')}</div>
            <div class="social-profile-sub">Lv.${socialEscape(p.level || 1)} · ${socialEscape(p.className || '무직')}${p.power ? ` · 전투력 ${socialEscape(Math.floor(p.power))}` : ''}</div>
            ${updated ? `<div class="social-profile-updated">갱신: ${socialEscape(updated)}</div>` : ''}
        </div>
        <div class="social-profile-cols">
            <div class="social-profile-col">
                <h3>📊 스탯</h3>
                <div class="social-stat-grid">${statsHtml}</div>
            </div>
            <div class="social-profile-col">
                <h3>🎒 장비</h3>
                <div class="social-equip-grid">${equipHtml}</div>
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
// 소셜 탭 렌더 + 진입
// ============================================================================
function renderSocialTab() {
    let host = document.getElementById('tab-social');
    if (!host) return;
    let loggedIn = socialCloudReady();
    let nickname = getMyNickname();

    if (!loggedIn) {
        host.innerHTML = `<h2>💬 커뮤니티</h2>
            <div class="social-notice">채팅과 다른 플레이어 구경 기능은 <strong>클라우드 로그인</strong>이 필요합니다.<br>설정 탭에서 로그인 후 다시 열어주세요.</div>`;
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
        <div class="social-chat-wrap">
            <div id="social-chat-list" class="social-chat-list"><div class="social-chat-empty">불러오는 중…</div></div>
            <div class="social-chat-inputbar">
                <input id="social-chat-input" type="text" maxlength="${SOCIAL_MSG_MAX}" placeholder="${nickname ? '메시지를 입력하세요…' : '먼저 닉네임을 설정하세요'}" onkeydown="onSocialChatKeydown(event)" ${nickname ? '' : 'disabled'}>
                <button onclick="sendChatMessage()" ${nickname ? '' : 'disabled'}>전송</button>
            </div>
            <div class="social-hint">닉네임을 클릭하면 그 플레이어의 장비/스탯을 볼 수 있습니다.</div>
        </div>`;

    socialState.lastChatRenderKey = '';
    startChatPolling();
    if (!nickname) restoreNicknameFromServer().then(() => { if (getMyNickname()) renderSocialTab(); });
}

// 스타일 주입(자체 포함, 별도 css 파일 불필요)
function injectSocialStyles() {
    if (document.getElementById('social-styles')) return;
    let style = document.createElement('style');
    style.id = 'social-styles';
    style.textContent = `
    .social-notice,.social-hint{color:#9fb4d1;font-size:0.86em;line-height:1.5;}
    .social-notice{background:rgba(20,34,56,0.6);border:1px solid #24344f;border-radius:8px;padding:12px;margin-top:8px;}
    .social-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0;}
    .social-toolbar .social-mynick{margin-right:auto;color:#cfe0f5;}
    .social-chat-wrap{display:flex;flex-direction:column;gap:8px;}
    .social-chat-list{height:48vh;min-height:240px;overflow-y:auto;background:linear-gradient(170deg,#0d1420,#111c2c);border:1px solid #24344f;border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;}
    .social-chat-empty{color:#7c90ab;text-align:center;margin:auto;font-size:0.9em;}
    .social-chat-msg{max-width:82%;align-self:flex-start;background:#16243a;border:1px solid #233957;border-radius:10px;padding:6px 10px;}
    .social-chat-msg.mine{align-self:flex-end;background:#1d3350;border-color:#2f5180;}
    .social-chat-nick{color:#7fc1ff;font-weight:700;font-size:0.86em;cursor:pointer;}
    .social-chat-nick:hover{text-decoration:underline;}
    .social-chat-time{color:#6b7e98;font-size:0.72em;margin-left:6px;}
    .social-chat-body{color:#e4eefb;margin-top:3px;white-space:pre-wrap;word-break:break-word;}
    .social-chat-inputbar{display:flex;gap:8px;}
    .social-chat-inputbar input{flex:1;padding:9px 12px;background:#0e1726;border:1px solid #2a3e5c;border-radius:8px;color:#eaf2ff;}
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
    .social-stat-grid{display:grid;grid-template-columns:1fr;gap:4px;}
    .social-stat-item{display:flex;justify-content:space-between;gap:10px;background:#13202f;border:1px solid #20324b;border-radius:6px;padding:5px 9px;}
    .social-stat-label{color:#9fb4d1;font-size:0.86em;}
    .social-stat-value{color:#eaf2ff;font-weight:700;font-size:0.9em;}
    .social-equip-grid{display:flex;flex-direction:column;gap:8px;}
    .social-item-card{background:#0f1a28;border:1px solid #2c4063;border-left-width:3px;border-radius:8px;padding:8px 10px;}
    .social-item-title{font-weight:700;font-size:0.92em;}
    .social-item-base{color:#95a5a6;font-size:0.78em;margin:2px 0 4px;}
    .social-item-unique{color:#d7b8ff;font-size:0.82em;margin:3px 0;}
    .social-item-stat{color:#cfe0f5;font-size:0.82em;line-height:1.4;}
    .social-item-stat.base{color:#f1c40f;}
    `;
    document.head.appendChild(style);
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectSocialStyles);
    else injectSocialStyles();
}

if (typeof safeExposeGlobals === 'function') {
    safeExposeGlobals({
        socialState, getMyNickname, promptAndSetNickname, uploadPlayerProfile, syncPlayerProfileQuiet,
        sendChatMessage, onSocialChatKeydown, refreshChatPanel, startChatPolling, stopChatPolling,
        openPlayerProfile, closePlayerProfile, renderSocialTab, socialLoggedInUserId, restoreNicknameFromServer
    });
}
