// notice-view: explicit account state and dependency ports; no ambient game/global state.
export class SocialNoticeView {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["refreshSocialNotificationDots","noteIncomingChats","showChatToast","getSocialChatNotificationPreview"].forEach(name => { this[name] = this[name].bind(this); });
    }

    refreshSocialNotificationDots() {
        if (typeof this.deps.updateTabNotificationDots === 'function') this.deps.updateTabNotificationDots();
    }

    getSocialChatNotificationPreview(row) {
        let body = String(row && row.body || '').replace(new RegExp(this.data.SOCIAL_ITEM_TOKEN_RE.source, 'g'), '[아이템]').replace(/\s+/g, ' ').trim();
        if (!body) body = row && row.payload ? '아이템을 공유했습니다.' : '새 메시지가 도착했습니다.';
        return body.length > 54 ? `${body.slice(0, 54)}…` : body;
    }

    noteIncomingChats(rows) {
        let latest = rows.reduce((max, row) => Math.max(max, Number(row && row.id) || 0), 0);
        if (!Number.isFinite(latest) || latest <= 0) return;
        // 첫 확인(이 기기에서 채팅을 한 번도 안 봄)에는 과거 메시지로 알림하지 않고 기준점만 잡는다.
        if (this.services.chatStatus.getLastSeenChatId() == null) { this.services.chatStatus.setLastSeenChatId(latest); return; }
        if (!this.services.chatStatus.isSocialChatNotificationEnabled()) {
            this.services.chatStatus.setLastSeenChatId(latest);
            this.deps.game.noti.social = false;
            this.refreshSocialNotificationDots();
            return;
        }
        let incoming = rows.find(row => row && row.user_id !== this.services.session.socialLoggedInUserId() && !this.services.blocking.isUserBlocked(row.user_id));
        if (!incoming) {
            this.services.chatStatus.setLastSeenChatId(latest);
            return;
        }
        this.deps.game.noti.social = true;
        this.refreshSocialNotificationDots();
        let incomingId = Number(incoming.id);
        // 채팅 메시지 id는 로컬 저장소에 남기지 않고 세션 메모리에서만 중복 토스트를 막는다.
        if (this.state.current.lastNotifiedChatId === incomingId) return;
        this.state.current.lastNotifiedChatId = incomingId;
        this.showChatToast(incoming);
    }

    showChatToast(row) {
        let now = Date.now();
        if (typeof this.deps.showGameToast !== 'function' || now - this.state.current.lastChatToastAt < this.data.SOCIAL_CHAT_TOAST_GAP_MS) return;
        this.state.current.lastChatToastAt = now;
        this.deps.showGameToast(this.deps._t('새 채팅, {who}: {preview}', { who: String(row.nickname || this.deps._t('플레이어')), preview: this.getSocialChatNotificationPreview(row) }), { tone: 'info', duration: this.data.SOCIAL_CHAT_TOAST_MS });
    }
}
