// chat-markup: explicit account state and dependency ports; no ambient game/global state.
export class SocialChatMarkup {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["renderChatBody","renderChatItemLink","formatChatTime","scrollSocialChatToLatest","renderChatMessages"].forEach(name => { this[name] = this[name].bind(this); });
    }

    renderChatBody(m) {
        let body = String(m.body || '');
        let items = (m.payload && Array.isArray(m.payload.items)) ? m.payload.items.slice(0, this.data.SOCIAL_MAX_ITEMS_PER_MSG) : [];
        if (!items.length || body.indexOf('⟦') === -1) return this.services.format.socialEscape(body);
        let out = '', lastIndex = 0;
        let re = new RegExp(this.data.SOCIAL_ITEM_TOKEN_RE.source, 'g');
        let match;
        while ((match = re.exec(body)) !== null) {
            out += this.services.format.socialEscape(body.slice(lastIndex, match.index));
            let n = parseInt(match[1], 10);
            let snap = items[n];
            out += snap ? this.renderChatItemLink(`${m.id}:${n}`, snap) : this.services.format.socialEscape(match[0]);
            lastIndex = match.index + match[0].length;
        }
        out += this.services.format.socialEscape(body.slice(lastIndex));
        return out;
    }

    renderChatItemLink(key, snap) {
        let name = this.services.format.socialEscape(snap && snap.name), card = '', color = '';
        try {
            card = this.services.itemCards.renderProfileItemCard(snap);
            color = this.services.format.socialRarityColor(snap.rarity);
        } catch (error) {
            this.deps.console.warn('채팅 아이템 카드를 그리지 못했습니다:', error);
        }
        if (!card) return `<span class="social-item-link">[${name}]</span>`;
        this.state.current.chatTips[key] = card;
        return `<span class="social-item-link" style="border-color:${color};color:${color};" onmouseenter="showSocialTip(event,'chat','${this.services.format.socialEscape(key)}')" onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()" onclick="openTipModal('chat','${this.services.format.socialEscape(key)}')">[${name}]</span>`;
    }

    formatChatTime(iso) {
        let d = new Date(iso);
        if (!Number.isFinite(d.getTime())) return '';
        let mm = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
        let hh = String(d.getHours()).padStart(2, '0'), mi = String(d.getMinutes()).padStart(2, '0');
        return `${mm}/${dd} ${hh}:${mi}`;
    }

    scrollSocialChatToLatest(listEl) {
        if (!listEl) return;
        let apply = () => {
            if (listEl.isConnected === false) return;
            listEl.scrollTop = listEl.scrollHeight;
        };
        apply();
        if (typeof this.deps.requestAnimationFrame === 'function') this.deps.requestAnimationFrame(apply);
        if (typeof this.deps.setTimeout === 'function') this.deps.setTimeout(apply, 50);
    }

    renderChatMessages(messages, forceScroll) {
        let listEl = this.deps.document.getElementById('social-chat-list');
        if (!listEl) return;
        let myId = this.services.session.socialLoggedInUserId();
        // 채팅 목록이 실제로 보이는 시점 = 확인한 것으로 간주. 마지막 확인 id를 갱신해
        // 백그라운드 새 채팅 알림의 기준점을 옮기고, 커뮤니티 탭 알림 점을 끈다.
        let maxId = messages.reduce((acc, m) => Math.max(acc, Number(m.id) || 0), 0);
        if (maxId > 0) this.services.chatStatus.setLastSeenChatId(maxId);
        if (this.deps.game?.noti) this.deps.game.noti.social = false;
        this.services.noticeView.refreshSocialNotificationDots();
        let blocked = new Set(this.services.blocking.getBlockedUserIds());   // 차단한 사람의 줄은 이 기기에서 그리지 않는다(목록은 한 번만 읽는다)
        messages = messages.filter(m => !blocked.has(String(m.user_id)));
        let shouldScroll = this.shouldScrollChat(listEl, forceScroll);
        let key = messages.map(m => `${m.id}:${m.nickname}`).join(',');
        if (key === this.state.current.lastChatRenderKey) {
            if (shouldScroll) this.scrollSocialChatToLatest(listEl);
            this.state.current.scrollChatToLatestOnNextRender = false;
            return;
        }
        this.state.current.lastChatRenderKey = key;
        if (!messages.length) {
            listEl.innerHTML = `<div class="social-chat-empty"><span aria-hidden="true">◇</span><strong>${this.deps._t('아직 조용합니다')}</strong><small>${this.deps._t('첫 메시지를 남겨보세요.')}</small></div>`;
            this.state.current.scrollChatToLatestOnNextRender = false;
            return;
        }
        this.state.current.chatTips = {};
        let admin = this.services.chatStatus.socialAdminView();
        listEl.innerHTML = messages.map(m => {
            let mine = m.user_id === myId;
            let nickname = String(m.nickname || '익명');
            return `<article class="social-chat-msg${mine ? ' mine' : ''}">`
                + `<header class="social-chat-head"><button type="button" class="social-chat-author" onclick="openPlayerProfile('${this.services.format.socialEscape(m.user_id)}')">`
                + `<span class="social-chat-nick">${this.services.format.socialEscape(nickname)}</span></button>`
                + `${mine ? this.deps._t('<span class="social-chat-self">나</span>') : ''}<time class="social-chat-time">${this.formatChatTime(m.created_at)}</time>`
                + `${admin ? `<button type="button" class="social-chat-delete" data-chat-delete="${this.services.format.socialEscape(m.id)}" onclick="deleteChatMessage(this)">${this.deps._t('지우기')}</button>` : ''}</header>`
                + `<div class="social-chat-body">${this.renderChatBody(m)}</div></article>`;
        }).join('');
        if (shouldScroll) this.scrollSocialChatToLatest(listEl);
        this.state.current.scrollChatToLatestOnNextRender = false;
    }

    shouldScrollChat(listEl, forceScroll) {
        const nearBottom = (listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight) < 60;
        return !!forceScroll || this.state.current.scrollChatToLatestOnNextRender || nearBottom;
    }
}
