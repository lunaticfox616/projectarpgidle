// chat-send: explicit account state and dependency ports; no ambient game/global state.
export class SocialChatSend {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["translateSpamError","prepareChatSender","chatRowReady","isStaleNicknameError","adoptServerNickname","withStaleNicknameRetry","clearSubmittedChatDraft","reportChatSendFailure","finishSocialChatSend","sendChatMessage","onSocialChatKeydown"].forEach(name => { this[name] = this[name].bind(this); });
    }

    translateSpamError(msg) {
        let hit = this.data.SOCIAL_CHAT_ERROR_TEXTS.find(([pattern]) => pattern.test(msg));
        if (!hit) return msg;
        return typeof hit[1] === 'function' ? hit[1](msg) : hit[1];
    }

    async prepareChatSender(senderId) {
        let context = this.services.session.socialSessionContext();
        await this.services.nickname.restoreNicknameFromServer();
        if (!this.services.session.isSocialSessionCurrent(context)) throw new Error('전송 중 계정이 변경되었습니다.');
        if (!this.services.identity.getMyNickname()) await this.services.screenActions.promptAndSetNickname();
        if (!this.services.session.isSocialSessionCurrent(context)) throw new Error('전송 중 계정이 변경되었습니다.');
        if (!this.services.identity.getMyNickname()) return false;
        // 이 세션에 닉네임 줄을 아직 맞추지 않았으면 서버의 닉네임부터 다시 읽는다: 줄이 있으면 그 닉네임을 따르고(다른 기기에서 바꾼
        // 닉네임을 되돌리지 않는다), 줄이 없을 때만 새로 쓴다.
        if (!this.chatRowReady(senderId)) await this.services.nickname.restoreNicknameFromServer(true);
        if (!this.chatRowReady(senderId)) await this.services.upload.uploadPlayerProfile({ required: true });
        if (!this.services.session.isSocialSessionCurrent(context)) throw new Error('전송 중 계정이 변경되었습니다.');
        return true;
    }

    chatRowReady(userId) {
        return this.state.current.profileRowFor === `${userId}\n${this.services.identity.getMyNickname()}`;
    }

    isStaleNicknameError(error) {
        let code = error && error.socialCode;
        return code === 'nickname_cooldown' || code === 'nickname_conflict' || /row-level security/i.test(String(error && error.message || error));
    }

    async adoptServerNickname(userId) {
        let before = this.services.identity.getMyNickname();
        let after = await this.services.nickname.restoreNicknameFromServer(true);
        if (this.services.session.socialLoggedInUserId() !== userId || !after || after === before) return false;
        this.services.screen.refreshChatSettings();
        return true;
    }

    async withStaleNicknameRetry(userId, sendOnce) {
        let context = this.services.session.socialSessionContext();
        try {
            return await sendOnce();
        } catch (error) {
            if (!this.services.session.isSocialSessionCurrent(context)) throw error;
            if (!this.isStaleNicknameError(error) || !await this.adoptServerNickname(userId)) throw error;
            return sendOnce();
        }
    }

    clearSubmittedChatDraft(inputEl, draft, items) {
        // 보내는 사이 칸을 다시 그렸으면(renderSocialTab이 쓰던 글을 새 칸에 옮긴다) 지금 칸을 비운다.
        let input = this.deps.document.getElementById('social-chat-input') || inputEl;
        if (input.value !== draft || this.state.current.pendingChatItems.length !== items.length) return;
        if (!items.every((item, index) => this.state.current.pendingChatItems[index] === item)) return;
        input.value = '';
        this.state.current.pendingChatItems = [];
        this.services.attachments.renderPendingChatItems();
        this.services.attachments.updateChatCounter();
    }

    reportChatSendFailure(error, context) {
        if (!this.services.session.isSocialSessionCurrent(context)) return;
        if (error?.socialCode === 'nickname_conflict') this.services.identity.setMyNicknameLocal('');
        this.deps.showGameToast('메시지 전송 실패: ' + this.translateSpamError(String(error && error.message || error)), 'danger');
    }

    finishSocialChatSend(context) {
        if (this.state.current.chatSendRequest !== context) return;
        this.state.current.chatSendRequest = null;
        this.state.current.chatSending = false;
        this.services.composerControls.updateChatSendButton();
    }

    canSubmitChat(body, items) {
        if (!body && !items.length) return;
        if (body.length > this.data.SOCIAL_MSG_MAX) { this.deps.showGameToast(this.deps._t('메시지는 최대 {SOCIAL_MSG_MAX}자까지 입력할 수 있습니다.', { SOCIAL_MSG_MAX: this.data.SOCIAL_MSG_MAX }), 'warning'); return; }
        if (body && body === this.state.current.lastSentBody && !items.length) { this.deps.showGameToast(this.deps._t('같은 메시지를 연속으로 보낼 수 없습니다.'), 'warning'); return; }
        let rate = this.services.chatData.checkSendRateLimit();
        if (rate !== true) { this.deps.showGameToast(rate, 'warning'); return false; }
        return true;
    }

    async sendChatMessage() {
        if (!this.services.session.socialCloudReady()) { this.deps.showGameToast(this.deps._t('먼저 클라우드 로그인이 필요합니다.'), 'warning'); return; }
        if (this.state.current.chatSending) return;
        let inputEl = this.deps.document.getElementById('social-chat-input');
        if (!inputEl) return;
        let draft = inputEl.value;
        let pending = this.state.current.pendingChatItems.slice(0, this.data.SOCIAL_MAX_ITEMS_PER_MSG);
        let { body, items } = this.services.attachments.toChatBody(draft.trim(), pending);
        if (!this.canSubmitChat(body, items)) return;

        let payload = items.length ? { items } : null;
        let senderId = this.services.session.socialLoggedInUserId();
        let context = this.services.session.socialSessionContext();
        this.state.current.chatSendRequest = context;
        this.state.current.chatSending = true;
        try {
            this.services.composerControls.updateChatSendButton();
            let sent = await this.withStaleNicknameRetry(senderId, async () => {
                if (!await this.prepareChatSender(senderId) || !this.services.session.isSocialSessionCurrent(context)) return false;
                // 접속 신호를 채팅과 함께 보낸다: 창을 오래 가려 뒀다가 돌아와 바로 쳐도 접속 인원에 내가 들어간다.
                await Promise.all([this.deps.cloudJsonRequest('/rest/v1/chat_messages', {
                    method: 'POST', headers: { Prefer: 'return=minimal' },
                    body: { user_id: senderId, nickname: this.services.identity.getMyNickname(), body: body || '🔗', payload }
                }), this.services.presence.sendPresenceHeartbeat()]);
                return true;
            });
            if (!sent || !this.services.session.isSocialSessionCurrent(context)) return;
            this.clearSubmittedChatDraft(inputEl, draft, pending);
            this.state.current.sendTimestamps.push(Date.now());
            this.state.current.lastSentBody = body;
            await this.services.polling.refreshChatPanel(true);
            this.services.presence.onlineChat.refresh(true);
        } catch (e) {
            this.reportChatSendFailure(e, context);
        } finally {
            this.finishSocialChatSend(context);
        }
    }

    onSocialChatKeydown(event) {
        if (!event || event.isComposing || event.keyCode === 229 || event.repeat) return;
        if (event.key !== 'Enter' || event.shiftKey) return;
        event.preventDefault();
        this.sendChatMessage();
    }
}
