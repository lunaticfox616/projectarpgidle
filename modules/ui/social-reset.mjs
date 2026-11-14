// reset: explicit account state and dependency ports; no ambient game/global state.
export class SocialReset {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["resetSocialSessionViews","closePlayerProfile","stopChatPolling","stopHeartbeat","stopSocialNotificationPolling","closeLiveChat","hideSocialTip"].forEach(name => { this[name] = this[name].bind(this); });
    }

    resetSocialSessionViews() {
        this.stopChatPolling();
        this.deps.clearTimeout(this.state.current.profileSyncTimer);
        Object.assign(this.state.current, {
            chatMessages: [], chatTips: {}, profileTips: {}, pickTips: {}, chatInitialized: false,
            chatLoading: false, chatSending: false, chatSendRequest: null, onlineLoading: false, bgNotiLoading: false, onlineRefreshAgain: false,
            lastChatFullSyncAt: 0, lastChatPollAt: 0, lastChatNoticeAt: 0, lastOnlineLoadAt: 0,
            lastOnlineLoadWasList: false, lastChatRenderKey: '', lastOnlineRenderKey: '',
            lastNotifiedChatId: null, profileSentKey: '', profileRowFor: '', profileSyncTimer: null,
            profileUploadPromise: null, profileUploadUserId: null
        });
        if (typeof this.deps.game !== 'undefined' && this.deps.game && this.deps.game.noti) this.deps.game.noti.social = false;
        if (typeof this.deps.document === 'undefined') return;
        this.closePlayerProfile();
        for (let id of ['social-chat-list', 'social-online', 'social-chat-online', 'social-profile-body', 'social-tooltip']) {
            let element = this.deps.document.getElementById(id);
            if (element) { element.innerHTML = ''; delete element.dataset.counts; }
        }
        let settings = this.deps.document.getElementById(this.data.CHAT_SETTINGS_ID);
        if (settings) settings.remove();
    }

    stopHeartbeat() {
        if (!this.state.current.heartbeatTimer) return;
        this.deps.clearInterval(this.state.current.heartbeatTimer);
        this.state.current.heartbeatTimer = null;
    }

    stopSocialNotificationPolling() {
        if (!this.state.current.bgNotificationTimer) return;
        this.deps.clearInterval(this.state.current.bgNotificationTimer);
        this.state.current.bgNotificationTimer = null;
    }

    closeLiveChat() {
        this.deps.clearTimeout(this.state.current.chatLiveHiddenTimer);
        this.state.current.chatLiveHiddenTimer = null;
        this.state.current.chatLive = false;
        let channel = this.state.current.chatChannel, client = this.state.current.chatRealtime;
        if (!channel) return;
        this.state.current.chatChannel = null;
        this.state.current.chatChannelUserId = null;
        this.state.current.chatChannelSession = null;
        if (client) {
            Promise.resolve(client.removeChannel(channel)).catch(error => this.deps.console.warn('채팅 실시간 연결 해제 실패:', error));
        }
    }

    stopChatPolling() {
        if (this.state.current.chatPollTimer) this.deps.clearInterval(this.state.current.chatPollTimer);
        if (this.state.current.onlinePollTimer) this.deps.clearInterval(this.state.current.onlinePollTimer);
        this.deps.clearTimeout(this.state.current.onlineChatTimer);
        this.state.current.chatPollTimer = null;
        this.state.current.onlinePollTimer = null;
        this.state.current.onlineChatTimer = null;
    }

    hideSocialTip() { let t = this.deps.document.getElementById('social-tooltip'); if (t) t.style.display = 'none'; }

    closePlayerProfile() {
        this.hideSocialTip();
        this.state.current.profileRequest = null;
        this.state.current.currentProfile = null;
        this.state.current.currentProfileUserId = null;
        this.state.current.profileTips = {};
        let m = this.deps.document.getElementById('social-profile-modal');
        if (m) m.style.display = 'none';
    }
}
