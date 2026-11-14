import { render, decorateLoadout, getInactiveAffixIds, tooltipBox } from './equipment-inspection-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createEquipmentInspectionView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { render, decorateLoadout, getInactiveAffixIds, tooltipBox };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = Object.freeze({ render: runtime.handlers.render, decorateLoadout: runtime.handlers.decorateLoadout, getInactiveAffixIds: runtime.handlers.getInactiveAffixIds, tooltipBox: runtime.handlers.tooltipBox,
        dispose: () => initialize(runtime) });

    return runtime.api;
}

function initialize(runtime) {
    runtime.state.activeDetails = null;
    runtime.state.activeSignature = '';
    runtime.state.activeSelection = '';
    runtime.state.previousEquipment = null;
    runtime.state.changedUntil = new Map();
}
