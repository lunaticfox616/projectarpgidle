/** The NPC tab (2026-10-16 사용자: "조우 후 클릭 안하고 넘어가는 경우를 대비해서 맵에서 조우하는 NPC말고 따로 NPC를 볼 수 있는
 * 탭도 만들어야겠네 (예전의 전문가 탭처럼)"): the NPCs met on the maps (game.npcMet, js/npc-shop.js meet), each with its portrait,
 * what it has for the hero now (new keywords, its shop) and where it was met last. Pressing one opens its window
 * (js/content-progression-ui.js openNpc). NPCs not met yet stay out, as their names would tell the story ahead.
 * 2026-11-06 사용자("이름, 판매 항목, 새 이야기 정도만 두고 상점 버튼, 재화 교환 버튼을 NPC 카드에 포함시켜서 공간 활용, 바로 눌러서 거래"): 카드는
 * 얼굴, 이름, 새 이야기, 판매 항목 한 줄이고, 오른쪽의 상점(진열대가 있을 때)과 재화 교환(베일라) 단추가 그 화면으로 바로 연다. 카드를 누르면 대화. */
const npcRosterUi = (() => {
    let renderedKey = '';
    const NPC_SHOP_CURRENCIES = Object.freeze(['magicBud', 'formlessDew', 'goldenRule']);

    const metRosterNpcs = () => Object.values(STORY_NPCS).filter(npc => game.npcMet[npc.id]);

    function rosterTagsHtml(npc) {
        const stock = npcShop.stock(npc.id), shop = NPC_SHOPS[npc.id];
        const talk = contentUnlockUi.npcTopics(npc).open.some(row => !contentUnlockUi.npcHeard(npc, row.topic)) ? `<em class="is-talk">${_t('새 이야기')}</em>` : '';
        const wares = stock && stock.offers.length ? `<em class="is-shop">${_t('{label} {count}개', { label: escapeHTML(_t(shop.label)), count: stock.offers.length })}</em>` : '';
        return talk + wares;
    }

    function rosterCardHtml(npc) {
        const met = game.npcMet[npc.id];
        return `<li class="npc-roster-item" data-tone="${escapeHTML(met.tone || 'gold')}"><button type="button" class="npc-roster-card" data-npc-open="${npc.id}">
            <span class="npc-roster-face"><img class="npc-roster-portrait" src="${STAGE_NPC_ART.path}${npc.id}-portrait.webp" alt=""></span>
            <span class="npc-roster-text"><strong>${escapeHTML(_t(npc.name))}</strong><span class="npc-roster-tags">${rosterTagsHtml(npc)}</span></span></button>${rosterActionsHtml(npc)}</li>`;
    }
    /** The card's own buttons: 상점 while the NPC has a shelf, 재화 교환 at Veila's. */
    function rosterActionsHtml(npc) {
        const shop = NPC_SHOPS[npc.id] && npcShop.stock(npc.id) ? `<button type="button" data-npc-open="${npc.id}" data-npc-mode="shop">${_t('상점')}</button>` : '';
        const exchange = npc.id === NPC_CURRENCY_EXCHANGE.npc ? `<button type="button" data-npc-open="${npc.id}" data-npc-mode="exchange">${_t('재화 교환')}</button>` : '';
        return shop || exchange ? `<span class="npc-roster-actions">${shop}${exchange}</span>` : '';
    }

    /** Draws the tab while it shows (js/ui.js renderVisibleManagementPanels), again only when something on it changed. */
    function renderNpcRoster() {
        const root = document.getElementById('npc-roster-panel');
        if (!root) return;
        const list = metRosterNpcs(), black = marketUi.blackCardHtml(); // 암거래상도 NPC 칸에 선다(2026-11-06 사용자, js/market-ui.js)
        const key = JSON.stringify([i18n.language, game.season, contentProgression.balance(), game.npcHeard.length, NPC_SHOP_CURRENCIES.map(id => game.currencies[id] || 0),
            (game.skills || []).length, (game.supports || []).length, black,
            list.map(npc => [npc.id, game.npcMet[npc.id], contentUnlockUi.npcNews(npc), npcShop.stock(npc.id)?.offers.length || 0])]);
        if (key === renderedKey && root.childNodes.length) return;
        renderedKey = key;
        root.innerHTML = list.length || black
            ? `<ul class="npc-roster">${list.map(rosterCardHtml).join('')}${black}</ul>`
            : `<p class="npc-roster-empty">${_t('아직 만난 NPC가 없습니다.')}</p>`;
    }

    function openRosterNpc(id, mode) {
        const npc = STORY_NPCS[id], met = game.npcMet[id];
        if (!npc || !met) return;
        contentUnlockUi.openNpc({ id, name: npc.name, title: npc.title, tone: met.tone, line: '' }, ['exchange', 'shop'].includes(mode) ? mode : 'talk');
    }

    document.addEventListener('click', event => {
        const button = event.target.closest?.('[data-npc-open]');
        if (button) openRosterNpc(button.dataset.npcOpen, button.dataset.npcMode);
    });
    // The window changes what the tab shows (keywords heard, unlocks bought, wares bought): draw it again once it closes.
    document.addEventListener('close', event => { if (event.target.id === 'npc-dialog') { renderedKey = ''; renderNpcRoster(); } }, true);
    return Object.freeze({ render: renderNpcRoster });
})();
safeExposeGlobals({ npcRosterUi });
