// Passive-tree connectivity, point settlement and void-passive line scaling. No UI or passive-controller dependencies.
// Moved out of the star-wedge rules when star wedges were removed (2026-10-01, docs/aux-consolidation-20260930.md 6단계):
// - roots are the class start plus allocated voids whose transcendent is 블랙홀 (a free connection root);
// - allocated 안드로메다 voids let nodes within TRANSCENDENT_ANDROMEDA_RADIUS be allocated without a path (points and unlock
//   conditions still apply);
// - 창백한 푸른 점 voids lend passive points, which settlement takes back when their node goes.
const passiveRouting = (() => {
    function transcendentNodeIds(state, id) {
        const crafts = state.voidPassives || {};
        return (state.passives || []).filter(nodeId => crafts[nodeId]?.transcendent?.id === id);
    }
    function transcendentValue(state, id) {
        const crafts = state.voidPassives || {};
        return transcendentNodeIds(state, id).reduce((sum, nodeId) => sum + (Number(crafts[nodeId].transcendent.value) || 0), 0);
    }
    function freeNodes(tree, state) {
        const result = new Set();
        transcendentNodeIds(state, 'andromeda').forEach(centerId => {
            const center = tree.nodes[centerId];
            if (!center) return;
            Object.values(tree.nodes).forEach(node => {
                if (node.kind === 'start' || node.id === centerId) return;
                if (Math.hypot(node.x - center.x, node.y - center.y) <= TRANSCENDENT_ANDROMEDA_RADIUS) result.add(node.id);
            });
        });
        return result;
    }
    function paleBonus(state) {
        return transcendentValue(state, 'paleBlueDot');
    }
    function pointBudget(state) {
        return state.passives.length + (Number(state.passivePoints) || 0) - paleBonus(state);
    }
    function settlePoints(state, budget) {
        // Revoking a borrowed route may also revoke points granted by its void node.
        while (state.passives.length && budget + paleBonus(state) < state.passives.length) state.passives.pop();
        state.passivePoints = Math.max(0, budget + paleBonus(state) - state.passives.length);
    }
    function adjacencyOf(state, routing) {
        const owned = new Set(state.passives);
        const adjacency = new Map();
        routing.edges.forEach(edge => {
            if (edge.requiresAllocatedNodeId && !owned.has(edge.requiresAllocatedNodeId)) return;
            if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
            if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
            adjacency.get(edge.from).push(edge.to);
            adjacency.get(edge.to).push(edge.from);
        });
        return adjacency;
    }
    function connected(state, tree, routing) {
        const owned = new Set(state.passives);
        const roots = new Set([routing.root, ...routing.virtual]);
        state.passives.forEach(id => { if (routing.free.has(id)) roots.add(id); });
        const adjacency = adjacencyOf(state, routing);
        const queue = [...roots], seen = new Set(roots);
        for (let i = 0; i < queue.length; i++) {
            (adjacency.get(queue[i]) || []).forEach(id => {
                if (!owned.has(id) || seen.has(id)) return;
                seen.add(id); queue.push(id);
            });
        }
        return state.passives.filter(id => seen.has(id));
    }
    function reconcile(state, tree, routing, budget = pointBudget(state)) {
        let previous;
        do {
            previous = state.passives.length;
            state.passives = connected(state, tree, routing);
            settlePoints(state, budget);
        } while (state.passives.length !== previous);
    }
    function keepsLines(entry) {
        const own = entry.transcendent && entry.transcendent.id;
        return !own || own === 'sun';
    }
    function voidLineScale(entry, state) {
        const own = entry.transcendent && entry.transcendent.id;
        const darkMatter = !own && entry.stats.length === 1 && transcendentNodeIds(state, 'darkMatter').length > 0;
        return (own === 'sun' ? 3 : 1) * (darkMatter ? 2 : 1) * (1 + transcendentValue(state, 'supernova') / 100);
    }
    /** A void's ordinary lines after the transcendents that scale them: 태양 keeps its own lines ×3, 암흑물질 doubles one-line voids
     * that are not transcendent, 초신성 raises every other void's lines by its value. Other transcendent voids have no lines. */
    function voidStats(entry, state) {
        const lines = (entry && entry.stats) || [];
        if (!lines.length || !keepsLines(entry)) return [];
        const scale = voidLineScale(entry, state);
        return scale === 1 ? lines : lines.map(line => ({ ...line, val: line.val * scale }));
    }
    return { transcendentNodeIds, transcendentValue, freeNodes, paleBonus, pointBudget, settlePoints, connected, reconcile, voidStats };
})();
safeExposeGlobals({ passiveRouting });
