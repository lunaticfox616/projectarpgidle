import { slotsHtml, beltLineHtml, refuseWithoutSlot, colonyPanelHtml, craft, openEquipment, statName } from './colony-wards-markup.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createColonyWardsView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { slotsHtml, beltLineHtml, refuseWithoutSlot, colonyPanelHtml, craft, openEquipment, statName };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = Object.freeze({ slotsHtml: runtime.handlers.slotsHtml, beltLineHtml: runtime.handlers.beltLineHtml, refuseWithoutSlot: runtime.handlers.refuseWithoutSlot, colonyPanelHtml: runtime.handlers.colonyPanelHtml, craft: runtime.handlers.craft, openEquipment: runtime.handlers.openEquipment, statName: runtime.handlers.statName });

    return runtime.api;
}

function initialize(runtime) {
    runtime.state.R = runtime.deps.COLONY_WARD_RULES;
    runtime.state.NAMES = new Map(runtime.deps.COLONY_WARD_POOL.map(row => [row.id, row.name]));
    runtime.state.BELT_RANGE = `${runtime.state.R.beltSlots.min}~${runtime.state.R.beltSlots.max}`;
    runtime.state.NO_SLOT_HINT = '허리띠를 끼면 열립니다';
}
