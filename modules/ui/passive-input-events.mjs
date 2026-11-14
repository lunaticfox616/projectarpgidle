/** Records only this tree's listeners; native browser targets keep the original listener and options. */
export function listen(runtime, target, type, handler, options) {
    target.addEventListener(type, handler, options);
    runtime.listeners.push({ target, type, handler, options });
}

export function disposeCanvasEvents(runtime) {
    for (const { target, type, handler, options } of runtime.listeners) {
        target.removeEventListener(type, handler, options);
    }
    runtime.listeners.length = 0;
    runtime.boundCanvas = null;
    runtime.state.isDragging = false;
    runtime.state.hoverNode = null;
    runtime.deps.passiveSelectionUi.dispose();
    if (runtime.deps.window.hidePassiveNodeTooltip === runtime.handlers.hideCanvasTooltip) {
        delete runtime.deps.window.hidePassiveNodeTooltip;
    }
    runtime.state.canvas = null;
    runtime.state.canvasTooltip = null;
}
