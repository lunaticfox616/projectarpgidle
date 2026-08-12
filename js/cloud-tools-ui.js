// 클라우드 저장 복구와 운영 통계 UI. 데이터 접근 권한은 Supabase RPC가 최종 판정한다.

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
        return `<div class="cloud-history-row"><div><strong>리비전 ${cloudToolsNumber(row.revision)}</strong><small>루프 ${cloudToolsNumber(row.loop_number)} · ${cloudToolsEscape(time)}</small></div>${action}</div>`;
    }).join('')}</div><p class="cloud-tools-note">정상적으로 완료된 클라우드 저장의 이전 버전만 최대 5개 보관합니다.</p>`;
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

function renderOpsTable(title, columns, rows) {
    if (!rows.length) return `<section><h3>${title}</h3><p class="cloud-tools-empty">표본 없음</p></section>`;
    let head = columns.map(column => `<th>${cloudToolsEscape(column.label)}</th>`).join('');
    let body = rows.map(row => `<tr>${columns.map(column => `<td>${cloudToolsEscape(column.render ? column.render(row) : row[column.key])}</td>`).join('')}</tr>`).join('');
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
    html += renderOpsTable('직업·스킬 통계', [
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

async function openOpsDashboard() {
    if (!cloudState || !cloudState.user) return showGameToast('관리자 로그인이 필요합니다.', 'warning');
    openCloudToolsDialog('운영 통계 · 최근 30일', '<p class="cloud-tools-empty">집계 중…</p>');
    try {
        let data = await cloudJsonRequest('/rest/v1/rpc/admin_get_ops_dashboard', { method: 'POST', body: {} });
        document.getElementById('cloud-tools-body').innerHTML = renderOpsDashboard(data || {});
    } catch (error) {
        document.getElementById('cloud-tools-body').innerHTML = `<p class="cloud-tools-error">관리자 통계를 불러올 수 없습니다: ${cloudToolsEscape(error.message || error)}</p>`;
    }
}

function injectCloudToolsStyles() {
    if (document.getElementById('cloud-tools-styles')) return;
    let style = document.createElement('style');
    style.id = 'cloud-tools-styles';
    style.textContent = `.cloud-tools-dialog{width:min(980px,94vw);max-height:88vh;padding:0;border:1px solid #445b78;border-radius:12px;background:#0d1623;color:#eef6ff}.cloud-tools-dialog::backdrop{background:rgba(0,0,0,.72)}.cloud-tools-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#142238;border-bottom:1px solid #304765}.cloud-tools-head button{margin:0}.cloud-tools-body{padding:14px;overflow:auto}.cloud-history-list{display:grid;gap:7px}.cloud-history-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px;border:1px solid #2b405d;border-radius:8px;background:#111e30}.cloud-history-row small{display:block;color:#9eb0c8;margin-top:3px}.cloud-current-badge{color:#8be5aa;font-weight:700}.cloud-tools-note,.cloud-tools-empty{color:#a9b8cc}.cloud-tools-error{color:#ff9b9b}.ops-summary{display:flex;gap:8px;flex-wrap:wrap}.ops-summary span{padding:8px 12px;border:1px solid #304765;border-radius:8px;background:#142238}.cloud-tools-body section{margin-top:18px}.cloud-tools-table-wrap{overflow:auto}.cloud-tools-table-wrap table{width:100%;border-collapse:collapse;font-size:.82em}.cloud-tools-table-wrap th,.cloud-tools-table-wrap td{padding:7px;border-bottom:1px solid #263a54;text-align:left;white-space:nowrap}`;
    document.head.appendChild(style);
}

function initializeCloudTools() {
    injectCloudToolsStyles();
    let adminButton = document.getElementById('btn-ops-dashboard');
    if (adminButton && new URLSearchParams(location.search).get('admin') === '1') adminButton.hidden = false;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeCloudTools);
else initializeCloudTools();

safeExposeGlobals({ openCloudSaveHistory, restoreCloudSaveVersion, openOpsDashboard, closeCloudToolsDialog });
