/** Native view owner. Existing markup and domain actions are preserved. */
export class ChatItemPickerView {
    constructor(deps) {
        this.deps=deps; this.active=true; this.modal=null; this.openOwner=null;
        for(const name of ["cellHtml","equipHtml","wardRowHtml","bagHtml","stumpCell","stumpHtml","pickerModal","drawItemPicker","openPicker","closePicker","attachPickedItem","showPickerTab","showBagPage"]) this[name]=this[name].bind(this);
        this.TABS=Object.freeze([['equip', '장착 장비'], ['bag', '인벤토리'], ['stump', '그루터기 함']]);
        this.tab='equip';
        this.bagPage=0;
    }

    /** One item in its place. opts: source and key (what getChatAttachSnapshot takes; no source = it cannot go in a chat line), cls,
    * style (its grid place), art, label (the slot name over an equipped item). */
    cellHtml(item, opts) {
        const snap = opts.source ? this.deps.getChatAttachSnapshot(opts.source, opts.key) : null;
        const classes = `chat-pick-cell rarity-${item.rarity || 'normal'}${item.corrupted ? ' is-corrupted' : ''} ${opts.cls || ''}`;
        const inner = `${opts.label ? `<small class="chat-pick-slot-name">${this.deps.escapeHTML(this.deps._t(opts.label))}</small>` : ''}<img src="${this.deps.escapeHTML(opts.art)}" alt="" draggable="false">`;
        if (!snap) return `<span class="${classes} is-locked" style="${opts.style || ''}" data-tip="${this.deps._t('채팅에 붙일 수 없는 아이템')}">${inner}</span>`;
        const tipKey = `${opts.source}:${opts.key}`;
        this.deps.socialState.pickTips[tipKey] = this.deps.renderProfileItemCard(snap);
        return `<button type="button" class="${classes}" style="${opts.style || ''}" aria-label="${this.deps.escapeHTML(this.deps._t('{name} 첨부', { name: snap.name }))}"
            onclick="chatItemPicker.pick('${opts.source}',${this.deps.escapeHTML(JSON.stringify(opts.key))})" onmouseenter="showSocialTip(event,'pick','${this.deps.escapeHTML(tipKey)}')"
            onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()">${inner}</button>`;
    }

    /** The equipped gear on the equipment window's slot layout (an empty slot shows its name), the core cell, and the ward row. */
    equipHtml() {
        const slots = this.deps.getPaperdollSlots(this.deps.game.equipment);
        // 코어 칸(장비 창과 같은 오른쪽 위).
        if (this.deps.game.equipment['코어'] || this.deps.contentProgression.isUnlocked('cube')) slots.push('코어');
        const cells = slots.map(slot => {
            const item = this.deps.game.equipment[slot], label = this.deps.getItemSlotDisplayLabel(null, slot.replace(/[123]$/, ''));
            if (!item) return `<span class="chat-pick-slot is-empty slot-${slot}"><small class="chat-pick-slot-name">${this.deps.escapeHTML(label)}</small></span>`;
            return this.cellHtml(item, { source: 'equip', key: slot, cls: `chat-pick-slot slot-${slot}`, art: this.deps.getEquipmentGridVisualAsset(item), label });
        }).join('');
        const layoutClass = `${slots.includes('반지3') ? ' has-ring3' : ''}${slots.includes('코어') ? ' has-core' : ''}`;
        return `<div class="equipment-paperdoll build-set-paperdoll chat-pick-doll${layoutClass}">${cells}</div>${this.wardRowHtml()}`;
    }

    /** The ward slots under the gear, as the equipment window shows them (js/colony-wards-ui.js slotsHtml): only the worn wards and the
    * open empty slots; nothing before the colony opens unless a ward is still worn. */
    wardRowHtml() {
        const equipment = this.deps.game.equipment, slots = this.deps.COLONY_WARD_RULES.slots, open = this.deps.colonyWards.slotCount();
        if (!this.deps.colonyWards.unlocked() && !slots.some(slot => equipment[slot])) return '';
        const cells = slots.map((slot, index) => equipment[slot]
            ? this.cellHtml(equipment[slot], { source: 'equip', key: slot, cls: 'chat-pick-ward', art: this.deps.getEquipmentGridVisualAsset(equipment[slot]) })
            : index < open ? '<span class="chat-pick-cell chat-pick-ward is-blank" aria-hidden="true"></span>' : '').join('');
        return `<h4 class="chat-pick-sub">${this.deps._t('액막이')}</h4><div class="chat-pick-wards">${cells}</div>`;
    }

    /** One bag page as the bag draws it: every item at its place and size, the page buttons above. */
    bagHtml() {
        const layout = this.deps.equipmentInventoryGridRuntime.ensureState(this.deps.game), pages = Math.max(1, layout.unlockedPageCount);
        this.bagPage = Math.min(this.bagPage, pages - 1);
        const shown = this.deps.equipmentInventoryGridRuntime.getPageLayout(layout, this.bagPage);
        const cells = shown.entries.map(({ item, column, row, columns, rows }) => this.cellHtml(item, { source: 'inv', key: this.deps.game.inventory.indexOf(item),
            style: `grid-column:${column + 1}/span ${columns};grid-row:${row + 1}/span ${rows}`, art: this.deps.getEquipmentGridVisualAsset(item) })).join('');
        const buttons = pages > 1 ? `<nav class="chat-pick-pages" aria-label="${this.deps._t('가방 쪽')}">${Array.from({ length: pages }, (_, index) =>
            `<button type="button" aria-pressed="${index === this.bagPage}" onclick="chatItemPicker.page(${index})">${index + 1}</button>`).join('')}</nav>` : '';
        return `${buttons}<div class="chat-pick-bag" style="--cols:${layout.columns};--rows:${layout.rowsPerPage}">${cells}</div>`;
    }

    stumpCell(item) { return this.cellHtml(item, { source: 'stump', key: item.id, art: this.deps.stumpBox.iconPath(item) }); }

    /** The stump box's 5×5 board (closed cells dark) and its storage. */
    stumpHtml() {
        const box = this.deps.game.stumpBox;
        if (!box || !box.acquired) return '<p class="chat-pick-empty">그루터기 함이 아직 없습니다.</p>';
        const board = box.board.map((id, cell) => {
            if (!this.deps.stumpBox.isOpen(this.deps.game, cell)) return '<span class="chat-pick-cell is-closed" aria-hidden="true"></span>';
            const item = id === null ? null : this.deps.stumpBox.itemById(this.deps.game, id);
            return item ? this.stumpCell(item) : '<span class="chat-pick-cell is-blank" aria-hidden="true"></span>';
        }).join('');
        const stored = this.deps.stumpBox.storage(this.deps.game).map(this.stumpCell).join('');
        return `<div class="chat-pick-stump"><div class="chat-pick-stump-board">${board}</div><h4 class="chat-pick-sub">${this.deps._t('보관함')}</h4>`
            + `<div class="chat-pick-stump-store">${stored || this.deps._t('<p class="chat-pick-empty">비어 있음</p>')}</div></div>`;
    }

    pickerModal() {
        let el = this.deps.document.getElementById('social-item-picker-modal');
        if (el) { this.modal=el; return el; }
        el = this.deps.document.createElement('div');
        el.id = 'social-item-picker-modal';
        el.className = 'social-modal-overlay';
        el.onclick = event => { if (event.target === el) this.closePicker(); };
        this.deps.document.body.appendChild(el);
        this.modal=el;
        return el;
    }

    drawItemPicker() {
        if (!this.current()) return;
        this.deps.socialState.pickTips = {};
        const body = this.tab === 'bag' ? this.bagHtml() : this.tab === 'stump' ? this.stumpHtml() : this.equipHtml();
        const tabs = this.TABS.map(([id, label]) => `<button type="button" class="chat-pick-tab" aria-pressed="${id === this.tab}" onclick="chatItemPicker.show('${id}')">${label}</button>`).join('');
        this.pickerModal().innerHTML = `<div class="social-modal-box chat-pick-box"><button class="social-modal-close" onclick="closeItemPicker()" aria-label="${this.deps._t('닫기')}">✕</button>
            <div class="social-modal-content"><h3 class="chat-pick-title">${this.deps._t('첨부할 아이템 선택 (최대 {SOCIAL_MAX_ITEMS_PER_MSG}개), 마우스를 올리면 옵션 표시', { SOCIAL_MAX_ITEMS_PER_MSG:this.deps.SOCIAL_MAX_ITEMS_PER_MSG })}</h3>
            <nav class="chat-pick-tabs" aria-label="${this.deps._t('아이템 위치')}">${tabs}</nav><div class="chat-pick-page is-${this.tab}">${body}</div></div></div>`;
    }

    openPicker() {
        if (!this.active) return;
        if (!this.deps.socialCloudReady()) { this.deps.showGameToast(this.deps._t('먼저 클라우드 로그인이 필요합니다.'), 'warning'); return; }
        this.openOwner=this.deps.game;
        this.drawItemPicker();
        this.pickerModal().style.display = 'flex';
    }

    closePicker() {
        this.deps.hideSocialTip();
        this.openOwner=null;
        const el = this.deps.document.getElementById('social-item-picker-modal');
        if (el) el.style.display = 'none';
    }

    attachPickedItem(source, key) {
        if (!this.current()) return;
        const snap = this.deps.getChatAttachSnapshot(source, key);
        if (snap && this.deps.attachChatSnapshot(snap)) this.closePicker();
    }

    showPickerTab(id) { if (!this.current()) return; this.tab = id; this.deps.hideSocialTip(); this.drawItemPicker(); }

    showBagPage(index) { if (!this.current()) return; this.bagPage = index; this.deps.hideSocialTip(); this.drawItemPicker(); }

    current() {
        if (!this.active) return false;
        if (this.openOwner === this.deps.game) return true;
        this.closePicker(); return false;
    }

    dispose() {
        if (!this.active) return;
        this.active=false;
        this.closePicker();
        if (this.modal) { this.modal.onclick=null; this.modal.remove(); }
        this.modal=null;
    }
}
