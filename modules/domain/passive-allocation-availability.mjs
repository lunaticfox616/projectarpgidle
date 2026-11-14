import { allocationGetPassiveTreeRootNodeId } from './passive-allocation-roots.mjs';

export function allocationIsPassiveNodeAvailable(env, owner, nodeOrId) {
    let node = typeof nodeOrId === 'string' ? env.deps.PASSIVE_TREE.nodes[nodeOrId] : nodeOrId;
    if (!node || (node.requiresEvolution && !(owner && owner.passiveStarEvolution))) return false;
    if (node.hiddenByKeystoneId && !(owner && (owner.passives || []).includes(node.hiddenByKeystoneId))) return false;
    return !allocationIsVoidSocketHidden(env, owner, node);
}

/** 공허 소켓(2026-11-06 사용자: 처음에는 안 보이다가 해금하면 보이게): 해금 탭의 공허 소켓을 열기 전에는 공허 칸과 공허 칸이 있어야 뜻이
 * 있는 노드(needsVoidSockets)가 숨는다. 해금 전 저장에 찍어 둔 칸은 루프가 바뀔 때까지 남아 포인트와 옵션을 잃지 않는다. 해금하는 순간
 * 다시 잇는 일은 contentUnlockUi.takeContent가 한다. */
export function allocationIsVoidSocketHidden(env, owner, node) {
    if (!allocationNeedsVoidSockets(node) || !owner || typeof env.deps.contentProgression !== 'object') return false;
    return !env.deps.contentProgression.isUnlocked('voidSocket', owner) && !(owner.passives || []).includes(node.id);
}

/** 공허 칸, 이어진 공허 칸의 효율을 올리는 투영의 문양, 찍은 공허 칸 수만큼 오르는 공허의 별자리(2026-11-06 사용자: 공허 소켓이 없으면
 * 의미가 없는 노드). 이 노드들을 숨겨도 다른 노드로 가는 길은 끊기지 않는다(살아 있는 트리로 확인: 공허 칸 25, 문양 11, 별자리 1). */
export function allocationNeedsVoidSockets(node) {
    return node.kind === 'void' || node.stat === 'voidLinkEfficiency' || node.title === '공허의 별자리';
}

export function allocationGetPassiveConnectionNodeIds(env, owner) {
    let result = new Set((owner && Array.isArray(owner.passives) ? owner.passives : []).filter(id => allocationIsPassiveNodeAvailable(env, owner, id)).map(String));
    const rootId = allocationGetPassiveTreeRootNodeId(env, owner);
    if (allocationIsPassiveNodeAvailable(env, owner, rootId)) result.add(rootId);
    return result;
}
