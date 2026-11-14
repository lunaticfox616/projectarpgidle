// presence-markup: explicit account state and dependency ports; no ambient game/global state.
export class SocialPresenceMarkup {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["renderChatOnlineCount","renderOnlineCounts","renderSocialOnlineResult","renderOnlineUsers","getSocialPresenceState"].forEach(name => { this[name] = this[name].bind(this); });
    }

    getSocialPresenceState(lastSeen, now = Date.now()) {
        let seenAt = new Date(lastSeen).getTime();
        if (!Number.isFinite(seenAt)) return '';
        let ageSeconds = Math.max(0, now - seenAt) / 1000;
        if (ageSeconds <= this.data.SOCIAL_ONLINE_WINDOW_S) return 'active';
        return ageSeconds <= this.data.SOCIAL_RECENT_WINDOW_S ? 'recent' : '';
    }

    renderChatOnlineCount(active, recent) {
        let badge = this.deps.document.getElementById('social-chat-online');
        if (!badge) return;
        badge.hidden = !this.state.current.onlineSupported || active + recent <= 0;
        let key = `${active}|${recent}|${this.deps.i18n.language}`;
        if (badge.dataset.counts === key) return;
        badge.dataset.counts = key;
        badge.innerHTML = `<span><i class="social-presence-dot active" aria-hidden="true"></i>${active}</span>`
            + `<span><i class="social-presence-dot recent" aria-hidden="true"></i>${recent}</span>`;
        // 화면 읽기 프로그램만 읽는 이름(마우스 설명은 아니다)
        badge.setAttribute('aria-label', this.deps._t('지금 접속 {active}명, 30분 안에 다녀간 사람 {recent}명', { active, recent }));
    }

    renderOnlineCounts(counts) {
        this.renderChatOnlineCount(Math.max(0, Math.floor(Number(counts.active) || 0)), Math.max(0, Math.floor(Number(counts.recent) || 0)));
    }

    renderSocialOnlineResult(result) {
        if (result && result.counts) this.renderOnlineCounts(result.counts); else this.renderOnlineUsers(result);
    }

    renderOnlineUsers(users, now = Date.now()) {
        let visible = (users || []).map(user => ({ user, state: this.getSocialPresenceState(user.last_seen, now) })).filter(row => row.state);
        this.renderChatOnlineCount(visible.filter(row => row.state === 'active').length, visible.filter(row => row.state !== 'active').length);
        let host = this.deps.document.getElementById('social-online');
        if (!host) return;
        if (!this.state.current.onlineSupported) { host.style.display = 'none'; return; }
        host.style.display = 'block';
        let myId = this.services.session.socialLoggedInUserId();
        let key = visible.length
            ? visible.map(row => `${row.user.user_id}:${row.user.nickname || ''}:${row.state}`).join(',')
            : 'empty';
        if (key === this.state.current.lastOnlineRenderKey) return;
        this.state.current.lastOnlineRenderKey = key;
        let activeCount = visible.filter(row => row.state === 'active').length;
        let recentCount = visible.length - activeCount;
        let chips = visible.length
            ? visible.map(row => {
                let u = row.user;
                let me = u.user_id === myId;
                return `<button type="button" class="social-online-chip ${row.state}${me ? ' me' : ''}" onclick="openPlayerProfile('${this.services.format.socialEscape(u.user_id)}')">`
                    + `<span class="social-presence-dot ${row.state}" aria-hidden="true"></span>`
                    + `<span>${this.services.format.socialEscape(u.nickname || '익명')}</span>${me ? this.deps._t('<em>나</em>') : ''}</button>`;
            }).join('')
            : `<span class="social-online-empty">${this.deps._t('지금은 조용합니다.')}</span>`;
        host.innerHTML = `<div class="social-online-title"><span>${this.deps._t('접속 상태')}</span><span class="social-presence-summary">`
            + `<span><i class="social-presence-dot active"></i>${activeCount}</span>`
            + `<span><i class="social-presence-dot recent"></i>${recentCount}</span></span></div>`
            + `<div class="social-online-list">${chips}</div>`;
    }
}
