// 비동기 고스트 대결. 상대 선택, 승패, Elo 갱신은 Supabase RPC가 한 번에 처리한다.

const ghostArenaState = { loading: false, data: null, message: '', result: null };
let profileGhostDuelBusy = false;

function getGhostCombatVersion() {
    return typeof getPlaytestBuildVersion === 'function' ? getPlaytestBuildVersion() : 'unknown';
}

function ghostArenaEscape(value) {
    return typeof escapeHTML === 'function' ? escapeHTML(String(value == null ? '' : value)) : String(value == null ? '' : value);
}

function getGhostArenaError(error) {
    let message = String(error && error.message || error);
    if (/GHOST_NEEDS_3_RUNS/.test(message)) return '현재 빌드로 전투를 3회 완료한 뒤 등록하세요.';
    if (/GHOST_NEEDS_BATTLE_DATA/.test(message)) return '현재 빌드의 전투 기록이 없습니다.';
    if (/GHOST_OPPONENT_NOT_FOUND/.test(message)) return '대결 가능한 상대가 아직 없습니다.';
    if (/GHOST_TARGET_NOT_REGISTERED/.test(message)) return '상대가 현재 버전의 고스트를 등록하지 않았습니다.';
    if (/GHOST_REGISTRATION_REQUIRED/.test(message)) return '먼저 내 고스트를 등록하세요.';
    if (/GHOST_FRIENDLY_LIMIT/.test(message)) return '오늘 이 상대와 할 수 있는 친선전을 모두 진행했습니다.';
    if (/GHOST_DAILY_LIMIT/.test(message)) return '오늘의 대결 한도 20회를 모두 사용했습니다.';
    if (/NICKNAME_REQUIRED/.test(message)) return '먼저 커뮤니티 닉네임을 설정하세요.';
    if (/schema cache|could not find|does not exist/i.test(message)) return '고스트 대결 SQL이 아직 적용되지 않았습니다.';
    return message;
}

async function loadGhostArena() {
    if (!socialCloudReady() || ghostArenaState.loading) return;
    ghostArenaState.loading = true;
    renderGhostArena();
    try {
        ghostArenaState.data = await cloudJsonRequest('/rest/v1/rpc/get_ghost_arena', {
            method: 'POST', body: { p_combat_version: getGhostCombatVersion() }
        });
        ghostArenaState.message = '';
    } catch (error) {
        ghostArenaState.message = getGhostArenaError(error);
    } finally {
        ghostArenaState.loading = false;
        renderGhostArena();
    }
}

async function registerMyGhost() {
    if (!socialCloudReady()) return showGameToast('클라우드 로그인이 필요합니다.', 'warning');
    ghostArenaState.loading = true;
    ghostArenaState.message = '';
    renderGhostArena();
    try {
        await restoreNicknameFromServer();
        if (!getMyNickname()) await promptAndSetNickname();
        if (!getMyNickname()) return;
        await uploadPlayerProfile({ required: true });
        await cloudJsonRequest('/rest/v1/rpc/register_my_ghost', {
            method: 'POST', body: { p_combat_version: getGhostCombatVersion() }
        });
        ghostArenaState.result = null;
        showGameToast('최근 전투 기록으로 고스트를 등록했습니다.', 'success');
    } catch (error) {
        ghostArenaState.message = getGhostArenaError(error);
    } finally {
        ghostArenaState.loading = false;
        await loadGhostArena();
    }
}

async function fightRandomGhost() {
    if (ghostArenaState.loading) return;
    ghostArenaState.loading = true;
    ghostArenaState.message = '';
    renderGhostArena();
    try {
        ghostArenaState.result = await cloudJsonRequest('/rest/v1/rpc/fight_ghost', {
            method: 'POST', body: { p_combat_version: getGhostCombatVersion() }
        });
    } catch (error) {
        ghostArenaState.message = getGhostArenaError(error);
    } finally {
        ghostArenaState.loading = false;
        await loadGhostArena();
    }
}

function renderProfileGhostResult(result) {
    let labels = { win: '승리', loss: '패배', draw: '무승부' };
    let tone = result.result === 'win' ? 'win' : (result.result === 'loss' ? 'loss' : 'draw');
    return `<div class="ghost-result ${tone}"><strong>친선전 ${labels[result.result] || result.result}</strong><span>${ghostArenaEscape(result.opponent)} · 레이팅 변동 없음</span></div>`;
}

async function fightCurrentProfileGhost() {
    let targetId = typeof socialState !== 'undefined' ? socialState.currentProfileUserId : null;
    let resultHost = document.getElementById('social-profile-pvp-result');
    if (!targetId || targetId === socialLoggedInUserId() || profileGhostDuelBusy) return;
    profileGhostDuelBusy = true;
    if (resultHost) resultHost.innerHTML = '<span class="ghost-empty">서버에서 대결 중…</span>';
    try {
        let result = await cloudJsonRequest('/rest/v1/rpc/fight_ghost_target', {
            method: 'POST', body: { p_target_user_id: targetId, p_combat_version: getGhostCombatVersion() }
        });
        if (resultHost) resultHost.innerHTML = renderProfileGhostResult(result || {});
    } catch (error) {
        if (resultHost) resultHost.innerHTML = `<span class="ghost-error">${ghostArenaEscape(getGhostArenaError(error))}</span>`;
    } finally {
        profileGhostDuelBusy = false;
    }
}

function renderGhostResult(result) {
    if (!result) return '';
    let labels = { win: '승리', loss: '패배', draw: '무승부' };
    let tone = result.result === 'win' ? 'win' : (result.result === 'loss' ? 'loss' : 'draw');
    let delta = Number(result.ratingDelta) || 0;
    return `<div class="ghost-result ${tone}"><strong>${labels[result.result] || result.result}</strong> · ${ghostArenaEscape(result.opponent)} (${ghostArenaEscape(result.opponentSkill)})<span>레이팅 ${ghostArenaEscape(result.ratingBefore)} → ${ghostArenaEscape(result.ratingAfter)} (${delta >= 0 ? '+' : ''}${delta})</span></div>`;
}

function renderGhostLeaderboard(rows) {
    if (!rows.length) return '<p class="ghost-empty">등록된 고스트가 없습니다.</p>';
    return `<div class="ghost-board">${rows.slice(0, 10).map(row => `<div class="ghost-rank"><b>${row.rank}</b><span>${ghostArenaEscape(row.nickname)}<small>${ghostArenaEscape(row.ascend_class || '미전직')} · ${ghostArenaEscape(row.active_skill)}</small></span><strong>${row.rating}${row.provisional ? '*' : ''}</strong><em>${row.wins}승 ${row.losses}패 ${row.draws}무</em></div>`).join('')}</div>`;
}

function renderGhostArena() {
    let host = document.getElementById('social-ghost-arena');
    if (!host) return;
    if (!socialCloudReady()) { host.innerHTML = ''; return; }
    let data = ghostArenaState.data || {};
    let me = data.me;
    let status = me
        ? `<span>내 레이팅 <strong>${me.rating}</strong> · ${me.wins}승 ${me.losses}패 ${me.draws}무${me.matches < 10 ? ' · 배치 중' : ''}</span>`
        : '<span>등록된 고스트 없음</span>';
    host.innerHTML = `<details class="ghost-arena" open><summary>고스트 대결 <small>보상 없음 · 서버 판정 Elo</small></summary><div class="ghost-toolbar">${status}<button onclick="registerMyGhost()" ${ghostArenaState.loading ? 'disabled' : ''}>${me ? '고스트 갱신' : '고스트 등록'}</button><button onclick="fightRandomGhost()" ${!me || ghostArenaState.loading ? 'disabled' : ''}>상대 찾기</button></div><p class="ghost-help">최근 24시간의 같은 빌드 전투 3회 이상을 중앙값으로 등록합니다. 패치 버전이 다른 고스트는 매칭하지 않습니다.</p>${ghostArenaState.message ? `<p class="ghost-error">${ghostArenaEscape(ghostArenaState.message)}</p>` : ''}${renderGhostResult(ghostArenaState.result)}${renderGhostLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : [])}</details>`;
    if (!ghostArenaState.data && !ghostArenaState.loading) Promise.resolve(loadGhostArena()).catch(() => {});
}

function injectGhostArenaStyles() {
    if (document.getElementById('ghost-arena-styles')) return;
    let style = document.createElement('style');
    style.id = 'ghost-arena-styles';
    style.textContent = `.ghost-arena{margin:8px 0;border:1px solid #4b3d72;border-radius:9px;background:linear-gradient(145deg,#17162a,#101827)}.ghost-arena summary{padding:9px 11px;cursor:pointer;color:#e3d8ff;font-weight:800}.ghost-arena summary small{color:#9e96b8;font-weight:500;margin-left:6px}.ghost-toolbar{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:0 10px 8px}.ghost-toolbar>span{margin-right:auto;color:#d9e7f8}.ghost-help{margin:0 10px 8px;color:#9eabc0;font-size:.78em}.ghost-error{margin:0 10px 8px;color:#ff9b9b}.ghost-result{display:flex;gap:7px;flex-wrap:wrap;margin:0 10px 8px;padding:8px;border-radius:7px;background:#172238}.ghost-result span{margin-left:auto}.ghost-result.win strong{color:#7ee4a1}.ghost-result.loss strong{color:#ff8f8f}.ghost-result.draw strong{color:#e5d080}.ghost-board{display:grid;gap:4px;padding:0 10px 10px}.ghost-rank{display:grid;grid-template-columns:28px minmax(120px,1fr) 58px 92px;gap:7px;align-items:center;padding:6px 8px;border:1px solid #283b56;border-radius:6px;background:#111d2d}.ghost-rank>b{color:#c9a8ff}.ghost-rank span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ghost-rank small{display:block;color:#94a7bf;overflow:hidden;text-overflow:ellipsis}.ghost-rank strong{text-align:right}.ghost-rank em{font-style:normal;color:#aebbd0;font-size:.78em;text-align:right}.ghost-empty{padding:0 10px 10px;color:#9eabc0}@media(max-width:640px){.ghost-rank{grid-template-columns:24px minmax(100px,1fr) 52px}.ghost-rank em{display:none}}`;
    document.head.appendChild(style);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectGhostArenaStyles);
else injectGhostArenaStyles();

safeExposeGlobals({ renderGhostArena, registerMyGhost, fightRandomGhost, fightCurrentProfileGhost, loadGhostArena });
