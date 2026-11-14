import { listenView, releaseViewEvents } from './view-events.mjs';
import { renderBarkPanel, barkSettlementHtml, barkMapChipHtml, barkStepsNow } from './world-tree-bark-markup.mjs';
import { openBarkDialog, moveBarkPoints, resetBarkAllocation, barkDialogOpen } from './world-tree-bark-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createWorldTreeBarkView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { renderBarkPanel, openBarkDialog, moveBarkPoints, resetBarkAllocation, barkSettlementHtml, barkMapChipHtml, barkDialogOpen };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = Object.freeze({
        dispose: () => disposeWorldTreeBarkView(runtime),
        renderBarkPanel: runtime.handlers.renderBarkPanel,
        openBarkDialog: runtime.handlers.openBarkDialog,
        moveBarkPoints: runtime.handlers.moveBarkPoints,
        resetBarkAllocation: runtime.handlers.resetBarkAllocation,
        barkSettlementHtml: runtime.handlers.barkSettlementHtml,
        barkMapChipHtml: runtime.handlers.barkMapChipHtml,
        barkDialogOpen: runtime.handlers.barkDialogOpen
    });
    listenView(runtime, runtime.deps.window, 'project-idle:bark-points', event => {
        const { gain, why } = event.detail || {};
        if (barkStepsNow(runtime)) (0, runtime.deps.addLog)((0, runtime.deps._t)('🌿 껍질 포인트 +{gain}: {why}', { gain, why }), 'season-up', { toast: true });
    });
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.DIALOG = 'bark-allocate-dialog';
    runtime.state.perPointText = { damage: '1점당 +10%', taken: '1점당 -1%', move: '1점당 +1%', reach: '1점당 지역 1개' };
}

function disposeWorldTreeBarkView(runtime) {
    releaseViewEvents(runtime);
    runtime.deps.selectionDialog.close(runtime.state.DIALOG);
    runtime.state.dialogOwner = null;
}
