// realtime: explicit account state and dependency ports; no ambient game/global state.
export class SocialRealtime {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["socialAccessToken","socialChatRealtime","receiveLiveChat","showLiveChat","onLiveChatStatus","openLiveChat","syncLiveChat","wantsLiveChat","releaseIdleLiveChat"].forEach(name => { this[name] = this[name].bind(this); });
    }

    socialAccessToken() {
        return (typeof this.deps.cloudState !== 'undefined' && this.deps.cloudState && this.deps.cloudState.session && this.deps.cloudState.session.access_token) || '';
    }

    socialChatRealtime() {
        if (this.state.current.chatRealtime) return this.state.current.chatRealtime;
        let base = typeof this.deps.window !== 'undefined' ? this.deps.window.supabaseClient : null;
        if (!base || !base.supabaseUrl || !base.supabaseKey || !this.deps.window.supabase || typeof this.deps.window.supabase.createClient !== 'function') return null;
        this.state.current.chatRealtime = this.deps.window.supabase.createClient(base.supabaseUrl, base.supabaseKey, {
            accessToken: async () => this.socialAccessToken() || null,
            realtime: { disconnectOnEmptyChannelsAfterMs: 0 }   // 채널을 놓으면 소켓도 바로 닫는다(동시 연결 수)
        });
        return this.state.current.chatRealtime;
    }

    receiveLiveChat(row) {
        if (!row || !Number.isFinite(Number(row.id)) || !this.services.chatData.isSocialChatMessageCurrent(row)) return;
        this.state.current.chatLiveMisses = 0;
        this.state.current.chatLive = true;
        // 첫 전체 조회가 끝나기 전에 온 행도 보관한다. 조회 응답이 늦게 와도 이 행을 덮지 않는다.
        if (!this.services.chatData.isForgottenSocialChat(row, Date.now())) this.state.current.chatMessages = this.services.chatData.mergeSocialChatMessages(this.state.current.chatMessages, [row]);
        this.showLiveChat(row);
    }

    showLiveChat(row) {
        if (!this.services.chatStatus.isSocialTabActive()) {
            if (typeof this.deps.game !== 'undefined' && this.deps.game && this.deps.game.noti) this.services.noticeView.noteIncomingChats([row]);
            return;
        }
        if (this.state.current.chatInitialized) this.services.chatMarkup.renderChatMessages(this.state.current.chatMessages, false);
        if (row.user_id !== this.services.session.socialLoggedInUserId()) this.services.presence.onlineChat.refresh(false);
    }

    onLiveChatStatus(status) {
        if (status === 'SUBSCRIBED') {
            this.state.current.chatLive = this.state.current.chatLiveMisses < this.data.SOCIAL_CHAT_LIVE_MISSES;
            this.state.current.chatLiveSince = Date.now();
            // 연결되기 전과 끊긴 사이에 온 채팅: 채팅 조회와 알림 조회가 다음 차례에 바로 읽어 메운다.
            this.state.current.lastChatPollAt = 0;
            this.state.current.lastChatNoticeAt = 0;
            return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') this.state.current.chatLive = false;
    }

    openLiveChat() {
        if (this.state.current.chatChannel || !this.socialAccessToken()) return;
        let client = this.socialChatRealtime();
        if (!client) return;
        this.state.current.chatChannelUserId = this.services.session.socialLoggedInUserId();
        let context = this.services.session.socialSessionContext();
        this.state.current.chatChannelSession = context;
        // 남이 보낸 줄이 어떤 모양이든 받기는 멈추지 않는다: 한 줄을 다루다 난 오류는 남기고 다음 줄을 받는다.
        let channel = client.channel('social-chat')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, change => {
                if (this.state.current.chatChannel !== channel || !this.services.session.isSocialSessionCurrent(context)) return;
                try { this.receiveLiveChat(change && change.new); } catch (error) { this.deps.console.warn('실시간 채팅 한 줄을 처리하지 못했습니다:', error); }
            })
            // 운영자가 지운 줄(한 줄 지우기, 전체 비우기): 삭제 알림은 지운 줄의 id만 싣는다. 실시간이 아닌 창은 5분 전체 조회에서 빠진다.
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, change => {
                if (this.state.current.chatChannel !== channel || !this.services.session.isSocialSessionCurrent(context)) return;
                let id = change && change.old && change.old.id;
                if (id != null) this.services.polling.forgetSocialChatMessages([id]);
            });
        this.state.current.chatChannel = channel;
        // 토큰을 먼저 건다: 구독 요청이 이 토큰을 싣고 나가야 처음부터 로그인한 사용자로 읽는다(라이브러리는 토큰을 한 박자 늦게 넣는다).
        Promise.resolve(client.realtime.setAuth(this.socialAccessToken())).then(() => {
            if (this.state.current.chatChannel !== channel || !this.services.session.isSocialSessionCurrent(context)) return;
            channel.subscribe(status => { if (this.state.current.chatChannel === channel && this.services.session.isSocialSessionCurrent(context)) this.onLiveChatStatus(status); });
        }).catch(error => {
            if (this.state.current.chatChannel === channel) this.services.reset.closeLiveChat();
            this.deps.console.warn('채팅 실시간 연결 준비 실패:', error);
        });
    }

    syncLiveChat() {
        if (!this.services.session.socialCloudReady() || (this.state.current.chatChannel && !this.services.session.isSocialSessionCurrent(this.state.current.chatChannelSession))) this.services.reset.closeLiveChat();
        if (!this.services.session.socialCloudReady()) return;
        if (this.services.chatStatus.isSocialPageHidden() || !this.wantsLiveChat()) {
            if (this.state.current.chatChannel && !this.state.current.chatLiveHiddenTimer) this.state.current.chatLiveHiddenTimer = this.deps.setTimeout(this.releaseIdleLiveChat, this.data.SOCIAL_CHAT_LIVE_HIDDEN_MS);
            return;
        }
        this.deps.clearTimeout(this.state.current.chatLiveHiddenTimer);
        this.state.current.chatLiveHiddenTimer = null;
        this.openLiveChat();
    }

    wantsLiveChat() {
        return this.services.chatStatus.isSocialTabActive() || this.services.chatStatus.isSocialChatNotificationEnabled();
    }

    releaseIdleLiveChat() {
        this.state.current.chatLiveHiddenTimer = null;
        if (this.services.chatStatus.isSocialPageHidden() || !this.wantsLiveChat()) this.services.reset.closeLiveChat();
    }
}
