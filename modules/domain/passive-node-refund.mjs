/** Connectedness and point-budget checks share the same routing owner as allocation. */
export function createPassiveNodeRefund(defs) {
    const canRefund = (owner, id) => canRefundAllocatedPassive(defs, owner, id);
    return Object.freeze({ canRefund, refund: (owner, id) => refundAllocatedPassive(defs, canRefund, owner, id) });
}

function canRefundAllocatedPassive(defs, owner, id) {
    const node = defs.tree.nodes[id];
    if (id === defs.root(owner) || node?.kind === 'start' || !owner.passives.includes(id)) return false;
    const remaining = { ...owner, passives: owner.passives.filter(key => key !== id) };
    const connected = defs.routing.connected(remaining, defs.tree, defs.route(remaining));
    return connected.length === remaining.passives.length
        && defs.routing.pointBudget(owner) + defs.routing.paleBonus(remaining) >= remaining.passives.length;
}

function refundAllocatedPassive(defs, canRefund, owner, id) {
    owner.passives = Array.isArray(owner.passives) ? owner.passives : [];
    const node = defs.tree.nodes[id];
    if (!owner.passives.includes(id) || node?.kind === 'start') return { status: 'unavailable' };
    if ((owner.currencies.blightSpore || 0) < 1) return { status: 'no-spores' };
    if (!canRefund(owner, id)) return { status: 'dependent' };
    const budget = defs.routing.pointBudget(owner);
    owner.currencies.blightSpore = Math.max(0, Math.floor(owner.currencies.blightSpore || 0) - 1);
    owner.passives = owner.passives.filter(key => key !== id);
    owner.passivePoints = Math.max(0, Math.floor(owner.passivePoints || 0)) + 1;
    defs.routing.settlePoints(owner, budget);
    return { status: 'changed', node, budget };
}
