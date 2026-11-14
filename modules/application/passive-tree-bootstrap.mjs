import { generateOrganicTree } from './passive-layout-build.mjs';
import { computePassiveDepths, polishPassiveLayout, rebalancePassiveStartingStats, applyPassiveSpecializations } from './passive-layout-postprocess.mjs';
import { updatePassiveBounds } from './passive-layout-bounds.mjs';
import { allocationHasAuthoredPassiveTreeSource } from '../domain/passive-allocation-roots.mjs';

function loadAuthoredPassiveTree(deps) {
    deps.scene.state.passiveTreeViewAngle = 0;
    Object.keys(deps.PASSIVE_TREE.nodes).forEach(key => delete deps.PASSIVE_TREE.nodes[key]);
    deps.PASSIVE_TREE.edges.length = 0;
    Object.entries(deps.PASSIVE_TREE_V22.nodes).forEach(([id, source]) => {
        const node = { ...source, effects: (source.effects || []).map(effect => ({ ...effect })) };
        node.depth = Number.isFinite(node.distanceFromClassStart) ? node.distanceFromClassStart : Infinity;
        if (node.choiceGroup) node.choiceGroup = JSON.parse(JSON.stringify(node.choiceGroup));
        if (Array.isArray(node.hiddenRouteNodeIds)) node.hiddenRouteNodeIds = node.hiddenRouteNodeIds.slice();
        deps.PASSIVE_TREE.nodes[id] = node;
    });
    deps.PASSIVE_TREE.edges.push(...deps.PASSIVE_TREE_V22.edges.map(edge => ({ ...edge })));
    deps.PASSIVE_TREE.layoutVersion = deps.PASSIVE_TREE_V22.version;
    updatePassiveBounds(deps);
    if (typeof deps.markPassiveRenderCacheDirty === 'function') deps.markPassiveRenderCacheDirty('authored-tree');
}

/** Initializes the shared tree in place; called at the former bootstrap point, after rule constants exist. */
export function bootstrapPassiveTree(deps) {
    if (allocationHasAuthoredPassiveTreeSource({ deps })) {
        loadAuthoredPassiveTree(deps);
        return true;
    }
    const ctx = generateOrganicTree(deps);
    applyPassiveSpecializations(ctx);
    computePassiveDepths(ctx);
    rebalancePassiveStartingStats(ctx);
    polishPassiveLayout(ctx);
    return true;
}
