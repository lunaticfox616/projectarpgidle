/** The moved parts: the loadout panel, or the bag with its picked-gear popover (the popover stays next to the bag). */
export function craftPickerParts(ctx, kind) {
    const parts = [ctx.deps.document.querySelector(ctx.state.PANEL[kind])];
    if (kind === 'inventory') parts.push(ctx.deps.document.getElementById('ui-equipment-inventory-inspector'));
    if (!parts.every(Boolean)) throw new Error(`craft picker: equipment window part missing for ${kind}`);
    return parts;
}

/** A press on an equipped slot or a bag item picks it, or says why it cannot be picked. */
export function craftPickerPress(ctx, event) {
    const slot = event.target.closest('#ui-equip-list > .equipment-slot[data-slot]');
    const card = event.target.closest('.equipment-grid-item');
    if (!slot && !card) return;
    event.stopPropagation();
    if (event.type !== 'click') return;
    event.preventDefault();
    if (slot) { ctx.state.pick.equip(slot.dataset.slot); return; }
    const item = craftPickerItem(ctx, card.dataset.equipmentGridKey);
    const reason = item ? craftPickerBlock(ctx, item) : '';
    if (reason) ctx.state.pick.refuse(reason);
    else if (item) ctx.state.pick.inventory(item.id);
}

/** Dims the bag items that cannot be picked (again after each bag draw, js/ui.js renderEquipmentBagPanel). */
export function craftPickerDim(ctx, host) {
    host.querySelectorAll('.equipment-grid-item').forEach(card => {
        const item = craftPickerItem(ctx, card.dataset.equipmentGridKey);
        card.classList.toggle('is-picker-off', !!item && !!craftPickerBlock(ctx, item));
    });
}

/**
* Moves the real loadout panel ('equip') or bag ('inventory') into body under #craft-equip-host.
* @param {HTMLElement} body the picker's body
* @param {'equip'|'inventory'} kind
* @param {{equip: function(string): void, inventory: function(number): void, refuse: function(string): void, blocked?: function(Object): string}} picks
*   pick an equipped slot, or a bag item by id; refuse says why a pressed item cannot be picked; blocked: the caller's rule for bag items
*/
export function craftPickerMount(ctx, body, kind, picks) {
    const parts = craftPickerParts(ctx, kind);
    body.innerHTML = `<div id="craft-equip-host" data-kind="${kind}"><div class="equipment-window" data-mobile-pane="${kind === 'equip' ? 'loadout' : 'inventory'}"></div></div>`;
    const host = body.firstElementChild;
    [...ctx.state.HELD, 'click'].forEach(type => host.addEventListener(type, ctx.handlers.craftPickerPress, true));
    ctx.deps.equipmentInventoryInteraction.focus(null);
    host.firstElementChild.append(...parts);
    ctx.state.shown = kind;
    ctx.state.pick = picks;
    ctx.state.dimmer = new ctx.deps.MutationObserver(() => craftPickerDim(ctx, host));
    ctx.state.dimmer.observe(host, { childList: true, subtree: true });
    craftPickerDim(ctx, host);
}

/** Puts the moved panel back in the equipment window, in its place (the loadout panel first, the bag and its popover after it). */
export function craftPickerUnmount(ctx) {
    if (!ctx.state.shown) return;
    ctx.state.dimmer.disconnect();
    ctx.state.dimmer = null;
    ctx.deps.document.querySelectorAll('#craft-equip-host .is-picker-off').forEach(card => card.classList.remove('is-picker-off'));
    const home = ctx.deps.document.querySelector('#item-tab-equip .equipment-window'), parts = craftPickerParts(ctx, ctx.state.shown);
    if (ctx.state.shown === 'equip') home.prepend(...parts);
    else home.append(...parts);
    ctx.state.shown = '';
    ctx.state.pick = null;
}

export function craftPickerItem(ctx, key) { return (ctx.deps.game.inventory || []).find(row => ctx.deps.equipmentInventoryGridRuntime.getItemKey(row) === key); }

/** Why a bag item cannot be picked here, or '': the caller's rule, else jewels, cores and wards are not craft targets (js/bag-items.js). */
export function craftPickerBlock(ctx, item) { return ctx.state.pick.blocked ? ctx.state.pick.blocked(item) : ctx.deps.bagItems.isSpecial(item) ? (0, ctx.deps._t)('주얼, 코어, 액막이는 고를 수 없습니다.') : ''; }
