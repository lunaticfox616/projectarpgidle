/** The NPC tab (2026-10-16 사용자: "조우 후 클릭 안하고 넘어가는 경우를 대비해서 맵에서 조우하는 NPC말고 따로 NPC를 볼 수 있는
 * 탭도 만들어야겠네 (예전의 전문가 탭처럼)"): the NPCs met on the maps (game.npcMet, js/npc-shop.js meet), each with its portrait,
 * what it has for the hero now (즉시 해금, new keywords, its shop) and where it was met last. Pressing one opens its window
 * (js/content-progression-ui.js openNpc). NPCs not met yet stay out, as their names would tell the story ahead. */
const npcRosterUi = (() => {
    let renderedKey = '';
    const NPC_SHOP_CURRENCIES = Object.freeze(['magicBud', 'formlessDew', 'goldenRule']);

    const metRosterNpcs = () => Object.values(STORY_NPCS).filter(npc => game.npcMet[npc.id]);

    function rosterTagsHtml(npc) {
        const news = contentUnlockUi.npcNews(npc), stock = npcShop.stock(npc.id), shop = NPC_SHOPS[npc.id];
        const unlock = news === 'unlock' ? '<em class="is-unlock">즉시 해금</em>' : '';
        const talk = contentUnlockUi.npcTopics(npc).open.some(row => !contentUnlockUi.npcHeard(npc, row.topic)) ? '<em class="is-talk">새 이야기</em>' : '';
        const ready = npcShop.ready(npc.id);
        const wares = stock && stock.offers.length ? `<em class="is-shop">${escapeHTML(shop.label)} ${stock.offers.length}개${ready ? `, ${ready}개 살 수 있음` : ''}</em>` : '';
        return unlock + talk + wares;
    }

    function rosterCardHtml(npc) {
        const met = game.npcMet[npc.id], zone = getZone(met.zoneId);
        const where = `${zone && zone.name ? `${escapeHTML(zone.name)}, ` : ''}${met.count}번 만남`;
        return `<li><button type="button" class="npc-roster-card" data-npc-open="${npc.id}" data-tone="${escapeHTML(met.tone || 'gold')}">
            <span class="npc-roster-face"><img class="npc-roster-portrait" src="${STAGE_NPC_ART.path}${npc.id}-portrait.png" alt=""></span>
            <span class="npc-roster-text"><strong>${escapeHTML(npc.name)}</strong><small>${escapeHTML(npc.title)}</small>
            <span class="npc-roster-where">${where}</span><span class="npc-roster-tags">${rosterTagsHtml(npc)}</span></span></button></li>`;
    }

    /** Draws the tab while it shows (js/ui.js renderVisibleManagementPanels), again only when something on it changed. */
    function renderNpcRoster() {
        const root = document.getElementById('npc-roster-panel');
        if (!root) return;
        const list = metRosterNpcs();
        const key = JSON.stringify([game.season, contentProgression.balance(), game.npcHeard.length, NPC_SHOP_CURRENCIES.map(id => game.currencies[id] || 0),
            (game.skills || []).length, (game.supports || []).length,
            list.map(npc => [npc.id, game.npcMet[npc.id], contentUnlockUi.npcNews(npc), npcShop.stock(npc.id)?.offers.length || 0])]);
        if (key === renderedKey && root.childNodes.length) return;
        renderedKey = key;
        root.innerHTML = list.length
            ? `<p class="npc-roster-lead">누르면 대화, 즉시 해금, 상점을 엽니다.</p><ul class="npc-roster">${list.map(rosterCardHtml).join('')}</ul>`
            : '<p class="npc-roster-empty">아직 만난 NPC가 없습니다.</p>';
    }

    function openRosterNpc(id) {
        const npc = STORY_NPCS[id], met = game.npcMet[id];
        if (!npc || !met) return;
        contentUnlockUi.openNpc({ id, name: npc.name, title: npc.title, tone: met.tone, line: '' });
    }

    document.addEventListener('click', event => {
        const button = event.target.closest?.('[data-npc-open]');
        if (button) openRosterNpc(button.dataset.npcOpen);
    });
    // The window changes what the tab shows (keywords heard, unlocks bought, wares bought): draw it again once it closes.
    document.addEventListener('close', event => { if (event.target.id === 'npc-dialog') { renderedKey = ''; renderNpcRoster(); } }, true);
    return Object.freeze({ render: renderNpcRoster });
})();
safeExposeGlobals({ npcRosterUi });
