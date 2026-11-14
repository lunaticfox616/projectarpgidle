/** One slot: the picture, the held count in the corner, and the name, count and short effect on hover (stashTip).
* data-info-tooltip-anchor: js/ui.js's mousemove guard keeps the card while the pointer stays on the slot. */
export function stashCellHtml(ctx, key, picked) {
    if (!ctx.deps.craftingCatalogUi.visible(key)) return '<span class="cl-stash-cell is-blank" aria-hidden="true"></span>';
    const amount = ctx.deps.game.currencies[key] || 0, name = ctx.deps.craftingCatalogUi.name(key), omen = ctx.deps.CRAFT_OMENS.keys.includes(key);
    const on = omen ? picked.omen === key : picked.recipe === key;
    const count = amount.toLocaleString(ctx.deps.i18n.locale), held = (0, ctx.deps._t)('보유 {currencies}', { currencies: count });
    return `<button type="button" id="cl-stash-${key}" class="cl-stash-cell${amount ? '' : ' is-empty'}${on ? ' is-on' : ''}" data-theme="${ctx.deps.craftingCatalogUi.theme(key)}"
            ${omen ? 'data-omen' : 'data-recipe'}="${key}" aria-pressed="${on}" aria-label="${esc(ctx, name)}, ${esc(ctx, held)}" data-info-tooltip-anchor="1"
            onpointerenter="craftingStashUi.tip(event,'${key}')" onpointerleave="hideInfoTooltip()"><img src="${esc(ctx, ctx.deps.ORB_DB[key].icon)}" alt="" draggable="false">${amount ? `<b>${count}</b>` : ''}</button>`;
}

/** The hover card of a slot, mouse only (2026-11-07 사용자: 재화별 툴팁에도 색감): the name in its own colour on its theme's tone
* (css/crafting-workspace.css .cl-stash-tip), the held count (red when none), and the effect with its keywords coloured as in the
* currency list (craftingCatalogUi.description). The card's edge takes the theme's tone. */
export function stashTip(ctx, event, key) {
    if (event.pointerType !== 'mouse') return;
    const amount = ctx.deps.game.currencies[key] || 0;
    const held = (0, ctx.deps._t)('보유 {currencies}', { currencies: amount.toLocaleString(ctx.deps.i18n.locale) });
    const html = `<div class="cl-stash-tip"><div class="tooltip-title">${ctx.deps.craftingCatalogUi.styledName(key)}</div>`
        + `<div class="tooltip-line cl-stash-tip-held${amount ? '' : ' is-empty'}">${esc(ctx, held)}</div>`
        + `<div class="tooltip-line cl-stash-tip-effect">${ctx.deps.craftingCatalogUi.description(key, true)}</div></div>`;
    const tone = (0, ctx.deps.getComputedStyle)(event.currentTarget).getPropertyValue('--resource-tone').trim();
    (0, ctx.deps.showInfoTooltipHtml)(event.clientX, event.clientY, html, tone || '#a98546', `stash:${key}:${amount}`);
}

export function stashGroupHtml(ctx, group, picked) {
    return `<div class="cl-stash-group" style="--cl-stash-cols:${group.cols}"><small>${esc(ctx, (0, ctx.deps._t)(group.label))}</small>${group.keys.map(key => stashCellHtml(ctx, key, picked)).join('')}</div>`;
}

/** A tab: its currency's picture and name, and a gold mark when the chosen currency or the armed omen is in it. */
export function stashTabHtml(ctx, tab, current, picked) {
    const keys = tab.groups.flatMap(group => group.keys);
    const marked = keys.includes(picked.recipe) || keys.includes(picked.omen);
    return `<button type="button" id="cl-stash-tab-${tab.id}" class="cl-stash-tab${marked ? ' has-pick' : ''}" role="tab" data-stash-tab="${tab.id}"
            aria-selected="${tab === current}" aria-controls="cl-stash-page"><img src="${esc(ctx, ctx.deps.ORB_DB[tab.icon].icon)}" alt="" draggable="false"><span>${esc(ctx, (0, ctx.deps._t)(tab.label))}</span></button>`;
}

/**
* @param {{recipe: string, omen: string}} picked the currency chosen for the craft and the armed omen ('' for none)
* @returns {string} the tab row and the shown tab's slots (first shown: the tab of the chosen currency)
*/
export function stashHtml(ctx, picked) {
    ctx.deps.craftingCatalogUi.capture();
    const current = ctx.state.TABS.find(tab => tab.id === ctx.state.shownTab) || stashTabOf(ctx, picked.recipe) || ctx.state.TABS[0];
    ctx.state.shownTab = current.id;
    return `<div class="cl-stash-box"><div class="cl-stash-tabs" role="tablist" aria-label="${esc(ctx, (0, ctx.deps._t)('재화 보관함'))}">${ctx.state.TABS.map(tab => stashTabHtml(ctx, tab, current, picked)).join('')}</div>
            <div class="cl-stash" id="cl-stash-page" role="tabpanel" aria-labelledby="cl-stash-tab-${current.id}">${current.groups.map(group => stashGroupHtml(ctx, group, picked)).join('')}</div></div>`;
}

/** Shows a tab (data-stash-tab); an unknown id is ignored. */
export function stashShowTab(ctx, id) {
    if (ctx.state.TABS.some(tab => tab.id === id)) ctx.state.shownTab = id;
}

export function esc(ctx, value) { return (0, ctx.deps.escapeHTML)(String(value)); }

export function stashTabOf(ctx, key) { return ctx.state.TABS.find(tab => tab.groups.some(group => group.keys.includes(key))); }
