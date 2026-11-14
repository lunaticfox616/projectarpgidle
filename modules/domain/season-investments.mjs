/** Loop passive purchases/refunds operate on the supplied save; presentation owns confirmations. */
export function createSeasonInvestments(defs) {
    const level = (owner, id) => seasonInvestmentLevel(owner, id);
    const evolved = owner => {
        const ids = Object.keys(defs.nodes || {});
        return ids.length > 0 && ids.every(id => level(owner, id) >= 1);
    };
    const required = (owner, node) => {
        if (node?.inner && !evolved(owner)) return false;
        return !node?.req || seasonPrerequisiteMet(owner.seasonNodes, node.req);
    };
    const cap = (owner, node) => node?.inner ? 1 : (evolved(owner) ? 5 : 1);
    const canInvest = (owner, node, id) => defs.unlocked(owner) && !!node
        && (owner.season || 1) >= defs.unlockLoop(id) && required(owner, node);
    const rules = { level, evolved, required, cap, canInvest };
    return Object.freeze({ ...rules,
        buy: (owner, id) => purchaseSeasonInvestment(defs, rules, owner, id),
        refund: (owner, id) => refundSeasonInvestment(defs, owner, id),
        spendable: owner => seasonInvestmentSpendable(defs, rules, owner),
        reset: owner => resetSeasonInvestments(owner),
        resetCost: owner => { owner.seasonNodes = Array.isArray(owner.seasonNodes) ? owner.seasonNodes : []; return owner.seasonNodes.length; }
    });
}

export function seasonPrerequisiteMet(owned, req) {
    return Array.isArray(req) ? req.some(id => owned.includes(id)) : owned.includes(req);
}

export function investmentRequiresRemovedNode(owned, req, id) {
    if (!req) return false;
    return Array.isArray(req) ? req.includes(id) && req.filter(key => key !== id).every(key => !owned.includes(key)) : req === id;
}

function seasonInvestmentLevel(owner, id) {
    owner.seasonNodeLevels = owner.seasonNodeLevels && typeof owner.seasonNodeLevels === 'object' ? owner.seasonNodeLevels : {};
    return owner.seasonNodes.includes(id) ? Math.max(1, Math.floor(owner.seasonNodeLevels[id] || 1)) : 0;
}

function purchaseSeasonInvestment(defs, rules, owner, id) {
    const node = defs.node(id);
    owner.seasonNodeLevels = owner.seasonNodeLevels && typeof owner.seasonNodeLevels === 'object' ? owner.seasonNodeLevels : {};
    if (!rules.canInvest(owner, node, id)) return 'unavailable';
    const level = rules.level(owner, id);
    if (level >= rules.cap(owner, node) && level > 0) return 'maximum';
    if (owner.seasonPoints <= 0) return 'no-points';
    if (level <= 0) owner.seasonNodes.push(id);
    owner.seasonNodeLevels[id] = level + 1;
    owner.seasonPoints--;
    return 'changed';
}

function refundSeasonInvestment(defs, owner, id) {
    owner.seasonNodes = Array.isArray(owner.seasonNodes) ? owner.seasonNodes : [];
    if (!owner.seasonNodes.includes(id)) return 'unavailable';
    const issue = seasonRefundDependency(defs, owner, id);
    if (issue) return issue;
    if ((owner.currencies.blightSpore || 0) < 1) return 'no-spores';
    owner.currencies.blightSpore = Math.max(0, Math.floor(owner.currencies.blightSpore || 0) - 1);
    const level = seasonInvestmentLevel(owner, id);
    owner.seasonNodes = owner.seasonNodes.filter(key => key !== id);
    delete owner.seasonNodeLevels[id];
    owner.seasonPoints = Math.max(0, Math.floor(owner.seasonPoints || 0)) + level;
    return 'changed';
}

function seasonRefundDependency(defs, owner, id) {
    const node = defs.node(id);
    const innerOwned = Object.keys(defs.innerNodes || {}).some(key => owner.seasonNodes.includes(key));
    if (node && !node.inner && innerOwned) return 'inner-owned';
    const blocked = defs.ids().some(key => key !== id && owner.seasonNodes.includes(key)
        && investmentRequiresRemovedNode(owner.seasonNodes, (defs.node(key) || {}).req, id));
    return blocked ? 'dependent' : null;
}

function seasonInvestmentSpendable(defs, rules, owner) {
    const points = Math.max(0, Math.floor(owner.seasonPoints || 0));
    if (points <= 0) return false;
    if ((owner.season || 1) >= 10 && ['flatHp', 'flatDmg', 'aspd', 'move'].some(key => defs.loop10Cost(owner, key) <= points)) return true;
    return defs.ids().some(id => {
        const node = defs.node(id);
        return rules.canInvest(owner, node, id) && rules.level(owner, id) < rules.cap(owner, node);
    });
}

function resetSeasonInvestments(owner) {
    owner.seasonNodes = Array.isArray(owner.seasonNodes) ? owner.seasonNodes : [];
    if (!owner.seasonNodes.length) return { status: 'empty' };
    const cost = owner.seasonNodes.length;
    if ((owner.currencies.blightSpore || 0) < cost) return { status: 'no-spores', cost };
    const total = owner.seasonNodes.reduce((sum, id) => sum + seasonInvestmentLevel(owner, id), 0);
    owner.currencies.blightSpore = Math.max(0, Math.floor(owner.currencies.blightSpore || 0) - cost);
    owner.seasonPoints = Math.max(0, Math.floor(owner.seasonPoints || 0)) + total;
    owner.seasonNodes = [];
    owner.seasonNodeLevels = {};
    return { status: 'changed', cost };
}
