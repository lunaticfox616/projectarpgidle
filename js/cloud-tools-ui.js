// 수동 저장, 클라우드 저장 복구와 운영 통계 UI. 데이터 접근 권한은 Supabase RPC가 최종 판정한다.

function cloudToolsEscape(value) {
    return typeof escapeHTML === 'function' ? escapeHTML(String(value == null ? '' : value)) : String(value == null ? '' : value);
}

function cloudToolsNumber(value) {
    return Math.floor(Number(value) || 0).toLocaleString('ko-KR');
}

function ensureCloudToolsDialog() {
    let dialog = document.getElementById('cloud-tools-dialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'cloud-tools-dialog';
    dialog.className = 'cloud-tools-dialog';
    dialog.innerHTML = `<div class="cloud-tools-head"><strong id="cloud-tools-title"></strong><button type="button" onclick="closeCloudToolsDialog()" aria-label="닫기">✕</button></div><div id="cloud-tools-body" class="cloud-tools-body"></div>`;
    dialog.addEventListener('click', event => {
        let button = event.target.closest('[data-cheat-hold], [data-cheat-clear], [data-chat-mute], [data-chat-delete], [data-term-add], [data-term-remove]');
        if (!button) return;
        if (button.dataset.cheatHold) setCheatHold(button);
        else if (button.dataset.cheatClear) clearCheatFlags(button);
        else if (button.dataset.chatMute) setChatMute(button);
        else if (button.dataset.chatDelete) deleteChatMessage(button);
        else if (button.dataset.termAdd) setBannedTerm(button, false);
        else if (button.dataset.termRemove) setBannedTerm(button, true);
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

/** A titled table. A column shows row[key], or render(row) as text, or html(row) as markup the column escapes itself (buttons). */
function renderOpsTable(title, columns, rows) {
    if (!rows.length) return `<section><h3>${title}</h3><p class="cloud-tools-empty">표본 없음</p></section>`;
    let head = columns.map(column => `<th>${cloudToolsEscape(column.label)}</th>`).join('');
    let cell = (column, row) => column.html ? column.html(row) : cloudToolsEscape(column.render ? column.render(row) : row[column.key]);
    let body = rows.map(row => `<tr>${columns.map(column => `<td>${cell(column, row)}</td>`).join('')}</tr>`).join('');
    return `<section><h3>${title}</h3><div class="cloud-tools-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></section>`;
}

function renderOpsDashboard(data) {
    let overview = data.overview || {};
    let alerts = Array.isArray(data.alerts) ? data.alerts : [];
    let html = `<div class="ops-summary"><span>플레이어 <strong>${cloudToolsNumber(overview.players)}</strong></span><span>전투 <strong>${cloudToolsNumber(overview.runs)}</strong></span><span>오류 <strong>${cloudToolsNumber(overview.errors)}</strong></span></div>`;
    html += renderOpsTable('자동 경고', [
        { key: 'severity', label: '등급' }, { key: 'zone_id', label: '지역' }, { key: 'message', label: '판정' }, { key: 'runs', label: '표본' }
    ], alerts);
    html += renderOpsTable('지역 통계', [
        { key: 'zone_id', label: '지역' }, { key: 'content_stage', label: '단계' }, { key: 'runs', label: '전투' }, { key: 'clear_rate_pct', label: '클리어율', render: row => `${row.clear_rate_pct || 0}%` },
        { key: 'median_dps', label: 'DPS', render: row => cloudToolsNumber(row.median_dps) }, { key: 'median_ehp', label: 'EHP', render: row => cloudToolsNumber(row.median_ehp) },
        { key: 'p95_frame_ms', label: 'p95', render: row => `${row.p95_frame_ms || 0}ms` }, { key: 'peak_fx', label: '최대 FX' }
    ], Array.isArray(data.zones) ? data.zones : []);
    html += renderOpsTable('직업/스킬 통계', [
        { key: 'ascend_class', label: '직업' }, { key: 'active_skill', label: '스킬' }, { key: 'runs', label: '전투' },
        { key: 'clear_rate_pct', label: '클리어율', render: row => `${row.clear_rate_pct || 0}%` },
        { key: 'median_dps', label: 'DPS', render: row => cloudToolsNumber(row.median_dps) }, { key: 'median_ehp', label: 'EHP', render: row => cloudToolsNumber(row.median_ehp) }
    ], Array.isArray(data.builds) ? data.builds : []);
    html += renderOpsTable('최근 오류', [
        { key: 'created_at', label: '시각', render: row => new Date(row.created_at).toLocaleString('ko-KR') },
        { key: 'message', label: '오류' }, { key: 'app_version', label: '버전' }
    ], Array.isArray(data.errors) ? data.errors : []);
    return html;
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
        : '이 계정을 보류할까요?\n전당 등록과 구매, 고스트 대결에서 빠집니다.\n열린 전시는 더 팔리지 않습니다.', {
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

/** Chat reports and mutes (db/social.sql admin_get_chat_reports); the dialog's click handler sends the mute and delete buttons. */
function renderChatReports(data) {
    const muteButtons = row => {
        let id = cloudToolsEscape(row.target_user_id || row.user_id), name = cloudToolsEscape(row.nickname || '');
        let muted = row.muted_until || row.until_at;
        return (muted ? `<button type="button" data-chat-mute="${id}" data-chat-minutes="0" data-chat-name="${name}">금지 풀기</button>` : '')
            + `<button type="button" data-chat-mute="${id}" data-chat-minutes="1440" data-chat-name="${name}">1일 금지</button>`
            + `<button type="button" data-chat-mute="${id}" data-chat-minutes="10080" data-chat-name="${name}">7일 금지</button>`;
    };
    let html = '<section><h3>채팅 신고</h3><p class="cloud-tools-note">신고는 플레이어가 프로필 창에서 보냅니다. 금지한 계정은 풀릴 때까지 채팅을 보낼 수 없고, 지운 줄은 다음 전체 조회부터 사라집니다.</p></section>';
    html += renderOpsTable('신고, 최근 200건', [
        { label: '시각', render: row => new Date(row.created_at).toLocaleString('ko-KR') },
        { label: '신고자', render: row => row.reporter_nickname || '' },
        { label: '대상', render: row => row.nickname || String(row.target_user_id || '').slice(0, 8) },
        { label: '24시간 신고', render: row => cloudToolsNumber(row.reports_24h) },
        { key: 'reason', label: '사유' },
        { label: '채팅', render: row => row.body ? (row.body.length > 60 ? `${row.body.slice(0, 60)}…` : row.body) : '' },
        { label: '상태', render: row => row.muted_until ? `금지 중, ${new Date(row.muted_until).toLocaleString('ko-KR')}까지` : (row.message_id && !row.message_exists ? '줄 지워짐' : '') },
        { label: '조치', html: row => muteButtons(row) + (row.message_id && row.message_exists ? `<button type="button" data-chat-delete="${cloudToolsEscape(row.message_id)}">줄 지우기</button>` : '') }
    ], Array.isArray(data.reports) ? data.reports : []);
    html += renderOpsTable('금지 중인 계정', [
        { label: '계정', render: row => row.nickname || String(row.user_id || '').slice(0, 8) },
        { label: '풀리는 시각', render: row => new Date(row.until_at).toLocaleString('ko-KR') }, { key: 'note', label: '메모' },
        { label: '조치', html: row => muteButtons(row) }
    ], Array.isArray(data.mutes) ? data.mutes : []);
    return html + renderBannedTerms(Array.isArray(data.terms) ? data.terms : null);
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

/** Deletes one reported chat row after a confirmation (admin_delete_chat_message), then reloads the reports. */
async function deleteChatMessage(button) {
    let confirmed = await requestGameConfirmation('이 채팅 줄을 지울까요?\n다른 플레이어의 화면에서는 다음 전체 조회부터 사라집니다.', {
        title: '채팅 신고', tone: 'warning', confirmLabel: '지우기'
    });
    if (!confirmed) return;
    try {
        await cloudJsonRequest('/rest/v1/rpc/admin_delete_chat_message', { method: 'POST', body: { p_message_id: Number(button.dataset.chatDelete) } });
        showGameToast('채팅 줄을 지웠습니다.', 'success');
    } catch (error) {
        showGameToast(`줄을 지우지 못했습니다: ${error.message || error}`, 'danger');
    }
    await loadChatReports();
}

async function openOpsDashboard() {
    if (!cloudState || !cloudState.user) return showGameToast('관리자 로그인이 필요합니다.', 'warning');
    openCloudToolsDialog('운영 통계, 최근 30일', '<p class="cloud-tools-empty">집계 중…</p>');
    try {
        let data = await cloudJsonRequest('/rest/v1/rpc/admin_get_ops_dashboard', { method: 'POST', body: {} });
        document.getElementById('cloud-tools-body').innerHTML = renderOpsDashboard(data || {})
            + '<div id="cheat-watch"><section><h3>치트 감시</h3><p class="cloud-tools-empty">불러오는 중…</p></section></div>'
            + '<div id="chat-reports"><section><h3>채팅 신고</h3><p class="cloud-tools-empty">불러오는 중…</p></section></div>';
        await loadCheatWatch();
        await loadChatReports();
    } catch (error) {
        document.getElementById('cloud-tools-body').innerHTML = `<p class="cloud-tools-error">관리자 통계를 불러올 수 없습니다: ${cloudToolsEscape(error.message || error)}</p>`;
    }
}

function injectCloudToolsStyles() {
    if (document.getElementById('cloud-tools-styles')) return;
    let style = document.createElement('style');
    style.id = 'cloud-tools-styles';
    // 레이어 안에 둔다(레이어 밖 CSS는 스킨 규칙을 모두 이긴다).
    style.textContent = `@layer components{.cloud-tools-dialog{width:min(980px,calc(94vw / var(--scale-display-factor, 1)));max-height:calc(88vh / var(--scale-display-factor, 1));padding:0;border:1px solid #445b78;border-radius:12px;background:#0d1623;color:#eef6ff}.cloud-tools-dialog::backdrop{background:rgba(0,0,0,.72)}.cloud-tools-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#142238;border-bottom:1px solid #304765}.cloud-tools-head button{margin:0}.cloud-tools-body{padding:14px;overflow:auto}.cloud-history-list{display:grid;gap:7px}.cloud-history-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px;border:1px solid #2b405d;border-radius:8px;background:#111e30}.cloud-history-row small{display:block;color:#9eb0c8;margin-top:3px}.cloud-current-badge{color:#8be5aa;font-weight:700}.cloud-tools-note,.cloud-tools-empty{color:#a9b8cc}.cloud-tools-error{color:#ff9b9b}.ops-summary{display:flex;gap:8px;flex-wrap:wrap}.ops-summary span{padding:8px 12px;border:1px solid #304765;border-radius:8px;background:#142238}.cloud-tools-body section{margin-top:18px}.cloud-tools-table-wrap{overflow:auto}.cloud-tools-table-wrap table{width:100%;border-collapse:collapse;font-size:12px}.cloud-tools-table-wrap th,.cloud-tools-table-wrap td{padding:7px;border-bottom:1px solid #263a54;text-align:left;white-space:nowrap}}`;
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

safeExposeGlobals({ openCloudSaveHistory, restoreCloudSaveVersion, openOpsDashboard, closeCloudToolsDialog, reportCurrentProfile });
