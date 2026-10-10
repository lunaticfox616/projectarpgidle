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

    /** The selected item's tooltip under the panel's buttons; the 바꾸면 tables above them fill in through js/equipment-window-ui.js
     * (2026-10-10: the side columns of the worn items and the comparison lines gave way to the 바꾸면 table). */
    function render(root, item, equippedSlot) {
        const details = root.querySelector('.equipment-inspection-details');
        const signature = JSON.stringify([item, game.equipment, cachedTooltipStats], (key, value) => key === 'breakdowns' ? undefined : value);
        if (details === activeDetails && signature === activeSignature) return;
        activeDetails = details;
        activeSignature = signature;
        itemTooltipComparisonScheduler.cancel();
        const tip = document.createElement('div');
        tip.className = 'equipment-inspection-tooltip';
        showItemTooltip(null, equippedSlot, !!equippedSlot, item, { target: tip });
        details.replaceChildren(tip);
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
