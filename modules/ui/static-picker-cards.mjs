import { isItemRarityVisible } from './static-inventory-filters.mjs';

export function getCraftPickerItemLines(runtime, item) {

    if (!item) return '';
    let rows = [];
    (item.baseStats || []).slice(0, 1).forEach(stat => rows.push(`${(0, runtime.deps._t)(stat.statName || (0, runtime.deps.getStatName)(stat.id))} +${(0, runtime.deps.formatValue)(stat.id, stat.val)}`));
    (item.stats || []).slice(0, 2).forEach(stat => rows.push(`${(0, runtime.deps._t)(stat.statName || (0, runtime.deps.getStatName)(stat.id))} +${(0, runtime.deps.formatValue)(stat.id, stat.val)}`));
    if (item.chaosInfusion) rows.push(`[주입] ${(0, runtime.deps._t)(item.chaosInfusion.statName || (0, runtime.deps.getStatName)(item.chaosInfusion.id))} +${(0, runtime.deps.formatValue)(item.chaosInfusion.id, item.chaosInfusion.val)}`);
    if (item.encroached && !item.encroached.liberated) rows.push('[잠식] 해방 전');
    return rows.map(row => `<div class="craft-picker-stat">${(0, runtime.deps.escapeHTML)(row)}</div>`).join('');

}

export function getCraftPickerCardHtml(runtime, item, options) {
    const presentation = craftPickerCardPresentation(runtime, item, options);
    options = presentation.options;
    const { selected, rarity, slotLabel, sourceBadge, extraClass, exceptionalStars } = presentation;
    return `<button type="button" class="craft-picker-card ${extraClass} ${selected ? 'selected' : ''}" onclick="${options.onclick || ''}" ${options.tooltip || ''}>
        <div class="item-title ${rarity}" style="font-size:12px;">[${(0, runtime.deps.escapeHTML)((0, runtime.deps.getItemSlotDisplayLabel)(item, slotLabel))}] ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(item.name || '장비'))}${exceptionalStars}${sourceBadge}${item.encroached ? (0, runtime.deps._t)(' <span style="color:#b084ff;">(잠식)</span>') : ''}${item.locked ? ' 🔒' : ''}</div>
        <div class="item-base-line" style="font-size:12px;">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(item.baseName || ''))}</div>
        ${getCraftPickerItemLines(runtime, item)}
    </button>`;
}

function craftPickerCardPresentation(runtime, item, options) {
    options = options || {};
    let selected = !!options.selected;
    let rarity = item && item.rarity ? item.rarity : 'normal';
    let slotLabel = options.slotLabel || (item && item.slot ? item.slot : '장비');
    const sourceBadge = craftPickerSourceBadge(runtime, item);
    let extraClass = options.extraClass || '';
    let exceptionalStars = typeof runtime.deps.getExceptionalBaseStarsHtml === 'function' ? (0, runtime.deps.getExceptionalBaseStarsHtml)(item) : '';
    return { options, selected, rarity, slotLabel, sourceBadge, extraClass, exceptionalStars };
}

function craftPickerSourceBadge(runtime, item) {
    let sourceMeta = item && typeof runtime.deps.getDropOnlyItemSourceMeta === 'function' ? (0, runtime.deps.getDropOnlyItemSourceMeta)(item) : null;
    let sourceBadge = sourceMeta ? ` <span class="${sourceMeta.badgeClass}">${(0, runtime.deps._t)(sourceMeta.label)}</span>` : '';
    return sourceBadge;
}

export function getCraftPickerBodyHtml(runtime, kind, browse = {}) {

    let isEquip = kind === 'equip';
    let currentRef = (0, runtime.deps.getCraftSelectionRef)();
    let currentIsEquip = (0, runtime.deps.isCraftSelectionEquip)();
    if (isEquip) {
        let slots = ['무기', '투구', '목걸이', '장갑1', '갑옷', '방패', '반지1', '허리띠', '반지2', '신발', '장갑2'];
        return `<div class="paperdoll craft-picker-equip-grid">${slots.map(slot => {
            let item = runtime.deps.game.equipment && runtime.deps.game.equipment[slot];
            let slotClass = `slot-box slot-${slot}`;
            if (!item) return `<button type="button" class="craft-picker-card ${slotClass} empty" disabled><div style="font-weight:800;">[${(0, runtime.deps.escapeHTML)((0, runtime.deps.getItemSlotDisplayLabel)(null, slot))}]</div><div style="color:var(--copy-muted); margin-top:5px;">${(0, runtime.deps._t)('비어있음')}</div></button>`;
            return getCraftPickerCardHtml(runtime, item, {
                slotLabel: slot,
                selected: currentIsEquip && currentRef === slot,
                onclick: `selectCraftPickerEquipment('${slot}')`,
                extraClass: slotClass,
                tooltip: `onmouseenter="showItemTooltip(event, '${slot}', true)" onmousemove="showItemTooltip(event, '${slot}', true)" onmouseleave="hideItemTooltip()"`
            });
        }).join('')}</div>`;
    }
    return renderCraftPickerInventory(runtime, currentRef, currentIsEquip, { ...browse, kind });

}

export function renderCraftPickerPages(runtime, page, pages, count) {

    return `<nav class="craft-picker-pages" aria-label="${(0, runtime.deps._t)('제작 대상 페이지')}"><button type="button" data-craft-page="${page - 1}" ${page === 0 ? 'disabled' : ''}>${(0, runtime.deps._t)('이전')}</button><span>${(0, runtime.deps._t)('{value} / {pages}, {count}개', { value: page + 1, pages, count })}</span><button type="button" data-craft-page="${page + 1}" ${page === pages - 1 ? 'disabled' : ''}>${(0, runtime.deps._t)('다음')}</button></nav>`;

}

export function renderCraftPickerInventory(runtime, currentRef, currentIsEquip, browse) {

    let totalInv = (runtime.deps.game.inventory || []).length;
    const mobile = runtime.deps.uiDisplay.matches('(max-width: 1080px)');
    const plain = runtime.deps.game.inventory.filter(item => !runtime.deps.bagItems.isSpecial(item)); // 주얼, 코어, 액막이는 제작 대상이 아니다
    const candidates = browse.kind === 'altar' ? plain.filter(item => !(0, runtime.deps.getTimeAltarItemIssue)(item)) : plain;
    const matching = candidates.filter(item => item && isItemRarityVisible(runtime, item) && (0, runtime.deps.matchSearchQuery)((0, runtime.deps.getEquipmentSearchText)(item), browse.query));
    const pages = Math.max(1, Math.ceil(matching.length / 6));
    const page = Math.min(browse.page || 0, pages - 1);
    const visible = mobile ? matching.slice(page * 6, page * 6 + 6) : matching;
    let rows = visible.map(item => getCraftPickerCardHtml(runtime, item, {
        selected: !currentIsEquip && currentRef === item.id,
        onclick: `selectCraftPickerInventoryItem(${item.id})`,
        tooltip: `onmouseenter="showItemTooltip(event, ${runtime.deps.game.inventory.indexOf(item)}, false)" onmouseleave="hideItemTooltip()"`
    })).join('');
    const navigation = mobile ? renderCraftPickerPages(runtime, page, pages, matching.length) : '';
    return navigation + (rows
            ? `<div class="craft-picker-grid">${rows}</div>`
            : `<div class="deathlog-empty">${totalInv > 0 ? (0, runtime.deps._t)('검색/등급 조건에 맞는 장비가 없습니다.') : (0, runtime.deps._t)('인벤토리에 제작할 장비가 없습니다.')}</div>`);

}
