// notifications: explicit account state and dependency ports; no ambient game/global state.
export class SocialNotifications {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["socialChatNoticeQuery","checkSocialChatNotification","pollSocialChatNotification","ensureSocialNotificationPolling"].forEach(name => { this[name] = this[name].bind(this); });
    }

    socialChatNoticeQuery(seen) {
        let cutoff = encodeURIComponent(new Date(Date.now() - this.data.SOCIAL_CHAT_RETENTION_MS).toISOString());
        let base = `/rest/v1/chat_messages?select=id,user_id,nickname,body&created_at=gte.${cutoff}&order=id.desc&limit=1`;
        if (seen == null) return base;
        let after = Math.max(seen, Number(this.state.current.lastNotifiedChatId) || 0);
        return `${base}&id=gt.${after}&user_id=neq.${encodeURIComponent(this.services.session.socialLoggedInUserId())}`;
    }

    async checkSocialChatNotification() {
        if (!this.services.session.socialCloudReady() || this.state.current.bgNotiLoading) return;
        // 탭을 보고 있으면 활성 폴링이 채팅을 렌더하며 확인 처리하므로 알림이 필요 없다.
        if (this.services.chatStatus.isSocialTabActive()) return;
        if (!this.deps.game?.noti) return;
        let context = this.services.session.socialSessionContext();
        this.state.current.bgNotiLoading = context;
        this.state.current.lastChatNoticeAt = Date.now();
        try {
            let rows = await this.deps.cloudJsonRequest(this.socialChatNoticeQuery(this.services.chatStatus.getLastSeenChatId()), {});
            if (!this.services.session.isSocialSessionCurrent(context)) return;
            rows = Array.isArray(rows) ? rows : [];
            if (rows.length) this.services.noticeView.noteIncomingChats(rows);
        } catch (error) {
            this.deps.console.warn('[social] notification query failed; next poll will retry:', error.message);
        } finally {
            this.services.session.releaseSocialRequest('bgNotiLoading', context);
        }
    }

    pollSocialChatNotification() {
        let due = this.services.chatStatus.isSocialChatNotificationEnabled() ? this.services.chatStatus.socialChatPollDue(this.state.current.lastChatNoticeAt)
            : Date.now() - this.state.current.lastChatNoticeAt >= this.data.SOCIAL_CHAT_LIVE_POLL_MS;
        if (!this.services.chatStatus.isSocialPageHidden() && due) return this.checkSocialChatNotification();
    }

    ensureSocialNotificationPolling() {
        if (!this.services.session.socialCloudReady() || this.state.current.bgNotificationTimer) return;
        this.state.current.bgNotificationTimer = this.deps.setInterval(this.pollSocialChatNotification, this.data.SOCIAL_BG_NOTI_POLL_MS);
        Promise.resolve(this.checkSocialChatNotification()).catch(error => this.deps.console.warn('social notification refresh failed:', error));
    }
}
