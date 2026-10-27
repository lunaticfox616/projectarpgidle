// 수동 저장, 클라우드 저장 복구와 운영 통계 UI. 데이터 접근 권한은 Supabase RPC가 최종 판정한다.

function cloudToolsEscape(value) {
    return typeof escapeHTML === 'function' ? escapeHTML(String(value == null ? '' : value)) : String(value == null ? '' : value);
}

function cloudToolsNumber(value) {
    return Math.floor(Number(value) || 0).toLocaleString('ko-KR');
}

/** 운영 창과 문의 창의 단추들: data-* 이름 → 처리 함수. 단추 하나에 이 이름은 하나만 붙인다(값은 보통 대상 id). */
const CLOUD_TOOLS_ACTIONS = [
    ['cheatHold', setCheatHold], ['cheatClear', clearCheatFlags], ['chatMute', setChatMute], ['chatDelete', deleteChatMessage], ['chatClear', clearAllChat],
    ['termAdd', button => setBannedTerm(button, false)], ['termRemove', button => setBannedTerm(button, true)],
    ['muteNick', setChatMuteByNickname], ['chatPeek', peekPlayerChat],
    ['feedbackSend', submitPlayerFeedback], ['feedbackFilter', setAdminFeedbackFilter], ['feedbackStatus', setFeedbackStatus], ['feedbackReply', replyFeedback],
    ['playerSearch', searchPlayers], ['playerDetail', openPlayerDetail], ['playerSave', downloadPlayerSave], ['opsJump', jumpToOpsSection]
];
/** 보류와 금지, 기록 지우기는 플레이어 표와 자세히 보기에도 보이는 상태라, 끝난 뒤 그 둘을 다시 그린다(refreshPlayerViews). */
const PLAYER_STATE_ACTIONS = new Set(['cheatHold', 'cheatClear', 'chatMute', 'muteNick']);
const CLOUD_TOOLS_ACTION_SELECTOR = CLOUD_TOOLS_ACTIONS.map(([key]) => `[data-${key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())}]`).join(', ');

function ensureCloudToolsDialog() {
    let dialog = document.getElementById('cloud-tools-dialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'cloud-tools-dialog';
    dialog.className = 'cloud-tools-dialog';
    dialog.innerHTML = `<div class="cloud-tools-head"><strong id="cloud-tools-title"></strong><button type="button" onclick="closeCloudToolsDialog()" aria-label="닫기">✕</button></div><div id="cloud-tools-body" class="cloud-tools-body"></div>`;
    dialog.addEventListener('click', event => {
        let button = event.target.closest(CLOUD_TOOLS_ACTION_SELECTOR);
        if (!button) return;
        let action = CLOUD_TOOLS_ACTIONS.find(([key]) => button.dataset[key] !== undefined);
        if (!action) return;
        Promise.resolve(action[1](button))
            .then(() => (PLAYER_STATE_ACTIONS.has(action[0]) ? refreshPlayerViews() : null))
            .catch(error => console.warn('cloud tools action failed:', error));
    });
    dialog.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.isComposing && event.target && event.target.id === 'player-query') searchPlayers();
    });
    document.body.appendChild(dialog);
    return dialog;
}

function openCloudToolsDialog(title, html) {
    let dialog = ensureCloudToolsDialog();
    document.getElementById('cloud-tools-title').textContent = title;
    document.getElementById('cloud-tools-body').innerHTML = html;
    if (!dialog.open) dialog.showModal();
}

function closeCloudToolsDialog() {
    let dialog = document.getElementById('cloud-tools-dialog');
    if (dialog && dialog.open) dialog.close();
}

function renderCloudHistoryRows(rows) {
    if (!rows.length) return '<p class="cloud-tools-empty">저장 이력이 없습니다.</p>';
    return `<div class="cloud-history-list">${rows.map(row => {
        let time = row.saved_at ? new Date(row.saved_at).toLocaleString('ko-KR') : '-';
        let action = row.is_current
            ? '<span class="cloud-current-badge">현재</span>'
            : `<button type="button" onclick="restoreCloudSaveVersion(${Number(row.revision) || 0})">복구</button>`;
        return `<div class="cloud-history-row"><div><strong>리비전 ${cloudToolsNumber(row.revision)}</strong><small>루프 ${cloudToolsNumber(row.loop_number)}, ${cloudToolsEscape(time)}</small></div>${action}</div>`;
    }).join('')}</div><p class="cloud-tools-note">정상적으로 완료된 클라우드 저장의 이전 버전을 약 30분 간격으로 최대 2개 보관합니다.</p>`;
}

async function openCloudSaveHistory() {
    if (!cloudState || !cloudState.user) return showGameToast('클라우드 로그인이 필요합니다.', 'warning');
    openCloudToolsDialog('클라우드 저장 이력', '<p class="cloud-tools-empty">불러오는 중…</p>');
    try {
        let rows = await cloudJsonRequest('/rest/v1/rpc/list_cloud_save_versions', { method: 'POST', body: {} });
        document.getElementById('cloud-tools-body').innerHTML = renderCloudHistoryRows(Array.isArray(rows) ? rows : []);
    } catch (error) {
        document.getElementById('cloud-tools-body').innerHTML = `<p class="cloud-tools-error">불러오기 실패: ${cloudToolsEscape(error.message || error)}</p>`;
    }
}

async function restoreCloudSaveVersion(revision) {
    let confirmed = await requestGameConfirmation(`리비전 ${revision}의 저장으로 복구할까요?\n현재 저장은 복구 직전 이력으로 보관됩니다.`, {
        title: '클라우드 저장 복구', tone: 'warning', confirmLabel: '복구'
    });
    if (!confirmed) return;
    try {
        let rows = await cloudJsonRequest('/rest/v1/rpc/restore_cloud_save_version', {
            method: 'POST', body: { target_revision: revision, expected_revision: getLocalCloudRevision() }
        });
        let result = Array.isArray(rows) ? rows[0] : rows;
        if (!result || result.restored !== true) throw new Error('다른 기기에서 저장이 변경되었습니다. 서버 저장을 다시 불러오세요.');
        await pullCloudSave({ silent: true });
        closeCloudToolsDialog();
        showGameToast('선택한 클라우드 저장을 복구했습니다.', 'success');
    } catch (error) {
        showGameToast(`저장 복구 실패: ${error.message || error}`, 'danger');
    }
}

/** 설정 > 클라우드 세이브의 계정 삭제 단추. 지워지는 것을 알린 뒤 "삭제"를 그대로 쳐야 delete_my_account(db/cloud-and-playtest.sql)를 부른다.
 * 서버가 auth.users 한 줄을 지우면 모든 표가 외래키로 따라 지워지므로 이쪽은 이 기기의 토큰만 치운다. 이 기기의 저장은 남는다. */
async function deleteCloudAccount() {
    if (!cloudState || !cloudState.user) return setCloudMessage('로그인한 계정이 없습니다.');
    if (cloudState.busy) return setCloudMessage('클라우드 작업이 끝난 뒤 다시 눌러 주세요.');
    if (!(await confirmAccountDeletion())) return;
    cloudState.busy = true;
    setCloudMessage('계정을 지우는 중입니다...');
    updateCloudSaveUI();
    let outcome = await requestAccountDeletion();
    if (outcome.failed) {
        cloudState.busy = false;
        updateCloudSaveUI();
        setCloudMessage(`계정을 지우지 못했습니다: ${outcome.failed}`);
        return showGameToast('계정을 지우지 못했습니다.', 'danger');
    }
    await forgetDeletedAccountSession();
    cloudState.busy = false;
    updateCloudSaveUI();
    setCloudMessage(outcome.alreadyGone
        ? '이미 지워진 계정이라 이 기기의 로그인 정보만 치웠습니다. 이 기기의 저장은 그대로 있습니다.'
        : '계정과 클라우드 자료를 지웠습니다. 이 기기의 저장은 그대로 있습니다.');
    showGameToast('계정을 지웠습니다.', 'success');
}

/** 설정 > 클라우드 세이브의 "계정과 데이터 삭제 요청" 링크(2026-10-27 사용자: 로그인한 계정은 게임 안 계정 삭제 창이 바로 열리게): 로그인했으면
 * 메일 대신 계정 삭제(deleteCloudAccount)를 연다. 메일 앱이 없는 PC에서는 메일 링크가 아무 일도 하지 않았다. 로그인하지 않았으면 메일 링크
 * 그대로 간다(서버에 지울 계정이 없다). */
function openAccountDeletionRequest(event) {
    if (!cloudState || !cloudState.user) return;
    event.preventDefault();
    deleteCloudAccount();
}

const ACCOUNT_DELETE_ERROR_TEXTS = [
    [/AUTH_REQUIRED/, '로그인이 풀렸습니다. 다시 로그인한 뒤 눌러 주세요.'],
    [/schema cache|could not find|does not exist/i, '서버에 계정 삭제 기능이 아직 없습니다. db/account-deletion-hold-chat-20261027.sql을 실행해야 합니다.']
];
/** delete_my_account를 부른다. 다른 기기에서 이미 지운 계정(ACCOUNT_NOT_FOUND)은 성공으로 본다: 이 기기의 로그인 정보만 치우면 된다(검토 지적 2026-10-27). */
async function requestAccountDeletion() {
    try {
        await cloudJsonRequest('/rest/v1/rpc/delete_my_account', { method: 'POST', body: {} });
        return { alreadyGone: false };
    } catch (error) {
        let message = String((error && error.message) || error);
        if (/ACCOUNT_NOT_FOUND/.test(message)) return { alreadyGone: true };
        let known = ACCOUNT_DELETE_ERROR_TEXTS.find(([pattern]) => pattern.test(message));
        return { failed: known ? known[1] : message };
    }
}

/** 두 단계 확인: 지워지는 것의 목록, 그 다음 "삭제"를 그대로 쳐야 한다(다른 글은 입력 칸 아래 안내로 막힌다). */
async function confirmAccountDeletion() {
    let agreed = await requestGameConfirmation(
        '이 계정을 지울까요?\n클라우드 저장과 저장 이력, 공개 프로필과 닉네임, 채팅, 전당 전시와 구매, 고스트 기록이 모두 지워지고 되돌릴 수 없습니다.\n이 기기의 저장은 남습니다.',
        { title: '계정 삭제', tone: 'danger', confirmLabel: '계속' });
    if (!agreed) return false;
    let typed = await requestGameText({
        title: '계정 삭제', tone: 'danger', message: '정말 지우려면 삭제 라고 입력해 주세요.', placeholder: '삭제', maxLength: 10,
        confirmLabel: '영구 삭제', validate: value => String(value || '').trim() === '삭제' ? true : '삭제 라고 입력해야 지워집니다.'
    });
    return typeof typed === 'string';
}

/** 지워진 계정의 흔적을 이 기기에서 치운다. 먼저 게임 세션을 기다림 없이 비워(clearCloudSessionLocally: 사용자, 토큰, 자동 저장 대기와 타이머)
 * 죽은 토큰으로 나가는 저장이나 갱신이 없게 하고, 그 다음 supabase-js의 세션을 서버에 묻지 않고(local) 지운다. 서버 로그아웃은 부르지 않는다:
 * 계정이 없어 세션도 함께 사라졌고, 부르면 만료 직전 토큰을 갱신하려다 "세션 만료" 경고를 남긴다(검토 지적 2026-10-27).
 * supabase-js의 signOut은 던지지 않고 { error }를 돌려준다. */
async function forgetDeletedAccountSession() {
    clearCloudSessionLocally();
    let client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) return;
    try {
        let result = await client.auth.signOut({ scope: 'local' });
        if (result && result.error) console.warn('supabase local sign-out after deletion failed:', result.error);
    } catch (error) {
        console.warn('supabase local sign-out after deletion failed:', error);
    }
}

/** A titled table. A column shows row[key], or render(row) as text, or html(row) as markup the column escapes itself (buttons). */
function renderOpsTable(title, columns, rows) {
    let safeTitle = cloudToolsEscape(title);   // 제목에 닉네임이 들어오는 호출자가 있다(검토 지적 2026-10-27)
    if (!rows.length) return `<section><h3>${safeTitle}</h3><p class="cloud-tools-empty">표본 없음</p></section>`;
    let head = columns.map(column => `<th>${cloudToolsEscape(column.label)}</th>`).join('');
    let cell = (column, row) => column.html ? column.html(row) : cloudToolsEscape(column.render ? column.render(row) : row[column.key]);
    let body = rows.map(row => `<tr>${columns.map(column => `<td>${cell(column, row)}</td>`).join('')}</tr>`).join('');
    return `<section><h3>${safeTitle}</h3><div class="cloud-tools-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></section>`;
}

/** 전투 통계 절의 몸통(admin_get_ops_dashboard의 zones, builds): 지역과 직업을 한글로. 머리 숫자와 오류는 admin_get_ops_overview가 맡는다(2026-10-27). */
function renderOpsStats(data) {
    let html = renderOpsTable('지역 통계, 최근 30일', [
        { label: '지역', render: row => opsZoneLabel(row.zone_type, row.zone_id, row.content_stage) }, { key: 'players', label: '사람' }, { key: 'runs', label: '전투' },
        { label: '클리어율', render: row => `${row.clear_rate_pct || 0}%` },
        { label: 'DPS', render: row => cloudToolsNumber(row.median_dps) }, { label: 'EHP', render: row => cloudToolsNumber(row.median_ehp) },
        { label: 'p95', render: row => `${row.p95_frame_ms || 0}ms` }, { key: 'peak_fx', label: '최대 FX' }
    ], Array.isArray(data.zones) ? data.zones : []);
    html += renderOpsTable('직업/스킬 통계, 최근 30일', [
        { label: '직업', render: row => opsClassLabel(row.ascend_class) }, { key: 'active_skill', label: '스킬' }, { key: 'players', label: '사람' }, { key: 'runs', label: '전투' },
        { label: '클리어율', render: row => `${row.clear_rate_pct || 0}%` },
        { label: 'DPS', render: row => cloudToolsNumber(row.median_dps) }, { label: 'EHP', render: row => cloudToolsNumber(row.median_ehp) }
    ], Array.isArray(data.builds) ? data.builds : []);
    return html;
}

const OPS_ZONE_TYPE_LABELS = {
    abyss: '심연', act: '막', meteor: '유성 낙하지', labyrinth: '고대 미궁', cosmos: '우주', trial: '시련', timeRift: '시간 균열',
    atlasMap: '지도', ocean: '심해', hunting: '사냥터', breach: '균열', colony: '군락', incident: '사건', duel: '대결', unknown: '알 수 없음'
};
const OPS_ZONE_ID_LABELS = {
    meteor_fall_site: '유성 낙하지', labyrinth_endless: '끝없는 미궁', cosmos_challenge: '우주 도전', time_rift_past: '과거 균열'
};
/** 원격 측정의 zone_type, zone_id, 단계를 한 줄 한글로: "심연 22층", "유성 낙하지 14단계", "막 9". */
function opsZoneLabel(type, id, stage) {
    let typeLabel = OPS_ZONE_TYPE_LABELS[type] || String(type || '');
    let idText = String(id == null ? '' : id);
    let place = OPS_ZONE_ID_LABELS[idText] || (/^\d+$/.test(idText) ? `${typeLabel} ${idText}${type === 'abyss' ? '층' : ''}` : `${typeLabel} ${idText}`.trim());
    return stage ? `${place} ${/^\d+$/.test(String(stage)) ? `${stage}단계` : stage}` : place;
}

function opsClassLabel(ascendClass) {
    if (!ascendClass || ascendClass === 'unascended') return '미전직';
    return typeof CLASS_TEMPLATES !== 'undefined' && CLASS_TEMPLATES[ascendClass] ? CLASS_TEMPLATES[ascendClass].name : String(ascendClass);
}

/** A hold or release button for one account; the dialog's click handler sends it (setCheatHold). */
function renderCheatHoldButton(userId, held, note) {
    return `<button type="button" data-cheat-hold="${cloudToolsEscape(userId)}" data-cheat-held="${held ? '1' : '0'}" data-cheat-note="${cloudToolsEscape(note)}">${held ? '보류 풀기' : '보류'}</button>`;
}

/** A ghost flag (DPS or EHP outlier) from the last 7 days: the server freezes that ghost's ranked rating meanwhile (ghost_under_review). */
function isGhostFlagUnderReview(row) {
    return /^ghost_/.test(String(row.kind || '')) && Date.now() - new Date(row.last_at).getTime() < 7 * 24 * 60 * 60 * 1000;
}

/** The anti-cheat watch (db/anti-cheat.sql admin_get_cheat_watch): flags, growth per hour, held accounts. */
function renderCheatWatch(data) {
    const kinds = { clock: '기기 시계', currency: '화폐', level: '레벨', ghost_dps: '고스트 DPS', ghost_ehp: '고스트 EHP' };
    const account = { label: '계정', render: row => row.nickname || String(row.user_id || '').slice(0, 8) };
    const hold = note => ({ label: '보류', html: row => renderCheatHoldButton(row.user_id, row.held === true, note(row)) });
    let html = '<section><h3>치트 감시</h3><p class="cloud-tools-note">감시는 기록만 하고 막지 않습니다. 보류한 계정은 전당과 고스트 대결에서 빠지고, 저장과 혼자 하는 플레이는 그대로입니다. 고스트 기록(DPS, EHP)은 7일 동안 순위전 점수를 멈추고, 지우면 바로 풀립니다.</p></section>';
    html += renderOpsTable('감시 기록, 최근 90일', [
        account, { label: '종류', render: row => kinds[row.kind] || row.kind }, { key: 'seen_on', label: '날짜' }, { key: 'hits', label: '횟수' },
        { label: '내용', render: row => JSON.stringify(row.detail || {}) },
        { label: '순위전', render: row => isGhostFlagUnderReview(row) ? '점수 멈춤' : '' },
        hold(row => `${kinds[row.kind] || row.kind} ${row.seen_on}`),
        { label: '기록', html: row => `<button type="button" data-cheat-clear="${cloudToolsEscape(row.user_id)}" data-cheat-kind="${cloudToolsEscape(row.kind)}">지우기</button>` }
    ], Array.isArray(data.flags) ? data.flags : []);
    html += renderOpsTable('성장 속도, 최근 7일', [
        account, { key: 'seen_on', label: '날짜' }, { key: 'samples', label: '저장' }, { key: 'hours', label: '시간' },
        { label: '화폐/시간', render: row => cloudToolsNumber(row.currency_per_hour) },
        { label: '최고 속도', render: row => `${cloudToolsNumber(row.max_currency_per_hour)} ${row.max_currency_key || ''}` },
        { key: 'level_per_hour', label: '레벨/시간' }, { key: 'season_per_hour', label: '루프/시간' }, hold(row => `성장 ${row.seen_on}`)
    ], Array.isArray(data.rates) ? data.rates : []);
    html += renderOpsTable('보류한 계정', [
        account, { key: 'note', label: '메모' }, { label: '시각', render: row => new Date(row.created_at).toLocaleString('ko-KR') },
        { label: '보류', html: row => renderCheatHoldButton(row.user_id, true, '') }
    ], Array.isArray(data.holds) ? data.holds : []);
    return html;
}

/** Fills the watch under the ops tables. Before db/anti-cheat.sql runs, the server has no such function and a note says so. */
async function loadCheatWatch() {
    let box = document.getElementById('cheat-watch');
    if (!box) return;
    try {
        let data = await cloudJsonRequest('/rest/v1/rpc/admin_get_cheat_watch', { method: 'POST', body: {} });
        box.innerHTML = renderCheatWatch(data || {});
    } catch (error) {
        let text = String(error && error.message || error);
        box.innerHTML = /schema cache|could not find|does not exist/i.test(text)
            ? '<section><h3>치트 감시</h3><p class="cloud-tools-note">Supabase에서 db/anti-cheat.sql을 실행하면 보입니다.</p></section>'
            : `<section><h3>치트 감시</h3><p class="cloud-tools-error">불러올 수 없습니다: ${cloudToolsEscape(text)}</p></section>`;
    }
}

/** Holds or releases one account after a confirmation (db/anti-cheat.sql admin_set_cheat_hold), then reloads the watch. */
async function setCheatHold(button) {
    let held = button.dataset.cheatHeld === '1';
    let confirmed = await requestGameConfirmation(held
        ? '이 계정의 보류를 풀까요?\n다음 고스트 등록부터 다시 순위에 듭니다.\n닫은 전시는 닫힌 채로 둡니다.'
        : '이 계정을 보류할까요?\n전당 등록과 구매, 고스트 대결, 채팅에서 빠집니다.\n열린 전시는 더 팔리지 않습니다.', {
        title: '치트 감시', tone: 'warning', confirmLabel: held ? '보류 풀기' : '보류'
    });
    if (!confirmed) return;
    try {
        await cloudJsonRequest('/rest/v1/rpc/admin_set_cheat_hold', {
            method: 'POST', body: { p_user_id: button.dataset.cheatHold, p_hold: !held, p_note: button.dataset.cheatNote || '' }
        });
        showGameToast(held ? '보류를 풀었습니다.' : '계정을 보류했습니다.', 'success');
    } catch (error) {
        showGameToast(`보류를 바꾸지 못했습니다: ${error.message || error}`, 'danger');
    }
    await loadCheatWatch();
}

/** The profile window's 신고 button (js/social.js renderProfileModerationRow): the chosen reason and that player's newest chat row
 * held on this device go to the server (report_player_chat, one report per player per day). Lives here because social.js must not
 * reach the cloud through a ui file. */
async function reportCurrentProfile() {
    let target = reportTargetUserId();
    if (!target) return;
    let reason = reportReasonValue();
    let confirmed = await requestGameConfirmation(`${reportTargetName()} 님을 ${reason} 사유로 신고할까요?\n그 사람의 최근 채팅 한 줄이 함께 운영자에게 갑니다.`, {
        title: '신고', tone: 'warning', confirmLabel: '신고'
    });
    if (!confirmed) return;
    try {
        await cloudJsonRequest('/rest/v1/rpc/report_player_chat', {
            method: 'POST', body: { p_target_user_id: target, p_reason: reason, p_message_id: latestChatRowId(target) }
        });
        showGameToast('신고를 보냈습니다. 운영자가 확인합니다.', 'success');
    } catch (error) {
        showGameToast('신고 실패: ' + translateReportError(error), 'danger');
    }
}
/** The shown profile's player, or null when it is mine or there is no login. */
function reportTargetUserId() {
    let target = socialState && socialState.currentProfileUserId;
    if (!target || !cloudState || !cloudState.user || target === cloudState.user.id) return null;
    return target;
}
function reportReasonValue() {
    let reasonEl = document.getElementById('social-report-reason');
    return reasonEl ? String(reasonEl.value || '기타') : '기타';
}
function reportTargetName() {
    return (socialState.currentProfile && socialState.currentProfile.nickname) || '이 플레이어';
}
/** The newest chat row of that player among the rows this device holds, or null. */
function latestChatRowId(userId) {
    let latest = (socialState.chatMessages || []).filter(m => m && String(m.user_id) === String(userId))
        .reduce((best, m) => (!best || Number(m.id) > Number(best.id)) ? m : best, null);
    return latest ? Number(latest.id) : null;
}
function translateReportError(error) {
    let msg = String(error && error.message || error);
    if (/REPORT_ALREADY_SENT/.test(msg)) return '같은 사람은 하루에 한 번만 신고할 수 있습니다.';
    if (/REPORT_DAILY_LIMIT/.test(msg)) return '오늘은 더 신고할 수 없습니다.';
    if (/REPORT_INVALID_TARGET/.test(msg)) return '자기 자신은 신고할 수 없습니다.';
    if (/schema cache|could not find|does not exist/i.test(msg)) return '서버에 신고 기능이 아직 없습니다.';
    return msg;
}

/** Clears one account's watch rows of one kind after a confirmation (admin_clear_cheat_flags), then reloads the watch. */
async function clearCheatFlags(button) {
    let confirmed = await requestGameConfirmation('이 계정의 이 종류 감시 기록을 지울까요?\n고스트 기록이면 순위전 점수가 다시 움직입니다.', {
        title: '치트 감시', tone: 'warning', confirmLabel: '지우기'
    });
    if (!confirmed) return;
    try {
        await cloudJsonRequest('/rest/v1/rpc/admin_clear_cheat_flags', {
            method: 'POST', body: { p_user_id: button.dataset.cheatClear, p_kind: button.dataset.cheatKind || null }
        });
        showGameToast('감시 기록을 지웠습니다.', 'success');
    } catch (error) {
        showGameToast(`기록을 지우지 못했습니다: ${error.message || error}`, 'danger');
    }
    await loadCheatWatch();
}

/** 금지 풀기(금지 중일 때), 1일, 7일 금지 단추(setChatMute). 신고 표, 금지 표, 플레이어 자세히 보기가 같이 쓴다. */
function renderMuteButtons(userId, nickname, muted) {
    let id = cloudToolsEscape(userId), name = cloudToolsEscape(nickname || '');
    return (muted ? `<button type="button" data-chat-mute="${id}" data-chat-minutes="0" data-chat-name="${name}">금지 풀기</button>` : '')
        + `<button type="button" data-chat-mute="${id}" data-chat-minutes="1440" data-chat-name="${name}">1일 금지</button>`
        + `<button type="button" data-chat-mute="${id}" data-chat-minutes="10080" data-chat-name="${name}">7일 금지</button>`;
}

/** Chat reports and mutes (db/social.sql admin_get_chat_reports); the dialog's click handler sends the mute and delete buttons. */
function renderChatReports(data) {
    const muteButtons = row => renderMuteButtons(row.target_user_id || row.user_id, row.nickname, row.muted_until || row.until_at);
    let html = '<section><h3>채팅 신고</h3><p class="cloud-tools-note">신고는 플레이어가 프로필 창에서 보냅니다. 금지한 계정은 풀릴 때까지 채팅을 보낼 수 없고, 지운 줄은 모든 플레이어의 채팅창에서 사라집니다.</p></section>';
    html += renderOpsTable('신고, 최근 200건', [
        { label: '시각', render: row => new Date(row.created_at).toLocaleString('ko-KR') },
        { label: '신고자', render: row => row.reporter_nickname || '' },
        { label: '대상', render: row => row.nickname || String(row.target_user_id || '').slice(0, 8) },
        { label: '24시간 신고', render: row => cloudToolsNumber(row.reports_24h) },
        { key: 'reason', label: '사유' },
        { label: '채팅', render: row => row.body ? (row.body.length > 60 ? `${row.body.slice(0, 60)}…` : row.body) : '' },
        { label: '상태', render: row => row.muted_until ? `금지 중, ${new Date(row.muted_until).toLocaleString('ko-KR')}까지` : (row.message_id && !row.message_exists ? '줄 지워짐' : '') },
        { label: '조치', html: row => muteButtons(row) + (row.message_id && row.message_exists ? `<button type="button" data-chat-delete="${cloudToolsEscape(row.message_id)}">줄 지우기</button>` : '')
            + peekButton(row.target_user_id, row.nickname) }
    ], Array.isArray(data.reports) ? data.reports : []);
    html += '<div id="chat-peek"></div>';
    html += '<div class="ops-summary"><input id="chat-mute-nickname" type="text" maxlength="16" placeholder="닉네임으로 금지">'
        + '<button type="button" data-mute-nick="1440">1일 금지</button><button type="button" data-mute-nick="10080">7일 금지</button>'
        + '<button type="button" data-mute-nick="0">금지 풀기</button><button type="button" data-chat-clear="1">채팅 전체 비우기</button></div>';
    html += renderOpsTable('금지 중인 계정', [
        { label: '계정', render: row => row.nickname || String(row.user_id || '').slice(0, 8) },
        { label: '풀리는 시각', render: row => new Date(row.until_at).toLocaleString('ko-KR') }, { key: 'note', label: '메모' },
        { label: '조치', html: row => muteButtons(row) + peekButton(row.user_id, row.nickname) }
    ], Array.isArray(data.mutes) ? data.mutes : []);
    return html + renderBannedTerms(Array.isArray(data.terms) ? data.terms : null);
}
/** The 최근 채팅 button of one player (peekPlayerChat). */
function peekButton(userId, name) {
    return `<button type="button" data-chat-peek="${cloudToolsEscape(userId)}" data-chat-name="${cloudToolsEscape(name || '')}">최근 채팅</button>`;
}

/** The admin's extra banned terms (chat_banned_terms): a list with 빼기 buttons and a row to add one; the server trims the term the
 * way the check normalises text. terms is null when the server has no such function yet. */
function renderBannedTerms(terms) {
    if (!terms) return '<section><h3>금칙어(관리자 추가)</h3><p class="cloud-tools-note">Supabase에서 db/multiplayer-hardening-20261027.sql을 실행하면 보입니다.</p></section>';
    let html = renderOpsTable('금칙어(관리자 추가)', [
        { key: 'term', label: '낱말' },
        { label: '찾는 글', render: row => row.spaced === false ? '띄어쓰기 지운 글' : '띄어쓰기 남긴 글' },
        { label: '시각', render: row => new Date(row.created_at).toLocaleString('ko-KR') },
        { label: '조치', html: row => `<button type="button" data-term-remove="${cloudToolsEscape(row.term)}">빼기</button>` }
    ], terms);
    return html + '<p class="cloud-tools-note">기본 목록은 서버 함수(chat_text_is_offensive)에 있고, 여기 더한 낱말은 바로 적용됩니다. '
        + '짧은 낱말은 띄어쓰기를 남긴 글에서 찾아야 "혹시 발사체" 같은 말이 걸리지 않습니다.</p>'
        + '<div class="ops-summary"><input id="banned-term-input" type="text" maxlength="40" placeholder="낱말(2~40자)">'
        + '<label><input id="banned-term-spaced" type="checkbox" checked> 띄어쓰기 남긴 글에서 찾기</label>'
        + '<button type="button" data-term-add="1">더하기</button></div>';
}

/** The term a click refers to: the row's own term for 빼기, else the input row's text. */
function bannedTermOf(button, remove) {
    if (remove) return String(button.dataset.termRemove || '');
    let input = document.getElementById('banned-term-input');
    return String((input && input.value) || '').trim();
}
function bannedTermSpaced() {
    let box = document.getElementById('banned-term-spaced');
    return !box || box.checked;
}
/** Adds (from the input row) or removes (a row's button) one banned term after a confirmation, then reloads the section. */
async function setBannedTerm(button, remove) {
    let term = bannedTermOf(button, remove);
    if (term.length < 2) return showGameToast('낱말은 2~40자여야 합니다.', 'warning');
    let confirmed = await requestGameConfirmation(`금칙어 "${term}"${remove ? '을 뺄까요?' : '을 더할까요?'}`, {
        title: '금칙어', tone: 'warning', confirmLabel: remove ? '빼기' : '더하기'
    });
    if (!confirmed) return;
    try {
        await cloudJsonRequest('/rest/v1/rpc/admin_set_banned_term', {
            method: 'POST', body: { p_term: term, p_spaced: bannedTermSpaced(), p_remove: !!remove }
        });
        showGameToast(remove ? '금칙어를 뺐습니다.' : '금칙어를 더했습니다.', 'success');
    } catch (error) {
        showGameToast(`금칙어를 바꾸지 못했습니다: ${error.message || error}`, 'danger');
    }
    await loadChatReports();
}

/** Fills the chat reports under the watch. Before db/multiplayer-hardening-20261027.sql runs, the server has no such function and a note says so. */
async function loadChatReports() {
    let box = document.getElementById('chat-reports');
    if (!box) return;
    try {
        let data = await cloudJsonRequest('/rest/v1/rpc/admin_get_chat_reports', { method: 'POST', body: {} });
        let terms = await cloudJsonRequest('/rest/v1/rpc/admin_get_banned_terms', { method: 'POST', body: {} }).catch(() => null);
        box.innerHTML = renderChatReports(Object.assign({}, data || {}, { terms }));
    } catch (error) {
        let text = String(error && error.message || error);
        box.innerHTML = /schema cache|could not find|does not exist/i.test(text)
            ? '<section><h3>채팅 신고</h3><p class="cloud-tools-note">Supabase에서 db/multiplayer-hardening-20261027.sql을 실행하면 보입니다.</p></section>'
            : `<section><h3>채팅 신고</h3><p class="cloud-tools-error">불러올 수 없습니다: ${cloudToolsEscape(text)}</p></section>`;
    }
}

/** Mutes or unmutes the account whose nickname is in the input row (admin_set_chat_mute_by_nickname): accounts without a report row. */
async function setChatMuteByNickname(button) {
    let input = document.getElementById('chat-mute-nickname');
    let nickname = String((input && input.value) || '').trim();
    if (!nickname) return showGameToast('닉네임을 넣어 주세요.', 'warning');
    let minutes = Math.max(0, Math.floor(Number(button.dataset.muteNick) || 0));
    let confirmed = await requestGameConfirmation(muteConfirmText(nickname, minutes), { title: '채팅 신고', tone: 'warning', confirmLabel: minutes ? '금지' : '풀기' });
    if (!confirmed) return;
    try {
        await cloudJsonRequest('/rest/v1/rpc/admin_set_chat_mute_by_nickname', { method: 'POST', body: { p_nickname: nickname, p_minutes: minutes, p_note: '' } });
        showGameToast(minutes ? '채팅을 금지했습니다.' : '채팅 금지를 풀었습니다.', 'success');
        await loadChatReports();   // 실패했을 때는 다시 그리지 않아 입력한 닉네임이 남는다
    } catch (error) {
        showGameToast(describeMuteError(error), 'danger');
    }
}
function muteConfirmText(name, minutes) {
    return minutes ? `${name} 계정의 채팅을 ${minutes >= 10080 ? '7일' : '1일'} 동안 금지할까요?` : `${name} 계정의 채팅 금지를 풀까요?`;
}
function describeMuteError(error) {
    let text = String(error && error.message || error);
    return /PLAYER_NOT_FOUND/.test(text) ? '그 닉네임의 플레이어가 없습니다.' : `금지를 바꾸지 못했습니다: ${text}`;
}

/** The reported player's newest chat rows (readable by any signed-in user) under the report table, with 줄 지우기 buttons. */
async function peekPlayerChat(button) {
    let box = document.getElementById('chat-peek');
    if (!box) return;
    box.dataset.peekUser = button.dataset.chatPeek;   // 줄을 지운 뒤 같은 사람의 목록을 다시 그린다(deleteChatMessage). 클릭 선택자와 다른 이름.
    box.dataset.peekName = button.dataset.chatName || '';
    box.innerHTML = '<p class="cloud-tools-empty">불러오는 중…</p>';
    try {
        let rows = await cloudJsonRequest(`/rest/v1/chat_messages?select=id,body,created_at&user_id=eq.${encodeURIComponent(button.dataset.chatPeek)}&order=id.desc&limit=15`, {});
        box.innerHTML = renderChatPeek(button.dataset.chatName || '', Array.isArray(rows) ? rows : []);
    } catch (error) {
        box.innerHTML = `<p class="cloud-tools-error">최근 채팅을 불러오지 못했습니다: ${cloudToolsEscape(error.message || error)}</p>`;
    }
}
function renderChatPeek(name, rows) {
    return renderOpsTable(`${name || '이 플레이어'}의 최근 채팅`, [
        { label: '시각', render: row => new Date(row.created_at).toLocaleString('ko-KR') },
        { key: 'body', label: '채팅' },
        { label: '조치', html: row => `<button type="button" data-chat-delete="${cloudToolsEscape(row.id)}">줄 지우기</button>` }
    ], rows);
}

/** Mutes (1 or 7 days) or unmutes one account after a confirmation (admin_set_chat_mute), then reloads the reports. */
async function setChatMute(button) {
    let minutes = Math.max(0, Math.floor(Number(button.dataset.chatMinutes) || 0));
    let name = button.dataset.chatName || '이 계정';
    let confirmed = await requestGameConfirmation(minutes
        ? `${name} 계정의 채팅을 ${minutes >= 10080 ? '7일' : '1일'} 동안 금지할까요?`
        : `${name} 계정의 채팅 금지를 풀까요?`, { title: '채팅 신고', tone: 'warning', confirmLabel: minutes ? '금지' : '풀기' });
    if (!confirmed) return;
    try {
        await cloudJsonRequest('/rest/v1/rpc/admin_set_chat_mute', {
            method: 'POST', body: { p_user_id: button.dataset.chatMute, p_minutes: minutes, p_note: '' }
        });
        showGameToast(minutes ? '채팅을 금지했습니다.' : '채팅 금지를 풀었습니다.', 'success');
    } catch (error) {
        showGameToast(`금지를 바꾸지 못했습니다: ${error.message || error}`, 'danger');
    }
    await loadChatReports();
}

/** Deletes one chat row after a confirmation (admin_delete_chat_message): from the ops window's reports and peek lists, or from a line
 * of the chat window in the admin view (js/social.js renderChatMessages). The row leaves this chat at once; the ops lists reload. */
async function deleteChatMessage(button) {
    let inOps = !!button.closest('#cloud-tools-dialog');
    let confirmed = await requestGameConfirmation('이 채팅 줄을 지울까요?\n모든 플레이어의 채팅창에서 사라집니다.', {
        title: inOps ? '채팅 신고' : '채팅', tone: 'warning', confirmLabel: '지우기'
    });
    if (!confirmed) return;
    let id = Number(button.dataset.chatDelete), peek = button.closest('#chat-peek');   // 최근 채팅 목록 안의 단추였으면 다시 그린 뒤 그 목록을 되살린다
    try {
        let result = await cloudJsonRequest('/rest/v1/rpc/admin_delete_chat_message', { method: 'POST', body: { p_message_id: id } });
        let gone = result && result.deleted === false;   // 다른 운영자나 전체 비우기가 먼저 지운 줄
        forgetSocialChatMessages([id]);
        showGameToast(gone ? '이미 지워진 줄입니다.' : '채팅 줄을 지웠습니다.', gone ? 'warning' : 'success');
    } catch (error) {
        showGameToast(`줄을 지우지 못했습니다: ${error.message || error}`, 'danger');
    }
    if (!inOps) return;
    await loadChatReports();
    if (peek) await peekPlayerChat({ dataset: { chatPeek: peek.dataset.peekUser, chatName: peek.dataset.peekName } });
}

/** Empties the whole chat after a confirmation (db/admin-gate-chat-clear-20261027.sql admin_clear_chat). Report rows keep their own
 * copy of the reported lines; the reports and peek lists reload so no 줄 지우기 button points at a row that is gone. */
async function clearAllChat() {
    let confirmed = await requestGameConfirmation('채팅을 모두 지울까요?\n모든 플레이어의 채팅창이 비고, 되돌릴 수 없습니다.', {
        title: '채팅 전체 비우기', tone: 'danger', confirmLabel: '모두 지우기'
    });
    if (!confirmed) return;
    try {
        let result = await cloudJsonRequest('/rest/v1/rpc/admin_clear_chat', { method: 'POST', body: {} });
        forgetSocialChatMessages();
        showGameToast(`채팅 ${cloudToolsNumber(result && result.deleted)}줄을 지웠습니다.`, 'success');
    } catch (error) {
        let text = String((error && error.message) || error);
        showGameToast(/schema cache|could not find|does not exist/i.test(text)
            ? '서버에 채팅 비우기 기능이 아직 없습니다. db/admin-gate-chat-clear-20261027.sql을 실행해야 합니다.'
            : `채팅을 비우지 못했습니다: ${text}`, 'danger');
        return;
    }
    await loadChatReports();
}

/** 운영 창. 뼈대(할 일 띠, 지표, 경고 자리와 접힌 절들)를 먼저 그리고 RPC 여섯을 한꺼번에 불러 채운다(전: 하나씩 차례로).
 * 할 일이 있는 절만 펼쳐진 채 열린다. */
async function openOpsDashboard() {
    if (!cloudState || !cloudState.user) return showGameToast('관리자 로그인이 필요합니다.', 'warning');
    openCloudToolsDialog('운영 창', renderOpsShell());
    let [overview, dashboard] = await Promise.all([
        cloudJsonRequest('/rest/v1/rpc/admin_get_ops_overview', { method: 'POST', body: {} }).catch(error => ({ error })),
        cloudJsonRequest('/rest/v1/rpc/admin_get_ops_dashboard', { method: 'POST', body: {} }).catch(error => ({ error })),
        loadCheatWatch(), loadChatReports(), loadAdminFeedback(), searchPlayers()
    ]);
    renderOpsTop(overview || {}, dashboard || {});
}

const OPS_SECTIONS = [
    ['ops-stats', '전투 통계', '지역, 직업과 스킬'], ['ops-cheat', '치트 감시', '감시 기록, 성장 속도, 보류'], ['ops-chat', '채팅 신고', '신고, 금지, 금칙어'],
    ['ops-feedback', '문의와 제보', '플레이어가 보낸 글과 답변'], ['ops-players', '플레이어', '찾기, 자세히 보기, 저장 내려받기']
];
function renderOpsShell() {
    let nav = OPS_SECTIONS.map(([id, title]) => `<button type="button" data-ops-jump="${id}">${title}</button>`).join('');
    let section = (id, body) => {
        let [, title, hint] = OPS_SECTIONS.find(entry => entry[0] === id);
        return `<details class="ops-section" id="${id}"><summary><strong>${title}</strong><small>${hint}</small></summary><div class="ops-section-body">${body}</div></details>`;
    };
    let loading = title => `<section><h3>${title}</h3><p class="cloud-tools-empty">불러오는 중…</p></section>`;
    return '<div id="ops-top"><p class="cloud-tools-empty">집계 중…</p></div>'
        + `<nav class="ops-nav">${nav}</nav>`
        + section('ops-stats', '<div id="ops-stats-body"><p class="cloud-tools-empty">집계 중…</p></div>')
        + section('ops-cheat', `<div id="cheat-watch">${loading('치트 감시')}</div>`)
        + section('ops-chat', `<div id="chat-reports">${loading('채팅 신고')}</div>`)
        + section('ops-feedback', `<div id="admin-feedback">${loading('문의와 제보')}</div>`)
        + section('ops-players', renderPlayerLookupShell());
}

/** 절 이동 칩과 할 일 띠의 단추: 접힌 절을 펼치고 거기로 내린다. */
function jumpToOpsSection(button) {
    let section = document.getElementById(button.dataset.opsJump);
    if (!section) return;
    section.open = true;
    section.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

/** 맨 위: 할 일 띠, 지표 카드, 경고 표, 묶은 오류. 통계 절의 몸통도 여기서 채운다. 할 일이 있는 절은 펼쳐 둔다. */
function renderOpsTop(overview, dashboard) {
    let top = document.getElementById('ops-top');
    if (!top) return;
    top.innerHTML = renderOpsHead(overview) + renderOpsAlertBlock(overview, dashboard);
    let stats = document.getElementById('ops-stats-body');
    if (stats) stats.innerHTML = dashboard.error ? renderSectionError('전투 통계', dashboard.error) : renderOpsStats(dashboard);
    openSectionsWithTodo(overview.todo || {});
}

function renderOpsHead(overview) {
    if (overview.error) return renderSectionError('운영 지표', overview.error, 'db/ops-overview-20261027.sql');
    return renderTodoStrip(overview.todo || {}) + renderKpiCards(overview);
}

function renderOpsAlertBlock(overview, dashboard) {
    let alerts = dashboard.error ? renderSectionError('경고', dashboard.error) : renderOpsAlerts(Array.isArray(dashboard.alerts) ? dashboard.alerts : []);
    return alerts + (overview.error ? '' : renderErrorGroups(Array.isArray(overview.errors) ? overview.errors : []));
}

const OPS_TODO_ITEMS = [
    ['feedbackNew', '새 문의', 'ops-feedback'], ['reports24h', '24시간 신고', 'ops-chat'], ['mutesActive', '금지 중', 'ops-chat'],
    ['ghostsUnderReview', '검토 중 고스트', 'ops-cheat'], ['holds', '보류 계정', 'ops-cheat'], ['errors24h', '24시간 오류', 'ops-stats']
];
function renderTodoStrip(todo) {
    let chips = OPS_TODO_ITEMS.map(([key, label, section]) => {
        let count = Number(todo[key]) || 0;
        return `<button type="button" class="ops-todo${count ? '' : ' is-zero'}" data-ops-jump="${section}"><strong>${cloudToolsNumber(count)}</strong>${label}</button>`;
    }).join('');
    return `<section class="ops-todo-strip"><h3>할 일</h3><div class="ops-todo-row">${chips}</div></section>`;
}

function openSectionsWithTodo(todo) {
    let open = new Set(OPS_TODO_ITEMS.filter(([key]) => Number(todo[key]) > 0).map(([, , section]) => section));
    for (const [id] of OPS_SECTIONS) {
        let section = document.getElementById(id);
        if (section) section.open = open.has(id);
    }
}

/** 이번 7일과 그 전 7일: "162 (전주 230)". */
function opsWeekPair(current, previous) {
    return `${cloudToolsNumber(current)} <small>(전주 ${cloudToolsNumber(previous)})</small>`;
}

function renderKpiCards(overview) {
    let accounts = overview.accounts || {}, play = overview.play || {}, social = overview.social || {}, server = overview.server || {};
    let dbMb = Math.round((Number(server.dbBytes) || 0) / 1048576), dbLimitMb = Math.round((Number(server.dbLimitBytes) || 524288000) / 1048576);
    let cards = [
        ['계정', [['가입', cloudToolsNumber(accounts.total)], ['7일 새 가입', opsWeekPair(accounts.new7d, accounts.newPrev7d)], ['7일 로그인', cloudToolsNumber(accounts.signedIn7d)],
            ['24시간 접속', cloudToolsNumber(accounts.seen24h)], ['공개 프로필', cloudToolsNumber(accounts.profiles)]]],
        ['전투', [['30일 전투', cloudToolsNumber(play.runs30d)], ['7일 전투', opsWeekPair(play.runs7d, play.runsPrev7d)], ['7일 전투한 사람', opsWeekPair(play.players7d, play.playersPrev7d)],
            ['30일 클리어율', `${play.clearRate30d == null ? '-' : play.clearRate30d}%`], ['30일 중단', cloudToolsNumber(play.abandons30d)]]],
        ['멀티', [['7일 채팅', opsWeekPair(social.chat7d, social.chatPrev7d)], ['고스트 등록', cloudToolsNumber(social.ghostsActive)], ['30일 대전', cloudToolsNumber(social.ghostMatches30d)],
            ['전시 중', cloudToolsNumber(social.hallOpen)], ['30일 구매', cloudToolsNumber(social.hallPurchases30d)]]],
        ['서버', [['DB 크기', `${dbMb}MB / ${dbLimitMb}MB`], ['저장', `${cloudToolsNumber(server.saves)}개, ${Math.round((Number(server.saveBytes) || 0) / 1048576)}MB`],
            ['저장 이력', cloudToolsNumber(server.saveVersions)], ['30일 오류', cloudToolsNumber(server.errors30d)], ['마지막 전투 기록', cloudToolsTime(play.lastRunAt)]]]
    ];
    let html = cards.map(([title, rows]) => `<div class="ops-kpi"><h4>${title}</h4><dl>${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl></div>`).join('');
    return `<section><h3>지표</h3><div class="ops-kpi-row">${html}</div></section>`;
}

function renderOpsAlerts(alerts) {
    let order = { critical: 0, warning: 1 };
    let rows = alerts.slice().sort((a, b) => (order[a.severity] ?? 2) - (order[b.severity] ?? 2) || (Number(b.runs) || 0) - (Number(a.runs) || 0));
    return renderOpsTable('경고, 최근 30일', [
        { label: '등급', render: row => row.severity === 'critical' ? '심각' : '주의' },
        { label: '지역', render: row => row.zone_type === 'build' ? opsBuildLabel(row.zone_id) : opsZoneLabel(row.zone_type, row.zone_id, row.content_stage) },
        { key: 'message', label: '판정' }, { key: 'runs', label: '전투' }, { label: '사람', render: row => row.players == null ? '' : cloudToolsNumber(row.players) }
    ], rows);
}

/** 빌드 경고의 zone_id는 서버가 "직업id · 스킬"로 붙인 글: 직업을 한글로, 가운뎃점 없이. */
function opsBuildLabel(text) {
    let [ascendClass, ...skill] = String(text || '').split(' · ');
    return skill.length ? `${opsClassLabel(ascendClass)}, ${skill.join(' ')}` : opsClassLabel(ascendClass);
}

function renderErrorGroups(errors) {
    return renderOpsTable('오류, 최근 30일(같은 오류는 묶음)', [
        { label: '오류', html: row => `<div class="feedback-cell">${cloudToolsEscape(row.message || row.fingerprint)}</div>` },
        { key: 'hits', label: '횟수' }, { key: 'users', label: '사람' }, { label: '마지막', render: row => cloudToolsTime(row.last_at) }, { key: 'app_version', label: '버전' }
    ], errors);
}

// ---------------------------------------------------------------------------
// 문의와 제보 (db/operations-and-ghost.sql player_feedback): 플레이어의 문의 창과 운영 창의 목록
// ---------------------------------------------------------------------------
const FEEDBACK_KIND_LABELS = { bug: '버그 제보', question: '문의', suggestion: '건의' };
const FEEDBACK_STATUS_LABELS = { new: '새 글', seen: '확인함', done: '처리함' };
const FEEDBACK_ERROR_TEXTS = [
    [/FEEDBACK_DAILY_LIMIT/, '24시간 안에 5건까지 보낼 수 있습니다. 잠시 뒤 다시 보내 주세요.'],
    [/FEEDBACK_TOO_SHORT/, '내용을 5자 이상 적어 주세요.'],
    [/AUTH_REQUIRED/, '로그인이 풀렸습니다. 다시 로그인한 뒤 보내 주세요.'],
    [/schema cache|could not find|does not exist/i, '서버에 문의 기능이 아직 없습니다. 잠시 뒤 다시 시도해 주세요.']
];
let adminFeedbackFilter = '';
let playerDetailUserId = null;   // 자세히 보기가 열려 있는 플레이어(조치 뒤 다시 그릴 때)

function cloudToolsTime(value) {
    return value ? new Date(value).toLocaleString('ko-KR') : '';
}

/** 설정 > 문의와 제보의 단추. 보내는 칸과 내가 보낸 글(운영자 답변 포함)을 한 창에 보인다. 로그인한 계정만 보낼 수 있다. */
async function openFeedbackDialog() {
    openCloudToolsDialog('문의와 제보', renderFeedbackForm());
    if (cloudState && cloudState.user) await loadMyFeedback();
}

function renderFeedbackForm() {
    if (!cloudState || !cloudState.user) {
        return '<section><p class="cloud-tools-note">로그인한 계정으로만 보낼 수 있습니다. 설정의 클라우드 세이브에서 로그인한 뒤 다시 열어 주세요.</p></section>';
    }
    let kinds = Object.entries(FEEDBACK_KIND_LABELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
    return '<section><p class="cloud-tools-note">게임 버전, 현재 지역과 루프, 직업, 기기 종류가 함께 갑니다. 답변은 이 창에서 봅니다.</p>'
        + `<div class="feedback-form"><select id="feedback-kind">${kinds}</select>`
        + '<textarea id="feedback-body" rows="6" maxlength="2000" placeholder="무슨 일이 있었는지, 어디서, 어떤 순서로 눌렀는지 적어 주세요."></textarea>'
        + '<input id="feedback-contact" type="text" maxlength="120" placeholder="연락처(선택): 이메일이나 디스코드 이름">'
        + '<button type="button" data-feedback-send="1">보내기</button></div></section><div id="my-feedback"></div>';
}

/** 상황 정보: 오류 보고와 같은 묶음(js/playtest-telemetry.js getClientDiagnosticContext)에 화면 크기와 브라우저를 더한다. */
function feedbackContext() {
    let context = typeof getClientDiagnosticContext === 'function' ? getClientDiagnosticContext() : {};
    return Object.assign({}, context, { screen: `${window.innerWidth}x${window.innerHeight}`, userAgent: String(navigator.userAgent || '').slice(0, 200) });
}

async function submitPlayerFeedback(button) {
    let body = document.getElementById('feedback-body').value.trim();
    if (body.length < 5) return showGameToast('내용을 5자 이상 적어 주세요.', 'warning');
    button.disabled = true;
    try {
        await cloudJsonRequest('/rest/v1/rpc/submit_player_feedback', { method: 'POST', body: {
            p_kind: document.getElementById('feedback-kind').value, p_body: body,
            p_contact: document.getElementById('feedback-contact').value.trim(), p_context: feedbackContext(),
            p_app_version: typeof getPlaytestBuildVersion === 'function' ? getPlaytestBuildVersion() : ''
        } });
        let input = document.getElementById('feedback-body');
        if (input) input.value = '';   // 요청 중에 다른 창으로 바꿨을 수 있다
        showGameToast('보냈습니다. 답변은 이 창에서 볼 수 있습니다.', 'success');
        await loadMyFeedback();
    } catch (error) {
        showGameToast(describeFeedbackError(error), 'danger');
    } finally {
        button.disabled = false;
    }
}

function describeFeedbackError(error) {
    let message = String((error && error.message) || error);
    let known = FEEDBACK_ERROR_TEXTS.find(([pattern]) => pattern.test(message));
    return known ? known[1] : `보내지 못했습니다: ${message}`;
}

async function loadMyFeedback() {
    let box = document.getElementById('my-feedback');
    if (!box) return;
    try {
        let rows = await cloudJsonRequest('/rest/v1/rpc/get_my_feedback', { method: 'POST', body: {} });
        box.innerHTML = renderMyFeedback(Array.isArray(rows) ? rows : []);
    } catch (error) {
        box.innerHTML = `<section><h3>내가 보낸 글</h3><p class="cloud-tools-error">불러올 수 없습니다: ${cloudToolsEscape(error.message || error)}</p></section>`;
    }
}

function renderMyFeedback(rows) {
    if (!rows.length) return '<section><h3>내가 보낸 글</h3><p class="cloud-tools-empty">아직 없습니다.</p></section>';
    let items = rows.map(row => `<div class="feedback-item"><div class="feedback-meta"><span>${cloudToolsEscape(FEEDBACK_KIND_LABELS[row.kind] || row.kind)}</span>`
        + `<span>${cloudToolsTime(row.created_at)}</span><span>${cloudToolsEscape(FEEDBACK_STATUS_LABELS[row.status] || row.status)}</span></div>`
        + `<div class="feedback-body">${cloudToolsEscape(row.body)}</div>`
        + (row.reply ? `<div class="feedback-reply"><strong>운영자 답변</strong> ${cloudToolsEscape(row.reply)}</div>` : '') + '</div>').join('');
    return `<section><h3>내가 보낸 글</h3><div class="feedback-list">${items}</div></section>`;
}

/** 운영 창의 문의 목록(admin_get_feedback). 상태 필터는 adminFeedbackFilter에 남아 저장 뒤에도 같은 목록을 다시 보인다. */
async function loadAdminFeedback() {
    let box = document.getElementById('admin-feedback');
    if (!box) return;
    try {
        let rows = await cloudJsonRequest('/rest/v1/rpc/admin_get_feedback', { method: 'POST', body: { p_status: adminFeedbackFilter || null } });
        box.innerHTML = renderAdminFeedback(Array.isArray(rows) ? rows : []);
    } catch (error) {
        box.innerHTML = renderSectionError('문의와 제보', error);
    }
}

/** 새 RPC가 아직 서버에 없을 때(묶음 SQL 미실행)와 그 밖의 오류를 가른다. sqlFile은 그 절을 만드는 묶음 파일. */
function renderSectionError(title, error, sqlFile = 'db/feedback-and-admin-players-20261027.sql') {
    let text = String((error && error.message) || error);
    return /schema cache|could not find|does not exist/i.test(text)
        ? `<section><h3>${title}</h3><p class="cloud-tools-note">Supabase에서 ${sqlFile}을 실행하면 보입니다.</p></section>`
        : `<section><h3>${title}</h3><p class="cloud-tools-error">불러올 수 없습니다: ${cloudToolsEscape(text)}</p></section>`;
}

function renderAdminFeedback(rows) {
    let filters = [['all', '전체'], ['new', '새 글'], ['seen', '확인함'], ['done', '처리함']].map(([value, label]) =>
        `<button type="button" data-feedback-filter="${value}"${(value === 'all' ? '' : value) === adminFeedbackFilter ? ' disabled' : ''}>${label}</button>`).join('');
    let html = '<section><h3>문의와 제보</h3><p class="cloud-tools-note">플레이어가 설정 > 문의와 제보에서 보낸 글입니다. 답변을 적어 저장하면 플레이어가 같은 창에서 보고, 새 글은 확인함이 됩니다.</p>'
        + `<div class="ops-summary">${filters}</div></section>`;
    return html + renderOpsTable('글, 최근 300건', [
        { label: '시각', render: row => cloudToolsTime(row.created_at) },
        { label: '종류', render: row => FEEDBACK_KIND_LABELS[row.kind] || row.kind },
        { label: '보낸 사람', html: row => `${cloudToolsEscape(row.nickname || String(row.user_id || '').slice(0, 8))}<br><small>${cloudToolsEscape(row.email || '')}</small>` + playerDetailButton(row.user_id, row.nickname) },
        { label: '내용', html: row => `<div class="feedback-cell">${cloudToolsEscape(row.body)}</div>` + (row.contact ? `<small>연락처: ${cloudToolsEscape(row.contact)}</small>` : '') },
        { label: '상황', render: row => feedbackContextSummary(row) },
        { label: '상태', render: row => FEEDBACK_STATUS_LABELS[row.status] || row.status },
        { label: '조치', html: row => renderFeedbackActions(row) }
    ], rows);
}

function feedbackContextSummary(row) {
    let context = row.context || {};
    return [row.app_version, context.zoneId, context.loop ? `루프 ${context.loop}` : '', context.ascendClass, context.platform, context.screen].filter(Boolean).join(' ');
}

function renderFeedbackActions(row) {
    let id = cloudToolsEscape(row.id);
    let statusButtons = Object.entries(FEEDBACK_STATUS_LABELS).filter(([value]) => value !== row.status)
        .map(([value, label]) => `<button type="button" data-feedback-status="${id}" data-status="${value}">${label}</button>`).join('');
    return `<div class="feedback-actions"><div>${statusButtons}</div><textarea id="feedback-reply-${id}" rows="2" maxlength="2000" placeholder="답변">${cloudToolsEscape(row.reply || '')}</textarea>`
        + `<button type="button" data-feedback-reply="${id}" data-status-now="${cloudToolsEscape(row.status)}">답변 저장</button></div>`;
}

function setAdminFeedbackFilter(button) {
    adminFeedbackFilter = button.dataset.feedbackFilter === 'all' ? '' : button.dataset.feedbackFilter;
    return loadAdminFeedback();
}

function setFeedbackStatus(button) {
    return updateFeedback({ p_id: Number(button.dataset.feedbackStatus), p_status: button.dataset.status });
}

/** 답변 저장. 새 글이었으면 확인함으로 넘긴다(답변을 봤다는 뜻). */
function replyFeedback(button) {
    let id = Number(button.dataset.feedbackReply);
    let reply = document.getElementById(`feedback-reply-${id}`).value.trim();
    return updateFeedback({ p_id: id, p_reply: reply, p_status: button.dataset.statusNow === 'new' ? 'seen' : null });
}

async function updateFeedback(body) {
    try {
        await cloudJsonRequest('/rest/v1/rpc/admin_set_feedback', { method: 'POST', body });
        showGameToast('저장했습니다.', 'success');
    } catch (error) {
        showGameToast(`저장하지 못했습니다: ${error.message || error}`, 'danger');
    }
    await loadAdminFeedback();
}

// ---------------------------------------------------------------------------
// 플레이어 찾기와 자세히 보기 (admin_search_players, admin_get_player, admin_get_player_save)
// ---------------------------------------------------------------------------
function renderPlayerLookupShell() {
    return '<section><h3>플레이어</h3><p class="cloud-tools-note">닉네임, 이메일, 계정 id 앞부분으로 찾습니다. 비워 두면 최근 활동순 50명입니다.</p>'
        + '<div class="ops-summary"><input id="player-query" type="text" maxlength="80" placeholder="닉네임, 이메일, id"><button type="button" data-player-search="1">찾기</button></div></section>'
        + '<div id="player-results"></div><div id="player-detail"></div>';
}

async function searchPlayers() {
    let box = document.getElementById('player-results');
    if (!box) return;
    let input = document.getElementById('player-query');
    box.innerHTML = '<p class="cloud-tools-empty">찾는 중…</p>';
    try {
        let rows = await cloudJsonRequest('/rest/v1/rpc/admin_search_players', { method: 'POST', body: { p_query: input ? input.value.trim() : '', p_limit: 50 } });
        box.innerHTML = renderPlayerRows(Array.isArray(rows) ? rows : []);
    } catch (error) {
        box.innerHTML = renderSectionError('플레이어', error);
    }
}

function renderPlayerRows(rows) {
    return renderOpsTable(`플레이어 ${rows.length}명`, [
        { label: '닉네임', html: row => `${cloudToolsEscape(row.nickname || '(프로필 없음)')}<br><small>${cloudToolsEscape(row.email || '')}</small>` },
        { label: '레벨', render: row => `${row.level || '-'}, 루프 ${row.loop || '-'}` },
        { label: '전투력', render: row => cloudToolsNumber(row.power) },
        { label: '마지막 활동', render: row => cloudToolsTime(row.last_active) },
        { label: '저장', render: row => row.save_revision == null ? '없음' : `r${row.save_revision}, 압축 ${Math.round((row.save_bytes || 0) / 1024)}KB` },
        { label: '고스트', render: row => row.ghost_rating == null ? '' : `${row.ghost_rating}${row.ghost_active ? '' : ' (꺼짐)'}` },
        { label: '전당', render: row => row.hall_honor == null ? '' : `명예 ${cloudToolsNumber(row.hall_honor)}, 전시 ${row.hall_open || 0}` },
        { label: '상태', render: row => playerStatusText(row) },
        { label: '조치', html: row => playerDetailButton(row.user_id, row.nickname) + renderCheatHoldButton(row.user_id, row.held, '') + peekButton(row.user_id, row.nickname) }
    ], rows);
}

function playerStatusText(row) {
    let parts = [];
    if (row.held) parts.push('보류');
    if (row.muted_until) parts.push(`채팅 금지 ${cloudToolsTime(row.muted_until)}까지`);
    if (Number(row.flag_count)) parts.push(`기록 ${row.flag_count}`);
    if (Number(row.report_count)) parts.push(`신고 ${row.report_count}`);
    if (Number(row.feedback_count)) parts.push(`문의 ${row.feedback_count}`);
    return parts.join(', ');
}

function playerDetailButton(userId, name) {
    return `<button type="button" data-player-detail="${cloudToolsEscape(userId)}" data-player-name="${cloudToolsEscape(name || '')}">자세히</button>`;
}

async function openPlayerDetail(button) {
    let box = document.getElementById('player-detail');
    if (!box) return;
    playerDetailUserId = button.dataset.playerDetail;
    box.innerHTML = '<section><h3>자세히</h3><p class="cloud-tools-empty">불러오는 중…</p></section>';
    try {
        let data = await cloudJsonRequest('/rest/v1/rpc/admin_get_player', { method: 'POST', body: { p_user_id: button.dataset.playerDetail } });
        box.innerHTML = renderPlayerDetail(data || {});
        box.scrollIntoView({ block: 'start' });
    } catch (error) {
        box.innerHTML = `<section><h3>자세히</h3><p class="cloud-tools-error">불러올 수 없습니다: ${cloudToolsEscape(error.message || error)}</p></section>`;
    }
}

function renderPlayerDetail(data) {
    let account = data.account || {};
    let name = account.nickname || String(account.user_id || '').slice(0, 8);
    let muted = !!(data.mute && new Date(data.mute.until_at).getTime() > Date.now());
    let actions = renderCheatHoldButton(account.user_id, !!data.hold, data.hold ? data.hold.note : '')
        + renderMuteButtons(account.user_id, name, muted) + peekButton(account.user_id, name)
        + `<button type="button" data-player-save="${cloudToolsEscape(account.user_id)}" data-player-name="${cloudToolsEscape(name)}">저장 JSON 내려받기</button>`;
    let facts = [...accountFacts(data), ...saveFacts(data), ...standingFacts(data)].map(([label, value]) => `<div><dt>${label}</dt><dd>${cloudToolsEscape(value)}</dd></div>`).join('');
    return `<section><h3>자세히: ${cloudToolsEscape(name)}</h3><div class="ops-summary">${actions}</div><dl class="player-facts">${facts}</dl></section>`
        + renderPlayerTables(data)
        + `<section><h3>공개 프로필 JSON</h3><details><summary>펼치기</summary><pre class="player-json">${cloudToolsEscape(JSON.stringify(data.profile || {}, null, 2))}</pre></details></section>`;
}

function accountFacts(data) {
    let account = data.account || {}, profile = data.profile || {};
    return [
        ['계정', `${account.email || ''} ${account.user_id || ''}`],
        ['가입', cloudToolsTime(account.joined_at)],
        ['마지막 로그인', cloudToolsTime(account.last_sign_in_at)],
        ['마지막 접속', cloudToolsTime(account.last_seen)],
        ['로그인 방식', Array.isArray(account.providers) ? account.providers.join(', ') : ''],
        ['닉네임 바꾼 때', cloudToolsTime(account.nickname_updated_at)],
        ['캐릭터', `${profile.className || profile.heroClassName || ''} 레벨 ${profile.level || '-'}, 루프 ${profile.loop || '-'}, 전투력 ${cloudToolsNumber(profile.power)}`]
    ];
}

function saveFacts(data) {
    let save = data.save;
    return [
        ['저장', save ? `r${save.revision}, ${Math.round((save.bytes || 0) / 1024)}KB, ${cloudToolsTime(save.updated_at)}, 이력 ${data.saveVersions || 0}개` : '없음'],
        ['저장 요약', save && save.digest ? saveDigestText(save.digest) : '']
    ];
}

function standingFacts(data) {
    let ghost = data.ghost;
    return [
        ['고스트', ghost ? `점수 ${ghost.rating}, DPS ${cloudToolsNumber(ghost.dps)}, ${ghost.wins}승 ${ghost.losses}패 ${ghost.draws}무${ghost.active ? '' : ', 꺼짐'}` : '없음'],
        ['전당', data.hall ? `명예 ${cloudToolsNumber(data.hall.honor)}, 나눠 준 복제품 ${data.hall.copies_shared}` : '없음'],
        ['보류', data.hold ? `${cloudToolsTime(data.hold.created_at)} ${data.hold.note || ''}` : '없음'],
        ['채팅 금지', data.mute ? `${cloudToolsTime(data.mute.until_at)}까지 ${data.mute.note || ''}` : '없음']
    ];
}

/** cheat_save_digest의 네 칸(level, season, currencies, saveMeta)을 한 줄로. */
function saveDigestText(digest) {
    let currencies = digest.currencies && typeof digest.currencies === 'object' ? Object.keys(digest.currencies).length : 0;
    let modified = digest.saveMeta && digest.saveMeta.lastModifiedAt ? cloudToolsTime(digest.saveMeta.lastModifiedAt) : '';
    return `레벨 ${digest.level == null ? '-' : digest.level}, 루프 ${digest.season == null ? '-' : digest.season}, 재화 ${currencies}종${modified ? `, 기기 저장 ${modified}` : ''}`;
}

function renderPlayerTables(data) {
    return renderOpsTable('감시 기록', [
            { label: '종류', key: 'kind' }, { label: '날짜', key: 'seen_on' }, { label: '횟수', key: 'hits' },
            { label: '마지막', render: row => cloudToolsTime(row.last_at) }, { label: '내용', render: row => JSON.stringify(row.detail || {}).slice(0, 120) }
        ], Array.isArray(data.flags) ? data.flags : [])
        + renderOpsTable('받은 신고', [
            { label: '시각', render: row => cloudToolsTime(row.created_at) }, { label: '사유', key: 'reason' }, { label: '채팅', render: row => row.body || '' }
        ], Array.isArray(data.reports) ? data.reports : [])
        + renderOpsTable('최근 채팅', [
            { label: '시각', render: row => cloudToolsTime(row.created_at) }, { label: '내용', key: 'body' }
        ], Array.isArray(data.chat) ? data.chat : [])
        + renderOpsTable('전당 전시', [
            { label: '시각', render: row => cloudToolsTime(row.created_at) }, { label: '이름', render: row => row.name || '' },
            { label: '점수', render: row => cloudToolsNumber(row.item_score) }, { label: '상태', key: 'status' }
        ], Array.isArray(data.listings) ? data.listings : [])
        + renderOpsTable('보낸 문의', [
            { label: '시각', render: row => cloudToolsTime(row.created_at) }, { label: '종류', render: row => FEEDBACK_KIND_LABELS[row.kind] || row.kind },
            { label: '내용', key: 'body' }, { label: '상태', render: row => FEEDBACK_STATUS_LABELS[row.status] || row.status }
        ], Array.isArray(data.feedback) ? data.feedback : []);
}

/** 보류, 금지, 기록 지우기 뒤: 플레이어 표가 있으면 다시 찾고, 자세히 보기가 열려 있으면 다시 불러온다. */
async function refreshPlayerViews() {
    if (document.getElementById('player-results')) await searchPlayers();
    if (playerDetailUserId && document.getElementById('player-detail')) await openPlayerDetail({ dataset: { playerDetail: playerDetailUserId } });
}

/** 저장 JSON 전체를 파일로 내려받는다(버그 재현용). */
async function downloadPlayerSave(button) {
    try {
        let data = await cloudJsonRequest('/rest/v1/rpc/admin_get_player_save', { method: 'POST', body: { p_user_id: button.dataset.playerSave } });
        let link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
        link.download = `rignin-save-${String(button.dataset.playerName || button.dataset.playerSave).replace(/[^\w가-힣-]+/g, '_')}-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        showGameToast('저장 파일을 내려받았습니다.', 'success');
    } catch (error) {
        showGameToast(`저장을 받지 못했습니다: ${error.message || error}`, 'danger');
    }
}

function injectCloudToolsStyles() {
    if (document.getElementById('cloud-tools-styles')) return;
    let style = document.createElement('style');
    style.id = 'cloud-tools-styles';
    // 레이어 안에 둔다(레이어 밖 CSS는 스킨 규칙을 모두 이긴다).
    style.textContent = `@layer components{.cloud-tools-dialog{width:min(980px,calc(94vw / var(--scale-display-factor, 1)));max-height:calc(88vh / var(--scale-display-factor, 1));padding:0;border:1px solid #445b78;border-radius:12px;background:#0d1623;color:#eef6ff}.cloud-tools-dialog::backdrop{background:rgba(0,0,0,.72)}.cloud-tools-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#142238;border-bottom:1px solid #304765}.cloud-tools-head button{margin:0}.cloud-tools-body{padding:14px;overflow:auto}.cloud-history-list{display:grid;gap:7px}.cloud-history-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px;border:1px solid #2b405d;border-radius:8px;background:#111e30}.cloud-history-row small{display:block;color:#9eb0c8;margin-top:3px}.cloud-current-badge{color:#8be5aa;font-weight:700}.cloud-tools-note,.cloud-tools-empty{color:#a9b8cc}.cloud-tools-error{color:#ff9b9b}.ops-summary{display:flex;gap:8px;flex-wrap:wrap}.ops-summary span{padding:8px 12px;border:1px solid #304765;border-radius:8px;background:#142238}.cloud-tools-body section{margin-top:18px}.cloud-tools-table-wrap{overflow:auto}.cloud-tools-table-wrap table{width:100%;border-collapse:collapse;font-size:12px}.cloud-tools-table-wrap th,.cloud-tools-table-wrap td{padding:7px;border-bottom:1px solid #263a54;text-align:left;white-space:nowrap}.feedback-form{display:grid;gap:8px}.feedback-form textarea,.feedback-form input,.feedback-form select,.feedback-actions textarea,#player-query{box-sizing:border-box;background:#111e30;color:#eef6ff;border:1px solid #2b405d;border-radius:6px;padding:6px;font:inherit}.feedback-form textarea,.feedback-form input,.feedback-form select,.feedback-actions textarea{width:100%}#player-query{flex:1;min-width:200px}.feedback-list{display:grid;gap:8px}.feedback-item{padding:10px;border:1px solid #2b405d;border-radius:8px;background:#111e30}.feedback-meta{display:flex;flex-wrap:wrap;gap:10px;color:#9eb0c8;font-size:12px}.feedback-body{white-space:pre-wrap;margin-top:4px}.feedback-reply{margin-top:6px;padding:6px 8px;border-left:3px solid #8be5aa;white-space:pre-wrap}.feedback-cell{white-space:normal;min-width:220px;max-width:380px}.feedback-actions{display:grid;gap:4px;min-width:220px}.player-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:4px 16px;margin:8px 0}.player-facts dt{color:#9eb0c8;font-size:12px}.player-facts dd{margin:0;overflow-wrap:anywhere}.player-json{max-height:320px;overflow:auto;font-size:11px;white-space:pre-wrap}.ops-nav{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 4px;position:sticky;top:46px;z-index:1;padding:6px 0;background:#0d1623}.ops-nav button{margin:0}.ops-section{margin-top:10px;border:1px solid #2b405d;border-radius:8px;background:#0f1a2b}.ops-section>summary{display:flex;align-items:baseline;gap:10px;padding:10px 14px;cursor:pointer;list-style:none}.ops-section>summary::-webkit-details-marker{display:none}.ops-section>summary::before{content:"▸";color:#9eb0c8}.ops-section[open]>summary::before{content:"▾"}.ops-section>summary small{color:#9eb0c8}.ops-section-body{padding:0 14px 12px}.ops-section-body section:first-child{margin-top:4px}.ops-todo-strip h3,.ops-kpi-row+h3{margin-top:0}.ops-todo-row{display:flex;flex-wrap:wrap;gap:8px}.ops-todo{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:112px;padding:8px 12px;border:1px solid #304765;border-radius:8px;background:#142238;color:#eef6ff;text-align:left}.ops-todo strong{font-size:20px;color:#ffd27a}.ops-todo.is-zero{opacity:.55}.ops-todo.is-zero strong{color:#9eb0c8}.ops-kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px}.ops-kpi{padding:10px 12px;border:1px solid #304765;border-radius:8px;background:#142238}.ops-kpi h4{margin:0 0 6px;color:#ffd27a;font-size:13px}.ops-kpi dl{margin:0;display:grid;gap:3px}.ops-kpi dl div{display:flex;justify-content:space-between;gap:8px;font-size:12px}.ops-kpi dt{color:#9eb0c8}.ops-kpi dd{margin:0;text-align:right}.ops-kpi dd small{color:#9eb0c8}}`;
    document.head.appendChild(style);
}

function initializeCloudTools() {
    injectCloudToolsStyles();
    let saveButton = document.querySelector('.cfg-btn--save');
    if (saveButton) saveButton.addEventListener('click', () => {
        try {
            let saved = saveGame({ manual: true });
            let message = saved ? '이 기기에 진행을 저장했습니다.' : (getLocalSaveStatus().message
                || '진행 정산 또는 저장 복구를 마친 뒤 다시 눌러 주세요.');
            showGameToast(message, { tone: saved ? 'success' : 'warning', duration: saved ? 2400 : 6000 });
        } catch (error) {
            console.error('[save-ui] 수동 저장 실패:', error);
            showGameToast('저장에 실패했습니다. 게임을 닫지 말고 다시 시도해 주세요.', { tone: 'danger', duration: 6000 });
        }
    });
    let adminButton = document.getElementById('btn-ops-dashboard');
    if (adminButton && new URLSearchParams(location.search).get('admin') === '1') adminButton.hidden = false;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeCloudTools);
else initializeCloudTools();

safeExposeGlobals({ openCloudSaveHistory, restoreCloudSaveVersion, openOpsDashboard, closeCloudToolsDialog, reportCurrentProfile, openFeedbackDialog,
    openAccountDeletionRequest });
