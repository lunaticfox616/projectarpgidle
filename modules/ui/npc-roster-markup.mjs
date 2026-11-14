export function rosterTagsHtml(runtime, npc) {
    const stock = runtime.deps.npcShop.stock(npc.id), shop = runtime.deps.NPC_SHOPS[npc.id];
    const talk = runtime.deps.contentUnlockUi.npcTopics(npc).open.some(row => !runtime.deps.contentUnlockUi.npcHeard(npc, row.topic)) ? `<em class="is-talk">${(0, runtime.deps._t)('새 이야기')}</em>` : '';
    const wares = stock && stock.offers.length ? `<em class="is-shop">${(0, runtime.deps._t)('{label} {count}개', { label: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(shop.label)), count: stock.offers.length })}</em>` : '';
    return talk + wares;
}

export function rosterCardHtml(runtime, npc) {
    const met = runtime.deps.game.npcMet[npc.id];
    return `<li class="npc-roster-item" data-tone="${(0, runtime.deps.escapeHTML)(met.tone || 'gold')}"><button type="button" class="npc-roster-card" data-npc-open="${npc.id}">
            <span class="npc-roster-face"><img class="npc-roster-portrait" src="${runtime.deps.STAGE_NPC_ART.path}${npc.id}-portrait.webp" alt=""></span>
            <span class="npc-roster-text"><strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(npc.name))}</strong><span class="npc-roster-tags">${rosterTagsHtml(runtime, npc)}</span></span></button>${rosterActionsHtml(runtime, npc)}</li>`;
}

/** The card's own buttons: 상점 while the NPC has a shelf, 재화 교환 at Veila's. */
export function rosterActionsHtml(runtime, npc) {
    const shop = runtime.deps.NPC_SHOPS[npc.id] && runtime.deps.npcShop.stock(npc.id) ? `<button type="button" data-npc-open="${npc.id}" data-npc-mode="shop">${(0, runtime.deps._t)('상점')}</button>` : '';
    const exchange = npc.id === runtime.deps.NPC_CURRENCY_EXCHANGE.npc ? `<button type="button" data-npc-open="${npc.id}" data-npc-mode="exchange">${(0, runtime.deps._t)('재화 교환')}</button>` : '';
    return shop || exchange ? `<span class="npc-roster-actions">${shop}${exchange}</span>` : '';
}

/** Draws the tab while it shows (js/ui.js renderVisibleManagementPanels), again only when something on it changed. */
export function renderNpcRoster(runtime) {
    if (!runtime.active) return;
    const root = runtime.deps.document.getElementById('npc-roster-panel');
    if (!root) return;
    const list = metRosterNpcs(runtime), black = runtime.deps.marketUi.blackCardHtml(); // 암거래상도 NPC 칸에 선다(2026-11-06 사용자, js/market-ui.js)
    const key = JSON.stringify([runtime.deps.i18n.language, runtime.deps.game.season, runtime.deps.contentProgression.balance(), runtime.deps.game.npcHeard.length, runtime.state.NPC_SHOP_CURRENCIES.map(id => runtime.deps.game.currencies[id] || 0),
        (runtime.deps.game.skills || []).length, (runtime.deps.game.supports || []).length, black,
        list.map(npc => [npc.id, runtime.deps.game.npcMet[npc.id], runtime.deps.contentUnlockUi.npcNews(npc), runtime.deps.npcShop.stock(npc.id)?.offers.length || 0])]);
    if (runtime.renderedRoot === root && key === runtime.state.renderedKey && root.childNodes.length) return;
    runtime.renderedRoot = root;
    runtime.state.renderedKey = key;
    root.innerHTML = list.length || black
        ? `<ul class="npc-roster">${list.map(runtime.handlers.rosterCardHtml).join('')}${black}</ul>`
        : `<p class="npc-roster-empty">${(0, runtime.deps._t)('아직 만난 NPC가 없습니다.')}</p>`;
}

export function openRosterNpc(runtime, id, mode) {
    const npc = runtime.deps.STORY_NPCS[id], met = runtime.deps.game.npcMet[id];
    if (!npc || !met) return;
    runtime.deps.contentUnlockUi.openNpc({ id, name: npc.name, title: npc.title, tone: met.tone, line: '' }, ['exchange', 'shop'].includes(mode) ? mode : 'talk');
}

export function metRosterNpcs(runtime) { return Object.values(runtime.deps.STORY_NPCS).filter(npc => runtime.deps.game.npcMet[npc.id]); }
