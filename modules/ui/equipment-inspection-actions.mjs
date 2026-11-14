/** Presentation only: accepts a complete getPlayerStats snapshot or null, without recalculation. */
export function getInactiveAffixIds(runtime, stats, summonSkills = []) {
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

export function tooltipBox(runtime, item, slot, equipped) {
    const tip = runtime.deps.document.createElement('div');
    tip.className = 'equipment-inspection-tooltip';
    (0, runtime.deps.showItemTooltip)(null, slot, equipped, item, { target: tip });
    return tip;
}

/** Transient reading state belongs to this selection, never to the item or save. */
export function readView(runtime, root) {
    const panes = [...root.querySelectorAll('.eqw-compare-pane')];
    return {
        pane: root.querySelector('.eqw-compare-pane.active > h5')?.textContent,
        scroll: root.scrollTop,
        bodyScroll: root.querySelector('.eqw-inspector-body')?.scrollTop || 0,
        panes: panes.map(pane => [pane.querySelector('h5').textContent, pane.lastElementChild.scrollTop]),
        deltas: [...root.querySelectorAll('.eqw-deltas[data-eqw-slot]')],
        focus: root.contains(runtime.deps.document.activeElement) ? runtime.deps.document.activeElement : null
    };
}

export function restoreView(runtime, root, view) {
    root.querySelectorAll('.eqw-compare-pane').forEach(pane => {
        const saved = view.panes.find(([label]) => label === pane.querySelector('h5').textContent);
        if (saved) pane.lastElementChild.scrollTop = saved[1];
    });
    root.scrollTop = view.scroll;
    const body = root.querySelector('.eqw-inspector-body');
    if (body) body.scrollTop = view.bodyScroll;
    // Restore a replaced control only when the update itself displaced focus.
    const action = view.focus?.getAttribute('onclick');
    if (!action || view.focus.isConnected || runtime.deps.document.activeElement !== runtime.deps.document.body) return;
    [...root.querySelectorAll('button[onclick]')].find(button => button.getAttribute('onclick') === action)?.focus({ preventScroll: true });
}

export function replaceShell(runtime, root, html, view) {
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
export function render(runtime, root, item, equippedSlot, html) {
    const selection = `${runtime.deps.equipmentInventoryGridRuntime.getItemKey(item)}:${equippedSlot || ''}`;
    const signature = JSON.stringify([item, runtime.deps.game.equipment, runtime.deps.cachedTooltipStats], (key, value) => key === 'breakdowns' ? undefined : value);
    const sameSelection = selection === runtime.state.activeSelection && root.contains(runtime.state.activeDetails);
    if (sameSelection && root.__lastHtml === html && signature === runtime.state.activeSignature) return;
    const view = sameSelection ? readView(runtime, root) : null;
    replaceShell(runtime, root, html, view);
    const details = root.querySelector('.equipment-inspection-details');
    runtime.state.activeDetails = details;
    runtime.state.activeSignature = signature;
    runtime.state.activeSelection = selection;
    runtime.deps.itemTooltipComparisonScheduler.cancel();
    const worn = equippedSlot ? [] : runtime.deps.equipmentWindowUi.wornSlots(item);
    const panes = [{ tab: '선택한 장비', label: (0, runtime.deps._t)('선택한 장비'), node: tooltipBox(runtime, item, equippedSlot, !!equippedSlot) }];
    worn.forEach(slot => {
        const name = (0, runtime.deps.getDualSlotDisplayLabel)(slot);
        panes.push({ tab: worn.length > 1 ? (0, runtime.deps._t)('지금 {name}', { name }) : '지금 장착', label: (0, runtime.deps._t)('지금 장착, {name}', { name }), node: tooltipBox(runtime, runtime.deps.game.equipment[slot], slot, true) });
    });
    // 세 칸(고른 장비, 지금 낀 왼쪽과 오른쪽)도 한 줄에 놓는다(2026-11-08 사용자): 뜨는 창 폭이 칸 수를 따른다(css/equipment-window.css).
    root.dataset.eqwPanes = String(Math.min(3, panes.length));
    details.replaceChildren(runtime.deps.equipmentWindowUi.compareNode(panes, view?.pane));
    runtime.deps.equipmentWindowUi.fillDeltas(root, item, signature);
    if (view) restoreView(runtime, root, view);
    else root.scrollTop = 0;
}

export function decorateLoadout(runtime) {
    const root = runtime.deps.document.getElementById('ui-equip-list');
    if (!root) return;
    runtime.deps.levelProgressionUi.decorateSlots(root);
    const current = Object.fromEntries(Object.entries(runtime.deps.game.equipment).map(([slot, item]) => [slot, item?.id]));
    const now = runtime.deps.Date.now();
    root.querySelectorAll('.equipment-slot').forEach(card => {
        const slot = card.dataset.slot;
        if (runtime.state.previousEquipment && current[slot] && current[slot] !== runtime.state.previousEquipment[slot]) runtime.state.changedUntil.set(slot, now + 1000);
        card.classList.toggle('equipment-just-equipped', runtime.state.changedUntil.get(slot) > now);
    });
    runtime.state.previousEquipment = current;
}
