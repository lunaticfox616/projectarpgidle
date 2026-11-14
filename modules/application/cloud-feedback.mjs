import { FEEDBACK_ERROR_TEXTS } from '../data/cloud-tools.mjs';
export class CloudFeedback {
    constructor(deps, links, state) {
        this.deps = deps; this.links = links; this.state = state;
        this.adminListVersion = 0;
    }

    /** 설정 > 문의와 제보의 단추. 보내는 칸과 내가 보낸 글(운영자 답변 포함)을 한 창에 보인다. 로그인한 계정만 보낼 수 있다. */
    async openFeedbackDialog() {
        if (!this.state.active) return;
        this.links.dialog.openCloudToolsDialog('문의와 제보', this.links.feedbackView.renderFeedbackForm());
        if (this.deps.cloudState && this.deps.cloudState.user) await this.loadMyFeedback();
    }

    /** 상황 정보: 오류 보고와 같은 묶음(js/playtest-telemetry.js getClientDiagnosticContext)에 화면 크기와 브라우저를 더한다. */
    feedbackContext() {
        let context = typeof this.deps.getClientDiagnosticContext === 'function' ? (0, this.deps.getClientDiagnosticContext)() : {};
        return Object.assign({}, context, { screen: `${this.deps.window.innerWidth}x${this.deps.window.innerHeight}`, userAgent: String(this.deps.navigator.userAgent || '').slice(0, 200) });
    }

    async submitPlayerFeedback(button) {
        if (!this.state.active) return;
        const accountContext = this.links.session.capture();
        const input = this.deps.document.getElementById('feedback-body');
        let body = input.value.trim();
        if (body.length < 5) return (0, this.deps.showGameToast)((0, this.deps._t)('내용을 5자 이상 적어 주세요.'), 'warning');
        button.disabled = true;
        try {
            await this.links.session.request(accountContext, '/rest/v1/rpc/submit_player_feedback', { method: 'POST', body: {
                p_kind: this.deps.document.getElementById('feedback-kind').value, p_body: body,
                p_contact: this.deps.document.getElementById('feedback-contact').value.trim(), p_context: this.feedbackContext(),
                p_app_version: typeof this.deps.getPlaytestBuildVersion === 'function' ? (0, this.deps.getPlaytestBuildVersion)() : ''
            } });
            this.clearSubmittedDraft(input, body);
            (0, this.deps.showGameToast)((0, this.deps._t)('보냈습니다. 답변은 이 창에서 볼 수 있습니다.'), 'success');
            await this.loadMyFeedback();
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            (0, this.deps.showGameToast)(this.describeFeedbackError(error), 'danger');
        } finally {
            button.disabled = false;
        }
    }

    clearSubmittedDraft(input, body) {
        if (input === this.deps.document.getElementById('feedback-body') && input.value.trim() === body) input.value = '';
    }

    describeFeedbackError(error) {
        let message = String((error && error.message) || error);
        let known = FEEDBACK_ERROR_TEXTS.find(([pattern]) => pattern.test(message));
        return known ? known[1] : `보내지 못했습니다: ${message}`;
    }

    async loadMyFeedback() {
        const accountContext = this.links.session.capture();
        let box = this.deps.document.getElementById('my-feedback');
        if (!box) return;
        try {
            let rows = await this.links.session.request(accountContext, '/rest/v1/rpc/get_my_feedback', { method: 'POST', body: {} });
            box.innerHTML = this.links.feedbackView.renderMyFeedback(Array.isArray(rows) ? rows : []);
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            box.innerHTML = `<section><h3>내가 보낸 글</h3><p class="cloud-tools-error">불러올 수 없습니다: ${this.links.format.cloudToolsEscape(error.message || error)}</p></section>`;
        }
    }

    /** 운영 창의 문의 목록(admin_get_feedback). 상태 필터는 adminFeedbackFilter에 남아 저장 뒤에도 같은 목록을 다시 보인다. */
    async loadAdminFeedback() {
        const version = ++this.adminListVersion;
        const accountContext = this.links.session.capture();
        let box = this.deps.document.getElementById('admin-feedback');
        if (!box) return;
        try {
            let rows = await this.links.session.request(accountContext, '/rest/v1/rpc/admin_get_feedback', { method: 'POST', body: { p_status: this.state.adminFeedbackFilter || null } });
            if (version !== this.adminListVersion) return;
            box.innerHTML = this.links.feedbackView.renderAdminFeedback(Array.isArray(rows) ? rows : []);
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            if (version !== this.adminListVersion) return;
            box.innerHTML = this.links.format.renderSectionError('문의와 제보', error);
        }
    }

    setAdminFeedbackFilter(button) {
        if (!this.state.active) return;
        this.state.adminFeedbackFilter = button.dataset.feedbackFilter === 'all' ? '' : button.dataset.feedbackFilter;
        return this.loadAdminFeedback();
    }

    setFeedbackStatus(button) {
        if (!this.state.active) return;
        return this.updateFeedback({ p_id: Number(button.dataset.feedbackStatus), p_status: button.dataset.status });
    }

    /** 답변 저장. 새 글이었으면 확인함으로 넘긴다(답변을 봤다는 뜻). */
    replyFeedback(button) {
        if (!this.state.active) return;
        let id = Number(button.dataset.feedbackReply);
        let reply = this.deps.document.getElementById(`feedback-reply-${id}`).value.trim();
        return this.updateFeedback({ p_id: id, p_reply: reply, p_status: button.dataset.statusNow === 'new' ? 'seen' : null });
    }

    async updateFeedback(body) {
        const accountContext = this.links.session.capture();
        try {
            await this.links.session.request(accountContext, '/rest/v1/rpc/admin_set_feedback', { method: 'POST', body });
            (0, this.deps.showGameToast)((0, this.deps._t)('저장했습니다.'), 'success');
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            (0, this.deps.showGameToast)((0, this.deps._t)('저장하지 못했습니다: {value}', { value: error.message || error }), 'danger');
        }
        await this.loadAdminFeedback();
    }
}
