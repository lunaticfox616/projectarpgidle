// Selected-equipment presentation. Rules and comparison work remain in the existing item/tooltip adapters.
(function () {
    'use strict';
    let activeDetails = null;
    let activeSignature = '';
    let activeSelection = '';
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

    /** Transient reading state belongs to this selection, never to the item or save. */
    function readView(root) {
        const panes = [...root.querySelectorAll('.eqw-compare-pane')];
        return {
            pane: root.querySelector('.eqw-compare-pane.active > h5')?.textContent,
            scroll: root.scrollTop,
            bodyScroll: root.querySelector('.eqw-inspector-body')?.scrollTop || 0,
            panes: panes.map(pane => [pane.querySelector('h5').textContent, pane.lastElementChild.scrollTop]),
            deltas: [...root.querySelectorAll('.eqw-deltas[data-eqw-slot]')],
            focus: root.contains(document.activeElement) ? document.activeElement : null
        };
    }

    function restoreView(root, view) {
        root.querySelectorAll('.eqw-compare-pane').forEach(pane => {
            const saved = view.panes.find(([label]) => label === pane.querySelector('h5').textContent);
            if (saved) pane.lastElementChild.scrollTop = saved[1];
        });
        root.scrollTop = view.scroll;
        const body = root.querySelector('.eqw-inspector-body');
        if (body) body.scrollTop = view.bodyScroll;
        // Restore a replaced control only when the update itself displaced focus.
        const action = view.focus?.getAttribute('onclick');
        if (!action || view.focus.isConnected || document.activeElement !== document.body) return;
        [...root.querySelectorAll('button[onclick]')].find(button => button.getAttribute('onclick') === action)?.focus({ preventScroll: true });
    }

    function replaceShell(root, html, view) {
        if (root.__lastHtml === html) return;
        root.innerHTML = root.__lastHtml = html;
        // Keep expanded delta tables until their new values arrive; no placeholder height jump.
        root.querySelectorAll('.eqw-deltas[data-eqw-slot]').forEach(table => {
            const previous = view?.deltas.find(row => row.dataset.eqwSlot === table.dataset.eqwSlot);
            if (previous) table.replaceWith(previous);
        });
    }

    /** The selected item's tooltip under the panel's buttons, with the worn items it would replace next to it (2026-10-11: the
     * 2026-10-10 redesign had dropped the worn items' options and they were hard to check). The 바꾸면 tables above the buttons
     * fill in through js/equipment-window-ui.js. */
    function render(root, item, equippedSlot, html) {
        const selection = `${equipmentInventoryGridRuntime.getItemKey(item)}:${equippedSlot || ''}`;
        const signature = JSON.stringify([item, game.equipment, cachedTooltipStats], (key, value) => key === 'breakdowns' ? undefined : value);
        const sameSelection = selection === activeSelection && root.contains(activeDetails);
        if (sameSelection && root.__lastHtml === html && signature === activeSignature) return;
        const view = sameSelection ? readView(root) : null;
        replaceShell(root, html, view);
        const details = root.querySelector('.equipment-inspection-details');
        activeDetails = details;
        activeSignature = signature;
        activeSelection = selection;
        itemTooltipComparisonScheduler.cancel();
        const worn = equippedSlot ? [] : equipmentWindowUi.wornSlots(item);
        const panes = [{ tab: '선택한 장비', label: '선택한 장비', node: tooltipBox(item, equippedSlot, !!equippedSlot) }];
        worn.forEach(slot => {
            const name = getDualSlotDisplayLabel(slot);
            panes.push({ tab: worn.length > 1 ? `지금 ${name}` : '지금 장착', label: `지금 장착, ${name}`, node: tooltipBox(game.equipment[slot], slot, true) });
        });
        root.dataset.eqwPanes = String(Math.min(2, panes.length));
        details.replaceChildren(equipmentWindowUi.compareNode(panes, view?.pane));
        equipmentWindowUi.fillDeltas(root, item, signature);
        if (view) restoreView(root, view);
        else root.scrollTop = 0;
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
