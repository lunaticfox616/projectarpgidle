import { hideCanvasTooltip, updateDrag, updateHoverNode, resizePassiveTreeCanvas, setupCanvasEvents } from './passive-scene-input.mjs';
import { getPassiveNodeAtTouch } from './passive-node-hit.mjs';
import { listen, disposeCanvasEvents } from './passive-input-events.mjs';
import { renderPassiveTooltip } from './passive-node-tooltip.mjs';
import { activateHoveredPassive } from './passive-node-activation.mjs';
import { getPassiveTreeViewAngle, syncPassiveTreeView, clampPassiveCamera, fitPassiveCameraToBounds } from './passive-scene-camera.mjs';
import { cleanupPassiveBursts, getNodeRevealAmount } from './passive-scene-reveal.mjs';
import { markPassiveRenderCacheDirty, ensurePassiveRenderCache, getPassiveWorldViewport, isNodeInViewport, isEdgeInViewport } from './passive-scene-cache.mjs';
import { createPassiveNodePresentation } from './passive-node-presentation.mjs';

/** Transient tree camera, input and geometry cache. Never serialized into the save. */
export function createPassiveScene(deps) {
    const runtime = { deps, state: {}, handlers: {}, listeners: [], boundCanvas: null, nodes: createPassiveNodePresentation(deps) };
    const handlers = { hideCanvasTooltip, updateDrag, updateHoverNode, getPassiveNodeAtTouch, renderPassiveTooltip, activateHoveredPassive, getPassiveTreeViewAngle, syncPassiveTreeView, clampPassiveCamera, fitPassiveCameraToBounds, cleanupPassiveBursts, getNodeRevealAmount, markPassiveRenderCacheDirty, ensurePassiveRenderCache, getPassiveWorldViewport, isNodeInViewport, isEdgeInViewport, resizePassiveTreeCanvas, setupCanvasEvents };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    runtime.handlers.listen = listen.bind(undefined, runtime);
    runtime.handlers.dispose = disposeCanvasEvents.bind(undefined, runtime);
    initialize(runtime);
    return Object.freeze({ state: runtime.state, nodes: runtime.nodes, dispose: runtime.handlers.dispose,
        getPassiveTreeViewAngle: runtime.handlers.getPassiveTreeViewAngle,
        syncPassiveTreeView: runtime.handlers.syncPassiveTreeView,
        clampPassiveCamera: runtime.handlers.clampPassiveCamera,
        fitPassiveCameraToBounds: runtime.handlers.fitPassiveCameraToBounds,
        cleanupPassiveBursts: runtime.handlers.cleanupPassiveBursts,
        getNodeRevealAmount: runtime.handlers.getNodeRevealAmount,
        markPassiveRenderCacheDirty: runtime.handlers.markPassiveRenderCacheDirty,
        ensurePassiveRenderCache: runtime.handlers.ensurePassiveRenderCache,
        getPassiveWorldViewport: runtime.handlers.getPassiveWorldViewport,
        isNodeInViewport: runtime.handlers.isNodeInViewport,
        isEdgeInViewport: runtime.handlers.isEdgeInViewport,
        resizePassiveTreeCanvas: runtime.handlers.resizePassiveTreeCanvas,
        setupCanvasEvents: runtime.handlers.setupCanvasEvents });
}

function initialize(runtime) {
    runtime.state.passiveRevealBursts = [];
    runtime.state.passiveTreeViewAngle = 0;
    runtime.state.hoverNode = null;
    runtime.state.camX = 0;
    runtime.state.camY = 0;
    runtime.state.camZoom = 0.3;
    runtime.state.passiveCameraInitialized = false;
    runtime.state.passiveCanvasMetrics = { width: 0, height: 0, dpr: 1 };
    runtime.state.passiveRenderCache = {
        structureDirty: true,
        stateDirty: true,
        nodes: [],
        edges: [],
        glowNodes: [],
        activeEdges: [],
        hoverGrid: new Map(),
        adjacency: new Map(),
        hoverPath: null,
        cellSize: 180,
        stateSignature: ''
    };
    runtime.state.isDragging = false;
    runtime.state.dragStartX = 0;
    runtime.state.dragStartY = 0;
    runtime.state.dragDist = 0;
    runtime.state.canvas = null;
    runtime.state.canvasTooltip = null;
    runtime.state.pendingTouchPassiveId = null;
    runtime.state.pendingTouchPassiveAt = null;
    runtime.state.pendingTouchPassiveRefundId = null;
    runtime.state.pendingTouchPassiveRefundAt = null;
}
