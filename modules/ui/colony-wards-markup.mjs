export function equippedCell(runtime, slot, item, open) {
    const line = (item.baseStats || [])[0];
    const hover = `if(window.matchMedia('(hover: hover)').matches) showItemTooltip(event, '${slot}', true)`;
    return `<div class="slot-box equipment-slot ward-slot rarity-${item.rarity || 'magic'}${open ? '' : ' is-off'}" data-slot="${slot}"
            data-item-tooltip-anchor="1" onclick="equipmentInventoryInteraction.handleEquippedItemClick(event,'${slot}')"
            ondblclick="event.stopPropagation(); equipmentInventoryInteraction.cancelCarry(); handleEquipmentSlotDoubleClick('${slot}')"
            onmouseenter="${hover}" onmousemove="${hover}" onmouseleave="hideItemTooltip(event)">
            <img src="${(0, runtime.deps.getEquipmentGridVisualAsset)(item)}" alt="" aria-hidden="true" draggable="false">
            <span class="ward-slot-line">${open ? (0, runtime.deps.escapeHTML)(line ? lineText(runtime, line.id, line.val) : item.rarity === 'unique' ? item.name : '') : (0, runtime.deps._t)('칸 부족')}</span></div>`;
}

/** The ward row under the equipped gear (once the colony is open, or while a ward is still in a slot). */
export function slotsHtml(runtime) {
    const equipment = runtime.deps.game.equipment || {};
    if (!runtime.deps.colonyWards.unlocked() && !runtime.state.R.slots.some(slot => equipment[slot])) return '';
    const count = runtime.deps.colonyWards.slotCount();
    const cells = runtime.state.R.slots.map((slot, index) => {
        if (equipment[slot]) return equippedCell(runtime, slot, equipment[slot], index < count);
        return index < count ? emptyCell(runtime, slot) : lockedCell(runtime);
    }).join('');
    // 2026-10-24 사용자: 머리 줄("액막이 1/5칸")을 지웠다. 잠긴 칸의 자물쇠와 툴팁이 칸을 여는 방법을 알린다.
    return `<section class="ward-slot-row" aria-label="${(0, runtime.deps._t)('액막이 칸')}"><div class="ward-slot-cells">${cells}</div></section>`;
}

/** 허리띠 툴팁의 베이스 옵션 머리 바로 아래 한 줄(군락지가 열린 뒤): 이 허리띠가 여는 액막이 칸 수와 굴림 범위. */
export function beltLineHtml(runtime, item) {
    const slots = runtime.deps.colonyWards.beltRoll(item);
    return slots ? `<div class="tooltip-line ward-belt-line"><span>${(0, runtime.deps._t)('액막이 칸')} </span><b>+${slots}</b> <small>(${runtime.state.BELT_RANGE})</small></div>` : '';
}

/** js/bag-items-ui.js equipSpecial: 열린 칸이 하나도 없을 때 액막이를 끼우려 하면 이유를 알린다. true when told. */
export function refuseWithoutSlot(runtime, item) {
    if (!runtime.deps.colonyWards.isWard(item) || runtime.deps.colonyWards.slotCount() > 0) return false;
    (0, runtime.deps.addLog)((0, runtime.deps._t)('액막이 칸이 없습니다. {NO_SLOT_HINT}.', { NO_SLOT_HINT: (0, runtime.deps._t)(runtime.state.NO_SLOT_HINT) }), 'attack-monster', { toast: true });
    return true;
}

/** What the wards in the open slots add, summed by line. */
export function totalsHtml(runtime) {
    const totals = new Map();
    runtime.deps.colonyWards.equippedLines().forEach(line => totals.set(line.stat, (totals.get(line.stat) || 0) + line.val));
    return [...totals].map(([id, val]) => `<li>${(0, runtime.deps.escapeHTML)(lineText(runtime, id, val))}</li>`).join('') || '<li class="is-none">끼운 액막이가 없습니다.</li>';
}

export function colonyPanelHtml(runtime) {
    const shards = Math.floor(Number(runtime.deps.game.currencies.colonyShard) || 0), traces = Math.floor(Number(runtime.deps.game.currencies.colonyTrace) || 0);
    return `<section class="colony-ward-panel" aria-label="${(0, runtime.deps._t)('군락지 액막이')}">
            <header class="colony-ward-hero"><div><h3>${(0, runtime.deps._t)('군락지 액막이')}</h3><p>${(0, runtime.deps._t)('가방에 들어가고, 장비창의 액막이 칸에 끼웁니다. 칸은 허리띠가 엽니다(허리띠마다 {BELT_RANGE}칸).', { BELT_RANGE: runtime.state.BELT_RANGE })}</p></div>
                <div class="colony-ward-currency"><span>${(0, runtime.deps._t)('편린')} <b>${shards}</b></span><span>${(0, runtime.deps._t)('흔적')} <b>${traces}</b></span></div></header>
            <section class="colony-ward-section"><h4>${(0, runtime.deps._t)('적용 효과')} <span>${(0, runtime.deps._t)('액막이 칸 {slotCount}/{maxSlots}', { slotCount: runtime.deps.colonyWards.slotCount(), maxSlots: runtime.state.R.maxSlots })}</span></h4>
                <ul class="colony-ward-total">${totalsHtml(runtime)}</ul></section>
            <p class="colony-ward-note">${(0, runtime.deps._t)('군락지에서 5웨이브마다 하나, 다른 웨이브에서도 자주 나옵니다. 다른 지도에서는 아주 드물게 나옵니다. 아주 드물게 고유 액막이가 나옵니다.')}</p>
            <div class="colony-ward-actions"><button type="button" onclick="colonyWardsUi.craft()" ${shards < runtime.state.R.craftCost ? 'disabled' : ''}>${(0, runtime.deps._t)('액막이 만들기, 편린 {craftCost}', { craftCost: runtime.state.R.craftCost })}</button>
                <button type="button" onclick="colonyWardsUi.openEquipment()">${(0, runtime.deps._t)('장비창 열기')}</button></div></section>`;
}

export function craft(runtime) {
    if (typeof runtime.deps.assertBuildEditable === 'function' && !(0, runtime.deps.assertBuildEditable)()) return;
    const reason = runtime.deps.colonyWards.craft();
    if (reason) return (0, runtime.deps.addLog)(reason, 'attack-monster', { toast: true });
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🛡️ 군락지 편린으로 액막이를 만들었습니다.'), 'loot-rare');
    (0, runtime.deps.updateStaticUI)();
    (0, runtime.deps.queueImportantSave)(200);
}

export function openEquipment(runtime) {
    (0, runtime.deps.switchTab)('tab-items');
    (0, runtime.deps.switchItemSubtab)('item-tab-equip');
}

export function lockHint(runtime) { return (0, runtime.deps._t)('허리띠({BELT_RANGE}칸), 초월 공허 액막이 매듭, 가디언 수호 재생, 천 개의 유리병으로 열립니다', { BELT_RANGE: runtime.state.BELT_RANGE }); }

export function statName(runtime, id) { return runtime.state.NAMES.get(id) || (0, runtime.deps.getStatName)(id); }

export function lineText(runtime, id, val) { return `${statName(runtime, id)} +${(0, runtime.deps.formatValue)(id, val)}`; }

export function emptyCell(runtime, slot) { return `<div class="slot-box equipment-slot equipment-slot-empty ward-slot" data-slot="${slot}"
        onclick="equipmentInventoryInteraction.handleEquippedItemClick(event,'${slot}')"><span class="ward-slot-plus">＋</span></div>`; }

export function lockedCell(runtime) { return `<div class="ward-slot is-locked" data-tip="${lockHint(runtime)}" aria-label="${(0, runtime.deps._t)('잠긴 액막이 칸')}"><span aria-hidden="true">🔒</span></div>`; }
