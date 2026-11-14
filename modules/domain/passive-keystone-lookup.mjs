

export function passiveRuleHasAuthoredPassiveKeystone(env, owner, idOrTitle) {
    const nodeId = env.deps.PASSIVE_KEYSTONE_NODE_ID_BY_TITLE[idOrTitle] || idOrTitle;
    let node = env.deps.PASSIVE_TREE.nodes[nodeId];
    return !!(node && node.kind === 'keystone' && (owner.passives || []).includes(nodeId));
}

export function passiveRuleFindAllocatedPassiveKeystone(env, owner, title) {
    const authoredNodeId = env.deps.PASSIVE_KEYSTONE_NODE_ID_BY_TITLE[String(title)] || String(title || '');
    const authoredNode = env.deps.PASSIVE_TREE.nodes[authoredNodeId];
    if (authoredNode && authoredNode.kind === 'keystone' && (owner.passives || []).includes(authoredNodeId)) {
        return authoredNode;
    }
    const id = (owner.passives || []).find(id => {
        const node = env.deps.PASSIVE_TREE.nodes[id];
        return node && node.kind === 'keystone' && (node.title === title || node.keystoneEffectId === `keystone:${authoredNodeId}`);
    });
    return env.deps.PASSIVE_TREE.nodes[id] || null;
}

/** 그 효과를 가진 트리의 키스톤 id: 라이브 id, 이름이 같은 노드, keystoneEffectId로 이어진 노드(이름을 따로 지은 키스톤). */
export function passiveRuleGetPassiveKeystoneNodeId(env, title) {
    const liveId = env.deps.PASSIVE_KEYSTONE_NODE_ID_BY_TITLE[title];
    if (env.deps.PASSIVE_TREE.nodes[liveId]) return liveId;
    const node = Object.values(env.deps.PASSIVE_TREE.nodes).find(row => row.kind === 'keystone' && (row.title === title || row.keystoneEffectId === `keystone:${liveId}`));
    return node ? node.id : liveId;
}
