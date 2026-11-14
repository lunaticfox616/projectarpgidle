import { syncPassiveTreeView, getPassiveTreeViewAngle } from './passive-scene-camera.mjs';

export function markPassiveRenderCacheDirty(runtime, type) {
    if (!runtime.state.passiveRenderCache) return;
    if (type === 'structure') runtime.state.passiveRenderCache.structureDirty = true;
    runtime.state.passiveRenderCache.stateDirty = true;
    runtime.state.passiveRenderCache.hoverPath = null;
}

export function getPassiveStateSignature(runtime) {
    let passives = (runtime.deps.game.passives || []).slice().sort().join('|');
    let discovered = Array.from(runtime.deps.discoveredPassiveNodes || []).sort().join('|');
    let reachable = Array.from(runtime.deps.reachableNodes || []).sort().join('|');
    return `${passives}::${discovered}::${reachable}`;
}

export function rebuildPassiveStructureCache(runtime) {
    let nodes = Object.values(runtime.deps.PASSIVE_TREE.nodes || {});
    let edges = (runtime.deps.PASSIVE_TREE.edges || []).map(edge => {
        let a = runtime.deps.PASSIVE_TREE.nodes[edge.from];
        let b = runtime.deps.PASSIVE_TREE.nodes[edge.to];
        if (!a || !b) return null;
        return { ...edge, a, b };
    }).filter(Boolean);
    runtime.state.passiveRenderCache.nodes = nodes;
    runtime.state.passiveRenderCache.edges = edges;
    runtime.state.passiveRenderCache.hoverGrid = new Map();
    runtime.state.passiveRenderCache.adjacency = typeof runtime.deps.getPassiveTreeAdjacency === 'function'
        ? (0, runtime.deps.getPassiveTreeAdjacency)() : new Map();
    let cellSize = runtime.state.passiveRenderCache.cellSize;
    nodes.forEach(node => {
        let cx = Math.floor(node.x / cellSize);
        let cy = Math.floor(node.y / cellSize);
        let key = `${cx},${cy}`;
        if (!runtime.state.passiveRenderCache.hoverGrid.has(key)) runtime.state.passiveRenderCache.hoverGrid.set(key, []);
        runtime.state.passiveRenderCache.hoverGrid.get(key).push(node);
    });
    runtime.state.passiveRenderCache.hoverPath = null;
    runtime.state.passiveRenderCache.structureDirty = false;
}

export function rebuildPassiveStateCache(runtime) {
    runtime.state.passiveRenderCache.glowNodes = [];
    runtime.state.passiveRenderCache.activeEdges = runtime.state.passiveRenderCache.edges.filter(edge => {
        if (!(0, runtime.deps.isPassiveTreeEdgeAvailable)(edge)) return false;
        if (!(0, runtime.deps.isPassiveNodeAvailable)(edge.a) || !(0, runtime.deps.isPassiveNodeAvailable)(edge.b)) return false;
        let va = (0, runtime.deps.getPassiveVisibility)(edge.a.id);
        let vb = (0, runtime.deps.getPassiveVisibility)(edge.b.id);
        return va !== 'hidden' && vb !== 'hidden';
    });
    runtime.state.passiveRenderCache.stateSignature = getPassiveStateSignature(runtime);
    runtime.state.passiveRenderCache.stateDirty = false;
}

export function ensurePassiveRenderCache(runtime) {
    syncPassiveTreeView(runtime);
    if (runtime.state.passiveRenderCache.viewAngle !== getPassiveTreeViewAngle(runtime)) {
        runtime.state.passiveRenderCache.viewAngle = getPassiveTreeViewAngle(runtime);
        markPassiveRenderCacheDirty(runtime, 'structure');
    }
    if (runtime.state.passiveRenderCache.structureDirty) rebuildPassiveStructureCache(runtime);
    if (runtime.state.passiveRenderCache.stateDirty) rebuildPassiveStateCache(runtime);
}

export function getPassiveWorldViewport(runtime, displayWidth, displayHeight) {
    let halfW = displayWidth / 2;
    let halfH = displayHeight / 2;
    return {
        minX: (-halfW - runtime.state.camX) / runtime.state.camZoom,
        maxX: (halfW - runtime.state.camX) / runtime.state.camZoom,
        minY: (-halfH - runtime.state.camY) / runtime.state.camZoom,
        maxY: (halfH - runtime.state.camY) / runtime.state.camZoom
    };
}

export function isNodeInViewport(runtime, node, viewport, margin) {
    let m = Number.isFinite(margin) ? margin : 0;
    return node.x >= viewport.minX - m && node.x <= viewport.maxX + m && node.y >= viewport.minY - m && node.y <= viewport.maxY + m;
}

export function isEdgeInViewport(runtime, edge, viewport, margin) {
    let m = Number.isFinite(margin) ? margin : 0;
    let minX = Math.min(edge.a.x, edge.b.x);
    let maxX = Math.max(edge.a.x, edge.b.x);
    let minY = Math.min(edge.a.y, edge.b.y);
    let maxY = Math.max(edge.a.y, edge.b.y);
    return !(maxX < viewport.minX - m || minX > viewport.maxX + m || maxY < viewport.minY - m || minY > viewport.maxY + m);
}
