import { initializePassiveClusters, initializePassiveLayout } from './passive-layout-data.mjs';
import { addNode } from './passive-layout-nodes.mjs';
import { buildWebPaths, connectWebDiagonals, connectWebRings, markVoidPassiveNodes } from './passive-layout-web.mjs';
import { buildWebClusters } from './passive-layout-clusters.mjs';
import { buildOuterStars } from './passive-layout-outer.mjs';
import { buildDefenseClusters } from './passive-layout-defense.mjs';
import { ensureOuterHubNeighborConnections } from './passive-layout-relays.mjs';
import { realignSpecializedClusters, realignWebPathNodes } from './passive-layout-geometry.mjs';
import { packPassiveNodes } from './passive-layout-packing.mjs';
import { updatePassiveBounds } from './passive-layout-bounds.mjs';

export function generateOrganicTree(deps) {
    const ctx = { deps };
    Object.keys(deps.PASSIVE_TREE.nodes).forEach(key => delete deps.PASSIVE_TREE.nodes[key]);
    deps.PASSIVE_TREE.edges.length = 0;
    initializePassiveLayout(ctx);
    ctx.root = addNode(ctx, { x: 0, y: 0, tier: 0, themeOrStat: 'flatDmg', meta: { sector: 'center', kind: 'root', depth: 0, lane: 0 } });
    if (ctx.root) ctx.root.val = 8;
    ctx.webNodes = {};
    buildWebPaths(ctx);
    markVoidPassiveNodes(ctx);
    connectWebRings(ctx);
    connectWebDiagonals(ctx);
    initializePassiveClusters(ctx);
    buildWebClusters(ctx);
    ctx.baseOuterRadius = Object.values(ctx.deps.PASSIVE_TREE.nodes).filter(node => !node.clusterId).reduce((max, node) => Math.max(max, Math.hypot(node.x, node.y)), 0);
    ctx.outerAnchors = Object.values(ctx.deps.PASSIVE_TREE.nodes)
        .filter(node => !node.clusterId)
        .filter(node => Math.hypot(node.x, node.y) >= ctx.baseOuterRadius - 240);
    buildOuterStars(ctx);
    buildDefenseClusters(ctx);
    ensureOuterHubNeighborConnections(ctx, 4);
    realignWebPathNodes(ctx);
    realignSpecializedClusters(ctx, ctx.clusterAnchorsById);
    ctx.packed = Object.values(deps.PASSIVE_TREE.nodes);
    packPassiveNodes(ctx);
    updatePassiveBounds(deps);
    if (typeof deps.markPassiveRenderCacheDirty === 'function') deps.markPassiveRenderCacheDirty('structure');
    return ctx;
}
