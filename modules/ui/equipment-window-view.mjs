import { salvageKind, slotName, render, renderBag, toggleLoadout, newDotHtml, tierHtml, baseStepHtml, inspectorDock, inspectorHtml, emptyHtml, wornSlots, compareNode, showPane, openSalvage, openItemFilter, toggleTools, salvageSummaryHtml, closeMenus, keepOnePanel, closePanelOnEscape, runRailToolOnDoubleClick } from './equipment-window-actions.mjs';
import { fillDeltas, toggleDeltas, cancelDeltaJob } from './equipment-window-comparison.mjs';
import { listenView, releaseViewEvents } from './view-events.mjs';
import { fillEmptySlots, renderLoadoutSummary, updateFullWarnings } from './equipment-window-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createEquipmentWindowView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { fillEmptySlots, renderLoadoutSummary, updateFullWarnings, salvageKind, slotName, render, renderBag, toggleLoadout, newDotHtml, tierHtml, baseStepHtml, inspectorDock, inspectorHtml, emptyHtml, fillDeltas, wornSlots, compareNode, showPane, toggleDeltas, openSalvage, openItemFilter, toggleTools, salvageSummaryHtml, closeMenus, keepOnePanel, closePanelOnEscape, runRailToolOnDoubleClick };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = Object.freeze({ render: runtime.handlers.render, renderBag: runtime.handlers.renderBag, toggleLoadout: runtime.handlers.toggleLoadout, newDotHtml: runtime.handlers.newDotHtml, tierHtml: runtime.handlers.tierHtml, baseStepHtml: runtime.handlers.baseStepHtml, inspectorDock: runtime.handlers.inspectorDock, inspectorHtml: runtime.handlers.inspectorHtml, emptyHtml: runtime.handlers.emptyHtml, fillDeltas: runtime.handlers.fillDeltas, wornSlots: runtime.handlers.wornSlots, compareNode: runtime.handlers.compareNode, showPane: runtime.handlers.showPane, toggleDeltas: runtime.handlers.toggleDeltas,
        openSalvage: runtime.handlers.openSalvage, openItemFilter: runtime.handlers.openItemFilter, toggleTools: runtime.handlers.toggleTools, salvageSummaryHtml: runtime.handlers.salvageSummaryHtml,
        fillEmptySlots: runtime.handlers.fillEmptySlots, renderLoadoutSummary: runtime.handlers.renderLoadoutSummary, updateFullWarnings: runtime.handlers.updateFullWarnings,
        dispose: () => disposeEquipmentWindow(runtime) });
    if (typeof runtime.deps.document !== 'undefined' && typeof runtime.deps.document.addEventListener === 'function') {
        listenView(runtime, runtime.deps.document, 'pointerdown', runtime.handlers.closeMenus, true);
        listenView(runtime, runtime.deps.document, 'toggle', runtime.handlers.keepOnePanel, true);
        listenView(runtime, runtime.deps.document, 'keydown', runtime.handlers.closePanelOnEscape, true);
        listenView(runtime, runtime.deps.document, 'dblclick', runtime.handlers.runRailToolOnDoubleClick, true);
    }
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.COLOR = Object.freeze({ dps: '#ffcf6e', life: '#ff6b6b', es: '#7fd3ff', fire: '#ff8a50', cold: '#6cb8ff', light: '#ffd54f', chaos: '#c39bff',
        armor: '#d2b98c', evasion: '#8fe08f', phys: '#d6cdb8' });
    runtime.state.EHP = Object.freeze([['물리', 'phys'], ['화염', 'fire'], ['냉기', 'cold'], ['번개', 'light'], ['카오스', 'chaos']]);
    runtime.state.DELTA_TINT = Object.freeze({ dps: 'dps', summonDps: 'dps', maxHp: 'life', energyShield: 'es', resF: 'fire', resC: 'cold', resL: 'light',
        resChaos: 'chaos', armor: 'armor', evasion: 'evasion' });
    runtime.state.RAIL_DOUBLE_CLICK = Object.freeze({
        'eqw-arrange-menu': () => runtime.deps.equipmentInventoryInteraction.autoArrange(),
        'eqw-salvage-menu': () => (0, runtime.deps.bulkSalvageAllInventory)(),
        'eqw-judge-menu': () => runtime.deps.equipmentTriage.start()
    });
    runtime.state.SALVAGE_KIND_ORDER = Object.freeze(['무기', '방패', '투구', '갑옷', '장갑', '신발', '반지', '목걸이', '허리띠', runtime.deps.bagItems.JEWEL, runtime.deps.bagItems.CORE, '액막이']);
    runtime.state.watched = null;
    runtime.state.bagShown = false;
    runtime.state.deltaCache = new Map();
    runtime.state.deltaJobs = new WeakMap();
    runtime.state.pendingDeltas = new Set();
    runtime.state.deltaOwner = null;
    runtime.state.bagObserver = null;
    runtime.state.bagOwner = null;
}

function disposeEquipmentWindow(runtime) {
    releaseViewEvents(runtime);
    runtime.state.bagObserver?.disconnect();
    runtime.state.bagObserver = null;
    runtime.state.bagOwner = null;
    runtime.state.watched = null;
    runtime.state.bagShown = false;
    for (const job of runtime.state.pendingDeltas) cancelDeltaJob(runtime, job);
    runtime.state.deltaCache.clear();
    runtime.state.deltaOwner = null;
}
