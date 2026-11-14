import { getPassiveNodeAtClientPosition } from './passive-node-hit.mjs';
import { renderPassiveTooltip } from './passive-node-tooltip.mjs';
import { clampPassiveCamera } from './passive-scene-camera.mjs';
import { activateHoveredPassive } from './passive-node-activation.mjs';

export function resizePassiveTreeCanvas(runtime, force) {
    const canvas = runtime.deps.document.getElementById('tree-canvas');
    if (!canvas) return false;
    let parent = canvas.parentElement || runtime.deps.document.getElementById('tree-container');
    if (!parent || canvas.offsetParent === null) return false;
    let rect = parent.getBoundingClientRect();
    let displayWidth = Math.max(1, Math.floor(rect.width / runtime.deps.uiDisplay.factor));
    let displayHeight = Math.max(1, Math.floor(rect.height / runtime.deps.uiDisplay.factor));
    if (displayWidth < 50 || displayHeight < 50) return false;
    let dpr = runtime.deps.passiveSelectionUi.pixelRatio();
    let bufferWidth = Math.max(1, Math.round(displayWidth * dpr));
    let bufferHeight = Math.max(1, Math.round(displayHeight * dpr));
    let changed = canvasSizeChanged(runtime, force, canvas, { bufferWidth, bufferHeight, displayWidth, displayHeight, dpr });
    if (!changed) return false;

    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    canvas.width = bufferWidth;
    canvas.height = bufferHeight;
    runtime.state.passiveCanvasMetrics.width = displayWidth;
    runtime.state.passiveCanvasMetrics.height = displayHeight;
    runtime.state.passiveCanvasMetrics.dpr = dpr;
    if (typeof runtime.deps.updatePassiveTreeOverlayTransform === 'function') (0, runtime.deps.updatePassiveTreeOverlayTransform)(displayWidth, displayHeight);

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
}

export function hideCanvasTooltip(runtime) {
    runtime.deps.passiveSelectionUi.hide();
    if (!runtime.state.canvasTooltip) return;
    runtime.state.canvasTooltip.style.display = 'none';
    (0, runtime.deps.clearActiveTooltip)('canvas-tooltip');
}

export function updateHoverNode(runtime, clientX, clientY) {
    let oldHover = runtime.state.hoverNode;
    runtime.state.hoverNode = getPassiveNodeAtClientPosition(runtime, clientX, clientY, 0);
    if (oldHover !== runtime.state.hoverNode) {
        (0, runtime.deps.drawPassiveTree)();
        if (runtime.deps.uiDisplay.matches('(max-width: 1080px)')) return;
        if (runtime.state.hoverNode) renderPassiveTooltip(runtime, runtime.state.hoverNode, clientX, clientY);
        else hideCanvasTooltip(runtime);
    } else if (runtime.state.hoverNode) {
        (0, runtime.deps.positionTooltipElement)(runtime.state.canvasTooltip, clientX, clientY);
    }
}

export function updateDrag(runtime, clientX, clientY, deltaX, deltaY) {
    runtime.state.camX = clientX / runtime.deps.uiDisplay.factor - runtime.state.dragStartX;
    runtime.state.camY = clientY / runtime.deps.uiDisplay.factor - runtime.state.dragStartY;
    clampPassiveCamera(runtime);
    runtime.state.dragDist += Math.abs(deltaX) + Math.abs(deltaY);
    if (runtime.state.dragDist >= 10) {
        runtime.state.pendingTouchPassiveId = null;
        runtime.state.pendingTouchPassiveRefundId = null;
    }
    (0, runtime.deps.drawPassiveTree)();
    hideCanvasTooltip(runtime);
}

export function setupCanvasEvents(runtime, setupBattlefieldMovementInteraction) {
    if (runtime.boundCanvas) return;
    runtime.deps.passiveSelectionUi.bindTools(runtime.handlers.listen);
    (0, runtime.deps.setupPassiveTreeSearchControls)();
    setupBattlefieldMovementInteraction();
    runtime.state.canvas = runtime.deps.document.getElementById('tree-canvas');
    if (!runtime.state.canvas) return;
    runtime.boundCanvas = runtime.state.canvas;
    runtime.state.canvasTooltip = runtime.deps.document.getElementById('canvas-tooltip');
    runtime.state.pendingTouchPassiveId = null;
    runtime.state.pendingTouchPassiveAt = 0;
    runtime.state.pendingTouchPassiveRefundId = null;
    runtime.state.pendingTouchPassiveRefundAt = 0;
    runtime.deps.window.hidePassiveNodeTooltip = runtime.handlers.hideCanvasTooltip;
    bindPassiveTreeMouseEvents(runtime, runtime.state.canvas, { drag: runtime.handlers.updateDrag, hover: runtime.handlers.updateHoverNode, hideTooltip: runtime.handlers.hideCanvasTooltip,
        activate: async point => {
            if (runtime.deps.uiDisplay.matches('(max-width: 1080px)')) {
                const node = getPassiveNodeAtClientPosition(runtime, point.clientX, point.clientY, 0);
                return runtime.deps.passiveSelectionUi.touch(node, point, { preview: runtime.handlers.renderPassiveTooltip, activate: runtime.handlers.activateHoveredPassive });
            }
            await activateHoveredPassive(runtime, point);
            if (runtime.state.hoverNode && runtime.state.canvasTooltip.style.display !== 'none') {
                renderPassiveTooltip(runtime, runtime.state.hoverNode, point.clientX, point.clientY);
            }
        }
    });
    runtime.handlers.listen(runtime.state.canvas, 'wheel', e => {
        e.preventDefault();
        let rect = runtime.state.canvas.getBoundingClientRect();
        let centerX = runtime.state.canvas.clientWidth / 2;
        let centerY = runtime.state.canvas.clientHeight / 2;
        let localX = (e.clientX - rect.left) * runtime.state.canvas.clientWidth / rect.width;
        let localY = (e.clientY - rect.top) * runtime.state.canvas.clientHeight / rect.height;
        let worldX = (localX - centerX - runtime.state.camX) / runtime.state.camZoom;
        let worldY = (localY - centerY - runtime.state.camY) / runtime.state.camZoom;
        runtime.state.camZoom *= (e.deltaY > 0 ? 0.74 : 1.32);
        runtime.state.camZoom = (0, runtime.deps.clampNumber)(runtime.state.camZoom, 0.09, 2.5);
        runtime.state.camX = localX - centerX - worldX * runtime.state.camZoom;
        runtime.state.camY = localY - centerY - worldY * runtime.state.camZoom;
        clampPassiveCamera(runtime);
        (0, runtime.deps.drawPassiveTree)();
    });
    runtime.deps.passiveSelectionUi.bindTouch(runtime.state.canvas, { drag: runtime.handlers.updateDrag, hideTooltip: runtime.handlers.hideCanvasTooltip,
        nodeAt: runtime.handlers.getPassiveNodeAtTouch, preview: runtime.handlers.renderPassiveTooltip, activate: runtime.handlers.activateHoveredPassive }, runtime.handlers.listen);
    resizePassiveTreeCanvas(runtime, true);
}

export function bindPassiveTreeMouseEvents(runtime, canvas, handlers) {
    runtime.handlers.listen(canvas, 'mousedown', e => {
        if (e.button !== 0) return;
        runtime.state.isDragging = true;
        runtime.state.dragDist = 0;
        runtime.state.dragStartX = e.clientX / runtime.deps.uiDisplay.factor - runtime.state.camX;
        runtime.state.dragStartY = e.clientY / runtime.deps.uiDisplay.factor - runtime.state.camY;
        handlers.hover(e.clientX, e.clientY);
        canvas.style.cursor = 'grabbing';
    });
    runtime.handlers.listen(runtime.deps.document, 'mousemove', e => {
        if (runtime.state.isDragging) {
            handlers.drag(e.clientX, e.clientY, e.movementX, e.movementY);
            return;
        }
        if (e.target === canvas) handlers.hover(e.clientX, e.clientY);
        }, true);
    runtime.handlers.listen(runtime.deps.document, 'mouseup', e => {
        if (!runtime.state.isDragging || e.button !== 0) return;
        runtime.state.isDragging = false;
        canvas.style.cursor = 'grab';
        if (e.target === canvas) handlers.activate({ clientX: e.clientX, clientY: e.clientY });
        }, true);
    runtime.handlers.listen(runtime.deps.window, 'blur', () => { runtime.state.isDragging = false; canvas.style.cursor = 'grab'; });
    runtime.handlers.listen(canvas, 'mouseleave', () => {
        if (runtime.state.isDragging || runtime.deps.uiDisplay.matches('(max-width: 1080px)')) return;
        runtime.state.hoverNode = null;
        canvas.style.cursor = 'grab';
        (0, runtime.deps.drawPassiveTree)();
        handlers.hideTooltip();
    });
}

function canvasSizeChanged(runtime, force, canvas, dimensions) {
    const { bufferWidth, bufferHeight, displayWidth, displayHeight, dpr } = dimensions;
    return !!force
        || canvas.width !== bufferWidth
        || canvas.height !== bufferHeight
        || runtime.state.passiveCanvasMetrics.width !== displayWidth
        || runtime.state.passiveCanvasMetrics.height !== displayHeight
        || Math.abs((runtime.state.passiveCanvasMetrics.dpr || 1) - dpr) > 0.001;
}
