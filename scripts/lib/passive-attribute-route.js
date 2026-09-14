// Evaluated inside the real game VM by build audits; uses actual activation paths and point costs.
module.exports = function findAttributeRoute(targets, totals) {
    let best = null;
    for (const node of Object.values(PASSIVE_TREE.nodes)) {
        if (!getPassiveNodeRawEffects(node).some(effect => targets[effect.stat] > (totals[effect.stat] || 0))) continue;
        const path = getPassiveActivationPath(node.id);
        if (!path.length || path.length > game.passivePoints || getPassiveKeystoneConflict(path)) continue;
        if (path.some(id => ['keystone', 'star_option'].includes(PASSIVE_TREE.nodes[id].kind))) continue;
        const gained = {};
        for (const id of path) for (const effect of getPassiveNodeRawEffects(PASSIVE_TREE.nodes[id])) {
            gained[effect.stat] = (gained[effect.stat] || 0) + effect.val;
        }
        const gain = Object.entries(targets).reduce((sum, [stat, value]) =>
            sum + Math.min(Math.max(0, value - (totals[stat] || 0)), gained[stat] || 0), 0);
        const score = gain / path.length;
        if (score > 0 && (!best || score > best.score || (score === best.score && path.length < best.cost))) {
            best = { id: node.id, score, cost: path.length };
        }
    }
    return best;
};
