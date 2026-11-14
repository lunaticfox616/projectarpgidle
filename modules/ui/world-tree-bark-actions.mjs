import { barkAllocateHtml, renderBarkPanel } from './world-tree-bark-markup.mjs';

export function drawBarkDialog(runtime) {
    if (!runtime.active) return;
    runtime.state.dialogOwner = runtime.deps.game;
    runtime.deps.selectionDialog.show({ id: runtime.state.DIALOG, title: (0, runtime.deps._t)('세계수 껍질'), panelClass: 'bark-dialog', body: barkAllocateHtml(runtime) });
}

export function refreshBarkScreens(runtime) {
    runtime.deps.playerStatCache.invalidate();
    renderBarkPanel(runtime);
    if (barkDialogOpen(runtime)) drawBarkDialog(runtime);
    runtime.deps.loopSettlementUi.render();
    (0, runtime.deps.updateStaticUI)();
    (0, runtime.deps.queueImportantSave)(200);
}

export function refused(runtime) {
    if (!runtime.active) return true;
    if (barkDialogOpen(runtime) && runtime.state.dialogOwner !== runtime.deps.game) {
        runtime.deps.selectionDialog.close(runtime.state.DIALOG);
        runtime.state.dialogOwner = null;
        return true;
    }
    const reason = runtime.deps.worldTreeBark.barkAllocationRefusal(runtime.deps.game);
    if (reason) (0, runtime.deps.addLog)(reason, 'attack-monster', { toast: true });
    return !!reason;
}

export function moveBarkPoints(runtime, key, delta) {
    if (refused(runtime)) return;
    if (runtime.deps.worldTreeBark.allocateBarkPoints(runtime.deps.game, key, delta)) refreshBarkScreens(runtime);
}

export function resetBarkAllocation(runtime) {
    if (refused(runtime)) return;
    if (runtime.deps.worldTreeBark.resetBarkPoints(runtime.deps.game)) refreshBarkScreens(runtime);
}

export function openBarkDialog(runtime) {
    if (!refused(runtime)) drawBarkDialog(runtime);
}

export function barkDialogOpen(runtime) { return !!runtime.deps.document.getElementById(runtime.state.DIALOG); }
