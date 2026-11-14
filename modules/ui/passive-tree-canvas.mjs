import { getPassiveNodeLook, createPassiveDrawFrame } from './passive-tree-frame.mjs';
import { drawPassiveNodeExtras, drawPassiveClassStartLabels } from './passive-tree-labels.mjs';

/** Every node in full at every zoom: its cached picture (js/canvas-passive-tree-art.js). Returns the nodes that also need a label,
* a search ring or an anchor mark, drawn after the pictures (drawPassiveNodeExtras). */
export function drawPassiveTreeNodes(runtime, ctx, nodes, frame, dpr) {
    const extras = [];
    nodes.forEach(node => {
        const visibility = (0, runtime.deps.getPassiveVisibility)(node.id);
        if (visibility === 'hidden') return;
        const look = getPassiveNodeLook(runtime, node, frame);
        runtime.art.drawNode(ctx, node, look, frame, dpr);
        if (look.anchor || look.searchHit || (!look.dimmed && runtime.deps.camZoom >= runtime.state.PASSIVE_EFFECT_LABEL_MIN_ZOOM)) extras.push({ node, look, visibility });
    });
    ctx.globalAlpha = 1;
    return extras;
}

export function getPassiveTreeBounds(runtime) {
    if (runtime.state.passiveNodeLayer.boundsFor === runtime.deps.passiveRenderCache.nodes) return runtime.state.passiveNodeLayer.bounds;
    const xs = runtime.deps.passiveRenderCache.nodes.map(node => node.x), ys = runtime.deps.passiveRenderCache.nodes.map(node => node.y);
    const bounds = { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
    runtime.state.passiveNodeLayer = { ...runtime.state.passiveNodeLayer, key: '', boundsFor: runtime.deps.passiveRenderCache.nodes, bounds };
    return bounds;
}

export function getPassiveNodeLayerKey(runtime, frame, dpr) {
    const search = (0, runtime.deps.getPassiveTreeSearchState)();
    const art = ['passiveTreeIcons', 'passiveTreeNotableIcons', 'passiveTreeKeystoneIcons', 'passiveTreeFrames']
        .map(key => ((0, runtime.deps.passiveNodePresentation.getPassiveTreeArtImage)(key) ? 1 : 0)).join('');
    return [runtime.deps.camZoom, dpr, runtime.deps.passiveRenderCache.stateSignature, frame.rootId, search.search, search.filter, art].join('|');
}

/** The tree's node extent at this zoom, wide enough for the largest picture (a start medallion at its smallest on-screen size). */
export function getPassiveNodeLayerRect(runtime, bounds) {
    const margin = Math.max(90, 16 / runtime.deps.camZoom);
    return { minX: bounds.minX - margin, minY: bounds.minY - margin, width: bounds.maxX - bounds.minX + margin * 2, height: bounds.maxY - bounds.minY + margin * 2 };
}

export function renderPassiveNodeLayer(runtime, frame, dpr, bounds, key) {
    const scale = runtime.deps.camZoom * dpr, canvas = runtime.state.passiveNodeLayer.canvas || runtime.deps.document.createElement('canvas');
    canvas.width = Math.ceil(bounds.width * scale);
    canvas.height = Math.ceil(bounds.height * scale);
    const layer = canvas.getContext('2d');
    layer.setTransform(scale, 0, 0, scale, -bounds.minX * scale, -bounds.minY * scale);
    const extras = drawPassiveTreeNodes(runtime, layer, runtime.deps.passiveRenderCache.nodes, frame, dpr);
    runtime.state.passiveNodeLayer = { ...runtime.state.passiveNodeLayer, key, canvas, extras };
}

/** The nodes for this frame: the far-view bitmap when it fits, else each visible node. Returns the extras to draw on top. */
export function drawPassiveNodesInView(runtime, ctx, visibleNodes, frame, dpr) {
    const bounds = getPassiveNodeLayerRect(runtime, getPassiveTreeBounds(runtime));
    const fits = runtime.deps.camZoom <= runtime.state.PASSIVE_NODE_LAYER_MAX_ZOOM && runtime.deps.passiveRevealBursts.length === 0
        && Math.max(bounds.width, bounds.height) * runtime.deps.camZoom * dpr <= runtime.state.PASSIVE_NODE_LAYER_MAX_PX;
    if (!fits) return drawPassiveTreeNodes(runtime, ctx, visibleNodes, frame, dpr);
    const key = getPassiveNodeLayerKey(runtime, frame, dpr);
    if (runtime.state.passiveNodeLayer.key !== key) renderPassiveNodeLayer(runtime, frame, dpr, bounds, key);
    ctx.drawImage(runtime.state.passiveNodeLayer.canvas, bounds.minX, bounds.minY, bounds.width, bounds.height);
    return runtime.state.passiveNodeLayer.extras;
}

export function getPassiveCanvasSize(runtime, canvas) {
    return {
        dpr: Math.max(1, runtime.deps.passiveCanvasMetrics.dpr || runtime.deps.window.devicePixelRatio || 1),
        width: runtime.deps.passiveCanvasMetrics.width || Math.max(1, canvas.clientWidth || 1),
        height: runtime.deps.passiveCanvasMetrics.height || Math.max(1, canvas.clientHeight || 1)
    };
}

export function drawPassiveTree(runtime) {
    (0, runtime.deps.cleanupPassiveBursts)();
    (0, runtime.deps.ensurePassiveRenderCache)();

    const canvas = runtime.deps.document.getElementById('tree-canvas');
    if (!canvas || canvas.offsetParent === null) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = getPassiveCanvasSize(runtime, canvas);

    // transform 누적 방지: 매 렌더 시작 시 setTransform으로 초기화
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);

    const viewport = (0, runtime.deps.getPassiveWorldViewport)(size.width, size.height);
    const visibleNodes = runtime.deps.passiveRenderCache.nodes.filter(node => (0, runtime.deps.isNodeInViewport)(node, viewport, 120));
    runtime.art.drawBackdrop(ctx, size.width, size.height);

    ctx.save();
    // setTransform 이후 카메라 zoom/translate 적용
    ctx.translate(size.width / 2 + runtime.deps.camX, size.height / 2 + runtime.deps.camY);
    ctx.scale(runtime.deps.camZoom, runtime.deps.camZoom);
    const frame = createPassiveDrawFrame(runtime);
    runtime.art.drawMotifs(ctx, viewport);
    runtime.art.drawLinks(ctx, frame);
    // 노드 효과 라벨은 화면 좌표상 서로 겹치지 않는 것만 그린다.
    runtime.state.passiveEffectLabelRects = [];
    drawPassiveNodeExtras(runtime, ctx, drawPassiveNodesInView(runtime, ctx, visibleNodes, frame, size.dpr));
    drawPassiveClassStartLabels(runtime, ctx, visibleNodes, frame);
    ctx.restore();

    // reachable/hover rings are maintained in the CSS overlay.
    runtime.handlers.syncPassiveTreeOverlay(size.width, size.height, visibleNodes, frame.linkedIds, frame.pathIds);
}
