export class CloudModeration {
    constructor(deps, links, state) { this.deps = deps; this.links = links; this.state = state; }

    /** Fills the watch under the ops tables. Before db/anti-cheat.sql runs, the server has no such function and a note says so. */
    async loadCheatWatch() {
        const accountContext = this.links.session.capture();
        let box = this.deps.document.getElementById('cheat-watch');
        if (!box) return;
        try {
            let data = await this.links.session.request(accountContext, '/rest/v1/rpc/admin_get_cheat_watch', { method: 'POST', body: {} });
            box.innerHTML = this.links.opsView.renderCheatWatch(data || {});
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            let text = String(error && error.message || error);
            box.innerHTML = /schema cache|could not find|does not exist/i.test(text)
                ? '<section><h3>치트 감시</h3><p class="cloud-tools-note">Supabase에서 db/anti-cheat.sql을 실행하면 보입니다.</p></section>'
                : `<section><h3>치트 감시</h3><p class="cloud-tools-error">불러올 수 없습니다: ${this.links.format.cloudToolsEscape(text)}</p></section>`;
        }
    }

    /** Holds or releases one account after a confirmation (db/anti-cheat.sql admin_set_cheat_hold), then reloads the watch. */
    async setCheatHold(button) {
        if (!this.state.active) return;
        const accountContext = this.links.session.capture();
        let held = button.dataset.cheatHeld === '1';
        let confirmed = await (0, this.deps.requestGameConfirmation)(held
            ? '이 계정의 보류를 풀까요?\n다음 고스트 등록부터 다시 순위에 듭니다.\n닫은 전시는 닫힌 채로 둡니다.'
            : '이 계정을 보류할까요?\n전당 등록과 구매, 고스트 대결, 채팅에서 빠집니다.\n열린 전시는 더 팔리지 않습니다.', {
            title: '치트 감시', tone: 'warning', confirmLabel: held ? '보류 풀기' : '보류'
        });
        if (!confirmed) return;
        try {
            await this.links.session.request(accountContext, '/rest/v1/rpc/admin_set_cheat_hold', {
                method: 'POST', body: { p_user_id: button.dataset.cheatHold, p_hold: !held, p_note: button.dataset.cheatNote || '' }
            });
            (0, this.deps.showGameToast)(held ? '보류를 풀었습니다.' : '계정을 보류했습니다.', 'success');
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            (0, this.deps.showGameToast)((0, this.deps._t)('보류를 바꾸지 못했습니다: {value}', { value: error.message || error }), 'danger');
        }
        await this.loadCheatWatch();
    }

    /** The profile window's 신고 button (js/social.js renderProfileActionsRow): the chosen reason and that player's newest chat row
     * held on this device go to the server (report_player_chat, one report per player per day). Lives here because social.js must not
     * reach the cloud through a ui file. */
    async reportCurrentProfile() {
        if (!this.state.active) return;
        const accountContext = this.links.session.capture();
        let target = this.reportTargetUserId();
        if (!target) return;
        let reason = this.reportReasonValue();
        let confirmed = await (0, this.deps.requestGameConfirmation)(`${this.reportTargetName()} 님을 ${reason} 사유로 신고할까요?\n그 사람의 최근 채팅 한 줄이 함께 운영자에게 갑니다.`, {
            title: '신고', tone: 'warning', confirmLabel: '신고'
        });
        if (!confirmed) return;
        try {
            await this.links.session.request(accountContext, '/rest/v1/rpc/report_player_chat', {
                method: 'POST', body: { p_target_user_id: target, p_reason: reason, p_message_id: this.latestChatRowId(target) }
            });
            (0, this.deps.showGameToast)((0, this.deps._t)('신고를 보냈습니다. 운영자가 확인합니다.'), 'success');
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            (0, this.deps.showGameToast)('신고 실패: ' + this.translateReportError(error), 'danger');
        }
    }

    /** The shown profile's player, or null when it is mine or there is no login. */
    reportTargetUserId() {
        let target = this.deps.socialState && this.deps.socialState.currentProfileUserId;
        if (!target || !this.deps.cloudState || !this.deps.cloudState.user || target === this.deps.cloudState.user.id) return null;
        return target;
    }

    reportReasonValue() {
        let reasonEl = this.deps.document.getElementById('social-report-reason');
        return reasonEl ? String(reasonEl.value || '기타') : '기타';
    }

    reportTargetName() {
        return (this.deps.socialState.currentProfile && this.deps.socialState.currentProfile.nickname) || '이 플레이어';
    }

    /** The newest chat row of that player among the rows this device holds, or null. */
    latestChatRowId(userId) {
        let latest = (this.deps.socialState.chatMessages || []).filter(m => m && String(m.user_id) === String(userId))
            .reduce((best, m) => (!best || Number(m.id) > Number(best.id)) ? m : best, null);
        return latest ? Number(latest.id) : null;
    }

    translateReportError(error) {
        let msg = String(error && error.message || error);
        if (/REPORT_ALREADY_SENT/.test(msg)) return '같은 사람은 하루에 한 번만 신고할 수 있습니다.';
        if (/REPORT_DAILY_LIMIT/.test(msg)) return '오늘은 더 신고할 수 없습니다.';
        if (/REPORT_INVALID_TARGET/.test(msg)) return '자기 자신은 신고할 수 없습니다.';
        if (/schema cache|could not find|does not exist/i.test(msg)) return '서버에 신고 기능이 아직 없습니다.';
        return msg;
    }

    /** Clears one account's watch rows of one kind after a confirmation (admin_clear_cheat_flags), then reloads the watch. */
    async clearCheatFlags(button) {
        if (!this.state.active) return;
        const accountContext = this.links.session.capture();
        let confirmed = await (0, this.deps.requestGameConfirmation)('이 계정의 이 종류 감시 기록을 지울까요?\n고스트 기록이면 순위전 점수가 다시 움직입니다.', {
            title: '치트 감시', tone: 'warning', confirmLabel: '지우기'
        });
        if (!confirmed) return;
        try {
            await this.links.session.request(accountContext, '/rest/v1/rpc/admin_clear_cheat_flags', {
                method: 'POST', body: { p_user_id: button.dataset.cheatClear, p_kind: button.dataset.cheatKind || null }
            });
            (0, this.deps.showGameToast)((0, this.deps._t)('감시 기록을 지웠습니다.'), 'success');
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            (0, this.deps.showGameToast)((0, this.deps._t)('기록을 지우지 못했습니다: {value}', { value: error.message || error }), 'danger');
        }
        await this.loadCheatWatch();
    }

    /** The term a click refers to: the row's own term for 빼기, else the input row's text. */
    bannedTermOf(button, remove) {
        if (remove) return String(button.dataset.termRemove || '');
        let input = this.deps.document.getElementById('banned-term-input');
        return String((input && input.value) || '').trim();
    }

    bannedTermSpaced() {
        let box = this.deps.document.getElementById('banned-term-spaced');
        return !box || box.checked;
    }

    /** Adds (from the input row) or removes (a row's button) one banned term after a confirmation, then reloads the section. */
    async setBannedTerm(button, remove) {
        if (!this.state.active) return;
        const accountContext = this.links.session.capture();
        let term = this.bannedTermOf(button, remove);
        if (term.length < 2) return (0, this.deps.showGameToast)((0, this.deps._t)('낱말은 2~40자여야 합니다.'), 'warning');
        let confirmed = await (0, this.deps.requestGameConfirmation)(`금칙어 "${term}"${remove ? '을 뺄까요?' : '을 더할까요?'}`, {
            title: '금칙어', tone: 'warning', confirmLabel: remove ? '빼기' : '더하기'
        });
        if (!confirmed) return;
        try {
            await this.links.session.request(accountContext, '/rest/v1/rpc/admin_set_banned_term', {
                method: 'POST', body: { p_term: term, p_spaced: this.bannedTermSpaced(), p_remove: !!remove }
            });
            (0, this.deps.showGameToast)(remove ? '금칙어를 뺐습니다.' : '금칙어를 더했습니다.', 'success');
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            (0, this.deps.showGameToast)((0, this.deps._t)('금칙어를 바꾸지 못했습니다: {value}', { value: error.message || error }), 'danger');
        }
        await this.loadChatReports();
    }

    /** Fills the chat reports under the watch. Before db/multiplayer-hardening-20261027.sql runs, the server has no such function and a note says so. */
    async loadChatReports() {
        const accountContext = this.links.session.capture();
        let box = this.deps.document.getElementById('chat-reports');
        if (!box) return;
        try {
            let data = await this.links.session.request(accountContext, '/rest/v1/rpc/admin_get_chat_reports', { method: 'POST', body: {} });
            let terms = await this.links.session.request(accountContext, '/rest/v1/rpc/admin_get_banned_terms', { method: 'POST', body: {} }).catch(error => {
                this.deps.console.warn('banned terms lookup failed:', error);
                return null; // The optional table may not exist before its server migration.
            });
            if (!this.links.session.current(accountContext)) return;
            box.innerHTML = this.links.opsView.renderChatReports(Object.assign({}, data || {}, { terms }));
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            let text = String(error && error.message || error);
            box.innerHTML = /schema cache|could not find|does not exist/i.test(text)
                ? '<section><h3>채팅 신고</h3><p class="cloud-tools-note">Supabase에서 db/multiplayer-hardening-20261027.sql을 실행하면 보입니다.</p></section>'
                : `<section><h3>채팅 신고</h3><p class="cloud-tools-error">불러올 수 없습니다: ${this.links.format.cloudToolsEscape(text)}</p></section>`;
        }
    }

    /** Mutes or unmutes the account whose nickname is in the input row (admin_set_chat_mute_by_nickname): accounts without a report row. */
    async setChatMuteByNickname(button) {
        if (!this.state.active) return;
        const accountContext = this.links.session.capture();
        let input = this.deps.document.getElementById('chat-mute-nickname');
        let nickname = String((input && input.value) || '').trim();
        if (!nickname) return (0, this.deps.showGameToast)((0, this.deps._t)('닉네임을 넣어 주세요.'), 'warning');
        let minutes = Math.max(0, Math.floor(Number(button.dataset.muteNick) || 0));
        let confirmed = await (0, this.deps.requestGameConfirmation)(this.muteConfirmText(nickname, minutes), { title: '채팅 신고', tone: 'warning', confirmLabel: minutes ? '금지' : '풀기' });
        if (!confirmed) return;
        return this.muteByNickname(accountContext, nickname, minutes);
    }

    async muteByNickname(accountContext, nickname, minutes) {
        try {
            await this.links.session.request(accountContext, '/rest/v1/rpc/admin_set_chat_mute_by_nickname', { method: 'POST', body: { p_nickname: nickname, p_minutes: minutes, p_note: '' } });
            (0, this.deps.showGameToast)(minutes ? '채팅을 금지했습니다.' : '채팅 금지를 풀었습니다.', 'success');
            await this.loadChatReports();   // 실패했을 때는 다시 그리지 않아 입력한 닉네임이 남는다
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            (0, this.deps.showGameToast)(this.describeMuteError(error), 'danger');
        }
    }

    muteConfirmText(name, minutes) {
        return minutes ? `${name} 계정의 채팅을 ${minutes >= 10080 ? '7일' : '1일'} 동안 금지할까요?` : `${name} 계정의 채팅 금지를 풀까요?`;
    }

    describeMuteError(error) {
        let text = String(error && error.message || error);
        return /PLAYER_NOT_FOUND/.test(text) ? '그 닉네임의 플레이어가 없습니다.' : `금지를 바꾸지 못했습니다: ${text}`;
    }

    /** The reported player's newest chat rows (readable by any signed-in user) under the report table, with 줄 지우기 buttons. */
    async peekPlayerChat(button) {
        if (!this.state.active) return;
        const accountContext = this.links.session.capture();
        let box = this.deps.document.getElementById('chat-peek');
        if (!box) return;
        box.dataset.peekUser = button.dataset.chatPeek;   // 줄을 지운 뒤 같은 사람의 목록을 다시 그린다(deleteChatMessage). 클릭 선택자와 다른 이름.
        box.dataset.peekName = button.dataset.chatName || '';
        box.innerHTML = '<p class="cloud-tools-empty">불러오는 중…</p>';
        try {
            let rows = await this.links.session.request(accountContext, `/rest/v1/chat_messages?select=id,body,created_at&user_id=eq.${encodeURIComponent(button.dataset.chatPeek)}&order=id.desc&limit=15`, {});
            box.innerHTML = this.links.opsView.renderChatPeek(button.dataset.chatName || '', Array.isArray(rows) ? rows : []);
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            box.innerHTML = `<p class="cloud-tools-error">최근 채팅을 불러오지 못했습니다: ${this.links.format.cloudToolsEscape(error.message || error)}</p>`;
        }
    }

    /** Mutes (1 or 7 days) or unmutes one account after a confirmation (admin_set_chat_mute), then reloads the reports. */
    async setChatMute(button) {
        if (!this.state.active) return;
        const accountContext = this.links.session.capture();
        let minutes = Math.max(0, Math.floor(Number(button.dataset.chatMinutes) || 0));
        let name = button.dataset.chatName || '이 계정';
        let confirmed = await (0, this.deps.requestGameConfirmation)(this.muteConfirmText(name, minutes), { title: '채팅 신고', tone: 'warning', confirmLabel: minutes ? '금지' : '풀기' });
        if (!confirmed) return;
        try {
            await this.links.session.request(accountContext, '/rest/v1/rpc/admin_set_chat_mute', {
                method: 'POST', body: { p_user_id: button.dataset.chatMute, p_minutes: minutes, p_note: '' }
            });
            (0, this.deps.showGameToast)(minutes ? '채팅을 금지했습니다.' : '채팅 금지를 풀었습니다.', 'success');
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            (0, this.deps.showGameToast)((0, this.deps._t)('금지를 바꾸지 못했습니다: {value}', { value: error.message || error }), 'danger');
        }
        await this.loadChatReports();
    }

    /** Deletes one chat row after a confirmation (admin_delete_chat_message): from the ops window's reports and peek lists, or from a line
     * of the chat window in the admin view (js/social.js renderChatMessages). The row leaves this chat at once; the ops lists reload. */
    async deleteChatMessage(button) {
        if (!this.state.active) return;
        const accountContext = this.links.session.capture();
        let inOps = !!button.closest('#cloud-tools-dialog');
        let confirmed = await (0, this.deps.requestGameConfirmation)('이 채팅 줄을 지울까요?\n모든 플레이어의 채팅창에서 사라집니다.', {
            title: inOps ? '채팅 신고' : '채팅', tone: 'warning', confirmLabel: '지우기'
        });
        if (!confirmed) return;
        return this.deleteConfirmedChatMessage(button, inOps, accountContext);
    }

    async deleteConfirmedChatMessage(button, inOps, accountContext) {
        let id = Number(button.dataset.chatDelete), peek = button.closest('#chat-peek');   // 최근 채팅 목록 안의 단추였으면 다시 그린 뒤 그 목록을 되살린다
        try {
            let result = await this.links.session.request(accountContext, '/rest/v1/rpc/admin_delete_chat_message', { method: 'POST', body: { p_message_id: id } });
            let gone = result && result.deleted === false;   // 다른 운영자나 전체 비우기가 먼저 지운 줄
            (0, this.deps.forgetSocialChatMessages)([id]);
            (0, this.deps.showGameToast)(gone ? '이미 지워진 줄입니다.' : '채팅 줄을 지웠습니다.', gone ? 'warning' : 'success');
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            (0, this.deps.showGameToast)((0, this.deps._t)('줄을 지우지 못했습니다: {value}', { value: error.message || error }), 'danger');
        }
        if (!inOps) return;
        await this.loadChatReports();
        if (peek) await this.peekPlayerChat({ dataset: { chatPeek: peek.dataset.peekUser, chatName: peek.dataset.peekName } });
    }

    /** Empties the whole chat after a confirmation (db/admin-gate-chat-clear-20261027.sql admin_clear_chat). Report rows keep their own
     * copy of the reported lines; the reports and peek lists reload so no 줄 지우기 button points at a row that is gone. */
    async clearAllChat() {
        if (!this.state.active) return;
        const accountContext = this.links.session.capture();
        let confirmed = await (0, this.deps.requestGameConfirmation)('채팅을 모두 지울까요?\n모든 플레이어의 채팅창이 비고, 되돌릴 수 없습니다.', {
            title: '채팅 전체 비우기', tone: 'danger', confirmLabel: '모두 지우기'
        });
        if (!confirmed) return;
        try {
            let result = await this.links.session.request(accountContext, '/rest/v1/rpc/admin_clear_chat', { method: 'POST', body: {} });
            (0, this.deps.forgetSocialChatMessages)();
            (0, this.deps.showGameToast)((0, this.deps._t)('채팅 {value}줄을 지웠습니다.', { value: this.links.format.cloudToolsNumber(result && result.deleted) }), 'success');
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            let text = String((error && error.message) || error);
            (0, this.deps.showGameToast)(/schema cache|could not find|does not exist/i.test(text)
                ? '서버에 채팅 비우기 기능이 아직 없습니다. db/admin-gate-chat-clear-20261027.sql을 실행해야 합니다.'
                : `채팅을 비우지 못했습니다: ${text}`, 'danger');
            return;
        }
        await this.loadChatReports();
    }
}
