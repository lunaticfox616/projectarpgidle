/** The nodes a hover would allocate (tooltip cost, "이 노드까지 할당 시" preview, drawn path). An Andromeda free node is itself alone, at one point
* (js/passives.js getPassiveActivationPath): the tooltip counted the way to the nearest owned node (2026-10-20 review: "9포인트 필요"
* for a node taken at one point). */
export function getHoverAllocationNodeIds(runtime, hoveredNodeId) {
    if (hoveredNodeId && runtime.deps.passiveRouting.freeNodes(runtime.deps.PASSIVE_TREE, runtime.deps.game).has(String(hoveredNodeId))) return new Set([hoveredNodeId]);
    return getHoveredPassivePathNodeIds(runtime, hoveredNodeId);
}

/** The shortest way from the hovered node to an owned one, around the blocked starts. @returns {{target: ?string, prev: Map}} */
export function findHoveredPassiveRoute(runtime, hoveredNodeId, adj, owned, blockedStarts) {
    const queue = [hoveredNodeId], prev = new Map([[hoveredNodeId, null]]);
    if (owned.has(hoveredNodeId)) return { target: hoveredNodeId, prev };
    for (let index = 0; index < queue.length; index++) {
        for (const next of adj.get(queue[index]) || []) {
            if (prev.has(next) || blockedStarts.has(next)) continue;
            prev.set(next, queue[index]);
            if (owned.has(next)) return { target: next, prev };
            queue.push(next);
        }
    }
    return { target: null, prev };
}

export function getHoveredPassivePathNodeIds(runtime, hoveredNodeId) {
    if (!hoveredNodeId) return new Set();
    const cacheKey = String(hoveredNodeId);
    const cached = runtime.deps.passiveRenderCache && runtime.deps.passiveRenderCache.hoverPath;
    if (pathCacheMatches(runtime, cached, cacheKey)) return cached.path;
    const adj = runtime.deps.passiveRenderCache && runtime.deps.passiveRenderCache.adjacency;
    if (!(adj instanceof Map) || adj.size === 0) return new Set([hoveredNodeId]);
    // 다른 직업의 시작점은 통로 키스톤 없이 지나가지 못한다(js/passives.js getPassiveActivationPath): 툴팁의 포인트와 그려지는 길도 그 길을 따른다.
    const blockedStarts = (0, runtime.deps.getPassiveBlockedStartIds)();
    if (blockedStarts.has(hoveredNodeId)) return new Set([hoveredNodeId]);
    let owned = connectionNodes(runtime);
    owned.add(typeof runtime.deps.getPassiveTreeRootNodeId === 'function' ? (0, runtime.deps.getPassiveTreeRootNodeId)() : 'n0');
    const { target, prev } = findHoveredPassiveRoute(runtime, hoveredNodeId, adj, owned, blockedStarts);
    let path = new Set([hoveredNodeId]);
    if (!target) return path;
    appendPredecessorPath(path, target, prev);
    runtime.deps.passiveRenderCache.hoverPath = { nodeId: cacheKey, stateSignature: runtime.deps.passiveRenderCache.stateSignature, path };
    return path;
}

export function getHoveredPassiveLinkedIds(runtime, hoverId) {
    const ids = new Set();
    if (!hoverId) return ids;
    ids.add(hoverId);
    (runtime.deps.passiveRenderCache.edges || []).forEach(edge => {
        if (edge.from === hoverId) ids.add(edge.to);
        else if (edge.to === hoverId) ids.add(edge.from);
    });
    return ids;
}

export function createPassiveDrawFrame(runtime) {
    const hoverId = runtime.deps.hoverNode && runtime.deps.hoverNode.id ? runtime.deps.hoverNode.id : null;
    const allocated = new Set(runtime.deps.game.passives || []);
    return {
        hoverId,
        allocated,
        isActive: id => allocated.has(id),
        blackHoles: new Set(runtime.deps.passiveRouting.transcendentNodeIds(runtime.deps.game, 'blackHole')),
        linkedIds: getHoveredPassiveLinkedIds(runtime, hoverId),
        pathIds: getHoverAllocationNodeIds(runtime, hoverId),
        rootId: (0, runtime.deps.getPassiveTreeRootNodeId)()
    };
}

export function getPassiveNodeSearchLook(runtime, node) {
    const search = typeof runtime.deps.getPassiveNodeSearchMatch === 'function' ? (0, runtime.deps.getPassiveNodeSearchMatch)(node) : null;
    if (!search || !search.active) return { dimmed: false, searchHit: false };
    return { dimmed: !search.matches, searchHit: !!search.matches };
}

export function getPassiveNodeLook(runtime, node, frame) {
    const look = getPassiveNodeSearchLook(runtime, node);
    look.active = frame.allocated.has(node.id);
    look.reachable = runtime.deps.reachableNodes.has(node.id);
    look.anchor = frame.blackHoles.has(node.id);
    look.alpha = (0, runtime.deps.getNodeRevealAmount)(node) * (look.dimmed ? 0.28 : 1);
    look.radius = (0, runtime.deps.passiveNodePresentation.getPassiveNodeVisualRadius)(node);
    return look;
}

function pathCacheMatches(runtime, cached, cacheKey) {
    return cached && cached.nodeId === cacheKey && cached.stateSignature === runtime.deps.passiveRenderCache.stateSignature;
}

function connectionNodes(runtime) {
    return typeof runtime.deps.getPassiveConnectionNodeIds === 'function'
        ? (0, runtime.deps.getPassiveConnectionNodeIds)()
        : new Set((runtime.deps.game.passives || []).filter(Boolean));
}

function appendPredecessorPath(path, target, prev) {
    let cur = target;
    while (cur !== null && cur !== undefined) {
        path.add(cur);
        cur = prev.get(cur);
    }
}
