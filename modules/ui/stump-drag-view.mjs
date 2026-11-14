import { clearPress, endDrag } from './stump-drag-actions.mjs';
import { listenView, releaseViewEvents } from './view-events.mjs';
import { startPress, onPointerMove, onPointerUp, onPointerCancel, onTouchMove, onClickCapture, onKeydown, onHover, onLeave, onCellFocus, bind } from './stump-drag-actions.mjs';

export function createStumpDragView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { startPress, onPointerMove, onPointerUp, onPointerCancel, onTouchMove, onClickCapture, onKeydown, onHover, onLeave, onCellFocus, bind };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : undefined;
    initialize(runtime);

    runtime.api = StumpDragViewApi(runtime);
    installStumpDragViewEvents(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.DRAG_PX = 6;
    runtime.state.HOLD_MS = 280;
    runtime.state.TOUCH_SLOP_PX = 10;
    runtime.state.PAGE_HOVER_MS = 380;
    runtime.state.press = null;
    runtime.state.drag = null;
    runtime.state.swallowClick = false;
    runtime.state.frame = 0;
    runtime.state.pending = null;
    runtime.state.pageHover = null;
}

function installStumpDragViewEvents(runtime) {
    if (runtime.deps.document.readyState === 'loading') listenView(runtime, runtime.deps.document, 'DOMContentLoaded', runtime.handlers.bind, { once: true });
    else bind(runtime);
}
function StumpDragViewApi(runtime) {
    return Object.freeze({
        dispose: () => disposeStumpDragView(runtime)
    });
}

function disposeStumpDragView(runtime) {
    releaseViewEvents(runtime);
    clearPress(runtime);
    endDrag(runtime);
    runtime.deps.clearTimeout(runtime.state.swallowTimer);
    runtime.state.swallowClick = false;
}
