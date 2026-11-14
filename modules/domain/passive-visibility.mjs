/** Reachability/discovery policy. The caller owns render invalidation and timed reveal bursts.
 * The runtime sets are shared with the tree view; only owner.discoveredPassives belongs to a save. */
export class PassiveVisibility {
    constructor(data, runtime, allocation, rules) {
        this.data = data;
        this.runtime = runtime;
        this.allocation = allocation;
        this.rules = rules;
    }

    *calculateReachableNodes(owner) {
        const reachable = this.runtime.reachableNodes;
        reachable.clear();
        const rootId = this.allocation.getPassiveTreeRootNodeId(owner);
        const available = id => this.allocation.isPassiveNodeAvailable(owner, id);
        if (available(rootId)) reachable.add(rootId);
        if (!owner) return;
        const connections = this.allocation.getPassiveConnectionNodeIds(owner);
        connections.forEach(id => { if (available(id)) reachable.add(id); });
        this.data.routing.freeNodes(this.data.tree, owner).forEach(id => { if (available(id)) reachable.add(id); });
        const blocked = this.allocation.getPassiveBlockedStartIds(owner);
        this.data.tree.edges.forEach(edge => {
            if (!this.rules.isPassiveTreePathEdge(owner, edge)) return;
            if (!available(edge.from) || !available(edge.to)) return;
            if (connections.has(String(edge.from)) && !blocked.has(edge.to)) reachable.add(edge.to);
            if (connections.has(String(edge.to)) && !blocked.has(edge.from)) reachable.add(edge.from);
        });
        yield { kind: 'passiveRenderDirty', args: ['state'] };
    }

    isPassiveLocalReveal(owner, origin, node, radius, maxDepthGap) {
        if (!origin || !node || origin.id === node.id) return false;
        if (Math.hypot(node.x - origin.x, node.y - origin.y) > radius) return false;
        if (origin.id === this.allocation.getPassiveTreeRootNodeId(owner)) return (node.depth || 0) <= 1;
        return this.inSectorDepth(origin, node, maxDepthGap);
    }

    inSectorDepth(origin, node, maxDepthGap) {
        if (!origin.sector || !node.sector || origin.sector !== node.sector) return false;
        return Math.abs((origin.depth || 0) - (node.depth || 0)) <= maxDepthGap;
    }

    *refreshPassiveVisibility(owner) {
        const available = Object.values(this.data.tree.nodes).filter(node => this.allocation.isPassiveNodeAvailable(owner, node));
        this.runtime.discoveredNodes = new Set(available.map(node => node.id));
        this.runtime.previewNodes = new Set();
        yield { kind: 'passiveRenderDirty', args: ['state'] };
    }

    discoverAround(owner, nodeId, origin, options, radius) {
        const rootId = this.allocation.getPassiveTreeRootNodeId(owner);
        const edgeDepth = options.edgeDepth !== undefined ? options.edgeDepth
            : (nodeId === rootId ? this.data.rootEdgeDepth : this.data.edgeDepth);
        const ids = new Set([nodeId]);
        this.allocation.getPassiveLinkedNodeIds(owner, nodeId, edgeDepth).forEach(id => ids.add(id));
        Object.values(this.data.tree.nodes).forEach(node => {
            if (!this.allocation.isPassiveNodeAvailable(owner, node)) return;
            const reveal = nodeId === rootId ? node.kind === 'core' && node.layoutDepth === 1
                : this.isPassiveLocalReveal(owner, origin, node, radius, 2);
            if (reveal) ids.add(node.id);
        });
        const discovered = [];
        ids.forEach(id => {
            if ((owner.discoveredPassives || []).includes(id)) return;
            owner.discoveredPassives.push(id);
            discovered.push(id);
        });
        return discovered;
    }

    *revealAroundNode(owner, nodeId, options = {}) {
        options = options || {};
        const origin = this.data.tree.nodes[nodeId];
        if (!origin || !this.allocation.isPassiveNodeAvailable(owner, origin)) return;
        const radius = options.radius || this.data.radius;
        const nodeIds = this.discoverAround(owner, nodeId, origin, options, radius);
        if (!options.noBurst && (nodeIds.length > 0 || options.forcePulse)) {
            yield { kind: 'passiveRevealBurst', args: [{ originId: nodeId, nodeIds, x: origin.x, y: origin.y, radius, duration: 900 }] };
        }
        yield* this.refreshPassiveVisibility(owner);
        yield { kind: 'passiveRenderDirty', args: ['state'] };
    }

    getPassiveVisibility(owner, nodeId) {
        if (!this.allocation.isPassiveNodeAvailable(owner, nodeId)) return 'hidden';
        if (this.runtime.discoveredNodes.has(nodeId)) return 'discovered';
        if (this.runtime.previewNodes.has(nodeId)) return 'preview';
        return 'hidden';
    }
}
