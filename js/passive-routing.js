// GENERATED from modules/passive-routing*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/passive-routing.mjs
  function transcendentNodeIds(state, id) {
    const crafts = state.voidPassives || {};
    return (state.passives || []).filter((nodeId) => crafts[nodeId]?.transcendent?.id === id);
  }
  function transcendentValue(state, id) {
    const crafts = state.voidPassives || {};
    return transcendentNodeIds(state, id).reduce((sum, nodeId) => sum + (Number(crafts[nodeId].transcendent.value) || 0), 0);
  }
  function freeNodes(tree, state, andromedaRadius) {
    const result = /* @__PURE__ */ new Set();
    transcendentNodeIds(state, "andromeda").forEach((centerId) => {
      const center = tree.nodes[centerId];
      if (!center) return;
      Object.values(tree.nodes).forEach((node) => {
        if (node.kind === "start" || node.id === centerId) return;
        if (Math.hypot(node.x - center.x, node.y - center.y) <= andromedaRadius) result.add(node.id);
      });
    });
    return result;
  }
  function paleBonus(state) {
    return transcendentValue(state, "paleBlueDot");
  }
  function pointBudget(state) {
    return state.passives.length + (Number(state.passivePoints) || 0) - paleBonus(state);
  }
  function settlePoints(state, budget) {
    while (state.passives.length && budget + paleBonus(state) < state.passives.length) state.passives.pop();
    state.passivePoints = Math.max(0, budget + paleBonus(state) - state.passives.length);
  }
  function adjacencyOf(state, routing) {
    const owned = new Set(state.passives);
    const adjacency = /* @__PURE__ */ new Map();
    routing.edges.forEach((edge) => {
      if (edge.requiresAllocatedNodeId && !owned.has(edge.requiresAllocatedNodeId)) return;
      if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
      if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
      adjacency.get(edge.from).push(edge.to);
      adjacency.get(edge.to).push(edge.from);
    });
    return adjacency;
  }
  function connectionRoots(state, routing, owned) {
    const roots = /* @__PURE__ */ new Set([routing.root, ...routing.virtual.filter((id) => owned.has(id))]);
    for (const [keystone, start] of routing.grantedStarts || []) {
      if (owned.has(keystone)) roots.add(start);
    }
    state.passives.forEach((id) => {
      if (routing.free.has(id)) roots.add(id);
    });
    return roots;
  }
  function connected(state, tree, routing) {
    const owned = new Set(state.passives);
    const roots = connectionRoots(state, routing, owned);
    const adjacency = adjacencyOf(state, routing);
    const queue = [...roots], seen = new Set(roots);
    for (let i = 0; i < queue.length; i++) {
      (adjacency.get(queue[i]) || []).forEach((id) => {
        if (!owned.has(id) || seen.has(id)) return;
        seen.add(id);
        queue.push(id);
      });
    }
    return state.passives.filter((id) => seen.has(id));
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
    return !own || own === "sun";
  }
  function voidLineScale(entry, state) {
    const own = entry.transcendent && entry.transcendent.id;
    const darkMatter = !own && entry.stats.length === 1 && transcendentNodeIds(state, "darkMatter").length > 0;
    return (own === "sun" ? 3 : 1) * (darkMatter ? 2 : 1) * (1 + transcendentValue(state, "supernova") / 100);
  }
  function voidStats(entry, state, linkScale = 1) {
    const lines = entry && entry.stats || [];
    if (!lines.length || !keepsLines(entry)) return [];
    const scale = voidLineScale(entry, state) * linkScale;
    return scale === 1 ? lines : lines.map((line) => ({ ...line, val: line.val * scale, baseVal: line.val }));
  }

  // modules/passive-routing-classic.mjs
  function freeNodesForGame(tree, state) {
    return freeNodes(tree, state, TRANSCENDENT_ANDROMEDA_RADIUS);
  }
  var passiveRouting = {
    transcendentNodeIds,
    transcendentValue,
    freeNodes: freeNodesForGame,
    paleBonus,
    pointBudget,
    settlePoints,
    connected,
    reconcile,
    voidStats
  };
  safeExposeGlobals({ passiveRouting });
})();
