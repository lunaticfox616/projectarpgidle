import { FEEDBACK_KIND_LABELS, FEEDBACK_STATUS_LABELS } from '../data/cloud-tools.mjs';
export class CloudFeedbackView {
    constructor(deps, links, state) { this.deps = deps; this.links = links; this.state = state; }

    renderFeedbackForm() {
        if (!this.deps.cloudState || !this.deps.cloudState.user) {
            return '<section><p class="cloud-tools-note">로그인한 계정으로만 보낼 수 있습니다. 설정의 클라우드 세이브에서 로그인한 뒤 다시 열어 주세요.</p></section>';
        }
        let kinds = Object.entries(FEEDBACK_KIND_LABELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
        return '<section><p class="cloud-tools-note">게임 버전, 현재 지역과 루프, 직업, 기기 종류가 함께 갑니다. 답변은 이 창에서 봅니다.</p>'
            + `<div class="feedback-form"><select id="feedback-kind">${kinds}</select>`
            + '<textarea id="feedback-body" rows="6" maxlength="2000" placeholder="무슨 일이 있었는지, 어디서, 어떤 순서로 눌렀는지 적어 주세요."></textarea>'
            + '<input id="feedback-contact" type="text" maxlength="120" placeholder="연락처(선택): 이메일이나 디스코드 이름">'
            + '<button type="button" data-feedback-send="1">보내기</button></div></section><div id="my-feedback"></div>';
    }

    renderMyFeedback(rows) {
        if (!rows.length) return '<section><h3>내가 보낸 글</h3><p class="cloud-tools-empty">아직 없습니다.</p></section>';
        let items = rows.map(row => `<div class="feedback-item"><div class="feedback-meta"><span>${this.links.format.cloudToolsEscape(FEEDBACK_KIND_LABELS[row.kind] || row.kind)}</span>`
            + `<span>${this.links.format.cloudToolsTime(row.created_at)}</span><span>${this.links.format.cloudToolsEscape(FEEDBACK_STATUS_LABELS[row.status] || row.status)}</span></div>`
            + `<div class="feedback-body">${this.links.format.cloudToolsEscape(row.body)}</div>`
            + (row.reply ? `<div class="feedback-reply"><strong>운영자 답변</strong> ${this.links.format.cloudToolsEscape(row.reply)}</div>` : '') + '</div>').join('');
        return `<section><h3>내가 보낸 글</h3><div class="feedback-list">${items}</div></section>`;
    }

    renderAdminFeedback(rows) {
        let filters = [['all', '전체'], ['new', '새 글'], ['seen', '확인함'], ['done', '처리함']].map(([value, label]) =>
            `<button type="button" data-feedback-filter="${value}"${(value === 'all' ? '' : value) === this.state.adminFeedbackFilter ? ' disabled' : ''}>${label}</button>`).join('');
        let html = '<section><h3>문의와 제보</h3><p class="cloud-tools-note">플레이어가 설정 > 문의와 제보에서 보낸 글입니다. 답변을 적어 저장하면 플레이어가 같은 창에서 보고, 새 글은 확인함이 됩니다.</p>'
            + `<div class="ops-summary">${filters}</div></section>`;
        return html + this.links.format.renderOpsTable('글, 최근 300건', [
            { label: '시각', render: row => this.links.format.cloudToolsTime(row.created_at) },
            { label: '종류', render: row => FEEDBACK_KIND_LABELS[row.kind] || row.kind },
            { label: '보낸 사람', html: row => `${this.links.format.cloudToolsEscape(row.nickname || String(row.user_id || '').slice(0, 8))}<br><small>${this.links.format.cloudToolsEscape(row.email || '')}</small>` + this.links.format.playerDetailButton(row.user_id, row.nickname) },
            { label: '내용', html: row => `<div class="feedback-cell">${this.links.format.cloudToolsEscape(row.body)}</div>` + (row.contact ? `<small>연락처: ${this.links.format.cloudToolsEscape(row.contact)}</small>` : '') },
            { label: '상황', render: row => this.feedbackContextSummary(row) },
            { label: '상태', render: row => FEEDBACK_STATUS_LABELS[row.status] || row.status },
            { label: '조치', html: row => this.renderFeedbackActions(row) }
        ], rows);
    }

    feedbackContextSummary(row) {
        let context = row.context || {};
        return [row.app_version, context.zoneId, context.loop ? `루프 ${context.loop}` : '', context.ascendClass, context.platform, context.screen].filter(Boolean).join(' ');
    }

    renderFeedbackActions(row) {
        let id = this.links.format.cloudToolsEscape(row.id);
        let statusButtons = Object.entries(FEEDBACK_STATUS_LABELS).filter(([value]) => value !== row.status)
            .map(([value, label]) => `<button type="button" data-feedback-status="${id}" data-status="${value}">${label}</button>`).join('');
        return `<div class="feedback-actions"><div>${statusButtons}</div><textarea id="feedback-reply-${id}" rows="2" maxlength="2000" placeholder="답변">${this.links.format.cloudToolsEscape(row.reply || '')}</textarea>`
            + `<button type="button" data-feedback-reply="${id}" data-status-now="${this.links.format.cloudToolsEscape(row.status)}">답변 저장</button></div>`;
    }
}
