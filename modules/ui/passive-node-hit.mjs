import { ensurePassiveRenderCache } from './passive-scene-cache.mjs';

/** 손가락은 도트 노드보다 굵다: 터치는 화면 반지름 22px(지름 44px) 안의 가장 가까운 노드를 고른다. */
export function getPassiveNodeAtTouch(runtime, touch) {
    return getPassiveNodeAtClientPosition(runtime, touch.clientX, touch.clientY, 22);
}

/** minScreenRadius: 이 화면 반지름(px) 안이면 노드로 본다(마우스 0 — 그린 반지름 + 8). */
export function getPassiveNodeAtClientPosition(runtime, clientX, clientY, minScreenRadius) {
    ensurePassiveRenderCache(runtime);
    const rect = runtime.state.canvas.getBoundingClientRect();
    const viewW = runtime.state.passiveCanvasMetrics.width || rect.width;
    const viewH = runtime.state.passiveCanvasMetrics.height || rect.height;
    const minRadius = minScreenRadius * viewW / rect.width / runtime.state.camZoom;
    const worldX = ((clientX - rect.left) * viewW / rect.width - viewW / 2 - runtime.state.camX) / runtime.state.camZoom;
    const worldY = ((clientY - rect.top) * viewH / rect.height - viewH / 2 - runtime.state.camY) / runtime.state.camZoom;
    let found = null;
    let foundDistance = Infinity;
    let cellSize = runtime.state.passiveRenderCache.cellSize;
    let cx = Math.floor(worldX / cellSize);
    let cy = Math.floor(worldY / cellSize);
    const candidates = nodeHitCandidates(runtime, cx, cy);
    let nearbyNodes = (candidates.length > 0 ? candidates : runtime.state.passiveRenderCache.nodes);
    nearbyNodes.forEach(node => {
        if ((0, runtime.deps.getPassiveVisibility)(node.id) === 'hidden') return;
        let radius = Math.max((0, runtime.nodes.getPassiveNodeVisualRadius)(node) + 8, minRadius);
        let distance = Math.hypot(node.x - worldX, node.y - worldY);
        if (distance > radius) return;
        if (!found || distance < foundDistance) {
            found = node;
            foundDistance = distance;
        }
    });
    return found;
}

function nodeHitCandidates(runtime, cx, cy) {
    const candidates = [];
    for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
            let bucket = runtime.state.passiveRenderCache.hoverGrid.get(`${cx + ox},${cy + oy}`);
            if (bucket && bucket.length) candidates.push(...bucket);
        }
    }
    return candidates;
}
