/**
 * 영향 장비와 뒤바뀐 고유의 화면(규칙은 js/item-influences.js, 데이터는 data/item-influences.js, 모양은 css/item-influences.css).
 * 가방 칸, 장착 칸, 장비 카드, 툴팁 상자의 테두리 색(--infl-a, --infl-b), 툴팁의 영향 줄과 줄마다 붙는 표식, 제작실의 성화 잉걸과
 * 허기의 즙.
 */
const itemInfluencesUi = (() => {
    const SHORT = Object.freeze({ guardian: '수호자', blight: '마름' });
    const meta = key => (key === 'swapped' ? { name: '뒤바뀐 고유', tone: SWAPPED_UNIQUE_TONE, icon: '⟲' } : ITEM_INFLUENCES[key]);
    const chip = (key, text) => `<span class="infl-chip is-${key}" style="--infl:${meta(key).tone}">${escapeHTML(text)}</span>`;
    const was = replaced => (replaced ? `<span class="infl-was">원래 ${escapeHTML(replaced.statName || getStatName(replaced.id))}</span>` : '');

    /** Classes for an item's frame: has-influence, and has-influence-2 when two colours stack. '' for an ordinary item. */
    function influenceClasses(item) {
        const keys = itemInfluences.influenceKeys(item);
        if (!keys.length) return '';
        return ` has-influence${keys.length > 1 ? ' has-influence-2' : ''} ${keys.map(key => `infl-${key}`).join(' ')}`;
    }
    /** The frame colours as custom properties (first and second influence). '' for an ordinary item. */
    function influenceStyle(item) {
        const keys = itemInfluences.influenceKeys(item);
        if (!keys.length) return '';
        return `--infl-a:${meta(keys[0]).tone};--infl-b:${meta(keys[1] || keys[0]).tone};`;
    }
    /** An element framed by the item it shows (the tooltip box, an inline tooltip, a floor loot name): data-influence and the colours. */
    function markFrame(target, item) {
        if (!target || !target.dataset) return;
        const keys = itemInfluences.influenceKeys(item);
        if (!keys.length) {
            delete target.dataset.influence;
            ['--infl-a', '--infl-b'].forEach(name => target.style.removeProperty(name));
            return;
        }
        target.dataset.influence = keys.join(' ');
        target.style.setProperty('--infl-a', meta(keys[0]).tone);
        target.style.setProperty('--infl-b', meta(keys[1] || keys[0]).tone);
    }

    const HEAD = Object.freeze({
        base: influence => `${influence.icon} ${influence.name}: ${influence.source}가 베이스 옵션 한 줄을 바꿨습니다`,
        explicit: influence => `${influence.icon} ${influence.name}: 추가 옵션에 ${SHORT[influence.key] || ''} 전용 줄이 나옵니다`
    });
    /** One line per influence under the item's head (js/ui.js showItemTooltip). */
    function tooltipHtml(item) {
        return itemInfluences.influenceKeys(item).map(key => {
            if (key === 'swapped') return `<div class="tooltip-line infl-line" style="--infl:${SWAPPED_UNIQUE_TONE}">⟲ 뒤바뀐 고유: 기억 속에서 줄 하나가 바뀌었습니다</div>`;
            const influence = { ...ITEM_INFLUENCES[key], key };
            return `<div class="tooltip-line infl-line" style="--infl:${influence.tone}">${escapeHTML(HEAD[influence.line](influence))}</div>`;
        }).join('');
    }
    /** The mark after a line's value: an altar line, an exclusive line of guardian or blight, a swapped unique line (with what it
     * replaced). '' for an ordinary line. */
    function lineBadgeHtml(item, stat) {
        if (!stat) return '';
        if (stat.altar && ITEM_INFLUENCES[stat.altar]) return chip(stat.altar, ITEM_INFLUENCES[stat.altar].name) + was(stat.replaced);
        if (stat.swapped) return chip('swapped', '뒤바뀐 줄') + was(stat.replaced);
        const influence = itemInfluences.lineInfluence(stat);
        return influence ? chip(influence, `${SHORT[influence]} 전용`) : '';
    }

    // ---------------------------------------------------------------- 제작실: 성화 잉걸, 허기의 즙
    /** { enabled, reason } for the crafting workspace's button (js/crafting-workspace-ui.js). */
    function useState(key, item) {
        const reason = itemInfluences.altarUseReason(item, itemInfluences.altarOfCurrency(key))
            || ((Number(game.currencies[key]) || 0) < 1 ? '재화 부족' : '');
        return { enabled: !reason, reason };
    }
    /** Carves the altar line into the selected item. true when done (the workspace records the result). */
    function use(key) {
        const item = getSelectedCraftItem();
        const result = itemInfluences.useAltarCurrency(game, item, key);
        if (!result.ok) {
            if (typeof showGameToast === 'function') showGameToast(result.reason, { tone: 'error', duration: 2600 });
            return false;
        }
        const influence = ITEM_INFLUENCES[result.line.altar];
        addLog(`${influence.icon} ${influence.name}: [${escapeHTML(item.name)}] ${escapeHTML(result.line.statName)} +${formatValue(result.line.id, result.line.val)}`, 'loot-rare');
        return true;
    }

    return Object.freeze({ influenceClasses, influenceStyle, markFrame, markTooltip: markFrame, tooltipHtml, lineBadgeHtml, useState, use });
})();
safeExposeGlobals({ itemInfluencesUi });
