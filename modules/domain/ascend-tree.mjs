/** One class-tree definition for combat, allocation, previews and UI. Progress is always explicit. */
export function createAscendTree(defs) {
    return Object.freeze({ tree: (owner, key) => buildOwnedAscendTree(defs, owner, key), addPair: addAscendTreePair });
}

function buildOwnedAscendTree(defs, owner, key) {
    const template = defs.classes[key];
    if (!template) return {};
    const spec = defs.nodes[key] || {};
    const tree = buildAscendTreeBase(defs, template, spec);
    if ((owner.completedTrials || []).includes('trial_4')) addAscendTreePair(tree, ['n11', 'n12'], spec.core || defs.fallback.core, 'n10');
    const talents = defs.talents[owner.bloomedTalentThisLoop];
    if (owner.bloomedClassThisLoop === key && talents) {
        addAscendTreePair(tree, ['n13a', 'n13b'], talents, ['n11', 'n12']);
        addAscendTreePair(tree, ['n13c', 'n13d'], spec.job || defs.fallback.job, ['n11', 'n12']);
    }
    return tree;
}

function buildAscendTreeBase(defs, template, spec) {
    const slots = { m1: template.m1, m2: template.m2, d: template.d, ...(spec.slots || {}) };
    const nodes = spec.nodes || {}, tree = {};
    defs.layout.forEach(([id, slot, tier, mul, req]) => {
        tree[id] = { ...resolveAscendTreeSpec(defs, nodes[id] || { stat: slots[slot], tier, mul }), req };
    });
    tree.n10 = { ...resolveAscendTreeSpec(defs, nodes.n10 || spec.ult || defs.fallback.ult), req: ['n7', 'n8', 'n9'] };
    return tree;
}

function addAscendTreePair(tree, ids, lines, req) {
    tree[ids[0]] = { stat: lines[0].stat, val: lines[0].val, req, exclusive: ids[1] };
    tree[ids[1]] = { stat: lines[1].stat, val: lines[1].val, req, exclusive: ids[0] };
}

function resolveAscendTreeSpec(defs, spec) {
    if (Array.isArray(spec.stats)) return { stats: spec.stats.map(line => resolveAscendTreeLine(defs, line)) };
    return resolveAscendTreeLine(defs, spec);
}

function resolveAscendTreeLine(defs, spec) {
    if (Number.isFinite(spec.val)) return { stat: spec.stat, val: spec.val };
    const key = spec.from || spec.stat;
    const base = ascendTreeStatBase(defs.stats, key, spec.tier === 'entry');
    return { stat: spec.stat, val: scaleAscendTreeStat(spec.stat, base, spec.mul) };
}

function ascendTreeStatBase(stats, key, entry) {
    const stat = stats[key] || {};
    if (key === 'suppCap') return 1;
    if (entry) {
        if (stat.m !== undefined) return stat.m;
        if (stat.s !== undefined) return stat.s;
        return stat.k !== undefined ? stat.k * 0.5 : 1;
    }
    if (stat.k !== undefined) return stat.k;
    if (stat.m !== undefined) return stat.m;
    return stat.s !== undefined ? stat.s : 1;
}

function scaleAscendTreeStat(stat, base, multiplier) {
    if (stat === 'suppCap') return 1;
    const scaled = base * multiplier;
    if (stat === 'regen' || stat === 'leech') return Math.max(0.1, Math.round(scaled * 10) / 10);
    return Math.max(1, Math.round(scaled));
}
