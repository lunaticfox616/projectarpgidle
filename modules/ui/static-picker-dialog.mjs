import { renderRarityFilterChips } from './static-inventory-filters.mjs';
import { getCraftPickerBodyHtml } from './static-picker-cards.mjs';
import { getCraftPickerPanelHtml, decorateCraftPickerCards } from './static-picker-frame.mjs';

export function prepareCraftItemPickerDialog(runtime, overlay, kind, closePicker) {

    const opener = runtime.deps.document.activeElement;
    runtime.state.pickerDialog = overlay;
    const host = opener?.closest('.tab-content, dialog');
    const tooltips = ['item-tooltip-box', 'info-tooltip'].map(id => runtime.deps.document.getElementById(id)).filter(Boolean)
        .map(node => ({ node, parent: node.parentNode, next: node.nextSibling }));
    (0, runtime.deps.hideItemTooltip)();
    (0, runtime.deps.hideInfoTooltip)();
    tooltips.forEach(({ node }) => overlay.appendChild(node));
    overlay.oncancel = event => { event.preventDefault(); closePicker(); };
    overlay.onclose = () => {
        if (runtime.state.pickerDialog !== overlay) return;
        runtime.state.pickerDialog = null;
        runtime.state.craftPickerKind = null;
        runtime.deps.craftPickerHostUi.unmount(); // 옮겨 온 장착 칸이나 가방은 창을 지우기 전에 장비 창으로 돌려놓는다
        (0, runtime.deps.hideItemTooltip)();
        (0, runtime.deps.hideInfoTooltip)();
        // 뒤쪽부터 복구하면 두 툴팁이 원래 서로 이웃한 경우에도 nextSibling을 보존한다.
        tooltips.slice().reverse().forEach(({ node, parent, next }) => {
            if (node.parentNode !== overlay) return;
            parent.insertBefore(node, next?.parentNode === parent ? next : null);
        });
        overlay.remove();
        const modal = [...runtime.deps.document.querySelectorAll('dialog:modal')].at(-1);
        if (modal && !modal.contains(host || opener)) return;
        // 대상을 고르면 제작실을 다시 그리므로, 사라진 단추 대신 같은 창의 같은 선택 단추를 찾는다.
        const target = opener?.isConnected ? opener : host?.querySelector(`button[onclick*="openCraftItemPickerOverlay('${kind}')"]`);
        target?.focus({ preventScroll: true });
    };

}

export function closeCraftItemPickerOverlay(runtime) {

    const overlay = runtime.state.pickerDialog;
    if (!overlay) return;
    overlay.close();
    // close 이벤트는 다음 task에 온다. 즉시 정리해 연속해서 열어도 이전 창이 새 창을 건드리지 않게 한다.
    overlay.onclose();

}

export function selectCraftPickerEquipment(runtime, slot) {

    if (!slot || !(runtime.deps.game.equipment || {})[slot]) return;
    if (typeof runtime.deps.hideItemTooltip === 'function') (0, runtime.deps.hideItemTooltip)();
    if (typeof runtime.deps.hideInfoTooltip === 'function') (0, runtime.deps.hideInfoTooltip)();
    (0, runtime.deps.selectForCrafting)(slot, true);
    closeCraftItemPickerOverlay(runtime);

}

export function selectCraftPickerInventoryItem(runtime, itemId) {

    let id = Number(itemId);
    if (!Number.isFinite(id) || !(runtime.deps.game.inventory || []).some(item => item && item.id === id)) return;
    if (typeof runtime.deps.hideItemTooltip === 'function') (0, runtime.deps.hideItemTooltip)();
    if (typeof runtime.deps.hideInfoTooltip === 'function') (0, runtime.deps.hideInfoTooltip)();
    (0, runtime.deps.selectForCrafting)(id, false);
    closeCraftItemPickerOverlay(runtime);

}

export function refreshCraftItemPickerOverlay(runtime) {

    let overlay = runtime.deps.document.getElementById('craft-item-picker-overlay');
    if (!overlay || !runtime.state.craftPickerKind) return;
    // 장비, 인벤토리 고르기 창은 장비 창의 진짜 칸을 옮겨 와 보여 준다(js/craft-picker-host-ui.js): 몸통을 다시 쓰면 그 칸이 문서에서 사라진다.
    // 등급 필터를 바꾸면 applyInventoryRarityFilterChange의 updateStaticUI가 옮겨 온 가방을 그 자리에서 다시 그린다.
    if (runtime.deps.craftPickerHostUi.shows(runtime.state.craftPickerKind)) return;
    let filterEl = overlay.querySelector('.craft-picker-filter');
    if (filterEl) filterEl.innerHTML = `<span class="inventory-view-filter-label">${(0, runtime.deps._t)('표시')}</span>${renderRarityFilterChips(runtime, 'picker')}`;
    let bodyEl = overlay.querySelector('.craft-picker-body');
    if (bodyEl) bodyEl.innerHTML = getCraftPickerBodyHtml(runtime, runtime.state.craftPickerKind, {query: overlay.querySelector('[name="craftSearch"]')?.value || '', page: Number(overlay.dataset.page) || 0});

}

export function openCraftItemPickerOverlay(runtime, kind, options = {}) {

    closeCraftItemPickerOverlay(runtime);
    // 장비와 인벤토리는 장비 창의 진짜 장착 칸과 가방을 옮겨 와 보여 준다(js/craft-picker-host-ui.js). 제단은 고를 수 있는 장비만 카드로.
    let real = kind === 'equip' || kind === 'inventory';
    runtime.state.craftPickerKind = kind;
    let overlay = runtime.deps.document.createElement('dialog');
    overlay.id = 'craft-item-picker-overlay';
    overlay.className = real ? 'craft-picker-overlay is-real' : 'craft-picker-overlay';
    overlay.setAttribute('aria-labelledby', 'craft-picker-title');
    overlay.onclick = event => {
        if (event.target === overlay) closeCraftItemPickerOverlay(runtime);
        const button = event.target.closest('[data-craft-page]');
        if (!button) return;
        overlay.dataset.page = button.dataset.craftPage; refreshCraftItemPickerOverlay(runtime);
    };
    overlay.onsubmit = event => { event.preventDefault(); overlay.dataset.page = '0'; refreshCraftItemPickerOverlay(runtime); };
    overlay.innerHTML = getCraftPickerPanelHtml(runtime, kind, real, options);
    if (real) runtime.deps.craftPickerHostUi.mount(overlay.querySelector('.craft-picker-body'), kind, { equip: runtime.handlers.selectCraftPickerEquipment, inventory: runtime.handlers.selectCraftPickerInventoryItem, refuse: runtime.handlers.refuseCraftPickerItem, ...options.picks });
    else decorateCraftPickerCards(runtime, overlay, kind);
    prepareCraftItemPickerDialog(runtime, overlay, kind, runtime.handlers.closeCraftItemPickerOverlay);
    runtime.deps.document.body.appendChild(overlay);
    overlay.showModal();
    if (real) (0, runtime.deps.updateStaticUI)(); // 장비 탭이 그려지지 않는 곳(낚시 작업대)에서 열어도 옮겨 온 칸을 지금 그린다

}
