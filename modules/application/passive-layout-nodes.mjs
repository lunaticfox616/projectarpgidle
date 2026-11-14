export function pickValidStat(ctx, theme, tier, seedIndex) {
    let pool = (ctx.deps.PASSIVE_THEME_POOLS[theme] || ctx.deps.PASSIVE_THEME_POOLS.center).filter(stat => ctx.deps.P_STATS[stat] && ctx.deps.P_STATS[stat].tiers && ctx.deps.P_STATS[stat].tiers.includes(tier));
    if (pool.length === 0) pool = Object.keys(ctx.deps.P_STATS).filter(stat => ctx.deps.P_STATS[stat].tiers && ctx.deps.P_STATS[stat].tiers.includes(tier));
    if (pool.length === 0) return 'flatHp';
    return pool[Math.abs(seedIndex) % pool.length];
}

export function getGenericPathStat(ctx, theme, depth, lane, sectorIndex) {
    let pathCycle = ctx.genericPathStats;
    let defenseCycle = ctx.regionalPathDefenseStats[theme] || [];
    let laneAbs = Math.abs(lane);
    let isRegionalDefenseStep = defenseCycle.length > 0 && depth >= 4 && depth % 4 === 0 && laneAbs >= 1;
    if (isRegionalDefenseStep) {
        let defenseStat = defenseCycle[(depth / 4 + laneAbs + sectorIndex) % defenseCycle.length];
        if (ctx.deps.P_STATS[defenseStat]) return defenseStat;
    }
    let stat = pathCycle[(depth + laneAbs * 2 + sectorIndex) % pathCycle.length];
    return ctx.deps.P_STATS[stat] ? stat : 'flatHp';
}

export function getCoreDirectionLabel(ctx, sectorIndex) {
    const labels = ['북쪽', '북동쪽', '동쪽', '남동쪽', '남쪽', '남서쪽', '서쪽', '북서쪽'];
    return labels[((sectorIndex % labels.length) + labels.length) % labels.length] || '중앙';
}

export function specializePathNode(ctx, { node, theme, depth, lane, sectorIndex, shape }) {
    if (!node || !shape) return;
    if (shape.kind === 'core') {
        specializeCoreNode(ctx, node, { theme, lane, sectorIndex });
        return;
    }
    if (['path', 'major', 'keystone', 'hub'].includes(shape.kind)) {
        let stat = getGenericPathStat(ctx, theme, depth, lane, sectorIndex);
        node.stat = stat;
        node.val = ctx.deps.getPassiveStatTierValue(stat, node.tier);
        if (shape.kind === 'major' || shape.kind === 'keystone') node.val = Math.max(node.val, ctx.deps.getPassiveStatTierValue(stat, 2));
        if (shape.kind === 'hub') {
            node.title = ctx.deps._t('교차 거점');
            node.desc = '여러 갈래의 길이 만나는 거점입니다.';
        }
    }
}

function specializeCoreNode(ctx, node, { theme, lane, sectorIndex }) {
    let specs = ctx.centralCoreSpecs[theme] || [];
    let spec = specs[(Math.abs(lane) + sectorIndex) % specs.length];
    if (!spec || !ctx.deps.P_STATS[spec.stat]) return;
    node.stat = spec.stat;
    node.val = ctx.deps.getPassiveStatTierValue(node.stat, node.tier);
    node.title = ctx.deps._t(spec.title);
    node.desc = ctx.deps._t('{sectorIndex} 시작축: {desc}', { sectorIndex: getCoreDirectionLabel(ctx, sectorIndex), desc: spec.desc });
}

function selectNodeStat(ctx, themeOrStat, tier, meta) {
    let statKey = ctx.deps.P_STATS[themeOrStat] ? themeOrStat : pickValidStat(ctx, themeOrStat, tier, ctx.nId + ((meta && meta.depth) || 0) * 7 + ((meta && meta.lane) || 0) * 13);
    if (!ctx.deps.P_STATS[statKey]) statKey = 'flatHp';
    return statKey;
}

function nodeLayoutMetadata(meta) {
    return {
        layoutDepth: meta && Number.isFinite(meta.depth) ? meta.depth : null,
        lane: meta && Number.isFinite(meta.lane) ? meta.lane : null,
        sector: meta && meta.sector ? meta.sector : null,
        kind: meta && meta.kind ? meta.kind : 'node'
    };
}

export function addNode(ctx, { x, y, tier, themeOrStat, meta }) {
    if (Object.keys(ctx.deps.PASSIVE_TREE.nodes).length >= ctx.deps.PASSIVE_TARGET_NODES) return null;
    let statKey = selectNodeStat(ctx, themeOrStat, tier, meta);
    let node = {
        id: 'n' + ctx.nId++,
        x: x * ctx.deps.PASSIVE_WORLD_SCALE,
        y: y * ctx.deps.PASSIVE_WORLD_SCALE,
        tier: tier,
        stat: statKey,
        val: ctx.deps.getPassiveStatTierValue(statKey, tier),
        depth: Infinity,
        ...nodeLayoutMetadata(meta)
    };
    ctx.deps.PASSIVE_TREE.nodes[node.id] = node;
    return node;
}

export function applyNodeSpec(ctx, node, spec, fallbackKind) {
    if (!node || !spec) return node;
    node.stat = spec.stat || node.stat;
    node.val = spec.val !== undefined ? spec.val : node.val;
    node.kind = spec.kind || fallbackKind || node.kind;
    describeNodeSpec(ctx, node, spec);
    if (spec.requiresEvolution) node.requiresEvolution = true;
    if (spec.starIndex !== undefined) node.starIndex = spec.starIndex;
    return node;
}

function describeNodeSpec(ctx, node, spec) {
    node.title = ctx.deps._t(spec.title) || null;
    node.desc = spec.desc || null;
    node.effectLabel = spec.effectLabel || ctx.deps.getPassiveEffectLabel(node);
}

export function connect(ctx, aId, bId) {
    if (!aId || !bId || aId === bId) return;
    let key = aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
    if (ctx.edgeKeys.has(key)) return;
    ctx.edgeKeys.add(key);
    ctx.deps.PASSIVE_TREE.edges.push({ from: aId, to: bId });
}

export function getNodeClearanceDistance(ctx, a, b, extraPadding) {
    return ctx.deps.getPassiveNodeVisualRadius(a) + ctx.deps.getPassiveNodeVisualRadius(b) + (extraPadding || 24);
}

export function getNodeDistance(ctx, a, b) {
    if (!a || !b) return Number.POSITIVE_INFINITY;
    return Math.hypot((b.x || 0) - (a.x || 0), (b.y || 0) - (a.y || 0));
}

export function buildAdjacencyMap(ctx) {
    let adj = new Map();
    Object.keys(ctx.deps.PASSIVE_TREE.nodes).forEach(id => adj.set(id, new Set()));
    ctx.deps.PASSIVE_TREE.edges.forEach(edge => {
        if (!adj.has(edge.from)) adj.set(edge.from, new Set());
        if (!adj.has(edge.to)) adj.set(edge.to, new Set());
        adj.get(edge.from).add(edge.to);
        adj.get(edge.to).add(edge.from);
    });
    return adj;
}
