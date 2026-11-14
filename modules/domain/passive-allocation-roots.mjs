

export function allocationHasAuthoredPassiveTreeSource(env) {
    return typeof env.deps.PASSIVE_TREE_V22 !== 'undefined' && env.deps.PASSIVE_TREE_V22
        && env.deps.PASSIVE_TREE_V22.nodes && env.deps.PASSIVE_TREE_V22.edges;
}

export function allocationHasAuthoredPassiveTree(env) {
    if (!allocationHasAuthoredPassiveTreeSource(env) || env.deps.PASSIVE_TREE.layoutVersion !== env.deps.PASSIVE_TREE_V22.version) return false;
    return Object.values(env.deps.PASSIVE_TREE_V22.classStarts || {}).some(nodeId => !!env.deps.PASSIVE_TREE.nodes[nodeId]);
}

export function allocationGetPassiveTreeRootNodeId(env, owner) {
    if (!allocationHasAuthoredPassiveTree(env)) return 'n0';
    const source = owner || {};
    const classId = source.selectedClassId || 'warrior';
    return env.deps.PASSIVE_TREE_V22.classStarts[classId] || env.deps.PASSIVE_TREE_V22.classStarts.warrior;
}

export function allocationGetPassiveTreeRootNode(env, owner) {
    return env.deps.PASSIVE_TREE.nodes[allocationGetPassiveTreeRootNodeId(env, owner)] || null;
}

function grantedClassStarts(env, owner) {
    const opened = (owner.passives || []).map(id => env.deps.PASSIVE_TREE.nodes[id]).filter(node => node && node.kind === 'keystone' && env.deps.PASSIVE_START_GATE_CLASS_BY_TITLE[node.title]);
    return new Map(opened.map(node => [node.id, env.deps.PASSIVE_TREE_V22.classStarts[env.deps.PASSIVE_START_GATE_CLASS_BY_TITLE[node.title]]]).filter(([, startId]) => !!startId));
}

export function allocationGetPassiveGatedStartIds(env, owner) {
    return new Set(grantedClassStarts(env, owner).values());
}

export function allocationGetPassiveBlockedStartIds(env, owner) {
    const hasGates = Object.values(env.deps.PASSIVE_TREE.nodes).some(node => node.kind === 'keystone' && env.deps.PASSIVE_START_GATE_CLASS_BY_TITLE[node.title]);
    if (!hasGates) return new Set();
    const gated = allocationGetPassiveGatedStartIds(env, owner), rootId = allocationGetPassiveTreeRootNodeId(env, owner);
    return new Set(Object.values(env.deps.PASSIVE_TREE.nodes).filter(node => node.kind === 'start' && node.id !== rootId && !gated.has(node.id)).map(node => node.id));
}

/** 직업 시작점과 키스톤으로 부여한 시작점, 블랙홀은 무료 연결 거점이다. 저장·반환도 같은 거점을 사용한다. */
export function allocationGetPassiveRouting(env, owner) {
    const allocated = new Set(owner.passives || []);
    const virtual = env.deps.passiveRouting.transcendentNodeIds(owner, 'blackHole');
    return { root: allocationGetPassiveTreeRootNodeId(env, owner), virtual,
        grantedStarts: grantedClassStarts(env, owner),
        free: env.deps.passiveRouting.freeNodes(env.deps.PASSIVE_TREE, owner), edges: env.deps.PASSIVE_TREE.edges.filter(edge => env.deps.isPassiveTreePathEdge(owner, edge, allocated)) };
}
