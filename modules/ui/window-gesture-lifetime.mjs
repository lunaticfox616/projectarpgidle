import { listenView, releaseViewEvents } from './view-events.mjs';

/** The window and log resize gestures share capture/cancel ownership, not saved layout. */
export function beginCapturedWindowGesture(runtime, handle, pointerId, callbacks) {
    cancelWindowGesture(runtime);
    const owner = runtime.deps.game;
    const gesture = { active: true, listeners: [], handle, cancelWindowPointer: () => finishWindowPointer(false) };
    const finishWindowPointer = commit => {
        if (!gesture.active) return;
        releaseViewEvents(gesture);
        runtime.state.gesture = null;
        if (handle.hasPointerCapture?.(pointerId)) handle.releasePointerCapture(pointerId);
        if (callbacks.text) holdTextStill(runtime, false);
        callbacks.finish(commit && runtime.active && owner === runtime.deps.game && handle.isConnected);
    };
    runtime.state.gesture = gesture;
    handle.setPointerCapture(pointerId);
    if (callbacks.text) holdTextStill(runtime, true);
    listenView(gesture, handle, 'pointermove', event => {
        if (event.pointerId !== pointerId) return;
        if (!runtime.active || owner !== runtime.deps.game || !handle.isConnected) { finishWindowPointer(false); return; }
        callbacks.move(event);
    });
    listenView(gesture, handle, 'pointerup', event => { if (event.pointerId === pointerId) finishWindowPointer(true); });
    listenView(gesture, handle, 'pointercancel', event => { if (event.pointerId === pointerId) finishWindowPointer(false); });
    listenView(gesture, handle, 'lostpointercapture', event => { if (event.pointerId === pointerId) finishWindowPointer(false); });
}

export function cancelWindowGesture(runtime, root) {
    const gesture = runtime.state.gesture;
    if (!gesture || (root && !root.contains(gesture.handle))) return;
    gesture.cancelWindowPointer();
}

export function stopTextDrag(runtime, event) { return event.preventDefault(); }

export function holdTextStill(runtime, on) {
    runtime.deps.document.documentElement.classList.toggle('ui-window-gesture', on);
    runtime.deps.document[on ? 'addEventListener' : 'removeEventListener']('selectstart', runtime.handlers.stopTextDrag, true);
    runtime.deps.document[on ? 'addEventListener' : 'removeEventListener']('dragstart', runtime.handlers.stopTextDrag, true);
    if (on) runtime.deps.window.getSelection()?.removeAllRanges();
}
