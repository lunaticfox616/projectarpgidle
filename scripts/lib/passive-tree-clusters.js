'use strict';

const ACTIONABLE_TYPES = new Set(['minor', 'assist', 'normal', 'major']);
const FEATURE_TYPES = new Set(['normal', 'major']);
const MAX_VISUAL_BUNDLE_SIZE = 24;

function actionableNodeMap(tree) {
    return new Map(tree.nodes.filter(node => ACTIONABLE_TYPES.has(node.type)).map(node => [String(node.id), node]));
}

function actionableGraph(tree, nodes = actionableNodeMap(tree)) {
    const graph = new Map([...nodes.keys()].map(id => [id, []]));
    tree.edges.forEach(edge => {
        const a = String(edge.a), b = String(edge.b);
        if (!graph.has(a) || !graph.has(b)) return;
        graph.get(a).push(b);
        graph.get(b).push(a);
    });
    graph.forEach(neighbors => neighbors.sort());
    return graph;
}

function releaseComponent(stack, from, to) {
    const ids = new Set();
    let edge;
    do {
        edge = stack.pop();
        if (!edge) break;
        ids.add(edge[0]);
        ids.add(edge[1]);
    } while (edge[0] !== from || edge[1] !== to);
    return [...ids].sort();
}

function visitBiconnected(id, parent, state) {
    state.discovered.set(id, ++state.time.value);
    state.low.set(id, state.discovered.get(id));
    state.graph.get(id).forEach(next => {
        if (!state.discovered.has(next)) {
            state.stack.push([id, next]);
            visitBiconnected(next, id, state);
            state.low.set(id, Math.min(state.low.get(id), state.low.get(next)));
            if (state.low.get(next) >= state.discovered.get(id)) state.components.push(releaseComponent(state.stack, id, next));
            return;
        }
        if (next === parent || state.discovered.get(next) >= state.discovered.get(id)) return;
        state.stack.push([id, next]);
        state.low.set(id, Math.min(state.low.get(id), state.discovered.get(next)));
    });
}

function biconnectedComponents(graph) {
    const state = { graph, discovered: new Map(), low: new Map(), stack: [], components: [], time: { value: 0 } };
    graph.forEach((unused, id) => {
        void unused;
        if (!state.discovered.has(id)) visitBiconnected(id, null, state);
    });
    return state.components;
}

function connectedComponents(graph) {
    const seen = new Set(), components = [];
    graph.forEach((unused, first) => {
        void unused;
        if (seen.has(first)) return;
        const queue = [first], ids = [];
        seen.add(first);
        for (let index = 0; index < queue.length; index += 1) {
            const id = queue[index];
            ids.push(id);
            graph.get(id).forEach(next => {
                if (seen.has(next)) return;
                seen.add(next);
                queue.push(next);
            });
        }
        components.push(ids.sort());
    });
    return components;
}

function hasFeature(ids, nodes) {
    return ids.some(id => FEATURE_TYPES.has(nodes.get(id).type));
}

function promotionCandidate(ids, nodes, graph) {
    return ids.map(id => nodes.get(id)).sort((a, b) => {
        const radiusDifference = Math.hypot(Number(b.x) || 0, Number(b.y) || 0)
            - Math.hypot(Number(a.x) || 0, Number(a.y) || 0);
        return radiusDifference || graph.get(String(a.id)).length - graph.get(String(b.id)).length
            || String(a.id).localeCompare(String(b.id));
    })[0];
}

function ensureBundleFeatures(tree, report) {
    const nodes = actionableNodeMap(tree), graph = actionableGraph(tree, nodes);
    const cyclic = biconnectedComponents(graph).filter(ids => ids.length >= 3);
    const detached = connectedComponents(graph).filter(ids => ids.length >= 3 && !hasFeature(ids, nodes));
    const candidates = [...cyclic, ...detached].sort((a, b) => a.length - b.length || a.join('|').localeCompare(b.join('|')));
    candidates.forEach(ids => {
        if (hasFeature(ids, nodes)) return;
        const node = promotionCandidate(ids, nodes, graph);
        node.type = 'normal';
        node.clusterPromoted = true;
        report.promotedClusterNodes.push(String(node.id));
    });
}

function nearestFeatureOwners(graph, nodes) {
    const anchors = [...nodes.values()].filter(node => FEATURE_TYPES.has(node.type))
        .map(node => String(node.id)).sort();
    const owners = new Map(anchors.map(id => [id, id])), queue = [...anchors];
    for (let index = 0; index < queue.length; index += 1) {
        const id = queue[index];
        graph.get(id).forEach(next => {
            if (owners.has(next)) return;
            owners.set(next, owners.get(id));
            queue.push(next);
        });
    }
    nodes.forEach((unused, id) => {
        void unused;
        if (!owners.has(id)) owners.set(id, id);
    });
    return owners;
}

function bundleMembershipCounts(components) {
    const counts = new Map();
    components.forEach(ids => ids.forEach(id => counts.set(id, (counts.get(id) || 0) + 1)));
    return counts;
}

function dominantTheme(ids, themes, nodes, themeAllowed) {
    const scores = new Map();
    ids.forEach(id => {
        const theme = themes.get(id), weight = FEATURE_TYPES.has(nodes.get(id).type) ? 4 : 1;
        scores.set(theme, (scores.get(theme) || 0) + weight);
    });
    const ranked = [...scores].filter(([theme]) => ids.every(id => themeAllowed(nodes.get(id), theme)))
        .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
    return ranked[0]?.[0] || [...scores].sort((a, b) => b[1] - a[1])[0][0];
}

function clusterThemePlan(tree, themeForNode, themeAllowed = () => true) {
    const nodes = actionableNodeMap(tree), graph = actionableGraph(tree, nodes);
    const owners = nearestFeatureOwners(graph, nodes), themes = new Map(), clusterIds = new Map();
    nodes.forEach((node, id) => {
        const owner = owners.get(id);
        const ownerTheme = themeForNode(nodes.get(owner));
        themes.set(id, themeAllowed(node, ownerTheme) ? ownerTheme : themeForNode(node));
        clusterIds.set(id, `anchor:${owner}`);
    });
    const allComponents = biconnectedComponents(graph);
    const memberships = bundleMembershipCounts(allComponents);
    allComponents.filter(ids => ids.length >= 3 && ids.length <= MAX_VISUAL_BUNDLE_SIZE).forEach(ids => {
        const theme = dominantTheme(ids, themes, nodes, themeAllowed), clusterId = `bundle:${ids[0]}`;
        ids.filter(id => memberships.get(id) === 1).forEach(id => {
            if (themeAllowed(nodes.get(id), theme)) themes.set(id, theme);
            clusterIds.set(id, clusterId);
        });
    });
    return { clusterIds, graph, themes };
}

function visualBundleAudit(tree) {
    const nodes = actionableNodeMap(tree), graph = actionableGraph(tree, nodes);
    const all = biconnectedComponents(graph), memberships = bundleMembershipCounts(all);
    const bundles = all.filter(ids => ids.length >= 3 && ids.length <= MAX_VISUAL_BUNDLE_SIZE).map(ids => {
        const interior = ids.filter(id => memberships.get(id) === 1);
        const themes = new Set(interior.map(id => nodes.get(id).archetype));
        return { ids, hasFeature: hasFeature(ids, nodes), interiorThemes: themes.size };
    });
    return { bundles, graph, nodes };
}

module.exports = {
    ACTIONABLE_TYPES, FEATURE_TYPES, clusterThemePlan, ensureBundleFeatures, visualBundleAudit
};
