export function computePassiveDepths(ctx) {
    Object.values(ctx.deps.PASSIVE_TREE.nodes).forEach(node => node.depth = Infinity);
    let root = ctx.deps.PASSIVE_TREE.nodes['n0'];
    if (!root) return;
    root.depth = 0;
    let queue = ['n0'];
    while (queue.length > 0) {
        let current = queue.shift();
        let currentDepth = ctx.deps.PASSIVE_TREE.nodes[current].depth;
        ctx.deps.PASSIVE_TREE.edges.forEach(edge => {
            let next = null;
            if (edge.from === current) next = edge.to;
            if (edge.to === current) next = edge.from;
            if (next && ctx.deps.PASSIVE_TREE.nodes[next].depth === Infinity) {
                ctx.deps.PASSIVE_TREE.nodes[next].depth = currentDepth + 1;
                queue.push(next);
            }
        });
    }
}

export function polishPassiveLayout(ctx) {
    let nodes = Object.values(ctx.deps.PASSIVE_TREE.nodes || {});
    if (nodes.length === 0) return;
    let minX = Math.min(...nodes.map(node => node.x));
    let maxX = Math.max(...nodes.map(node => node.x));
    let minY = Math.min(...nodes.map(node => node.y));
    let maxY = Math.max(...nodes.map(node => node.y));
    ctx.deps.PASSIVE_BOUNDS.minX = minX;
    ctx.deps.PASSIVE_BOUNDS.maxX = maxX;
    ctx.deps.PASSIVE_BOUNDS.minY = minY;
    ctx.deps.PASSIVE_BOUNDS.maxY = maxY;

    let centerX = (minX + maxX) * 0.5;
    let centerY = (minY + maxY) * 0.5;
    nodes.forEach(node => {
        node.x -= centerX;
        node.y -= centerY;
    });
}

export function rebalancePassiveStartingStats(ctx) {
    const root = ctx.deps.PASSIVE_TREE.nodes.n0;
    if (!root) return;
    const startPlans = {
        templar: ['energyShieldPct'],
        witch: ['chaosPctDmg'],
        shadow: ['evasionPct'],
        ranger: ['projectilePctDmg'],
        duelist: ['armorPct'],
        marauder: ['physPctDmg', 'pctHp', 'slamPctDmg']
    };
    const sectorUseCount = {};
    const usedStartStats = new Set([root.stat]);
    const starters = Object.values(ctx.deps.PASSIVE_TREE.nodes)
        .filter(node => node && node.depth === 1)
        .sort((a, b) => (sectorOrderForStartingNode(a) - sectorOrderForStartingNode(b)) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));

    starters.forEach(node => {
        const useIndex = sectorUseCount[node.sector] || 0;
        sectorUseCount[node.sector] = useIndex + 1;
        let candidates = (startPlans[node.sector] || []).concat(ctx.deps.PASSIVE_THEME_POOLS[node.sector] || [], ctx.deps.PASSIVE_THEME_POOLS.center || []);
        let preferred = candidates[useIndex] || candidates.find(stat => !usedStartStats.has(stat));
        if (!preferred || usedStartStats.has(preferred)) preferred = candidates.find(stat => ctx.deps.P_STATS[stat] && !usedStartStats.has(stat));
        if (preferred) {
            setStat(ctx, node, preferred);
            usedStartStats.add(preferred);
        }
        node.title = ctx.deps._t('{PASSIVE_SECTOR_TITLES} 시작점', { PASSIVE_SECTOR_TITLES: ctx.deps.PASSIVE_SECTOR_TITLES[node.sector] || ctx.deps._t('성좌') });
        node.desc = '루트에서 처음 선택하는 성장 축입니다. 다른 시작점과 겹치지 않는 고유한 기초 효과를 제공합니다.';
    });

    const adjacency = new Map();
    ctx.deps.PASSIVE_TREE.edges.forEach(edge => {
        if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
        if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
        adjacency.get(edge.from).push(edge.to);
        adjacency.get(edge.to).push(edge.from);
    });
    starters.forEach(starter => {
        const used = new Set([starter.stat]);
        const children = (adjacency.get(starter.id) || [])
            .map(id => ctx.deps.PASSIVE_TREE.nodes[id])
            .filter(node => node && node.depth === 2 && (node.kind === 'path' || node.kind === 'node'))
            .sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
        children.forEach((node, index) => {
            if (!used.has(node.stat)) { used.add(node.stat); return; }
            const pool = (ctx.deps.PASSIVE_THEME_POOLS[node.sector] || ctx.deps.PASSIVE_THEME_POOLS.center || []).filter(stat => ctx.deps.P_STATS[stat]);
            const replacement = pool.slice(index).concat(pool.slice(0, index)).find(stat => !used.has(stat));
            if (replacement) {
                setStat(ctx, node, replacement);
                used.add(replacement);
            }
        });
    });
}

export function applyPassiveSpecializations(ctx) {
    const used = new Set();
    const kindPriority = { keystone: 0, deadend: 1, major: 2, hub: 3, core: 4, path: 5 };
    ctx.deps.PASSIVE_SPECIAL_NODE_CONFIGS.forEach(config => {
        let candidates = Object.values(ctx.deps.PASSIVE_TREE.nodes)
            .filter(node => node && node.sector === config.sector)
            .filter(node => !node.clusterId)
            .filter(node => (config.kinds || []).includes(node.kind))
            .filter(node => node.id !== 'n0' && !used.has(node.id));
        candidates.sort((a, b) => {
            let kindDelta = (kindPriority[a.kind] ?? 99) - (kindPriority[b.kind] ?? 99);
            if (kindDelta !== 0) return kindDelta;
            let radiusDelta = Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y);
            if (radiusDelta !== 0) return radiusDelta;
            return a.id.localeCompare(b.id);
        });
        let node = candidates[0];
        if (!node) return;
        used.add(node.id);
        node.stat = config.stat;
        node.val = config.val;
        node.title = ctx.deps._t(config.title);
        node.desc = config.desc;
        node.effectLabel = `${ctx.deps.getStatName(config.stat)} +${ctx.deps.formatValue(config.stat, config.val)}${ctx.deps.P_STATS[config.stat] && ctx.deps.P_STATS[config.stat].isPct ? '%' : ''}`;
    });
}

function sectorOrderForStartingNode(node) {
    const order = { templar: 0, witch: 1, shadow: 2, ranger: 3, duelist: 4, marauder: 5 };
    return order[node.sector] ?? 99;
}

function setStat(ctx, node, statKey) {
    if (!node || !ctx.deps.P_STATS[statKey]) return;
    node.stat = statKey;
    node.val = ctx.deps.getPassiveStatTierValue(statKey, node.tier);
    node.effectLabel = null;
}
