import { allocationIsPassiveNodeAvailable, allocationGetPassiveConnectionNodeIds } from './passive-allocation-availability.mjs';
import { allocationGetPassiveTreeRootNodeId, allocationGetPassiveBlockedStartIds, allocationGetPassiveGatedStartIds } from './passive-allocation-roots.mjs';

/** Inactive nodes on the shortest available route, preserving tree edge order. */
export function allocationGetPassiveActivationPath(env, owner, targetNodeId) {
    if (!owner || !targetNodeId || !allocationIsPassiveNodeAvailable(env, owner, targetNodeId)) return [];
    const targetNode = env.deps.PASSIVE_TREE.nodes[targetNodeId];
    if (targetNode && targetNode.kind === 'start') return [];
    const connectionNodes = allocationGetPassiveConnectionNodeIds(env, owner);
    if (connectionNodes.has(String(targetNodeId))) return [];
    if (env.deps.passiveRouting.freeNodes(env.deps.PASSIVE_TREE, owner).has(String(targetNodeId))) return [String(targetNodeId)];
    const startNodes = activationStartNodes(env, owner, connectionNodes);
    if (startNodes.length === 0) return [];
    return findActivationPath(env, owner, targetNodeId, connectionNodes, startNodes);
}

function activationStartNodes(env, owner, connectionNodes) {
    const rootId = allocationGetPassiveTreeRootNodeId(env, owner);
    return connectionNodes.size > 0 ? Array.from(connectionNodes) : (allocationIsPassiveNodeAvailable(env, owner, rootId) ? [rootId] : []);
}

function findActivationPath(env, owner, targetNodeId, connectionNodes, startNodes) {
    const queue = startNodes.slice();
    let queueIndex = 0;
    const previous = new Map(queue.map(id => [id, null]));
    const adjacency = env.deps.getPassiveTreeAdjacency(owner);
    const blockedStarts = allocationGetPassiveBlockedStartIds(env, owner), openedStarts = allocationGetPassiveGatedStartIds(env, owner);
    const walkable = id => allocationIsPassiveNodeAvailable(env, owner, id) && !blockedStarts.has(id);
    while (queueIndex < queue.length && !previous.has(targetNodeId)) {
        const current = queue[queueIndex++];
        (adjacency.get(String(current)) || []).forEach(next => {
            if (previous.has(next) || !walkable(next)) return;
            previous.set(next, current);
            queue.push(next);
        });
    }
    if (!previous.has(targetNodeId)) return [];
    const path = [];
    let current = targetNodeId;
    while (current && !connectionNodes.has(String(current))) {
        path.push(current);
        current = previous.get(current);
    }
    return path.reverse().filter(id => !openedStarts.has(id));
}

export function allocationGetPassiveKeystoneConflict(env, owner, path) {
    const owned = new Set(owner.passives || []), pending = new Set(path || []);
    const corruptId = env.deps.getPassiveKeystoneNodeId('타락한 복음');
    const tripleId = env.deps.getPassiveKeystoneNodeId('삼중 계시');
    if ((owned.has(corruptId) && pending.has(tripleId)) || (owned.has(tripleId) && pending.has(corruptId))) {
        return env.deps._t('{title}, {title2}는 동시에 할당할 수 없습니다.', { title: env.deps.PASSIVE_TREE.nodes[corruptId].title, title2: env.deps.PASSIVE_TREE.nodes[tripleId].title });
    }
    return '';
}

/** Woodsman build lock and unlock checks happen before spending or revealing any node. */
export function* allocationActivatePassivePath(env, owner, targetNodeId, options) {
    if (owner.woodsmanBuildLock) return { activated: false, cost: 0, path: [], reason: 'locked', message: env.deps._t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.') };
    if (!env.deps.contentProgression.canOpen('tab-char', owner)) return { activated: false, cost: 0, path: [], reason: 'locked' };
    return yield* allocatePassivePath(env, owner, targetNodeId, options);
}

function* allocatePassivePath(env, owner, targetNodeId, options) {
    const path = allocationGetPassiveActivationPath(env, owner, targetNodeId);
    const failure = pathInvestmentFailure(env, owner, path, options);
    if (failure) return failure;
    const pointBudget = env.deps.passiveRouting.pointBudget(owner);
    for (const nodeId of path) {
        applyPathNode(env, owner, nodeId, options);
        yield { kind: 'passiveReveal', args: [nodeId, { forcePulse: !options || options.forcePulseNodeId === nodeId }] };
    }
    owner.passivePoints = Math.max(0, Math.floor(owner.passivePoints || 0) - path.length);
    env.deps.passiveRouting.settlePoints(owner, pointBudget);
    env.deps.enforcePassiveEquipmentRestrictions(owner);
    return { activated: true, cost: path.length, path: path.slice() };
}

function pathInvestmentFailure(env, owner, path, options) {
    const expected = options && options.expectedPath;
    if (expected && (path.length !== expected.length || path.some((id, index) => id !== expected[index]))) {
        return { activated: false, cost: path.length, path: path.slice(), reason: 'changed',
            message: env.deps._t('확인 중 연결 경로가 바뀌었습니다. 노드를 다시 선택해 주세요.') };
    }
    if (path.length === 0) return { activated: false, cost: 0, path: [] };
    const conflict = allocationGetPassiveKeystoneConflict(env, owner, path);
    if (conflict) return { activated: false, cost: path.length, path: path.slice(), reason: 'conflict', message: conflict };
    if (Math.max(0, Math.floor(owner.passivePoints || 0)) < path.length) {
        return { activated: false, cost: path.length, path: path.slice(), reason: 'points' };
    }
    return null;
}

function applyPathNode(env, owner, nodeId, options) {
    if (!(owner.passives || []).includes(nodeId)) owner.passives.push(nodeId);
    const node = env.deps.PASSIVE_TREE.nodes[nodeId];
    const attributeStat = options && options.attributeStat;
    if (node && node.kind === 'attribute' && ['strength', 'dexterity', 'intelligence'].includes(attributeStat)) {
        owner.passiveAttributeChoices = owner.passiveAttributeChoices || {};
        owner.passiveAttributeChoices[nodeId] = attributeStat;
    }
}

export function allocationGetPassiveLinkedNodeIds(env, owner, nodeId, maxDepth) {
    const rootId = nodeId;
    if (!allocationIsPassiveNodeAvailable(env, owner, rootId)) return [];
    const visited = new Set([rootId]);
    let frontier = [rootId];
    const adjacency = env.deps.getPassiveTreeAdjacency(owner);
    const depthLimit = Math.max(0, maxDepth || 0);
    for (let depth = 0; depth < depthLimit; depth++) {
        const nextFrontier = [];
        frontier.forEach(current => {
            (adjacency.get(String(current)) || []).forEach(next => {
                if (visited.has(next) || !allocationIsPassiveNodeAvailable(env, owner, next)) return;
                visited.add(next);
                nextFrontier.push(next);
            });
        });
        if (nextFrontier.length === 0) break;
        frontier = nextFrontier;
    }
    visited.delete(rootId);
    return Array.from(visited);
}
