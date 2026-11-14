

export function passiveRuleGetClassKeystoneDefs(env, clsKey) {
    let defs = (env.deps.CLASS_KEYSTONE_DEFS && env.deps.CLASS_KEYSTONE_DEFS[clsKey]) || [];
    return Array.isArray(defs) ? defs : [];
}

// Covenant spokes display and count attributes, but never carry allocation paths.
export function passiveRuleIsPassiveTreePathEdge(env, owner, edge, allocatedNodeIds) {
    return edge.requiresAllocatedNodeId !== env.deps.PASSIVE_KEYSTONE_NODE_ID_BY_TITLE['헌신의 서약']
        && passiveRuleIsPassiveTreeEdgeAvailable(owner, edge, allocatedNodeIds);
}

export function passiveRuleIsPassiveTreeEdgeAvailable(owner, edge, allocatedNodeIds) {
    const requiredId = String(edge && edge.requiresAllocatedNodeId || '');
    if (!requiredId) return true;
    const allocated = allocatedNodeIds === undefined
        ? (owner && Array.isArray(owner.passives) ? owner.passives : [])
        : allocatedNodeIds;
    if (allocated instanceof Set) return allocated.has(requiredId);
    return Array.isArray(allocated) && allocated.includes(requiredId);
}

/**
 * Returns the shared read-only adjacency map for the current passive layout.
 * @param {Set<string>|string[]=} allocatedNodeIds
 * @returns {Map<string, string[]>}
 */
export function passiveRuleGetPassiveTreeAdjacency(env, owner, allocatedNodeIds) {
    const nodeCount = Object.keys(env.deps.PASSIVE_TREE.nodes || {}).length;
    const edges = Array.isArray(env.deps.PASSIVE_TREE.edges) ? env.deps.PASSIVE_TREE.edges : [];
    const unlockSignature = edges.filter(edge => edge.requiresAllocatedNodeId)
        .map(edge => `${edge.requiresAllocatedNodeId}:${passiveRuleIsPassiveTreeEdgeAvailable(owner, edge) ? 1 : 0}`).join('|');
    const signature = allocatedNodeIds === undefined
        ? `${env.deps.PASSIVE_TREE.layoutVersion || 0}:${nodeCount}:${edges.length}:${unlockSignature}` : '';
    if (signature && env.passiveTreeAdjacencyCache.signature === signature) return env.passiveTreeAdjacencyCache.map;
    const adjacency = new Map(Object.keys(env.deps.PASSIVE_TREE.nodes || {}).map(id => [String(id), []]));
    edges.forEach(edge => {
        if (!passiveRuleIsPassiveTreePathEdge(env, owner, edge, allocatedNodeIds)) return;
        const from = String(edge.from), to = String(edge.to);
        if (!adjacency.has(from)) adjacency.set(from, []);
        if (!adjacency.has(to)) adjacency.set(to, []);
        adjacency.get(from).push(to);
        adjacency.get(to).push(from);
    });
    if (signature) env.passiveTreeAdjacencyCache = { signature, map: adjacency };
    return adjacency;
}

export function passiveRuleGetPassiveWisdomElementFromNodeIds(env, nodeIds) {
    const ids = Array.isArray(nodeIds) ? nodeIds : [];
    for (let index = ids.length - 1; index >= 0; index -= 1) {
        const element = env.deps.PASSIVE_WISDOM_ELEMENT_BY_NODE_ID[String(ids[index])];
        if (element) return element;
    }
    return '';
}
