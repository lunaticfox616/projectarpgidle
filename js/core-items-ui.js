// 장비창의 코어 칸(장착 칸 왼쪽 위). 2026-10-10부터 코어는 가방에 들어가고 장비 칸 '코어'에 낀다(js/bag-items.js). 칸은 다른 장착
// 칸과 같은 .equipment-slot이라 끌어 놓기, 누르기, 두 번 눌러 해제가 그대로 되고, 툴팁은 js/bag-items-ui.js가 코어 카드로 그린다.
const coreItemsUi = (() => {
    const SLOT = '코어';

    function emptyHtml() {
        return `<div class="slot-box equipment-slot equipment-slot-empty slot-${SLOT} core-item-slot" data-slot="${SLOT}" onclick="equipmentInventoryInteraction.handleEquippedItemClick(event,'${SLOT}')">
            <div class="equipment-slot-head"><span>${SLOT}</span></div><div class="equipment-slot-visual empty"><img src="${coreItems.icon(null)}" alt="" aria-hidden="true" draggable="false"></div>
            <div class="equipment-empty-mark">＋</div>
            <div class="equipment-empty-label">비어 있음</div>
        </div>`;
    }

    /** Paperdoll card for the core slot: absent until the core unlock, unless a core is still worn. */
    function slotHtml() {
        const core = (game.equipment || {})[SLOT];
        if (!core) return contentProgression.isUnlocked('cube') ? emptyHtml() : '';
        const hover = `if(window.matchMedia('(hover: hover)').matches) showItemTooltip(event, '${SLOT}', true)`;
        const rarity = core.rarity || 'rare';
        return `<div class="slot-box equipment-slot slot-${SLOT} core-item-slot rarity-${rarity}" data-slot="${SLOT}" data-item-tooltip-anchor="1"
            onclick="equipmentInventoryInteraction.handleEquippedItemClick(event,'${SLOT}')"
            ondblclick="event.stopPropagation(); equipmentInventoryInteraction.cancelCarry(); handleEquipmentSlotDoubleClick('${SLOT}', false)"
            onmouseenter="${hover}" onmousemove="${hover}" onmouseleave="hideItemTooltip(event)">
            <div class="equipment-slot-head"><span>${SLOT}</span></div><div class="equipment-slot-visual"><img src="${coreItems.icon(core)}" alt="" aria-hidden="true" draggable="false"></div>
            <div class="item-title equipment-slot-name ${rarity}" title="${escapeHTML(core.name)}">${escapeHTML(core.name)}</div>
        </div>`;
    }

    return Object.freeze({ slotHtml });
})();
safeExposeGlobals({ coreItemsUi });
