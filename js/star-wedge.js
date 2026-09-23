// Star-wedge item state and generated graphs. No UI or passive-controller dependencies.
const starWedgeRules = (() => {
    const effectOnly = new Set(['dark_matter', 'pluto', 'andromeda']);
    const fixedTypes = new Set(['comet', 'dark_matter', 'andromeda']);
    function isGenerated(node) {
        return node.kind === 'star_option' || !!node.starWedgeGenerated;
    }
    function branchSettings(wedge, index) {
        if (!wedge) return { effects: [], count: 1 };
        let effects = outerLine(wedge, index);
        if (wedge.uniqueType === 'supernova') effects = index === 3 ? coreEffects(wedge, true) : [];
        const count = index === 3 || !effects.length ? 1 : wedge.outerLayout.counts[index];
        return { effects, count };
    }
    function rollPlutoCount() {
        const roll = Math.random();
        return [0.8, 0.96, 0.992, 0.9984, 1].findIndex(limit => roll < limit) + 1;
    }
    function rollLayout() {
        return { counts: [0, 1, 2].map(() => 1 + Math.floor(Math.random() * 3)), forks: [0, 1, 2].map(() => Math.random() < 0.5) };
    }
    function normalize(wedge) {
        if (!wedge.outerLayout || typeof wedge.outerLayout !== 'object' || Array.isArray(wedge.outerLayout)) {
            // Existing items get a stable layout without consuming RNG on load.
            const seed = Math.abs(Math.floor(wedge.id));
            wedge.outerLayout = { counts: [0,1,2].map(i => 1 + Math.floor(seed / (i + 1)) % 3), forks: [0,1,2].map(i => (seed + i) % 2 === 0) };
        }
        const layout = wedge.outerLayout;
        if (!Array.isArray(wedge.lines)) wedge.lines = [];
        layout.counts = [0,1,2].map(i => Math.max(1, Math.min(3, Math.floor(Number(layout.counts?.[i]) || 1))));
        layout.forks = [0,1,2].map(i => layout.forks?.[i] === true);
        if (!wedge.unique) return wedge;
        if (effectOnly.has(wedge.uniqueType)) wedge.lines = [];
        if (wedge.uniqueType === 'pluto') wedge.voidCount = Math.max(1, Math.min(5, Math.floor(Number(wedge.voidCount) || 1)));
        return wedge;
    }
    function noRadius(wedge) {
        return wedge.unique && (effectOnly.has(wedge.uniqueType) || ['sun', 'supernova'].includes(wedge.uniqueType));
    }
    function canSocket(wedge, node) {
        return !(wedge.unique && wedge.uniqueType === 'pluto') || node.starWedgeMode === 'constellation';
    }
    function canRestoreSocket(wedge, node) {
        return !!node && node.kind === 'hub' && canSocket(wedge, node);
    }
    function cacheMatches(state, signature, graphVersion) {
        return state._mutationSignature === signature && state._graphVersion === graphVersion
            && state.nodeMutations && state.virtualLearnNodes && state.disabledNodeEffects && state.mutationConflictSources;
    }
    function outerLine(wedge, index) {
        const line = wedge.lines[index];
        if (!line?.stat || line.disabled) return [];
        if (wedge.unique && wedge.uniqueType === 'satellite' && index === 3) return [];
        return [{ stat: line.stat, val: Number(line.val) * 2 }];
    }
    function coreEffects(wedge, outer) {
        const lines = wedge.uniqueType === 'supernova' ? wedge.lines : wedge.lines.slice(3, 4);
        return lines.filter(line => line?.stat && !line.disabled)
            .map(line => ({ stat: line.stat, val: Number(line.val) * (outer ? 2 : 1) }));
    }
    function setGeneratedNode(node, effects, parent, root) {
        node.starWedgeOptionActive = effects.length > 0;
        node.effects = effects;
        node.stat = effects[0]?.stat || null;
        node.val = effects[0]?.val || 0;
        node.starWedgeParentId = parent;
        node.starWedgeRoot = root;
        node.title = '성률 패시브';
        node.desc = '';
    }
    function buildBranch(tree, template, wedge, hub) {
        const index = template.starWedgeLineIndex;
        const { effects, count } = branchSettings(wedge, index);
        const angle = Math.atan2(template.y - hub.y, template.x - hub.x);
        let previous = hub.id;
        for (let i = 0; i < count; i++) {
            const id = i ? `${template.id}_branch_${i}` : template.id;
            const fork = i === 2 && wedge.outerLayout.forks[index];
            const parent = fork ? template.id : previous;
            const node = tree.nodes[id] || { ...template, id, starWedgeGenerated: true };
            const reach = i ? 145 + i * 58 : 110;
            const direction = angle + (fork ? 0.22 : -i * 0.06);
            Object.assign(node, { x: hub.x + Math.cos(direction) * reach, y: hub.y + Math.sin(direction) * reach });
            setGeneratedNode(node, effects.map(effect => ({ ...effect })), parent, i === 0);
            tree.nodes[id] = node;
            tree.edges.push({ from: parent, to: id, starWedgeGenerated: true });
            previous = id;
        }
    }
    function buildPluto(tree, wedge, socket) {
        const hub = socket ? tree.nodes[socket.nodeId] : { id: '', x: 0, y: 0 };
        for (let i = 0; i < 5; i++) {
            const id = `star_pluto_${wedge.id}_${i}`;
            const active = !!socket && i < wedge.voidCount;
            const angle = -Math.PI * 0.9 + i * Math.PI * 0.2;
            const node = { id, kind: 'void', tier: 3, title: '공허 패시브', stat: null, val: 0, effects: [],
                starWedgeGenerated: true, starWedgeOwnerId: wedge.id, starWedgeRoot: true,
                requiresStarWedgeSocketNodeId: hub.id, starWedgeOptionActive: active,
                x: hub.x + Math.cos(angle) * 180, y: hub.y + Math.sin(angle) * 180 };
            tree.nodes[id] = node;
            if (active) tree.edges.push({ from: hub.id, to: id, starWedgeGenerated: true });
        }
    }
    function rebuild(tree, state, refund = true) {
        const star = state.starWedge;
        const templates = Object.values(tree.nodes).filter(node => node.kind === 'star_option' && !node.starWedgeGenerated);
        const templateIds = new Set(templates.map(node => node.id));
        Object.values(tree.nodes).filter(node => node.starWedgeGenerated).forEach(node => delete tree.nodes[node.id]);
        tree.edges = tree.edges.filter(edge => !edge.starWedgeGenerated && !templateIds.has(edge.to) && !templateIds.has(edge.from));
        const wedges = new Map(star.wedges.map(wedge => [wedge.id, wedge]));
        const bySocket = new Map(star.sockets.map(socket => [socket.nodeId, wedges.get(socket.wedgeId)]));
        templates.forEach(template => {
            const hub = tree.nodes[template.requiresStarWedgeSocketNodeId];
            if (hub) buildBranch(tree, template, bySocket.get(hub.id), hub);
        });
        star.wedges.filter(wedge => wedge.unique && wedge.uniqueType === 'pluto').forEach(wedge =>
            buildPluto(tree, wedge, star.sockets.find(socket => socket.wedgeId === wedge.id)));
        tree.starWedgeGraphVersion = (tree.starWedgeGraphVersion || 0) + 1;
        if (!refund || !Array.isArray(state.passives)) return 0;
        const budget = pointBudget(state);
        const before = state.passives.length;
        state.passives = state.passives.filter(id => {
            const node = tree.nodes[id];
            return node && (!isGenerated(node) || node.starWedgeOptionActive);
        });
        settlePoints(state, budget);
        return before - state.passives.length;
    }
    function generatedPath(node, state, tree) {
        const owned = new Set(state.passives);
        const result = [];
        const seen = new Set();
        while (node && !owned.has(node.id)) {
            if (!node.starWedgeOptionActive || seen.has(node.id)) return [];
            seen.add(node.id);
            result.unshift(node.id);
            if (node.starWedgeRoot) return result;
            node = tree.nodes[node.starWedgeParentId];
        }
        return result;
    }
    function freeNodes(tree, state) {
        const result = new Set();
        const wedges = new Map(state.starWedge.wedges.map(wedge => [wedge.id, wedge]));
        state.starWedge.sockets.forEach(socket => {
            if (wedges.get(socket.wedgeId)?.uniqueType !== 'andromeda') return;
            const center = tree.nodes[socket.nodeId];
            Object.values(tree.nodes).forEach(node => {
                const distance = Math.hypot(node.x - center.x, node.y - center.y);
                if (distance >= 800 && distance <= 900 && node.kind !== 'start' && !node.requiresStarWedgeSocketNodeId) result.add(node.id);
            });
        });
        return result;
    }
    function paleBonus(state) {
        return state.passives.reduce((sum, id) => {
            const entry = state.voidPassives?.[id]?.transcendent;
            return sum + (entry?.id === 'paleBlueDot' ? Number(entry.value) || 0 : 0);
        }, 0);
    }
    function pointBudget(state) {
        return state.passives.length + (Number(state.passivePoints) || 0) - paleBonus(state);
    }
    function settlePoints(state, budget) {
        // Revoking a borrowed route may also revoke points granted by its void node.
        while (state.passives.length && budget + paleBonus(state) < state.passives.length) state.passives.pop();
        state.passivePoints = Math.max(0, budget + paleBonus(state) - state.passives.length);
    }
    function connected(state, tree, routing) {
        const owned = new Set(state.passives);
        const roots = new Set([routing.root, ...routing.virtual]);
        state.passives.forEach(id => {
            const node = tree.nodes[id];
            if (node?.starWedgeRoot && node.starWedgeOptionActive || routing.free.has(id)) roots.add(id);
        });
        const adjacency = new Map();
        routing.edges.forEach(edge => {
            if (edge.requiresAllocatedNodeId && !owned.has(edge.requiresAllocatedNodeId)) return;
            if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
            if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
            adjacency.get(edge.from).push(edge.to); adjacency.get(edge.to).push(edge.from);
        });
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
    function voidStats(entry, state) {
        const lines = entry?.stats || [];
        const dark = lines.length === 1 && !entry.transcendent && state.starWedge?.sockets.some(socket =>
            state.starWedge.wedges.some(wedge => wedge.id === socket.wedgeId && wedge.uniqueType === 'dark_matter'));
        return dark ? lines.map(line => ({ ...line, val: line.val * 2 })) : lines;
    }
    return { normalize, rollLayout, rollPlutoCount, noRadius, canSocket, outerLine, coreEffects, rebuild, generatedPath,
        freeNodes, paleBonus, pointBudget, settlePoints, connected, reconcile, voidStats, fixedTypes, isGenerated, canRestoreSocket, cacheMatches };
})();
safeExposeGlobals({ starWedgeRules });
