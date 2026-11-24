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
    const open = { npc: runtime.deps.contentProgression.npcsMet(runtime.deps.game) || market, stall: market, hall: runtime.deps.contentProgression.isUnlocked('hall'),
        auction: runtime.deps.auctionHouse.canOpen(runtime.deps.game) };
    return runtime.state.MARKET_SECTIONS.filter(id => open[id]);
}

/** The trade window's screen that holds a section: NPC on the first, the auction, the stall and the hall on the second (js/ui.js MERGED_TAB_GROUPS trade). */
const screenOf = section => (section === 'npc' ? 'tab-trade' : 'tab-auction');

/** The screen the window's head tabs chose (the first one until the second is chosen). */
function chosenScreen(runtime) {
    const chosen = runtime.deps.game.settings && runtime.deps.game.settings.mergedTabSelection && runtime.deps.game.settings.mergedTabSelection.trade;
    return chosen === 'tab-auction' && runtime.deps.contentProgression.canOpen('tab-auction') ? 'tab-auction' : 'tab-trade';
}

/** The section the chosen screen shows: NPC on the first screen; on the second the one shown last when it is open, else the first open one
 * (the auction before the stall before the hall). */
function shownSection(runtime, open) {
    if (chosenScreen(runtime) === 'tab-trade') return 'npc';
    return [runtime.state.view_section, runtime.state.exchange, 'auction', 'stall', 'hall'].find(id => id !== 'npc' && open.includes(id)) || 'stall';
}

/** Shows a section, changing the window's screen when the section is on the other one. */
export function show(runtime, section) {
    if (!runtime.state.MARKET_SECTIONS.includes(section)) return;
    runtime.state.view_section = section;
    if (section !== 'npc') runtime.state.exchange = section;
    if (section === 'hall') (0, runtime.deps.loadPlayerExchange)();
    // The head tab is switched the way a press on it does (it also redraws this window); the same screen only redraws.
    if (chosenScreen(runtime) !== screenOf(section)) (0, runtime.deps.switchMergedTabSubtab)('trade', screenOf(section));
    else renderMarketUI(runtime);
}

/** Shows a tab of the auction (아이템, 재료, 내 출품): they stand on the second screen's tab row beside the stall and the hall. */
export function showAuctionTab(runtime, tab) {
    runtime.deps.auctionHouseUi.showTab(tab);
    show(runtime, 'auction');
    runtime.deps.auctionHouseUi.render(true);
}

export function open(runtime, section) {
    const target = runtime.state.MARKET_SECTIONS.includes(section) ? section : runtime.state.view_section;
    // 루프 정산 카드가 출품 때문에 막힌 루프에서 이 칸을 연다: 내 출품을 바로 보인다.
    if (section === 'auction' && runtime.deps.game.auction.lots.length) runtime.deps.auctionHouseUi.showTab('mine');
    runtime.state.view_section = target;
    if (target !== 'npc') runtime.state.exchange = target;
    (0, runtime.deps.switchMergedTabSubtab)('trade', screenOf(target));
    show(runtime, target);
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
    const open = runtime.api.openSections(), section = shownSection(runtime, open);
    runtime.api.section = section;
    if (section !== 'npc') runtime.state.exchange = section;
    if ((0, runtime.deps.isMarketUnlocked)()) (0, runtime.deps.refreshBlackMarket)(false);
    // The sections are shown first: a hidden section draws nothing.
    for (const id of ['auction', 'stall', 'hall']) runtime.deps.document.getElementById('market-panel-' + id).hidden = id !== section;
    renderMarketSection(runtime, section);
    paintExchangeTabs(runtime, panel, open, section);
}

/** The second screen's tab row: the auction's three tabs (their names and marks are the auction's), the stall and the hall. Only open ones
 * show; the chosen one is the shown section (for the auction, its shown tab). */
function paintExchangeTabs(runtime, panel, open, section) {
    const auctionTab = runtime.deps.auctionHouseUi.shownTab(), buttons = [...panel.querySelectorAll('[data-market-section]')];
    if (open.includes('auction')) runtime.deps.auctionHouseUi.paintTabLabels();
    for (const button of buttons) {
        const id = button.dataset.marketSection, active = id === section && (!button.dataset.ahTab || button.dataset.ahTab === auctionTab);
        button.hidden = !open.includes(id);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
    }
    panel.style.setProperty('--market-tabs', String(Math.max(1, buttons.filter(button => !button.hidden).length))); // css/themes/pixel.css .market-tabs
}

export function renderMarketSection(runtime, section) {
    if (section === 'npc') {
        if (runtime.deps.game.noti) runtime.deps.game.noti.npcs = false;
        runtime.deps.npcRosterUi.render();
    }
    if (section === 'stall') runtime.deps.playerStallUi.render();
    if (section === 'auction') runtime.deps.auctionHouseUi.render();
    if (runtime.deps.document.getElementById('black-market-dialog')?.open) runtime.deps.blackMarketUi.render();
}
