// Selected-equipment presentation. Rules and comparison work remain in the existing item/tooltip adapters.
(function () {
    'use strict';
    let activeDetails = null;
    let activeSignature = '';
    let previousEquipment = null;
    const changedUntil = new Map();

    /** Presentation only: accepts a complete getPlayerStats snapshot or null, without recalculation. */
    function getInactiveAffixIds(stats, summonSkills = []) {
        const inactive = new Set();
        // Summons can borrow player damage sources. Keep uncertain mixed builds fully readable.
        if (!stats || summonSkills.length) return inactive;
        const { sSkill, passiveKeystoneFlags: flags } = stats;
        if (!sSkill) return inactive;
        const tags = new Set(sSkill.tags);
        if (!tags.size || tags.has('summon')) return inactive;
        const applies = {
            attackPctDmg: tags.has('attack'),
            spellPctDmg: tags.has('spell') || flags.duel,
            spellFlatDmg: tags.has('spell'),
            spellCritDmg: tags.has('spell'),
            spellLeech: tags.has('spell'),
            leech: tags.has('attack') && !tags.has('spell') && !flags.soulSanctuary
        };
        Object.entries(applies).forEach(([id, enabled]) => { if (!enabled) inactive.add(id); });
        return inactive;
    }

    function tooltipBox(item, slot, equipped) {
        const tip = document.createElement('div');
        tip.className = 'equipment-inspection-tooltip';
        showItemTooltip(null, slot, equipped, item, { target: tip });
        return tip;
    }

    /** The selected item's tooltip under the panel's buttons, with the worn items it would replace next to it (2026-10-11: the
     * 2026-10-10 redesign had dropped the worn items' options and they were hard to check). The 바꾸면 tables above the buttons
     * fill in through js/equipment-window-ui.js. */
    function render(root, item, equippedSlot) {
        const details = root.querySelector('.equipment-inspection-details');
        const signature = JSON.stringify([item, game.equipment, cachedTooltipStats], (key, value) => key === 'breakdowns' ? undefined : value);
        if (details === activeDetails && signature === activeSignature) return;
        activeDetails = details;
        activeSignature = signature;
        itemTooltipComparisonScheduler.cancel();
        const worn = equippedSlot ? [] : equipmentWindowUi.wornSlots(item);
        const panes = [{ tab: '선택한 장비', label: '선택한 장비', node: tooltipBox(item, equippedSlot, !!equippedSlot) }];
        worn.forEach(slot => {
            const name = getDualSlotDisplayLabel(slot);
            panes.push({ tab: worn.length > 1 ? `지금 ${name}` : '지금 장착', label: `지금 장착, ${name}`, node: tooltipBox(game.equipment[slot], slot, true) });
        });
        root.dataset.eqwPanes = String(Math.min(2, panes.length));
        details.replaceChildren(equipmentWindowUi.compareNode(panes));
        equipmentWindowUi.fillDeltas(root, item, signature);
    }

    function decorateLoadout() {
        const root = document.getElementById('ui-equip-list');
        if (!root) return;
        levelProgressionUi.decorateSlots(root);
        const current = Object.fromEntries(Object.entries(game.equipment).map(([slot, item]) => [slot, item?.id]));
        const now = Date.now();
        root.querySelectorAll('.equipment-slot').forEach(card => {
            const slot = card.dataset.slot;
            if (previousEquipment && current[slot] && current[slot] !== previousEquipment[slot]) changedUntil.set(slot, now + 1000);
            card.classList.toggle('equipment-just-equipped', changedUntil.get(slot) > now);
        });
        previousEquipment = current;
    }

    safeExposeGlobals({ equipmentInspectionUi: Object.freeze({ render, decorateLoadout, getInactiveAffixIds }) });
})();
