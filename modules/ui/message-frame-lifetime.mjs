import { listenView } from './view-events.mjs';

export function cancelMessagePointer(runtime) {
    runtime.state.pointer?.cancelMessagePointer();
}

export function clearMessageClickTimer(runtime) {
    runtime.deps.clearTimeout(runtime.state.clickTimer);
    runtime.state.clickTimer = null;
    runtime.state.suppressClick = false;
}

export function syncMessageOwner(runtime) {
    if (runtime.state.owner === runtime.deps.game) return;
    runtime.state.owner = runtime.deps.game;
    cancelMessagePointer(runtime);
    clearMessageClickTimer(runtime);
    runtime.state.stageBox = null;
    runtime.state.visible.clear();
}

export function listenMessage(runtime, target, type, callback) {
    listenView(runtime, target, type, event => {
        if (!runtime.active) return;
        syncMessageOwner(runtime);
        callback(event);
    });
}
