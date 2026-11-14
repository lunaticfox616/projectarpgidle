/** 장비 상세 동작 줄의 단추(상세 팝오버는 최상위 층이라 먼저 닫는다). 나무꾼을 만나기 전이거나 주입할 수 없는 등급이면 없다. */
export function actionHtml(ctx, item, slot) {
    if (!item || !(0, ctx.deps.isChaosInfuserUnlocked)() || (item.rarity !== 'rare' && !item.chaosInfusion)) return '';
    const ref = slot ? `'${slot}',true` : `${item.id},false`;
    return `<button type="button" data-content-action="infuse" onclick="equipmentInventoryInteraction.focus(null);chaosInfusionUi.open(${ref})"><span class="px-center">${(0, ctx.deps._t)('주입')}</span></button>`;
}

export function open(ctx, ref, isEquip) {
    if ((0, ctx.deps.selectForCrafting)(ref, isEquip)) render(ctx);
}

export function close(ctx) {
    ctx.deps.selectionDialog.close(ctx.state.OVERLAY_ID);
}

export function infusionText(ctx, infusion) {
    return `${(0, ctx.deps._t)(infusion.statName || (0, ctx.deps.getStatName)(infusion.id))} +${(0, ctx.deps.formatValue)(infusion.id, infusion.val)}`;
}

export function currentHtml(ctx, item) {
    const infusion = item.chaosInfusion;
    if (!infusion) return '<p class="chaos-infusion-current">현재 주입 없음</p>';
    const range = `${(0, ctx.deps.formatValue)(infusion.id, infusion.valMin)}~${(0, ctx.deps.formatValue)(infusion.id, infusion.valMax)}`;
    return `<p class="chaos-infusion-current">${(0, ctx.deps._t)('현재 주입:')} <strong>${infusionText(ctx, infusion)}</strong> <small>(${range})</small>
            <button type="button" onclick="chaosInfusionUi.remove()" ${(ctx.deps.game.currencies.blightSpore || 0) > 0 ? '' : 'disabled'}>${(0, ctx.deps._t)('제거 (마름병 포자 1)')}</button></p>`;
}

export function optionHtml(ctx, item, option) {
    const key = option.optionId || option.id;
    const costs = (0, ctx.deps.getChaosInfusionCost)(option, item);
    const same = item.chaosInfusion && (item.chaosInfusion.sourceOptionId === key || item.chaosInfusion.id === option.id);
    const range = `${(0, ctx.deps.formatValue)(option.id, option.min)}~${(0, ctx.deps.formatValue)(option.id, option.max)}`;
    return `<button type="button" class="selection-overlay-option" onclick="chaosInfusionUi.choose('${key}')" ${(0, ctx.deps.canPayCurrencyCosts)(costs) && !same ? '' : 'disabled'}>
            ${(0, ctx.deps._t)(option.label) || (0, ctx.deps.getStatName)(option.id)} +${range}<br><span>${same ? (0, ctx.deps._t)('적용 중') : (0, ctx.deps.formatCurrencyCosts)(costs)}</span></button>`;
}

export function optionsHtml(ctx, item) {
    const eligibility = (0, ctx.deps.isChaosInfusionEligibleItem)(item);
    if (!eligibility.ok) return `<p class="chaos-infusion-blocked">${eligibility.reason}</p>`;
    const buttons = (0, ctx.deps.getChaosInfuserOptionsForItem)(item).map(option => optionHtml(ctx, item, option)).join('');
    return buttons ? `<div class="selection-overlay-grid">${buttons}</div>`
        : '<p class="chaos-infusion-blocked">이 부위에 더할 수 있는 주입 옵션이 없습니다.</p>';
}

/** Opens the dialog, or redraws it in place after a change. */
export function render(ctx) {
    const item = (0, ctx.deps.getSelectedCraftItem)();
    if (!item) return close(ctx);
    ctx.deps.selectionDialog.show({ id: ctx.state.OVERLAY_ID, title: (0, ctx.deps._t)('혼돈 주입'), panelClass: 'chaos-infusion-panel', body: `<div class="selection-overlay-help"><strong>[${(0, ctx.deps.escapeHTML)((0, ctx.deps.getItemSlotDisplayLabel)(item))}] ${(0, ctx.deps.escapeHTML)((0, ctx.deps.getItemDisplayName)(item))}</strong><br>
                ${(0, ctx.deps._t)('희귀 장비에 T5급 범위 옵션 한 줄을 더합니다. 추가 옵션 {item}/6. 교체와 제거에는 마름병 포자 1개가 더 듭니다.', { item: (0, ctx.deps.getItemExplicitOptionCount)(item) })}</div>
            ${currentHtml(ctx, item)}${optionsHtml(ctx, item)}` });
}

export async function choose(ctx, optionId) {
    const item = (0, ctx.deps.getSelectedCraftItem)();
    const option = item && (0, ctx.deps.getChaosInfuserOptionsForItem)(item).find(row => (row.optionId || row.id) === optionId);
    if (!option) return;
    const previous = JSON.stringify(item.chaosInfusion);
    const next = `${(0, ctx.deps.getStatName)(option.id)} +${(0, ctx.deps.formatValue)(option.id, option.min)}~${(0, ctx.deps.formatValue)(option.id, option.max)}`;
    const message = `[${item.name}]\n현재: ${item.chaosInfusion ? infusionText(ctx, item.chaosInfusion) : (0, ctx.deps._t)('주입 없음')}\n변경: ${next}\n\n비용: ${(0, ctx.deps.formatCurrencyCosts)((0, ctx.deps.getChaosInfusionCost)(option, item))}`;
    if (!await (0, ctx.deps.requestGameConfirmation)(message, { title: (0, ctx.deps._t)('혼돈 주입 비교'), confirmLabel: (0, ctx.deps._t)('주입 확정') })) return;
    if ((0, ctx.deps.getSelectedCraftItem)() !== item || JSON.stringify(item.chaosInfusion) !== previous) {
        (0, ctx.deps.addLog)((0, ctx.deps._t)('대상 또는 주입 옵션이 변경되었습니다. 다시 비교하세요.'), 'attack-monster');
    } else (0, ctx.deps.applyChaosInfusionToSelectedItem)(optionId);
    if (ctx.deps.selectionDialog.isOpen(ctx.state.OVERLAY_ID)) render(ctx);
}

export function remove(ctx) {
    (0, ctx.deps.removeChaosInfusionFromSelectedItem)();
    render(ctx);
}
