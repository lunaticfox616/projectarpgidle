/** 채팅 입력 줄의 ＋(아이템 첨부) 창. 2026-10-27 사용자: "장착 장비 / 인벤토리 / 그루터기함 페이지를 나누고, 실제 모양처럼 만들어줘
 * (부적과 주얼은 이미 인벤토리 및 그루터기함에 포함되어 있으므로 이제 나눌 필요 없음)".
 * 장착 장비는 장비 창의 장착 칸 배치(.build-set-paperdoll, css/equipment-window.css)와 그 아래 액막이 칸 줄, 인벤토리는 가방 쪽과 같은
 * 격자(장비, 주얼, 코어, 액막이가 제 자리와 크기로, 쪽 단추), 그루터기 함은 5×5 판(닫힌 칸까지)과 보관함이다. 아이템을 누르면 입력 줄에
 * [이름]으로 붙고 창이 닫힌다. 마우스를 올리면 옵션 카드가 뜬다. 2026-10-27 사용자 "액막이 부적도 링크 가능하게, 장비창 및 그루터기함에
 * 들어가는데 링크가 불가능한 아이템들도 가능하게": 코어, 액막이, 씨앗과 수액, 흉터도 붙는다. 첨부, 카드, 툴팁은 js/social.js가
 * 만든다(getChatAttachSnapshot, attachChatSnapshot, renderProfileItemCard).
 */
const chatItemPicker = (() => {
    const TABS = Object.freeze([['equip', '장착 장비'], ['bag', '인벤토리'], ['stump', '그루터기 함']]);
    let tab = 'equip', bagPage = 0;

    /** One item in its place. opts: source and key (what getChatAttachSnapshot takes; no source = it cannot go in a chat line), cls,
     * style (its grid place), art, label (the slot name over an equipped item). */
    function cellHtml(item, opts) {
        const snap = opts.source ? getChatAttachSnapshot(opts.source, opts.key) : null;
        const classes = `chat-pick-cell rarity-${item.rarity || 'normal'}${item.corrupted ? ' is-corrupted' : ''} ${opts.cls || ''}`;
        const inner = `${opts.label ? `<small class="chat-pick-slot-name">${escapeHTML(opts.label)}</small>` : ''}<img src="${escapeHTML(opts.art)}" alt="" draggable="false">`;
        if (!snap) return `<span class="${classes} is-locked" style="${opts.style || ''}" data-tip="채팅에 붙일 수 없는 아이템">${inner}</span>`;
        const tipKey = `${opts.source}:${opts.key}`;
        socialState.pickTips[tipKey] = renderProfileItemCard(snap);
        return `<button type="button" class="${classes}" style="${opts.style || ''}" aria-label="${escapeHTML(`${snap.name} 첨부`)}"
            onclick="chatItemPicker.pick('${opts.source}',${escapeHTML(JSON.stringify(opts.key))})" onmouseenter="showSocialTip(event,'pick','${escapeHTML(tipKey)}')"
            onmousemove="moveSocialTip(event)" onmouseleave="hideSocialTip()">${inner}</button>`;
    }

    /** The equipped gear on the equipment window's slot layout (an empty slot shows its name), the core cell, and the ward row. */
    function equipHtml() {
        const slots = getPaperdollSlots(game.equipment);
        // 코어 칸(장비 창과 같은 오른쪽 위).
        if (game.equipment['코어'] || contentProgression.isUnlocked('cube')) slots.push('코어');
        const cells = slots.map(slot => {
            const item = game.equipment[slot], label = getItemSlotDisplayLabel(null, slot.replace(/[123]$/, ''));
            if (!item) return `<span class="chat-pick-slot is-empty slot-${slot}"><small class="chat-pick-slot-name">${escapeHTML(label)}</small></span>`;
            return cellHtml(item, { source: 'equip', key: slot, cls: `chat-pick-slot slot-${slot}`, art: getEquipmentGridVisualAsset(item), label });
        }).join('');
        const layoutClass = `${slots.includes('반지3') ? ' has-ring3' : ''}${slots.includes('코어') ? ' has-core' : ''}`;
        return `<div class="equipment-paperdoll build-set-paperdoll chat-pick-doll${layoutClass}">${cells}</div>${wardRowHtml()}`;
    }
    /** The ward slots under the gear, as the equipment window shows them (js/colony-wards-ui.js slotsHtml): only the worn wards and the
     * open empty slots; nothing before the colony opens unless a ward is still worn. */
    function wardRowHtml() {
        const equipment = game.equipment, slots = COLONY_WARD_RULES.slots, open = colonyWards.slotCount();
        if (!colonyWards.unlocked() && !slots.some(slot => equipment[slot])) return '';
        const cells = slots.map((slot, index) => equipment[slot]
            ? cellHtml(equipment[slot], { source: 'equip', key: slot, cls: 'chat-pick-ward', art: getEquipmentGridVisualAsset(equipment[slot]) })
            : index < open ? '<span class="chat-pick-cell chat-pick-ward is-blank" aria-hidden="true"></span>' : '').join('');
        return `<h4 class="chat-pick-sub">액막이</h4><div class="chat-pick-wards">${cells}</div>`;
    }

    /** One bag page as the bag draws it: every item at its place and size, the page buttons above. */
    function bagHtml() {
        const layout = equipmentInventoryGridRuntime.ensureState(game), pages = Math.max(1, layout.unlockedPageCount);
        bagPage = Math.min(bagPage, pages - 1);
        const shown = equipmentInventoryGridRuntime.getPageLayout(layout, bagPage);
        const cells = shown.entries.map(({ item, column, row, columns, rows }) => cellHtml(item, { source: 'inv', key: game.inventory.indexOf(item),
            style: `grid-column:${column + 1}/span ${columns};grid-row:${row + 1}/span ${rows}`, art: getEquipmentGridVisualAsset(item) })).join('');
        const buttons = pages > 1 ? `<nav class="chat-pick-pages" aria-label="가방 쪽">${Array.from({ length: pages }, (_, index) =>
            `<button type="button" aria-pressed="${index === bagPage}" onclick="chatItemPicker.page(${index})">${index + 1}</button>`).join('')}</nav>` : '';
        return `${buttons}<div class="chat-pick-bag" style="--cols:${layout.columns};--rows:${layout.rowsPerPage}">${cells}</div>`;
    }

    const stumpCell = item => cellHtml(item, { source: 'stump', key: item.id, art: stumpBox.iconPath(item) });
    /** The stump box's 5×5 board (closed cells dark) and its storage. */
    function stumpHtml() {
        const box = game.stumpBox;
        if (!box || !box.acquired) return '<p class="chat-pick-empty">그루터기 함이 아직 없습니다.</p>';
        const board = box.board.map((id, cell) => {
            if (!stumpBox.isOpen(game, cell)) return '<span class="chat-pick-cell is-closed" aria-hidden="true"></span>';
            const item = id === null ? null : stumpBox.itemById(game, id);
            return item ? stumpCell(item) : '<span class="chat-pick-cell is-blank" aria-hidden="true"></span>';
        }).join('');
        const stored = stumpBox.storage(game).map(stumpCell).join('');
        return `<div class="chat-pick-stump"><div class="chat-pick-stump-board">${board}</div><h4 class="chat-pick-sub">보관함</h4>`
            + `<div class="chat-pick-stump-store">${stored || '<p class="chat-pick-empty">비어 있음</p>'}</div></div>`;
    }

    function pickerModal() {
        let el = document.getElementById('social-item-picker-modal');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'social-item-picker-modal';
        el.className = 'social-modal-overlay';
        el.onclick = event => { if (event.target === el) closePicker(); };
        document.body.appendChild(el);
        return el;
    }
    function drawItemPicker() {
        socialState.pickTips = {};
        const body = tab === 'bag' ? bagHtml() : tab === 'stump' ? stumpHtml() : equipHtml();
        const tabs = TABS.map(([id, label]) => `<button type="button" class="chat-pick-tab" aria-pressed="${id === tab}" onclick="chatItemPicker.show('${id}')">${label}</button>`).join('');
        pickerModal().innerHTML = `<div class="social-modal-box chat-pick-box"><button class="social-modal-close" onclick="closeItemPicker()" aria-label="닫기">✕</button>
            <div class="social-modal-content"><h3 class="chat-pick-title">첨부할 아이템 선택 (최대 ${SOCIAL_MAX_ITEMS_PER_MSG}개), 마우스를 올리면 옵션 표시</h3>
            <nav class="chat-pick-tabs" aria-label="아이템 위치">${tabs}</nav><div class="chat-pick-page is-${tab}">${body}</div></div></div>`;
    }
    function openPicker() {
        if (!socialCloudReady()) { showGameToast('먼저 클라우드 로그인이 필요합니다.', 'warning'); return; }
        drawItemPicker();
        pickerModal().style.display = 'flex';
    }
    function closePicker() {
        hideSocialTip();
        const el = document.getElementById('social-item-picker-modal');
        if (el) el.style.display = 'none';
    }
    function attachPickedItem(source, key) {
        const snap = getChatAttachSnapshot(source, key);
        if (snap && attachChatSnapshot(snap)) closePicker();
    }
    function showPickerTab(id) { tab = id; hideSocialTip(); drawItemPicker(); }
    function showBagPage(index) { bagPage = index; hideSocialTip(); drawItemPicker(); }
    return Object.freeze({ open: openPicker, close: closePicker, pick: attachPickedItem, show: showPickerTab, page: showBagPage });
})();
const openItemPicker = () => chatItemPicker.open();
const closeItemPicker = () => chatItemPicker.close();
safeExposeGlobals({ chatItemPicker, openItemPicker, closeItemPicker });
