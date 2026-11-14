/** Classes for an item's frame: has-influence, and has-influence-2 when two colours share it; is-corrupted for a corrupted item
* (a red frame, css/item-influences.css). '' for an ordinary item. */
export function influenceClasses(ctx, item) {
    const keys = ctx.deps.itemInfluences.influenceKeys(item), corrupted = item && item.corrupted ? ' is-corrupted' : '';
    if (!keys.length) return corrupted;
    return ` has-influence${keys.length > 1 ? ' has-influence-2' : ''} ${keys.map(key => `infl-${key}`).join(' ')}${corrupted}`;
}

/** The frame colours as custom properties: the left half and the right half (the same colour for one influence). */
export function influenceStyle(ctx, item) {
    const keys = ctx.deps.itemInfluences.influenceKeys(item);
    if (!keys.length) return '';
    return `--infl-a:${meta(ctx, keys[0]).tone};--infl-b:${meta(ctx, keys[1] || keys[0]).tone};`;
}

/** An element framed by the item it shows (the tooltip box, an inline tooltip, a floor loot name): data-influence and the colours. */
export function markFrame(ctx, target, item) {
    if (!target || !target.dataset) return;
    const keys = ctx.deps.itemInfluences.influenceKeys(item);
    if (!keys.length) {
        delete target.dataset.influence;
        ['--infl-a', '--infl-b'].forEach(name => target.style.removeProperty(name));
        return;
    }
    target.dataset.influence = keys.join(' ');
    target.style.setProperty('--infl-a', meta(ctx, keys[0]).tone);
    target.style.setProperty('--infl-b', meta(ctx, keys[1] || keys[0]).tone);
}

/** One line under the item's name, each influence in its colour (2026-10-10 사용자: 설명 없이 "태양 아이템" 같은 이름만 한 줄로). */
export function tagsHtml(ctx, item, className = '') {
    const keys = ctx.deps.itemInfluences.influenceKeys(item);
    if (!keys.length) return '';
    const tags = keys.map(key => `<span class="infl-tag" style="--infl:${meta(ctx, key).tone}">${(0, ctx.deps.escapeHTML)((0, ctx.deps._t)(meta(ctx, key).label))}</span>`).join('');
    return `<div class="infl-tags${className}">${tags}</div>`;
}

/** Where an influence comes from, one line: "[태양 아이템] 붉은 제단 장비, 성화 잉걸로 새김" (data ITEM_INFLUENCES found). */
export function sourceHtml(ctx, key) {
    const row = ctx.deps.ITEM_INFLUENCES[key];
    if (!row || !row.found) return '';
    return `<p class="infl-source"><span class="infl-tag" style="--infl:${row.tone}">${(0, ctx.deps.escapeHTML)((0, ctx.deps._t)(row.label))}</span>${(0, ctx.deps.escapeHTML)(row.found)}</p>`;
}

/** The mark after a line's value: an altar line, an exclusive line of guardian or blight, a swapped unique line (with what it
* replaced). '' for an ordinary line. */
export function lineBadgeHtml(ctx, item, stat) {
    if (!stat) return '';
    if (stat.altar && ctx.deps.ITEM_INFLUENCES[stat.altar]) return replacedLine(ctx, stat.altar, ctx.deps.ITEM_INFLUENCES[stat.altar].name, stat.replaced);
    if (stat.swapped) return replacedLine(ctx, 'swapped', '뒤바뀜', stat.replaced);
    const influence = ctx.deps.itemInfluences.lineInfluence(stat);
    return influence ? chip(ctx, influence, ctx.deps.ITEM_INFLUENCES[influence].name) : '';
}

/** { enabled, reason } for the crafting workspace's button (js/crafting-workspace-ui.js). */
export function useState(ctx, key, item) {
    const reason = ctx.deps.itemInfluences.altarUseReason(item, ctx.deps.itemInfluences.altarOfCurrency(key))
        || ((Number(ctx.deps.game.currencies[key]) || 0) < 1 ? '재화 부족' : '');
    return { enabled: !reason, reason };
}

/** Carves the altar line into the selected item. true when done (the workspace records the result). */
export function use(ctx, key) {
    const item = (0, ctx.deps.getSelectedCraftItem)();
    const result = ctx.deps.itemInfluences.useAltarCurrency(ctx.deps.game, item, key);
    if (!result.ok) {
        if (typeof ctx.deps.showGameToast === 'function') (0, ctx.deps.showGameToast)(result.reason, { tone: 'error', duration: 2600 });
        return false;
    }
    const influence = ctx.deps.ITEM_INFLUENCES[result.line.altar];
    (0, ctx.deps.addLog)((0, ctx.deps._t)('{name} 줄을 새겼습니다: [{item}] {statName} +{value}', { name: (0, ctx.deps._t)(influence.name), item: (0, ctx.deps.escapeHTML)((0, ctx.deps.getItemDisplayName)(item)), statName: (0, ctx.deps.escapeHTML)(result.line.statName), value: (0, ctx.deps.formatValue)(result.line.id, result.line.val) }), 'loot-rare');
    return true;
}

export function meta(ctx, key) { return key === 'swapped' ? ctx.deps.SWAPPED_UNIQUE_META : ctx.deps.ITEM_INFLUENCES[key]; }

export function chip(ctx, key, text) { return `<span class="infl-chip is-${key}" style="--infl:${meta(ctx, key).tone}">${(0, ctx.deps.escapeHTML)(text)}</span>`; }

export function replacedLine(ctx, key, text, replaced) { return `<span class="infl-replaced is-${key}" style="--infl:${meta(ctx, key).tone}">${chip(ctx, key, text)}${
    replaced ? (0, ctx.deps._t)('기존 {statName}', { statName: (0, ctx.deps.escapeHTML)((0, ctx.deps._t)(replaced.statName || (0, ctx.deps.getStatName)(replaced.id))) }) : ''}</span>`; }

/** The same line in the item tooltip, right under its title (js/ui.js showItemTooltip). */
export function tooltipHtml(ctx, item) { return tagsHtml(ctx, item, ' tooltip-line'); }
