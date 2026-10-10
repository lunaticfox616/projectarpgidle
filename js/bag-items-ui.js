/**
 * 가방의 주얼과 코어 화면(js/bag-items.js): 툴팁은 장비 툴팁 대신 제 카드(주얼은 예전 주얼 카드, 코어는 네 줄), 주얼을 두 번 누르거나
 * 장착 칸에 끌어 놓으면 그 장비의 빈 소켓에 끼운다(js/items.js equipItem). 코어는 장비 칸 '코어'라서 다른 장비와 같이 끼우고 뺀다.
 */
const bagItemsUi = (() => {
    const hint = text => `<div class="tooltip-line" style="margin-top:6px; color:var(--copy-muted);">${text}</div>`;
    const jewelHtml = jewel => window.createJewelRangeTooltipHtml(jewel) + hint('장비의 빈 소켓에 끼웁니다(두 번 누르거나 장착 칸에 끌어 놓기).');
    function coreHtml(core) {
        const lines = (core.lines || []).map(line => `<div class="tooltip-line">${escapeHTML(coreItems.describe(line))}</div>`).join('');
        const worn = (game.equipment || {})[bagItems.CORE] === core;
        return `<div class="tooltip-title" style="color:${getRarityColor(core.rarity || 'rare')}">[코어] ${escapeHTML(core.name)}</div>${lines}${worn ? '' : hint('장비창의 코어 칸에 끼웁니다(두 번 누르거나 코어 칸에 끌어 놓기).')}`;
    }
    /** js/ui.js prepareItemTooltip: a jewel or a core draws its own card and the equipment tooltip stops. true when drawn. */
    function presentTooltip(context, event, item) {
        if (!bagItems.ownShape(item)) return false;
        presentItemTooltip(context, event, item, bagItems.isJewel(item) ? jewelHtml(item) : coreHtml(item), true);
        return true;
    }
    /** js/items.js equipItem for a bag jewel: into the empty socket of the worn item in `slot` (or the first one). */
    function socket(item, slot) {
        const reason = bagItems.socketFromBag(item, slot);
        if (reason) return addLog(reason, 'attack-monster', { toast: true });
        addLog(`💠 [${escapeHTML(item.name || '주얼')}]을(를) 소켓에 끼웠습니다.`, 'loot-magic');
        hideItemTooltip();
        updateStaticUI();
    }
    return Object.freeze({ presentTooltip, socket });
})();
safeExposeGlobals({ bagItemsUi });
