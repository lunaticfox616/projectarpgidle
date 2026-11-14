// chat-status: explicit account state and dependency ports; no ambient game/global state.
export class SocialChatStatus {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["isSocialTabActive","isSocialPageHidden","isSocialChatNotificationEnabled","socialChatPollDue","getLastSeenChatId","setLastSeenChatId","socialAdminView"].forEach(name => { this[name] = this[name].bind(this); });
    }

    getLastSeenChatId() {
        try {
            let v = this.deps.localStorage.getItem(this.data.SOCIAL_LAST_SEEN_CHAT_KEY);
            if (v == null || v === '') return null;
            let n = Number(v);
            return Number.isFinite(n) ? n : null;
        } catch (error) {
            this.deps.console.warn('[social] last-seen chat read failed:', error.message);
            return null;
        }
    }

    setLastSeenChatId(id) {
        let n = Number(id);
        if (!Number.isFinite(n)) return;
        let cur = this.getLastSeenChatId();
        if (cur != null && n <= cur) return;
        try { this.deps.localStorage.setItem(this.data.SOCIAL_LAST_SEEN_CHAT_KEY, String(n)); }
        catch (error) { this.deps.console.warn('[social] last-seen chat write failed:', error.message); }
    }

    isSocialTabActive() {
        return typeof this.deps.messageFrames === 'object' && this.deps.messageFrames.isTabVisible('chat');
    }

    isSocialChatNotificationEnabled() {
        return !(typeof this.deps.game !== 'undefined' && this.deps.game && this.deps.game.settings && this.deps.game.settings.socialChatNotifications === false);
    }

    isSocialPageHidden() {
        return typeof this.deps.document !== 'undefined' && this.deps.document.hidden === true;
    }

    socialChatPollDue(lastAt) {
        return !this.state.current.chatLive || Date.now() - lastAt >= this.data.SOCIAL_CHAT_LIVE_POLL_MS;
    }

    socialAdminView() {
        return typeof this.deps.location === 'object' && new this.deps.URLSearchParams(this.deps.location.search).get('admin') === '1';
    }
}
