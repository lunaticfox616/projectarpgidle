// A versioned browser fixture can predate the passive tree and receive a refund on load.
// Rebuild an ordinary connected Warrior allocation in the isolated benchmark owner.
module.exports = function prepareCurrentCombatFixture(snapshot) {
    game = mergeDefaults(snapshot);
    window.game = game;
    const equipment = game.equipment;
    game.equipment = Object.fromEntries(Object.keys(equipment).map(slot => [slot, null]));
    const weights = { strength: 0.6, flatHp: 0.6, pctHp: 4, armorPct: 1.5, dr: 5, resAll: 5, resChaos: 5,
        leech: 8, regen: 5, flatDmg: 1.5, pctDmg: 2, physPctDmg: 2, meleePctDmg: 2, aspd: 2, crit: 1.6, critDmg: 0.6 };
    const adjacency = getPassiveTreeAdjacency();
    const root = getPassiveTreeRootNodeId(game);
    const blocked = getPassiveBlockedStartIds();
    while (game.passivePoints > 0) {
        const needsStrength = getPlayerStats(false).strength < 90;
        const visited = new Set([root, ...game.passives]);
        let frontier = [...visited];
        let best = null;
        for (let depth = 0; depth < 4 && frontier.length; depth++) {
            const next = [];
            for (const from of frontier) for (const id of adjacency.get(from) || []) {
                if (visited.has(id)) continue;
                visited.add(id);
                if (!isPassiveNodeAvailable(id) || blocked.has(id)) continue;
                next.push(id);
                const node = PASSIVE_TREE.nodes[id];
                if (['start', 'keystone', 'void'].includes(node.kind)) continue;
                const path = getPassiveActivationPath(id);
                if (!path.length || path.length > game.passivePoints || getPassiveKeystoneConflict(path)) continue;
                const value = path.flatMap(step => getEffectivePassiveNodeEffects(PASSIVE_TREE.nodes[step]))
                    .reduce((score, effect) => score + Math.max(0, Number(effect.val) || 0)
                        * (effect.stat === 'strength' && needsStrength ? 12 : weights[effect.stat] || 0), 0);
                const score = value / (path.length ** 1.15);
                if (!best || score > best.score) best = { id, path, score };
            }
            frontier = next;
        }
        if (!best) throw Error('No legal connected passive path within the fixture budget');
        const change = activatePassivePath(best.id, { expectedPath: best.path, attributeStat: 'strength' });
        if (!change.activated) throw Error('Could not allocate the fixture path: ' + best.id);
    }
    const admitting = combatEquipmentStats.validateLoadout(equipment, game);
    if (!admitting.ok) throw Error('Failed to equip fixture with earned points: ' + admitting.reason);
    game.equipment = equipment;
    return JSON.parse(serializeSaveState(game));
};
