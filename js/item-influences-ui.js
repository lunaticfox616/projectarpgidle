/**
 * 영향 장비와 뒤바뀐 고유의 화면(규칙은 js/item-influences.js, 데이터는 data/item-influences.js, 모양은 css/item-influences.css).
 * 가방 칸, 장착 칸, 장비 카드, 툴팁 상자의 테두리 색(--infl-a 왼쪽, --infl-b 오른쪽), 장비 이름 아래 한 줄(태양 아이템, 허기 아이템
 * ...), 줄마다 붙는 표식, 제작실의 성화 잉걸과 허기의 즙, 아틀라스 카드의 출처 한 줄(어디서 얻는지).
 */
const itemInfluencesUi = (() => {
    const meta = key => (key === 'swapped' ? SWAPPED_UNIQUE_META : ITEM_INFLUENCES[key]);
    const chip = (key, text) => `<span class="infl-chip is-${key}" style="--infl:${meta(key).tone}">${escapeHTML(text)}</span>`;
    // 다른 줄을 바꾼 줄(태양, 허기, 뒤바뀐)은 그 줄 아래에 한 줄 더 "[표식] 기존 ○○"(2026-10-10 사용자: 셋을 같은 모양으로).
    const replacedLine = (key, text, replaced) => `<span class="infl-replaced is-${key}" style="--infl:${meta(key).tone}">${chip(key, text)}${
        replaced ? `기존 ${escapeHTML(replaced.statName || getStatName(replaced.id))}` : ''}</span>`;

    /** Classes for an item's frame: has-influence, and has-influence-2 when two colours share it. '' for an ordinary item. */
    function influenceClasses(item) {
        const keys = itemInfluences.influenceKeys(item);
        if (!keys.length) return '';
        return ` has-influence${keys.length > 1 ? ' has-influence-2' : ''} ${keys.map(key => `infl-${key}`).join(' ')}`;
    }
    /** The frame colours as custom properties: the left half and the right half (the same colour for one influence). */
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

    /** One line under the item's name, each influence in its colour (2026-10-10 사용자: 설명 없이 "태양 아이템" 같은 이름만 한 줄로). */
    function tagsHtml(item, className = '') {
        const keys = itemInfluences.influenceKeys(item);
        if (!keys.length) return '';
        const tags = keys.map(key => `<span class="infl-tag" style="--infl:${meta(key).tone}">${escapeHTML(meta(key).label)}</span>`).join('');
        return `<div class="infl-tags${className}">${tags}</div>`;
    }
    /** The same line in the item tooltip, right under its title (js/ui.js showItemTooltip). */
    const tooltipHtml = item => tagsHtml(item, ' tooltip-line');
    /** Where an influence comes from, one line: "[태양 아이템] 붉은 제단 장비, 성화 잉걸로 새김" (data ITEM_INFLUENCES found). */
    function sourceHtml(key) {
        const row = ITEM_INFLUENCES[key];
        if (!row || !row.found) return '';
        return `<p class="infl-source"><span class="infl-tag" style="--infl:${row.tone}">${escapeHTML(row.label)}</span>${escapeHTML(row.found)}</p>`;
    }
    /** That line on a final boss's card (js/atlas-endgame-ui.js) when its offering comes from an influence's content. '' for the rest. */
    function fightSourceHtml(id) {
        const key = Object.keys(ITEM_INFLUENCES).find(name => ITEM_INFLUENCES[name].feeds === id);
        return key ? sourceHtml(key) : '';
    }
    /** The mark after a line's value: an altar line, an exclusive line of guardian or blight, a swapped unique line (with what it
     * replaced). '' for an ordinary line. */
    function lineBadgeHtml(item, stat) {
        if (!stat) return '';
        if (stat.altar && ITEM_INFLUENCES[stat.altar]) return replacedLine(stat.altar, ITEM_INFLUENCES[stat.altar].name, stat.replaced);
        if (stat.swapped) return replacedLine('swapped', '뒤바뀜', stat.replaced);
        const influence = itemInfluences.lineInfluence(stat);
        return influence ? chip(influence, ITEM_INFLUENCES[influence].name) : '';
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
        addLog(`${influence.name} 줄을 새겼습니다: [${escapeHTML(item.name)}] ${escapeHTML(result.line.statName)} +${formatValue(result.line.id, result.line.val)}`, 'loot-rare');
        return true;
    }

    return Object.freeze({ influenceClasses, influenceStyle, markFrame, markTooltip: markFrame, tagsHtml, tooltipHtml, sourceHtml, fightSourceHtml,
        lineBadgeHtml, useState, use });
})();
safeExposeGlobals({ itemInfluencesUi });
