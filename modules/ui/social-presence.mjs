// presence: explicit account state and dependency ports; no ambient game/global state.
export class SocialPresence {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["sendPresenceHeartbeat","ensureHeartbeat","loadOnlineUsers","onlineUsersQuery","shapeOnlineUsers","noteOnlineLoadError","refreshOnlineUsers"].forEach(name => { this[name] = this[name].bind(this); });
        this.onlineChat = Object.freeze({ due: this.onlineChatDue.bind(this), refresh: this.scheduleOnlineChatRefresh.bind(this) });
    }

    async sendPresenceHeartbeat() {
        if (!this.services.session.socialCloudReady() || !this.services.identity.getMyNickname() || !this.state.current.onlineSupported) return;
        let context = this.services.session.socialSessionContext();
        try {
            await this.deps.cloudJsonRequest(`/rest/v1/player_profiles?user_id=eq.${encodeURIComponent(this.services.session.socialLoggedInUserId())}`, {
                method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { last_seen: new Date().toISOString() }
            });
        } catch (e) { if (this.services.session.isSocialSessionCurrent(context) && /last_seen/i.test(String(e && e.message || e))) this.state.current.onlineSupported = false; }
    }

    ensureHeartbeat() {
        if (!this.services.session.socialCloudReady() || !this.services.identity.getMyNickname()) return;
        if (this.state.current.heartbeatTimer) return;
        this.state.current.heartbeatTimer = this.deps.setInterval(() => { if (this.services.session.socialCloudReady() && this.services.identity.getMyNickname() && !this.services.chatStatus.isSocialPageHidden()) this.sendPresenceHeartbeat(); }, this.data.SOCIAL_HEARTBEAT_MS);
        this.sendPresenceHeartbeat();
    }

    async loadOnlineUsers(countsOnly) {
        if (!this.services.session.socialCloudReady() || !this.state.current.onlineSupported) return [];
        let context = this.services.session.socialSessionContext();
        let countsPath = !!countsOnly && this.state.current.onlineCountsSupported !== false;
        let result;
        try {
            result = await this.deps.cloudJsonRequest(...this.onlineUsersQuery(countsPath));
        } catch (e) {
            if (!this.services.session.isSocialSessionCurrent(context)) return [];
            if (!this.noteOnlineLoadError(String(e && e.message || e), countsPath)) return [];
            countsPath = false;   // 인원 수 함수가 서버에 없다: 이번부터 줄을 받는다
            try { result = await this.deps.cloudJsonRequest(...this.onlineUsersQuery(false)); } catch { return []; }
        }
        return this.shapeOnlineUsers(result, countsPath);
    }

    onlineUsersQuery(countsPath) {
        if (countsPath) return ['/rest/v1/rpc/get_online_counts', { method: 'POST', body: {} }];
        let cutoff = new Date(Date.now() - this.data.SOCIAL_RECENT_WINDOW_S * 1000).toISOString();
        return [`/rest/v1/player_profiles?select=user_id,nickname,last_seen&last_seen=gte.${encodeURIComponent(cutoff)}&order=last_seen.desc&limit=80`, {}];
    }

    shapeOnlineUsers(result, countsPath) {
        if (countsPath) return { counts: result && typeof result === 'object' ? result : {} };
        return Array.isArray(result) ? result : [];
    }

    noteOnlineLoadError(text, countsPath) {
        if (/last_seen/i.test(text)) this.state.current.onlineSupported = false;
        if (!countsPath || !/schema cache|could not find|does not exist/i.test(text)) return false;
        this.state.current.onlineCountsSupported = false;
        return true;
    }

    async refreshOnlineUsers(force = false) {
        if (!this.services.session.socialCloudReady() || !this.state.current.onlineSupported || this.services.chatStatus.isSocialPageHidden()) return;
        let listOpen = !!this.deps.document.getElementById('social-online');
        if (!this.onlineChat.due(listOpen, force)) return;
        // 인원 수만 묻는 조회가 도는 사이에 설정 창을 열었으면(목록이 필요해졌으면) 그 조회가 끝난 뒤 한 번 더 읽는다.
        if (this.state.current.onlineLoading) { this.state.current.onlineRefreshAgain = !!this.deps.document.getElementById('social-online'); return; }
        let context = this.services.session.socialSessionContext();
        this.state.current.onlineLoading = context;
        this.state.current.lastOnlineLoadAt = Date.now();
        this.state.current.lastOnlineLoadWasList = listOpen;
        // 접속자 목록(채팅 설정 창)이 열려 있을 때만 줄을 받고, 그 밖에는 배지의 인원 수만 묻는다.
        try {
            let result = await this.loadOnlineUsers(!listOpen);
            if (!this.services.session.isSocialSessionCurrent(context)) return;
            this.services.presenceMarkup.renderSocialOnlineResult(result);
        } catch (error) {
            this.deps.console.warn('[social] online-user refresh failed:', error.message);
        } finally { this.services.session.releaseSocialRequest('onlineLoading', context); }
        if (this.state.current.onlineRefreshAgain) { this.state.current.onlineRefreshAgain = false; this.onlineChat.refresh(true); }
    }

    onlineChatDue(listOpen, force) {
            return force || (listOpen && !this.state.current.lastOnlineLoadWasList)
                || Date.now() - this.state.current.lastOnlineLoadAt >= this.data.SOCIAL_ONLINE_POLL_MS;
        }

    scheduleOnlineChatRefresh(force) {
            if (this.state.current.onlineChatTimer && !force) return;
            this.deps.clearTimeout(this.state.current.onlineChatTimer);
            let wait = force ? 0 : Math.max(0, this.state.current.lastOnlineLoadAt + this.data.SOCIAL_ONLINE_POLL_MS - Date.now());
            this.state.current.onlineChatTimer = this.deps.setTimeout(() => {
                this.state.current.onlineChatTimer = null;
                this.refreshOnlineUsers(force);
            }, wait);
        }
}
