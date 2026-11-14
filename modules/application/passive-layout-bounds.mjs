/** Records existing coordinates before any optional centering, matching the legacy camera contract. */
export function updatePassiveBounds(deps) {
    const nodes = Object.values(deps.PASSIVE_TREE.nodes);
    deps.PASSIVE_BOUNDS.minX = Math.min(...nodes.map(node => node.x));
    deps.PASSIVE_BOUNDS.maxX = Math.max(...nodes.map(node => node.x));
    deps.PASSIVE_BOUNDS.minY = Math.min(...nodes.map(node => node.y));
    deps.PASSIVE_BOUNDS.maxY = Math.max(...nodes.map(node => node.y));
}
