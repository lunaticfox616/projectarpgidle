export function normalizePassiveNodeId(deps, rawId) {
    if (typeof rawId === 'string') {
        let currentId = typeof deps.getCurrentPassiveNodeId === 'function' ? (0, deps.getCurrentPassiveNodeId)(rawId) : rawId;
        if (deps.PASSIVE_TREE.nodes[currentId]) return currentId;
        if (/^\d+$/.test(currentId)) {
            let converted = 'n' + currentId;
            if (deps.PASSIVE_TREE.nodes[converted]) return converted;
        }
        return null;
    }
    if (typeof rawId === 'number' && Number.isFinite(rawId)) {
        let converted = 'n' + Math.floor(rawId);
        return deps.PASSIVE_TREE.nodes[converted] ? converted : null;
    }
    return null;
}

export function normalizeAllocatedPassiveTreeNodes(deps, rawIds, passiveStarEvolution, passiveSaveState) {
    const rawList = Array.isArray(rawIds) ? rawIds : [];
    const seen = new Set(), kept = [];
    let refunded = 0;
    rawList.forEach(rawId => {
        const id = normalizePassiveNodeId(deps, rawId);
        if (!id) { refunded++; return; }
        if (seen.has(id)) return;
        seen.add(id);
        const node = deps.PASSIVE_TREE.nodes[id];
        if (node.kind === 'start') return;
        if (node.requiresEvolution && !passiveStarEvolution) {
            refunded++; return;
        }
        kept.push(id);
    });
    const candidate = { ...passiveSaveState, passives: kept };
    const connected = deps.passiveRouting.connected(candidate, deps.PASSIVE_TREE, (0, deps.getPassiveRouting)(candidate));
    const lostBonus = Math.max(0, deps.passiveRouting.paleBonus({ ...candidate, passives: rawList })
        - deps.passiveRouting.paleBonus({ ...candidate, passives: connected }));
    return { passives: connected, refunded: refunded + kept.length - connected.length, lostBonus };
}

export function migratePassiveSaveNodeReferences(deps, state) {
    if (typeof deps.migratePassiveNodeIdList !== 'function' || typeof deps.migratePassiveNodeIdRecord !== 'function') return;
    // 겹친 노드를 둘 다 찍었던 저장은 합쳐지며 한 칸이 줄어든다: 그 포인트를 돌려준다. 옛 id가 사라지므로 한 번만 돈다.
    const taken = new Set(Array.isArray(state.passives) ? state.passives : []);
    const doubled = Object.entries(deps.PASSIVE_NODE_ID_MERGED).filter(([gone, kept]) => taken.has(gone) && taken.has(kept)).length;
    if (doubled) state.passivePoints = Math.max(0, Number(state.passivePoints) || 0) + doubled;
    state.passives = (0, deps.migratePassiveNodeIdList)(state.passives);
    state.discoveredPassives = (0, deps.migratePassiveNodeIdList)(state.discoveredPassives);
    state.passiveAttributeChoices = (0, deps.migratePassiveNodeIdRecord)(state.passiveAttributeChoices);
    state.voidPassives = (0, deps.migratePassiveNodeIdRecord)(state.voidPassives);
    state.retiredVoidPassives = (0, deps.migratePassiveNodeIdRecord)(state.retiredVoidPassives);
}
