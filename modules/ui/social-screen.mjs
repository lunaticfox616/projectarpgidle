// screen: explicit account state and dependency ports; no ambient game/global state.
export class SocialScreen {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["getSocialRenderRoot","takeChatDraft","restoreChatDraft","renderSocialTab","chatSettingsBody","renderBlockedUsersRow","openChatSettings","refreshChatSettings"].forEach(name => { this[name] = this[name].bind(this); });
    }

    getSocialRenderRoot(host) {
        let root = host.querySelector(':scope > .social-root');
        if (!root) {
            root = this.deps.document.createElement('div');
            root.className = 'social-root';
            host.appendChild(root);
        }
        return root;
    }

    takeChatDraft() {
        let input = this.deps.document.getElementById('social-chat-input');
        if (!input || !input.value || this.state.current.chatDraftUserId !== this.services.session.socialLoggedInUserId()) return null;
        return { text: String(input.value), start: input.selectionStart, end: input.selectionEnd, focused: this.deps.document.activeElement === input };
    }

    restoreChatDraft(draft) {
        this.state.current.chatDraftUserId = this.services.session.socialLoggedInUserId();
        let input = this.deps.document.getElementById('social-chat-input');
        if (!draft || !input) return;
        input.value = draft.text;
        if (!draft.focused || input.disabled) return;
        input.focus({ preventScroll: true });
        if (typeof input.setSelectionRange === 'function' && Number.isFinite(draft.start)) input.setSelectionRange(draft.start, draft.end);
    }

    renderSocialTab() {
        let host = this.deps.document.getElementById('tab-social');
        if (!host) return;
        let root = this.getSocialRenderRoot(host);
        let loggedIn = this.services.session.socialCloudReady();
        let nickname = this.services.identity.getMyNickname();
        this.services.background.syncSocialBackgroundTasks();
        if (!loggedIn) {
            this.renderCloudNotice(root);
            this.services.reset.stopChatPolling();
            return;
        }
        // 채팅 창에는 대화와 입력 줄만 둔다. 닉네임, 프로필, 동기화, 차단한 사람, 접속자는 ⚙ 창(openChatSettings, 2026-10-03).
        let draft = this.takeChatDraft();
        root.innerHTML = `
            ${nickname ? '' : this.deps._t('<div class="social-notice social-nickname-notice">닉네임을 정하면 채팅할 수 있습니다. <button type="button" onclick="promptAndSetNickname()">닉네임 정하기</button></div>')}
            <div class="social-chat-wrap">
                <span id="social-chat-online" class="social-chat-online" hidden></span>
                <div id="social-chat-list" class="social-chat-list"><div class="social-chat-empty"><span aria-hidden="true">◇</span><strong>${this.deps._t('대화를 불러오는 중')}</strong></div></div>
                <div id="social-pending-items" class="social-pending-items" style="display:none;"></div>
                <div class="social-chat-inputbar">
                    <button class="social-attach-btn" onclick="openItemPicker()" data-tip="${this.deps._t('아이템 첨부')}" aria-label="${this.deps._t('아이템 첨부')}" ${nickname ? '' : 'disabled'}><span aria-hidden="true">＋</span> ${this.deps._t('첨부')}</button>
                    <div class="social-chat-input-shell">
                        <input id="social-chat-input" name="social-chat-message" type="text" maxlength="${this.data.SOCIAL_MSG_MAX}" placeholder="${nickname ? this.deps._t('메시지를 입력하세요…') : this.deps._t('먼저 닉네임을 설정하세요')}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" onkeydown="onSocialChatKeydown(event)" oninput="updateChatCounter()" ${nickname ? '' : 'disabled'}>
                        <span id="social-chat-counter" class="social-chat-counter">0/${this.data.SOCIAL_MSG_MAX}</span>
                    </div>
                    <button id="social-chat-send" class="social-send-btn" onclick="sendChatMessage()" ${nickname ? '' : 'disabled'}>${this.deps._t('전송')}</button>
                </div>
            </div>`;
        this.restoreChatDraft(draft);
        this.state.current.lastChatRenderKey = '';
        this.state.current.lastOnlineRenderKey = '';
        this.state.current.scrollChatToLatestOnNextRender = true;
        this.services.attachments.renderPendingChatItems();
        this.services.attachments.updateChatCounter();
        this.services.composerControls.updateChatSendButton();
        this.services.presence.ensureHeartbeat();
        this.services.polling.startChatPolling();
        this.services.nickname.restoreNicknameFromServer().then(restored => { if (!this.state.disposed && restored !== nickname) this.renderSocialTab(); });
    }

    renderCloudNotice(root) {
        let checkingCloud = typeof this.deps.cloudState !== 'undefined' && this.deps.cloudState
            && (this.deps.cloudState.busy || this.deps.cloudState.initialized === false);
        root.innerHTML = checkingCloud
            ? `<div class="social-notice social-notice-loading"><strong>${this.deps._t('클라우드 세션을 연결하는 중입니다.')}</strong><br>${this.deps._t('연결이 끝나면 채팅이 이 화면에서 자동으로 열립니다.')}</div>`
            : `<div class="social-notice social-empty-state"><span class="social-empty-sigil" aria-hidden="true">✦</span><strong>${this.deps._t('클라우드 커뮤니티')}</strong><p>${this.deps._t('로그인하면 채팅과 프로필을 바로 쓸 수 있습니다.')}</p><button type="button" onclick="closeCommunityDock(); openStartupGate({ accountOnly: true })">${this.deps._t('로그인 화면 열기')}</button></div>`;
    }

    chatSettingsBody() {
        if (!this.services.session.socialCloudReady()) {
            return '<div class="chat-settings"><p class="social-notice">로그인하면 닉네임, 공개 프로필, 접속자 목록을 쓸 수 있습니다.</p>'
                + `<button type="button" onclick="selectionDialog.close('${this.data.CHAT_SETTINGS_ID}'); closeCommunityDock(); openStartupGate({ accountOnly: true })">${this.deps._t('로그인 화면 열기')}</button></div>`;
        }
        let nickname = this.services.identity.getMyNickname();
        return `<div class="chat-settings">
            <div class="chat-settings-row"><span>${this.deps._t('닉네임')}</span><strong>${nickname ? this.services.format.socialEscape(nickname) : this.deps._t('<em>미설정</em>')}</strong>
                <button type="button" onclick="promptAndSetNickname()">${nickname ? this.deps._t('바꾸기') : this.deps._t('정하기')}</button></div>
            <div class="chat-settings-row"><span>${this.deps._t('공개 프로필')}</span>
                <button type="button" onclick="openMyProfilePreview()">${this.deps._t('보기')}</button>
                <button type="button" onclick="syncPlayerProfile()" data-tip="${this.deps._t('지금 장비와 능력치를 공개 프로필에 올립니다')}">${this.deps._t('동기화')}</button></div>
            ${this.renderBlockedUsersRow()}
            <div id="social-online" class="social-online" style="display:none;"></div>
        </div>`;
    }

    renderBlockedUsersRow() {
        let blocked = this.services.blocking.getBlockedUsers();
        if (!blocked.length) return '';
        let chips = blocked.map(entry => `<button type="button" data-user-id="${this.services.format.socialEscape(entry.id)}" onclick="unblockUser(this.dataset.userId)">${this.deps._t('{name} 풀기', { name: this.services.format.socialEscape(entry.name || entry.id.slice(0, 8)) })}</button>`).join('');
        return `<div class="chat-settings-row"><span>${this.deps._t('차단한 사람')}</span>${chips}</div>`;
    }

    openChatSettings() {
        this.deps.selectionDialog.show({ id: this.data.CHAT_SETTINGS_ID, title: this.deps._t('채팅 설정'), panelClass: 'chat-settings-panel', body: this.chatSettingsBody() });
        if (!this.services.session.socialCloudReady()) return;
        this.state.current.lastOnlineRenderKey = '';
        this.services.presence.refreshOnlineUsers(true);
    }

    refreshChatSettings() {
        if (this.deps.selectionDialog.isOpen(this.data.CHAT_SETTINGS_ID)) this.openChatSettings();
    }
}
