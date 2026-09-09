// Selected-equipment presentation. Rules and comparison work remain in the existing item/tooltip adapters.
(function () {
    'use strict';
    let activeDetails = null;
    let activeSignature = '';
    let previousEquipment = null;
    const changedUntil = new Map();

    function addItemColumn(columns, item, slot, label, isEquipped = true) {
        const column = document.createElement('section');
        column.className = 'equipment-inspection-column';
        const heading = document.createElement('h3');
        heading.textContent = label;
        const content = document.createElement('div');
        if (item) showItemTooltip(null, slot, isEquipped, item, { target: content });
        else content.textContent = '장착한 장비 없음';
        column.append(heading, content);
        columns.append(column);
    }

    function render(root, item, equippedSlot) {
        const details = root.querySelector('.equipment-inspection-details');
        const signature = JSON.stringify([item, game.equipment, cachedTooltipStats], (key, value) => key === 'breakdowns' ? undefined : value);
        if (details === activeDetails && signature === activeSignature) return;
        activeDetails = details;
        activeSignature = signature;
        itemTooltipComparisonScheduler.cancel();
        details.replaceChildren();
        const columns = document.createElement('div');
        columns.className = 'equipment-inspection-columns';
        addItemColumn(columns, item, equippedSlot, equippedSlot ? '장착 중' : '선택한 장비', !!equippedSlot);
        if (!equippedSlot) getEquipCandidateSlots(item).forEach(slot => {
            addItemColumn(columns, game.equipment[slot], slot, `현재 · ${getDualSlotDisplayLabel(slot)}`);
        });
        details.append(columns);
        if (equippedSlot) return;
        const changes = document.createElement('section');
        changes.className = 'equipment-inspection-changes';
        changes.setAttribute('aria-live', 'polite');
        changes.textContent = '착용 시 변화 계산 중…';
        details.prepend(changes);
        itemTooltipComparisonScheduler.schedule(item, signature, '', {
            isActive: () => activeDetails === details && details.isConnected && equipmentInventoryInteraction.getFocusedKey() === equipmentInventoryGridRuntime.getItemKey(item),
            apply: result => {
                changes.innerHTML = result.markup || '<span>교체 시 능력치 변화 없음</span>';
                equipmentInventoryInteraction.positionInspector();
            }
        });
    }

    function decorateLoadout() {
        const root = document.getElementById('ui-equip-list');
        if (!root) return;
        const current = Object.fromEntries(Object.entries(game.equipment).map(([slot, item]) => [slot, item?.id]));
        const now = Date.now();
        root.querySelectorAll('.equipment-slot').forEach(card => {
            const slot = card.dataset.slot;
            if (previousEquipment && current[slot] && current[slot] !== previousEquipment[slot]) changedUntil.set(slot, now + 1000);
            card.classList.toggle('equipment-just-equipped', changedUntil.get(slot) > now);
        });
        previousEquipment = current;
    }

    safeExposeGlobals({ equipmentInspectionUi: Object.freeze({ render, decorateLoadout }) });
})();
