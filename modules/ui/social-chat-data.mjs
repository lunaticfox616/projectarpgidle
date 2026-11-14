// chat-data: explicit account state and dependency ports; no ambient game/global state.
export class SocialChatData {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["loadChatMessages","isSocialChatMessageCurrent","mergeSocialChatMessages","checkSendRateLimit","isForgottenSocialChat","noteLiveChatGap"].forEach(name => { this[name] = this[name].bind(this); });
    }

    noteLiveChatGap(rows, fullSync, wasReady) {
        if (fullSync || !wasReady || !this.state.current.chatLive || Date.now() - this.state.current.chatLiveSince < this.data.SOCIAL_CHAT_LIVE_SETTLE_MS) return;
        let listed = new Set(this.state.current.chatMessages.map(row => String(row.id)));
        if (!rows.some(row => row.user_id !== this.services.session.socialLoggedInUserId() && !listed.has(String(row.id)))) return;
        if (++this.state.current.chatLiveMisses < this.data.SOCIAL_CHAT_LIVE_MISSES) return;
        this.state.current.chatLive = false;
        this.deps.console.warn('채팅 실시간 수신이 새 채팅을 놓쳐 이 세션은 예전 조회 주기로 돌아갑니다(db/social.sql의 supabase_realtime 발행 확인).');
    }

    async loadChatMessages(afterId = null, now = Date.now()) {
        if (!this.services.session.socialCloudReady()) return [];
        let cutoff = new Date(now - this.data.SOCIAL_CHAT_RETENTION_MS).toISOString();
        let incremental = afterId != null && Number.isFinite(Number(afterId));
        let cursor = incremental ? `&id=gt.${encodeURIComponent(String(afterId))}` : '';
        let order = incremental ? 'id.asc' : 'created_at.desc';
        let rows = await this.deps.cloudJsonRequest(`/rest/v1/chat_messages?select=id,user_id,nickname,body,payload,created_at&created_at=gte.${encodeURIComponent(cutoff)}${cursor}&order=${order}&limit=${this.data.SOCIAL_CHAT_LIMIT}`, {});
        let current = Array.isArray(rows) ? rows.filter(row => this.isSocialChatMessageCurrent(row, now)) : [];
        return incremental ? current : current.reverse();
    }

    isSocialChatMessageCurrent(row, now = Date.now()) {
        let createdAt = new Date(row && row.created_at).getTime();
        return Number.isFinite(createdAt) && createdAt > now - this.data.SOCIAL_CHAT_RETENTION_MS;
    }

    mergeSocialChatMessages(current, incoming, now = Date.now()) {
        let byId = new Map();
        (current || []).concat(incoming || []).forEach(row => {
            if (row && Number.isFinite(Number(row.id)) && this.isSocialChatMessageCurrent(row, now)) byId.set(String(row.id), row);
        });
        return Array.from(byId.values()).sort((a, b) => Number(a.id) - Number(b.id)).slice(-this.data.SOCIAL_CHAT_LIMIT);
    }

    checkSendRateLimit() {
        let now = Date.now();
        this.state.current.sendTimestamps = this.state.current.sendTimestamps.filter(t => now - t < 60000);
        let last = this.state.current.sendTimestamps[this.state.current.sendTimestamps.length - 1] || 0;
        if (now - last < this.data.SOCIAL_SEND_MIN_INTERVAL_MS) return '메시지를 너무 빠르게 보냈습니다. 잠시 후 다시 시도해주세요.';
        if (this.state.current.sendTimestamps.length >= this.data.SOCIAL_SEND_MAX_PER_MIN) return this.deps._t('1분에 최대 {SOCIAL_SEND_MAX_PER_MIN}개까지 보낼 수 있습니다. 잠시 후 다시 시도해주세요.', { SOCIAL_SEND_MAX_PER_MIN: this.data.SOCIAL_SEND_MAX_PER_MIN });
        return true;
    }

    isForgottenSocialChat(row, now) {
        let forgotten = this.state.current.chatForgotten;
        if (!forgotten) return false;
        return (now < forgotten.until && Number(row.id) <= forgotten.through) || (forgotten.ids.get(String(row.id)) || 0) > now;
    }
}
