export function emptyHtml(runtime) {
    return `<div class="slot-box equipment-slot equipment-slot-empty slot-${runtime.state.SLOT} core-item-slot" data-slot="${runtime.state.SLOT}" onclick="equipmentInventoryInteraction.handleEquippedItemClick(event,'${runtime.state.SLOT}')">
            <div class="equipment-slot-head"><span>${(0, runtime.deps._t)(runtime.state.SLOT)}</span></div><div class="equipment-slot-visual empty"><img src="${runtime.deps.coreItems.icon(null)}" alt="" aria-hidden="true" draggable="false"></div>
            <div class="equipment-empty-mark">＋</div>
            <div class="equipment-empty-label">${(0, runtime.deps._t)('비어 있음')}</div>
        </div>`;
}

/** Paperdoll card for the core slot: absent until the core unlock, unless a core is still worn. */
export function slotHtml(runtime) {
    const core = (runtime.deps.game.equipment || {})[runtime.state.SLOT];
    if (!core) return runtime.deps.contentProgression.isUnlocked('cube') ? emptyHtml(runtime) : '';
    const hover = `if(window.matchMedia('(hover: hover)').matches) showItemTooltip(event, '${runtime.state.SLOT}', true)`;
    const rarity = core.rarity || 'rare';
    return `<div class="slot-box equipment-slot slot-${runtime.state.SLOT} core-item-slot rarity-${rarity}" data-slot="${runtime.state.SLOT}" data-item-tooltip-anchor="1"
            onclick="equipmentInventoryInteraction.handleEquippedItemClick(event,'${runtime.state.SLOT}')"
            ondblclick="event.stopPropagation(); equipmentInventoryInteraction.cancelCarry(); handleEquipmentSlotDoubleClick('${runtime.state.SLOT}')"
            onmouseenter="${hover}" onmousemove="${hover}" onmouseleave="hideItemTooltip(event)">
            <div class="equipment-slot-head"><span>${(0, runtime.deps._t)(runtime.state.SLOT)}</span></div><div class="equipment-slot-visual"><img src="${runtime.deps.coreItems.icon(core)}" alt="" aria-hidden="true" draggable="false"></div>
            <div class="item-title equipment-slot-name ${rarity}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(core.name))}</div>
        </div>`;
}
