// polling: explicit account state and dependency ports; no ambient game/global state.
export class SocialPolling {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["forgetSocialChatMessages","applySocialChatPoll","refreshChatPanel","startChatPolling"].forEach(name => { this[name] = this[name].bind(this); });
    }

    forgetSocialChatMessages(ids) {
        let before = this.state.current.chatMessages || [], gone = new Set((ids || []).map(String)), now = Date.now();
        let forgotten = this.state.current.chatForgotten || (this.state.current.chatForgotten = { ids: new Map(), through: 0, until: 0 });
        forgotten.ids.forEach((until, id) => { if (until <= now) forgotten.ids.delete(id); });
        if (ids) gone.forEach(id => forgotten.ids.set(id, now + this.data.SOCIAL_CHAT_FORGET_MS));
        else Object.assign(forgotten, { through: this.data.socialChatMaxId(before), until: now + this.data.SOCIAL_CHAT_FORGET_MS });
        this.state.current.chatMessages = ids ? before.filter(row => !gone.has(String(row.id))) : [];
        if (this.state.current.chatMessages.length === before.length || this.state.current.chatForgetQueued) return;
        this.state.current.chatForgetQueued = true;
        this.deps.setTimeout(() => {
            this.state.current.chatForgetQueued = false;
            if (this.state.current.chatInitialized && this.services.chatStatus.isSocialTabActive()) this.services.chatMarkup.renderChatMessages(this.state.current.chatMessages, false);
        }, 0);
    }

    applySocialChatPoll(incoming, knownRows, fullSync, now) {
        // A full response drops deleted history but keeps realtime rows received while it was pending.
        let retained = fullSync ? this.state.current.chatMessages.filter(row => !knownRows.has(String(row.id))) : this.state.current.chatMessages;
        this.state.current.chatMessages = this.services.chatData.mergeSocialChatMessages(retained, incoming, now);
        this.state.current.chatInitialized = true;
        if (fullSync) this.state.current.lastChatFullSyncAt = now;
    }

    async refreshChatPanel(forceScroll) {
        if (!this.services.session.socialCloudReady() || this.state.current.chatLoading) return;
        let context = this.services.session.socialSessionContext();
        this.state.current.chatLoading = context;
        try {
            let now = Date.now();
            let fullSync = !this.state.current.chatInitialized || now - this.state.current.lastChatFullSyncAt >= this.data.SOCIAL_CHAT_FULL_SYNC_MS;
            let knownId = this.data.socialChatMaxId(this.state.current.chatMessages), wasReady = this.state.current.chatInitialized;
            let knownRows = new Set(this.state.current.chatMessages.map(row => String(row.id)));
            this.state.current.lastChatPollAt = now;
            let incoming = (await this.services.chatData.loadChatMessages(fullSync ? null : knownId, now)).filter(row => !this.services.chatData.isForgottenSocialChat(row, now));
            if (!this.services.session.isSocialSessionCurrent(context)) return;
            this.services.chatData.noteLiveChatGap(incoming, fullSync, wasReady);
            this.applySocialChatPoll(incoming, knownRows, fullSync, now);
            this.services.chatMarkup.renderChatMessages(this.state.current.chatMessages, forceScroll);
            // 처음 불러올 때는 startChatPolling이 접속 인원을 함께 읽는다. 그 뒤로 새 채팅이 오면 접속 인원도 다시 읽는다.
            if (wasReady && this.data.socialChatMaxId(incoming) > knownId) this.services.presence.onlineChat.refresh(false);
        } catch (e) { this.deps.console.warn('채팅 로드 실패:', e); } finally { this.services.session.releaseSocialRequest('chatLoading', context); }
    }

    startChatPolling() {
        this.services.reset.stopChatPolling();
        if (!this.services.session.socialCloudReady()) return;
        this.refreshChatPanel(true);
        this.services.presence.refreshOnlineUsers(true);
        this.state.current.chatPollTimer = this.deps.setInterval(() => {
            if (!this.services.chatStatus.isSocialTabActive()) { this.services.reset.stopChatPolling(); return; }
            if (!this.services.chatStatus.isSocialPageHidden() && this.services.chatStatus.socialChatPollDue(this.state.current.lastChatPollAt)) this.refreshChatPanel(false);
        }, this.data.SOCIAL_CHAT_POLL_MS);
        this.state.current.onlinePollTimer = this.deps.setInterval(() => {
            if (!this.services.chatStatus.isSocialTabActive()) { this.services.reset.stopChatPolling(); return; }
            if (!this.services.chatStatus.isSocialPageHidden()) this.services.presence.refreshOnlineUsers();
        }, this.data.SOCIAL_ONLINE_POLL_MS);
    }
}
