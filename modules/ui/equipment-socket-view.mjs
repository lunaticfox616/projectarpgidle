import { contentOf, socketRowHtml, actionHtml, badgesHtml, socketClick, dropJewel, tooltipHtml, open, close, insert, insertHarvest, remove, chisel, salvage, refine } from './equipment-socket-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createEquipmentSocketView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { contentOf, socketRowHtml, actionHtml, badgesHtml, socketClick, dropJewel, tooltipHtml, open, close, insert, insertHarvest, remove, chisel, salvage, refine };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = Object.freeze({ actionHtml: runtime.handlers.actionHtml, badgesHtml: runtime.handlers.badgesHtml, socketClick: runtime.handlers.socketClick, dropJewel: runtime.handlers.dropJewel, tooltipHtml: runtime.handlers.tooltipHtml, open: runtime.handlers.open, close: runtime.handlers.close, insert: runtime.handlers.insert, insertHarvest: runtime.handlers.insertHarvest, remove: runtime.handlers.remove, chisel: runtime.handlers.chisel, salvage: runtime.handlers.salvage, refine: runtime.handlers.refine });

    return runtime.api;
}

function initialize(runtime) {
    runtime.state.OVERLAY_ID = 'equipment-socket-overlay';
    runtime.state.REFINE_COST = 12;
    runtime.state.socketLabel = runtime.deps.equipmentSockets.label;
}
