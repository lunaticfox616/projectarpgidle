import { listenView, releaseViewTarget } from './view-events.mjs';

export function moveTab(runtime, event) {
    const buttons = [...event.currentTarget.querySelectorAll('button:not([hidden])')];
    const index = buttons.indexOf(runtime.deps.document.activeElement), count = buttons.length;
    const next = {ArrowLeft:(index+count-1)%count, ArrowRight:(index+1)%count, Home:0, End:count-1}[event.key];
    if (next === undefined) return;
    event.preventDefault();buttons[next].click();buttons[next].focus();
}

export function openSections(runtime) {
    const market = (0, runtime.deps.isMarketUnlocked)();
    const open = { npc: runtime.deps.contentProgression.npcsMet(runtime.deps.game) || market, stall: market, hall: runtime.deps.contentProgression.isUnlocked('hall') };
    return runtime.state.MARKET_SECTIONS.filter(id => open[id]);
}

export function show(runtime, section) {
    if (!runtime.state.MARKET_SECTIONS.includes(section)) return;
    runtime.state.view_section = section;
    if (section === 'hall') (0, runtime.deps.loadPlayerExchange)();
    renderMarketUI(runtime);
}

export function open(runtime, section) {
    runtime.state.view_section = runtime.state.MARKET_SECTIONS.includes(section) ? section : runtime.state.view_section;
    (0, runtime.deps.switchTab)('tab-trade');
    show(runtime, runtime.state.view_section);
}

export function openHallPicker(runtime) {
    runtime.deps.window.openCraftItemPickerOverlay('inventory', { title: (0, runtime.deps._t)('장비 전당에 전시할 장비 선택'), desc: (0, runtime.deps._t)('장비를 누르면 전시할 장비로 고릅니다.'),
        picks: { inventory: runtime.handlers.marketPickHallItem, blocked: runtime.deps.hallItemIssue } });
}

export function blackCardHtml(runtime) {
    if (!(0, runtime.deps.isMarketUnlocked)()) return '';
    return `<li class="npc-roster-item" data-tone="crimson"><button type="button" class="npc-roster-card is-black" data-black-open>
            <span class="npc-roster-face is-black-trader"><img class="npc-roster-portrait" src="${runtime.state.MARKET_BLACK_FACE}" alt=""></span>
            <span class="npc-roster-text"><strong>${(0, runtime.deps._t)('암거래상')}</strong><span class="npc-roster-tags"><em class="is-shop">${(0, runtime.deps._t)('공격 룬, 제작 베이스, 고유 장비')}</em></span></span></button>
            <span class="npc-roster-actions"><button type="button" data-black-open>${(0, runtime.deps._t)('상점')}</button></span></li>`;
}

export function openBlack(runtime) {
    if (!runtime.active) return;
    const board = runtime.deps.document.getElementById('market-panel-black'), home = runtime.deps.document.getElementById('market-panel-npc');
    if (!(0, runtime.deps.isMarketUnlocked)() || !board || !home || runtime.deps.document.getElementById('black-market-dialog')) return;
    const dialog = runtime.deps.document.createElement('dialog');
    dialog.id = 'black-market-dialog';
    dialog.className = 'npc-dialog is-shop is-black';
    dialog.dataset.tone = 'crimson';
    dialog.setAttribute('aria-labelledby', 'black-market-name');
    dialog.innerHTML = `<figure class="npc-dialog-figure is-black-trader"><img class="npc-dialog-portrait" src="${runtime.state.MARKET_BLACK_FACE}" alt=""></figure>
            <div class="npc-dialog-main"><header class="npc-dialog-head"><div class="npc-dialog-who"><h2 id="black-market-name">${(0, runtime.deps._t)('암거래상')}</h2></div>
            <button type="button" class="npc-dialog-close" data-black-close>${(0, runtime.deps._t)('닫기')}</button></header></div>`;
    dialog.querySelector('.npc-dialog-main').append(board);
    board.hidden = false;
    runtime.blackDialog = { dialog, board, home };
    listenView(runtime, dialog, 'click', event => { if (event.target.closest('[data-black-close]')) dialog.close(); });
    listenView(runtime, dialog, 'close', () => {
        closeMarketBlackDialog(runtime);
        if (runtime.active) renderMarketUI(runtime);
    }, { once: true });
    runtime.deps.document.body.append(dialog);
    (0, runtime.deps.refreshBlackMarket)(false);
    runtime.deps.blackMarketUi.render();
    dialog.showModal();
}

/** Restore the moved board before releasing this view's own dialog. */
export function closeMarketBlackDialog(runtime) {
    const owned = runtime.blackDialog;
    if (!owned) return;
    runtime.blackDialog = null;
    releaseViewTarget(runtime, owned.dialog);
    owned.board.hidden = true;
    owned.home.append(owned.board);
    if (owned.dialog.open) owned.dialog.close();
    owned.dialog.remove();
}

export function marketPickHallItem(runtime, itemId) {
    (0, runtime.deps.hideItemTooltip)();
    runtime.deps.window.closeCraftItemPickerOverlay();
    (0, runtime.deps.selectPlayerHallItem)(itemId);
}

export function renderMarketUI(runtime) {
    if (!runtime.active) return;
    const panel = runtime.deps.document.getElementById('ui-market-panel');
    if (!panel) return;
    const open = runtime.api.openSections();
    if (!open.includes(runtime.api.section)) runtime.api.section = open[0] || 'npc';
    if ((0, runtime.deps.isMarketUnlocked)()) (0, runtime.deps.refreshBlackMarket)(false);
    panel.style.setProperty('--market-tabs', String(Math.max(1, open.length))); // css/themes/pixel.css .market-tabs
    for (const button of panel.querySelectorAll('[data-market-section]')) {
        const id = button.dataset.marketSection, active = id === runtime.api.section;
        button.hidden = !open.includes(id);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
        runtime.deps.document.getElementById('market-panel-' + id).hidden = !active;
    }
    renderMarketSection(runtime, runtime.api.section);
}

export function renderMarketSection(runtime, section) {
    if (section === 'npc') {
        if (runtime.deps.game.noti) runtime.deps.game.noti.npcs = false;
        runtime.deps.npcRosterUi.render();
    }
    if (section === 'stall') runtime.deps.playerStallUi.render();
    if (runtime.deps.document.getElementById('black-market-dialog')?.open) runtime.deps.blackMarketUi.render();
}
