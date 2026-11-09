/** 거래 창 (메뉴의 거래 단추, 2026-11-06 사용자: "거래소에서 이름 바꾸고 탭 안에 NPC와 장비 전당을 집어넣고", "NPC 안에 암거래상도", 같은 날
 * "장비 탭에 있는 거래를 탭 하나 새로 만들어서"): NPC(만난 NPC와
 * 암거래상의 카드, js/npc-roster-ui.js, 재화 교환은 오르가의 창 js/orga-exchange-ui.js), 가판대(js/player-stall-ui.js), 장비 전당
 * (js/player-exchange.js). 열린 칸만 보이고, 고른 칸이 닫히면 첫 열린 칸을 본다. 암거래상(js/black-market-ui.js)은 거래소 해금 뒤 NPC 칸의
 * 카드로 서고, 누르면 NPC 창 모양의 창이 뜨며 #market-panel-black 판이 그 안으로 옮겨 갔다가 창을 닫으면 돌아온다. 거래 자체는 각 모듈의 몫이다. */
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
function marketPickHallItem(itemId) {
    hideItemTooltip();
    window.closeCraftItemPickerOverlay();
    selectPlayerHallItem(itemId);
}

function renderMarketUI() {
    const panel = document.getElementById('ui-market-panel');
    if (!panel) return;
    const open = marketUi.openSections();
    if (!open.includes(marketUi.section)) marketUi.section = open[0] || 'npc';
    if (isMarketUnlocked()) refreshBlackMarket(false);
    panel.style.setProperty('--market-tabs', String(Math.max(1, open.length))); // css/themes/pixel.css .market-tabs
    for (const button of panel.querySelectorAll('[data-market-section]')) {
        const id = button.dataset.marketSection, active = id === marketUi.section;
        button.hidden = !open.includes(id);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
        document.getElementById('market-panel-' + id).hidden = !active;
    }
    renderMarketSection(marketUi.section);
}

/** The shown section's own drawing (the hall draws itself when it loads, js/player-exchange.js); the black market while its window is open. */
function renderMarketSection(section) {
    if (section === 'npc') {
        if (game.noti) game.noti.npcs = false;
        npcRosterUi.render();
    }
    if (section === 'stall') playerStallUi.render();
    if (document.getElementById('black-market-dialog')?.open) blackMarketUi.render();
}

exposeFileGlobals({ marketPickHallItem, renderMarketUI });
})();
const MARKET_SECTIONS = Object.freeze(['npc', 'stall', 'hall']);
const MARKET_BLACK_FACE = 'assets/ui/currency/golden-rule.png';
const marketUi = {
    section: 'npc',
    moveTab(event) {
        const buttons = [...event.currentTarget.querySelectorAll('button:not([hidden])')];
        const index = buttons.indexOf(document.activeElement), count = buttons.length;
        const next = {ArrowLeft:(index+count-1)%count, ArrowRight:(index+1)%count, Home:0, End:count-1}[event.key];
        if (next === undefined) return;
        event.preventDefault();buttons[next].click();buttons[next].focus();
    },
    /** The sections open now, in order (the NPC section also holds the black market once 거래소 is unlocked). */
    openSections() {
        const market = isMarketUnlocked();
        const open = { npc: contentProgression.npcsMet(game) || market, stall: market, hall: contentProgression.isUnlocked('hall') };
        return MARKET_SECTIONS.filter(id => open[id]);
    },
    show(section) {
        if (!MARKET_SECTIONS.includes(section)) return;
        this.section = section;
        if (section === 'hall') loadPlayerExchange();
        renderMarketUI();
    },
    /** From elsewhere (a death hint, the loop's stall and hall checks, an old 장비 칸 address): the 거래 window on that section. */
    open(section) {
        this.section = MARKET_SECTIONS.includes(section) ? section : this.section;
        switchTab('tab-trade');
        this.show(this.section);
    },
    /** 장비 전당의 등록(js/player-exchange.js renderHallStands, 2026-11-06 사용자: "내 템 전부 보여주는 게 아니라 등록 누르면 내 인벤토리 똑같이
     * 보여주고 골라서 등록"): the bag picker with the real bag (js/craft-picker-host-ui.js). Gear that cannot go on show is dimmed and says why
     * (hallItemIssue); a press on gear that can chooses it and closes the picker. */
    openHallPicker() {
        window.openCraftItemPickerOverlay('inventory', { title: _t('장비 전당에 전시할 장비 선택'), desc: _t('장비를 누르면 전시할 장비로 고릅니다.'),
            picks: { inventory: marketPickHallItem, blocked: hallItemIssue } });
    },
    /** The black market's card in the NPC section (js/npc-roster-ui.js), once 거래소 is unlocked. */
    blackCardHtml() {
        if (!isMarketUnlocked()) return '';
        return `<li class="npc-roster-item" data-tone="crimson"><button type="button" class="npc-roster-card is-black" data-black-open>
            <span class="npc-roster-face is-coin"><img class="npc-roster-portrait" src="${MARKET_BLACK_FACE}" alt=""></span>
            <span class="npc-roster-text"><strong>${_t('암거래상')}</strong><span class="npc-roster-tags"><em class="is-shop">${_t('공격 룬, 제작 베이스, 고유 장비')}</em></span></span></button>
            <span class="npc-roster-actions"><button type="button" data-black-open>${_t('상점')}</button></span></li>`;
    },
    /** The black market in a window shaped like an NPC's: its board moves in and goes back when the window closes. */
    openBlack() {
        const board = document.getElementById('market-panel-black'), home = document.getElementById('market-panel-npc');
        if (!isMarketUnlocked() || !board || !home || document.getElementById('black-market-dialog')) return;
        const dialog = document.createElement('dialog');
        dialog.id = 'black-market-dialog';
        dialog.className = 'npc-dialog is-shop is-black';
        dialog.dataset.tone = 'crimson';
        dialog.setAttribute('aria-labelledby', 'black-market-name');
        dialog.innerHTML = `<figure class="npc-dialog-figure is-coin"><img class="npc-dialog-portrait" src="${MARKET_BLACK_FACE}" alt=""></figure>
            <div class="npc-dialog-main"><header class="npc-dialog-head"><div class="npc-dialog-who"><h2 id="black-market-name">${_t('암거래상')}</h2></div>
            <button type="button" class="npc-dialog-close" data-black-close>${_t('닫기')}</button></header></div>`;
        dialog.querySelector('.npc-dialog-main').append(board);
        board.hidden = false;
        dialog.addEventListener('click', event => { if (event.target.closest('[data-black-close]')) dialog.close(); });
        dialog.addEventListener('close', () => {
            board.hidden = true;
            home.append(board);
            dialog.remove();
            renderMarketUI();
        }, { once: true });
        document.body.append(dialog);
        refreshBlackMarket(false);
        blackMarketUi.render();
        dialog.showModal();
    }
};


document.addEventListener('click', event => { if (event.target.closest?.('[data-black-open]')) marketUi.openBlack(); });
safeExposeGlobals({marketUi, renderMarketUI});
