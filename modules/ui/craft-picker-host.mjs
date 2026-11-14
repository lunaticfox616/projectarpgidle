import { craftPickerPress, craftPickerMount, craftPickerUnmount } from './craft-picker-host-actions.mjs';

/** Owns the temporarily moved equipment panel, selection callbacks and its mutation observer. */
export function createCraftPickerHost(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { craftPickerPress, craftPickerMount, craftPickerUnmount };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(undefined, ctx);
    initialize(ctx);
    ctx.api = Object.freeze({
        mount: ctx.handlers.craftPickerMount,
        unmount: ctx.handlers.craftPickerUnmount,
        /** Whether the picker shows the real loadout panel or bag now (then they are drawn even when the items tab is not). */
        shows: kind => ctx.state.shown === kind,
        /** The place the bag belongs while the inventory picker shows it, or null (js/stump-box-ui.js moveEquipmentBag). */
        bagHome: () => (ctx.state.shown === 'inventory' ? ctx.deps.document.querySelector('#craft-equip-host > .equipment-window') : null)
    });
    return ctx.api;
}

function initialize(ctx) {
    ctx.state.PANEL = Object.freeze({ equip: '.equipment-loadout-panel', inventory: '.equipment-inventory-panel' });
    ctx.state.HELD = Object.freeze(['pointerdown', 'dblclick', 'contextmenu', 'dragstart']);
    ctx.state.shown = '';
    ctx.state.pick = null;
    ctx.state.dimmer = null;
}
