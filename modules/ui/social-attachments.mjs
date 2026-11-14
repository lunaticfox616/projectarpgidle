// attachments: explicit account state and dependency ports; no ambient game/global state.
export class SocialAttachments {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["getChatAttachSnapshot","buildChatItemSnapshot","chatItemLabel","toChatBody","insertChatItemLabel","attachChatSnapshot","attachChatItem","attachChatItemOf","removePendingChatItem","renderPendingChatItems","updateChatCounter"].forEach(name => { this[name] = this[name].bind(this); });
    }

    getChatAttachSnapshot(source, key) {
        let state = typeof this.deps.game !== 'undefined' && this.deps.game ? this.deps.game : {};
        if (source === 'equip') return this.buildChatItemSnapshot((state.equipment || {})[key], key);
        if (source === 'inv') return this.buildChatItemSnapshot((state.inventory || [])[Number(key)]);
        if (source === 'stump' && state.stumpBox) return this.services.snapshot.buildStumpItemCard(this.deps.stumpBox.itemById(state, Number(key)), this.deps.stumpBox.evaluate(state));
        return null;
    }

    buildChatItemSnapshot(item, slot) {
        if (!item) return null;
        if (this.deps.bagItems.isJewel(item)) return this.services.snapshot.buildJewelSnapshot(item);
        if (this.deps.bagItems.isCore(item)) return this.services.snapshot.buildCoreCard(item);
        // 끼운 액막이도 칸 이름(액막이1..) 대신 액막이로 적는다: 카드가 그 이름으로 액막이를 알아본다(profileItemOptionsHtml).
        return this.services.snapshot.buildItemSnapshot(item, this.deps.colonyWards.isWard(item) ? undefined : slot);
    }

    chatItemLabel(snap) {
        return `[${String(snap && snap.name || '아이템')}]`;
    }

    toChatBody(text, pending) {
        let body = String(text || ''), items = [];
        pending.forEach(snap => {
            let label = this.chatItemLabel(snap), at = body.indexOf(label);
            if (at < 0) return;
            body = body.slice(0, at) + `⟦${items.length}⟧` + body.slice(at + label.length);
            items.push(snap);
        });
        return { body, items };
    }

    insertChatItemLabel(inputEl, label) {
        let value = String(inputEl.value || ''), start = inputEl.selectionStart ?? value.length, end = inputEl.selectionEnd ?? start;
        let before = value.slice(0, start), gap = before && !/\s$/.test(before) ? ' ' : '';
        inputEl.value = `${before}${gap}${label} ${value.slice(end)}`;
        let caret = before.length + gap.length + label.length + 1;
        inputEl.focus();
        inputEl.setSelectionRange(caret, caret);
    }

    attachChatSnapshot(snap) {
        if (this.state.current.pendingChatItems.length >= this.data.SOCIAL_MAX_ITEMS_PER_MSG) { this.deps.showGameToast(this.deps._t('메시지당 최대 {SOCIAL_MAX_ITEMS_PER_MSG}개의 아이템만 첨부할 수 있습니다.', { SOCIAL_MAX_ITEMS_PER_MSG: this.data.SOCIAL_MAX_ITEMS_PER_MSG }), 'warning'); return false; }
        this.state.current.pendingChatItems.push(snap);
        let inputEl = this.deps.document.getElementById('social-chat-input');
        if (inputEl) this.insertChatItemLabel(inputEl, this.chatItemLabel(snap));
        this.renderPendingChatItems();
        this.updateChatCounter();
        return true;
    }

    attachChatItem(source, idx) {
        let snap = this.getChatAttachSnapshot(source, idx);
        if (snap) this.attachChatSnapshot(snap);
    }

    attachChatItemOf(item, slot) {
        if (!this.services.identity.getMyNickname()) return this.deps.showGameToast(this.deps._t('닉네임을 정하면 아이템을 채팅에 붙일 수 있습니다.'), 'warning');
        let snap = this.buildChatItemSnapshot(item, slot);
        if (!snap) return this.deps.showGameToast(this.deps._t('이 아이템은 채팅에 붙일 수 없습니다.'), 'warning');
        this.attachChatSnapshot(snap);
    }

    removePendingChatItem(idx) {
        let [snap] = this.state.current.pendingChatItems.splice(idx, 1);
        let inputEl = this.deps.document.getElementById('social-chat-input');
        if (inputEl && snap) inputEl.value = String(inputEl.value || '').replace(this.chatItemLabel(snap), '').replace(/ {2,}/g, ' ').trim();
        this.renderPendingChatItems();
        this.updateChatCounter();
    }

    renderPendingChatItems() {
        let host = this.deps.document.getElementById('social-pending-items');
        if (!host) return;
        if (!this.state.current.pendingChatItems.length) { host.innerHTML = ''; host.style.display = 'none'; return; }
        host.style.display = 'flex';
        host.innerHTML = this.state.current.pendingChatItems.map((it, i) => {
            let color = this.services.format.socialRarityColor(it.rarity);
            return `<span class="social-pending-chip" style="border-color:${color};color:${color};">${this.services.format.socialEscape(this.chatItemLabel(it))}<button onclick="removePendingChatItem(${i})" aria-label="${this.deps._t('첨부 취소')}" data-tip="${this.deps._t('첨부 취소')}">✕</button></span>`;
        }).join('');
    }

    updateChatCounter() {
        let inputEl = this.deps.document.getElementById('social-chat-input');
        let counterEl = this.deps.document.getElementById('social-chat-counter');
        if (!inputEl || !counterEl) return;
        let len = this.toChatBody(inputEl.value, this.state.current.pendingChatItems).body.length; // 보낼 글의 길이([이름]은 ⟦번호⟧로 줄어든다)
        counterEl.textContent = `${len}/${this.data.SOCIAL_MSG_MAX}`;
        counterEl.style.color = len > this.data.SOCIAL_MSG_MAX ? '#e88' : 'var(--copy-muted)';
    }
}
