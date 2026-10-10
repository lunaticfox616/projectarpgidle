/**
 * 액막이 화면(js/colony-wards.js, data/colony-wards.js): 장비창 장착 칸 아래 액막이 칸 줄(js/canvas-passive-tree.js renderPaperdoll),
 * 허리띠 툴팁의 "액막이 칸 +2" 줄(js/ui.js showItemTooltip 베이스 옵션 머리), 군락지 화면의 안내와 편린으로 만들기(js/colony-ward-ui.js).
 * 칸은 장착 칸과 같은 .equipment-slot이라 끌어 놓기, 누르기, 두 번 눌러 해제가 그대로 된다.
 */
const colonyWardsUi = (() => {
    const R = COLONY_WARD_RULES;
    const NAMES = new Map(COLONY_WARD_POOL.map(row => [row.id, row.name]));
    const LOCK_HINT = '허리띠 +2칸, 초월 공허 액막이 매듭, 가디언 수호 재생, 천 개의 유리병으로 열립니다';
    const statName = id => NAMES.get(id) || getStatName(id);
    const lineText = (id, val) => `${statName(id)} +${formatValue(id, val)}`;

    function equippedCell(slot, item, open) {
        const line = (item.baseStats || [])[0];
        const hover = `if(window.matchMedia('(hover: hover)').matches) showItemTooltip(event, '${slot}', true)`;
        return `<div class="slot-box equipment-slot ward-slot rarity-${item.rarity || 'magic'}${open ? '' : ' is-off'}" data-slot="${slot}"
            data-item-tooltip-anchor="1" onclick="equipmentInventoryInteraction.handleEquippedItemClick(event,'${slot}')"
            ondblclick="event.stopPropagation(); equipmentInventoryInteraction.cancelCarry(); handleEquipmentSlotDoubleClick('${slot}', false)"
            onmouseenter="${hover}" onmousemove="${hover}" onmouseleave="hideItemTooltip(event)"${open ? '' : ' title="비활성화: 칸이 모자랍니다"'}>
            <img src="${getEquipmentGridVisualAsset(item)}" alt="" aria-hidden="true" draggable="false">
            <span class="ward-slot-line">${line ? escapeHTML(lineText(line.id, line.val)) : ''}</span></div>`;
    }
    const emptyCell = slot => `<div class="slot-box equipment-slot equipment-slot-empty ward-slot" data-slot="${slot}"
        onclick="equipmentInventoryInteraction.handleEquippedItemClick(event,'${slot}')"><span class="ward-slot-plus">＋</span></div>`;
    const lockedCell = () => `<div class="ward-slot is-locked" title="${LOCK_HINT}" aria-label="잠긴 액막이 칸"><span aria-hidden="true">🔒</span></div>`;

    /** The ward row under the equipped gear (once the colony is open, or while a ward is still in a slot). */
    function slotsHtml() {
        const equipment = game.equipment || {};
        if (!colonyWards.unlocked() && !R.slots.some(slot => equipment[slot])) return '';
        const count = colonyWards.slotCount();
        const cells = R.slots.map((slot, index) => {
            if (equipment[slot]) return equippedCell(slot, equipment[slot], index < count);
            return index < count ? emptyCell(slot) : lockedCell();
        }).join('');
        return `<section class="ward-slot-row" aria-label="액막이 칸"><header><span>액막이</span><small>${count}/${R.maxSlots}칸</small></header>
            <div class="ward-slot-cells">${cells}</div></section>`;
    }
    /** 허리띠 툴팁의 베이스 옵션 머리 바로 아래 한 줄(군락지가 열린 뒤): 허리띠를 끼면 액막이 칸이 둘 늘어난다. */
    function beltLineHtml(item) {
        if (!item || String(item.slot || '').replace(/[123]$/, '') !== '허리띠' || !colonyWards.unlocked()) return '';
        return `<div class="tooltip-line ward-belt-line"><span>액막이 칸 </span><b>+${R.beltSlots}</b></div>`;
    }

    // ---------------------------------------------------------------- 군락지 화면
    /** What the wards in the open slots add, summed by line. */
    function totalsHtml() {
        const totals = new Map();
        colonyWards.equippedLines().forEach(line => totals.set(line.stat, (totals.get(line.stat) || 0) + line.val));
        return [...totals].map(([id, val]) => `<li>${escapeHTML(lineText(id, val))}</li>`).join('') || '<li class="is-none">끼운 액막이가 없습니다.</li>';
    }
    function colonyPanelHtml() {
        const shards = Math.floor(Number(game.currencies.colonyShard) || 0), traces = Math.floor(Number(game.currencies.colonyTrace) || 0);
        return `<section class="colony-ward-panel" aria-label="군락지 액막이">
            <header class="colony-ward-hero"><div><h3>군락지 액막이</h3><p>가방에 들어가고, 장비창의 액막이 칸에 끼웁니다.</p></div>
                <div class="colony-ward-currency"><span>편린 <b>${shards}</b></span><span>흔적 <b>${traces}</b></span></div></header>
            <section class="colony-ward-section"><h4>적용 효과 <span>액막이 칸 ${colonyWards.slotCount()}/${R.maxSlots}</span></h4>
                <ul class="colony-ward-total">${totalsHtml()}</ul></section>
            <p class="colony-ward-note">군락지에서 5웨이브마다 하나, 다른 웨이브에서도 자주 나옵니다. 다른 지도에서는 아주 드물게 나옵니다.</p>
            <div class="colony-ward-actions"><button type="button" onclick="colonyWardsUi.craft()" ${shards < R.craftCost ? 'disabled' : ''}>액막이 만들기, 편린 ${R.craftCost}</button>
                <button type="button" onclick="colonyWardsUi.openEquipment()">장비창 열기</button></div></section>`;
    }
    function craft() {
        if (typeof assertBuildEditable === 'function' && !assertBuildEditable()) return;
        const reason = colonyWards.craft();
        if (reason) return addLog(reason, 'attack-monster', { toast: true });
        addLog('🛡️ 군락지 편린으로 액막이를 만들었습니다.', 'loot-rare');
        updateStaticUI();
        queueImportantSave(200);
    }
    function openEquipment() {
        switchTab('tab-items');
        switchItemSubtab('item-tab-equip');
    }

    return Object.freeze({ slotsHtml, beltLineHtml, colonyPanelHtml, craft, openEquipment, statName });
})();
safeExposeGlobals({ colonyWardsUi });
